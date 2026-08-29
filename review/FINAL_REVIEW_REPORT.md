# Final independent review — GQA JIRA bug reporter helper

Review date: **2026-08-29**

Optimized package: **0.3.0-review-hardened-pre-real-jira-validation**

Runtime extension version: **1.1.0**

## 1. Overall verdict

Verdict: **PASS WITH REAL-JIRA VALIDATION REQUIRED**

All 62 original files were accounted for; the optimized package contains 74 indexed and audited files, including new tests, probes and completed review evidence. One original potential submit path was classified as a BLOCKER and four additional runtime weaknesses as HIGH; all are fixed in the returned source and covered by static/source-contract checks. The optimized automated suite contains 40 passing tests, and normal preflight is designed to pass with only the intentionally unresolved host/DOM/manual-evidence warnings. Release mode correctly remains closed while the hostname placeholder, pending real-DOM marker and absent completed M01-M62 report remain. No internal Jira DOM or approved option catalog was available, so selectors, rich-text retention, dynamic dropdown behavior and signed deployment are not claimed as proven. The runtime product scope remains unchanged: clipboard JSON is filled best-effort and the tester alone submits the issue.

## 2. Blockers and high findings first

No unresolved BLOCKER or HIGH finding remains in the optimized source. The following original-package findings were fixed and regression-protected.

### F-001 — BLOCKER — submit-capable elements were not structurally blocked — RESOLVED

- **Affected files:** `content.js`, `tests/safety.test.cjs`, `tools/preflight.cjs`, `SECURITY_MODEL.md`.
- **Exact problem:** the original `safeClick()` refused only a short list of exact visible texts. A candidate represented by an `<input type="submit">`, `<button type="submit">`, or implicit form button with a different accessible/title/value text could still reach `.click()`.
- **Reproduction/reasoning:** generic Jira adapters click controls and options. If a misidentified candidate is a submit-capable form control, text-only filtering is not a structural guarantee and the click could create the issue, which is a mandatory BLOCKER under the acceptance severity rules.
- **Exact fix:** all runtime clicks now pass one `safeClick()` implementation that rejects disabled targets, submit/image inputs, explicit submit buttons, implicit form buttons and forbidden action text gathered from visible/accessibility/title/value channels. No synthesized keyboard events, form submission APIs or second direct-click path exist.
- **Proof/test:** `tests/safety.test.cjs` verifies one direct `.click()` location and explicit structural rejection; `tools/preflight.cjs` scans submit/keyboard APIs; real Jira M55-M56 remains mandatory.

### F-002 — HIGH — dialog guard could accept the wrong dialog — RESOLVED

- **Affected files:** `content.js`, `config.js`, `tools/dialog-guard-probe.js`, `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json`.
- **Exact problem:** whole-dialog substring checks plus first-match behavior could treat unrelated occurrences of “PERMAQA” or “Bug” as proof and ignore multiple candidate dialogs.
- **Reproduction/reasoning:** Jira dialog body text, help text or background modals can repeat these tokens; choosing the first matching dialog risks writing to the wrong issue/form.
- **Exact fix:** the runtime requires exactly one visible candidate with exact compact project/type tokens in the configurable upper guard region (or unique approved selectors) and an exact Create/Erstellen action. It re-finds and revalidates the dialog before every field and stops safely if it disappears or becomes ambiguous.
- **Proof/test:** `tests/content-contract.test.cjs` asserts unique matching and per-field revalidation; M48-M50 plus the new guard probe/template collect private DOM proof.

### F-003 — HIGH — dropdown selection was global and ambiguity-prone — RESOLVED

- **Affected files:** `content.js`, `tools/dropdown-probe.js`, `FIELD_ADAPTER_GUIDE.md`, `MANUAL_ACCEPTANCE_TESTS.md`.
- **Exact problem:** the original path searched globally visible options and selected the first normalized exact label. An unrelated open listbox/portal or two identical visible labels could receive the click.
- **Reproduction/reasoning:** Atlaskit menus commonly render in portals, and more than one listbox can be visible. “First exact label anywhere” cannot prove ownership by the intended field.
- **Exact fix:** option lookup is bounded to `aria-controls`/`aria-owns` roots or one uniquely newly visible popup root created by activating the intended control. Duplicate exact labels, disabled options and create-new actions are rejected; searchable query text is restored on failure.
- **Proof/test:** content-contract and safety tests assert linked/new roots and duplicate rejection; M26-M35 test portal ownership, duplicates, delays and near matches.

### F-004 — HIGH — stale Jira/React references could be reused after rerender — RESOLVED

- **Affected files:** `content.js`, `tests/content-contract.test.cjs`, `MANUAL_ACCEPTANCE_TESTS.md`.
- **Exact problem:** the original import held one dialog reference across all fields and reused the Labels control after each selection even though React/Atlaskit may replace nodes.
- **Reproduction/reasoning:** a successful option click can rerender the field/dialog; continuing with detached or repurposed nodes can fail widely or interact with an unintended element.
- **Exact fix:** the dialog is reacquired before every field, and the multi-label control is reacquired before every value. Dialog loss produces a safe-stop result instead of continuing.
- **Proof/test:** source contract tests assert both reacquisition loops; M18 and M40 validate real rerenders.

### F-005 — HIGH — rich-text fallback could treat a wrapper as editable — RESOLVED

- **Affected files:** `content.js`, `FIELD_ADAPTER_GUIDE.md`, `review/FIREFOX_COMPATIBILITY_EVIDENCE.md`.
- **Exact problem:** `role="textbox"` alone was treated as editable proof, so a composite wrapper could be selected and have its DOM replaced. That can corrupt a complex Jira/ProseMirror widget or fail to retain text.
- **Reproduction/reasoning:** accessibility role and editability are different facts; modern editors often put roles on wrappers and keep state in a nested contenteditable node.
- **Exact fix:** rich-text insertion requires an actual visible, enabled, non-read-only `contenteditable` element. Only plaintext is inserted and normal input/change signaling is attempted. Deprecated `execCommand("insertText")` is explicitly recorded as a bounded compatibility bridge, not a proven API.
- **Proof/test:** content-contract tests reject role-only proof; M21-M23 require real plaintext, retention and edge-space validation.

## Other resolved findings

| ID | Severity | Files | Exact problem | Exact fix | Proof/test |
|---|---|---|---|---|---|
| F-006 | MEDIUM | `content.js` | First matching accessible/label candidate could hide duplicate controls. | Configured selectors, accessible controls and label resolutions must be unique; ambiguity skips. | content contract + M19/M20/M30 |
| F-007 | MEDIUM | `content.js`, `DATA_SCHEMA.md` | Accepted text strings were trimmed before insertion, silently changing payload. | Trimming is used only to determine blankness; accepted original string is assigned. | source contract + M23 |
| F-008 | MEDIUM | `shared.js`, popup/content, docs | Missing `schema_version` was tolerated while strictness was unclear across files. | Mandatory numeric `schema_version: 1` is enforced twice and documented consistently. | shared tests + missing-version fixture + M04/M05 |
| F-009 | MEDIUM | `shared.js`, `config.js`, docs | “100 KB” was implemented as JavaScript character count, not a defined byte boundary. | Exact maximum is 100,000 UTF-8 bytes using `TextEncoder`/deterministic fallback. | ASCII and multibyte boundary tests + M07/M08 |
| F-010 | MEDIUM | `shared.js`, `content.js` | Duplicate labels could be attempted and stale controls reused. | Normalize/de-duplicate first spelling and reacquire control for every selection. | shared/content tests + duplicate fixture + M37/M40 |
| F-011 | MEDIUM | `popup.js`, safety tests | Raw error objects could expose implementation/page details in logs. | Catch path logs only a generic constant; payloads and raw errors are not logged. | static logging test + M58 |
| F-012 | MEDIUM | `manifest.json`, preflight | Firefox no-data-collection declaration was absent despite current signing metadata expectations. | Added `gecko.data_collection_permissions.required: ["none"]` and enforcement. | manifest/safety/preflight + compatibility evidence |
| F-013 | MEDIUM | tests/preflight/docs | Green tests left schema, byte, permissions, source contract, index/hash and release blind spots. | Expanded from 24 to 40 tests and added comprehensive normal/release preflight. | final automated evidence section |
| F-014 | LOW | `tools/configure-jira-host.ps1` | Broad replacement/PowerShell UTF-8 behavior could create wrong replacements or a BOM. | Validate exact tenant host, require exactly two placeholder replacements, parse JSON and write UTF-8 without BOM. | static audit; Windows execution still required |
| F-015 | LOW | `tools/dom-probe.js` | A development probe could expose current field values in copied evidence. | Report only structural flags such as `hasNonBlankValue`, never actual ticket/form values. | source review + tool docs |
| F-016 | LOW | helper/test/review files | Several recurring evidence and weak-AI decisions remained manual or ambiguous. | Added guard probe/template, contract tests, adversarial fixtures, SHA updater, compatibility record and completed audits. | helper-mining section and final inventory |


## 3. Complete file-by-file audit

| File | Status | Purpose understood? | Key conclusion/action |
|---|---|---:|---|
| `00_START_HERE.md` | PASS | Yes | Gives role-based entry points, commands, stop conditions and points to the completed review artifacts. |
| `CHANGELOG.md` | PASS | Yes | Records the hardened 0.3.0 handoff changes without claiming real-Jira completion. |
| `CURRENT_STATUS.md` | PASS | Yes | Separates completed implementation from internal-environment evidence and correctly says not release-ready. |
| `DATA_SCHEMA.md` | PASS | Yes | Authoritative schema is internally consistent: mandatory v1, 100,000 UTF-8 bytes, strict types and skip semantics. |
| `DEPLOYMENT.md` | PASS | Yes | Correctly distinguishes temporary development loading, runtime packaging, signing and internal distribution. |
| `DOM_EVIDENCE_WORKFLOW.md` | PASS | Yes | Provides a minimal evidence-first workflow and forbids inventing selectors from screenshots. |
| `FIELD_ADAPTER_GUIDE.md` | PASS | Yes | Defines fail-closed adapter decisions, exact matching and smallest evidence-backed fixes. |
| `FILE_MANIFEST_SHA256.txt` | PASS | Yes | Generated integrity inventory covers every packaged file except itself; verified by preflight after final generation. |
| `FULL_PROJECT_REVIEW_PROMPT.md` | PASS | Yes | Exhaustive acceptance prompt preserves scope and requires inventory, execution, security, helper mining and final sweep. |
| `IMPLEMENTATION_PROMPT_FOR_WEAK_AI.md` | PASS | Yes | Literal phased instructions constrain edits, require tests/evidence and prevent scope creep or broad rewrites. |
| `INTERNAL_USE_NOTICE.txt` | PASS | Yes | Concise intended-use notice is consistent with the internal, tester-reviewed workflow. |
| `MANUAL_ACCEPTANCE_TESTS.md` | PASS | Yes | M01-M62 give concrete setup/input, expected result and failure interpretation for real-browser behavior. |
| `PACKAGE_INDEX.md` | PASS | Yes | Final index accounts for all runtime, documentation, evidence, test, tool and review files. |
| `PROJECT_PLAN.md` | PASS | Yes | Phased plan matches the final architecture, safety constraints and real-evidence gates. |
| `README.md` | PASS | Yes | Usage, supported fields, safety limits, development flow and known limitations match implementation. |
| `RELEASE_CHECKLIST.md` | PASS | Yes | Release gate requires host configuration, approved DOM evidence, completed manual tests, clean preflight and signing. |
| `REQUIREMENTS_TRACEABILITY.md` | PASS | Yes | R01-R35 map implementation, automated evidence and real-Jira evidence without treating unit tests as DOM proof. |
| `RUNTIME_FILE_LIST.txt` | PASS | Yes | Contains exactly the seven root runtime files and excludes every development-only artifact. |
| `SECURITY_MODEL.md` | PASS | Yes | Threat model and negative guarantees match static checks and hardened click/DOM handling. |
| `TROUBLESHOOTING.md` | PASS | Yes | Deterministic field-local debugging order avoids fuzzy matching, broad selectors and unnecessary rewrites. |
| `VERSION.txt` | PASS | Yes | Package and runtime versions accurately label the handoff as pre-real-Jira validation. |
| `config.js` | PASS | Yes | Frozen 16-field order, exact aliases, bounded waits, guard constants and selector override points preserve scope. |
| `content.js` | PASS | Yes | Hardened fail-closed runtime revalidates dialog/controls, binds options to the intended popup and blocks submit-capable clicks. |
| `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` | REFERENCE ONLY | Yes | Explicit pending-evidence marker correctly prevents release and selector guessing. |
| `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json` | PASS | Yes | Captures exact header/project/type/Create evidence needed to replace generic guard assumptions. |
| `dom/DOM_FIELD_MAP_TEMPLATE.json` | PASS | Yes | Structured per-field selector/control/evidence worksheet covers all supported fields only. |
| `dom/JIRA_ALLOWED_VALUES_TEMPLATE.json` | PASS | Yes | Small approved-value catalog template supports exact generation/validation without runtime network access. |
| `dom/README.md` | PASS | Yes | Explains where and how to store sanitized local Jira evidence and what not to infer. |
| `manifest.json` | PASS | Yes | Firefox MV3 manifest has exact host placeholder, clipboardRead only, ordered top-frame content scripts, Gecko ID and no-data declaration. |
| `popup.css` | PASS | Yes | Minimal local styling has no remote resources or functional side effects. |
| `popup.html` | PASS | Yes | Single-button popup loads packaged scripts only and exposes no unsafe inline runtime code. |
| `popup.js` | PASS | Yes | User click reads/parses clipboard, queries active tab, sends one message and reports sanitized safe failures. |
| `prompts/AI_TICKET_GENERATION_PROMPT.md` | PASS | Yes | Produces schema-1 JSON only, keeps unknown values empty and does not invent Jira options. |
| `prompts/AI_TICKET_GENERATION_PROMPT_WITH_ALLOWED_VALUES_TEMPLATE.md` | PASS | Yes | Adds an injected exact-value catalog while preserving JSON-only output and no-invention rules. |
| `reference/JIRA_FORM_VISUAL_REFERENCE.md` | REFERENCE ONLY | Yes | Correctly distinguishes screenshot observations from unproven DOM/selectors/options and marks Lead-only fields untouched. |
| `reference/screenshots/01_jira_bug_form_top.png` | REFERENCE ONLY | Yes | Valid 821x837 PNG visual reference; supports visible top-field inventory but no DOM inference. |
| `reference/screenshots/02_jira_bug_form_middle.png` | REFERENCE ONLY | Yes | Valid 811x834 PNG visual reference; supports visible middle-field inventory but no DOM inference. |
| `reference/screenshots/03_jira_bug_form_bottom.png` | REFERENCE ONLY | Yes | Valid 818x847 PNG visual reference; supports visible lower/Lead-only inventory but no DOM inference. |
| `review/FILE_BY_FILE_AUDIT_COMPLETED.md` | PASS | Yes | Completed inventory lists every final repository file exactly once with an explicit status and conclusion. |
| `review/FILE_BY_FILE_AUDIT_TEMPLATE.md` | PASS | Yes | Regenerated checklist mirrors the final repository inventory and remains reusable for later reviews. |
| `review/FINAL_REVIEW_REPORT.md` | PASS | Yes | Final report follows the required output shape and records findings, evidence, traceability, corrections and release steps. |
| `review/FIREFOX_COMPATIBILITY_EVIDENCE.md` | PASS | Yes | Dated primary-source review separates confirmed Firefox/Atlaskit facts from private Jira unknowns. |
| `review/HELPER_MATERIAL_MINING_CHECKLIST.md` | PASS | Yes | Completed mining record maps every useful low-cost helper and states the evidence-dependent stop condition. |
| `review/REVIEW_OUTPUT_TEMPLATE.md` | PASS | Yes | Template covers all mandatory report sections and prevents omission of evidence or helper-mining results. |
| `sample-ticket.json` | PASS | Yes | Valid schema-1 example uses correct types and keeps environment-specific values safely optional. |
| `shared.js` | PASS | Yes | Dependency-free parser and validators enforce byte/version/type rules, BOM tolerance, date validity and exact normalization. |
| `tests/FIXTURE_EXPECTATIONS.md` | PASS | Yes | Documents each adversarial fixture and its precise expected parser/runtime behavior. |
| `tests/MANUAL_TEST_REPORT_TEMPLATE.md` | PASS | Yes | Provides one result row for every M01-M62 case plus environment/build/evidence metadata. |
| `tests/PHASE_ACCEPTANCE_REPORT_TEMPLATE.md` | PASS | Yes | Forces weak-AI phase outputs to record changed files, commands, results, evidence and stop decisions. |
| `tests/content-contract.test.cjs` | PASS | Yes | Static contract tests cover unique dialog/popup logic, rerender reacquisition, text preservation and fail-closed behavior. |
| `tests/fixtures/duplicate-labels.json` | PASS | Yes | Valid fixture proves normalized duplicate-label removal and first-spelling retention. |
| `tests/fixtures/empty-values.json` | PASS | Yes | Valid fixture exercises skip-without-clear behavior for blank/empty values. |
| `tests/fixtures/full-ticket-template.json` | PASS | Yes | Complete schema fixture uses correct JSON types and visibly marks values requiring approved Jira catalogs. |
| `tests/fixtures/missing-schema-version.json` | PASS | Yes | Adversarial fixture proves whole-payload rejection when schema_version is absent. |
| `tests/fixtures/near-match-dropdowns.json` | PASS | Yes | Adversarial values distinguish exact options from forbidden prefix/substrings. |
| `tests/fixtures/summary-only.json` | PASS | Yes | Minimal valid fixture proves a single supported field can be processed independently. |
| `tests/fixtures/unicode-and-html-like-text.json` | PASS | Yes | Fixture exercises UTF-8/plaintext behavior without creating executable HTML. |
| `tests/fixtures/unknown-keys.json` | PASS | Yes | Fixture proves unknown and forbidden-scope keys cannot expand the deterministic field plan. |
| `tests/fixtures/wrong-types.json` | PASS | Yes | Fixture exercises safe skipping of invalid field types. |
| `tests/package.test.cjs` | PASS | Yes | Verifies manifest references, exact host/order, runtime list, field order, forbidden fields, fixtures and PNG signatures. |
| `tests/safety.test.cjs` | PASS | Yes | Scans runtime for network/storage/credentials/unsafe sinks/submit paths, permission drift and logging leakage. |
| `tests/shared.test.cjs` | PASS | Yes | Unit coverage includes schema, BOM, unknown keys, byte boundaries, dates, numbers, duplicates and exact matching. |
| `tools/README.md` | PASS | Yes | Documents each development-only tool, safe console use, Windows commands and non-runtime boundary. |
| `tools/build-runtime-package.ps1` | PASS | Yes | Release-preflight-gated packager includes only the runtime list and makes no signing claim. |
| `tools/configure-jira-host.ps1` | PASS | Yes | Validates one Atlassian host, performs exactly two replacements and writes UTF-8 without BOM. |
| `tools/copy-sample-ticket.ps1` | PASS | Yes | Simple development helper copies the sample fixture without adding runtime capability. |
| `tools/dialog-guard-probe.js` | PASS | Yes | Sanitized evidence collector reports candidate dialogs/header tokens/Create controls without ticket values. |
| `tools/dom-probe.js` | PASS | Yes | Concise structural probe avoids emitting field values and records accessibility/control traits. |
| `tools/dom-report-exporter.js` | PASS | Yes | Development-only sanitized structural exporter downloads local JSON evidence and is excluded from manifest. |
| `tools/dropdown-probe.js` | PASS | Yes | Captures control-to-popup relationships, root metadata and option structure for exact association decisions. |
| `tools/preflight.cjs` | PASS | Yes | Dependency-free normal/release gate checks inventory, syntax, JSON, permissions, safety, hashes, tests and evidence markers. |
| `tools/run-preflight.bat` | PASS | Yes | Windows wrapper delegates to the authoritative Node preflight and forwards arguments/exit code. |
| `tools/update-file-manifest.cjs` | PASS | Yes | Deterministically regenerates SHA-256 entries for all package files except the manifest itself. |
| `tools/validate-ticket.cjs` | PASS | Yes | CLI validator applies the authoritative byte/schema/type rules and optional approved-value catalogs. |

Inventory conclusion: no missing, unexpected, undocumented, duplicate/conflicting or stale superseded file remains after final regeneration. The three PNGs were visually inspected and verified as valid files with dimensions 821×837, 811×834 and 818×847; they remain reference-only and were not used to invent selectors, field IDs, option catalogs or control types.

## 4. Requirements traceability verdict

`PASS` means the repository evidence is sufficient for that requirement. `NEEDS REAL JIRA` is an environmental evidence gap, not a hidden pass or implementation defect.

| Requirement | Verdict | Evidence / remaining action |
|---|---|---|
| R01 | **NEEDS REAL JIRA** | MV3 manifest structure passes static checks; temporary load in supported Firefox remains required. |
| R02 | **NEEDS REAL JIRA** | Exact single placeholder is enforced; actual tenant and negative other-tenant test remain. |
| R03 | **NEEDS REAL JIRA** | Popup performs user-click clipboard read; Firefox clipboard behavior must be executed. |
| R04 | **PASS** | JSON-object-only parser has direct unit tests. |
| R05 | **PASS** | 100,000 UTF-8-byte ASCII and multibyte boundaries are tested. |
| R06 | **PASS** | Missing, wrong and wrong-type schema versions reject in parser and content guard. |
| R07 | **NEEDS REAL JIRA** | Unique revalidated dialog algorithm is statically tested; private header/DOM evidence remains. |
| R08 | **PASS** | Frozen 16-key order equals configured fields; unknown keys cannot enter the plan. |
| R09 | **NEEDS REAL JIRA** | Validation is safe offline; real React-controlled fields must prove no clearing. |
| R10 | **NEEDS REAL JIRA** | Per-field isolation is present; real control failures/rerenders require M15/M18. |
| R11 | **NEEDS REAL JIRA** | Unique exact matcher is tested; real portal/options/virtualization require M26-M35. |
| R12 | **NEEDS REAL JIRA** | Create-new options are filtered and allowCreate is false; real Labels UI requires M38/M39. |
| R13 | **NEEDS REAL JIRA** | False/missing do nothing in plan; checkbox behavior requires M46/M47. |
| R14 | **NEEDS REAL JIRA** | Unsafe HTML sinks are absent; Description retention/plaintext needs M21/M22. |
| R15 | **PASS** | Static scans and permission review find no REST endpoints or credentials. |
| R16 | **PASS** | Runtime has no network clients, dynamic remote loads or broad network permission. |
| R17 | **PASS** | Runtime has no extension/web storage, cookies, IndexedDB or cache use. |
| R18 | **NEEDS REAL JIRA** | Static code has one guarded click path and no submit/keyboard APIs; M55/M56 must prove form behavior. |
| R19 | **PASS** | Project and issue type are absent from the executable field plan. |
| R20 | **PASS** | Lead-only/unsupported fields are absent; screenshots/doc set is consistent. |
| R21 | **NEEDS REAL JIRA** | One-button popup is statically correct; appearance/operation needs Firefox execution. |
| R22 | **PASS** | Static tests reject payload/raw-error logging; runtime logs only generic metadata. |
| R23 | **PASS** | No framework, package manager or runtime dependency exists. |
| R24 | **NEEDS REAL JIRA** | Evidence workflow/templates exist, but selectors cannot be approved without internal DOM. |
| R25 | **NEEDS REAL JIRA** | 40 automated tests pass; M01-M62 completion is intentionally absent. |
| R26 | **PASS** | One leading BOM is accepted without trimming/rewriting other input. |
| R27 | **PASS** | Normalized duplicates are removed deterministically with unit coverage. |
| R28 | **NEEDS REAL JIRA** | Disabled/read-only guards exist; actual Jira controls/options need M16/M17/M32. |
| R29 | **NEEDS REAL JIRA** | Linked/new-popup association is source-tested; real portals need M31/M33/M34. |
| R30 | **NEEDS REAL JIRA** | Controls/dialog are reacquired in code; real React rerenders need M18/M40. |
| R31 | **NEEDS REAL JIRA** | Ambiguity fails closed by construction; real duplicate controls/options/dialogs need M30/M35/M50. |
| R32 | **NEEDS REAL JIRA** | Setter preserves accepted text in source contract; React field retention needs M23. |
| R33 | **PASS** | Manifest declares required data collection as none and preflight enforces it. |
| R34 | **PASS** | Manifest/runtime list/package tests/preflight exclude all development-only files. |
| R35 | **PASS** | Release mode is designed to fail until host, DOM marker and completed manual report gates are satisfied. |

## 5. Automated test evidence

### Original package baseline

| Command | Exit | Result |
|---|---:|---|
| `node --test tests/*.test.cjs` | 0 | 24/24 tests passed; green result did not cover the findings above. |
| `node tools/preflight.cjs` | 0 | Passed with the expected unresolved Jira-host warning. |
| `node tools/preflight.cjs --release` | 1 | Correctly failed on the unresolved host placeholder in the original release configuration. |
| `node --check` over original `.js`/`.cjs` files and JSON parsing | 0 | Syntax/JSON baseline clean. |

### Optimized package final sweep

| Command | Exit | Result |
|---|---:|---|
| `node --test tests/*.test.cjs` | 0 | 40/40 tests passed; 0 failures, skips or cancellations. |
| `node tools/validate-ticket.cjs sample-ticket.json` | 0 | Schema-1 sample valid; 5 actionable fields and 11 safely empty/invalid fields reported. |
| `node tools/preflight.cjs` | 0 | PASS WITH WARNINGS: only the intentional host placeholder, uncaptured real-Jira DOM marker and missing completed M01-M62 report; index 74/74, SHA 73/73, four test files passed. |
| `node tools/preflight.cjs --release` | 1 | Expected FAIL on exactly three release gates: host placeholder, pending DOM-evidence marker and missing `tests/MANUAL_TEST_REPORT_COMPLETED.md`; all tests still passed. |
| `node --check` for every `.js`/`.cjs` and parse every `.json` | 0 | `node --check` passed for 15 JS/CJS files; all 14 JSON files parsed. |
| PowerShell helper execution | not run | PowerShell is unavailable in this Linux review environment; scripts received static review and Windows execution remains a release step. |

A full release archive was intentionally not built by `tools/build-runtime-package.ps1`, because its release-preflight gate must not be bypassed before internal evidence is complete. The returned ZIP is the complete optimized handoff package, not a signed/installable release artifact.

## 6. Manual test and evidence gaps

Only environment-dependent items remain:

| Item | Why it cannot be proven offline | Exact next step | Tool/file |
|---|---|---|---|
| Exact Jira tenant scope | Host is deliberately a placeholder. | Run `tools/configure-jira-host.ps1 <tenant>.atlassian.net`; verify intended tenant works and another tenant does not. | manifest/configurator, M51-M54 |
| Dialog guard evidence | Private Jira header/project/type/Create DOM is unavailable. | Run `tools/dialog-guard-probe.js`, save sanitized output, complete and approve `DIALOG_GUARD_EVIDENCE_TEMPLATE.json`; add only uniquely stable selectors if needed. | probe/template, M48-M50 |
| Per-field controls | Screenshots do not reveal IDs, nested controls or rerender behavior. | Run DOM probe/exporter for all 16 supported fields and complete `DOM_FIELD_MAP_TEMPLATE.json`. | DOM workflow/tools, M18-M25 |
| Dropdown/person/label ownership and values | Portals, duplicate names, async loading and virtualization are environment-specific. | Capture each popup with `dropdown-probe.js`, fill approved values, then execute M26-M40 including unrelated open listbox and >2 s loading cases. | dropdown probe/catalog |
| Description/ProseMirror | Public API/docs do not prove the private editor variant or event retention. | Execute M21-M23, blur/reopen the dialog, verify plaintext persistence and undo behavior; add the smallest field-specific adapter only with evidence. | compatibility record/guide |
| Build/Branch/date widgets | Control types and accepted display formats are unknown. | Execute M24-M25 and M41-M45 with valid/invalid boundaries; record actual control/input attributes. | field map/manual tests |
| Clipboard, messaging and reload | Browser runtime context cannot be emulated by Node tests. | Load temporarily in supported Firefox, reload Jira after each extension reload, execute M01-M09 and M51-M54. | deployment/manual tests |
| No-submit invariant in real form | Static source cannot prove every Jira component's click side effects. | Execute M55-M56 while monitoring that Create/Erstellen is never activated and the issue remains uncreated until the tester clicks it. | safety model/manual tests |
| Network/log/runtime package | Browser DevTools and final archive are required. | Execute M57-M60, inspect Network/Console and archive contents; attach results. | preflight/build/manual report |
| Signed internal distribution | Release/Beta Firefox signing and company policy are external processes. | After all evidence passes, build runtime-only archive and send through approved Mozilla/company signing/distribution. | deployment/release checklist |

## 7. Exact corrections and files changed

Compared with the supplied package, **36 files were modified and 12 files were added** (the final count includes this completed report). Unlisted files were inspected but did not require a content change.

| File | Exact change | Regression risk |
|---|---|---|
| `00_START_HERE.md` | Added optimized-package entry order, review/evidence links and final validation commands. | LOW |
| `CHANGELOG.md` | Recorded the review-hardened 0.3.0 package and exact safety/test changes. | LOW |
| `CURRENT_STATUS.md` | Separated completed code from unresolved internal Jira/Firefox evidence and release state. | LOW |
| `DATA_SCHEMA.md` | Made schema v1 mandatory, defined 100,000 UTF-8 bytes, BOM behavior, dedupe and no-trim semantics. | MEDIUM |
| `DEPLOYMENT.md` | Clarified temporary loading, page reload, runtime-only archive and signing boundary. | LOW |
| `DOM_EVIDENCE_WORKFLOW.md` | Added dialog/popup/rich-text/date evidence steps and strict no-guessing thresholds. | MEDIUM |
| `FIELD_ADAPTER_GUIDE.md` | Specified unique-control, linked-popup, disabled/read-only and fail-closed adapter rules. | MEDIUM |
| `IMPLEMENTATION_PROMPT_FOR_WEAK_AI.md` | Added exact phase gates, minimal-fix rules, stop conditions and evidence requirements. | MEDIUM |
| `MANUAL_ACCEPTANCE_TESTS.md` | Expanded to M01-M62 with exact setup/input, expected result and failure interpretation. | MEDIUM |
| `PACKAGE_INDEX.md` | Regenerated a complete 74-file inventory and runtime boundary. | LOW |
| `PROJECT_PLAN.md` | Aligned phases and acceptance gates with hardened runtime behavior and real-evidence requirements. | MEDIUM |
| `README.md` | Aligned usage, schema, exact matching, safe failures, tooling and known limitations. | LOW |
| `RELEASE_CHECKLIST.md` | Added explicit host, DOM, manual report, security, archive, signing and release-preflight gates. | MEDIUM |
| `REQUIREMENTS_TRACEABILITY.md` | Expanded and reconciled R01-R35 across implementation, automated and real-Jira evidence. | MEDIUM |
| `SECURITY_MODEL.md` | Documented submit-capable click blocking, popup association, data leakage and host constraints. | MEDIUM |
| `TROUBLESHOOTING.md` | Made troubleshooting deterministic and forbade fuzzy/global-option fixes and broad rewrites. | LOW |
| `VERSION.txt` | Set package 0.3.0-review-hardened-pre-real-jira-validation and runtime 1.1.0. | LOW |
| `config.js` | Added exact field order, byte limit, dialog guard constants, option wait and click-block text. | MEDIUM |
| `content.js` | Reworked dialog/control/option discovery, safeClick, contenteditable, rerender recovery and per-field revalidation. | HIGH |
| `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json` | New structured worksheet for project/type/header/Create selector evidence. | LOW |
| `dom/README.md` | Added instructions for sanitized local evidence storage and prohibited inferences. | LOW |
| `manifest.json` | Bumped runtime version and added Firefox no-data-collection declaration while preserving minimal permissions. | MEDIUM |
| `popup.js` | Applied strict byte/schema parsing, sanitized errors and dialog-loss feedback. | MEDIUM |
| `review/FILE_BY_FILE_AUDIT_COMPLETED.md` | New completed audit accounting for every final file exactly once. | LOW |
| `review/FILE_BY_FILE_AUDIT_TEMPLATE.md` | Regenerated reusable checklist for all 74 final files. | LOW |
| `review/FINAL_REVIEW_REPORT.md` | New acceptance report with findings, traceability, evidence and release steps. | LOW |
| `review/FIREFOX_COMPATIBILITY_EVIDENCE.md` | New dated primary-source compatibility record and explicit private-DOM boundary. | LOW |
| `review/HELPER_MATERIAL_MINING_CHECKLIST.md` | Completed helper inventory and documented the stop condition. | LOW |
| `shared.js` | Added UTF-8 byte counting, mandatory schema, BOM handling, duplicate-label removal and deterministic normalization. | MEDIUM |
| `tests/FIXTURE_EXPECTATIONS.md` | New exact behavior catalog for all JSON fixtures. | LOW |
| `tests/MANUAL_TEST_REPORT_TEMPLATE.md` | Expanded result sheet to M01-M62 and added environment/evidence metadata. | LOW |
| `tests/PHASE_ACCEPTANCE_REPORT_TEMPLATE.md` | Added per-phase changed-file, command, evidence, scope and stop records. | LOW |
| `tests/content-contract.test.cjs` | New source contract tests for dialogs, popup binding, ambiguity, rerenders and text semantics. | MEDIUM |
| `tests/fixtures/duplicate-labels.json` | New adversarial normalized-duplicate fixture. | LOW |
| `tests/fixtures/missing-schema-version.json` | New mandatory-version rejection fixture. | LOW |
| `tests/fixtures/near-match-dropdowns.json` | New exact-vs-near-match fixture. | LOW |
| `tests/fixtures/unknown-keys.json` | New deterministic-plan/forbidden-scope fixture. | LOW |
| `tests/package.test.cjs` | Expanded runtime-reference, field-order, fixture, permission and PNG/package checks. | MEDIUM |
| `tests/safety.test.cjs` | Expanded network/storage/credential/sink/submit/click/log/permission static checks. | HIGH |
| `tests/shared.test.cjs` | Expanded parser/validator coverage including bytes, BOM, schema, dates, numbers and duplicates. | MEDIUM |
| `tools/README.md` | Documented all probes, validators, preflight modes and Windows workflows. | LOW |
| `tools/configure-jira-host.ps1` | Made hostname replacement exact and UTF-8-without-BOM with JSON validation. | MEDIUM |
| `tools/dialog-guard-probe.js` | New sanitized candidate-dialog/header/Create evidence exporter. | LOW |
| `tools/dom-probe.js` | Removed value leakage and expanded structural/accessibility flags. | MEDIUM |
| `tools/dropdown-probe.js` | Added popup-root/control relationships and option structure for portal diagnosis. | LOW |
| `tools/preflight.cjs` | Added comprehensive syntax/JSON/manifest/runtime/safety/index/hash/test/release gates. | HIGH |
| `tools/update-file-manifest.cjs` | New deterministic SHA-256 inventory generator. | LOW |
| `tools/validate-ticket.cjs` | Aligned CLI validation with strict schema and UTF-8 byte rules. | MEDIUM |

## 8. Additional helper material mined

| New or materially expanded artifact | Purpose | Burden removed |
|---|---|---|
| `tools/dialog-guard-probe.js` + `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json` | Collect exact project/type/header/Create evidence without ticket values. | Removes guesswork around the highest-risk dialog gate. |
| `tools/dropdown-probe.js` expansion | Records control/popup relationships, popup roots and options. | Replaces global-option assumptions with reproducible evidence. |
| `tests/content-contract.test.cjs` | Locks structural safety claims that pure validator tests cannot cover. | Detects accidental weakening of guard/reacquisition/option logic. |
| Four adversarial fixtures + `tests/FIXTURE_EXPECTATIONS.md` | Make missing schema, duplicate labels, unknown scope and near matches executable examples. | Gives weak AIs/testers exact expected behavior rather than prose interpretation. |
| `tools/update-file-manifest.cjs` | Deterministically regenerates SHA-256 inventory. | Removes error-prone manual hash maintenance. |
| Hardened `tools/preflight.cjs` | One command checks files, syntax, JSON, permissions, forbidden capabilities, index, hashes and tests; release mode checks evidence gates. | Consolidates repetitive acceptance work and prevents stale packaging. |
| `review/FIREFOX_COMPATIBILITY_EVIDENCE.md` | Dated primary-source platform audit. | Separates verified Firefox facts from private Jira assumptions. |
| `review/FILE_BY_FILE_AUDIT_COMPLETED.md` | Exact 74-file accounting proof. | Prevents silent omission of low-profile helpers, fixtures or screenshots. |
| Expanded M01-M62 manual suite/report template | Defines setup/input, expected result and failure meaning. | Converts real-Jira validation into a reproducible checklist. |
| Expanded phase report and weak-AI prompt | Requires changed files, commands, evidence, stop conditions and smallest fixes. | Reduces broad rewrites and unsupported selector guesses. |
| Sanitized probes | Avoid actual ticket/form values in evidence exports. | Reduces data-leak risk during debugging and review handoff. |

## 9. Remaining known unknowns

### Environmental unknowns

- Exact internal Atlassian hostname and organization-approved extension ID/distribution path.
- Exact PERMAQA/Bug dialog header, project/type and Create selectors.
- Real custom-field IDs, accessible names, nested control types and localized labels.
- Approved Tester/Priority/Severity/Game Mode/Affected Player/Repro Rate/Origin/Labels values.
- Build Version Spotted/Released and Branch widget types.
- ProseMirror/contenteditable event and retention behavior in the supported Firefox/Jira build.
- Date display/acceptance format, async option timing and virtualized list behavior.
- Signed Firefox Release/Beta or enterprise deployment result.

### Implementation defects

None remain known at BLOCKER or HIGH severity after the final source/test sweep. A real-Jira failure must be recorded as field-specific evidence and fixed minimally; it must not be generalized into fuzzy matching, global option scans, new permissions or extra product features.

## 10. Final release recommendation

1. Configure the exact Atlassian tenant using the supplied safe configurator; do not broaden the match pattern.
2. Temporarily load the extension in the supported Firefox build and reload the Jira page.
3. Capture and approve dialog, field and dropdown evidence; populate only proven selectors and allowed-value catalogs.
4. Execute all M01-M62 cases and save `tests/MANUAL_TEST_REPORT_COMPLETED.md` with environment and evidence references.
5. Remove `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` only when the approved evidence package exists and update affected docs/index/hashes.
6. Re-run `node tools/update-file-manifest.cjs`, `node --test tests/*.test.cjs`, normal preflight and release preflight; all must be clean in release mode.
7. Build the runtime-only archive with `tools/build-runtime-package.ps1`, inspect its seven-file boundary and run M60 against the archive.
8. Obtain Mozilla/company-approved signing/distribution and perform one final installed-build smoke test before acceptance.

Until step 8 completes, the optimized package is an implementation/review handoff, not a released extension.

## 11. “No more useful helper material” statement

No further low-cost/high-value helper artifact remains. The remaining work requires private Jira DOM, approved value catalogs, actual Firefox event behavior or organizational deployment decisions. Additional generic probes/templates would duplicate the supplied set; guessing adapters/selectors or adding automation/network/storage would either reduce safety or violate scope.
