# Field adapter guide for the implementation AI

Use this decision tree to avoid redesigning the engine when one Jira control behaves differently.

## Decision tree

### 1. JSON value invalid or empty?

Yes -> skip. Do not locate or mutate the field.

### 2. Dialog guard not uniquely satisfied?

Stop. Run `tools/dialog-guard-probe.js`. Do not weaken the guard to whole-dialog substring matching and do not choose the first of multiple dialogs.

### 3. Control not found or multiple candidates found?

Click **Diagnose page** in the popup, then run `tools/dom-report-exporter.js`. Add one stable, evidence-backed `selector` in `config.js` for that field before touching generic discovery. Ambiguity must skip, not select the first nearby control.

Discovery pairs a field only with a control of a compatible kind (a text field never takes a checkbox or a dropdown's search box), stops climbing at an ancestor that holds another field's label and requires the control to sit on or below its label.

### 3a. Row recognised but no control mounted (issue-view style dialog)?

Jira's issue-view style create dialog collapses each row to an icon plus the field name (or a placeholder sentence such as "Beschreibung hinzufügen ..."); the control exists only after the row is clicked. The engine activates such a row with `safeClick` on the name, the shown value or the compact row, adopts only a compatible control that did not exist before the click (preferring the one Jira focused), fills it, commits by blurring it and verifies that the control or the collapsed row shows the value. A row that discards the edit is reported as not confirmed. No key is ever pressed and no confirm button is clicked; a row that needs one is evidence for a field-specific decision, not for weakening the click gate.

### 4. Normal input/textarea?

Use the existing native value setter plus input/change and optional blur. Check disabled/read-only state. Nonblank accepted text is preserved as supplied rather than silently trimmed.

### 5. Actual editable area?

Use the plaintext editor adapter only when `isContentEditable` or a real `contenteditable` value proves editability. `role=textbox` by itself is an accessibility role, not proof that the wrapper may safely have its `textContent` replaced. Never use `innerHTML`.

`document.execCommand("insertText")` is retained only as a compatibility bridge for editors such as ProseMirror and must be confirmed in real Jira. The safe fallback writes plain text only to a proven editable element.

### 6. Native `<select>`?

Require exactly one enabled exact option, assign its value and dispatch input/change. Duplicate exact labels are ambiguous and skipped.

### 7. Combobox/listbox?

- open only the intended control through a pointer press plus `safeClick` (react-select opens on mousedown; both pass the same refusal rules),
- prefer option roots linked by `aria-controls` or `aria-owns`,
- otherwise accept only one uniquely newly visible popup root created by that click,
- never search unrelated global option lists,
- first try one unique exact match without typing,
- if the control is a searchable input, preserve its prior query, type the desired exact value and wait, within the bounded timeout, for the filtered list to contain one exact option,
- restore the prior query when no unique exact option exists,
- skip disabled, duplicate, near-match and create-new options.

If loading exceeds the bounded timeout, skip safely and collect timing evidence before changing the global timeout.

### 8. Multi-select labels?

Sanitize and de-duplicate values, then reacquire the dialog and control before every label. Jira/React may replace the control after each selection. Reject create-new UI and continue with later labels after an unknown value.

### 9. Checkbox?

For `flagged_impediment`, only `true` is actionable. If already checked, treat as success. Never uncheck and never click a disabled checkbox.

## When a field-specific adapter is justified

Only after proving with real DOM evidence that:

1. the configured exact selector finds the correct control,
2. the existing adapter type cannot drive it,
3. at least one sanitized DOM report records the relevant structure,
4. the smallest field-specific change is documented and tested.

Do not add a second generic engine, Jira API calls, keyboard submission, fuzzy matching, automatic option creation or framework dependencies.

## Small fix versus forbidden rewrite

**Small proven fix:** set `FIELDS.severity.selector` to a stable inspected ID because generic label association is ambiguous.

**Forbidden rewrite:** replace all discovery with generated CSS classes, add fuzzy option matching, or click Enter/Create because one custom field failed.
