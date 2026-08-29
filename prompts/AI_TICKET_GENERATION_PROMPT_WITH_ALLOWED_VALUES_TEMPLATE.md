# Prompt template — JSON generation with exact Jira allowed values

Replace the placeholder arrays below with the approved/observed values from `dom/JIRA_ALLOWED_VALUES_TEMPLATE.json` before using this prompt.

---

Generate one internal GQA Jira Bug JSON object for the Firefox helper.

Return JSON only. No Markdown fences. No commentary.

Schema:

```json
{
  "schema_version": 1,
  "summary": "",
  "description": "",
  "tester": "",
  "build_version_spotted": "",
  "build_version_released": "",
  "branch": "",
  "labels": [],
  "priority": "",
  "severity": "",
  "game_mode": "",
  "affected_player": "",
  "repro_rate": "",
  "due_date": "",
  "working_hours": 0,
  "origin": "",
  "flagged_impediment": false
}
```

Allowed Jira values:

```text
priority = <INSERT EXACT VALUES>
severity = <INSERT EXACT VALUES>
game_mode = <INSERT EXACT VALUES>
affected_player = <INSERT EXACT VALUES>
repro_rate = <INSERT EXACT VALUES>
origin = <INSERT EXACT VALUES>
build_version_spotted = <INSERT EXACT VALUES OR STATE THAT FREE TEXT IS ALLOWED>
build_version_released = <INSERT EXACT VALUES OR STATE THAT FREE TEXT IS ALLOWED>
branch = <INSERT EXACT VALUES OR STATE THAT FREE TEXT IS ALLOWED>
labels = <INSERT APPROVED EXISTING LABELS IF RESTRICTED>
tester = <INSERT APPROVED DISPLAY NAMES IF NEEDED>
```

Rules:

- Never invent bug facts.
- Never invent or approximate a Jira option.
- A dropdown value must be copied exactly from its allowed list or be `""`.
- Unknown string -> `""`.
- Unknown list -> `[]`.
- `due_date` -> `YYYY-MM-DD` only or `""`.
- `working_hours` -> non-negative JSON number only when the team has supplied it.
- `flagged_impediment` -> true only when explicitly justified; otherwise false.
- Description is plaintext, not HTML.
- Output exactly one JSON object and nothing else.
