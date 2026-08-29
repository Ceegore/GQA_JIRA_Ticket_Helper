# Firefox / Atlaskit compatibility evidence

Review date: 2026-08-29

This file records what can be confirmed from current public primary documentation and what still requires the internal Firefox/Jira environment. Public documentation is not treated as proof of the private Jira DOM.

## Confirmed public-platform facts

| Topic | Conclusion for this package | Status |
|---|---|---|
| Firefox Manifest V3 | `manifest_version: 3` and the `action`/`content_scripts` structure are valid WebExtension concepts. | CONFIRMED |
| Gecko extension ID | Firefox MV3 signing requires an explicit `browser_specific_settings.gecko.id`; the manifest supplies one. The organization should replace it only if its deployment policy requires a different stable ID. | CONFIRMED |
| Data-collection declaration | Current Firefox metadata supports `browser_specific_settings.gecko.data_collection_permissions.required: ["none"]`; this matches the runtime's no-network/no-storage design. | CONFIRMED |
| Clipboard permission | `navigator.clipboard.readText()` in an extension page is the correct modern text-read API. The `clipboardRead` extension permission allows clipboard reads without a separate paste prompt/transient activation; this package additionally performs the read only from the user's popup-button click. | CONFIRMED |
| Active-tab query | `browser.tabs.query({active:true,currentWindow:true})` uses only `active` and `currentWindow`. MDN identifies extra `tabs`/host permission requirements for URL/title filtering, which this query does not perform. | CONFIRMED |
| Popup-to-content messaging | `browser.tabs.sendMessage(tabId, message)` is explicitly available to privileged extension scripts including popup scripts and resolves/rejects asynchronously. The popup handles rejection without exposing payload values. | CONFIRMED |
| Declarative content-script scope | Manifest `content_scripts.matches` loads scripts only into matching URLs. `all_frames` defaults to false, so this package targets the top frame. Files execute in listed order; `config.js`, then `shared.js`, then `content.js` is therefore intentional. | CONFIRMED |
| Injection timing | `run_at: "document_idle"` is a supported injection point. Jira's create dialog may appear later; the content script therefore discovers it only when the user clicks Paste rather than assuming it exists at page load. | CONFIRMED |
| Temporary reload behavior | A temporary extension reload reparses the manifest. Development instructions require reloading the Jira page after loading/reloading the add-on so there is no reliance on an already-open page having the current content script. | DOCUMENTED DEVELOPMENT RULE |
| Release signing | Normal Firefox Release/Beta installation requires Mozilla signing. The included packager creates an archive only and explicitly does not claim to sign it. | CONFIRMED |
| `execCommand("insertText")` | `execCommand()` is deprecated/non-standard and event behavior is not guaranteed. It is retained only as a bounded plaintext fallback for a proven contenteditable Description control and must pass real-Firefox/Jira retention tests before release. | NEEDS REAL JIRA |
| Atlaskit select behavior | Atlassian's design system supports both single and multiple selections and includes asynchronous/select variants. This supports treating popup rendering, rerendering and delayed options as genuine risks, but it does not prove Jira's internal selectors or control implementation. | CONFIRMED RISK, NOT DOM PROOF |

## Permission conclusion

The intended runtime needs only:

```json
"permissions": ["clipboardRead"],
"host_permissions": ["https://<exact-tenant>.atlassian.net/*"]
```

No separate `tabs` permission is justified by the current query/message use. Broad host patterns, `activeTab`, `scripting`, storage, webRequest or network-related permissions are not required and must not be added without a new product decision.

## Content Security Policy conclusion

The extension uses packaged scripts only, no inline runtime JavaScript, no dynamic code generation and no remote resources. It therefore does not need a custom relaxed extension CSP. Jira page CSP does not authorize or prohibit packaged content-script execution; Firefox injects the declared content script into the isolated extension world. Actual Jira DOM interaction still needs validation.

## Real-environment checks still mandatory

1. Load the configured package temporarily in the organization's supported Firefox version.
2. Reload the intended Jira tab after every temporary add-on load/reload.
3. Confirm the popup can read clipboard text from the button click.
4. Confirm messaging succeeds on the intended Jira host and fails safely elsewhere.
5. Execute M18, M21-M23, M26-M40, M48-M58 from `MANUAL_ACCEPTANCE_TESTS.md`.
6. Confirm Description text persists after blur and reopening, especially when `execCommand("insertText")` is used.
7. Confirm no click performed by the extension submits the form.
8. Build the runtime-only archive, inspect its contents, then use the organization's approved signing/distribution path.

## Primary sources checked

- MDN, “Interact with the clipboard”: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard
- MDN, `browser_specific_settings`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
- MDN, `tabs.query()`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/query
- MDN, `tabs.sendMessage()`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage
- MDN, `content_scripts`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts
- MDN, `Document.execCommand()`: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
- Firefox Extension Workshop, “Temporary installation in Firefox”: https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/
- MDN, “What next?” (signing/review): https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/What_next
- Atlassian Design System, Select: https://atlassian.design/components/select

## Review boundary

No public source confirms the private PERMAQA form's field IDs, header structure, portal roots, localized labels, exact options, virtualized behavior, ProseMirror variant or custom Build/Branch controls. Those remain evidence tasks, not implementation guesses.
