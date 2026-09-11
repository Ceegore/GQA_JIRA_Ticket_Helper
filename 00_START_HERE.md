# START HERE — GQA JIRA bug reporter helper

This package is the complete implementation, evidence and review handoff for the internal Firefox-only tool **GQA JIRA bug reporter helper**.

## Product in one sentence

Copy schema-versioned ticket JSON -> open the **PERMAQA / Bug** Jira create dialog -> click **Paste ticket** -> the extension fills supported fields best-effort and names any field it could not apply -> a human reviews and manually clicks Jira **Create/Erstellen**. **Diagnose page** in the same popup shows what the engine sees on the dialog without changing it.

## Current verdict

The repository-wide audit has been executed. The optimized package is **PASS WITH REAL-JIRA VALIDATION REQUIRED**: automated checks pass, but hostname configuration, internal DOM/option/editor evidence, M01-M67 manual acceptance and signed deployment remain mandatory. Read `review/FINAL_REVIEW_REPORT.md` for findings and exact changes.

## If you are the implementation AI

1. Read `IMPLEMENTATION_PROMPT_FOR_WEAK_AI.md`, `PROJECT_PLAN.md` and `review/FINAL_REVIEW_REPORT.md` completely.
2. Read `PACKAGE_INDEX.md`; every file is intentional and inventoried.
3. Do Phase 0 evidence in this order: dialog guard -> field structure -> each dropdown relationship.
4. Use `tools/dialog-guard-probe.js`, `tools/dom-report-exporter.js` and `tools/dropdown-probe.js`; populate templates in `dom/`.
5. Add one stable selector before modifying generic discovery. Ambiguity must skip, never choose the first candidate.
6. Preserve the fixed 16-field scope and all negative capabilities.
7. After every change run:

```bash
npm test
node tools/update-file-manifest.cjs
node tools/preflight.cjs
```

8. Run `node tools/preflight.cjs --release` only after real evidence and manual acceptance are complete.
9. Stop at the Definition of Done. Do not add convenience features.

## If you are an independent reviewer

The reusable instructions are in `FULL_PROJECT_REVIEW_PROMPT.md`; the completed audit is in `review/FINAL_REVIEW_REPORT.md` and `review/FILE_BY_FILE_AUDIT_COMPLETED.md`. Re-run inventory/tests/hashes after any subsequent change rather than relying on the old verdict.

## If you are the human tester

1. Configure the exact Jira hostname with `tools/configure-jira-host.ps1`.
2. Load the temporary extension in `about:debugging`, then reload Jira.
3. Open a blank real PERMAQA Bug create dialog.
4. Click **Diagnose page** in the popup first; then run the dialog, field and dropdown evidence tools described in `DOM_EVIDENCE_WORKFLOW.md` for anything the diagnosis leaves open.
5. Keep generated reports in approved internal systems; person/option names may be sensitive.
6. Execute `MANUAL_ACCEPTANCE_TESTS.md` and save a completed copy as `tests/MANUAL_TEST_REPORT_COMPLETED.md`.
7. Never treat test execution as permission for the extension to click Create.

## Critical known unknowns

The supplied screenshots prove visible field intent only. They do not reveal DOM selectors, custom-field IDs, popup relationships, actual option catalogs, editability, timing or React rerender behavior. Those facts must come from the internal Jira instance; do not infer them from images.

## Safety model

The runtime intentionally has no Jira REST/API credentials, network requests, storage/history, AI, telemetry, project/type switching, new-label creation, existing-issue editing/deletion or automatic issue submission. Every direct runtime click passes through a submit-aware safety gate, and final issue creation remains a manual human action.
