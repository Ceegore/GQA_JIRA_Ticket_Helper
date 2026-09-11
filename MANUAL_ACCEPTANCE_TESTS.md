# Mandatory real-Jira acceptance tests

Run against a non-destructive test context in the real internal Jira create form. Do not click Create as part of extension automation testing; submission remains a separate human decision. Record actual result, Firefox version, Jira date/build context and evidence in a copy saved as `tests/MANUAL_TEST_REPORT_COMPLETED.md`.

For every row, **PASS** means the exact expected behavior occurred. **FAIL** means release stops. Use **N/A** only when the control truly does not exist in the PERMAQA Bug form and record reviewer approval.

## A. Clipboard and schema boundary

| ID | Exact setup/input | Expected result | A failure indicates |
|---|---|---|---|
| M01 | Blank valid PERMAQA Bug dialog; real-value-completed `full-ticket-template.json` | Every supported, present, valid field fills; untouched fields remain unchanged | adapter/field-map defect |
| M02 | `summary-only.json` | Only Summary changes | field-plan or empty-value defect |
| M03 | Clipboard `{bad` | Popup rejects; no Jira field changes | parse-boundary defect |
| M04 | Clipboard `{}` | Missing schema rejected; no tab message/Jira change | schema strictness regression |
| M05 | `{"schema_version":2}` and `{"schema_version":"1"}` | Both rejected before Jira change | version/type regression |
| M06 | Clipboard `[]` | Rejected as non-object | root-type regression |
| M07 | Valid schema JSON of exactly 100,000 UTF-8 bytes, then same payload plus one ASCII byte | boundary payload accepted; larger payload rejected | byte-limit off-by-one |
| M08 | Valid multibyte Unicode payload immediately below/above 100,000 UTF-8 bytes | decision follows bytes, not JS character count | byte-count regression |
| M09 | One leading BOM before valid JSON | Accepted | Windows clipboard compatibility regression |
| M10 | `unknown-keys.json` | Summary may fill; unknown/project/issue-type/attachment keys do nothing | arbitrary-key/scope defect |

## B. Non-destructive skip and rerender behavior

| ID | Exact setup/input | Expected result | A failure indicates |
|---|---|---|---|
| M11 | Existing Jira value; JSON empty string for that field | Existing value remains | destructive empty handling |
| M12 | Existing Jira value; JSON `null` | Existing value remains | type/clear defect |
| M13 | Existing Jira value; wrong JSON type | Existing value remains | per-field validation defect |
| M14 | Jira default present; key absent | Default remains | synchronization/clearing defect |
| M15 | Temporarily configure one middle field selector to an unfindable selector; later field valid | Broken field skips; later field still attempted | failure isolation defect |
| M16 | Present disabled field with valid value | Disabled field remains unchanged | disabled-state defect |
| M17 | Present read-only field with valid value | Read-only field remains unchanged | read-only-state defect |
| M18 | Close the dialog or navigate so the guard fails during a deliberately slowed run | Remaining fields skip; popup says processing stopped safely; no other dialog changes | stale-dialog/wrong-form defect |

## C. Text/editor safety and preservation

| ID | Exact setup/input | Expected result | A failure indicates |
|---|---|---|---|
| M19 | Multiline Description fixture | Line breaks retained adequately after blur/reopen | editor adapter defect |
| M20 | Umlauts, ß, Japanese and emoji | Text preserved | encoding defect |
| M21 | `<script>alert('x')</script>` | Visible plaintext only; nothing executes | BLOCKER HTML injection |
| M22 | `<img src=x onerror=alert(1)>` | Visible plaintext only; no request/execution | BLOCKER HTML injection/network |
| M23 | Summary/Description with intentional leading/trailing spaces around nonblank text | Accepted text is not silently trimmed by helper; Jira's own normalization may be noted separately | helper mutation defect |
| M24 | Identify a visible `role=textbox` wrapper that is not itself contenteditable; target it in a controlled test | Helper skips it rather than replacing wrapper DOM | destructive wrapper handling |
| M25 | Paste same fixture twice | Second run remains usable and unrelated values are not cleared | stale-control/idempotence defect |

## D. Dropdown/person-picker exactness

Repeat applicable rows for every supported select/person field.

| ID | Exact setup/input | Expected result | A failure indicates |
|---|---|---|---|
| M26 | One enabled exact existing option | Selected | base adapter defect |
| M27 | Unknown option | Field/query unchanged after failed attempt | destructive unknown handling |
| M28 | Near match (`High` where only `Highest`; `Single` where only `Single player`) | No option selected | forbidden fuzzy/substring match |
| M29 | Desired option already selected | Remains selected without destructive toggle | selected-state defect |
| M30 | Two visible enabled options with the same exact leaf/display text, where testable | Skip as ambiguous | guessing/first-match defect |
| M31 | Leave an unrelated listbox open with the same option text, then activate target control | Only target-linked/new popup may be used; unrelated option never clicked | global-option misassociation |
| M32 | Disabled exact option | Not clicked/selected | disabled-option defect |
| M33 | Async control whose options take longer than configured timeout, where reproducible | Safe skip and restored query; timing evidence recorded before any timeout change | unbounded wait or stale query defect |
| M34 | Searchable/virtualized list where exact option appears only after typing | Exact option selected only within target popup session | search-session defect |
| M35 | Person picker with same primary display name but different secondary identities | Skip unless one unique exact leaf match remains | wrong-person risk |

## E. Labels

| ID | Exact setup/input | Expected result | A failure indicates |
|---|---|---|---|
| M36 | Two distinct existing labels | Both selected sequentially | multi-select defect |
| M37 | `duplicate-labels.json` with an existing `crash` label | `crash` attempted once despite case/space duplicates | de-duplication defect |
| M38 | Unknown label with create-new UI available | Unknown not created and create action not clicked | scope/safety defect |
| M39 | Existing + unknown + later existing label | Existing labels before/after unknown can be selected; unknown skipped | isolation defect |
| M40 | Observe React replacing the label control after first selection | Later labels still work because control is reacquired | stale-control defect |

## F. Dates, numbers and true-only checkbox

| ID | Exact setup/input | Expected result | A failure indicates |
|---|---|---|---|
| M41 | Real valid `YYYY-MM-DD` date | Accepted only if current Jira control supports documented format | date adapter/evidence gap |
| M42 | Impossible/wrong-format dates (`2026-02-29`, `31.12.2026`) | Unchanged | date validation defect |
| M43 | `working_hours: 0` | Accepted if field present | zero handling defect |
| M44 | Positive decimal such as `1.5` | Accepted if field present | number adapter defect |
| M45 | Negative, string and non-finite equivalent inputs | Unchanged | number validation defect |
| M46 | `flagged_impediment:true`, initially unchecked | Checked | checkbox adapter defect |
| M47 | `flagged_impediment:false`, initially checked | Remains checked | destructive false handling |

## G. Dialog, host and Firefox lifecycle

| ID | Exact setup/input | Expected result | A failure indicates |
|---|---|---|---|
| M48 | PERMAQA Story create dialog | No field changes | dialog guard defect |
| M49 | Different-project Bug create dialog | No field changes | dialog guard defect |
| M50 | Two DOM-visible dialogs that both appear to satisfy the guard, where reproducible | Fail closed; no changes | ambiguous-dialog defect |
| M51 | Normal non-Jira page | Popup cannot reach helper; no page change | host/message scope defect |
| M52 | Dialog scrolled through top/middle/bottom | Applicable controls still discovered | visibility/discovery defect |
| M53 | Jira already open; reload temporary extension but do not reload page | Helper is unavailable; after Jira page reload it works | expected content-script lifecycle misunderstood if opposite |
| M54 | Test both observed German/English labels/actions where available | Exact configured aliases work; unsupported localization is documented rather than guessed | alias/evidence gap |

## H. Security and feedback

| ID | Exact setup/input | Expected result | A failure indicates |
|---|---|---|---|
| M55 | Watch Create/Erstellen throughout all tests | Never clicked automatically | **BLOCKER** auto-submit path |
| M56 | Inspect runtime behavior/source for Enter/keyboard synthesis | None exists | **BLOCKER/HIGH** implicit-submit risk |
| M57 | Firefox Network panel during paste | No extension-originated external request | **BLOCKER** data-leak capability |
| M57A | Firefox Network recording before, during, and 10s after paste | No helper-triggered requests containing ticket data before manual submit | **BLOCKER** data-collection reclassification required |
| M58 | Browser console with sensitive-looking fixture text | Logs contain field keys/generic statuses only, not values/raw errors | data-leak defect |
| M59 | Source/static test review | No credentials, REST endpoints, storage/cookie/cache APIs | forbidden capability |
| M60 | Inspect manifest-loaded files | No `tools/`, `tests/`, `dom/`, `reference/`, `review/`, `prompts/` file loaded | packaging defect |
| M61 | Force dialog loss after some fields | Popup reports filled/skipped counts plus safe stop | insufficient operator feedback |
| M62 | Inspect configured host in manifest and try another Atlassian tenant | Only exact company tenant has content-script access | host-scope defect |
| M63 | Start slow paste, close/reopen popup, click Paste again | Second attempt rejected with concurrency message; first finishes safely | concurrency/mutex defect |
| M64 | PERMAQA **Story** dialog with the issue-type picker open so the list shows "Bug" | Paste is refused; no field changes | **BLOCKER** wrong-issue-type guard defect |
| M65 | Labels field where Jira keeps the option menu open between selections; paste three existing labels | All three labels are applied | silent multi-value loss |
| M66 | Paste two labels where only one exists in Jira | Popup reports the field as partly filled, not filled | dishonest success reporting |
| M67 | Deny or empty the clipboard, then click Paste | Popup names a clipboard problem, not an unreachable-page problem | misleading operator feedback |

## I. Issue-view style dialog and diagnosis

Applicable when the create dialog shows rows as icon + field name (collapsed) with "Zusammenfassung" as a heading placeholder.

| ID | Exact setup/input | Expected result | A failure indicates |
|---|---|---|---|
| M68 | Blank collapsed Summary heading; `summary-only.json` | Summary row opens, receives the text and shows it after the helper finishes; nothing else changes | inline-edit activation/commit defect |
| M69 | Collapsed Description placeholder sentence; multiline description | Editor opens, text lands as plain paragraphs, no markup | editor activation defect |
| M70 | Collapsed select row (e.g. Severity) with an exact existing option | Row opens, option chosen, row collapses showing the value | select activation defect |
| M71 | Collapsed select row with a near match only | Row left unchanged; popup lists the field under "Not applied" | forbidden fuzzy match |
| M72 | Row that discards its edit on blur, if any exists | Popup reports "value was not kept after editing"; nothing else changes | dishonest success reporting |
| M73 | Click **Diagnose page** with the dialog open | Report lists every configured field with label/control structure; no field value appears; no row opens; Create never clicked | diagnosis side effect or value leak |
| M74 | Click **Diagnose page** on a Story dialog | Report says no unique PERMAQA Bug dialog and shows which guard check failed | guard feedback defect |

## Release criterion

All applicable tests must PASS, `node tools/preflight.cjs --release` must pass, and the completed report must be reviewed. Any Create/submit, network, credential, storage, wrong-dialog or wrong-person behavior blocks release immediately.

