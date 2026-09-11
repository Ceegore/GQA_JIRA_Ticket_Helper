# Real Jira DOM evidence workflow

Screenshots establish visible intent but cannot prove selectors, roles, IDs, option relationships or React behavior. Perform this workflow locally against the real internal Jira site before release.

## 1. Prepare a safe evidence session

1. Configure the exact Jira hostname with `tools/configure-jira-host.ps1`.
2. Load the temporary extension in Firefox.
3. Reload Jira after every extension reload so declarative content scripts are present.
4. Open a blank PERMAQA / Bug create dialog in a non-destructive test context.
5. Do not enter confidential ticket text before collecting structural reports.

## 1a. Start with the popup's own diagnosis

Click **Diagnose page** in the extension popup while the create dialog is open. It runs the engine's real discovery in read-only mode and shows, per configured field, the label it recognised, the control it paired with it (tag, type, role, id, name, aria-label, placeholder, data-testid, disabled/read-only) and the dialog-guard evidence for every visible dialog. A field with a label but no control is a collapsed issue-view style row: Paste ticket opens it with one click, fills the mounted control and commits it by blur. Copy the report text into the defect; it contains no field values.

## 2. Prove the dialog guard first

Run `tools/dialog-guard-probe.js` and save the local report under `dom/actual/` in an approved internal workspace. Populate `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json` with:

- a unique dialog selector if a stable one exists,
- exact `PERMAQA` header/token evidence,
- exact `Bug` header/token evidence,
- exact Create/Erstellen action evidence, including its tag/type,
- negative Story, different-project and multiple-dialog results.

Only copy selectors into `config.js` when they are stable and observed. The Create selector is evidence only; the extension never clicks it.

## 3. Capture field structure

Run `tools/dom-report-exporter.js`. It records structural attributes without input values. Use the report to complete `dom/DOM_FIELD_MAP_TEMPLATE.json`:

- visible label,
- actual tag and role,
- `id`, `aria-label`, `aria-labelledby`, stable `data-testid`,
- disabled/read-only markers,
- contenteditable proof,
- selected adapter type,
- exact selector only where generic discovery is ambiguous or fails.

`tools/dom-probe.js` is a quicker console-table variant. It reports only whether a normal input currently has a nonblank value, not the value itself.

## 4. Capture each dropdown relationship

For every custom dropdown/person picker:

1. Ensure no unrelated menu/listbox is open.
2. Open exactly the intended control manually.
3. Run `tools/dropdown-probe.js`.
4. Record the control's `aria-controls`, `aria-owns`, `aria-expanded` and the popup root's role/id.
5. Confirm exact option text and whether duplicate visible labels exist.
6. Confirm disabled/create-new options and whether options are rendered in a portal.
7. Repeat after typing into searchable controls to observe rerender/async behavior.

Do not copy user/person option reports outside approved systems. Do not infer an option relationship merely because only one menu happened to be visible during one run.

## 5. Prove editor/date/special control behavior

Capture exact evidence for:

- Description: actual editable descendant, ProseMirror/contenteditable markers, multiline retention after blur,
- Due Date: input type and accepted display/storage format,
- Working Hours: number/text constraints,
- Labels: whether the control is replaced after each selection,
- Build/Branch: text versus select behavior,
- Impediment: actual checkbox/role and disabled states.

A `role=textbox` wrapper is not enough to authorize `textContent` replacement; identify the actual editable node.

## 6. Apply the smallest configuration/code change

Preferred selector evidence order:

1. stable element `id`,
2. exact `aria-label`,
3. exact `aria-labelledby` relationship,
4. stable semantic `data-testid`,
5. normal `label[for]` association.

Avoid generated classes, positional selectors, text substring selectors and screenshot-derived guesses. First add one field selector. Change generic logic only when at least two controls prove the same structural defect.

## 7. Validate and record

Run:

```bash
npm test
node tools/preflight.cjs
```

Then execute `MANUAL_ACCEPTANCE_TESTS.md` and save a completed copy as `tests/MANUAL_TEST_REPORT_COMPLETED.md`. Remove `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` only after evidence is captured and reviewed. Regenerate hashes with:

```bash
node tools/update-file-manifest.cjs
```

Release preflight intentionally fails until the hostname, DOM evidence marker and completed manual report are resolved.
