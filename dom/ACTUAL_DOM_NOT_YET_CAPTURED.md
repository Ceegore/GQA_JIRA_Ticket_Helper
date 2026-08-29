# Actual internal Jira DOM not yet captured

The package currently contains screenshots plus DOM-collection tools, but no real HTML/DOM dump from the internal Jira instance.

This is deliberate: screenshots cannot provide the required attributes, and the assistant that prepared this package did not have direct authenticated access to the internal Jira DOM.

Before release:

1. run `tools/dom-report-exporter.js` on the real PERMAQA Bug create dialog,
2. run `tools/dropdown-probe.js` for relevant dropdowns,
3. complete `DOM_FIELD_MAP_TEMPLATE.json`,
4. set any required stable selectors in `config.js`,
5. execute manual acceptance tests.

A weak implementation AI must not fill this gap by guessing selectors.
