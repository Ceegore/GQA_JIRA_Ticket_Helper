/*
 * GQA JIRA bug reporter helper - configuration
 *
 * IMPORTANT:
 * 1. Replace YOUR-COMPANY in manifest.json with the real Atlassian hostname.
 * 2. Do not add external URLs, analytics, APIs, or storage.
 * 3. If Jira changes its DOM, prefer adding one evidence-backed stable selector
 *    below instead of changing the generic filling engine.
 */

const GQA_FIELD_ORDER = Object.freeze([
  "summary",
  "description",
  "tester",
  "build_version_spotted",
  "build_version_released",
  "branch",
  "labels",
  "priority",
  "severity",
  "game_mode",
  "affected_player",
  "repro_rate",
  "due_date",
  "working_hours",
  "origin",
  "flagged_impediment"
]);

globalThis.GQA_CONFIG = Object.freeze({
  PRODUCT_NAME: "GQA Bug Reporter Helper for Jira",
  SCHEMA_VERSION: 1,
  MAX_CLIPBOARD_BYTES: 100000,
  MAX_MULTI_SELECT_VALUES: 20,
  DEBUG: false,
  FIELD_ORDER: GQA_FIELD_ORDER,

  // Hard safety guard. Optional selectors remain null until real DOM evidence
  // proves a stable value. Generic fallback requires exact compact tokens in
  // the upper part of exactly one visible dialog plus a Create button.
  EXPECTED_PROJECT_TEXT: "PERMAQA",
  EXPECTED_ISSUE_TYPE_TEXT: "Bug",
  DIALOG_SELECTOR: null,
  PROJECT_GUARD_SELECTOR: null,
  ISSUE_TYPE_GUARD_SELECTOR: null,
  CREATE_BUTTON_SELECTOR: null,
  DIALOG_GUARD_TOP_PX: 240,

  // Used only to recognize a create-issue dialog. These buttons are NEVER clicked.
  CREATE_BUTTON_TEXTS: ["Erstellen", "Create"],

  // Any call to safeClick() refuses these exact action texts. safeClick() also
  // refuses submit/image inputs and form buttons whose type is absent/submit.
  FORBIDDEN_CLICK_TEXTS: [
    "Erstellen",
    "Create",
    "Submit",
    "Save",
    "Speichern"
  ],

  // Keep waits bounded. Failure means "skip field", not "retry forever".
  WAIT_STEP_MS: 50,
  WAIT_TIMEOUT_MS: 2000,
  // Pickers that search on the server (people, labels, versions) answer well
  // after a click-open; typing then waits for the filtered list.
  OPTION_WAIT_TIMEOUT_MS: 3000,
  // Issue-view style rows mount their control after a click; the description
  // editor is loaded on demand and is the slowest of them.
  ACTIVATION_WAIT_MS: 3000,
  // Time given to React to commit an edit after the control is blurred.
  SETTLE_MS: 150,
  BETWEEN_FIELDS_MS: 80,

  // Words that may follow (or precede) a field name in a placeholder
  // sentence, such as "Beschreibung hinzufügen ..." or "Add a description".
  // A label is accepted through a placeholder only with one of these verbs,
  // never through arbitrary prefix matching.
  PLACEHOLDER_VERBS: [
    "hinzufügen",
    "eingeben",
    "auswählen",
    "wählen",
    "add",
    "enter",
    "select",
    "choose",
    "type"
  ],

  // Optional exact selectors discovered with tools/dom-report-exporter.js.
  // Leave null until a stable selector is known. The generic engine will try
  // accessible names, labels, aria-labelledby and nearby controls first.
  //
  // Example after DOM inspection:
  // selector: '#customfield_12345'
  // or selector: '[data-testid="some-stable-testid"] input'
  FIELDS: Object.freeze({
    summary: Object.freeze({
      aliases: ["Zusammenfassung", "Summary"],
      type: "text",
      selector: null
    }),
    description: Object.freeze({
      aliases: ["Beschreibung", "Description"],
      type: "text",
      selector: null
    }),
    tester: Object.freeze({
      aliases: ["Tester"],
      type: "single-select",
      selector: null
    }),
    build_version_spotted: Object.freeze({
      aliases: ["Build Version Spotted"],
      type: "auto",
      selector: null
    }),
    build_version_released: Object.freeze({
      aliases: ["Build Version Released"],
      type: "auto",
      selector: null
    }),
    branch: Object.freeze({
      aliases: ["Branch"],
      type: "auto",
      selector: null
    }),
    labels: Object.freeze({
      aliases: ["Stichwort", "Labels", "Label"],
      type: "multi-select",
      selector: null,
      allowCreate: false
    }),
    priority: Object.freeze({
      aliases: ["Priorität", "Priority"],
      type: "single-select",
      selector: null
    }),
    severity: Object.freeze({
      aliases: ["Severity"],
      type: "single-select",
      selector: null
    }),
    game_mode: Object.freeze({
      aliases: ["Game Mode"],
      type: "single-select",
      selector: null
    }),
    affected_player: Object.freeze({
      aliases: ["Affected Player"],
      type: "single-select",
      selector: null
    }),
    repro_rate: Object.freeze({
      aliases: ["Repro Rate"],
      type: "single-select",
      selector: null
    }),
    due_date: Object.freeze({
      aliases: ["Fälligkeitsdatum", "Due date", "Due Date"],
      type: "date",
      selector: null
    }),
    working_hours: Object.freeze({
      aliases: ["Working Hours"],
      type: "number",
      selector: null
    }),
    origin: Object.freeze({
      aliases: ["Origin"],
      type: "single-select",
      selector: null
    }),
    flagged_impediment: Object.freeze({
      aliases: ["Impediment", "Flagged"],
      type: "checkbox-true-only",
      selector: null
    })
  })
});
