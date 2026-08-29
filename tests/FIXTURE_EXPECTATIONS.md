# Automated/manual fixture expectations

Use these fixtures deliberately; a JSON file being syntactically valid does not mean every field is actionable.

| Fixture | Expected parser result | Expected Jira behavior |
|---|---|---|
| `fixtures/summary-only.json` | accept | only Summary is attempted |
| `fixtures/empty-values.json` | accept | every supplied empty/false value is skipped; defaults remain |
| `fixtures/unicode-and-html-like-text.json` | accept | Unicode and line breaks remain text; no HTML execution |
| `fixtures/wrong-types.json` | accept payload, reject individual values | every malformed field is skipped |
| `fixtures/full-ticket-template.json` | accept after placeholders are replaced | all supported fields are attempted with real exact values |
| `fixtures/duplicate-labels.json` | accept | normalized duplicate labels are attempted once; invalid items are removed |
| `fixtures/missing-schema-version.json` | reject whole payload | no tab message and no Jira change |
| `fixtures/unknown-keys.json` | accept | Summary may be filled; unknown/project/issue-type/attachment keys are ignored |
| `fixtures/near-match-dropdowns.json` | accept | values are selected only when they are unique exact options; `Single` must not select `Single player`, and ambiguous `Alex` options must be skipped |

For dropdown fixtures, replace values only when the exact option catalog of the real Jira environment is known. Do not make the runtime matcher fuzzy to force a test to pass.
