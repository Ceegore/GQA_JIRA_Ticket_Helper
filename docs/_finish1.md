# `_finish1.md` — Paranoid 360° bug hunt + Firefox AMO release readiness

**Audit date:** 2026-08-29  
**Repository:** `Ceegore/GQA_JIRA_Ticket_Helper`  
**Audited runtime/source baseline:** `main` at commit `a29f0bec28c6332bc463404b86bb0f5b7ff69de0`  
**Existing open GitHub issues at audit time:** 0  
**Existing open GitHub pull requests at audit time:** 0  
**Purpose of this file:** authoritative remaining bug/task/release backlog for the first Firefox Add-ons (AMO) release.

> **FINAL AUDIT VERDICT: NOT READY FOR AMO SUBMISSION YET.**
>
> The codebase is unusually defensive for its size, and the earlier hardening work fixed several real safety problems. However, the repository's previous `PASS WITH REAL-JIRA VALIDATION REQUIRED` verdict is **not** the same as AMO release readiness. The current `main` branch still contains hard release blockers, and the previous review did not cover several important 2026 AMO/public-release issues found below.

---

## 1. What was independently checked

This pass deliberately did **not** trust the previous final review as proof. The following were re-read or inspected independently:

- `manifest.json`
- `config.js`
- `shared.js`
- `content.js`
- `popup.html`
- `popup.css`
- `popup.js`
- `tests/package.test.cjs`
- `tests/safety.test.cjs`
- `tests/content-contract.test.cjs`
- `MANUAL_ACCEPTANCE_TESTS.md`
- `RELEASE_CHECKLIST.md`
- `tools/preflight.cjs`
- `tools/build-runtime-package.ps1`
- `tools/configure-jira-host.ps1`
- `review/FINAL_REVIEW_REPORT.md`
- `review/FIREFOX_COMPATIBILITY_EVIDENCE.md`
- repository inventory/tree, current commit, current open issues and PRs
- current Mozilla/Firefox Extension Workshop publishing, policy, signing, source-code, data-collection, packaging, and `web-ext` guidance
- current MDN manifest requirements, including `browser_specific_settings.gecko.id`, `data_collection_permissions`, `strict_min_version`, `icons`, and action icons
- current Atlassian trademark guidance because the public-facing product name contains `JIRA`/`Jira`

### Important execution limitation of this independent pass

This audit was able to inspect the remote repository directly through GitHub, but the local execution environment did not have a checked-out clone or `web-ext` installed. Therefore this pass does **not** falsely claim that it independently executed the Node test suite or Mozilla linter. Existing repository reports say the internal Node suite passed previously; that evidence is useful, but the release gates below require a **fresh execution on the final release candidate**.

---

# 2. Release blockers — all must be closed

## B-001 — BLOCKER — manifest still ships the literal Jira hostname placeholder

**Current state**

`manifest.json` contains the literal pattern twice:

```json
"https://YOUR-COMPANY.atlassian.net/*"
```

It appears in both `host_permissions` and `content_scripts.matches`.

**Impact**

The uploaded add-on would not inject into the real company Jira tenant and therefore would not perform its primary function. AMO policy requires the add-on to function as described.

**Required fix**

1. Decide the real release tenant hostname.
2. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\configure-jira-host.ps1 -HostName "REAL-TENANT.atlassian.net"
```

3. Verify exactly one host permission and one identical content-script match remain.
4. Run release preflight again.
5. Treat the exact hostname as **public information** if this add-on is listed publicly on AMO; see B-008.

**Acceptance**

- no `YOUR-COMPANY` anywhere in the runtime archive;
- only one exact HTTPS Atlassian tenant pattern;
- extension works on that tenant;
- extension does not run on another Atlassian tenant.

---

## B-002 — BLOCKER — real Jira DOM evidence and completed M01–M62 report do not exist yet

**Current state**

- `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` still exists;
- `tests/MANUAL_TEST_REPORT_COMPLETED.md` is absent;
- all configured selectors in `config.js` remain `null` and rely on generic discovery;
- the repository itself already admits that Description editor behavior, date format, dropdown ownership, rerender timing, exact controls, and actual options are not proven on the real Jira instance.

**Impact**

The most important product behavior is still only statically reasoned about. A safe failure is better than a wrong write, but an AMO release still has to function as described.

**Required work**

Perform the existing evidence flow exactly as documented:

1. configure the real host;
2. collect dialog guard evidence;
3. collect the field map;
4. collect dropdown/session relationships;
5. prove Description retention;
6. prove Due Date and Working Hours handling;
7. run all applicable M01–M62 rows;
8. save `tests/MANUAL_TEST_REPORT_COMPLETED.md`;
9. remove `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` only after approval;
10. re-run release preflight.

**Do not weaken fail-closed behavior to make a failing manual test pass.** Add the smallest evidence-backed selector/adapter fix instead.

---

## B-003 — BLOCKER — AMO reviewer test access is not prepared

Mozilla requires add-ons to be reviewable and asks developers to provide testing information and credentials when credentials are necessary. This add-on only works against a specific private Jira tenant and an internal `PERMAQA / Bug` form.

**Likely rejection scenario**

A Mozilla reviewer installs the XPI, cannot access the tenant because of SSO/VPN/company restrictions, cannot reach a matching Bug form, and therefore cannot verify primary functionality.

**Required decision before submission**

### Preferred for a listed AMO release

Provide a sanitized reviewer-accessible account and test context on the **same release hostname** with permission to open, but not necessarily submit, the relevant Bug form.

Requirements:

- reachable from Mozilla's reviewer environment without company VPN;
- no production secrets or customer data;
- test account has minimum permissions;
- reviewer can open the target `PERMAQA / Bug` create dialog;
- sample options necessary for the test exist;
- credentials are entered **only in AMO's private Notes for Reviewers** — never commit credentials to this repository.

### If external reviewer access cannot be provided

Do **not** blindly submit a public/listed build and hope code review is enough. Re-evaluate distribution. Mozilla explicitly supports self-distributed/unlisted signed extensions for limited audiences, although those remain subject to policy and review. A public AMO listing is allowed for internal-use add-ons, but reviewability still matters.

A complete ready-to-copy reviewer-notes template is included in section 7.

---

## B-004 — BLOCKER — `data_collection_permissions.required: ["none"]` needs dynamic proof, not only static source proof

**Current good state**

The extension code contains no `fetch`, XHR, WebSocket, `sendBeacon`, storage, Jira REST client, analytics, credentials, or telemetry. This strongly supports a no-developer-network design.

**Remaining compliance risk**

The extension deliberately dispatches `input` and `change` events into the Jira page. Jira/React/Atlassian code can react to those events. If populating a field causes Jira itself to send ticket content to a remote service before the human clicks Create, that is a behavior the static source scanner cannot see.

The current M57 only says:

> No extension-originated external request.

That is too narrow for a paranoid Firefox data-declaration review.

**Required replacement/extension of M57**

Add a new test, e.g. **M57A**, and make it release-blocking:

```text
M57A — With Firefox DevTools Network recording from immediately before clicking
Paste ticket until at least 10 seconds after the helper finishes, verify whether
ANY request containing or derived from clipboard/ticket field data is triggered
by the helper's synthetic input/change operations before the user manually
submits Jira. Record URL category, initiator, request body/parameters, timing,
and whether the request would have happened without the helper action.
```

**Decision gate**

- If no such transmission occurs: keeping `required: ["none"]` is defensible.
- If such transmission occurs as a direct result of helper-driven field filling: stop release and reclassify the Firefox data declaration using Mozilla's current taxonomy, update the privacy policy/listing, and implement any required consent flow.
- Do not keep `none` merely because the JavaScript does not itself call `fetch()`.

---

## B-005 — BLOCKER/HIGH — two imports can run concurrently

**New bug found in this pass**

`popup.js` disables its button only inside the currently open popup instance. `content.js` has no global import-in-progress lock.

A user can:

1. start a long import;
2. close the toolbar popup;
3. reopen the popup;
4. press **Paste ticket** again while the first `pasteTicket()` is still running.

That creates two asynchronous field-fill loops in the same Jira document. They can interleave control opening, option discovery, input events, React rerenders, and popup-session detection.

**Why this matters**

The code is intentionally designed to avoid guessing, but concurrent runs invalidate several assumptions about "newly opened" option groups and current controls. This can produce wrong selections, skipped fields, query restoration races, or misleading completion counts.

**Minimal required patch**

```js
let pasteInProgress = false;

async function handlePasteTicket(ticket) {
  if (pasteInProgress) {
    return {
      ok: false,
      error: "A ticket paste is already in progress."
    };
  }

  pasteInProgress = true;
  try {
    return await pasteTicket(ticket);
  } finally {
    pasteInProgress = false;
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "GQA_PASTE_TICKET") return undefined;
  return handlePasteTicket(message.ticket);
});
```

Do not use a queue; reject the second run. Queuing stale clipboard actions would create a worse surprise.

**Automated tests to add**

- source/contract test proving one lock exists;
- lock clears in `finally` after success and thrown failure.

**Manual test to add**

```text
M63 — Start a deliberately slowed import, close/reopen the popup, press Paste
again. Second attempt must return "A ticket paste is already in progress" and
must not start another field loop. First run remains safe and finishes/stops.
```

---

## B-006 — BLOCKER — official Mozilla linter/AMO-equivalent validation is missing from the release gate

`tools/preflight.cjs` is strong project-specific static validation, but the release checklist never runs Mozilla's `web-ext lint` / Add-ons Linter against the exact submission candidate.

**Required tooling**

Pin tooling instead of relying on an unversioned global install.

Recommended dev-tool setup:

```json
{
  "private": true,
  "devDependencies": {
    "web-ext": "10.6.0"
  }
}
```

Commit the generated lockfile and use `npm ci` in release automation.

**Required candidate lint command**

```bash
npx web-ext lint --source-dir dist/runtime-stage --warnings-as-errors
```

Also validate the resulting ZIP/XPI with the Add-ons Linter if practical:

```bash
npx addons-linter dist/gqa-jira-bug-reporter-helper-runtime.zip
```

**Packaging script change**

`tools/build-runtime-package.ps1` currently deletes `dist/runtime-stage` immediately after zipping. Move deletion until **after** linting, or create a reusable staging command. A final build must fail on any linter warning/error unless a warning is explicitly reviewed and documented.

**AMO upload gate**

The actual AMO upload validator must also return no unresolved errors. Save the result/screenshot or review record with release evidence.

---

## B-007 — BLOCKER before a public listing — product name/trademark decision is unresolved

**Current name**

`GQA JIRA bug reporter helper`

`Jira` is an Atlassian trademark. Atlassian's trademark guidance emphasizes clear third-party differentiation and favors referential naming such as `... for Jira`.

**Recommended AMO-safe naming direction**

> **GQA Bug Reporter Helper for Jira**

**Required decision**

- If the rights holder/company approves the current exact brand, retain it and document approval.
- Otherwise rename the manifest name, popup title, docs, package name, AMO listing and screenshots consistently.
- Do not use Atlassian/Jira logos unless separately permitted.

**Recommended attribution text**

> Jira is a trademark of Atlassian. This extension is an independent internal workflow helper and is not affiliated with, sponsored by, or endorsed by Atlassian.

---

## B-008 — BLOCKER/organizational approval — a listed AMO build publicly exposes internal implementation details

A listed AMO extension is not a private binary. Users can obtain the XPI and inspect its source. The release manifest will necessarily expose the exact Jira hostname. The runtime also contains `PERMAQA`, supported field names/aliases, behavior, and dialog assumptions.

The current GitHub repository is public and additionally contains reference screenshots and internal workflow/evidence documentation.

**Required approval**

Before public listing, the company/rights holder must explicitly approve public disclosure of:

- exact Jira tenant hostname;
- project name `PERMAQA`;
- visible custom field names;
- add-on source code;
- extension ID;
- any screenshots included in GitHub or AMO;
- any reviewer guidance that reveals internal workflow structure.

If any of that is confidential, a public AMO listing is the wrong distribution channel. Use an appropriate signed self-distribution/enterprise route instead.

**Separate repository hygiene task**

Manually inspect every file under `reference/screenshots/`, `dom/`, `review/`, and sample fixtures for names, emails, ticket IDs, customer names, internal URLs, credentials, tokens, and confidential content.

---

## B-009 — BLOCKER — AMO legal/listing ownership fields are not finalized

AMO asks for a license and developer/support metadata. The repository currently has `INTERNAL_USE_NOTICE.txt` but no final public release license decision.

**Required decisions before submission**

- legal/rights holder name;
- AMO developer display name;
- stable developer account email;
- support email;
- optional support site;
- license selection;
- confirmation that all code, text, images, screenshots and marks may legally be distributed.

**Recommended license if the project is intended to remain proprietary/internal**

Select **All Rights Reserved** in AMO, subject to rights-holder approval.

---

# 3. High-priority bugs and release-hardening tasks

## H-001 — HIGH — multi-select input can create an extremely long-running import

The whole clipboard is bounded to 100,000 UTF-8 bytes, but `labels` has no item-count limit. A hostile or accidental JSON payload can contain thousands of tiny distinct strings. Each label may trigger bounded dropdown waits, so the overall operation can remain active for a very long time even after the popup is closed.

**Required fix**

Add:

```js
MAX_MULTI_SELECT_VALUES: 20
```

unless real business evidence demonstrates a legitimate need for more.

When the sanitized array exceeds the limit, **skip the entire labels field** and report a distinct reason such as `too-many-values`. Do not silently truncate.

Add unit tests for 20 accepted and 21 rejected/skipped values.

---

## H-002 — HIGH/MEDIUM — production content-script debug logging is permanently enabled

`content.js` currently has:

```js
const DEBUG = true;
```

**Required release change**

Set:

```js
const DEBUG = false;
```

for the AMO candidate, or expose a build-time/dev constant that is false in release artifacts.

Add a preflight assertion that release runtime has debug logging disabled.

---

## H-003 — HIGH/MEDIUM — no explicit minimum Firefox version / compatibility contract

`browser_specific_settings.gecko.strict_min_version` is absent.

**Recommended simple policy**

Unless the organization explicitly needs older Firefox, set and test:

```json
"strict_min_version": "140.0"
```

Use the real tested corporate minimum if newer/different. Do not claim a lower version than actually tested.

---

## H-004 — HIGH/MEDIUM — there is no CI enforcement

No `.github/workflows` directory exists.

**Recommended minimal CI**

On every push/PR:

1. Node 22 setup;
2. `npm ci`;
3. `node --test tests/*.test.cjs`;
4. `node tools/preflight.cjs`;
5. stage runtime files;
6. `npx web-ext lint --source-dir <stage> --warnings-as-errors`.

---

## H-005 — HIGH/MEDIUM — release artifact provenance is incomplete

For the final unsigned upload ZIP and final Mozilla-signed XPI, record:

- filename;
- runtime `manifest.version`;
- source commit SHA;
- SHA-256;
- build tool versions;
- AMO submission/version ID;
- signing result;
- date;
- manual test report reference.

---

## H-006 — HIGH/MEDIUM — stable add-on ID must be treated as permanent before first signing

Current ID:

```text
gqa-jira-bug-reporter-helper@internal.local
```

This is not currently identified as a syntax bug, but first production signing should confirm the permanent ID and AMO uniqueness before release.

---

## H-007 — MEDIUM — build process is Windows/PowerShell-only

Recommended: add a simple Node-based staging/build helper for CI/reproducibility while keeping the existing PowerShell wrapper if useful. Do not add bundling/minification/transpilation.

---

# 4. Medium/low findings and polish

## M-001 — MEDIUM — no custom extension/action icon

Recommended files:

```text
icons/icon-16.png
icons/icon-32.png
icons/icon-48.png
icons/icon-64.png
icons/icon-96.png
```

Use an original GQA/bug-report motif. Do not use the Jira/Atlassian logo.

**Self-contained image-generation brief**

```text
Create a clean original browser-extension icon for a tool named “GQA Bug Reporter
Helper for Jira”. Square 1:1 composition, transparent background, no text, no
letters, no numbers, no company/trademark logos. Combine a simple friendly bug
silhouette with a small checklist/ticket shape and a subtle check mark. Flat,
high-contrast vector-like design that remains recognizable at 16x16 pixels,
professional QA/developer-tool aesthetic, minimal detail, crisp edges, centered
with safe padding. Do not imitate Jira or Atlassian brand marks, colors, or logo
geometry. Deliver a master 512x512 transparent PNG that can be downscaled to
16/32/48/64/96 px.
```

---

## M-002 — LOW/MEDIUM — wrong-page feedback is generic

Suggested message:

> Open the configured Jira tenant and a PERMAQA Bug creation dialog, then try again.

Do not request `tabs` merely for nicer URL inspection.

---

## M-003 — LOW/MEDIUM — popup lifecycle gives no cancellation semantics

With B-005 and H-001 fixed, document:

> Closing the toolbar popup does not cancel an import already in progress. Wait for the current import to finish before starting another one.

---

## M-004 — LOW — popup has no dark-theme styling

Not a release blocker.

---

## M-005 — MEDIUM — public screenshots/reference evidence need a privacy/IP scrub

Verify no names, emails, avatars, issue IDs, unreleased product names, customer data, private URLs, confidential project details, or unapproved third-party artwork/logos are present.

---

# 5. Current code areas that looked good and should NOT be weakened

- no Jira REST/API integration;
- no credentials/tokens;
- no extension-owned network requests;
- no storage/history/telemetry;
- no automatic issue submission;
- fixed field allow-list;
- schema version required;
- 100,000-byte UTF-8 clipboard boundary;
- exact option matching;
- ambiguity skips;
- disabled/read-only controls rejected;
- direct clicks go through one `safeClick()` path;
- submit-capable controls rejected structurally;
- dialog revalidated before each field;
- dialog ambiguity fails closed;
- labels reacquire controls after rerender;
- no HTML insertion sinks;
- no dynamic code execution;
- development files excluded from runtime package.

---

# 6. AMO submission field plan — ready to copy

## Recommended Name

```text
GQA Bug Reporter Helper for Jira
```

## Recommended AMO URL slug

```text
gqa-bug-reporter-helper-for-jira
```

## Summary

```text
Internal QA helper that locally fills a configured Jira Cloud Bug form from user-copied JSON and never submits the issue automatically.
```

## Description

```text
GQA Bug Reporter Helper for Jira is a narrowly scoped QA workflow helper for an
authorized organization Jira Cloud environment.

The user deliberately copies a schema-versioned JSON bug report, opens the
configured PERMAQA Bug creation dialog in Jira, and clicks “Paste ticket” in the
extension. The extension validates the clipboard content locally and fills only
its supported fields on a best-effort basis. A human remains responsible for
reviewing the form and manually clicking Jira’s Create button.

The extension does not create or submit issues automatically. It does not use
the Jira REST API, does not handle Jira credentials or API tokens, does not keep
a ticket history, and does not use analytics or telemetry. It has no
developer-operated backend service.

The extension is intentionally limited to one configured Jira Cloud tenant and
does nothing on unrelated websites or other Jira tenants.

Requirements:
- Firefox desktop within the supported version range.
- Authorized access to the organization’s configured Jira Cloud tenant.
- Access to the expected PERMAQA Bug creation form.
- Ticket JSON conforming to the documented schema.

Jira is a trademark of Atlassian. This extension is an independent internal
workflow helper and is not affiliated with, sponsored by, or endorsed by
Atlassian.
```

## Experimental flag

```text
No — but only after every blocker and acceptance gate in this document passes.
```

## Payment / non-free service / hardware question

Recommended answer:

```text
Yes — the extension itself is free, but it requires existing authorized access
to a specific organization Jira Cloud service/tenant. No additional purchase is
made through the extension.
```

## Firefox categories

Recommended:

```text
Other
```

Do not select a Firefox for Android category.

## Support email

```text
{{PUBLIC_OR_SUPPORT_EMAIL_APPROVED_BY_RIGHTS_HOLDER}}
```

## Support website

Option if approved:

```text
https://github.com/Ceegore/GQA_JIRA_Ticket_Helper
```

## License

Recommended if proprietary:

```text
All Rights Reserved
```

## Privacy-policy checkbox

Recommended:

```text
Yes — provide the policy in section 8 after B-004 is proven.
```

---

# 7. Notes for Reviewers — ready-to-copy template

```text
Purpose
-------
GQA Bug Reporter Helper for Jira is an internal QA helper. On an explicit user
click, it reads ticket JSON from the clipboard, validates it locally, and fills
supported fields in an already-open PERMAQA / Bug create dialog on one configured
Jira Cloud tenant. It never clicks Create/Submit.

Review environment / access
---------------------------
Test URL: {{REVIEWER_ACCESSIBLE_JIRA_URL_ON_THE_RELEASE_HOST}}
Username: {{ENTER_ONLY_IN_PRIVATE_AMO_NOTES}}
Password / login instructions: {{ENTER_ONLY_IN_PRIVATE_AMO_NOTES}}
Additional SSO/MFA instructions: {{PRIVATE_AMO_NOTES_ONLY}}

Basic test steps
----------------
1. Install the extension in Firefox desktop.
2. Sign in to the test Jira account above.
3. Open the PERMAQA project and open a new Bug creation dialog.
4. Copy this JSON as plain text to the clipboard:

   {"schema_version":1,"summary":"AMO reviewer test - do not submit","description":"This text was filled by the extension during Mozilla review.","labels":[],"flagged_impediment":false}

5. Click the extension toolbar button.
6. Click “Paste ticket”.
7. Confirm Summary and Description are populated when those controls are present.
8. Confirm the Jira Create/Submit button was NOT clicked.
9. Close/discard the Jira dialog without submitting it.

Expected safe behavior
----------------------
- Invalid JSON is rejected before Jira is changed.
- Empty/invalid/unknown fields are skipped rather than clearing Jira fields.
- Wrong project, wrong issue type, or an ambiguous dialog causes a safe refusal.
- The extension never automatically submits an issue.

Permissions
-----------
clipboardRead: needed to read the JSON that the user deliberately copied, and is
used only after the user presses the popup's Paste ticket button.

Host permission: limited to one exact HTTPS Jira Cloud tenant because the content
script must identify and populate the visible Jira Bug form. It does not run on
unrelated websites or other Jira tenants.

Data / privacy
--------------
The extension has no developer-operated backend, analytics, telemetry, storage,
Jira REST client, or credential handling. The final release candidate declares
Firefox data collection permission required:["none"] only after dynamic network
acceptance testing confirms that helper-driven field population does not transmit
ticket data before the user's own Jira submission action.

Source and build
----------------
Repository: https://github.com/Ceegore/GQA_JIRA_Ticket_Helper
Release source commit: {{FINAL_RELEASE_COMMIT_SHA}}
Runtime version: {{MANIFEST_VERSION}}

The submitted runtime consists of plain, readable, unminified JavaScript/HTML/CSS
and manifest files. There is no bundling, minification, transpilation, obfuscation,
or remote code. No third-party runtime libraries are included.

Third-party libraries
---------------------
None in the runtime package.

Trademark
---------
Jira is a trademark of Atlassian. This extension is independent and is not
affiliated with, sponsored by, or endorsed by Atlassian.
```

---

# 8. Privacy Policy — ready-to-copy draft

> **USE THIS VERSION ONLY IF B-004 PASSES AND `required:["none"]` REMAINS TRUE.**

```text
Privacy Policy — GQA Bug Reporter Helper for Jira
Last updated: 2026-08-29

GQA Bug Reporter Helper for Jira is designed as a local browser workflow helper.
It does not operate a developer-controlled backend and does not use analytics or
telemetry.

What the extension accesses
---------------------------
When the user explicitly clicks “Paste ticket”, the extension reads text from the
system clipboard. It expects that text to contain a schema-versioned JSON bug
report. The extension validates that text locally in Firefox and uses supported
values to populate an already-open Jira Bug creation form on the configured Jira
Cloud tenant.

What the extension stores
-------------------------
The extension does not store clipboard contents, ticket contents, ticket history,
credentials, cookies, or usage history in browser extension storage or on a
developer-controlled server.

What the extension transmits
----------------------------
The extension does not send clipboard or ticket data to a developer-controlled
server and contains no analytics, telemetry, or Jira REST/API client. The
extension does not automatically submit Jira issues.

Jira is a separate service. Information present in or submitted through the Jira
website is processed according to the organization’s and Atlassian’s applicable
policies. The final release of this extension is permitted to declare that it
collects/transmits no data only after release testing confirms that merely filling
the form does not trigger a helper-caused transmission of ticket data before the
user’s own Jira submission action.

Permissions
-----------
- Clipboard read access is used only to read the text the user deliberately asks
  the extension to paste.
- Website access is limited to the configured organization Jira Cloud tenant so
  the extension can locate and populate the intended Bug creation dialog.

Issue submission
----------------
The extension never clicks Jira’s Create/Submit action automatically. A human
must review the populated form and decide whether to submit it.

Contact
-------
{{SUPPORT_OR_PRIVACY_CONTACT_EMAIL}}
```

---

# 9. Permission explanations — ready for reviewer/support use

## `clipboardRead`

```text
The extension reads clipboard text only after the user explicitly presses “Paste
ticket”. The clipboard is expected to contain the JSON ticket the user intentionally
copied. The extension does not monitor clipboard changes and does not save a
clipboard history.
```

## Exact Jira host access

```text
The content script needs access to the configured Jira Cloud tenant so it can
identify the already-open PERMAQA Bug creation dialog and populate supported
fields. Access is intentionally restricted to one exact HTTPS tenant and is not
requested for all websites or all Atlassian tenants.
```

---

# 10. Suggested first AMO release notes

```text
Initial AMO release of GQA Bug Reporter Helper for Jira.

- Fills supported fields in an already-open PERMAQA Bug creation dialog from
  schema-versioned clipboard JSON.
- Uses exact, fail-closed dialog and option matching.
- Skips invalid, unavailable, unknown, or ambiguous fields instead of guessing.
- Never automatically clicks Jira Create/Submit.
- Uses no Jira REST API, credentials, analytics, telemetry, ticket history, or
  developer-operated backend.
- Restricted to one configured Jira Cloud tenant.
```

---

# 11. Recommended manifest target after all decisions

```json
{
  "manifest_version": 3,
  "name": "GQA Bug Reporter Helper for Jira",
  "version": "1.1.0",
  "description": "Internal QA helper that fills supported fields in an open Jira Bug form from user-copied JSON and never submits the issue automatically.",
  "icons": {
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "64": "icons/icon-64.png",
    "96": "icons/icon-96.png"
  },
  "permissions": [
    "clipboardRead"
  ],
  "host_permissions": [
    "https://REAL-TENANT.atlassian.net/*"
  ],
  "action": {
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "64": "icons/icon-64.png"
    },
    "default_title": "GQA Bug Reporter Helper for Jira",
    "default_popup": "popup.html"
  },
  "content_scripts": [
    {
      "matches": [
        "https://REAL-TENANT.atlassian.net/*"
      ],
      "js": [
        "config.js",
        "shared.js",
        "content.js"
      ],
      "run_at": "document_idle"
    }
  ],
  "browser_specific_settings": {
    "gecko": {
      "id": "{{PERMANENT_APPROVED_ADDON_ID}}",
      "strict_min_version": "140.0",
      "data_collection_permissions": {
        "required": [
          "none"
        ]
      }
    }
  }
}
```

---

# 12. Exact implementation task order for a weak implementation AI

## Phase 1 — runtime safety bugs

- [ ] Implement B-005 content-script import mutex.
- [ ] Add M63/manual and automated lock tests.
- [ ] Implement H-001 multi-select count limit (`20` unless approved otherwise).
- [ ] Add tests for 20/21 values and distinct skip reason.
- [ ] Set production `DEBUG = false` and enforce it in release preflight.
- [ ] Re-run all current automated tests.

## Phase 2 — AMO tooling

- [ ] Pin Node-supported `web-ext` tooling and lockfile.
- [ ] Add exact-runtime staging reusable by lint/build.
- [ ] Add `web-ext lint --warnings-as-errors` before archive creation.
- [ ] Optionally run `addons-linter` against the ZIP itself.
- [ ] Record tool versions.
- [ ] Add CI for normal tests/preflight/lint.

## Phase 3 — release identity/legal choices

- [ ] Resolve B-007 name/trademark choice.
- [ ] Resolve permanent Gecko add-on ID.
- [ ] Resolve rights holder/license.
- [ ] Resolve support email/site.
- [ ] Approve or reject public disclosure under B-008.
- [ ] If public disclosure is not approved, stop the listed-AMO path and use an approved alternate distribution model.

## Phase 4 — visual metadata

- [ ] Generate original non-Atlassian icon if desired.
- [ ] Add manifest/action icons and update runtime file list/tests/hashes.
- [ ] Scrub any AMO screenshot for confidential or third-party content.

## Phase 5 — real environment

- [ ] Configure exact release tenant.
- [ ] Capture and approve real DOM evidence.
- [ ] Complete M01–M62 plus new M57A and M63.
- [ ] Confirm no automatic Jira submission.
- [ ] Confirm data declaration with M57A.
- [ ] Complete `tests/MANUAL_TEST_REPORT_COMPLETED.md`.
- [ ] Remove pending DOM marker only after evidence approval.

## Phase 6 — reviewer access

- [ ] Provide a sanitized reviewer-accessible Jira test account/context on the release hostname.
- [ ] Verify it works from outside company VPN or provide whatever legitimate access the reviewer needs.
- [ ] Put credentials only in private AMO Notes for Reviewers.
- [ ] Test the exact reviewer steps from section 7 with that account.

## Phase 7 — final candidate

- [ ] Set final manifest version.
- [ ] Run `node --test tests/*.test.cjs`.
- [ ] Run `node tools/update-file-manifest.cjs`.
- [ ] Run `node tools/preflight.cjs --release`.
- [ ] Stage runtime.
- [ ] Run `web-ext lint --warnings-as-errors` on that exact stage.
- [ ] Build ZIP/XPI candidate.
- [ ] Validate ZIP with Add-ons Linter if available.
- [ ] Inspect archive root structure manually; `manifest.json` must be at archive root.
- [ ] Load the exact candidate with `about:debugging` and perform smoke test.
- [ ] Calculate candidate SHA-256 and record source SHA/tool versions.

## Phase 8 — AMO submission

- [ ] Log into the approved AMO developer account.
- [ ] Choose **On this site** for a listed AMO release only if B-008 is approved.
- [ ] Upload exact candidate.
- [ ] Resolve every validator error.
- [ ] Treat warnings as failures unless explicitly justified.
- [ ] Enter listing fields from section 6.
- [ ] Enter private reviewer notes from section 7 with real test access.
- [ ] Provide privacy policy from section 8 if B-004 passes unchanged.
- [ ] Submit.
- [ ] Save AMO version/submission ID and validator result.

## Phase 9 — signed artifact acceptance

- [ ] Obtain Mozilla-signed artifact.
- [ ] Install the signed artifact in Firefox Release.
- [ ] Repeat critical smoke cases.
- [ ] Record SHA-256 of signed artifact.
- [ ] Archive release evidence.
- [ ] Only then mark release complete.

---

# 13. Additions required in `RELEASE_CHECKLIST.md`

```text
## AMO/public-release gates

- [ ] Public disclosure of exact Jira hostname/project/field names/source is approved.
- [ ] Product name/trademark use is approved; Jira attribution/disclaimer is present.
- [ ] Permanent Gecko add-on ID is approved and AMO uniqueness confirmed.
- [ ] Rights holder and AMO license selection are approved.
- [ ] Support email/site are approved.
- [ ] Reviewer-accessible Jira test account/context is verified from outside the internal environment.
- [ ] Reviewer credentials are stored only in private AMO reviewer notes.
- [ ] M57A proves the final Firefox data-collection declaration.
- [ ] M63 proves a second concurrent paste is rejected.
- [ ] Labels/multi-select input count has a hard upper bound.
- [ ] Production debug logging is disabled.
- [ ] Tested Firefox minimum is declared with gecko.strict_min_version.
- [ ] `web-ext lint --warnings-as-errors` passes on the exact staged upload files.
- [ ] AMO upload validator has no unresolved errors/warnings.
- [ ] Final unsigned candidate SHA-256/source SHA/tool versions are recorded.
- [ ] Final Mozilla-signed XPI is installed and smoke-tested in Firefox Release.
- [ ] Final signed XPI SHA-256 and AMO version ID are recorded.
```

---

# 14. Additions required in automated tests/preflight

1. **No concurrent import**
2. **Multi-select bound**
3. **Release debug disabled**
4. **Minimum Firefox version**
5. **Manifest identity**
6. **Icon integrity if icons are added**
7. **AMO metadata consistency**
8. **Official linter gate**

---

# 15. Final release acceptance criteria

The release is **GO** only when all of the following are simultaneously true:

- [ ] no unresolved BLOCKER/HIGH issue in this file;
- [ ] real hostname configured;
- [ ] real DOM evidence approved;
- [ ] M01–M62 + M57A + M63 pass or have explicitly approved N/A where legitimate;
- [ ] concurrency lock and label limit implemented/tested;
- [ ] no automatic Create/Submit path;
- [ ] final data declaration proven dynamically;
- [ ] product/trademark/name decision approved;
- [ ] public disclosure approved;
- [ ] reviewer-accessible test account works;
- [ ] rights/license/support metadata complete;
- [ ] permanent add-on ID accepted/unique;
- [ ] release debug disabled;
- [ ] tested minimum Firefox version declared;
- [ ] Node tests pass fresh on final source;
- [ ] release preflight passes with no warnings;
- [ ] `web-ext lint --warnings-as-errors` passes on exact staged runtime;
- [ ] AMO validator passes;
- [ ] final ZIP contents manually inspected;
- [ ] unsigned candidate SHA-256 recorded;
- [ ] Mozilla signing succeeds;
- [ ] Mozilla-signed XPI installs in Firefox Release;
- [ ] signed-XPI critical smoke test passes;
- [ ] signed XPI SHA-256 and AMO version ID recorded;
- [ ] listing text accurately describes actual behavior and prerequisites.

Until then:

> **NO-GO — NOT AMO RELEASE READY**

---

# 16. Current-source references checked on 2026-08-29

## Mozilla / Firefox

- Add-on Policies: https://extensionworkshop.com/documentation/publish/add-on-policies/
- Add-on Policies FAQ: https://extensionworkshop.com/documentation/publish/add-on-policies-faq/
- Submitting an add-on: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
- Package your extension: https://extensionworkshop.com/documentation/publish/package-your-extension/
- Signing and distribution overview: https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
- Self-distribution: https://extensionworkshop.com/documentation/publish/self-distribution/
- Third-party library usage: https://extensionworkshop.com/documentation/publish/third-party-library-usage/
- Firefox built-in data consent: https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
- Best practices for user-data consent: https://extensionworkshop.com/documentation/develop/best-practices-for-collecting-user-data-consents/
- `web-ext` command reference: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/
- Firefox Add-on Distribution Agreement: https://extensionworkshop.com/documentation/publish/firefox-add-on-distribution-agreement/
- MDN `browser_specific_settings`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
- MDN `icons`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/icons
- MDN `action`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/action

## Atlassian trademark reference

- Atlassian Trademark Guidelines: https://www.atlassian.com/legal/trademark
- Atlassian Marketplace naming/brand guidance: https://developer.atlassian.com/platform/marketplace/atlassian-brand-guidelines-for-marketplace-partners/

---

# 17. Summary for the implementation agent

Do **not** rewrite the extension. The core safety architecture is good and deliberately small. The fastest clean route is:

1. add the import mutex;
2. cap multi-select attempts;
3. turn off release debug logging;
4. integrate official Mozilla linting;
5. settle name/ID/license/public-disclosure decisions;
6. obtain reviewer-accessible Jira test access;
7. perform the real DOM/manual/network acceptance run;
8. build, lint, validate, sign and smoke-test the exact final artifact.

The two most important newly discovered code/process gaps are **concurrent imports** and **absence of Mozilla linter validation on the exact candidate**. The largest non-code release risk is **reviewability of an internal Jira-only add-on on public AMO**, followed by **public disclosure/trademark/data-declaration correctness**.
