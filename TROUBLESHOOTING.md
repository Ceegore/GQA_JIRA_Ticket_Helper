# Deterministic troubleshooting

Do not respond to one failure by rewriting the generic engine. Work in this order and stop when the smallest proven fix succeeds.

## Popup rejects clipboard

1. Run `node tools/validate-ticket.cjs <file>`.
2. Confirm the clipboard is text containing one JSON object.
3. Confirm mandatory numeric `schema_version: 1`.
4. Confirm the payload is at most 100,000 UTF-8 bytes.
5. Confirm JSON syntax; one leading BOM is tolerated.
6. Re-copy using `tools/copy-sample-ticket.ps1` when testing the baseline.

## Popup reports a clipboard problem

1. This message means the clipboard itself could not be read, not that the page is wrong.
2. Re-copy the ticket JSON and click Paste again.
3. Confirm Firefox is not blocking clipboard access for the popup.

## Popup cannot reach helper

1. Confirm the exact Jira host is configured.
2. Confirm current tab is that host.
3. Confirm the create dialog is open.
4. After reloading a temporary extension, reload the Jira page; content scripts are not retroactively injected into an already loaded page by this manifest flow.
5. Check `about:debugging` for manifest/content-script errors.

## “No unique open PERMAQA Bug creation dialog”

1. Run `tools/dialog-guard-probe.js`.
2. Confirm exactly one visible create dialog.
3. Confirm exact compact `PERMAQA` and `Bug` evidence in the upper dialog region.
4. Confirm exact Create/Erstellen action evidence.
5. Complete `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json`.
6. Add stable guard selectors only from real evidence; never weaken to whole-dialog substring matching.

## Popup lists a field under "Not applied"

The line names the field key and the reason. The reasons mean:

- `field not found on this form`: no label, placeholder or control matched the configured aliases; see the next section.
- `row found but its input did not open`: the collapsed row was recognised and clicked, but no compatible control appeared within the bounded wait. Click **Diagnose page** and check which element carries the row name; the row may need a different click target or an evidence-backed selector.
- `value was not kept after editing`: the control was filled, but after blur neither the control nor the row shows the value. Jira discarded the edit; capture how that row commits (Enter, confirm button, blur) as evidence before changing anything.
- `value could not be applied`: no unique exact option, a refused click target or a control the adapter cannot drive.
- `only some values applied` / `N of M values applied`: see the partly filled section.

## Field is skipped as control-not-found

1. Confirm JSON value is actionable.
2. Click **Diagnose page** in the popup; it shows which label and control the engine sees for every field.
3. Run `tools/dom-report-exporter.js` on a blank form.
4. Locate the actual control and actual editable descendant.
5. Prefer stable ID/ARIA/data-testid evidence.
6. Add one field selector to `config.js`.
7. Retry that field only, then rerun all tests.
8. If multiple controls map to one label, do not pick the first; configure evidence.

## Text field is found but value does not stick

1. Determine whether it is input, textarea or actual contenteditable.
2. Do not treat `role=textbox` wrapper alone as editable.
3. Inspect input/change/blur behavior in real Jira.
4. For Description, verify text after blur and after reopening the editor.
5. Add a field-specific adapter only with captured DOM evidence.

## Dropdown is not selected

1. Confirm desired value is exact after case/whitespace normalization.
1a. react-select pickers open on the control's mousedown, not on a click; the helper sends a pointer press first, then a click, then types into searchable inputs. If the menu still does not open, record which element owns the mousedown handler.
2. Manually open only that dropdown and run `tools/dropdown-probe.js`.
3. Check `aria-controls`/`aria-owns` and popup root.
4. Check duplicate exact labels, secondary person text, disabled options and create-new entries.
5. Check whether options load after the bounded timeout or are virtualized until typing.
6. Never broaden to substring/fuzzy matching and never select from every visible global option.
7. Configure a field selector before changing generic option logic.

## Labels stop after the first value

1. Verify the label control is replaced by React after selection.
2. Confirm current code reacquires the dialog/control for every label.
3. Run `duplicate-labels.json` and existing+unknown+existing manual cases.
4. Inspect whether the newly rendered input retains the same accessible label/selector.

## Popup reports a field as partly filled

1. This means a multi-value field received some, but not all, requested values.
2. Compare the applied values against the ticket JSON before creating the issue.
3. Missing values are usually spelling differences: matching is exact after whitespace, case and Unicode NFC normalization.
4. Confirm the missing value exists in the Jira catalog; the helper never creates new labels or options.

## Field is skipped although its control is visible

1. Confirm the control is not disabled or read-only; both are skipped by design.
2. Confirm only one control matches the field's label; ambiguity fails closed.
3. Check whether the control can only be opened by clicking a submit-capable element, such as a `<button>` inside a `<form>` with no `type="button"`. Those clicks are refused on purpose, because they can submit the issue.
4. If real DOM evidence shows a safe, stable control, add one exact selector in `config.js` rather than weakening `safeClick()`.

## Processing stops partway through

1. Check popup for the safe dialog-loss message.
2. Confirm the dialog was not closed/replaced or changed project/type.
3. Run the dialog guard probe again after the UI transition.
4. Treat safe stop as expected protection until evidence supports a minimal selector update.

## Release preflight fails

The release gate intentionally fails when any of these remain:

- hostname placeholder,
- `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md`,
- missing `tests/MANUAL_TEST_REPORT_COMPLETED.md`,
- stale package index or SHA manifest,
- safety/permission/test failure.

Resolve the evidence, run `node tools/update-file-manifest.cjs`, then rerun release preflight. Do not delete a marker merely to silence the gate.
