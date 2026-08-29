# Development tools

These files are **not runtime extension scripts**. Never add them to `manifest.json` or the runtime archive. Run browser probes on a blank form where possible and keep generated reports in approved internal systems.

## Browser evidence tools

### `dialog-guard-probe.js`

Run first with the intended PERMAQA Bug create dialog open. It exports structural evidence for visible dialogs, compact upper/header candidates and Create/Erstellen candidates. Use it to complete `dom/DIALOG_GUARD_EVIDENCE_TEMPLATE.json`; the Create element is evidence only and must never be clicked by runtime code.

### `dom-report-exporter.js`

Preferred field-structure collector. It records dialog/control/button attributes without normal input values and downloads a local JSON report. Use it to complete `dom/DOM_FIELD_MAP_TEMPLATE.json`.

### `dom-probe.js`

Quicker console-table view. It reports control structure and a boolean indicating whether a normal input is nonblank, not the value itself.

### `dropdown-probe.js`

Open exactly one dropdown/person picker manually, then run this probe. It records expanded/linked controls, `aria-controls`/`aria-owns`, popup roots, option roles/text and disabled state. Option/person text may be sensitive.

## Repository and ticket tools

### `preflight.cjs`

Development gate:

```bash
node tools/preflight.cjs
```

Checks required files, all JSON/JS syntax, manifest/permissions, runtime list, forbidden capabilities, package-index coverage, SHA hashes and automated tests. Before real-Jira validation it may pass with explicit warnings.

Release gate:

```bash
node tools/preflight.cjs --release
```

Additionally fails if the hostname placeholder, pending DOM-evidence marker or missing completed manual report remains.

### `update-file-manifest.cjs`

Regenerates `FILE_MANIFEST_SHA256.txt` for every repository file except the manifest itself and excluded generated `dist/`/`.git` areas:

```bash
node tools/update-file-manifest.cjs
```

Run after the final edit, then run preflight again. Do not hand-edit hashes.

### `validate-ticket.cjs`

Uses the same strict schema, UTF-8 byte and field-type helpers as the extension. Optional allowed catalogs perform exact-value diagnostics:

```bash
node tools/validate-ticket.cjs sample-ticket.json
node tools/validate-ticket.cjs sample-ticket.json --allowed dom/JIRA_ALLOWED_VALUES_TEMPLATE.json
```

A missing or wrong `schema_version` rejects the whole file; invalid individual fields are reported as skip candidates.

### `configure-jira-host.ps1`

Replaces exactly two hostname placeholders, validates the Atlassian hostname, verifies JSON before writing and emits UTF-8 without BOM for Windows PowerShell 5.1 compatibility:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\configure-jira-host.ps1 -HostName company.atlassian.net
```

Reload the temporary extension and Jira afterwards.

### `copy-sample-ticket.ps1`

Copies `sample-ticket.json` to the Windows clipboard:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\copy-sample-ticket.ps1
```

### `run-preflight.bat`

Windows Command Prompt wrapper for normal preflight.

### `build-runtime-package.ps1`

Runs release preflight, copies only `RUNTIME_FILE_LIST.txt` and creates runtime-only ZIP/XPI candidates under `dist/`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-runtime-package.ps1
```

It does not sign or approve the extension.
