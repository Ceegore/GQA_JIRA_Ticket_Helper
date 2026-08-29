/*
 * GQA JIRA bug reporter helper - Jira DOM adapter
 *
 * DESIGN RULES:
 * - No Jira API.
 * - No network requests.
 * - No storage.
 * - No automatic submit.
 * - Best-effort field filling only.
 * - Missing/invalid values are skipped.
 * - Each field failure is isolated.
 */

"use strict";

(() => {
  const C = GQA_CONFIG;
  const S = GQAShared;

  const CONTROL_SELECTOR = [
    "input",
    "textarea",
    "select",
    '[contenteditable]:not([contenteditable="false"])',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="checkbox"]',
    'button[aria-haspopup="listbox"]',
    '[aria-haspopup="listbox"]'
  ].join(",");

  const OPTION_SELECTOR = [
    '[role="option"]',
    '[role="menuitemradio"]',
    '[role="menuitemcheckbox"]'
  ].join(",");

  const POPUP_ROOT_SELECTOR = '[role="listbox"], [role="menu"]';
  const DEBUG = C.DEBUG ?? false;

  function log(message) {
    if (!DEBUG) return;
    console.debug(`[GQA JIRA Helper] ${message}`);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitFor(getValue, timeoutMs = C.WAIT_TIMEOUT_MS) {
    const started = Date.now();
    while (Date.now() - started <= timeoutMs) {
      const value = getValue();
      if (value) return value;
      await sleep(C.WAIT_STEP_MS);
    }
    return null;
  }

  function uniqueElements(elements) {
    return [...new Set(elements.filter((element) => element instanceof Element))];
  }

  function isVisible(element) {
    if (!(element instanceof Element) || !element.isConnected) return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isDisabled(element) {
    if (!(element instanceof Element)) return true;
    if (element.getAttribute("aria-disabled") === "true") return true;
    if ("disabled" in element && element.disabled === true) return true;
    try {
      if (element.matches(":disabled")) return true;
    } catch {
      // Ignore unsupported pseudo-class behavior and keep the explicit checks.
    }
    return false;
  }

  function isReadOnly(element) {
    if (!(element instanceof Element)) return true;
    if (element.getAttribute("aria-readonly") === "true") return true;
    return "readOnly" in element && element.readOnly === true;
  }

  function normalizedElementText(element) {
    return S.normalizeText(element?.innerText || element?.textContent || "");
  }

  function getAriaLabelledByText(element) {
    if (!(element instanceof Element)) return "";
    const ids = String(element.getAttribute("aria-labelledby") || "")
      .split(/\s+/)
      .filter(Boolean);

    return ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((node) => node.innerText || node.textContent || "")
      .join(" ");
  }

  function getAssociatedLabelText(element) {
    if (!(element instanceof Element) || !element.id) return "";
    try {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      return label?.innerText || label?.textContent || "";
    } catch {
      return "";
    }
  }

  function accessibleTextsForElement(element) {
    if (!(element instanceof Element)) return [];
    return [
      element.innerText,
      element.textContent,
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.getAttribute("value"),
      getAriaLabelledByText(element),
      getAssociatedLabelText(element)
    ].filter(Boolean).map(String);
  }

  function accessibleTextsForControl(element) {
    if (!(element instanceof Element)) return [];
    return [
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("name"),
      getAriaLabelledByText(element),
      getAssociatedLabelText(element)
    ].filter(Boolean).map(String);
  }

  function exactTextMatchesAny(text, aliases) {
    return aliases.some((alias) => S.normalizedExactMatch(text, alias));
  }

  function queryConfiguredWithin(root, selector) {
    if (!selector || !(root instanceof Element)) return null;
    try {
      const matches = [];
      if (root.matches(selector)) matches.push(root);
      matches.push(...root.querySelectorAll(selector));
      const uniqueMatches = uniqueElements(matches);
      if (uniqueMatches.length > 1) {
        log("Configured selector is ambiguous; field/guard was skipped.");
        return null;
      }
      return uniqueMatches.length === 1 ? uniqueMatches[0] : null;
    } catch {
      log("Configured selector is invalid; generic discovery will be used.");
      return null;
    }
  }

  function compactElementExactMatch(element, expectedText) {
    if (!isVisible(element)) return false;
    const rect = element.getBoundingClientRect();
    if (rect.height > 100 || rect.width > 800) return false;

    return accessibleTextsForElement(element).some((text) => {
      const normalized = S.normalizeText(text);
      return normalized.length <= 120 && S.normalizedExactMatch(text, expectedText);
    });
  }

  function hasExactDialogGuardToken(dialog, expectedText, configuredSelector) {
    const configured = queryConfiguredWithin(dialog, configuredSelector);
    if (configured) return compactElementExactMatch(configured, expectedText);

    const dialogRect = dialog.getBoundingClientRect();
    const guardHeight = Math.min(
      C.DIALOG_GUARD_TOP_PX,
      Math.max(120, dialogRect.height * 0.3)
    );
    const lowerBoundary = dialogRect.top + guardHeight;

    const candidates = [
      ...dialog.querySelectorAll(
        "h1, h2, h3, h4, h5, h6, [role='heading'], label, legend, button, span, p, div, [aria-label], [aria-labelledby]"
      )
    ].filter((element) => {
      if (!isVisible(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.top < lowerBoundary && rect.bottom > dialogRect.top;
    });

    return candidates.some((element) => compactElementExactMatch(element, expectedText));
  }

  function hasCreateButton(dialog) {
    const configured = queryConfiguredWithin(dialog, C.CREATE_BUTTON_SELECTOR);
    if (configured) {
      return isVisible(configured) && accessibleTextsForElement(configured).some((text) =>
        exactTextMatchesAny(text, C.CREATE_BUTTON_TEXTS)
      );
    }

    const candidates = [
      ...dialog.querySelectorAll(
        "button, input[type='submit'], input[type='button'], [role='button']"
      )
    ].filter(isVisible);

    return candidates.some((element) =>
      accessibleTextsForElement(element).some((text) =>
        exactTextMatchesAny(text, C.CREATE_BUTTON_TEXTS)
      )
    );
  }

  function dialogMatchesContract(dialog) {
    return (
      hasExactDialogGuardToken(
        dialog,
        C.EXPECTED_PROJECT_TEXT,
        C.PROJECT_GUARD_SELECTOR
      ) &&
      hasExactDialogGuardToken(
        dialog,
        C.EXPECTED_ISSUE_TYPE_TEXT,
        C.ISSUE_TYPE_GUARD_SELECTOR
      ) &&
      hasCreateButton(dialog)
    );
  }

  function findIssueDialog() {
    let candidates = [];

    if (C.DIALOG_SELECTOR) {
      try {
        candidates = [...document.querySelectorAll(C.DIALOG_SELECTOR)];
      } catch {
        log("Configured dialog selector is invalid; generic discovery will be used.");
      }
    }

    if (candidates.length === 0) {
      candidates = [
        ...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')
      ];
    }

    const matches = uniqueElements(candidates)
      .filter(isVisible)
      .filter(dialogMatchesContract);

    // Ambiguity is a safe stop. Never choose the first of multiple dialogs.
    return matches.length === 1 ? matches[0] : null;
  }

  function isExcludedInput(control) {
    if (!(control instanceof HTMLInputElement)) return false;
    return ["hidden", "button", "submit", "reset", "image", "file"].includes(
      String(control.type || "text").toLowerCase()
    );
  }

  function isEditableElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.getAttribute("contenteditable") === "false") return false;
    const attribute = element.getAttribute("contenteditable");
    return (
      element.isContentEditable === true ||
      attribute === "" ||
      attribute === "true" ||
      attribute === "plaintext-only"
    );
  }

  function isUsableControl(control) {
    if (!(control instanceof Element) || !isVisible(control)) return false;
    if (isExcludedInput(control)) return false;
    return true;
  }

  function resolveControl(candidate) {
    if (!isUsableControl(candidate)) return null;

    if (
      candidate instanceof HTMLInputElement ||
      candidate instanceof HTMLTextAreaElement ||
      candidate instanceof HTMLSelectElement ||
      isEditableElement(candidate) ||
      candidate.getAttribute("role") === "combobox" ||
      candidate.getAttribute("role") === "checkbox" ||
      candidate.getAttribute("aria-haspopup") === "listbox"
    ) {
      return candidate;
    }

    const descendants = uniqueElements([
      ...candidate.querySelectorAll(
        "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='combobox'], [role='checkbox'], [aria-haspopup='listbox']"
      )
    ]).filter(isUsableControl);

    return descendants.length === 1 ? descendants[0] : null;
  }

  function controlMatchesAliases(control, aliases) {
    const texts = accessibleTextsForControl(control);

    for (const text of texts) {
      for (const alias of aliases) {
        if (S.normalizedExactMatch(text, alias)) return true;

        // Jira placeholders may contain explanatory text after the field name.
        // Prefix matching is allowed only for accessible labels/placeholders,
        // never for dropdown option values.
        const normalizedText = S.normalizeText(text);
        const normalizedAlias = S.normalizeText(alias);
        if (normalizedText.startsWith(`${normalizedAlias} `)) return true;
      }
    }

    return false;
  }

  function findControlByAccessibleName(root, aliases) {
    const matches = uniqueElements(
      [...root.querySelectorAll(CONTROL_SELECTOR)]
        .filter(isUsableControl)
        .filter((control) => controlMatchesAliases(control, aliases))
        .map(resolveControl)
        .filter(Boolean)
    );

    return matches.length === 1 ? matches[0] : null;
  }

  function normalizedLabelText(value) {
    return S.normalizeText(String(value || "").replace(/\s*\*\s*$/, ""));
  }

  function findExactLabelElements(root, aliases) {
    const normalizedAliases = aliases.map(S.normalizeText);
    return [
      ...root.querySelectorAll(
        "label, legend, [data-testid*='label'], [id$='-label'], span, p, div"
      )
    ].filter((element) => {
      if (!isVisible(element)) return false;
      const text = element.innerText || element.textContent || "";
      if (!normalizedAliases.includes(normalizedLabelText(text))) return false;
      const rect = element.getBoundingClientRect();
      return rect.height <= 80 && rect.width <= 800;
    });
  }

  function controlsExplicitlyLabelledBy(root, labelElement) {
    if (!labelElement.id) return [];
    return [...root.querySelectorAll(CONTROL_SELECTOR)]
      .filter(isUsableControl)
      .filter((control) =>
        String(control.getAttribute("aria-labelledby") || "")
          .split(/\s+/)
          .filter(Boolean)
          .includes(labelElement.id)
      )
      .map(resolveControl)
      .filter(Boolean);
  }

  function controlFromLabel(root, labelElement) {
    if (!labelElement) return null;

    if (labelElement instanceof HTMLLabelElement && labelElement.htmlFor) {
      const direct = document.getElementById(labelElement.htmlFor);
      const resolved = resolveControl(direct);
      if (resolved && root.contains(resolved)) return resolved;
    }

    const explicitlyLabelled = uniqueElements(
      controlsExplicitlyLabelledBy(root, labelElement)
    );
    if (explicitlyLabelled.length === 1) return explicitlyLabelled[0];
    if (explicitlyLabelled.length > 1) return null;

    const nested = uniqueElements(
      [...labelElement.querySelectorAll(CONTROL_SELECTOR)]
        .filter(isUsableControl)
        .map(resolveControl)
        .filter(Boolean)
    );
    if (nested.length === 1) return nested[0];
    if (nested.length > 1) return null;

    let node = labelElement.parentElement;
    for (let depth = 0; depth < 6 && node && root.contains(node); depth += 1) {
      const controls = uniqueElements(
        [...node.querySelectorAll(CONTROL_SELECTOR)]
          .filter(isUsableControl)
          .map(resolveControl)
          .filter(Boolean)
      );
      if (controls.length === 1) return controls[0];
      if (controls.length > 1) return null;
      if (node === root) break;
      node = node.parentElement;
    }

    return null;
  }

  function findFieldControl(root, fieldConfig) {
    if (fieldConfig.selector) {
      const exact = queryConfiguredWithin(root, fieldConfig.selector);
      const resolved = resolveControl(exact);
      if (resolved) return resolved;
    }

    const byAccessibleName = findControlByAccessibleName(root, fieldConfig.aliases);
    if (byAccessibleName) return byAccessibleName;

    const fromLabels = uniqueElements(
      findExactLabelElements(root, fieldConfig.aliases)
        .map((label) => controlFromLabel(root, label))
        .filter(Boolean)
    );

    return fromLabels.length === 1 ? fromLabels[0] : null;
  }

  function actionTextIsForbidden(element) {
    return accessibleTextsForElement(element).some((text) =>
      C.FORBIDDEN_CLICK_TEXTS.some((forbidden) =>
        S.normalizedExactMatch(text, forbidden)
      )
    );
  }

  function isSubmitCapableElement(element) {
    if (!(element instanceof Element)) return true;

    const input = element.closest("input");
    if (input instanceof HTMLInputElement) {
      const type = String(input.type || "text").toLowerCase();
      if (type === "submit" || type === "image") return true;
    }

    const button = element.closest("button");
    if (button instanceof HTMLButtonElement) {
      const explicitType = String(button.getAttribute("type") || "").toLowerCase();
      if (explicitType === "submit") return true;
      if (explicitType === "" && (button.closest("form") || button.hasAttribute("form"))) return true;
    }

    return false;
  }

  function isForbiddenClickTarget(element) {
    if (!(element instanceof Element)) return true;

    const clickable = element.closest(
      "button, input, [role='button'], [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox'], [role='option'], [role='checkbox']"
    ) || element;

    return (
      isDisabled(clickable) ||
      isSubmitCapableElement(clickable) ||
      actionTextIsForbidden(clickable)
    );
  }

  function safeClick(element) {
    if (!element || !isVisible(element)) return false;
    if (isForbiddenClickTarget(element)) {
      log("Refused unsafe or submit-capable click target.");
      return false;
    }
    element.click();
    return true;
  }

  function dispatchInputEvents(element, inputType = "insertText", data = null) {
    try {
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType,
          data
        })
      );
    } catch {
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }

    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setNativeInputValue(
    element,
    value,
    { blurAfter = true, dispatchChange = true } = {}
  ) {
    if (
      !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) ||
      !isVisible(element) ||
      isDisabled(element) ||
      isReadOnly(element) ||
      isExcludedInput(element)
    ) {
      return false;
    }

    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (!descriptor?.set) return false;

    element.focus();
    descriptor.set.call(element, String(value));

    try {
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: String(value)
        })
      );
    } catch {
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (dispatchChange) {
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (blurAfter) element.blur();
    return true;
  }

  function replaceContentEditableText(element, value) {
    if (
      !isEditableElement(element) ||
      !isVisible(element) ||
      isDisabled(element) ||
      isReadOnly(element)
    ) {
      return false;
    }

    element.focus();

    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);

    let inserted = false;
    try {
      inserted = typeof document.execCommand === "function" &&
        document.execCommand("insertText", false, String(value));
    } catch {
      inserted = false;
    }

    if (!inserted) {
      // Safe fallback: plain text only, and only on a proven editable element.
      element.textContent = String(value);
    }

    dispatchInputEvents(element, "insertText", String(value));
    element.blur();
    return true;
  }

  function setTextControl(control, value) {
    if (!S.isNonBlankString(value)) return false;

    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      // Validation trims only to decide whether a value is empty. The actual
      // ticket text is preserved exactly, including intentional edge spaces.
      return setNativeInputValue(control, value);
    }

    if (isEditableElement(control)) {
      return replaceContentEditableText(control, value);
    }

    return false;
  }

  function setNumberControl(control, value) {
    if (!S.isFiniteNonNegativeNumber(value)) return false;
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      return setNativeInputValue(control, String(value));
    }
    return false;
  }

  function setDateControl(control, isoDate) {
    if (!S.isIsoDate(isoDate)) return false;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
      return false;
    }

    // Native date inputs accept ISO directly. For ordinary Jira text inputs,
    // use schema ISO and require real-Jira evidence before adding localization.
    return setNativeInputValue(control, isoDate);
  }

  function isSelectLike(control) {
    if (!(control instanceof Element)) return false;
    if (control instanceof HTMLSelectElement) return true;
    if (control.getAttribute("role") === "combobox") return true;
    return control.getAttribute("aria-haspopup") === "listbox";
  }

  function leafTexts(element) {
    const output = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode;

    while (node) {
      if (node instanceof Element && isVisible(node) && node.children.length === 0) {
        const text = String(node.textContent || "").trim();
        if (text) output.push(text);
      }
      node = walker.nextNode();
    }

    return output;
  }

  function optionMatchesExact(option, desiredValue) {
    const wholeText = option.innerText || option.textContent || "";
    if (S.normalizedExactMatch(wholeText, desiredValue)) return true;

    // Person-picker options may include secondary text. Exact matching of one
    // visible leaf remains allowed; substring/fuzzy matching is still forbidden.
    return leafTexts(option).some((text) => S.normalizedExactMatch(text, desiredValue));
  }

  function looksLikeCreateNewOption(option) {
    const text = S.normalizeText(option.innerText || option.textContent || "");
    return (
      text.startsWith("create ") ||
      text.startsWith("erstellen ") ||
      text.startsWith("add ") ||
      text.startsWith("hinzufügen ") ||
      text.includes(" create new ") ||
      text.includes(" neu erstellen")
    );
  }

  function getVisibleOptions(root = document) {
    return [...root.querySelectorAll(OPTION_SELECTOR)]
      .filter(isVisible)
      .filter((option) => !isDisabled(option));
  }

  function getPopupRootForOption(option) {
    return option.closest(POPUP_ROOT_SELECTOR) || option.parentElement;
  }

  function getVisibleOptionGroups() {
    const groups = new Map();
    for (const option of getVisibleOptions()) {
      const root = getPopupRootForOption(option);
      if (!(root instanceof Element) || !isVisible(root)) continue;
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(option);
    }
    return [...groups.entries()].map(([root, options]) => ({ root, options }));
  }

  function getLinkedPopupRoots(control) {
    if (!(control instanceof Element)) return [];
    const ids = [
      ...String(control.getAttribute("aria-controls") || "").split(/\s+/),
      ...String(control.getAttribute("aria-owns") || "").split(/\s+/)
    ].filter(Boolean);

    return uniqueElements(ids.map((id) => document.getElementById(id))).filter(isVisible);
  }

  function optionsFromRoots(roots) {
    return uniqueElements(
      roots.flatMap((root) => getVisibleOptions(root))
    );
  }

  function createOptionSession(control) {
    const baselineOptions = new Set(getVisibleOptions());
    const baselineRoots = new Set(getVisibleOptionGroups().map((group) => group.root));
    return {
      baselineOptions,
      baselineRoots,
      root: null,
      linked: false,
      control
    };
  }

  function findSessionOptions(control, session) {
    const linkedRoots = getLinkedPopupRoots(control);
    if (linkedRoots.length > 0) {
      session.linked = true;
      const linkedOptions = optionsFromRoots(linkedRoots);
      return linkedOptions.length > 0 ? linkedOptions : null;
    }

    if (session.root && isVisible(session.root)) {
      const rootedOptions = getVisibleOptions(session.root);
      if (rootedOptions.length > 0) return rootedOptions;
    }

    const groups = getVisibleOptionGroups();
    const newGroups = groups.filter((group) => !session.baselineRoots.has(group.root));
    if (newGroups.length === 1) {
      session.root = newGroups[0].root;
      return newGroups[0].options;
    }
    if (newGroups.length > 1) return null;

    const newOptions = getVisibleOptions().filter(
      (option) => !session.baselineOptions.has(option)
    );
    const roots = uniqueElements(newOptions.map(getPopupRootForOption));
    if (roots.length === 1) {
      session.root = roots[0];
      return newOptions;
    }

    // An already-open control without aria-controls is accepted only when one
    // visible option group exists globally. Multiple groups are always ambiguous.
    if (control.getAttribute("aria-expanded") === "true" && groups.length === 1) {
      session.root = groups[0].root;
      return groups[0].options;
    }

    return null;
  }

  async function openOptionSession(control) {
    const session = createOptionSession(control);
    let options = findSessionOptions(control, session);
    if (options) return { session, options };

    if (!safeClick(control)) return null;
    await sleep(C.WAIT_STEP_MS);

    options = await waitFor(
      () => findSessionOptions(control, session),
      C.OPTION_WAIT_TIMEOUT_MS
    );

    return options ? { session, options } : null;
  }

  function currentFieldContainsExactValue(control, desiredValue) {
    if (control instanceof HTMLSelectElement) {
      return [...control.selectedOptions].some((option) =>
        S.normalizedExactMatch(
          option.textContent || option.label || option.value,
          desiredValue
        )
      );
    }

    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      if (S.normalizedExactMatch(control.value, desiredValue)) return true;
    }

    if (S.normalizedExactMatch(control.getAttribute("aria-valuetext"), desiredValue)) {
      return true;
    }

    const selectedNodes = [
      ...control.querySelectorAll?.('[aria-selected="true"]') || []
    ].filter(isVisible);
    if (selectedNodes.some((node) => optionMatchesExact(node, desiredValue))) {
      return true;
    }

    if (leafTexts(control).some((text) => S.normalizedExactMatch(text, desiredValue))) {
      return true;
    }

    // For custom selects the selected chip/value may be a sibling of the input.
    // Inspect only a compact ancestor that contains this one usable control;
    // never climb into a broad row that could contain another field's value.
    let node = control.parentElement;
    for (let depth = 0; depth < 2 && node; depth += 1) {
      const rect = node.getBoundingClientRect();
      if (rect.height > 140 || rect.width > 1000) break;
      const controls = uniqueElements(
        [...node.querySelectorAll(CONTROL_SELECTOR)]
          .filter(isUsableControl)
          .map(resolveControl)
          .filter(Boolean)
      );
      if (controls.length !== 1 || controls[0] !== control) break;
      if (leafTexts(node).some((text) => S.normalizedExactMatch(text, desiredValue))) {
        return true;
      }
      node = node.parentElement;
    }

    return false;
  }

  function findUniqueExactOption(options, desired, allowCreate) {
    const matches = uniqueElements(options).filter((option) => {
      if (!isVisible(option) || isDisabled(option)) return false;
      if (allowCreate === false && looksLikeCreateNewOption(option)) return false;
      return optionMatchesExact(option, desired);
    });

    if (matches.length > 1) {
      log("Dropdown option match is ambiguous; field was skipped.");
      return null;
    }
    return matches.length === 1 ? matches[0] : null;
  }

  async function selectSingleValue(
    initialControl,
    desiredValue,
    options = {},
    reacquireControl = null
  ) {
    if (!S.isNonBlankString(desiredValue)) return false;

    let control = initialControl;
    const desired = desiredValue.trim();
    if (currentFieldContainsExactValue(control, desired)) return true;

    if (control instanceof HTMLSelectElement) {
      if (isDisabled(control) || isReadOnly(control)) return false;
      const matches = [...control.options].filter((option) =>
        !option.disabled &&
        S.normalizedExactMatch(
          option.textContent || option.label || option.value,
          desired
        )
      );
      if (matches.length !== 1) return false;
      control.value = matches[0].value;
      dispatchInputEvents(control);
      return true;
    }

    const opened = await openOptionSession(control);
    if (!opened) {
      control.blur?.();
      return false;
    }

    let match = findUniqueExactOption(
      opened.options,
      desired,
      options.allowCreate
    );
    if (match) {
      const clicked = safeClick(match);
      await sleep(C.WAIT_STEP_MS);
      return clicked;
    }

    if (typeof reacquireControl === "function") {
      const freshControl = reacquireControl();
      if (freshControl) control = freshControl;
    }

    // Search only in an input combobox, preserve its previous query, and keep
    // option lookup bound to the popup session opened by this control.
    if (
      control instanceof HTMLInputElement &&
      control.getAttribute("role") === "combobox" &&
      !isDisabled(control) &&
      !isReadOnly(control)
    ) {
      const previousValue = control.value;
      const typed = setNativeInputValue(control, desired, {
        blurAfter: false,
        dispatchChange: false
      });
      if (!typed) return false;
      control.focus();

      const filteredOptions = await waitFor(
        () => findSessionOptions(control, opened.session),
        C.OPTION_WAIT_TIMEOUT_MS
      );

      if (filteredOptions) {
        match = findUniqueExactOption(
          filteredOptions,
          desired,
          options.allowCreate
        );
      }

      if (match) {
        const clicked = safeClick(match);
        await sleep(C.WAIT_STEP_MS);
        return clicked;
      }

      // Failed imports must not leave an unselected search query behind.
      setNativeInputValue(control, previousValue, {
        blurAfter: true,
        dispatchChange: false
      });
      return false;
    }

    control.blur?.();
    return false;
  }

  async function selectMultipleValues(getControl, values, options = {}) {
    const cleanValues = S.sanitizeStringArray(values);
    if (cleanValues.length === 0) return false;

    let filledAny = false;

    for (const value of cleanValues) {
      const control = getControl();
      if (!control) {
        await sleep(C.BETWEEN_FIELDS_MS);
        continue;
      }

      if (currentFieldContainsExactValue(control, value)) {
        filledAny = true;
        continue;
      }

      const selected = await selectSingleValue(
        control,
        value,
        options,
        getControl
      );
      if (selected) filledAny = true;
      await sleep(C.BETWEEN_FIELDS_MS);
    }

    return filledAny;
  }

  function setCheckboxTrueOnly(control, value) {
    if (value !== true) return false;

    let checkbox = null;
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      checkbox = control;
    } else if (control.getAttribute("role") === "checkbox") {
      checkbox = control;
    } else {
      checkbox = control.querySelector?.(
        'input[type="checkbox"], [role="checkbox"]'
      ) || null;
    }

    if (!checkbox || !isVisible(checkbox) || isDisabled(checkbox)) return false;

    const checked = checkbox instanceof HTMLInputElement
      ? checkbox.checked
      : checkbox.getAttribute("aria-checked") === "true";

    if (checked) return true;
    return safeClick(checkbox);
  }

  async function fillAuto(control, value, fieldConfig, reacquireControl) {
    if (isSelectLike(control)) {
      return selectSingleValue(control, value, fieldConfig, reacquireControl);
    }
    return setTextControl(control, value);
  }

  function validateActionableValue(fieldConfig, rawValue) {
    if (["text", "single-select", "auto"].includes(fieldConfig.type)) {
      return S.isNonBlankString(rawValue) ? null : "empty";
    }
    if (fieldConfig.type === "multi-select") {
      const clean = S.sanitizeStringArray(rawValue);
      if (clean.length === 0) return "empty";
      const maxAllowed = C.MAX_MULTI_SELECT_VALUES || 20;
      if (clean.length > maxAllowed) return "too-many-values";
      return null;
    }
    if (fieldConfig.type === "date") {
      return S.isIsoDate(rawValue) ? null : "invalid-date";
    }
    if (fieldConfig.type === "number") {
      return S.isFiniteNonNegativeNumber(rawValue) ? null : "invalid-number";
    }
    if (fieldConfig.type === "checkbox-true-only") {
      return rawValue === true ? null : "not-true";
    }
    return "unsupported-adapter";
  }

  async function fillOneField(dialog, key, rawValue) {
    const fieldConfig = C.FIELDS[key];
    if (!fieldConfig) return { status: "skipped", reason: "unknown-field" };

    const invalidReason = validateActionableValue(fieldConfig, rawValue);
    if (invalidReason) return { status: "skipped", reason: invalidReason };

    const getFreshControl = () => {
      const liveDialog = findIssueDialog();
      return liveDialog ? findFieldControl(liveDialog, fieldConfig) : null;
    };

    const control = findFieldControl(dialog, fieldConfig);
    if (!control) return { status: "skipped", reason: "control-not-found" };
    if (isDisabled(control) || isReadOnly(control)) {
      return { status: "skipped", reason: "control-unavailable" };
    }

    let success = false;

    switch (fieldConfig.type) {
      case "text":
        success = setTextControl(control, rawValue);
        break;
      case "number":
        success = setNumberControl(control, rawValue);
        break;
      case "date":
        success = setDateControl(control, rawValue);
        break;
      case "single-select":
        success = await selectSingleValue(
          control,
          rawValue,
          fieldConfig,
          getFreshControl
        );
        break;
      case "multi-select":
        success = await selectMultipleValues(
          getFreshControl,
          rawValue,
          fieldConfig
        );
        break;
      case "checkbox-true-only":
        success = setCheckboxTrueOnly(control, rawValue);
        break;
      case "auto":
        success = await fillAuto(
          control,
          rawValue,
          fieldConfig,
          getFreshControl
        );
        break;
      default:
        success = false;
    }

    return success
      ? { status: "filled" }
      : { status: "skipped", reason: "not-filled" };
  }

  function buildFieldPlan(ticket) {
    return C.FIELD_ORDER.map((key) => [
      key,
      Object.prototype.hasOwnProperty.call(ticket, key) ? ticket[key] : undefined
    ]);
  }

  async function pasteTicket(ticket) {
    if (!S.isPlainObject(ticket)) {
      return { ok: false, error: "Ticket payload is not an object." };
    }
    if (ticket.schema_version !== C.SCHEMA_VERSION) {
      return {
        ok: false,
        error: `Unsupported or missing schema_version. Expected ${C.SCHEMA_VERSION}.`
      };
    }

    if (!findIssueDialog()) {
      return {
        ok: false,
        error: "No unique open PERMAQA Bug creation dialog found. Nothing was changed."
      };
    }

    const plan = buildFieldPlan(ticket);
    let filled = 0;
    let skipped = 0;
    let stopped = null;

    for (let index = 0; index < plan.length; index += 1) {
      const [key, value] = plan[index];
      const dialog = findIssueDialog();

      if (!dialog) {
        skipped += plan.length - index;
        stopped = "dialog-lost";
        log("Dialog guard no longer passes; remaining fields were skipped.");
        break;
      }

      try {
        const result = await fillOneField(dialog, key, value);
        if (result.status === "filled") {
          filled += 1;
          log(`${key}: filled`);
        } else {
          skipped += 1;
          log(`${key}: skipped (${result.reason})`);
        }
      } catch (error) {
        skipped += 1;
        const errorName = typeof error?.name === "string" ? error.name : "Error";
        log(`${key}: skipped due to ${errorName}`);
      }

      await sleep(C.BETWEEN_FIELDS_MS);
    }

    return { ok: true, filled, skipped, stopped };
  }

  let pasteInProgress = false;

  async function handlePasteTicket(ticket) {
    if (pasteInProgress) {
      return {
        ok: false,
        error: "A ticket paste is already in progress."
      };
    }

    pasteInProgress = true;
    try {
      return await pasteTicket(ticket);
    } finally {
      pasteInProgress = false;
    }
  }

  browser.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "GQA_PASTE_TICKET") return undefined;
    return handlePasteTicket(message.ticket);
  });

  log("content script loaded");
})();

