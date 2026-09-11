# Current package status

## Verified by executable tests

- Firefox Manifest V3 runtime with one exact Jira host placeholder and `clipboardRead` only.
- Explicit Firefox no-data-collection declaration.
- Two-button popup (Paste ticket, Diagnose page) with strict schema/UTF-8 byte parsing, distinct clipboard and page failure messages, per-field outcome reasons and safe-stop feedback.
- Deterministic 16-field plan; unknown and prototype keys cannot add capabilities.
- Unique-dialog guard using exact compact header evidence plus Create presence, refusing wrong project, wrong issue type, ambiguous and Create-less dialogs.
- Offered dropdown options are never accepted as evidence of the current project, issue type or field value.
- Accessible-name/label discovery that fails closed on ambiguity, pairs a field only with a control of a compatible kind and never crosses into another field's row.
- Issue-view style rows (collapsed to icon + name, control mounted on click) are activated with one safe click, committed by blur and verified; discarded edits are reported as not confirmed.
- react-select pickers are opened by a pointer press that passes the click refusal rules; transparent-but-rendered controls (hidden search inputs, Atlaskit checkboxes) are usable, while transparent evidence is not.
- Read-only page diagnosis reports labels, control attributes and guard evidence per field; it never clicks, focuses or reads values.
- Disabled/read-only and submit-capable control protection; Create/Erstellen is never clicked and no form is ever submitted.
- Native input/textarea setter preserving accepted text verbatim.
- Plaintext contenteditable adapter restricted to proven editable elements.
- Control-associated/new-popup dropdown sessions, unique exact matching and query restoration.
- Unicode NFC matching so decomposed German field names and option values still match.
- Multi-label de-duplication, control reacquisition after React rerender, and honest partial reporting when only some values could be applied.
- Per-field isolation and dialog revalidation before every field.
- 149 automated tests: static/unit contracts plus executable jsdom suites that drive the real content script and the real popup through classic and issue-view style forms.
- Mozilla `web-ext lint` runs inside preflight against a runtime-only staging copy and reports no errors or warnings.
- DOM/dialog/dropdown evidence collectors and structured templates.
- Strong normal/release preflight, package-index and SHA verification, enforced in CI on Linux, Windows and macOS.

## Still unavailable without the internal environment

- exact internal Jira hostname,
- stable real dialog/project/type/Create selectors,
- actual control types and stable selectors for custom fields,
- exact allowed dropdown/person/label values,
- actual Build/Branch widget behavior,
- Jira Description/ProseMirror retention behavior,
- actual Due Date display/acceptance format,
- real option loading timings and virtualization behavior,
- signed/company-approved Firefox deployment result.

These are environmental evidence gaps, not permission to guess selectors or expand scope.

## Still required for a public AMO listing

These are decisions and approvals, not code:

- approval to publish the exact Jira hostname, project key and field names,
- product name/trademark approval and Jira attribution,
- permanent Gecko add-on ID, rights holder, licence, support email/site,
- reviewer-accessible Jira test context and reviewer notes.

## Release status

**PASS WITH REAL-JIRA VALIDATION REQUIRED — NOT RELEASE-READY.**

Automated checks, executable behaviour verification and the official add-on linter all pass. Release preflight must continue to fail until the hostname is configured, real DOM evidence is approved, the pending marker is removed, and `tests/MANUAL_TEST_REPORT_COMPLETED.md` exists.
