# GQA JIRA bug reporter helper

> Complete handoff: start with `00_START_HERE.md`. The executed independent audit is in `review/FINAL_REVIEW_REPORT.md`; the reusable audit instructions remain in `FULL_PROJECT_REVIEW_PROMPT.md`.

Internal Firefox-only WebExtension for GQA testers. It reads schema-versioned ticket JSON from the clipboard and fills supported fields in the currently open **PERMAQA / Bug** create dialog. The tester visually reviews the form and manually clicks Jira's Create/Erstellen button.

## Fixed scope and non-goals

The runtime does not call Jira APIs, handle credentials, send network requests, store ticket data, use AI/telemetry, edit existing issues, switch project/type, create labels, add attachments/links, touch Lead-only fields or submit an issue. Dropdown matching is unique exact matching only; no fuzzy correction or synonym logic.

## Runtime files

The complete runtime is exactly the seven root files listed in `RUNTIME_FILE_LIST.txt`: manifest, config, shared parser, content adapter, and popup HTML/CSS/JS. Everything under `tools/`, `tests/`, `reference/`, `dom/`, `review/` and `prompts/` is development-only and must not enter the manifest/runtime archive.

## 1. Configure the exact Jira hostname

Preferred Windows command:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\configure-jira-host.ps1 -HostName company.atlassian.net
```

This replaces both `https://YOUR-COMPANY.atlassian.net/*` entries and writes UTF-8 without BOM. Never use `*://*/*` or a wildcard tenant.

## 2. Load temporarily in Firefox

1. Open `about:debugging` -> **This Firefox** -> **Load Temporary Add-on**.
2. Select `manifest.json`.
3. Open/reload the configured Jira page. After every temporary-extension reload, reload Jira so the content script is present.
4. Open the PERMAQA Bug create dialog.
5. Copy `sample-ticket.json` to the clipboard.
6. Click the extension icon -> **Paste ticket**.
7. Review every field. The extension never clicks Create/Erstellen.

## 3. Automated checks

Requires Node.js:

```bash
node --test tests/*.test.cjs
node tools/preflight.cjs
```

The optimized handoff contains 40 dependency-free tests covering parsing, UTF-8 byte limits, schema strictness, exact matching, permission/safety drift, deterministic field scope, dialog/dropdown contracts and package structure. Normal preflight is expected to warn while hostname, real DOM evidence and the completed manual report are still pending.

Release mode is intentionally stricter:

```bash
node tools/preflight.cjs --release
```

It fails until the hostname is configured, `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` is legitimately removed, `tests/MANUAL_TEST_REPORT_COMPLETED.md` exists, hashes/index are current and all tests pass.

## 4. Real Jira evidence before selector changes

Screenshots cannot prove DOM. Follow `DOM_EVIDENCE_WORKFLOW.md` in this order:

1. `tools/dialog-guard-probe.js` -> prove one dialog, exact PERMAQA/Bug header evidence and Create presence.
2. `tools/dom-report-exporter.js` -> capture sanitized control structure on a blank form.
3. `tools/dropdown-probe.js` -> prove each control-to-popup relationship and exact option structure.
4. Complete the templates under `dom/`.
5. Add one stable selector to `config.js` only when evidence shows generic discovery is missing or ambiguous.

Preferred evidence: stable ID, `aria-label`, `aria-labelledby`, semantic stable `data-testid`, then normal `label[for]`. Avoid generated classes, positions and screenshot-derived selectors.

## 5. Clipboard contract

Canonical schema:

```json
{
  "schema_version": 1,
  "summary": "",
  "description": "",
  "tester": "",
  "build_version_spotted": "",
  "build_version_released": "",
  "branch": "",
  "labels": [],
  "priority": "",
  "severity": "",
  "game_mode": "",
  "affected_player": "",
  "repro_rate": "",
  "due_date": "",
  "working_hours": 0,
  "origin": "",
  "flagged_impediment": false
}
```

Payload rules:

- JSON root must be an object.
- `schema_version` is mandatory and must be numeric `1`.
- Maximum clipboard size is 100,000 UTF-8 bytes; one leading BOM is tolerated.
- Empty/missing/wrong-type values skip their fields and never clear Jira.
- Unknown keys are ignored and cannot add field capability.
- Labels are sanitized and normalized duplicates are attempted once.
- Dropdown/person/label options require one enabled unique exact match after case/whitespace normalization.
- `due_date` must be a real `YYYY-MM-DD` date.
- `working_hours` must be a finite non-negative JSON number.
- `flagged_impediment` acts only when exactly `true`; `false` never unchecks.

See `DATA_SCHEMA.md` for the authoritative details.

## 6. Supported and intentionally untouched fields

Supported in deterministic order:

Summary, Description, Tester, Build Version Spotted, Build Version Released, Branch, Labels, Priority, Severity, Game Mode, Affected Player, Repro Rate, Due Date, Working Hours, Origin, and Flagged -> Impediment.

Intentionally untouched:

Status, Assignee, Department, Location, all Lead-only fields, attachments, linked issues, restrictions, project and issue type.

## 7. Runtime safety behavior

- Exactly one visible dialog must pass the PERMAQA/Bug/Create guard. Multiple or weak matches fail closed.
- The dialog is revalidated before every field; if Jira closes/replaces it and the guard no longer passes, remaining fields skip and the popup reports a safe stop.
- Ambiguous field controls skip instead of choosing the first candidate.
- Disabled/read-only controls and options skip.
- Actual contenteditable proof is required; `role=textbox` alone is not enough to replace wrapper text.
- Dropdown options are taken only from linked (`aria-controls`/`aria-owns`) or one uniquely newly opened popup root—not all global options.
- Multi-label controls are reacquired after each selection to survive React rerenders.
- Every direct runtime click passes through `safeClick()`, which rejects submit/image inputs, form buttons that could submit, disabled targets and forbidden action texts.
- Runtime logs contain field keys/generic statuses only.

## 8. Implementation/validation phases

### Phase 0 — environment and evidence

Configure host, load/reload Firefox/Jira, capture dialog/field/dropdown evidence, and establish approved exact option values. Do not guess.

### Phase 1 — Summary only

For a temporary development branch, temporarily reduce `GQA_FIELD_ORDER` in `config.js` to `summary`, use `tests/fixtures/summary-only.json`, verify Jira retains the value after blur, then restore the full order and rerun tests. Do not modify generic discovery merely to stage this phase.

### Phase 2 — text/date/number

Verify Description multiline/Unicode/plaintext behavior, intentional edge-space behavior, Due Date format and Working Hours zero/decimal/invalid cases.

### Phase 3 — each single-select/person control

Enable/test one real field at a time with exact, unknown, near-match, duplicate-label, disabled and already-selected cases. Use the dropdown relationship probe before generic changes.

### Phase 4 — labels/checkbox

Verify sequential labels, de-duplication, React control replacement, no create-new action, and true-only Impediment behavior.

### Phase 5 — full real-Jira acceptance

Execute all M01-M62 rows in `MANUAL_ACCEPTANCE_TESTS.md` and save `tests/MANUAL_TEST_REPORT_COMPLETED.md`.

## 9. Definition of Done

Release only when:

- exact host and Firefox manifest requirements are satisfied,
- real DOM/option/editor evidence is reviewed,
- all automated tests and release preflight pass,
- all applicable manual tests pass,
- runtime package inspection confirms no development files/capabilities,
- required company/Mozilla signing and distribution approval is complete,
- testers understand that visual review and manual Create remain mandatory.

Then stop. Do not expand v1 scope for convenience.

## 10. Troubleshooting and maintenance

Use `TROUBLESHOOTING.md` and `FIELD_ADAPTER_GUIDE.md`; do not randomly rewrite the engine. After any repository change:

```bash
node --test tests/*.test.cjs
node tools/update-file-manifest.cjs
node tools/preflight.cjs
```

The complete package inventory is in `PACKAGE_INDEX.md`; the SHA inventory intentionally excludes only itself.
