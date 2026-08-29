# Release checklist

Release only after every required item is checked and evidence is retained internally.

## Environment and evidence

- [ ] Exact company `*.atlassian.net` hostname configured in both manifest locations.
- [ ] Firefox temporary extension reloaded and Jira page reloaded afterwards.
- [ ] `tools/dialog-guard-probe.js` report reviewed.
- [ ] `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json` completed from real evidence.
- [ ] `tools/dom-report-exporter.js` report reviewed on a blank form.
- [ ] `dom/DOM_FIELD_MAP_TEMPLATE.json` completed for all supported present fields.
- [ ] Dropdown relationship reports captured for every select/person/labels control.
- [ ] Actual allowed values inserted into an internal copy of `dom/JIRA_ALLOWED_VALUES_TEMPLATE.json` where useful.
- [ ] `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` removed only after reviewer approval.

## Automated gates

- [ ] `node --test tests/*.test.cjs` passes with the documented count or higher.
- [ ] `node tools/preflight.cjs` passes (warnings allowed only for explicitly pending pre-release evidence).
- [ ] `node tools/update-file-manifest.cjs` run after the last repository change.
- [ ] `node tools/preflight.cjs --release` passes with no warning/failure.
- [ ] All JSON parses and all JS/CJS passes `node --check` through preflight.
- [ ] `FILE_MANIFEST_SHA256.txt` verifies.
- [ ] `PACKAGE_INDEX.md` accounts for every file.

## Manual acceptance

- [ ] All applicable M01-M62 rows in `MANUAL_ACCEPTANCE_TESTS.md` pass.
- [ ] Completed evidence saved as `tests/MANUAL_TEST_REPORT_COMPLETED.md`.
- [ ] Wrong project, Story and ambiguous-dialog tests fail closed.
- [ ] Unknown, near-match, duplicate and unrelated-list dropdown tests skip safely.
- [ ] Labels survive React rerender between selections and never create a new label.
- [ ] Description rich-text retention/plaintext safety verified in real Jira.
- [ ] Due Date and Working Hours behavior verified against real controls.
- [ ] Create/Erstellen remains untouched in every run.

## Safety/capability review

- [ ] Only `clipboardRead` permission exists.
- [ ] One exact Jira host pattern only; no broad host.
- [ ] Firefox data collection declaration is `required: ["none"]`.
- [ ] No network, REST, credentials, storage, cookies, Cache API or telemetry.
- [ ] No form methods, submit events, keyboard synthesis or submit-capable clicks.
- [ ] All direct clicks still pass through `safeClick()`.
- [ ] Logs contain no ticket values or raw payload/error objects.
- [ ] Runtime package contains only files in `RUNTIME_FILE_LIST.txt`.

## Packaging and deployment

- [ ] `tools/build-runtime-package.cjs` or `tools/build-runtime-package.ps1` creates runtime-only ZIP/XPI candidate.
- [ ] Runtime archive inspected; no development/evidence files included.
- [ ] Company approval and required Mozilla signing/distribution process completed.
- [ ] Final Firefox Release-channel installation tested.
- [ ] Human tester understands that visual review and manual Create remain mandatory.

## AMO / public-release gates

- [ ] Public disclosure of exact Jira hostname/project/field names/source is approved.
- [ ] Product name/trademark use is approved; Jira attribution/disclaimer is present.
- [ ] Permanent Gecko add-on ID is approved and AMO uniqueness confirmed.
- [ ] Rights holder and AMO license selection are approved.
- [ ] Support email/site are approved.
- [ ] Reviewer-accessible Jira test account/context is verified from outside the internal environment.
- [ ] Reviewer credentials are stored only in private AMO reviewer notes.
- [ ] M57A proves the final Firefox data-collection declaration dynamically.
- [ ] M63 proves a second concurrent paste is rejected.
- [ ] Labels/multi-select input count has a hard upper bound (<= 20).
- [ ] Production debug logging is disabled in release builds.
- [ ] Tested Firefox minimum is declared with gecko.strict_min_version ("140.0").
- [ ] Official linter passes on the exact staged upload files.
- [ ] AMO upload validator has no unresolved errors/warnings.
- [ ] Final unsigned candidate SHA-256/source SHA/tool versions are recorded.
- [ ] Final Mozilla-signed XPI is installed and smoke-tested in Firefox Release.
- [ ] Final signed XPI SHA-256 and AMO version ID are recorded.

