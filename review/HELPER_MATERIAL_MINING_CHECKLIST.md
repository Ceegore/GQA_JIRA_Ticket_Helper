# Helper-material mining checklist — completed

Review date: 2026-08-29

The objective is to reduce decisions and repetitive work for a weak implementation AI without adding runtime product scope. `EXISTS` means the final optimized package contains a concrete artifact or exact instruction.

## DOM evidence

- [x] **EXISTS** — base structural exporter: `tools/dom-report-exporter.js`
- [x] **EXISTS** — concise field probe: `tools/dom-probe.js`
- [x] **EXISTS** — dialog guard probe: `tools/dialog-guard-probe.js`
- [x] **EXISTS** — dropdown option/popup probe: `tools/dropdown-probe.js`
- [x] **EXISTS** — field map template: `dom/DOM_FIELD_MAP_TEMPLATE.json`
- [x] **EXISTS** — dialog evidence template: `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json`
- [x] **EXISTS** — allowed option catalog: `dom/JIRA_ALLOWED_VALUES_TEMPLATE.json`
- [x] **EXISTS** — exact-selector preference and evidence workflow: `DOM_EVIDENCE_WORKFLOW.md`, `FIELD_ADAPTER_GUIDE.md`
- [x] **EXISTS** — rich-text/date inspection instructions: `DOM_EVIDENCE_WORKFLOW.md`, `MANUAL_ACCEPTANCE_TESTS.md`
- [x] **EXISTS** — local evidence-saving instructions: `dom/README.md`

## Test assistance

- [x] **EXISTS** — summary-only fixture
- [x] **EXISTS** — full-ticket fixture
- [x] **EXISTS** — empty/missing values fixture
- [x] **EXISTS** — wrong datatype fixture
- [x] **EXISTS** — Unicode/HTML-looking plaintext fixture
- [x] **EXISTS** — missing-schema fixture
- [x] **EXISTS** — duplicate-label fixture
- [x] **EXISTS** — unknown-key/forbidden-scope fixture
- [x] **EXISTS** — near-match dropdown fixture and expectations
- [x] **EXISTS** — manual test report template
- [x] **EXISTS** — static permission/safety tests
- [x] **EXISTS** — manifest referenced-file checks
- [x] **EXISTS** — runtime forbidden-API scans
- [x] **EXISTS** — source-level content-contract tests

## Windows/tester convenience

- [x] **EXISTS** — one-command Node preflight
- [x] **EXISTS** — Windows preflight wrapper
- [x] **EXISTS** — sample JSON clipboard helper
- [x] **EXISTS** — safe hostname configurator with UTF-8-no-BOM output
- [x] **EXISTS** — exact `about:debugging` steps
- [x] **EXISTS** — release-gated runtime-only packager

## Weak-AI guardrails

- [x] **EXISTS** — phase-by-phase implementation prompt
- [x] **EXISTS** — stop conditions
- [x] **EXISTS** — do-not-refactor-on-single-field-failure rule
- [x] **EXISTS** — exact troubleshooting decision tree
- [x] **EXISTS** — requirements traceability
- [x] **EXISTS** — known unknowns list
- [x] **EXISTS** — explicit “screenshots are not DOM” warning
- [x] **EXISTS** — field-specific adapter threshold
- [x] **EXISTS** — examples of safe small fixes vs forbidden rewrites

## Review assistance

- [x] **EXISTS** — exhaustive review prompt
- [x] **EXISTS** — file-by-file audit template
- [x] **EXISTS** — completed file-by-file audit
- [x] **EXISTS** — required output template
- [x] **EXISTS** — severity definitions
- [x] **EXISTS** — Firefox/Atlaskit compatibility evidence record
- [x] **EXISTS** — helper-mining stop criterion

## AI ticket generation

- [x] **EXISTS** — fixed-schema prompt
- [x] **EXISTS** — prompt variant with exact approved values inserted
- [x] **EXISTS** — explicit JSON-only/no-fence rule
- [x] **EXISTS** — no-invention/empty-unknown rule

## Packaging/release

- [x] **EXISTS** — complete package index
- [x] **EXISTS** — generated SHA-256 inventory
- [x] **EXISTS** — release checklist
- [x] **EXISTS** — current status
- [x] **EXISTS** — internal-use notice
- [x] **EXISTS** — runtime-vs-development distinction
- [x] **EXISTS** — manifest/SHA/package-index drift checks

## Stop conclusion

No additional low-cost/high-value helper artifact remains after this pass. The remaining decisions depend on unavailable internal Jira/Firefox evidence (stable selectors, actual option catalogs, control types, timings, rich-text/date behavior and deployment policy). Automating those guesses would either be unreliable, redundant with the supplied probes/templates, or expand product scope.
