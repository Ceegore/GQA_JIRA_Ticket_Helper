# Requirements traceability matrix

The independent reviewer must verify every row against code, automated evidence and real-Jira evidence. A green unit test never substitutes for environment-specific DOM proof.

| ID | Requirement | Primary implementation | Automated evidence | Real-Jira/manual evidence |
|---|---|---|---|---|
| R01 | Firefox-only MV3 extension | `manifest.json` | preflight manifest checks | extension loads in Firefox |
| R02 | One exact Jira host only | manifest matches/host permissions | safety/package/preflight | intended and other tenant tests |
| R03 | User-triggered clipboard read | popup button handler | static review | M01/M51 |
| R04 | JSON object only | `parseClipboardTicket` | shared tests | M03/M06 |
| R05 | Maximum 100,000 UTF-8 bytes | shared/config | ASCII + Unicode boundary tests | M07/M08 |
| R06 | Mandatory exact schema version 1 | shared/popup/content | missing/wrong/type tests | M04/M05 |
| R07 | Exactly one PERMAQA Bug dialog before every field | content/config | content-contract/static review | M18/M48-M50 |
| R08 | Supported deterministic fields only | `FIELD_ORDER`, `FIELDS` | package tests | M01/M10 |
| R09 | Empty/malformed values never clear | validation/setters | shared/package review | M11-M14 |
| R10 | Field failure isolated while dialog remains valid | per-field try/catch | content review | M15 |
| R11 | Unique exact option matching only | option matcher | shared/content-contract | M26-M35 |
| R12 | No new labels | `allowCreate:false`, create-option filter | content/static review | M38/M39 |
| R13 | Impediment true-only | checkbox adapter | code review | M46/M47 |
| R14 | Plaintext only; no HTML execution | content setter | safety tests | M21/M22 |
| R15 | No Jira REST/API credentials | runtime | safety/preflight | M59 |
| R16 | No external network capability | runtime | safety/preflight | M57 |
| R17 | No ticket storage/cookies/cache | runtime | safety/preflight | M59 |
| R18 | Never auto-submit | `safeClick`, no submit/keyboard APIs | safety/preflight | M55/M56 |
| R19 | No project/issue-type switching | absent from field plan | package tests | M10/M48/M49 |
| R20 | Lead-only and unsupported fields untouched | absent from plan | package tests | M01 visual review |
| R21 | Concise popup: Paste ticket plus read-only Diagnose page | popup files | popup-behavior tests | visual/manual, M73/M74 |
| R22 | Logs omit ticket values/raw errors | popup/content logging | safety tests | M58 |
| R23 | No frameworks/runtime dependencies | repository/runtime list | inventory/preflight | N/A |
| R24 | DOM selectors evidence-based | config + `dom/` workflow | inventory/review | dialog/field reports |
| R25 | All automated and manual acceptance passes | tests/preflight/manual docs | node/preflight | completed report |
| R26 | BOM tolerated without weakening JSON | shared parser | shared tests | M09 |
| R27 | Duplicate labels normalized/de-duplicated | shared sanitizer | shared tests | M37 |
| R28 | Disabled/read-only controls/options skipped | content guards | safety/content review | M16/M17/M32 |
| R29 | Dropdown options associated with intended popup | option session logic | content-contract test | M31/M33/M34 |
| R30 | React rerenders do not reuse stale multi-label/dialog controls | control reacquisition | content-contract test | M18/M40 |
| R31 | Ambiguous controls/dialogs/options fail closed | discovery/guard/matcher | content-contract review | M30/M35/M50 |
| R32 | Accepted text is not silently trimmed by helper | text setter | content-contract test | M23 |
| R33 | Firefox no-data-collection declaration present | manifest | safety/preflight | install/review |
| R34 | Development tools never enter runtime package | manifest/runtime list/build tool | package/preflight | M60/archive inspection |
| R35 | Release requires hostname + real DOM + completed manual report | preflight release mode | preflight | release records |
| R36 | Collapsed issue-view style rows are activated by one safe click, committed by blur and verified | row activation in `content.js` | jira-layouts tests | M68-M72 |
| R37 | A control is paired with a field only when its kind is compatible and it belongs to that field's row | `controlAcceptsField`, label climb guards | jira-layouts/content-contract tests | M01 visual review |
| R38 | Every field reports its outcome and reason without exposing values | paste result `fields`, popup formatting | popup-behavior/jira-layouts tests | M58 |
