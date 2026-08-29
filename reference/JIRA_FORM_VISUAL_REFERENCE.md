# Jira form visual reference from supplied screenshots

These screenshots are included only as **visual/product-scope evidence**. They are not DOM evidence and must never be used to invent selectors, customfield IDs, roles or complete option catalogs.

## Supplied images

1. `screenshots/01_jira_bug_form_top.png`
2. `screenshots/02_jira_bug_form_middle.png`
3. `screenshots/03_jira_bug_form_bottom.png`

## Visually observed target context

The create dialog header visibly shows:

- project: `PERMAQA`
- issue type: `Bug`

The bottom action area visibly contains:

- `Weiteres Objekt erstellen`
- `Erstellen`

The extension must never click `Erstellen`.

## Fields visually observed

Top/upper form:

- Zusammenfassung
- Beschreibung area/instruction text
- Status — current visible value `Inbox`
- Zugewiesene Person — current visible value `Automatisch`
- Tester
- Build Version Spotted — marked required in screenshot
- Build Version Released
- Branch — marked required in screenshot
- Department — visible current value `Development`
- Stichwort
- Location — visible current value `Global`
- Priorität — visible current value `Medium`

Middle form:

- Severity
- Game Mode — marked required, visible current value `Single player`
- Affected Player
- Repro Rate
- Fälligkeitsdatum
- Working Hours
- Origin — marked required
- Roadmap Phase (Lead Only)
- Impact (Lead Only) with example text below

Lower form:

- Stability Risk (Lead Only)
- Commercial Need (Lead Only)
- Definition of Done (Lead Only)
- Anhang
- Verknüpfte Vorgänge
- Beschränken auf
- Flagged -> Impediment checkbox

## Intended V1 automation inferred from product requirements, not from DOM

Automate only:

- Zusammenfassung / Summary
- Beschreibung / Description
- Tester
- Build Version Spotted
- Build Version Released
- Branch
- Stichwort / Labels
- Priorität / Priority
- Severity
- Game Mode
- Affected Player
- Repro Rate
- Fälligkeitsdatum / Due Date
- Working Hours
- Origin
- Impediment true-only

Intentionally leave untouched:

- Status
- Zugewiesene Person
- Department
- Location
- all Lead-only fields
- attachments
- linked issues
- restrictions
- project
- issue type

## What screenshots CANNOT prove

Do not infer any of the following from these images:

- element IDs,
- `customfield_XXXXX` IDs,
- `aria-*` attributes,
- `data-testid` values,
- exact HTML tag/control type,
- whether a visual field is a text input vs combobox,
- dropdown option roles,
- complete allowed option lists,
- people-picker identifiers,
- build/branch option values,
- Jira rich-text editor structure,
- whether Due Date accepts ISO text directly,
- whether required markers reflect Jira validation or custom UI behavior.

Use `tools/dom-report-exporter.js` and `tools/dropdown-probe.js` against the real internal Jira instance.
