# Changelog

## 0.4.0-behaviour-verified-pre-real-jira-validation

- Added executable jsdom behaviour suites that drive the real content script and the real popup instead of only pattern-matching their source.
- Fixed a dialog-guard defect: an open issue-type picker offering "Bug" could satisfy the guard on a Story form, so the helper could write into the wrong issue type. Offered options are no longer accepted as evidence of the current project or issue type.
- Fixed silent value loss in multi-value fields: an open dropdown rendered inside the field row was read as the field's current value, so later labels were skipped while the run still reported success.
- Fixed false "filled" reporting for options that `safeClick()` correctly refuses, such as submit-capable or forbidden-action options.
- Added Unicode NFC normalization to text matching so decomposed German field names and option values still match the configured composed aliases and the create-new-option guard.
- Reported partly filled multi-value fields separately from filled fields so missing labels are visible to the tester.
- Separated clipboard failures from unreachable-content-script failures in the popup so each failure names its own fix.
- Hardened the visibility check so an unresolved computed opacity is not read as fully transparent.
- Added the official Mozilla add-on linter to preflight, executed against a runtime-only staging copy.
- Pinned dev tooling with a committed lockfile and made CI install dependencies, run the linter and run the full suite.

## 0.3.0-review-hardened-pre-real-jira-validation

- Completed repository-wide acceptance audit and file-by-file review.
- Hardened dialog recognition to require exactly one matching dialog with exact compact header evidence and Create presence.
- Revalidated the dialog before every field and added safe stop/feedback when Jira replaces or closes it.
- Bound dropdown matching to `aria-controls`/`aria-owns` or one uniquely newly opened popup instead of all globally visible options.
- Rejected duplicate exact options, disabled controls/options and submit-capable click targets.
- Reacquired multi-label controls after React rerenders and de-duplicated normalized labels.
- Restricted rich-text fallback to proven contenteditable elements and preserved accepted text without helper trimming.
- Made `schema_version: 1` mandatory and defined the clipboard limit as 100,000 UTF-8 bytes with BOM tolerance.
- Added Firefox no-data-collection manifest declaration and sanitized runtime error logging.
- Expanded automated coverage from 24 to 40 tests plus stronger normal/release preflight checks.
- Added dialog-guard evidence template/probe, richer dropdown probe, adversarial fixtures, fixture expectations and SHA-manifest updater.
- Added completed review report, requirements verdict, Firefox compatibility evidence and full file audit.

## 0.2.0-pre-real-jira-validation

- Added exhaustive independent review prompt covering every repository file.
- Added mandatory helper-material mining pass to the review workflow.
- Added complete phased project plan and traceability/security/schema documentation.
- Added supplied Jira screenshots and visual-reference notes.
- Added DOM field-map and Jira allowed-value templates.
- Added sanitized DOM and dropdown report exporters.
- Added preflight, JSON validator, Jira-host configurator and Windows clipboard helper.
- Added package/static safety tests and richer manual/phase acceptance templates.
- Added AI JSON-generation prompt templates.
- Added runtime-only deployment/package helper and runtime file list.

## 0.1.0

- Initial Firefox extension skeleton, implementation prompt, README, DOM probe and base unit/safety tests.
