# Complete package index

This optimized package contains **85 files**. The list below is generated from the completed recursive audit; every final file is accounted for exactly once. No file under `tools/`, `tests/`, `reference/`, `dom/`, `review/`, `docs/` or `prompts/` may be referenced by the runtime manifest.

## Root runtime/product files

- `config.js` — Frozen 16-field order, exact aliases, bounded waits, guard constants and selector override points preserve scope.
- `content.js` — Hardened fail-closed runtime revalidates dialog/controls, binds options to the intended popup and blocks submit-capable clicks.
- `manifest.json` — Firefox MV3 manifest has exact host placeholder, clipboardRead only, ordered top-frame content scripts, Gecko ID, strict_min_version and no-data declaration.
- `package.json` — Project metadata, test/build/preflight npm scripts and pinned dev tooling.
- `popup.css` — Minimal local styling has no remote resources or functional side effects.
- `popup.html` — Single-button popup loads packaged scripts only and exposes no unsafe inline runtime code.
- `popup.js` — User click reads/parses clipboard, queries active tab, sends one message and reports sanitized safe failures.
- `sample-ticket.json` — Valid schema-1 example uses correct types and keeps environment-specific values safely optional.
- `shared.js` — Dependency-free parser and validators enforce byte/version/type rules, BOM tolerance, date validity and exact normalization.

## Extension icons

- `icons/icon-16.png` — 16x16 crisp toolbar action icon.
- `icons/icon-32.png` — 32x32 standard extension icon.
- `icons/icon-48.png` — 48x48 extensions management icon.
- `icons/icon-64.png` — 64x64 high-DPI display icon.
- `icons/icon-96.png` — 96x96 high-DPI display icon.
- `icons/icon-512.png` — 512x512 master high-resolution store icon.

## Root project and handoff documents

- `00_START_HERE.md` — Gives role-based entry points, commands, stop conditions and points to the completed review artifacts.
- `CHANGELOG.md` — Records the hardened 0.3.0 handoff changes without claiming real-Jira completion.
- `CURRENT_STATUS.md` — Separates completed implementation from internal-environment evidence and correctly says not release-ready.
- `DATA_SCHEMA.md` — Authoritative schema is internally consistent: mandatory v1, 100,000 UTF-8 bytes, strict types and skip semantics.
- `DEPLOYMENT.md` — Correctly distinguishes temporary development loading, runtime packaging, signing and internal distribution.
- `DOM_EVIDENCE_WORKFLOW.md` — Provides a minimal evidence-first workflow and forbids inventing selectors from screenshots.
- `FIELD_ADAPTER_GUIDE.md` — Defines fail-closed adapter decisions, exact matching and smallest evidence-backed fixes.
- `FILE_MANIFEST_SHA256.txt` — Generated integrity inventory covers every packaged file except itself; verified by preflight after final generation.
- `FULL_PROJECT_REVIEW_PROMPT.md` — Exhaustive acceptance prompt preserves scope and requires inventory, execution, security, helper mining and final sweep.
- `IMPLEMENTATION_PROMPT_FOR_WEAK_AI.md` — Literal phased instructions constrain edits, require tests/evidence and prevent scope creep or broad rewrites.
- `INTERNAL_USE_NOTICE.txt` — Concise intended-use notice is consistent with the internal, tester-reviewed workflow.
- `MANUAL_ACCEPTANCE_TESTS.md` — M01-M63 give concrete setup/input, expected result and failure interpretation for real-browser behavior.
- `PACKAGE_INDEX.md` — Final index accounts for all runtime, documentation, evidence, test, tool and review files.
- `PROJECT_PLAN.md` — Phased plan matches the final architecture, safety constraints and real-evidence gates.
- `README.md` — Usage, supported fields, safety limits, development flow and known limitations match implementation.
- `RELEASE_CHECKLIST.md` — Release gate requires host configuration, approved DOM evidence, completed manual tests, clean preflight and signing.
- `REQUIREMENTS_TRACEABILITY.md` — R01-R35 map implementation, automated evidence and real-Jira evidence without treating unit tests as DOM proof.
- `RUNTIME_FILE_LIST.txt` — Contains exactly the runtime files and excludes every development-only artifact.
- `SECURITY_MODEL.md` — Threat model and negative guarantees match static checks and hardened click/DOM handling.
- `TROUBLESHOOTING.md` — Deterministic field-local debugging order avoids fuzzy matching, broad selectors and unnecessary rewrites.
- `VERSION.txt` — Package and runtime versions accurately label the handoff as pre-real-Jira validation.

## Release documentation

- `docs/_finish1.md` — 360° bug hunt, release readiness audit, AMO field plans, and notes for reviewers.

## DOM evidence support

- `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` — Explicit pending-evidence marker correctly prevents release and selector guessing.
- `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json` — Captures exact header/project/type/Create evidence needed to replace generic guard assumptions.
- `dom/DOM_FIELD_MAP_TEMPLATE.json` — Structured per-field selector/control/evidence worksheet covers all supported fields only.
- `dom/JIRA_ALLOWED_VALUES_TEMPLATE.json` — Small approved-value catalog template supports exact generation/validation without runtime network access.
- `dom/README.md` — Explains where and how to store sanitized local Jira evidence and what not to infer.

## Reference material

- `reference/JIRA_FORM_VISUAL_REFERENCE.md` — Correctly distinguishes screenshot observations from unproven DOM/selectors/options and marks Lead-only fields untouched.
- `reference/screenshots/01_jira_bug_form_top.png` — Valid 821x837 PNG visual reference; supports visible top-field inventory but no DOM inference.
- `reference/screenshots/02_jira_bug_form_middle.png` — Valid 811x834 PNG visual reference; supports visible middle-field inventory but no DOM inference.
- `reference/screenshots/03_jira_bug_form_bottom.png` — Valid 818x847 PNG visual reference; supports visible lower/Lead-only inventory but no DOM inference.

## Ticket-generation prompts

- `prompts/AI_TICKET_GENERATION_PROMPT.md` — Produces schema-1 JSON only, keeps unknown values empty and does not invent Jira options.
- `prompts/AI_TICKET_GENERATION_PROMPT_WITH_ALLOWED_VALUES_TEMPLATE.md` — Adds an injected exact-value catalog while preserving JSON-only output and no-invention rules.

## Review support and completed evidence

- `review/FILE_BY_FILE_AUDIT_COMPLETED.md` — Completed inventory lists every final repository file exactly once with an explicit status and conclusion.
- `review/FILE_BY_FILE_AUDIT_TEMPLATE.md` — Regenerated checklist mirrors the final repository inventory and remains reusable for later reviews.
- `review/FINAL_REVIEW_REPORT.md` — Final report follows the required output shape and records findings, evidence, traceability, corrections and release steps.
- `review/FIREFOX_COMPATIBILITY_EVIDENCE.md` — Dated primary-source review separates confirmed Firefox/Atlaskit facts from private Jira unknowns.
- `review/HELPER_MATERIAL_MINING_CHECKLIST.md` — Completed mining record maps every useful low-cost helper and states the evidence-dependent stop condition.
- `review/REVIEW_OUTPUT_TEMPLATE.md` — Template covers all mandatory report sections and prevents omission of evidence or helper-mining results.

## Automated/manual test support

- `tests/FIXTURE_EXPECTATIONS.md` — Documents each adversarial fixture and its precise expected parser/runtime behavior.
- `tests/MANUAL_TEST_REPORT_TEMPLATE.md` — Provides one result row for every M01-M63 case plus environment/build/evidence metadata.
- `tests/PHASE_ACCEPTANCE_REPORT_TEMPLATE.md` — Forces weak-AI phase outputs to record changed files, commands, results, evidence and stop decisions.
- `tests/content-contract.test.cjs` — Static contract tests cover unique dialog/popup logic, rerender reacquisition, text preservation and fail-closed behavior.
- `tests/package.test.cjs` — Verifies manifest references, exact host/order, runtime list, field order, forbidden fields, fixtures and PNG signatures.
- `tests/safety.test.cjs` — Scans runtime for network/storage/credentials/unsafe sinks/submit paths, permission drift and logging leakage.
- `tests/shared.test.cjs` — Unit coverage includes schema, BOM, unknown keys, byte boundaries, dates, numbers, duplicates and exact matching.

## Test fixtures

- `tests/fixtures/duplicate-labels.json` — Valid fixture proves normalized duplicate-label removal and first-spelling retention.
- `tests/fixtures/empty-values.json` — Valid fixture exercises skip-without-clear behavior for blank/empty values.
- `tests/fixtures/full-ticket-template.json` — Complete schema fixture uses correct JSON types and visibly marks values requiring approved Jira catalogs.
- `tests/fixtures/missing-schema-version.json` — Adversarial fixture proves whole-payload rejection when schema_version is absent.
- `tests/fixtures/near-match-dropdowns.json` — Adversarial values distinguish exact options from forbidden prefix/substrings.
- `tests/fixtures/summary-only.json` — Minimal valid fixture proves a single supported field can be processed independently.
- `tests/fixtures/unicode-and-html-like-text.json` — Fixture exercises UTF-8/plaintext behavior without creating executable HTML.
- `tests/fixtures/unknown-keys.json` — Fixture proves unknown and forbidden-scope keys cannot expand the deterministic field plan.
- `tests/fixtures/wrong-types.json` — Fixture exercises safe skipping of invalid field types.

## Development and release tools

- `tools/README.md` — Documents each development-only tool, safe console use, Windows commands and non-runtime boundary.
- `tools/build-runtime-package.cjs` — Cross-platform Node packager for runtime-only ZIP and XPI creation.
- `tools/build-runtime-package.ps1` — Release-preflight-gated PowerShell packager for runtime archive creation.
- `tools/configure-jira-host.cjs` — Cross-platform Node tool to validate and configure the Jira Cloud hostname in manifest.json.
- `tools/configure-jira-host.ps1` — Validates one Atlassian host, performs exactly two replacements and writes UTF-8 without BOM.
- `tools/copy-sample-ticket.ps1` — Simple development helper copies the sample fixture without adding runtime capability.
- `tools/dialog-guard-probe.js` — Sanitized evidence collector reports candidate dialogs/header tokens/Create controls without ticket values.
- `tools/dom-probe.js` — Concise structural probe avoids emitting field values and records accessibility/control traits.
- `tools/dom-report-exporter.js` — Development-only sanitized structural exporter downloads local JSON evidence and is excluded from manifest.
- `tools/dropdown-probe.js` — Captures control-to-popup relationships, root metadata and option structure for exact association decisions.
- `tools/generate-icons.cjs` — Deterministic PNG generator creating crisp multi-resolution extension icons.
- `tools/preflight.cjs` — Dependency-free normal/release gate checks inventory, syntax, JSON, permissions, safety, hashes, tests and evidence markers.
- `tools/run-preflight.bat` — Windows wrapper delegates to the authoritative Node preflight and forwards arguments/exit code.
- `tools/update-file-manifest.cjs` — Deterministically regenerates SHA-256 entries for all package files except the manifest itself.
- `tools/validate-ticket.cjs` — CLI validator applies the authoritative byte/schema/type rules and optional approved-value catalogs.

## Runtime boundary

The runtime archive is limited to the exact paths in `RUNTIME_FILE_LIST.txt`:

```text
manifest.json
config.js
shared.js
content.js
popup.html
popup.css
popup.js
icons/icon-16.png
icons/icon-32.png
icons/icon-48.png
icons/icon-64.png
icons/icon-96.png
```

All other files are documentation, tests, evidence, fixtures, prompts, review records or development/release tools. `tools/preflight.cjs`, the package tests and `tools/build-runtime-package.cjs` enforce this boundary.
