# DOM evidence area

This directory contains templates, not verified internal Jira facts.

- `ACTUAL_DOM_NOT_YET_CAPTURED.md` is an intentional release blocker. Remove it only after reviewer-approved real Jira evidence exists.
- `DIALOG_GUARD_EVIDENCE_TEMPLATE.json` records the unique dialog/project/type/Create guard evidence.
- `DOM_FIELD_MAP_TEMPLATE.json` records each field's actual control and selected adapter.
- `JIRA_ALLOWED_VALUES_TEMPLATE.json` records approved exact option catalogs when useful.

Store generated reports under a local/internal `dom/actual/` directory. Reports may contain internal field, option or person names; do not publish them. After adding or removing evidence files, update `PACKAGE_INDEX.md` if they are retained in the repository and run `node tools/update-file-manifest.cjs`.

Screenshots are visual references only. They cannot prove selectors, custom-field IDs, roles, option catalogs or editability.
