# Implementation prompt for a weak coding AI

You are maintaining an extremely small internal Firefox WebExtension named **GQA JIRA bug reporter helper**. The architecture and product scope are already decided. Do not redesign, broaden or “improve” the product with new features.

## Only intended user flow

1. Tester obtains schema-versioned ticket JSON from an external AI/workflow.
2. Tester copies it to the Windows clipboard.
3. Tester opens the PERMAQA / Bug Jira create dialog.
4. Tester opens the Firefox extension and clicks **Paste ticket**.
5. Extension fills supported fields best-effort.
6. Tester visually reviews/corrects the form and manually clicks Jira Create/Erstellen.

The extension must never submit, create, save, transition, delete or edit an existing issue by itself.

## Absolute prohibitions

Do not add Jira REST/API clients, credentials, network requests, backend/database/storage/cookies/cache, AI/LLM, analytics/telemetry, settings/history/preview, attachments/links, project/type switching, Lead-only fields, label creation, fuzzy matching, auto-correction, keyboard shortcuts/events, automatic submission, frameworks or runtime dependencies.

Use plain JavaScript/HTML/CSS. Never “solve” a DOM problem by clicking Enter/Create or by broadening host permissions.

## Mandatory reading order

Read completely before changing code:

1. `00_START_HERE.md`
2. `review/FINAL_REVIEW_REPORT.md`
3. `PROJECT_PLAN.md`
4. `DATA_SCHEMA.md`
5. `SECURITY_MODEL.md`
6. `DOM_EVIDENCE_WORKFLOW.md`
7. `FIELD_ADAPTER_GUIDE.md`
8. `manifest.json`, `config.js`, `shared.js`, `content.js`, `popup.js`
9. all `tests/*.test.cjs`
10. `PACKAGE_INDEX.md`

Do not replace the reviewed design with another architecture.

## First environment task

Use `tools/configure-jira-host.ps1` with the exact hostname supplied by the human. Do not manually broaden or wildcard the tenant. Reload the temporary extension and reload Jira afterwards.

## Invariants you may not weaken

- `schema_version` is mandatory numeric `1`.
- Clipboard maximum is 100,000 UTF-8 bytes.
- Only keys in `GQA_CONFIG.FIELD_ORDER` execute.
- Exactly one dialog must satisfy exact PERMAQA + Bug + Create evidence.
- The dialog is revalidated before every field.
- Ambiguous dialogs, controls and options skip/fail closed.
- Dropdown options must belong to the intended linked/new popup, not all global options.
- One enabled unique exact option only; duplicate/near/unknown/create-new options skip.
- Multi-label controls are reacquired after every selection.
- Actual contenteditable proof is required; `role=textbox` alone is not proof.
- Disabled/read-only controls and submit-capable click targets are refused.
- All direct runtime `.click()` calls remain inside `safeClick()`.
- Logs never include ticket values or raw payload/error objects.

## Mandatory development sequence

### Phase 0 — prove real Jira DOM

Do not guess from screenshots.

1. Run `tools/dialog-guard-probe.js` and complete `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json`.
2. Run `tools/dom-report-exporter.js` on a blank form and complete `dom/DOM_FIELD_MAP_TEMPLATE.json`.
3. Open exactly one dropdown at a time and run `tools/dropdown-probe.js`; record `aria-controls`/`aria-owns`, popup root, option roles/text, duplicates, disabled/create-new states and timing.
4. Verify actual Description editable descendant, date format, Build/Branch control type and label-control rerender.
5. Keep reports internal.

When generic discovery misses or is ambiguous, add one stable evidence-backed selector to that field in `config.js`. Preferred order: stable ID, ARIA, semantic stable data-testid, normal label association. Never use generated `.css-*` classes or positional selectors.

### Phase 1 — Summary only

On a temporary branch, temporarily reduce `GQA_FIELD_ORDER` in `config.js` to `summary`. Do not comment arbitrary branches in `content.js`.

Use:

```json
{"schema_version":1,"summary":"GQA TEST SUMMARY 123"}
```

Pass: exact text retained after focus change, no other field changes, no Create click, generic logs only. Restore the full field order immediately and rerun tests.

### Phase 2 — Description/date/hours

Add/verify Description, Due Date and Working Hours one at a time. Test multiline, Unicode, HTML-like plaintext, intentional edge spaces, actual contenteditable node, real/invalid dates, zero/decimal/negative/wrong-type hours and default preservation.

Never use `innerHTML`. Do not localize dates without evidence.

### Phase 3 — dropdown/person/auto controls one by one

Order: Priority, Severity, Game Mode, Affected Player, Repro Rate, Origin, Build Spotted, Build Released, Branch, Tester.

Before moving on, each field passes:

A. one enabled unique exact option -> selected,
B. blank/missing -> unchanged,
C. unknown -> unchanged and query restored,
D. near match -> unchanged,
E. duplicate exact label -> skipped,
F. unrelated visible popup -> ignored,
G. disabled option -> skipped,
H. already selected -> remains.

If loading/virtualization fails, collect timing/popup evidence. Do not increase global complexity or timeout by guess.

### Phase 4 — labels and Impediment

Labels: sanitized/de-duplicated, existing unique exact options only, no create-new, control reacquired per label, unknown value does not block later labels.

Impediment: `true` checks if possible; `false`/missing/wrong type does nothing; never uncheck.

### Phase 5 — regression and acceptance

After every generic change:

```bash
node --test tests/*.test.cjs
node tools/update-file-manifest.cjs
node tools/preflight.cjs
```

Then execute M01-M62 in `MANUAL_ACCEPTANCE_TESTS.md` and save `tests/MANUAL_TEST_REPORT_COMPLETED.md`.

### Phase 6 — release

Remove `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` only after approved evidence. Regenerate hashes, run `node tools/preflight.cjs --release`, complete `RELEASE_CHECKLIST.md`, build runtime-only package and follow approved signing/distribution.

## Error policy

Invalid/empty value -> skip before control lookup. Missing/ambiguous/disabled/read-only control -> skip. Missing/ambiguous/disabled option -> skip and restore query. One adapter error -> generic key/reason log and later fields continue. Dialog guard lost -> stop remaining fields safely. Initial clipboard/schema/dialog prerequisite failure -> change nothing.

Never include clipboard values in exceptions, logs or popup messages.

## How to fix one failing field

1. Name the exact requirement/manual-test ID.
2. Reproduce with the smallest fixture.
3. Check whether the dialog guard still uniquely passes.
4. Capture field and popup evidence.
5. Try one field selector in `config.js`.
6. Change generic logic only if at least two controls prove the same defect.
7. Add/adjust a test that would fail before the change.
8. Run all tests/preflight, the failing manual row and affected regression rows.
9. Update docs/index/hash.
10. If evidence is unavailable, report the known unknown and stop guessing.

## Stop condition and required report

When every R01-R35 and applicable M01-M62 item passes, release preflight/package/signing pass and manual Create remains the only submission path, stop implementing.

Report exact files changed, tests/commands/exit status, selectors/evidence added, manual results and remaining environmental limitations. Do not propose extra product features.
