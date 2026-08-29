# Complete implementation and validation plan — GQA JIRA bug reporter helper

## 1. Mission

Deliver the smallest reliable Firefox-only internal helper that transfers structured clipboard JSON into the already-open Jira **PERMAQA / Bug** create form. It performs best-effort draft filling only. The tester reviews, corrects and manually submits.

Desired qualities: narrow, inspectable, deterministic, failure-isolated, evidence-driven and safe by design.

## 2. Fixed product boundary

### Runtime must

- run only on one exact configured Jira Cloud host,
- read clipboard text only after **Paste ticket** is clicked,
- enforce a JSON object, mandatory numeric `schema_version: 1`, and 100,000 UTF-8 byte maximum,
- require exactly one PERMAQA/Bug create dialog and revalidate it before every field,
- execute only the 16 keys in `GQA_CONFIG.FIELD_ORDER`,
- skip empty, malformed, disabled, read-only, missing, ambiguous or unmatched values/controls/options,
- select only one unique exact option associated with the intended popup,
- isolate field failure while the dialog remains valid,
- leave Jira Create entirely manual.

### Runtime must not

Use Jira REST/API credentials, network clients, storage/cookies/cache, AI, telemetry, history/settings/accounts, project/type switching, new option/label creation, Lead-only fields, attachments/links, existing-issue editing/deletion, keyboard synthesis, form submission or Create/Save clicks.

## 3. Authoritative field order

1. `summary`
2. `description`
3. `tester`
4. `build_version_spotted`
5. `build_version_released`
6. `branch`
7. `labels`
8. `priority`
9. `severity`
10. `game_mode`
11. `affected_player`
12. `repro_rate`
13. `due_date`
14. `working_hours`
15. `origin`
16. `flagged_impediment`

The order is defined once in `config.js`; `buildFieldPlan()` maps it to ticket values. Unknown keys cannot become runtime fields.

## 4. Architecture

No framework or runtime build dependency.

### `manifest.json`

MV3, `clipboardRead` only, one exact Atlassian host in both host permission and content match, root content scripts at `document_idle`, popup action, Gecko ID and no-data-collection declaration.

### `popup.js`

User click -> clipboard read -> strict parser -> active tab query -> message -> concise counts/safe-stop status. Catch blocks log no payload/raw error object.

### `content.js`

Message -> payload/version check -> unique dialog guard -> deterministic sequential plan. For each field: reacquire dialog, validate value, find one unambiguous control, apply bounded adapter, record filled/skipped, continue. Dialog loss stops remaining fields safely.

### `config.js`

Contains field order, aliases/types, expected dialog tokens, optional evidence-backed selectors, forbidden actions and bounded timing. Do not scatter guessed custom selectors through generic code.

### `shared.js`

Pure deterministic validation: text normalization, real ISO dates, finite non-negative numbers, label sanitization/de-duplication, UTF-8 byte length and strict clipboard parsing.

## 5. Non-negotiable safety invariants

1. Multiple matching dialogs -> no dialog.
2. Multiple candidate controls -> no control.
3. Multiple exact options -> no selection.
4. Unrelated globally visible option list -> never used.
5. Submit-capable/disabled click target -> never clicked.
6. `role=textbox` without actual editability -> never have wrapper DOM replaced.
7. Invalid/empty value -> locate nothing and clear nothing.
8. React rerender -> reacquire dialog/control rather than reuse stale multi-label references.
9. Unknown JSON key -> ignored.
10. Any automatic Create path -> BLOCKER.

## 6. Phase 0 — prove environment and DOM

This phase is mandatory before selector or adapter changes.

1. Configure the exact host with `tools/configure-jira-host.ps1`.
2. Load the temporary extension, then reload Jira.
3. Open a blank PERMAQA Bug create dialog.
4. Run `tools/dialog-guard-probe.js`; complete `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json`.
5. Run `tools/dom-report-exporter.js`; complete `dom/DOM_FIELD_MAP_TEMPLATE.json`.
6. For each select/person/labels control, open exactly one and run `tools/dropdown-probe.js`; record control/popup relationships and exact approved values.
7. Verify actual Description editable node, date format, Build/Branch control type, disabled/read-only behavior and label-control rerender.
8. Keep reports internal; do not infer selectors from screenshots.

Acceptance:

- one evidence-backed dialog guard,
- each next-phase field has an observed control or explicit unknown status,
- no generated CSS class or positional selector adopted,
- no environment fact invented.

## 7. Phase 1 — Summary only

On a temporary development branch, reduce `GQA_FIELD_ORDER` in `config.js` to Summary only; do not comment arbitrary code paths. Test `tests/fixtures/summary-only.json`.

Required evidence: exact text retained after blur, no other field changes, no Create click, logs contain only generic status. Restore full order and rerun all tests immediately after phase proof.

## 8. Phase 2 — text/date/number

Add/verify Description, Due Date and Working Hours one at a time:

- multiline/Unicode/plaintext HTML-like strings,
- helper does not silently trim accepted text,
- actual contenteditable proof,
- valid/impossible dates,
- zero/decimal/negative/wrong-type hours,
- absent values preserve defaults.

Do not localize date format without real Jira evidence.

## 9. Phase 3 — single-select, auto and person controls

One field at a time: Priority, Severity, Game Mode, Affected Player, Repro Rate, Origin, Build Spotted, Build Released, Branch, Tester.

Each must pass:

- one enabled unique exact option,
- blank/missing unchanged,
- unknown unchanged and query restored,
- near-match unchanged,
- duplicate exact labels skipped,
- unrelated open popup ignored,
- disabled option skipped,
- already-selected exact value remains,
- async/virtualized behavior documented.

Fix control discovery with one selector first. Change generic popup logic only after repeated evidence from at least two controls.

## 10. Phase 4 — labels and checkbox

Labels: de-duplicate normalized input, reacquire control before each value, select existing unique exact options only, skip unknown/create-new/ambiguous options, and continue after a skip.

Impediment: only `true` may check; `false`/missing/wrong type does nothing; never uncheck or click disabled state.

## 11. Phase 5 — automated regression

After every generic change:

```bash
node --test tests/*.test.cjs
node tools/update-file-manifest.cjs
node tools/preflight.cjs
```

Do not trust green tests without reading what they assert. Keep static safety, permission, runtime-list, package-index and hash checks intact.

## 12. Phase 6 — complete real-Jira acceptance

Execute M01-M62 in `MANUAL_ACCEPTANCE_TESTS.md`, record exact Firefox/Jira context and evidence, and save `tests/MANUAL_TEST_REPORT_COMPLETED.md`. Any N/A requires a concrete absent-control reason and review.

## 13. Phase 7 — release gate and packaging

1. Remove `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` only after evidence approval.
2. Regenerate hashes.
3. Run `node tools/preflight.cjs --release`.
4. Complete `RELEASE_CHECKLIST.md`.
5. Build with `tools/build-runtime-package.ps1`.
6. Inspect archive against `RUNTIME_FILE_LIST.txt`.
7. Complete company/Mozilla signing/distribution approval and test Release-channel installation.

Do not release with a placeholder, missing manual report, stale inventory/hash, unresolved real-Jira behavior, safety failure or unreviewed generic DOM change.

## 14. Failure policy

Field invalid/missing/ambiguous -> skip. Control/option missing -> skip. Adapter exception -> generic log and continue. Dialog prerequisite lost -> stop remaining fields safely. Clipboard/schema/dialog initial prerequisite failure -> change nothing.

The tool should fail incomplete and visible, never destructive or silently submitting.

## 15. Weak-AI change discipline

For every failure:

1. identify exact test/requirement ID,
2. reproduce with minimal fixture,
3. collect dialog/control/popup evidence,
4. decide whether selector/config solves it,
5. make the smallest change,
6. run syntax/tests/preflight,
7. rerun failing and affected manual cases,
8. update docs/index/hash,
9. stop if evidence is unavailable rather than guessing.

A broad refactor is not evidence. A convenience feature is not a fix.

## 16. Definition of Done

Every R01-R35 requirement is PASS through automated or reviewed real-Jira evidence; every applicable M01-M62 test passes; release preflight, archive inspection and signed deployment pass; final submission remains manual. Then stop v1 development.
