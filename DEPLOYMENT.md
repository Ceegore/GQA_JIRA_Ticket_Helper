# Deployment notes

## Development

Use Firefox `about:debugging` -> **This Firefox** -> **Load Temporary Add-on** and select `manifest.json`. A temporary add-on disappears when Firefox closes. After reloading the extension, reload the already-open Jira page so the declarative content script is injected into the new page load.

## Pre-deployment sequence

1. Configure the exact Jira Cloud hostname with `tools/configure-jira-host.ps1`.
2. Capture and approve real dialog/field/dropdown/editor evidence.
3. Complete all M01-M67 manual tests and save `tests/MANUAL_TEST_REPORT_COMPLETED.md`.
4. Remove `dom/ACTUAL_DOM_NOT_YET_CAPTURED.md` only after evidence approval.
5. Run:

```bash
npm ci
npm test
node tools/update-file-manifest.cjs
node tools/preflight.cjs --release
```

Release preflight also runs Mozilla's own add-on linter against a runtime-only staging copy, so `npm ci` must have been executed first.

6. Build the runtime-only candidate with `tools/build-runtime-package.ps1`.
7. Inspect the archive against `RUNTIME_FILE_LIST.txt`.

## Release-channel installation

The build helper creates ZIP/XPI candidates but does not sign them. Standard Firefox Release/Beta installations generally require Mozilla signing; enterprise environments should follow the company's approved self-distribution/ExtensionSettings policy and Mozilla's current signing rules. Do not bypass signing controls or assume a temporary-install workflow is deployment.

## Data handling

The runtime declares no data collection and has no network/storage capability. Development DOM/dropdown reports can still contain internal Jira structure, option names or people. Keep them inside approved company storage and exclude them from the runtime package.

## Rollback

Because the extension has no storage/backend, rollback is removal/disablement of the add-on. Existing Jira issues are not managed by the extension. Any partially filled create dialog should be manually discarded or corrected by the tester.
