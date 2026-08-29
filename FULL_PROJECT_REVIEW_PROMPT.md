# FULL PROJECT REVIEW PROMPT — GQA JIRA bug reporter helper

You are the independent senior reviewer for the repository/package **GQA JIRA bug reporter helper**.

Your task is not a superficial code review. You must perform a **complete, repository-wide acceptance audit**, verify every file, verify cross-file consistency, actively search for hidden failure modes, and then perform a second pass whose explicit purpose is to extract or create **additional implementation helper material** that can make the remaining work easier for a weak coding AI and a human tester.

Do not stop after identifying problems. Where possible, provide exact fixes, exact replacement code, exact test additions, exact templates, or new helper files. If you have write access to the repository, create those files directly. If you do not, output their complete contents.

The product scope itself is intentionally tiny. You may improve implementation guidance, tests, diagnostics, probes, templates, review material and documentation, but you must **not add product features** that violate the fixed scope.

---

## 0. Product intent you must preserve

The only intended user flow is:

1. A tester uses an AI to prepare a Jira bug ticket as structured JSON.
2. The tester copies the JSON to the Windows clipboard.
3. The tester opens the **PERMAQA / Bug** Jira create dialog in Firefox.
4. The tester clicks the Firefox extension **GQA JIRA bug reporter helper**.
5. The tester clicks **Paste ticket**.
6. The extension reads the clipboard JSON and fills supported Jira fields best-effort.
7. Empty, malformed, missing or unmatched field values are skipped.
8. The tester visually reviews and corrects the Jira form.
9. The tester manually clicks Jira's **Create/Erstellen** button.

The extension must never autonomously submit/create the issue.

### Product non-goals that are mandatory safety constraints

The runtime extension must not add:

- Jira REST API access,
- API keys/tokens/passwords,
- backend services,
- external network calls,
- local/cloud ticket storage,
- ticket history,
- AI/LLM calls,
- analytics/telemetry,
- automatic submission,
- automatic editing/deleting of existing issues,
- project switching,
- issue-type switching,
- fuzzy dropdown matching,
- auto-correction of AI values,
- automatic new label creation,
- Lead-only field automation,
- attachments or linked-issue automation,
- unnecessary frameworks/dependencies.

The desired implementation is deliberately boring, small, direct and failure-isolated.

---

# MANDATORY REVIEW METHOD

You must execute the following passes in order. Do not skip a pass because the previous pass looked good.

## PASS 1 — Repository inventory and completeness proof

1. Recursively enumerate **every file** in the package/repository.
2. Compare the result to `PACKAGE_INDEX.md`.
3. Include runtime code, documentation, tests, tools, prompts, JSON fixtures, DOM templates and reference images.
4. Identify:
   - missing files,
   - unexpected files,
   - duplicate/conflicting files,
   - stale superseded files,
   - files referenced by docs but absent,
   - files present but undocumented.
5. Create a file-by-file audit list. Every file must receive an explicit status later: `PASS`, `ISSUE`, `IMPROVEMENT`, or `REFERENCE ONLY`.
6. If a binary/image cannot be semantically inspected by your environment, state that explicitly and still verify filename, purpose, dimensions/format where possible and consistency with references.

**You are not allowed to say “reviewed repository” unless every file is accounted for.**

---

## PASS 2 — Read the authoritative intent documents first

Read completely, at minimum:

- `00_START_HERE.md`
- `PROJECT_PLAN.md`
- `IMPLEMENTATION_PROMPT_FOR_WEAK_AI.md`
- `README.md`
- `DATA_SCHEMA.md`
- `SECURITY_MODEL.md`
- `REQUIREMENTS_TRACEABILITY.md`
- `DOM_EVIDENCE_WORKFLOW.md`
- `FIELD_ADAPTER_GUIDE.md`
- `MANUAL_ACCEPTANCE_TESTS.md`
- `RELEASE_CHECKLIST.md`
- `CURRENT_STATUS.md`

Then restate the actual product contract in your own concise terms before reviewing code. This proves you understood the target rather than merely linting code.

Identify any contradiction between documents before code analysis begins.

---

## PASS 3 — File-by-file code and document audit

Inspect **every file individually**.

For every source/document/tool/test file, record:

- purpose,
- whether it is necessary,
- correctness,
- consistency with scope,
- dangerous assumptions,
- hidden dependencies,
- ambiguous instructions,
- duplicated/conflicting logic,
- weak-AI implementation hazards,
- whether it needs a correction or extra explanatory material.

For code files, reason through all major paths, not just the happy path.

For documents/prompts, check whether a weak implementation AI could misread or over-interpret them.

For tests, verify they test what their names claim and are not giving false confidence.

For tools, verify they are genuinely development-only and cannot accidentally be loaded into the extension.

---

## PASS 4 — Cross-file consistency audit

Build and verify a consistency matrix across:

- schema keys,
- field names,
- field order,
- field types,
- supported/unsupported fields,
- safety guards,
- forbidden submit actions,
- host permissions,
- timing constants,
- JSON examples,
- implementation phases,
- test cases,
- release criteria.

Examples of required checks:

- Does every `DATA_SCHEMA.md` key exist in `config.js` and `buildFieldPlan()`?
- Does every supported field documented in README actually have an adapter path?
- Are any runtime fields present that documentation says must not be touched?
- Do sample JSON files use correct types?
- Do manual tests cover all special semantics?
- Are exact-match rules consistent everywhere?
- Is `flagged_impediment:false` consistently documented as “do nothing”?
- Is missing `schema_version` behavior consistent with the intended schema strictness?
- Does `manifest.json` match permission assumptions in security docs/tests?

Flag even small inconsistencies because weak AIs amplify ambiguity.

---

## PASS 5 — End-to-end execution trace

Trace the full actual runtime path from click to final field result:

`popup button` -> `clipboard read` -> `JSON parse` -> `active tab` -> `runtime message` -> `dialog guard` -> `field plan` -> `value validation` -> `control discovery` -> `adapter` -> `safe click/event` -> `filled/skipped result` -> `popup status`.

For each stage, identify:

- possible failure,
- current handling,
- whether failure is safe,
- whether later fields continue,
- whether user receives sufficient feedback,
- whether any failure could accidentally submit or destructively alter data.

Explicitly inspect race conditions and Jira dynamic-rendering assumptions.

---

## PASS 6 — Firefox WebExtension compatibility audit

Verify the implementation against current Firefox MV3/WebExtension behavior as far as your environment/knowledge allows.

You must scrutinize:

- `manifest_version: 3`,
- `browser_specific_settings.gecko`,
- `clipboardRead`,
- `host_permissions`,
- content-script `matches`,
- popup access to `navigator.clipboard.readText()`,
- whether `browser.tabs.query()` and `browser.tabs.sendMessage()` require any missing permission for the intended use,
- content-script injection timing,
- behavior when Jira was already open before temporary extension reload,
- behavior when the active tab is not Jira,
- Content Security Policy implications,
- availability/deprecation concerns around `document.execCommand("insertText")`,
- native setter/event behavior in React/Atlaskit controls,
- Firefox-specific differences from Chromium examples.

If a claim requires live documentation lookup and you can browse, verify it using authoritative Mozilla/Atlassian sources. Distinguish confirmed facts from assumptions.

---

## PASS 7 — Jira DOM robustness audit

This is one of the most important passes.

Review the generic DOM strategy for modern Jira/Atlaskit behavior. Specifically test/reason about:

- dialog identification,
- possibility that the words `PERMAQA` or `Bug` appear elsewhere in the dialog and create a false positive,
- whether header-specific selectors/evidence should strengthen the guard,
- labels and `aria-labelledby`,
- nested controls,
- multiple candidate controls near a label,
- hidden controls,
- offscreen but rendered controls,
- React controlled inputs,
- ProseMirror/contenteditable Description behavior,
- dropdown/listbox options rendered in portals outside the dialog,
- searchable comboboxes,
- person-picker options with secondary text,
- multi-select state after the first label selection,
- stale control references after React rerender,
- asynchronous option loading longer than 2 seconds,
- virtualized option lists,
- localized field labels,
- date picker/localized input behavior,
- required-field markers such as `*`,
- fields that look like dropdowns visually but are not select-like DOM elements.

Do not demand complexity preemptively. The design rule remains: **real DOM evidence -> smallest proven fix**.

Where the real internal Jira DOM is unavailable, do not invent it. Instead improve probes/templates/instructions so the human can collect exactly the missing evidence.

---

## PASS 8 — Security and non-capability audit

Treat the extension as handling untrusted clipboard text inside an authenticated Jira browser session.

Verify, both automatically and manually:

### No network

Search for and reason about:

- `fetch`,
- `XMLHttpRequest`,
- `WebSocket`,
- `EventSource`,
- `sendBeacon`,
- dynamically created remote script/image/link requests,
- Jira REST endpoint strings,
- generic URL clients.

### No storage

Search for:

- browser/chrome storage,
- localStorage/sessionStorage,
- IndexedDB,
- cookies,
- file persistence from runtime code.

### No credential handling

Search for:

- Authorization,
- Bearer,
- API token/key/password/secrets.

### No submission

Search for and reason about all submit paths, including:

- `.submit()`,
- `requestSubmit()`,
- submit events,
- direct clicks,
- helper functions that could target buttons,
- Enter key/keyboard-event synthesis,
- implicit form submission,
- clicking elements whose nested/accessible text differs from visible exact text,
- future code paths that bypass `safeClick()`.

### Clipboard injection

Confirm clipboard strings cannot become executable HTML/script through runtime code. Search for `innerHTML`, `outerHTML`, `insertAdjacentHTML`, eval/new Function/script creation and similar sinks.

### Data leakage

Verify logs do not print ticket values and popup errors do not leak full payloads.

### Host scope

Verify exact Jira hostname restriction and absence of broad page access.

Any path that could automatically submit/create an issue is a **BLOCKER**.

---

## PASS 9 — Automated test quality audit

Run all existing automated tests. Do not trust a green result by itself.

At minimum run:

```bash
node --test tests/*.test.cjs
node tools/preflight.cjs
```

If release-mode configuration is available, also reason about/run:

```bash
node tools/preflight.cjs --release
```

Then inspect tests for blind spots.

You must actively look for missing automated tests for:

- schema version behavior,
- max size,
- unknown keys,
- weird whitespace,
- valid/invalid dates,
- zero/decimal/negative working hours,
- duplicate labels,
- non-string array values,
- no network/storage/submit,
- unsafe DOM sinks,
- permission drift,
- accidental addition of dev tools to manifest,
- direct click bypasses,
- runtime file references missing from disk,
- forbidden scope additions,
- leakage logging patterns if statically feasible.

If useful tests can be added without external dependencies, create them.

---

## PASS 10 — Manual acceptance coverage audit

Review `MANUAL_ACCEPTANCE_TESTS.md` line-by-line.

For each runtime behavior that cannot be faithfully unit-tested without the real Jira form, make sure there is a concrete manual test with:

- exact setup,
- exact input,
- exact expected result,
- exact failure interpretation.

Add missing cases if they materially reduce implementation risk.

Do not convert the project into a browser-automation test suite unless there is a proven need. Manual real-Jira evidence is acceptable for environment-specific DOM behavior.

---

## PASS 11 — Weak-AI implementability audit

Pretend the implementing model is weak, literal, prone to scope creep, and likely to rewrite too much when one thing breaks.

Inspect whether the package tells that AI:

- exactly what to read first,
- exactly what it may and may not change,
- exact phase order,
- exact stop conditions,
- exact test commands,
- exact selector preference,
- exact troubleshooting order,
- exact evidence required before generic changes,
- exact output expected after each phase,
- how to handle uncertainty without guessing.

For every place where a weak AI could plausibly make the wrong choice, add or propose a guardrail in documentation, template, test, or tool.

Do not solve ambiguity by adding product features.

---

# PASS 12 — MANDATORY HELPER-MATERIAL MINING PASS

This pass is explicitly required by the human requester. **Do not return your final review while useful helper material can still be added.**

Your goal is to squeeze additional implementation assistance out of the project without expanding the runtime product scope.

Review every existing file and ask:

> “What extra artifact would remove one more decision, guess, repetitive manual step, or debugging burden from a weak implementation AI or tester?”

Consider, but do not limit yourself to:

- stronger DOM evidence collectors,
- dropdown option probes,
- sanitized report exporters,
- field-map templates,
- allowed-value catalogs,
- exact-selector worksheets,
- sample ticket fixtures,
- adversarial JSON fixtures,
- Windows clipboard helper scripts,
- preflight scripts,
- static safety tests,
- permission checks,
- manifest sanity checks,
- release checklists,
- manual test report templates,
- per-phase acceptance templates,
- troubleshooting decision trees,
- requirements traceability,
- source-file inventory checks,
- reviewer output templates,
- “known unknowns” records,
- version/change records,
- AI ticket-generation prompts,
- prompts that inject approved Jira dropdown values,
- explicit instructions for what DOM evidence to paste back to an implementation AI,
- exact examples of “small fix” vs “forbidden rewrite”.

### Mandatory rule for this pass

Do not merely list ideas. For every helper artifact that is clearly useful and cheap, **create it** if you have repository write access, or output its full ready-to-save content.

After creating helper material, perform one more mini-review of the new files for consistency and redundancy.

### Stop condition for helper mining

You may stop only when remaining ideas would be:

- product scope expansion,
- redundant with existing material,
- dependent on unavailable internal Jira evidence,
- substantially more complex than the risk they address,
- or not materially useful to the weak AI/tester.

State why no further low-cost/high-value helper material remains.

---

## PASS 13 — Reference screenshot audit

Inspect all supplied reference screenshots in `reference/screenshots/`.

Verify `reference/JIRA_FORM_VISUAL_REFERENCE.md` accurately distinguishes:

- visually observed facts,
- likely but unproven facts,
- things that cannot be inferred from screenshots.

Do not derive CSS selectors, customfield IDs, option catalogs or control types from screenshots.

Use the screenshots to ensure the documented target field set matches the visible form and that intentionally untouched Lead-only fields are correctly represented.

---

## PASS 14 — Final contradiction and regression sweep

After all proposed changes/new helpers:

1. Re-enumerate the repository.
2. Re-run automated tests/preflight.
3. Re-check docs for stale references.
4. Re-check `PACKAGE_INDEX.md` includes new files.
5. Re-check no helper tool was accidentally added to `manifest.json`.
6. Re-check product scope did not expand.
7. Re-check all safety non-goals still hold.
8. Re-check all new tests actually pass.

---

# SEVERITY DEFINITIONS

Use these consistently:

- **BLOCKER** — could submit/create unexpectedly, expose credentials/data externally, corrupt existing Jira state, or makes intended basic flow unusable.
- **HIGH** — likely causes wrong field behavior or widespread failure in real Jira; must fix before release.
- **MEDIUM** — robustness/documentation/test weakness that can create avoidable implementation mistakes but has safe failure mode.
- **LOW** — polish/clarity/helper improvement with limited operational risk.
- **INFO** — observation/known limitation requiring no change.

---

# REQUIRED FINAL OUTPUT

Use `review/REVIEW_OUTPUT_TEMPLATE.md` as the minimum shape. Your final response/report must include all of the following:

## 1. Overall verdict

One of:

- `PASS`
- `PASS WITH REAL-JIRA VALIDATION REQUIRED`
- `CONDITIONAL PASS`
- `FAIL`

Explain in 3–8 concise sentences.

## 2. Blockers/high findings first

For each finding:

- ID,
- severity,
- affected file(s),
- exact problem,
- exact reproduction/reasoning,
- exact fix,
- test to prove the fix.

No vague “consider improving”.

## 3. Complete file-by-file audit table

Every enumerated file must appear exactly once with status and one-line conclusion.

## 4. Requirements traceability verdict

For each requirement ID in `REQUIREMENTS_TRACEABILITY.md`, mark:

- PASS,
- FAIL,
- NEEDS REAL JIRA,
- or NOT APPLICABLE with reason.

## 5. Automated test evidence

List commands, exit status and test counts.

## 6. Manual test/evidence gaps

List only things that genuinely require the internal Jira/browser environment and provide exact next steps/scripts.

## 7. Exact corrections

If you can edit files, list files changed and summarize changes.
If you cannot edit, provide patches or complete replacement contents.

## 8. Additional helper material mined

List every new helper file/template/test/probe/script created or recommended, its purpose, and why it reduces burden for the weak AI.

## 9. Remaining known unknowns

Keep environmental unknowns separate from implementation defects.

## 10. Final release recommendation

State exactly what must happen next, in order, before the tool is accepted.

## 11. “No more useful helper material” statement

Before ending, explicitly state whether another low-cost/high-value helper artifact still comes to mind. If yes, create/provide it before ending. If no, explain why the remaining work requires real internal Jira evidence or would be scope creep/redundancy.

---

# IMPORTANT REVIEWER BEHAVIOR

- Be skeptical of detailed plans; detail can still hide errors.
- Do not assume tests are correct because they pass.
- Do not assume screenshots reveal DOM.
- Do not invent Jira selectors/options.
- Do not solve problems by switching to the Jira API.
- Do not add AI inside the extension.
- Do not add a submit feature “for convenience”.
- Prefer exact, minimal fixes over rewrites.
- Separate runtime product improvements from development/review helper improvements.
- If current code is already correct, spend your effort improving evidence, tests, diagnostics and weak-AI instructions rather than inventing product features.
- Continue the audit until every file has been addressed and the helper-material mining pass is genuinely exhausted.
