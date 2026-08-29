"use strict";

/*
 * Executable behaviour tests.
 *
 * The other suites assert source-level contracts, which cannot prove that the
 * adapter actually refuses a Story dialog or actually applies every label.
 * These tests load the real runtime files into a jsdom document and drive them
 * through the exact message the popup sends.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

let harness = null;
let loadError = null;
try {
  harness = require("./helpers/dom-harness.cjs");
} catch (error) {
  loadError = error;
}

if (!harness) {
  test("DOM behaviour suite requires jsdom (run npm ci first)", (t) => {
    t.skip(`jsdom unavailable: ${loadError?.message}`);
  });
  return;
}

const { createHarness, dialog, inputRow } = harness;

const ROW = 'data-rect=\'{"top":100,"height":40,"width":600}\'';
const LABEL = 'data-rect=\'{"top":100,"height":18,"width":200}\'';
const CONTROL = 'data-rect=\'{"top":120,"height":24,"width":300}\'';

/** A react-select style combobox whose menu lives inside the field row. */
function combobox(label, id, options, { openByDefault = true } = {}) {
  const menuStyle = openByDefault ? "" : 'style="display:none"';
  return `
    <div class="row" ${ROW}>
      <label id="${id}-lbl" ${LABEL}>${label}</label>
      <div class="chips" id="${id}-chips" data-rect='{"top":110,"height":18,"width":300}'></div>
      <input id="${id}" role="combobox" aria-labelledby="${id}-lbl"
             aria-controls="${id}-list" aria-expanded="false" ${CONTROL}>
      <div id="${id}-list" role="listbox" ${menuStyle} data-rect='{"top":300,"height":100,"width":300}'>
        ${options
          .map(
            (option, index) =>
              `<div role="option" id="${id}-o${index}" data-rect='{"top":${300 + index * 20},"height":20,"width":300}'>${option}</div>`
          )
          .join("")}
      </div>
    </div>`;
}

/**
 * Wires the widget so selecting an option behaves like Jira: the value is
 * shown, the chosen option leaves the list and (for multi value fields) the
 * menu deliberately stays open, which is where silent value loss used to occur.
 */
function wireCombobox(window, id, { multi = false, closeOnSelect = !multi } = {}) {
  const doc = window.document;
  const input = doc.getElementById(id);
  const list = doc.getElementById(`${id}-list`);
  const chips = doc.getElementById(`${id}-chips`);

  input.addEventListener("click", () => {
    list.style.display = "block";
    input.setAttribute("aria-expanded", "true");
  });

  for (const option of [...list.querySelectorAll('[role="option"]')]) {
    option.addEventListener("click", () => {
      const text = option.textContent.trim();
      if (multi) {
        const chip = doc.createElement("span");
        chip.className = "chip";
        chip.setAttribute("data-rect", '{"top":110,"height":18,"width":80}');
        chip.textContent = text;
        chips.appendChild(chip);
        option.remove();
      } else {
        input.value = text;
      }
      if (closeOnSelect) {
        list.style.display = "none";
        input.setAttribute("aria-expanded", "false");
      }
    });
  }
}

function optionClicks(h) {
  return h.clicks.filter(
    (node) => typeof node.getAttribute === "function" && node.getAttribute("role") === "option"
  );
}

function chipTexts(h, id) {
  return h.queryAll(`#${id}-chips .chip`).map((chip) => chip.textContent);
}

const REFUSED = "No unique open PERMAQA Bug creation dialog found. Nothing was changed.";

// ---------------------------------------------------------------------------
// Dialog guard
// ---------------------------------------------------------------------------

test("fills a supported field in a single valid PERMAQA Bug dialog", async () => {
  const h = createHarness(dialog(inputRow("Zusammenfassung", { id: "summary" })));
  const result = await h.paste({ schema_version: 1, summary: "Crash on level load" });

  assert.equal(result.ok, true);
  assert.equal(result.filled, 1);
  assert.equal(h.query("#summary").value, "Crash on level load");
});

test("refuses a dialog whose project token does not match exactly", async () => {
  for (const project of ["OTHERPROJ", "PERMAQA-Sandbox", "PERMAQA Team"]) {
    const h = createHarness(
      dialog(inputRow("Zusammenfassung", { id: "summary" }), { project })
    );
    const result = await h.paste({ schema_version: 1, summary: "must not land" });

    assert.deepEqual(result, { ok: false, error: REFUSED }, `project ${project}`);
    assert.equal(h.query("#summary").value, "");
  }
});

test("refuses a Story dialog even while its issue-type list offers Bug", async () => {
  // Regression: an open issue-type picker used to satisfy the Bug guard, which
  // let the helper write into a Story form.
  const h = createHarness(`
    <div role="dialog" data-rect='{"top":0,"height":600,"width":700}'>
      <div class="hdr" data-rect='{"top":4,"height":24,"width":300}'>
        <span data-rect='{"top":4,"height":20,"width":120}'>PERMAQA</span>
        <span data-rect='{"top":4,"height":20,"width":120}'>Story</span>
      </div>
      <div role="listbox" data-rect='{"top":30,"height":80,"width":200}'>
        <div role="option" data-rect='{"top":30,"height":20,"width":200}'>Story</div>
        <div role="option" data-rect='{"top":50,"height":20,"width":200}'>Bug</div>
      </div>
      ${inputRow("Zusammenfassung", { id: "summary" })}
      <button type="button" data-rect='{"top":400,"height":32,"width":120}'>Erstellen</button>
    </div>`);

  const result = await h.paste({ schema_version: 1, summary: "must not land" });

  assert.deepEqual(result, { ok: false, error: REFUSED });
  assert.equal(h.query("#summary").value, "");
});

test("refuses when a guard token only appears below the dialog header area", async () => {
  const h = createHarness(`
    <div role="dialog" data-rect='{"top":0,"height":600,"width":700}'>
      <div class="hdr" data-rect='{"top":4,"height":24,"width":300}'>
        <span data-rect='{"top":4,"height":20,"width":120}'>PERMAQA</span>
      </div>
      <span data-rect='{"top":500,"height":20,"width":120}'>Bug</span>
      ${inputRow("Zusammenfassung", { id: "summary" })}
      <button type="button" data-rect='{"top":400,"height":32,"width":120}'>Erstellen</button>
    </div>`);

  const result = await h.paste({ schema_version: 1, summary: "must not land" });
  assert.deepEqual(result, { ok: false, error: REFUSED });
});

test("refuses when two matching dialogs are open", async () => {
  const h = createHarness(
    dialog(inputRow("Zusammenfassung", { id: "s1" })) +
      dialog(inputRow("Zusammenfassung", { id: "s2" }))
  );
  const result = await h.paste({ schema_version: 1, summary: "must not land" });

  assert.deepEqual(result, { ok: false, error: REFUSED });
  assert.equal(h.query("#s1").value, "");
  assert.equal(h.query("#s2").value, "");
});

test("refuses a dialog without a Create/Erstellen button", async () => {
  const h = createHarness(`
    <div role="dialog" data-rect='{"top":0,"height":600,"width":700}'>
      <div class="hdr" data-rect='{"top":4,"height":24,"width":300}'>
        <span data-rect='{"top":4,"height":20,"width":120}'>PERMAQA</span>
        <span data-rect='{"top":4,"height":20,"width":120}'>Bug</span>
      </div>
      ${inputRow("Zusammenfassung", { id: "summary" })}
    </div>`);

  const result = await h.paste({ schema_version: 1, summary: "must not land" });
  assert.deepEqual(result, { ok: false, error: REFUSED });
});

test("nested dialogs are ambiguous and refused", async () => {
  const h = createHarness(`
    <div role="dialog" data-rect='{"top":0,"height":600,"width":700}'>
      <div class="hdr" data-rect='{"top":4,"height":24,"width":300}'>
        <span data-rect='{"top":4,"height":20,"width":120}'>PERMAQA</span>
        <span data-rect='{"top":4,"height":20,"width":120}'>Bug</span>
      </div>
      ${dialog(inputRow("Zusammenfassung", { id: "inner" }))}
      <button type="button" data-rect='{"top":400,"height":32,"width":120}'>Erstellen</button>
    </div>`);

  const result = await h.paste({ schema_version: 1, summary: "must not land" });

  assert.deepEqual(result, { ok: false, error: REFUSED });
  assert.equal(h.query("#inner").value, "");
});

test("a hidden dialog is not a usable dialog", async () => {
  const h = createHarness(
    `<div style="display:none">${dialog(inputRow("Zusammenfassung", { id: "summary" }))}</div>`
  );

  const result = await h.paste({ schema_version: 1, summary: "must not land" });

  assert.deepEqual(result, { ok: false, error: REFUSED });
});

test("a control that can only be opened by a submit-capable click stays untouched", async () => {
  // Safety is chosen over function here: a typeless button inside a form can
  // submit, so the field is skipped rather than opened.
  const h = createHarness(`
    <div role="dialog" data-rect='{"top":0,"height":600,"width":700}'>
      <div class="hdr" data-rect='{"top":4,"height":24,"width":300}'>
        <span data-rect='{"top":4,"height":20,"width":120}'>PERMAQA</span>
        <span data-rect='{"top":4,"height":20,"width":120}'>Bug</span>
      </div>
      <form>
        <div class="row" ${ROW}>
          <label id="sev-lbl" ${LABEL}>Severity</label>
          <button aria-haspopup="listbox" aria-labelledby="sev-lbl" ${CONTROL}>Choose</button>
        </div>
      </form>
      <button type="button" data-rect='{"top":400,"height":32,"width":120}'>Erstellen</button>
    </div>`);

  let submitted = false;
  h.query("form").addEventListener("submit", () => {
    submitted = true;
  });

  const result = await h.paste({ schema_version: 1, severity: "Major" });

  assert.equal(submitted, false);
  assert.equal(result.filled, 0);
  assert.equal(h.clicks.length, 0);
});

test("never touches controls outside the guarded dialog", async () => {
  const h = createHarness(`
    <label for="outside" data-rect='{"top":690,"height":18,"width":200}'>Zusammenfassung</label>
    <input id="outside" data-rect='{"top":700,"height":24,"width":300}'>
    ${dialog(inputRow("Branch", { id: "branch" }))}`);

  const result = await h.paste({ schema_version: 1, summary: "leak", branch: "release/1.2" });

  assert.equal(h.query("#outside").value, "");
  assert.equal(h.query("#branch").value, "release/1.2");
  assert.equal(result.filled, 1);
});

// ---------------------------------------------------------------------------
// Never submit
// ---------------------------------------------------------------------------

test("a full paste never clicks Create/Erstellen and never submits a form", async () => {
  const h = createHarness(`
    <div role="dialog" data-rect='{"top":0,"height":600,"width":700}'>
      <div class="hdr" data-rect='{"top":4,"height":24,"width":300}'>
        <span data-rect='{"top":4,"height":20,"width":120}'>PERMAQA</span>
        <span data-rect='{"top":4,"height":20,"width":120}'>Bug</span>
      </div>
      <form>
        ${inputRow("Zusammenfassung", { id: "summary" })}
        ${combobox("Priorität", "prio", ["Hoch", "Niedrig"])}
      </form>
      <button type="button" data-rect='{"top":400,"height":32,"width":120}'>Erstellen</button>
      <button type="submit" data-rect='{"top":400,"height":32,"width":120}'>Create</button>
    </div>`);
  wireCombobox(h.window, "prio");

  let submitted = false;
  h.query("form").addEventListener("submit", () => {
    submitted = true;
  });

  await h.paste({ schema_version: 1, summary: "x", priority: "Hoch" });

  assert.equal(submitted, false);
  const actionClicks = h.clicks.filter((node) =>
    ["Erstellen", "Create"].includes((node.textContent || "").trim())
  );
  assert.deepEqual(actionClicks, []);
});

test("an option rendered as a submit button is refused and reported as skipped", async () => {
  const h = createHarness(`
    <div role="dialog" data-rect='{"top":0,"height":600,"width":700}'>
      <div class="hdr" data-rect='{"top":4,"height":24,"width":300}'>
        <span data-rect='{"top":4,"height":20,"width":120}'>PERMAQA</span>
        <span data-rect='{"top":4,"height":20,"width":120}'>Bug</span>
      </div>
      <form>
        <div class="row" ${ROW}>
          <label id="sev-lbl" ${LABEL}>Severity</label>
          <input id="sev" role="combobox" aria-labelledby="sev-lbl" aria-controls="sev-list" ${CONTROL}>
          <div id="sev-list" role="listbox" data-rect='{"top":300,"height":40,"width":300}'>
            <button type="submit" role="option" data-rect='{"top":300,"height":20,"width":300}'>Major</button>
          </div>
        </div>
      </form>
      <button type="button" data-rect='{"top":400,"height":32,"width":120}'>Erstellen</button>
    </div>`);

  let submitted = false;
  h.query("form").addEventListener("submit", () => {
    submitted = true;
  });

  const result = await h.paste({ schema_version: 1, severity: "Major" });

  assert.equal(submitted, false);
  assert.equal(optionClicks(h).length, 0);
  // Regression: this used to be reported as filled because the open menu text
  // was mistaken for the field's current value.
  assert.equal(result.filled, 0);
});

test("an option whose text is a forbidden action word is never clicked", async () => {
  const h = createHarness(dialog(combobox("Origin", "ori", ["Speichern"])));
  wireCombobox(h.window, "ori");

  const result = await h.paste({ schema_version: 1, origin: "Speichern" });

  assert.equal(optionClicks(h).length, 0);
  assert.equal(result.filled, 0);
});

// ---------------------------------------------------------------------------
// Dropdown matching
// ---------------------------------------------------------------------------

test("selects only an exactly matching option", async () => {
  const h = createHarness(dialog(combobox("Priorität", "prio", ["Hoch", "Höchste", "Niedrig"])));
  wireCombobox(h.window, "prio");

  const result = await h.paste({ schema_version: 1, priority: "Hoch" });

  assert.equal(result.filled, 1);
  assert.equal(h.query("#prio").value, "Hoch");
});

test("a near match is never substituted", async () => {
  const h = createHarness(dialog(combobox("Priorität", "prio", ["Höchste", "Niedrig"])));
  wireCombobox(h.window, "prio");

  const result = await h.paste({ schema_version: 1, priority: "Hoch" });

  assert.equal(result.filled, 0);
  assert.equal(h.query("#prio").value, "");
  assert.equal(optionClicks(h).length, 0);
});

test("duplicate exact options are ambiguous and skipped", async () => {
  const h = createHarness(dialog(combobox("Priorität", "prio", ["Hoch", "Hoch"])));
  wireCombobox(h.window, "prio");

  const result = await h.paste({ schema_version: 1, priority: "Hoch" });

  assert.equal(result.filled, 0);
  assert.equal(optionClicks(h).length, 0);
});

test("two unrelated open popups are ambiguous and nothing is chosen", async () => {
  const h = createHarness(`
    <div role="dialog" data-rect='{"top":0,"height":600,"width":700}'>
      <div class="hdr" data-rect='{"top":4,"height":24,"width":300}'>
        <span data-rect='{"top":4,"height":20,"width":120}'>PERMAQA</span>
        <span data-rect='{"top":4,"height":20,"width":120}'>Bug</span>
      </div>
      <div class="row" ${ROW}>
        <label id="gm-lbl" ${LABEL}>Game Mode</label>
        <input id="gm" role="combobox" aria-labelledby="gm-lbl" ${CONTROL}>
      </div>
      <button type="button" data-rect='{"top":400,"height":32,"width":120}'>Erstellen</button>
    </div>
    <div role="listbox" data-rect='{"top":700,"height":40,"width":300}'>
      <div role="option" data-rect='{"top":700,"height":20,"width":300}'>Solo</div>
    </div>
    <div role="menu" data-rect='{"top":800,"height":40,"width":300}'>
      <div role="option" data-rect='{"top":800,"height":20,"width":300}'>Solo</div>
    </div>`);

  const result = await h.paste({ schema_version: 1, game_mode: "Solo" });

  assert.equal(result.filled, 0);
  assert.equal(optionClicks(h).length, 0);
});

test("a popup linked through aria-owns is used even outside the dialog", async () => {
  const h = createHarness(`
    <div role="dialog" data-rect='{"top":0,"height":600,"width":700}'>
      <div class="hdr" data-rect='{"top":4,"height":24,"width":300}'>
        <span data-rect='{"top":4,"height":20,"width":120}'>PERMAQA</span>
        <span data-rect='{"top":4,"height":20,"width":120}'>Bug</span>
      </div>
      <div class="row" ${ROW}>
        <label id="gm-lbl" ${LABEL}>Game Mode</label>
        <input id="gm" role="combobox" aria-labelledby="gm-lbl" aria-owns="gm-portal" ${CONTROL}>
      </div>
      <button type="button" data-rect='{"top":400,"height":32,"width":120}'>Erstellen</button>
    </div>
    <div id="gm-portal" role="listbox" data-rect='{"top":700,"height":40,"width":300}'>
      <div role="option" data-rect='{"top":700,"height":20,"width":300}'>Coop</div>
      <div role="option" data-rect='{"top":720,"height":20,"width":300}'>Solo</div>
    </div>`);

  const result = await h.paste({ schema_version: 1, game_mode: "Solo" });

  assert.equal(result.filled, 1);
  assert.deepEqual(
    optionClicks(h).map((node) => node.textContent),
    ["Solo"]
  );
});

test("a native select is set only on an exact option label", async () => {
  const h = createHarness(
    dialog(`
      <div class="row" ${ROW}>
        <label for="sev" ${LABEL}>Severity</label>
        <select id="sev" ${CONTROL}>
          <option value="">--</option>
          <option value="s1">Blocker</option>
          <option value="s2">Major</option>
        </select>
      </div>`)
  );

  const result = await h.paste({ schema_version: 1, severity: "Major" });

  assert.equal(result.filled, 1);
  assert.equal(h.query("#sev").value, "s2");
});

// ---------------------------------------------------------------------------
// Multi value fields
// ---------------------------------------------------------------------------

test("every label is applied even when the menu stays open between selections", async () => {
  // Regression: the still-open menu made later values look already selected,
  // so labels were dropped while the run still reported success.
  const h = createHarness(dialog(combobox("Stichwort", "labels", ["alpha", "beta", "gamma"])));
  wireCombobox(h.window, "labels", { multi: true, closeOnSelect: false });

  const result = await h.paste({ schema_version: 1, labels: ["alpha", "beta"] });

  assert.deepEqual(chipTexts(h, "labels"), ["alpha", "beta"]);
  assert.equal(result.filled, 1);
  assert.equal(result.partial, 0);
});

test("a partly applied label set is reported as partial, never as filled", async () => {
  const h = createHarness(dialog(combobox("Stichwort", "labels", ["alpha"])));
  wireCombobox(h.window, "labels", { multi: true, closeOnSelect: false });

  const result = await h.paste({ schema_version: 1, labels: ["alpha", "does-not-exist"] });

  assert.equal(result.filled, 0);
  assert.equal(result.partial, 1);
  assert.deepEqual(chipTexts(h, "labels"), ["alpha"]);
});

test("label values are de-duplicated case- and whitespace-insensitively", async () => {
  const h = createHarness(dialog(combobox("Stichwort", "labels", ["alpha"])));
  wireCombobox(h.window, "labels", { multi: true, closeOnSelect: false });

  const result = await h.paste({ schema_version: 1, labels: ["alpha", "  ALPHA  ", "alpha"] });

  assert.deepEqual(chipTexts(h, "labels"), ["alpha"]);
  assert.equal(result.filled, 1);
  assert.equal(result.partial, 0);
});

test("a create-new-label option is never clicked", async () => {
  const h = createHarness(
    dialog(combobox("Stichwort", "labels", ['Erstellen "brandnew"', "Hinzufügen neu"]))
  );
  wireCombobox(h.window, "labels", { multi: true, closeOnSelect: false });

  const result = await h.paste({ schema_version: 1, labels: ["Hinzufügen neu"] });

  assert.equal(optionClicks(h).length, 0);
  assert.equal(result.filled, 0);
});

test("more label values than the configured maximum are refused as a whole", async () => {
  const h = createHarness(dialog(combobox("Stichwort", "labels", ["alpha"])));
  wireCombobox(h.window, "labels", { multi: true, closeOnSelect: false });

  const tooMany = Array.from({ length: 21 }, (_, index) => `label-${index}`);
  const result = await h.paste({ schema_version: 1, labels: tooMany });

  assert.equal(result.filled, 0);
  assert.equal(result.partial, 0);
  assert.equal(optionClicks(h).length, 0);
});

// ---------------------------------------------------------------------------
// Unicode normalization
// ---------------------------------------------------------------------------

test("a decomposed field label still matches the composed configured alias", async () => {
  const h = createHarness(dialog(combobox("Priorität", "prio", ["Hoch"])));
  wireCombobox(h.window, "prio");

  const result = await h.paste({ schema_version: 1, priority: "Hoch" });

  assert.equal(result.filled, 1);
  assert.equal(h.query("#prio").value, "Hoch");
});

test("a decomposed option matches a composed ticket value", async () => {
  const h = createHarness(dialog(combobox("Priorität", "prio", ["Höchste", "Niedrig"])));
  wireCombobox(h.window, "prio");

  const result = await h.paste({ schema_version: 1, priority: "Höchste" });

  assert.equal(result.filled, 1);
  assert.equal(h.query("#prio").value, "Höchste");
});

test("the create-new guard also holds for decomposed German text", async () => {
  const h = createHarness(dialog(combobox("Stichwort", "labels", ["Hinzufügen neu"])));
  wireCombobox(h.window, "labels", { multi: true, closeOnSelect: false });

  const result = await h.paste({ schema_version: 1, labels: ["Hinzufügen neu"] });

  assert.equal(optionClicks(h).length, 0);
  assert.equal(result.filled, 0);
});

// ---------------------------------------------------------------------------
// Typed adapters
// ---------------------------------------------------------------------------

test("text values are written verbatim, including edge spaces and markup-like text", async () => {
  const h = createHarness(dialog(inputRow("Zusammenfassung", { id: "summary" })));
  const value = "  <script>alert(1)</script> — ünïcödé  ";

  await h.paste({ schema_version: 1, summary: value });

  assert.equal(h.query("#summary").value, value);
});

test("a rich-text description receives plain text and never markup nodes", async () => {
  const h = createHarness(
    dialog(`
      <div class="row" data-rect='{"top":150,"height":120,"width":600}'>
        <label id="desc-lbl" data-rect='{"top":150,"height":18,"width":200}'>Beschreibung</label>
        <div id="desc" role="textbox" contenteditable="true" aria-labelledby="desc-lbl"
             data-rect='{"top":170,"height":100,"width":500}'>previous text</div>
      </div>`)
  );

  await h.paste({
    schema_version: 1,
    description: '<b>bold</b><img src=x onerror="alert(1)">'
  });

  const description = h.query("#desc");
  assert.equal(description.children.length, 0);
  assert.equal(description.textContent, '<b>bold</b><img src=x onerror="alert(1)">');
});

test("dates and numbers are validated before they reach the form", async () => {
  const invalid = createHarness(
    dialog(
      inputRow("Fälligkeitsdatum", { id: "due", type: "date" }) +
        inputRow("Working Hours", { id: "wh", type: "number" })
    )
  );
  const invalidResult = await invalid.paste({
    schema_version: 1,
    due_date: "2026-02-29",
    working_hours: -1
  });

  assert.equal(invalidResult.filled, 0);
  assert.equal(invalid.query("#due").value, "");
  assert.equal(invalid.query("#wh").value, "");

  const valid = createHarness(
    dialog(
      inputRow("Fälligkeitsdatum", { id: "due", type: "date" }) +
        inputRow("Working Hours", { id: "wh", type: "number" })
    )
  );
  const validResult = await valid.paste({
    schema_version: 1,
    due_date: "2026-02-28",
    working_hours: 0
  });

  assert.equal(validResult.filled, 2);
  assert.equal(valid.query("#due").value, "2026-02-28");
  assert.equal(valid.query("#wh").value, "0");
});

test("the impediment checkbox is only ever turned on, never off", async () => {
  const checkboxRow = `
    <div class="row" ${ROW}>
      <label for="imp" ${LABEL}>Impediment</label>
      <input id="imp" type="checkbox" checked data-rect='{"top":120,"height":16,"width":16}'>
    </div>`;

  const alreadyChecked = createHarness(dialog(checkboxRow));
  const checkedResult = await alreadyChecked.paste({
    schema_version: 1,
    flagged_impediment: true
  });
  assert.equal(checkedResult.filled, 1);
  assert.equal(alreadyChecked.query("#imp").checked, true);
  assert.equal(alreadyChecked.clicks.length, 0);

  const falseValue = createHarness(dialog(checkboxRow));
  const falseResult = await falseValue.paste({
    schema_version: 1,
    flagged_impediment: false
  });
  assert.equal(falseResult.filled, 0);
  assert.equal(falseValue.query("#imp").checked, true);
});

test("disabled and read-only controls are skipped", async () => {
  const h = createHarness(
    dialog(
      inputRow("Branch", { id: "branch", extra: "disabled" }) +
        inputRow("Tester", { id: "tester", extra: "readonly" })
    )
  );

  const result = await h.paste({
    schema_version: 1,
    branch: "release/1.2",
    tester: "Jane Doe"
  });

  assert.equal(result.filled, 0);
  assert.equal(h.query("#branch").value, "");
  assert.equal(h.query("#tester").value, "");
});

test("two controls sharing one label are ambiguous and neither is written", async () => {
  const h = createHarness(
    dialog(`
      <div class="row" ${ROW}>
        <label id="b-lbl" ${LABEL}>Branch</label>
        <input id="b1" aria-labelledby="b-lbl" data-rect='{"top":120,"height":24,"width":150}'>
        <input id="b2" aria-labelledby="b-lbl" data-rect='{"top":120,"height":24,"width":150}'>
      </div>`)
  );

  const result = await h.paste({ schema_version: 1, branch: "main" });

  assert.equal(result.filled, 0);
  assert.equal(h.query("#b1").value, "");
  assert.equal(h.query("#b2").value, "");
});

// ---------------------------------------------------------------------------
// Payload and lifecycle
// ---------------------------------------------------------------------------

test("only the declared schema version is accepted", async () => {
  const h = createHarness(dialog(inputRow("Zusammenfassung", { id: "summary" })));
  const expected = { ok: false, error: "Unsupported or missing schema_version. Expected 1." };

  assert.deepEqual(await h.paste({ schema_version: 2, summary: "x" }), expected);
  assert.deepEqual(await h.paste({ summary: "x" }), expected);
  assert.equal(h.query("#summary").value, "");
});

test("a non-object payload is rejected without touching the form", async () => {
  const h = createHarness(dialog(inputRow("Zusammenfassung", { id: "summary" })));
  const expected = { ok: false, error: "Ticket payload is not an object." };

  assert.deepEqual(await h.paste([1, 2, 3]), expected);
  assert.deepEqual(await h.pasteRaw("not an object"), expected);
  assert.deepEqual(await h.pasteRaw(null), expected);
});

test("unknown keys and prototype keys cannot add behaviour or pollute prototypes", async () => {
  const h = createHarness(dialog(inputRow("Zusammenfassung", { id: "summary" })));
  const payload = JSON.parse(
    '{"schema_version":1,"summary":"ok","__proto__":{"polluted":true},' +
      '"constructor":{"polluted":true},"unknown_key":"ignored","description":"d"}'
  );

  const result = await h.paste(payload);

  assert.equal(result.filled, 1);
  assert.equal(h.query("#summary").value, "ok");
  assert.equal(h.window.eval("({}).polluted"), undefined);
  assert.equal({}.polluted, undefined);
});

test("values of the wrong JSON type are skipped for every adapter", async () => {
  const h = createHarness(
    dialog(
      inputRow("Zusammenfassung", { id: "summary" }) +
        inputRow("Working Hours", { id: "wh", type: "number" }) +
        inputRow("Fälligkeitsdatum", { id: "due", type: "date" }) +
        `<div class="row" ${ROW}>
           <label for="imp" ${LABEL}>Impediment</label>
           <input id="imp" type="checkbox" data-rect='{"top":120,"height":16,"width":16}'>
         </div>`
    )
  );

  const result = await h.paste({
    schema_version: 1,
    summary: 42,
    labels: "not-an-array",
    working_hours: "8",
    due_date: 20260228,
    flagged_impediment: "true",
    priority: null
  });

  assert.equal(result.filled, 0);
  assert.equal(result.partial, 0);
  assert.equal(h.query("#summary").value, "");
  assert.equal(h.query("#wh").value, "");
  assert.equal(h.query("#due").value, "");
  assert.equal(h.query("#imp").checked, false);
});

test("a second concurrent paste is rejected while one is running", async () => {
  const h = createHarness(dialog(inputRow("Zusammenfassung", { id: "summary" })));
  const ticket = { schema_version: 1, summary: "x" };

  const [first, second] = await Promise.all([h.paste(ticket), h.paste(ticket)]);

  assert.equal(first.ok, true);
  assert.deepEqual(second, { ok: false, error: "A ticket paste is already in progress." });
});

test("losing the dialog mid-run stops safely and is reported", async () => {
  const h = createHarness(
    dialog(inputRow("Zusammenfassung", { id: "summary" }) + inputRow("Branch", { id: "branch" }))
  );

  const running = h.paste({ schema_version: 1, summary: "x", branch: "main" });
  setTimeout(() => h.query('[role="dialog"]').remove(), 5);
  const result = await running;

  assert.equal(result.ok, true);
  assert.equal(result.stopped, "dialog-lost");
  assert.equal(result.filled + result.partial + result.skipped, 16);
});

test("messages the helper does not own are ignored", async () => {
  const h = createHarness(dialog(inputRow("Zusammenfassung", { id: "summary" })));

  assert.equal(h.send({ type: "SOMETHING_ELSE" }), undefined);
  assert.equal(h.send(null), undefined);
  assert.equal(h.send(undefined), undefined);
});

test("every run accounts for all sixteen configured fields", async () => {
  const h = createHarness(dialog(inputRow("Zusammenfassung", { id: "summary" })));
  const result = await h.paste({ schema_version: 1, summary: "x" });

  assert.equal(result.filled + result.partial + result.skipped, 16);
});
