# Deterministic troubleshooting

Do not respond to one failure by rewriting the generic engine. Work in this order and stop when the smallest proven fix succeeds.

## Popup rejects clipboard

1. Run `node tools/validate-ticket.cjs <file>`.
2. Confirm the clipboard is text containing one JSON object.
3. Confirm mandatory numeric `schema_version: 1`.
4. Confirm the payload is at most 100,000 UTF-8 bytes.
5. Confirm JSON syntax; one leading BOM is tolerated.
6. Re-copy using `tools/copy-sample-ticket.ps1` when testing the baseline.

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

## Field is skipped as control-not-found

1. Confirm JSON value is actionable.
2. Run `tools/dom-report-exporter.js` on a blank form.
3. Locate the actual control and actual editable descendant.
4. Prefer stable ID/ARIA/data-testid evidence.
5. Add one field selector to `config.js`.
6. Retry that field only, then rerun all tests.
7. If multiple controls map to one label, do not pick the first; configure evidence.

## Text field is found but value does not stick

1. Determine whether it is input, textarea or actual contenteditable.
2. Do not treat `role=textbox` wrapper alone as editable.
3. Inspect input/change/blur behavior in real Jira.
4. For Description, verify text after blur and after reopening the editor.
5. Add a field-specific adapter only with captured DOM evidence.

## Dropdown is not selected

1. Confirm desired value is exact after case/whitespace normalization.
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
