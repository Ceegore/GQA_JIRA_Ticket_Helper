# Ticket JSON data contract

This is the authoritative clipboard contract for schema version 1.

## Payload boundary

- Clipboard input must be text containing one JSON object.
- Maximum size is **100,000 UTF-8 bytes**. This is a byte limit, not a JavaScript-character count and not an imprecise “100 KB” label.
- One leading UTF-8 BOM is tolerated because Windows-oriented tooling may introduce it.
- `schema_version` is mandatory and must be the JSON number `1`.
- A malformed payload, non-object root, missing version or wrong version rejects the whole payload before any Jira message is sent.

## Canonical shape

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

## Field semantics

| Key | JSON type | Validity rule | Action when empty/invalid |
|---|---|---|---|
| `schema_version` | number | required; exactly `1` | whole payload rejected |
| `summary` | string | nonblank | skip |
| `description` | string | nonblank | skip |
| `tester` | string | nonblank; unique exact real option | skip |
| `build_version_spotted` | string | nonblank | skip |
| `build_version_released` | string | nonblank | skip |
| `branch` | string | nonblank | skip |
| `labels` | array of strings | each item nonblank; normalized duplicates removed, first spelling retained | invalid/duplicate items removed; empty result skips field |
| `priority` | string | nonblank; unique exact option | skip |
| `severity` | string | nonblank; unique exact option | skip |
| `game_mode` | string | nonblank; unique exact option | skip |
| `affected_player` | string | nonblank; unique exact option | skip |
| `repro_rate` | string | nonblank; unique exact option | skip |
| `due_date` | string | real calendar date exactly `YYYY-MM-DD` | skip |
| `working_hours` | number | finite and `>= 0` | skip |
| `origin` | string | nonblank; unique exact option | skip |
| `flagged_impediment` | boolean | action only when exactly `true` | false/missing/wrong type does nothing |

## Exact-option normalization

Only these differences are ignored:

- leading/trailing whitespace,
- runs of whitespace,
- letter case.

No substring, similarity, translation, synonym or fallback matching is allowed. More than one visible exact match is ambiguous and must be skipped.

Examples:

- `" High "` may match Jira `High`.
- `"HIGH"` may match Jira `High`.
- `"High"` must not match `Highest`.
- `"Single"` must not match `Single player`.
- two distinct visible options both labelled `Alex` must not be resolved by guessing.

## Unknown JSON keys

Unknown keys are ignored. They must not cause import failure and must not trigger arbitrary DOM lookup. In particular, clipboard keys named `project`, `issue_type`, `attachments` or similar do not expand runtime capability because only `GQA_CONFIG.FIELD_ORDER` is executed.

## Empty values never clear Jira

The importer is not a synchronization engine. Empty, missing or invalid data means **leave Jira untouched**, never “set empty”. Text validation may inspect trimmed content to decide whether it is blank, but accepted text is inserted without silently trimming its original edge spaces.
