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
 *
 * Two Jira form layouts are handled by the same generic discovery:
 * - classic rows: a label next to an always-mounted input/select;
 * - issue-view style rows: a collapsed row (icon + field name, or a heading
 *   placeholder such as "Zusammenfassung") that only mounts its control after
 *   it is clicked. Such a row is activated with one safe click, the control
 *   that appears is filled, and the edit is committed by blurring it.
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

  // Anything inside an option popup is a *choice being offered*, never proof of
  // the form's current state. Reading state from these subtrees caused two real
  // failures: an open issue-type list made a Story dialog look like a Bug
  // dialog, and an open dropdown made unselected values look already filled.
  const OPTION_POPUP_SELECTOR = [
    '[role="listbox"]',
    '[role="menu"]',
    '[role="option"]',
    '[role="menuitem"]',
    '[role="menuitemradio"]',
    '[role="menuitemcheckbox"]'
  ].join(",");

  // Elements that may carry a field's visible name: classic labels, headings
  // (the issue-view style summary placeholder) and the clickable read view of
  // a collapsed row, which Jira renders as a button or a plain div/span.
  const LABEL_SELECTOR = [
    "label",
    "legend",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "[role='heading']",
    "button",
    "[role='button']",
    "[data-testid*='label']",
    "[id$='-label']",
    "span",
    "p",
    "div"
  ].join(",");

  const TEXT_INPUT_TYPES = new Set(["", "text", "search", "url", "tel", "email"]);

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

  /**
   * Laid out and not hidden. Opacity is deliberately ignored: react-select
   * keeps its search input at opacity 0 whenever a value is shown, and the
   * Atlaskit checkbox is a transparent input over a drawn box. Both are the
   * real, clickable controls of their fields.
   */
  function isRendered(element) {
    if (!(element instanceof Element) || !element.isConnected) return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /** Rendered and not transparent. Used for evidence: labels, options, buttons. */
  function isVisible(element) {
    if (!isRendered(element)) return false;
    const style = getComputedStyle(element);
    // An unresolved opacity must not be read as 0; Number("") is 0 and would
    // otherwise make every element invisible and every field silently skipped.
    return !(style.opacity !== "" && Number(style.opacity) === 0);
  }

  function isInsideOptionPopup(element) {
    if (!(element instanceof Element)) return false;
    return element.closest(OPTION_POPUP_SELECTOR) !== null;
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

  function elementText(element) {
    if (!(element instanceof Element)) return "";
    return String(element.innerText || element.textContent || "");
  }

  /** Text with all whitespace removed, for comparing rendered rich text. */
  function compactText(value) {
    return S.normalizeText(value).replace(/\s+/g, "");
  }

  function getAriaLabelledByText(element) {
    if (!(element instanceof Element)) return "";
    const ids = String(element.getAttribute("aria-labelledby") || "")
      .split(/\s+/)
      .filter(Boolean);

    return ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map(elementText)
      .join(" ");
  }

  function getAssociatedLabelText(element) {
    if (!(element instanceof Element) || !element.id) return "";
    try {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      return elementText(label);
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

  /**
   * Jira marks required fields with a trailing asterisk that is part of the
   * label's text ("Branch*" or "Branch *"). Some label components also append
   * a visually hidden "(required)". Neither is part of the field name.
   */
  function stripRequiredMarker(value) {
    return String(value || "")
      .replace(/\s*\((?:required|erforderlich|optional)\)\s*$/i, "")
      .replace(/\s*\*\s*$/, "");
  }

  function normalizedLabelText(value) {
    return S.normalizeText(stripRequiredMarker(value));
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

  // ---------------------------------------------------------------------------
  // Dialog guard
  // ---------------------------------------------------------------------------

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
      // An open issue-type or project picker lists every other value near the
      // top of the dialog. Accepting those as evidence would let a Story form
      // pass the Bug guard, so offered choices never count as the current type.
      if (isInsideOptionPopup(element)) return false;
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
    ].filter(isVisible).filter((element) => !isInsideOptionPopup(element));

    return candidates.some((element) =>
      accessibleTextsForElement(element).some((text) =>
        exactTextMatchesAny(text, C.CREATE_BUTTON_TEXTS)
      )
    );
  }

  function dialogGuardEvidence(dialog) {
    return {
      project: hasExactDialogGuardToken(
        dialog,
        C.EXPECTED_PROJECT_TEXT,
        C.PROJECT_GUARD_SELECTOR
      ),
      issueType: hasExactDialogGuardToken(
        dialog,
        C.EXPECTED_ISSUE_TYPE_TEXT,
        C.ISSUE_TYPE_GUARD_SELECTOR
      ),
      createButton: hasCreateButton(dialog)
    };
  }

  function dialogMatchesContract(dialog) {
    const evidence = dialogGuardEvidence(dialog);
    return evidence.project && evidence.issueType && evidence.createButton;
  }

  function findDialogCandidates() {
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

    return uniqueElements(candidates).filter(isVisible);
  }

  function findIssueDialog() {
    const passing = findDialogCandidates().filter(dialogMatchesContract);

    // Modal libraries often stack an aria-modal wrapper around the role=dialog
    // element. Both then pass the contract with the very same content, which
    // is one dialog, not two. Only the innermost of a nested chain counts; two
    // separate passing dialogs remain ambiguous.
    const matches = passing.filter(
      (dialog) => !passing.some((other) => other !== dialog && dialog.contains(other))
    );

    // Ambiguity is a safe stop. Never choose the first of multiple dialogs.
    return matches.length === 1 ? matches[0] : null;
  }

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

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
    if (!(control instanceof Element) || !isRendered(control)) return false;
    if (isExcludedInput(control)) return false;
    return true;
  }

  function isSelectLike(control) {
    if (!(control instanceof Element)) return false;
    if (control instanceof HTMLSelectElement) return true;
    if (control.getAttribute("role") === "combobox") return true;
    return control.getAttribute("aria-haspopup") === "listbox";
  }

  /**
   * What a control can hold. Discovery only pairs a field with a control of a
   * compatible kind, so a text field never claims a nearby checkbox or a
   * dropdown's search box just because it was the only control in reach.
   */
  function controlKind(control) {
    if (!(control instanceof Element)) return "other";
    if (isSelectLike(control)) return "select";
    if (control instanceof HTMLTextAreaElement) return "text";
    if (control instanceof HTMLInputElement) {
      const type = String(control.type || "text").toLowerCase();
      if (type === "checkbox") return "checkbox";
      if (type === "number") return "number";
      if (type === "date") return "date";
      return TEXT_INPUT_TYPES.has(type) ? "text" : "other";
    }
    if (isEditableElement(control)) return "text";
    if (control.getAttribute("role") === "checkbox") return "checkbox";
    return "other";
  }

  const ACCEPTED_KINDS = Object.freeze({
    text: ["text"],
    number: ["number", "text"],
    date: ["date", "text", "select"],
    "single-select": ["select"],
    "multi-select": ["select"],
    "checkbox-true-only": ["checkbox"],
    auto: ["text", "select"]
  });

  function controlAcceptsField(control, fieldConfig) {
    const accepted = ACCEPTED_KINDS[fieldConfig.type] || [];
    const kind = controlKind(control);
    if (!accepted.includes(kind)) return false;
    // A date picker exposes its text input as a combobox; a real listbox
    // button is still no place to type a date.
    if (fieldConfig.type === "date" && kind === "select") {
      return control instanceof HTMLInputElement;
    }
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

  /** Usable controls in `root` (including `root` itself), optionally only those a field accepts. */
  function usableControlsWithin(root, fieldConfig = null) {
    const nodes = [...root.querySelectorAll(CONTROL_SELECTOR)];
    if (root instanceof Element && root.matches(CONTROL_SELECTOR)) nodes.unshift(root);
    return uniqueElements(
      nodes
        .filter(isUsableControl)
        .map(resolveControl)
        .filter(Boolean)
        .filter((control) => !fieldConfig || controlAcceptsField(control, fieldConfig))
    );
  }

  function controlMatchesAliases(control, aliases) {
    const texts = accessibleTextsForControl(control);

    for (const text of texts) {
      const normalizedText = normalizedLabelText(text);
      for (const alias of aliases) {
        const normalizedAlias = S.normalizeText(alias);
        if (normalizedText === normalizedAlias) return true;

        // Jira placeholders may contain explanatory text after the field name.
        // Prefix matching is allowed only for accessible labels/placeholders,
        // never for dropdown option values.
        if (normalizedText.startsWith(`${normalizedAlias} `)) return true;
      }
    }

    return false;
  }

  function findControlByAccessibleName(root, fieldConfig) {
    const matches = uniqueElements(
      [...root.querySelectorAll(CONTROL_SELECTOR)]
        .filter(isUsableControl)
        .filter((control) => controlMatchesAliases(control, fieldConfig.aliases))
        .map(resolveControl)
        .filter(Boolean)
        .filter((control) => controlAcceptsField(control, fieldConfig))
    );

    return matches.length === 1 ? matches[0] : null;
  }

  // ---------------------------------------------------------------------------
  // Labels and rows
  // ---------------------------------------------------------------------------

  /**
   * A collapsed row or an empty editor shows a placeholder sentence instead of
   * the bare field name: "Beschreibung hinzufügen oder ..." or "Add a
   * description ...". Only a verb from the configured list may separate the
   * alias from the rest, so "Branch" never matches a "Branch Manager" label.
   */
  function isPlaceholderForAlias(normalizedText, normalizedAlias) {
    const verbs = (C.PLACEHOLDER_VERBS || []).map(S.normalizeText).filter(Boolean);
    if (verbs.length === 0) return false;

    if (normalizedText.startsWith(`${normalizedAlias} `)) {
      const rest = normalizedText.slice(normalizedAlias.length + 1);
      return verbs.some((verb) => rest === verb || rest.startsWith(`${verb} `));
    }

    for (const verb of verbs) {
      if (!normalizedText.startsWith(`${verb} `)) continue;
      const rest = normalizedText
        .slice(verb.length + 1)
        .replace(/^(?:a|an|the|eine|einen|ein|die|der|das) /, "");
      if (rest === normalizedAlias || rest.startsWith(`${normalizedAlias} `)) return true;
    }
    return false;
  }

  function labelMatchKind(text, aliases) {
    const normalizedText = normalizedLabelText(text);
    if (!normalizedText) return null;
    const normalizedAliases = aliases.map(S.normalizeText);
    if (normalizedAliases.includes(normalizedText)) return "exact";
    if (normalizedAliases.some((alias) => isPlaceholderForAlias(normalizedText, alias))) {
      return "placeholder";
    }
    return null;
  }

  function isCompactLabelBox(element) {
    const rect = element.getBoundingClientRect();
    return rect.height <= 80 && rect.width <= 800;
  }

  /**
   * Visible elements whose own text is the field name. Exact matches win;
   * placeholder sentences are only used when no exact label exists.
   */
  function findLabelElements(root, aliases) {
    const exact = [];
    const placeholder = [];

    for (const element of root.querySelectorAll(LABEL_SELECTOR)) {
      const kind = labelMatchKind(elementText(element), aliases);
      if (!kind || isInsideOptionPopup(element)) continue;
      if (!isVisible(element) || !isCompactLabelBox(element)) continue;
      (kind === "exact" ? exact : placeholder).push(element);
    }

    return exact.length > 0 ? exact : placeholder;
  }

  function otherFieldAliases(fieldKey) {
    return Object.entries(C.FIELDS)
      .filter(([key]) => key !== fieldKey)
      .flatMap(([, config]) => config.aliases);
  }

  function containsOtherFieldLabel(node, fieldKey) {
    const aliases = otherFieldAliases(fieldKey);
    return [...node.querySelectorAll(LABEL_SELECTOR)].some((element) =>
      labelMatchKind(elementText(element), aliases) === "exact" &&
      !isInsideOptionPopup(element) &&
      isVisible(element) &&
      isCompactLabelBox(element)
    );
  }

  function controlsExplicitlyLabelledBy(root, labelElement, fieldConfig) {
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
      .filter(Boolean)
      .filter((control) => controlAcceptsField(control, fieldConfig));
  }

  function isNearLabel(control, labelElement) {
    const offset = control.getBoundingClientRect().top - labelElement.getBoundingClientRect().top;
    // A field's control sits on the label's line or below it, never far away.
    return offset >= -40 && offset <= 200;
  }

  function controlFromLabel(root, labelElement, fieldConfig, fieldKey) {
    if (!labelElement) return null;

    if (labelElement instanceof HTMLLabelElement && labelElement.htmlFor) {
      const direct = document.getElementById(labelElement.htmlFor);
      const resolved = resolveControl(direct);
      if (resolved && root.contains(resolved) && controlAcceptsField(resolved, fieldConfig)) {
        return resolved;
      }
    }

    const explicitlyLabelled = uniqueElements(
      controlsExplicitlyLabelledBy(root, labelElement, fieldConfig)
    );
    if (explicitlyLabelled.length === 1) return explicitlyLabelled[0];
    if (explicitlyLabelled.length > 1) return null;

    const nested = usableControlsWithin(labelElement, fieldConfig).filter(
      (control) => control !== labelElement
    );
    if (nested.length === 1) return nested[0];
    if (nested.length > 1) return null;

    // Climb towards the field's own container. Stop before an ancestor that
    // also holds another field's label: a control found there belongs to a
    // different row, which is exactly how a wrong field could get written.
    let node = labelElement.parentElement;
    for (let depth = 0; depth < 6 && node && root.contains(node); depth += 1) {
      if (containsOtherFieldLabel(node, fieldKey)) return null;
      const controls = usableControlsWithin(node, fieldConfig);
      if (controls.length === 1) {
        return isNearLabel(controls[0], labelElement) ? controls[0] : null;
      }
      if (controls.length > 1) return null;
      if (node === root) break;
      node = node.parentElement;
    }

    return null;
  }

  /**
   * Returns { control, label, via }. `label` is also set when the field's row
   * was recognised but no control is mounted yet, so the caller can activate
   * the row.
   */
  function locateField(root, fieldConfig, fieldKey) {
    if (fieldConfig.selector) {
      const exact = queryConfiguredWithin(root, fieldConfig.selector);
      const resolved = resolveControl(exact);
      if (resolved) return { control: resolved, label: null, via: "selector" };
    }

    const byAccessibleName = findControlByAccessibleName(root, fieldConfig);
    if (byAccessibleName) {
      return { control: byAccessibleName, label: null, via: "accessible-name" };
    }

    const labels = uniqueElements(findLabelElements(root, fieldConfig.aliases));
    const fromLabels = uniqueElements(
      labels
        .map((label) => controlFromLabel(root, label, fieldConfig, fieldKey))
        .filter(Boolean)
    );
    if (fromLabels.length === 1) {
      return { control: fromLabels[0], label: labels[0], via: "label" };
    }
    if (fromLabels.length > 1) return { control: null, label: null, via: null };

    // Nested wrappers all carry the same text; the innermost is the one whose
    // click reaches the row's handler without any doubt about the target.
    const innermost = labels.filter(
      (label) => !labels.some((other) => other !== label && label.contains(other))
    );
    return {
      control: null,
      label: innermost.length === 1 ? innermost[0] : null,
      via: null
    };
  }

  function findFieldControl(root, fieldConfig, fieldKey) {
    return locateField(root, fieldConfig, fieldKey).control;
  }

  // ---------------------------------------------------------------------------
  // Clicking
  // ---------------------------------------------------------------------------

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
    if (!element || !isRendered(element)) return false;
    if (isForbiddenClickTarget(element)) {
      log("Refused unsafe or submit-capable click target.");
      return false;
    }
    element.click();
    return true;
  }

  /**
   * A pointer press without activation. react-select opens its menu from the
   * mousedown on its control, not from a click, so a click alone leaves every
   * Jira dropdown closed. The press goes through the same refusal rules as a
   * click and is only ever sent to select-like controls.
   */
  function safePress(element) {
    if (!element || !isRendered(element) || !isSelectLike(element)) return false;
    if (isForbiddenClickTarget(element)) return false;
    for (const type of ["mousedown", "mouseup"]) {
      element.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true, composed: true, button: 0 })
      );
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Text adapters
  // ---------------------------------------------------------------------------

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
      !isRendered(element) ||
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

    element.focus();
    // The prototype setter bypasses React's per-node value tracker so the
    // following input event is seen as a real change. Should the prototype not
    // expose the accessor, plain assignment behaves the same from a content
    // script, which never sees page-defined instance properties anyway.
    if (descriptor?.set) descriptor.set.call(element, String(value));
    else element.value = String(value);

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
      !isRendered(element) ||
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

  function controlHoldsText(control, value) {
    if (!(control instanceof Element) || !control.isConnected) return false;
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      // A single-line field may normalise line breaks or edge spaces; only
      // the characters count, so a truncated value is still detected.
      return control.value === String(value) ||
        compactText(control.value).includes(compactText(value));
    }
    if (isEditableElement(control)) {
      // A rich-text editor re-renders the text as paragraphs, so only the
      // characters can be compared, not the whitespace between them.
      return compactText(control.textContent).includes(compactText(value));
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Collapsed (inline-edit) rows and editors
  // ---------------------------------------------------------------------------

  function isControlElement(element) {
    return element instanceof Element && element.matches(CONTROL_SELECTOR);
  }

  /**
   * The part of the dialog a row's new control must appear in: the row's
   * nearest ancestor that survived the re-render. Only when every remembered
   * ancestor is gone does the whole dialog count, so a control mounted by
   * another row can never be adopted by this one.
   */
  function activationScope(dialog, containers) {
    return containers.find(
      (node) => node !== dialog && node.isConnected && dialog.contains(node)
    ) || dialog;
  }

  /**
   * The control a row mounted after being activated: preferably the element
   * Jira focused, otherwise the single new compatible control inside the
   * row's scope. Controls that already existed before the click are never
   * adopted, so an activation can only ever claim what it caused.
   */
  function freshControlAfterActivation(dialog, baseline, fieldConfig, containers) {
    const scope = activationScope(dialog, containers);
    const focused = document.activeElement;
    const active = isControlElement(focused) ? resolveControl(focused) : null;
    if (
      active &&
      scope.contains(active) &&
      !baseline.has(active) &&
      controlAcceptsField(active, fieldConfig)
    ) {
      return active;
    }

    const fresh = usableControlsWithin(scope, fieldConfig).filter(
      (control) => !baseline.has(control)
    );
    return fresh.length === 1 ? fresh[0] : null;
  }

  /**
   * Where a collapsed row may be clicked to open it: the field name itself,
   * then the value shown next to it (a filled row's name is often outside the
   * clickable read view while its value is inside), then the compact row.
   */
  function activationTargets(labelElement) {
    // A <label> that owns a control belongs to a classic row whose control was
    // simply not acceptable for this field. Clicking it (or its row) would
    // toggle or focus that control, so such a row is never activated.
    if (labelElement.closest("label")?.control) return [];

    const targets = [labelElement];
    const parent = labelElement.parentElement;
    if (!(parent instanceof Element) || !isCompactLabelBox(parent)) return targets;

    for (const sibling of parent.children) {
      if (sibling === labelElement || !isVisible(sibling) || !isCompactLabelBox(sibling)) continue;
      if (isControlElement(sibling) || usableControlsWithin(sibling).length > 0) continue;
      if (elementText(sibling).trim()) targets.push(sibling);
    }
    targets.push(parent);
    return targets.slice(0, 3);
  }

  /**
   * A collapsed row that already displays the wanted value next to its name
   * needs no editing at all. Only the row's own compact box is consulted, so
   * another row's value can never satisfy this check.
   */
  function rowAlreadyShows(labelElement, value) {
    const row = labelElement.parentElement;
    if (!(row instanceof Element) || !isCompactLabelBox(row)) return false;
    return currentValueTexts(row).some((text) => S.normalizedExactMatch(text, value));
  }

  async function activateRow(dialog, labelElement, fieldConfig, containers) {
    const baseline = new Set(usableControlsWithin(dialog));
    let waitMs = C.ACTIVATION_WAIT_MS;

    for (const target of activationTargets(labelElement)) {
      if (!safeClick(target)) continue;
      const control = await waitFor(
        () => freshControlAfterActivation(dialog, baseline, fieldConfig, containers),
        waitMs
      );
      if (control) return control;
      // The first click gets the full budget (an editor may load on demand);
      // a row that ignored it is unlikely to need long for the next target.
      waitMs = C.WAIT_TIMEOUT_MS;
    }

    return null;
  }

  /**
   * The nearest ancestors of an element inside the dialog, kept so a row can
   * be re-read after React has re-rendered it.
   */
  function containersOf(element, dialog) {
    const containers = [];
    let node = element?.parentElement;
    for (let depth = 0; depth < 4 && node && dialog.contains(node); depth += 1) {
      containers.push(node);
      if (node === dialog) break;
      node = node.parentElement;
    }
    return containers;
  }

  /**
   * Whether a read view shows `value`: as one leaf text, as its first line
   * (rich text is rendered one paragraph per line), or, for text long enough
   * not to occur by accident, as a character sequence split across marks.
   */
  function textIsShownIn(container, value) {
    const leaves = currentValueTexts(container);
    if (leaves.some((text) => S.normalizedExactMatch(text, value))) return true;

    const lines = String(value).split(/\r?\n/).filter((line) => line.trim());
    if (lines.length > 1 && leaves.some((text) => S.normalizedExactMatch(text, lines[0]))) {
      return true;
    }

    const needle = compactText(value);
    return needle.length >= 8 && compactText(container.textContent).includes(needle);
  }

  /**
   * A date picker re-renders an ISO date in the UI locale ("30.09.2026",
   * "30. Sept. 2026"), so the year and the day must be present as whole
   * numbers, and the month either as a number or as a word.
   */
  function dateIsShownIn(text, isoDate) {
    const [year, month, day] = String(isoDate).split("-");
    const has = (token) => new RegExp(`(?:^|[^0-9])0?${Number(token)}(?:[^0-9]|$)`).test(text);
    return has(year) && has(day) && (has(month) || /[a-zäöü]{3,}/.test(text));
  }

  /** A number field may display a decimal comma; compare the numeric values. */
  function numberIsShownIn(texts, value) {
    return texts.some((text) => {
      const normalized = String(text).trim().replace(",", ".");
      return /^-?\d+(?:\.\d+)?$/.test(normalized) && Number(normalized) === Number(value);
    });
  }

  function valueIsShownIn(container, value, fieldConfig) {
    if (fieldConfig.type === "date") {
      return dateIsShownIn(S.normalizeText(container.textContent), value);
    }
    if (fieldConfig.type === "number") {
      return numberIsShownIn(currentValueTexts(container), value);
    }
    return textIsShownIn(container, value);
  }

  function controlShowsValue(control, value, fieldConfig) {
    if (controlHoldsText(control, value) || currentFieldContainsExactValue(control, value)) {
      return true;
    }
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
      return false;
    }
    if (fieldConfig.type === "date") return dateIsShownIn(S.normalizeText(control.value), value);
    if (fieldConfig.type === "number") return numberIsShownIn([control.value], value);
    return false;
  }

  /**
   * After an activated row is blurred, Jira either keeps the control (value
   * still inside it) or collapses the row again with the value in its read
   * view. Anything else means the edit was discarded.
   */
  function editPersisted(control, containers, valueTexts, fieldConfig) {
    if (control instanceof Element && control.isConnected && isRendered(control)) {
      if (valueTexts.every((value) => controlShowsValue(control, value, fieldConfig))) return true;
    }
    const container = containers.find((node) => node.isConnected && isRendered(node));
    if (!container) return false;
    return valueTexts.every((value) => valueIsShownIn(container, value, fieldConfig));
  }

  async function commitInlineEdit(control, containers, valueTexts, fieldConfig) {
    if (control instanceof Element && control.isConnected) {
      // Blur commits an inline edit; nothing is ever pressed or submitted.
      control.blur?.();
    }
    await sleep(C.SETTLE_MS);
    return editPersisted(control, containers, valueTexts, fieldConfig);
  }

  /**
   * Writes a text value and follows the control if Jira swaps it while doing
   * so: a collapsed description editor is a plain input whose focus unmounts
   * it and mounts the real editor, so the text must land in that editor, not
   * in the detached placeholder input. A row that collapses on blur with the
   * value in its read view has simply committed the edit.
   */
  async function writeTextValue(control, value, dialog, fieldConfig, containers) {
    const baseline = new Set(usableControlsWithin(dialog));
    if (!setTextControl(control, value)) return { ok: false, reason: "not-filled" };
    if (controlHoldsText(control, value)) return { ok: true, control };
    if (control.isConnected) return { ok: false, reason: "not-confirmed" };

    const container = containers.find((node) => node.isConnected && isRendered(node));
    if (container && textIsShownIn(container, value)) return { ok: true, control };

    const replacement = await waitFor(
      () => freshControlAfterActivation(dialog, baseline, fieldConfig, containers),
      C.WAIT_TIMEOUT_MS
    );
    // The text was written, yet the control is gone and nothing shows the
    // value: the edit was discarded, which is a confirmation failure.
    if (!replacement) return { ok: false, reason: "not-confirmed" };
    if (!setTextControl(replacement, value)) return { ok: false, reason: "not-filled" };
    return controlHoldsText(replacement, value)
      ? { ok: true, control: replacement }
      : { ok: false, reason: "not-confirmed" };
  }

  // ---------------------------------------------------------------------------
  // Dropdowns
  // ---------------------------------------------------------------------------

  /**
   * Visible leaf texts under `element`.
   *
   * `skipOptionPopups` must be set whenever the result is used as evidence of a
   * field's CURRENT value: Jira renders dropdown menus inside the same field
   * container, so an open menu would otherwise report every offered option as
   * already selected. Option matching itself must keep it off, because there
   * the popup content is exactly what has to be read.
   */
  function leafTexts(element, { skipOptionPopups = false } = {}) {
    if (skipOptionPopups && isInsideOptionPopup(element)) return [];

    const filter = skipOptionPopups
      ? {
          acceptNode(node) {
            return node.matches(OPTION_POPUP_SELECTOR)
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_ACCEPT;
          }
        }
      : null;

    const output = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, filter);
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

  function currentValueTexts(element) {
    return leafTexts(element, { skipOptionPopups: true });
  }

  function optionMatchesExact(option, desiredValue) {
    const wholeText = option.innerText || option.textContent || "";
    if (S.normalizedExactMatch(wholeText, desiredValue)) return true;

    // Person-picker options may include secondary text. Exact matching of one
    // visible leaf remains allowed; substring/fuzzy matching is still forbidden.
    return leafTexts(option).some((text) => S.normalizedExactMatch(text, desiredValue));
  }

  /**
   * Creatable pickers offer to create the typed text as a new value. Such an
   * option can carry the desired text as one of its leaves, so it is refused
   * by its wording, in both UI languages, before leaf matching runs.
   */
  function looksLikeCreateNewOption(option) {
    const text = S.normalizeText(option.innerText || option.textContent || "");
    return (
      /^(?:create|erstellen|add|hinzufügen|anlegen|new|neu)\b/.test(text) ||
      /\b(?:create new|neu erstellen|neu anlegen|new label|neues label|neues stichwort)\b/.test(text) ||
      /\((?:new|neu)\)/.test(text)
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
      control
    };
  }

  function findSessionOptions(control, session) {
    const linkedRoots = getLinkedPopupRoots(control);
    if (linkedRoots.length > 0) {
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

  /**
   * Opens the control's popup and returns its session. `options` is empty when
   * nothing opened within the timeout; a searchable picker may still be opened
   * by typing, which selectSingleValue does inside the same session.
   */
  async function openOptionSession(control) {
    const session = createOptionSession(control);
    let options = findSessionOptions(control, session);
    if (options) return { session, options };

    const pressed = safePress(control);
    const clicked = safeClick(control);
    if (!pressed && !clicked) return null;
    if (!isDisabled(control)) control.focus?.();
    await sleep(C.WAIT_STEP_MS);

    options = await waitFor(
      () => findSessionOptions(control, session),
      C.OPTION_WAIT_TIMEOUT_MS
    );

    return { session, options: options || [] };
  }

  function currentFieldContainsExactValue(control, desiredValue) {
    if (!(control instanceof Element) || !control.isConnected) return false;

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

    if (currentValueTexts(control).some((text) => S.normalizedExactMatch(text, desiredValue))) {
      return true;
    }

    // For custom selects the selected chip/value may be a sibling of the input.
    // Inspect only a compact ancestor that contains this one usable control;
    // never climb into a broad row that could contain another field's value.
    let node = control.parentElement;
    for (let depth = 0; depth < 2 && node; depth += 1) {
      const rect = node.getBoundingClientRect();
      if (rect.height > 140 || rect.width > 1000) break;
      const controls = usableControlsWithin(node);
      if (controls.length !== 1 || controls[0] !== control) break;
      if (currentValueTexts(node).some((text) => S.normalizedExactMatch(text, desiredValue))) {
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

  /**
   * Polls the popup session until one exact option exists. Pickers that load
   * their options after a search request show the previous list first, so a
   * single look right after typing would judge stale options.
   */
  function waitForUniqueExactOption(control, session, desired, allowCreate) {
    return waitFor(() => {
      const options = findSessionOptions(control, session);
      return options ? findUniqueExactOption(options, desired, allowCreate) : null;
    }, C.OPTION_WAIT_TIMEOUT_MS);
  }

  function isSearchableCombobox(control) {
    return (
      control instanceof HTMLInputElement &&
      control.getAttribute("role") === "combobox" &&
      !isDisabled(control) &&
      !isReadOnly(control)
    );
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
    if (isSearchableCombobox(control)) {
      const previousValue = control.value;
      const typed = setNativeInputValue(control, desired, {
        blurAfter: false,
        dispatchChange: false
      });
      if (!typed) return false;
      control.focus();

      match = await waitForUniqueExactOption(
        control,
        opened.session,
        desired,
        options.allowCreate
      );

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

  /**
   * Returns how many of the requested values ended up on the field. The caller
   * needs the counts, not a boolean: reporting a partly filled label field as
   * "filled" would hide missing labels from the tester who reviews the form.
   */
  async function selectMultipleValues(getControl, values, options = {}) {
    const cleanValues = S.sanitizeStringArray(values);
    if (cleanValues.length === 0) return { requested: 0, selected: 0 };

    const selectedValues = [];

    for (const value of cleanValues) {
      const control = getControl();
      if (!control) {
        await sleep(C.BETWEEN_FIELDS_MS);
        continue;
      }

      if (currentFieldContainsExactValue(control, value)) {
        selectedValues.push(value);
        continue;
      }

      const selected = await selectSingleValue(
        control,
        value,
        options,
        getControl
      );
      if (selected) selectedValues.push(value);
      await sleep(C.BETWEEN_FIELDS_MS);
    }

    return { requested: cleanValues.length, selected: selectedValues.length, selectedValues };
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

    if (!checkbox || !isRendered(checkbox) || isDisabled(checkbox)) return false;

    const checked = checkbox instanceof HTMLInputElement
      ? checkbox.checked
      : checkbox.getAttribute("aria-checked") === "true";

    if (checked) return true;
    return safeClick(checkbox);
  }

  // ---------------------------------------------------------------------------
  // Field plan
  // ---------------------------------------------------------------------------

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

    const located = locateField(dialog, fieldConfig, key);
    let control = located.control;
    let activated = false;
    let containers = containersOf(control, dialog);

    if (!control && located.label) {
      const singleValue = ["text", "single-select", "auto"].includes(fieldConfig.type)
        ? rawValue.trim()
        : null;
      if (singleValue && rowAlreadyShows(located.label, singleValue)) {
        return { status: "filled" };
      }
      containers = containersOf(located.label, dialog);
      control = await activateRow(dialog, located.label, fieldConfig, containers);
      if (!control) return { status: "skipped", reason: "control-not-mounted" };
      activated = true;
    }
    if (!control) return { status: "skipped", reason: "control-not-found" };

    // A closed react-select renders a read-only search input; the select path
    // knows how to open it, so read-only only blocks the typed adapters.
    const typedAdapter = ["text", "number", "date"].includes(fieldConfig.type) ||
      (fieldConfig.type === "auto" && !isSelectLike(control));
    if (isDisabled(control) || (typedAdapter && isReadOnly(control))) {
      return { status: "skipped", reason: "control-unavailable" };
    }

    let lastControl = control;
    const getFreshControl = () => {
      // An activated row keeps its control until it is committed; the field is
      // only looked up again when React has really replaced the node.
      if (lastControl?.isConnected && isUsableControl(lastControl)) return lastControl;
      const liveDialog = findIssueDialog();
      const fresh = liveDialog ? findFieldControl(liveDialog, fieldConfig, key) : null;
      if (fresh) lastControl = fresh;
      return fresh;
    };

    let success = false;
    let valueTexts = [];

    switch (fieldConfig.type) {
      case "text":
      case "auto": {
        if (fieldConfig.type === "auto" && isSelectLike(control)) {
          success = await selectSingleValue(control, rawValue, fieldConfig, getFreshControl);
          valueTexts = [rawValue.trim()];
          break;
        }
        const outcome = await writeTextValue(control, rawValue, dialog, fieldConfig, containers);
        if (!outcome.ok) return { status: "skipped", reason: outcome.reason };
        lastControl = outcome.control;
        valueTexts = [rawValue];
        success = true;
        break;
      }
      case "number":
        success = setNumberControl(control, rawValue);
        valueTexts = [String(rawValue)];
        break;
      case "date":
        success = setDateControl(control, rawValue);
        valueTexts = [rawValue];
        break;
      case "single-select":
        success = await selectSingleValue(
          control,
          rawValue,
          fieldConfig,
          getFreshControl
        );
        valueTexts = [rawValue.trim()];
        break;
      case "multi-select": {
        const outcome = await selectMultipleValues(
          getFreshControl,
          rawValue,
          fieldConfig
        );
        if (outcome.selected === 0) {
          if (activated) await commitInlineEdit(lastControl, containers, [], fieldConfig);
          return { status: "skipped", reason: "not-filled" };
        }
        if (activated) {
          const persisted = await commitInlineEdit(
            lastControl,
            containers,
            outcome.selectedValues,
            fieldConfig
          );
          if (!persisted) return { status: "skipped", reason: "not-confirmed" };
        }
        if (outcome.selected < outcome.requested) {
          return {
            status: "partial",
            reason: "partial-values",
            selected: outcome.selected,
            requested: outcome.requested
          };
        }
        return { status: "filled" };
      }
      case "checkbox-true-only":
        success = setCheckboxTrueOnly(control, rawValue);
        break;
      default:
        success = false;
    }

    if (!success) return { status: "skipped", reason: "not-filled" };

    if (activated && valueTexts.length > 0) {
      const persisted = await commitInlineEdit(lastControl, containers, valueTexts, fieldConfig);
      if (!persisted) return { status: "skipped", reason: "not-confirmed" };
    }

    return { status: "filled" };
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
        error: `No unique open ${C.EXPECTED_PROJECT_TEXT} ${C.EXPECTED_ISSUE_TYPE_TEXT} creation dialog found. Nothing was changed.`
      };
    }

    const plan = buildFieldPlan(ticket);
    const fields = [];
    let filled = 0;
    let partial = 0;
    let skipped = 0;
    let stopped = null;

    for (let index = 0; index < plan.length; index += 1) {
      const [key, value] = plan[index];
      const dialog = findIssueDialog();

      if (!dialog) {
        for (const [remainingKey] of plan.slice(index)) {
          fields.push({ key: remainingKey, status: "skipped", reason: "dialog-lost" });
        }
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
        } else if (result.status === "partial") {
          partial += 1;
          log(`${key}: partly filled (${result.selected}/${result.requested})`);
        } else {
          skipped += 1;
          log(`${key}: skipped (${result.reason})`);
        }
        fields.push({ key, ...result });
      } catch (error) {
        skipped += 1;
        const errorName = typeof error?.name === "string" ? error.name : "Error";
        log(`${key}: skipped due to ${errorName}`);
        fields.push({ key, status: "skipped", reason: "error" });
      }

      await sleep(C.BETWEEN_FIELDS_MS);
    }

    return { ok: true, filled, partial, skipped, stopped, fields };
  }

  // ---------------------------------------------------------------------------
  // Read-only diagnosis: what the engine sees on the current page
  // ---------------------------------------------------------------------------

  function describeBox(element) {
    const rect = element.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
  }

  function describeControl(element) {
    if (!(element instanceof Element)) return null;
    return {
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type") || "",
      role: element.getAttribute("role") || "",
      id: element.id || "",
      name: element.getAttribute("name") || "",
      ariaLabel: element.getAttribute("aria-label") || "",
      placeholder: element.getAttribute("placeholder") || "",
      testId: element.getAttribute("data-testid") || "",
      contentEditable: element.getAttribute("contenteditable") || "",
      disabled: isDisabled(element),
      readOnly: isReadOnly(element),
      kind: controlKind(element),
      ...describeBox(element)
    };
  }

  function describeLabel(element) {
    if (!(element instanceof Element)) return null;
    return {
      tag: element.tagName.toLowerCase(),
      text: S.normalizeText(elementText(element)).slice(0, 80),
      testId: element.getAttribute("data-testid") || "",
      ...describeBox(element)
    };
  }

  function describeDialog(element) {
    return {
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role") || "",
      ariaModal: element.getAttribute("aria-modal") || "",
      testId: element.getAttribute("data-testid") || "",
      ...describeBox(element),
      ...dialogGuardEvidence(element)
    };
  }

  /**
   * Structural report only: labels, control attributes and guard evidence.
   * Field values are never read, and nothing on the page is clicked, focused
   * or changed.
   */
  function diagnosePage() {
    const dialog = findIssueDialog();
    const report = {
      ok: true,
      page: location.pathname,
      dialogs: findDialogCandidates().map(describeDialog),
      dialogFound: Boolean(dialog),
      fields: []
    };

    if (!dialog) return report;

    for (const key of C.FIELD_ORDER) {
      const fieldConfig = C.FIELDS[key];
      const located = locateField(dialog, fieldConfig, key);
      const labels = uniqueElements(findLabelElements(dialog, fieldConfig.aliases));
      report.fields.push({
        key,
        via: located.via,
        control: describeControl(located.control),
        label: describeLabel(located.label || labels[0] || null),
        labelCount: labels.length
      });
    }

    return report;
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

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

  function handleDiagnose() {
    try {
      return Promise.resolve(diagnosePage());
    } catch {
      return Promise.resolve({ ok: false, error: "Diagnosis failed on this page." });
    }
  }

  browser.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") return undefined;
    if (message.type === "GQA_PASTE_TICKET") return handlePasteTicket(message.ticket);
    if (message.type === "GQA_DIAGNOSE") return handleDiagnose();
    return undefined;
  });

  log("content script loaded");
})();
