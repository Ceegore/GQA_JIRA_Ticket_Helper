# Security model and threat boundaries

## Intended trust model

The extension is an internal convenience layer running inside the tester's Firefox session. It is not a Jira integration service and holds no Jira credential. Jira authorization remains entirely the logged-in user's normal browser session.

## Primary safety boundary

The extension only fills the **currently open create-issue form** and never submits it. The human sees the result and manually chooses whether to create the issue.

## Explicitly absent capabilities

The runtime code must not contain:

- Jira REST endpoints or generic REST clients,
- Authorization/Bearer/API-token logic,
- external `fetch`, XHR, WebSocket, EventSource, beacon or dynamic remote-resource loading,
- storage, cookie, IndexedDB or Cache API use for ticket contents,
- form submission, submit-event dispatch or synthesized keyboard events,
- automatic clicks on Create/Erstellen/Submit/Save/Speichern,
- functionality targeting existing issue edit/delete screens.

## Permissions

Expected extension surface:

- `clipboardRead`,
- one exact `https://<site>.atlassian.net/*` host pattern in both `host_permissions` and content-script `matches`,
- Firefox `browser_specific_settings.gecko.id`,
- Firefox data-collection declaration `required: ["none"]`.

Do not add `tabs`, `storage`, `scripting`, broad `*://*/*` scope or unrelated hosts without a new approved product requirement.

## Clipboard threat

Clipboard content is untrusted input. Safeguards:

- 100,000 UTF-8 byte limit,
- JSON parse boundary,
- object-type check,
- mandatory exact schema version,
- known deterministic field plan only,
- per-field type checks,
- no dynamic execution,
- no HTML sinks,
- unknown keys ignored.

## HTML/script-like payload threat

Strings such as `<script>...</script>` must be inserted as text. `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function` and script creation are forbidden.

## Wrong-form threat

Before each field, the content script must re-establish **one and only one** visible dialog satisfying all of these conditions:

1. exact compact `PERMAQA` evidence in the upper dialog region or an evidence-backed selector,
2. exact compact `Bug` evidence in the upper dialog region or an evidence-backed selector,
3. an exact visible `Create`/`Erstellen` action used as evidence only.

Whole-dialog substring matching and “take the first matching dialog” are not acceptable. If the guard becomes false after a Jira rerender or the dialog closes, remaining fields are skipped.

## Wrong-dropdown-value threat

Only a unique exact normalized option may be selected. Options must be associated with the intended control through `aria-controls`/`aria-owns` or one uniquely newly opened popup root. The runtime must not choose from unrelated globally visible option lists. Duplicate exact labels, disabled options and create-new-label actions are skipped.

## Destructive-state threat

Empty or malformed JSON values do not clear fields. Disabled/read-only controls are skipped. Duplicate labels are attempted once. The true-only checkbox adapter never unchecks Impediment.

## Submit threat

All direct runtime UI clicks pass through `safeClick()`. It refuses:

- disabled elements,
- `input[type=submit]` and `input[type=image]`,
- form buttons with missing type or `type=submit`,
- any target whose visible/accessibility/title/value text exactly matches a forbidden submit/save action.

Static tests enforce one direct `.click()` location and reject form methods, submit events and keyboard synthesis. Any newly discovered path capable of creating an issue automatically is a release blocker.

## Data leakage threat

Runtime logs contain field keys and generic statuses only. Popup/runtime catch blocks do not pass clipboard payloads or raw error objects to the console. Development reports can contain internal field or option names; collect them on a blank form where possible and keep them in approved company systems.

## Development-tool caveat

Scripts under `tools/` are manual development utilities and are not part of the extension manifest. They may create local JSON downloads but make no network request. Generated reports are internal QA material.

## Residual risks

The dominant residual risk is incorrect/incomplete field filling caused by Jira DOM changes. The design intentionally fails closed or skips a field, keeps processing isolated when the dialog remains valid, and leaves final submission to the tester. Rich-text retention, exact custom-field controls, option catalogs and timing still require real internal Jira evidence.
