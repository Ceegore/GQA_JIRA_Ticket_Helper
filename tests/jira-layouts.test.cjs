"use strict";

/*
 * Executable behaviour tests for the ways real Jira renders its create form
 * that the classic label+input fixtures cannot express:
 *
 * - the issue-view style form, where a row is collapsed to its name and only
 *   mounts its control after a click (the summary is a heading placeholder);
 * - react-select pickers, which open on mousedown and hide their search input
 *   behind opacity 0 once a value is shown;
 * - the collapsed description editor, whose placeholder input is replaced by
 *   the real editor as soon as it is focused;
 * - Atlaskit checkboxes with a transparent native input inside the label.
 *
 * Every fixture drives the real runtime files through the popup's message.
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
  test("Jira layout suite requires jsdom (run npm ci first)", (t) => {
    t.skip(`jsdom unavailable: ${loadError?.message}`);
  });
  return;
}

const { createHarness, dialog, inputRow } = harness;

const rect = (top, height, width = 600) =>
  `data-rect='{"top":${top},"height":${height},"width":${width}}'`;

// ---------------------------------------------------------------------------
// Issue-view style rows (collapsed until clicked)
// ---------------------------------------------------------------------------

/**
 * A collapsed row as the new Jira create form renders it: icon + field name,
 * no control. `mount` builds the edit view when the read view is clicked.
 */
function collapsedRow(id, text, top, { tag = "span" } = {}) {
  return `
    <div class="field" id="${id}" ${rect(top, 44)}>
      <div class="read" ${rect(top, 44)}>
        <span class="icon" ${rect(top + 12, 16, 16)}></span>
        <${tag} class="name" ${rect(top + 10, 20, 200)}>${text}</${tag}>
      </div>
    </div>`;
}

/**
 * Wires a collapsed row like Jira's inline edit: clicking the read view swaps
 * in a control and focuses it; blurring the control either commits the value
 * into a new read view or (discard=true) throws it away.
 */
function wireTextRow(window, id, { control = "textarea", discard = false, delayMs = 0 } = {}) {
  const doc = window.document;
  const field = doc.getElementById(id);
  const read = field.querySelector(".read");
  const name = read.querySelector(".name").textContent;

  read.addEventListener("click", () => {
    const mount = () => {
      const edit = doc.createElement(control === "editor" ? "div" : control);
      edit.className = "edit";
      if (control === "editor") {
        edit.setAttribute("contenteditable", "true");
        edit.setAttribute("tabindex", "0");
        edit.setAttribute("role", "textbox");
      }
      edit.setAttribute("data-rect", read.getAttribute("data-rect"));
      read.replaceWith(edit);
      edit.focus();

      edit.addEventListener("blur", () => {
        const value = control === "editor" ? edit.textContent : edit.value;
        const readView = doc.createElement("div");
        readView.className = "read";
        readView.setAttribute("data-rect", edit.getAttribute("data-rect"));
        if (discard || !value.trim()) {
          readView.append(Object.assign(doc.createElement("span"), { className: "name", textContent: name }));
        } else {
          readView.append(Object.assign(doc.createElement("span"), { className: "lbl", textContent: name }));
          for (const line of value.split("\n")) {
            readView.append(Object.assign(doc.createElement("p"), { className: "val", textContent: line }));
          }
        }
        edit.replaceWith(readView);
      });
    };
    if (delayMs > 0) window.setTimeout(mount, delayMs);
    else mount();
  });
}

/**
 * Wires a collapsed select row: the click mounts a react-select style input
 * whose menu is rendered in a body-level portal; choosing an option collapses
 * the row again with the chosen value in the read view.
 */
function wireSelectRow(window, id, options, { multi = false } = {}) {
  const doc = window.document;
  const field = doc.getElementById(id);
  const read = field.querySelector(".read");
  const name = read.querySelector(".name").textContent;
  const chosen = [];

  read.addEventListener("click", () => {
    const edit = doc.createElement("div");
    edit.className = "edit";
    edit.setAttribute("data-rect", read.getAttribute("data-rect"));
    const input = doc.createElement("input");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-controls", `${id}-listbox`);
    input.setAttribute("data-rect", read.getAttribute("data-rect"));
    edit.append(input);
    read.replaceWith(edit);

    const menu = doc.createElement("div");
    menu.id = `${id}-listbox`;
    menu.setAttribute("role", "listbox");
    menu.setAttribute("data-rect", '{"top":900,"height":100,"width":300}');
    for (const option of options) {
      const node = doc.createElement("div");
      node.setAttribute("role", "option");
      node.setAttribute("data-rect", '{"top":900,"height":20,"width":300}');
      node.textContent = option;
      node.addEventListener("click", () => {
        chosen.push(option);
        if (multi) {
          const chip = Object.assign(doc.createElement("span"), { className: "chip", textContent: option });
          chip.setAttribute("data-rect", '{"top":310,"height":18,"width":80}');
          edit.insertBefore(chip, input);
          node.remove();
          return;
        }
        collapse();
      });
      menu.append(node);
    }
    doc.body.append(menu);
    input.focus();

    function collapse() {
      menu.remove();
      const readView = doc.createElement("div");
      readView.className = "read";
      readView.setAttribute("data-rect", edit.getAttribute("data-rect"));
      readView.append(Object.assign(doc.createElement("span"), { className: "lbl", textContent: name }));
      for (const value of chosen) {
        readView.append(Object.assign(doc.createElement("span"), { className: "val", textContent: value }));
      }
      edit.replaceWith(readView);
    }

    if (multi) input.addEventListener("blur", collapse);
  });

  return chosen;
}

function issueViewDialog(rows) {
  return `
    <div role="dialog" ${rect(0, 800, 800)}>
      <div class="hdr" ${rect(10, 24, 300)}>
        <button type="button" ${rect(10, 24, 120)}>PERMAQA</button>
        <button type="button" ${rect(10, 24, 80)}>Bug</button>
      </div>
      ${rows}
      <button type="button" ${rect(760, 32, 120)}>Erstellen</button>
    </div>`;
}

function readTexts(h, id) {
  return [...h.query(`#${id}`).querySelectorAll(".read .val")].map((node) => node.textContent);
}

test("issue-view style summary: the heading placeholder row is opened, filled and committed", async () => {
  const h = createHarness(
    issueViewDialog(collapsedRow("summary-field", "Zusammenfassung", 60, { tag: "h1" }))
  );
  wireTextRow(h.window, "summary-field");

  const result = await h.paste({ schema_version: 1, summary: "Crash when loading level 3" });

  assert.equal(result.filled, 1);
  assert.deepEqual(readTexts(h, "summary-field"), ["Crash when loading level 3"]);
  assert.equal(result.fields.find((field) => field.key === "summary").status, "filled");
});

test("issue-view style description: the placeholder sentence row mounts an editor that receives plain text", async () => {
  const h = createHarness(
    issueViewDialog(
      collapsedRow(
        "desc-field",
        'Beschreibung hinzufügen oder "/" für Aktionen oder die Nutzung von Rovo eingeben',
        110
      )
    )
  );
  // The description editor is loaded on demand, so it appears a moment later.
  wireTextRow(h.window, "desc-field", { control: "editor", delayMs: 10 });

  const result = await h.paste({
    schema_version: 1,
    description: "Steps:\n1. Start the game\n2. <b>Load</b> level 3"
  });

  assert.equal(result.filled, 1);
  assert.deepEqual(readTexts(h, "desc-field"), ["Steps:", "1. Start the game", "2. <b>Load</b> level 3"]);
  assert.equal(h.query("#desc-field").querySelector("b"), null);
});

test("an English placeholder sentence also identifies the description row", async () => {
  const h = createHarness(
    issueViewDialog(collapsedRow("desc-field", "Add a description or type / for commands", 110))
  );
  wireTextRow(h.window, "desc-field", { control: "editor" });

  const result = await h.paste({ schema_version: 1, description: "Repro steps" });

  assert.equal(result.filled, 1);
  assert.deepEqual(readTexts(h, "desc-field"), ["Repro steps"]);
});

test("a placeholder sentence without a known verb never matches a field", async () => {
  const h = createHarness(issueViewDialog(collapsedRow("mgr-field", "Branch Manager", 200)));
  wireTextRow(h.window, "mgr-field", { control: "input" });

  const result = await h.paste({ schema_version: 1, branch: "release/1.2" });

  assert.equal(result.filled, 0);
  assert.equal(h.clicks.length, 0);
});

test("issue-view style select: the collapsed row is opened and the exact option chosen", async () => {
  const h = createHarness(issueViewDialog(collapsedRow("sev-field", "Severity", 300)));
  const chosen = wireSelectRow(h.window, "sev-field", ["Blocker", "Major", "Minor"]);

  const result = await h.paste({ schema_version: 1, severity: "Major" });

  assert.equal(result.filled, 1);
  assert.deepEqual(chosen, ["Major"]);
  assert.deepEqual(readTexts(h, "sev-field"), ["Major"]);
});

test("issue-view style select: a near match leaves the collapsed row untouched", async () => {
  const h = createHarness(issueViewDialog(collapsedRow("sev-field", "Severity", 300)));
  const chosen = wireSelectRow(h.window, "sev-field", ["Major", "Majority"]);

  const result = await h.paste({ schema_version: 1, severity: "Majo" });

  assert.equal(result.filled, 0);
  assert.deepEqual(chosen, []);
});

test("issue-view style labels: every value is applied and the row is committed by blur", async () => {
  const h = createHarness(issueViewDialog(collapsedRow("labels-field", "Stichwort", 400)));
  const chosen = wireSelectRow(h.window, "labels-field", ["alpha", "beta", "gamma"], { multi: true });

  const result = await h.paste({ schema_version: 1, labels: ["alpha", "gamma"] });

  assert.equal(result.filled, 1);
  assert.equal(result.partial, 0);
  assert.deepEqual(chosen, ["alpha", "gamma"]);
  assert.deepEqual(readTexts(h, "labels-field"), ["alpha", "gamma"]);
});

test("a required marker on the row name does not hide the row", async () => {
  const h = createHarness(issueViewDialog(collapsedRow("branch-field", "Branch *", 250)));
  wireTextRow(h.window, "branch-field", { control: "input" });

  const result = await h.paste({ schema_version: 1, branch: "release/1.2" });

  assert.equal(result.filled, 1);
  assert.deepEqual(readTexts(h, "branch-field"), ["release/1.2"]);
});

test("a filled issue-view row shows label and value; the value is recognised without reopening", async () => {
  const h = createHarness(
    issueViewDialog(`
      <div class="field" id="prio-field" ${rect(500, 44)}>
        <div class="read" ${rect(500, 44)}>
          <span class="lbl" ${rect(500, 16, 100)}>Priorität</span>
          <span class="val" ${rect(518, 20, 100)}>Medium</span>
        </div>
      </div>`)
  );
  let opened = 0;
  h.query("#prio-field .read").addEventListener("click", () => {
    opened += 1;
  });

  const result = await h.paste({ schema_version: 1, priority: "Medium" });

  // The wanted value is already on the form, so the row is never opened.
  assert.equal(result.filled, 1);
  assert.equal(opened, 0);
  assert.equal(h.clicks.length, 0);
  assert.equal(h.query("#prio-field .val").textContent, "Medium");

  // A different value must not be mistaken for the shown one.
  const other = await h.paste({ schema_version: 1, priority: "High" });
  assert.equal(other.filled, 0);
  assert.equal(other.fields.find((field) => field.key === "priority").reason, "control-not-mounted");
  assert.equal(h.query("#prio-field .val").textContent, "Medium");
});

test("an edit that Jira discards on blur is reported as not confirmed, never as filled", async () => {
  const h = createHarness(issueViewDialog(collapsedRow("bvs-field", "Build Version Spotted", 200)));
  wireTextRow(h.window, "bvs-field", { control: "input", discard: true });

  const result = await h.paste({ schema_version: 1, build_version_spotted: "1.4.2" });

  assert.equal(result.filled, 0);
  assert.equal(
    result.fields.find((field) => field.key === "build_version_spotted").reason,
    "not-confirmed"
  );
});

test("a date row that re-renders the ISO date in the UI locale still counts as confirmed", async () => {
  const h = createHarness(issueViewDialog(collapsedRow("due-field", "Fälligkeitsdatum", 400)));
  const doc = h.document;
  const read = h.query("#due-field .read");
  read.addEventListener("click", () => {
    const input = doc.createElement("input");
    input.setAttribute("role", "combobox");
    input.setAttribute("data-rect", read.getAttribute("data-rect"));
    read.replaceWith(input);
    input.focus();
    input.addEventListener("blur", () => {
      const [year, month, day] = input.value.split("-");
      const readView = doc.createElement("div");
      readView.className = "read";
      readView.setAttribute("data-rect", input.getAttribute("data-rect"));
      readView.append(Object.assign(doc.createElement("span"), { className: "lbl", textContent: "Fälligkeitsdatum" }));
      readView.append(Object.assign(doc.createElement("span"), { className: "val", textContent: `${day}. Sept. ${year}` }));
      readView.dataset.month = month;
      input.replaceWith(readView);
    });
  });

  const result = await h.paste({ schema_version: 1, due_date: "2026-09-30" });

  assert.equal(result.filled, 1);
  assert.deepEqual(readTexts(h, "due-field"), ["30. Sept. 2026"]);
});

test("a date row that shows a different date after blur is not confirmed", async () => {
  const h = createHarness(issueViewDialog(collapsedRow("due-field", "Fälligkeitsdatum", 400)));
  const doc = h.document;
  const read = h.query("#due-field .read");
  read.addEventListener("click", () => {
    const input = doc.createElement("input");
    input.setAttribute("data-rect", read.getAttribute("data-rect"));
    read.replaceWith(input);
    input.focus();
    input.addEventListener("blur", () => {
      const readView = doc.createElement("div");
      readView.className = "read";
      readView.setAttribute("data-rect", input.getAttribute("data-rect"));
      readView.append(Object.assign(doc.createElement("span"), { className: "val", textContent: "03.10.2026" }));
      input.replaceWith(readView);
    });
  });

  const result = await h.paste({ schema_version: 1, due_date: "2026-09-30" });

  assert.equal(result.filled, 0);
  assert.equal(result.fields.find((field) => field.key === "due_date").reason, "not-confirmed");
});

test("a number row that displays a decimal comma still counts as confirmed", async () => {
  const h = createHarness(issueViewDialog(collapsedRow("wh-field", "Working Hours", 450)));
  const doc = h.document;
  const read = h.query("#wh-field .read");
  read.addEventListener("click", () => {
    const input = doc.createElement("input");
    input.type = "text";
    input.setAttribute("data-rect", read.getAttribute("data-rect"));
    read.replaceWith(input);
    input.focus();
    input.addEventListener("blur", () => {
      const readView = doc.createElement("div");
      readView.className = "read";
      readView.setAttribute("data-rect", input.getAttribute("data-rect"));
      readView.append(Object.assign(doc.createElement("span"), { className: "val", textContent: input.value.replace(".", ",") }));
      input.replaceWith(readView);
    });
  });

  const result = await h.paste({ schema_version: 1, working_hours: 1.5 });

  assert.equal(result.filled, 1);
  assert.deepEqual(readTexts(h, "wh-field"), ["1,5"]);
});

test("a field that normalises line breaks in the typed text still counts as filled; truncation does not", async () => {
  const h = createHarness(
    dialog(inputRow("Zusammenfassung", { id: "summary" }) + inputRow("Branch", { id: "branch" }))
  );
  // A single-line input drops the line break on its own (value sanitisation),
  // exactly as Jira's summary field does.
  const summary = h.query("#summary");
  const branch = h.query("#branch");
  branch.addEventListener("input", () => {
    branch.value = branch.value.slice(0, 5);
  });

  const result = await h.paste({
    schema_version: 1,
    summary: "Crash on\nlevel load",
    branch: "release/1.2"
  });

  const byKey = Object.fromEntries(result.fields.map((field) => [field.key, field]));
  assert.equal(byKey.summary.status, "filled");
  assert.equal(summary.value, "Crash onlevel load");
  assert.equal(byKey.branch.reason, "not-confirmed");
});

test("a collapsed row that never mounts a control is reported and nothing else is written", async () => {
  // Regression: the label climb used to adopt the only control in a shared
  // container, so this value landed in the neighbouring field.
  const h = createHarness(
    issueViewDialog(`
      <div class="fields" ${rect(200, 120, 700)}>
        ${collapsedRow("bvs-field", "Build Version Spotted", 200)}
        <div class="field" ${rect(260, 44)}>
          <span class="lbl" ${rect(260, 16, 200)}>Build Version Released</span>
          <input id="bvr" ${rect(280, 24, 300)}>
        </div>
      </div>`)
  );

  const result = await h.paste({ schema_version: 1, build_version_spotted: "1.4.2" });

  assert.equal(result.filled, 0);
  assert.equal(h.query("#bvr").value, "");
  assert.equal(
    result.fields.find((field) => field.key === "build_version_spotted").reason,
    "control-not-mounted"
  );
});

test("a control that another row re-mounts during activation is never adopted", async () => {
  // Regression guard: while the Build Version Spotted row waits for its
  // control, the Summary row (already open) re-keys its textarea. That
  // textarea is new to the dialog and of a compatible kind, but it belongs to
  // a different row and must stay untouched.
  const h = createHarness(
    issueViewDialog(
      collapsedRow("summary-field", "Zusammenfassung", 60, { tag: "h1" }) +
        collapsedRow("bvs-field", "Build Version Spotted", 300)
    )
  );
  const doc = h.document;
  const summary = doc.createElement("textarea");
  summary.id = "summary-open";
  summary.setAttribute("data-rect", '{"top":60,"height":40,"width":700}');
  h.query("#summary-field .read").replaceWith(summary);

  h.query("#bvs-field .read").addEventListener("click", () => {
    const fresh = doc.createElement("textarea");
    fresh.id = "summary-rekeyed";
    fresh.setAttribute("data-rect", '{"top":60,"height":40,"width":700}');
    summary.replaceWith(fresh);
  });

  const result = await h.paste({ schema_version: 1, build_version_spotted: "1.4.2" });

  assert.equal(result.filled, 0);
  assert.equal(
    result.fields.find((field) => field.key === "build_version_spotted").reason,
    "control-not-mounted"
  );
  assert.equal(h.query("#summary-rekeyed").value, "");
});

test("a row name that is a <label> for another control is never clicked to activate the row", async () => {
  const h = createHarness(
    issueViewDialog(`
      <div class="field" ${rect(200, 44)}>
        <label for="weird" ${rect(210, 20, 100)}>Tester</label>
        <input id="weird" type="checkbox" ${rect(210, 16, 16)}>
      </div>`)
  );

  const result = await h.paste({ schema_version: 1, tester: "Jane Doe" });

  assert.equal(result.filled, 0);
  assert.equal(h.query("#weird").checked, false);
  assert.equal(h.clicks.length, 0);
});

test("activation never clicks a submit-capable read view", async () => {
  const h = createHarness(
    issueViewDialog(`
      <form>
        <div class="field" id="sev-field" ${rect(300, 44)}>
          <button class="read" ${rect(300, 44)}>
            <span class="name" ${rect(310, 20, 80)}>Severity</span>
          </button>
        </div>
      </form>`)
  );
  let submitted = false;
  h.query("form").addEventListener("submit", () => {
    submitted = true;
  });

  const result = await h.paste({ schema_version: 1, severity: "Major" });

  assert.equal(submitted, false);
  assert.equal(h.clicks.length, 0);
  assert.equal(result.filled, 0);
});

// ---------------------------------------------------------------------------
// react-select behaviour in the classic form
// ---------------------------------------------------------------------------

/**
 * A react-select single select: the menu opens on mousedown of the control
 * (a click alone does nothing), lives in a body-level portal linked through
 * aria-controls, and the search input turns transparent once a value shows.
 */
function reactSelect(label, id, options) {
  return `
    <div class="row" ${rect(100, 40)}>
      <label id="${id}-lbl" ${rect(100, 18, 200)}>${label}</label>
      <div class="control" id="${id}-control" ${rect(120, 32, 300)}>
        <div class="value-container" ${rect(120, 32, 260)}>
          <div class="single-value" id="${id}-value" ${rect(124, 20, 200)}></div>
          <div class="input-container" ${rect(124, 20, 40)}>
            <input id="${id}" role="combobox" aria-autocomplete="list" aria-expanded="false"
                   aria-labelledby="${id}-lbl" ${rect(124, 20, 2)}>
          </div>
        </div>
      </div>
    </div>
    <template id="${id}-options">${options.map((option) => `<div role="option">${option}</div>`).join("")}</template>`;
}

function wireReactSelect(window, id, { openOnClick = false } = {}) {
  const doc = window.document;
  const control = doc.getElementById(`${id}-control`);
  const input = doc.getElementById(id);
  const value = doc.getElementById(`${id}-value`);
  const template = doc.getElementById(`${id}-options`);
  const events = [];
  let menu = null;

  function open() {
    if (menu) return;
    menu = doc.createElement("div");
    menu.id = `${id}-listbox`;
    menu.setAttribute("role", "listbox");
    menu.setAttribute("data-rect", '{"top":900,"height":100,"width":300}');
    for (const option of template.content.querySelectorAll("[role='option']")) {
      const node = doc.importNode(option, true);
      node.setAttribute("data-rect", '{"top":900,"height":20,"width":300}');
      node.addEventListener("click", () => {
        value.textContent = node.textContent;
        input.style.opacity = "0";
        close();
      });
      menu.append(node);
    }
    doc.body.append(menu);
    input.setAttribute("aria-controls", menu.id);
    input.setAttribute("aria-expanded", "true");
  }

  function close() {
    if (!menu) return;
    menu.remove();
    menu = null;
    input.removeAttribute("aria-controls");
    input.setAttribute("aria-expanded", "false");
  }

  control.addEventListener("mousedown", (event) => {
    events.push(event.type);
    input.focus();
    open();
  });
  if (openOnClick) input.addEventListener("click", open);
  input.addEventListener("blur", close);
  input.addEventListener("focus", () => {
    input.style.opacity = "1";
  });

  return { events, value };
}

test("a react-select menu that only opens on mousedown is opened and the exact option chosen", async () => {
  const h = createHarness(dialog(reactSelect("Priorität", "prio", ["Hoch", "Höchste", "Niedrig"])));
  const widget = wireReactSelect(h.window, "prio");

  const result = await h.paste({ schema_version: 1, priority: "Hoch" });

  assert.equal(result.filled, 1);
  assert.equal(widget.value.textContent, "Hoch");
  assert.ok(widget.events.includes("mousedown"));
});

test("a react-select whose search input is transparent behind a shown value can still be changed", async () => {
  const h = createHarness(dialog(reactSelect("Priorität", "prio", ["Hoch", "Niedrig"])));
  const widget = wireReactSelect(h.window, "prio");
  widget.value.textContent = "Hoch";
  h.query("#prio").style.opacity = "0";

  const unchanged = await h.paste({ schema_version: 1, priority: "Hoch" });
  assert.equal(unchanged.filled, 1);
  assert.equal(widget.events.length, 0, "an already selected value must not reopen the menu");

  const changed = await h.paste({ schema_version: 1, priority: "Niedrig" });
  assert.equal(changed.filled, 1);
  assert.equal(widget.value.textContent, "Niedrig");
});

test("a picker that loads options after typing is given time to answer", async () => {
  const h = createHarness(dialog(reactSelect("Tester", "tester", [])));
  const doc = h.document;
  const input = h.query("#tester");
  const widget = wireReactSelect(h.window, "tester");

  // Searching is asynchronous: the person list appears a moment after typing.
  input.addEventListener("input", () => {
    h.window.setTimeout(() => {
      const menu = doc.getElementById("tester-listbox");
      if (!menu || !input.value) return;
      const option = doc.createElement("div");
      option.setAttribute("role", "option");
      option.setAttribute("data-rect", '{"top":900,"height":40,"width":300}');
      option.append(
        Object.assign(doc.createElement("span"), { textContent: "Jane Doe" }),
        Object.assign(doc.createElement("span"), { textContent: "jane.doe@example.test" })
      );
      option.addEventListener("click", () => {
        widget.value.textContent = "Jane Doe";
        input.value = "";
        menu.remove();
      });
      menu.append(option);
    }, 15);
  });

  const result = await h.paste({ schema_version: 1, tester: "Jane Doe" });

  assert.equal(result.filled, 1);
  assert.equal(widget.value.textContent, "Jane Doe");
});

test("a create-new option marked with a suffix is never clicked for labels", async () => {
  const h = createHarness(
    dialog(`
      <div class="row" ${rect(100, 40)}>
        <label id="labels-lbl" ${rect(100, 18, 200)}>Stichwort</label>
        <input id="labels" role="combobox" aria-labelledby="labels-lbl" aria-controls="labels-list" ${rect(120, 24, 300)}>
        <div id="labels-list" role="listbox" ${rect(300, 60, 300)}>
          <div role="option" ${rect(300, 20, 300)}><span>alpha</span><span>(Neues Stichwort)</span></div>
          <div role="option" ${rect(320, 20, 300)}><span>beta</span><span>(New label)</span></div>
        </div>
      </div>`)
  );

  const result = await h.paste({ schema_version: 1, labels: ["alpha", "beta"] });

  assert.equal(result.filled, 0);
  assert.equal(result.partial, 0);
  assert.equal(
    h.clicks.filter((node) => node.getAttribute?.("role") === "option").length,
    0
  );
});

// ---------------------------------------------------------------------------
// Editors and checkboxes
// ---------------------------------------------------------------------------

test("a collapsed description editor is expanded and the text lands in the real editor", async () => {
  const h = createHarness(
    dialog(`
      <div class="row" id="desc-row" ${rect(150, 40)}>
        <input id="desc-collapsed" placeholder="Beschreibung hinzufügen oder &quot;/&quot; für Aktionen eingeben" ${rect(150, 32, 600)}>
      </div>`)
  );
  const doc = h.document;
  const collapsed = h.query("#desc-collapsed");
  collapsed.addEventListener("focus", () => {
    collapsed.remove();
    h.window.setTimeout(() => {
      const editor = doc.createElement("div");
      editor.id = "desc-editor";
      editor.setAttribute("contenteditable", "true");
      editor.setAttribute("tabindex", "0");
      editor.setAttribute("data-rect", '{"top":150,"height":120,"width":600}');
      doc.getElementById("desc-row").append(editor);
      editor.focus();
    }, 10);
  });

  const result = await h.paste({ schema_version: 1, description: "Actual: crash\nExpected: no crash" });

  assert.equal(result.filled, 1);
  assert.equal(h.query("#desc-editor").textContent, "Actual: crash\nExpected: no crash");
});

test("an Atlaskit style checkbox with a transparent input inside its label is checked", async () => {
  const h = createHarness(
    dialog(`
      <div class="row" ${rect(700, 30)}>
        <span class="lbl" ${rect(700, 14, 80)}>Flagged</span>
        <label ${rect(716, 24, 200)}>
          <input type="checkbox" id="imp" style="opacity:0" ${rect(720, 16, 16)}>
          <span ${rect(718, 20, 100)}>Impediment</span>
        </label>
      </div>`)
  );

  const result = await h.paste({ schema_version: 1, flagged_impediment: true });

  assert.equal(result.filled, 1);
  assert.equal(h.query("#imp").checked, true);
});

// ---------------------------------------------------------------------------
// Labels, dialogs and reporting
// ---------------------------------------------------------------------------

test("an aria-labelledby label carrying a required asterisk still names the control", async () => {
  const h = createHarness(
    dialog(`
      <div class="row" ${rect(100, 40)}>
        <label id="s-lbl" ${rect(100, 18, 200)}>Zusammenfassung<span aria-hidden="true">*</span></label>
        <input id="summary" aria-labelledby="s-lbl" ${rect(120, 24, 300)}>
      </div>`)
  );

  const result = await h.paste({ schema_version: 1, summary: "Crash" });

  assert.equal(result.filled, 1);
  assert.equal(h.query("#summary").value, "Crash");
});

test("an aria-modal wrapper around the role=dialog element is one dialog, not two", async () => {
  const h = createHarness(
    `<div aria-modal="true" ${rect(0, 600, 700)}>${dialog(inputRow("Zusammenfassung", { id: "summary" }))}</div>`
  );

  const result = await h.paste({ schema_version: 1, summary: "Crash" });

  assert.equal(result.ok, true);
  assert.equal(result.filled, 1);
  assert.equal(h.query("#summary").value, "Crash");
});

test("every field reports its outcome and reason in configured order", async () => {
  const h = createHarness(dialog(inputRow("Zusammenfassung", { id: "summary" })));

  const result = await h.paste({
    schema_version: 1,
    summary: "Crash",
    severity: "Major",
    due_date: "not-a-date",
    flagged_impediment: false
  });

  assert.deepEqual(
    result.fields.map((field) => field.key),
    [...h.window.GQA_CONFIG.FIELD_ORDER]
  );
  const byKey = Object.fromEntries(result.fields.map((field) => [field.key, field]));
  assert.equal(byKey.summary.status, "filled");
  assert.deepEqual(byKey.severity, { key: "severity", status: "skipped", reason: "control-not-found" });
  assert.deepEqual(byKey.due_date, { key: "due_date", status: "skipped", reason: "invalid-date" });
  assert.deepEqual(byKey.flagged_impediment, { key: "flagged_impediment", status: "skipped", reason: "not-true" });
  assert.deepEqual(byKey.description, { key: "description", status: "skipped", reason: "empty" });
});

test("the diagnosis report describes the form without clicking, focusing or changing it", async () => {
  const h = createHarness(
    issueViewDialog(
      collapsedRow("summary-field", "Zusammenfassung", 60, { tag: "h1" }) +
        inputRow("Working Hours", { id: "wh", type: "number" })
    )
  );
  let opened = 0;
  h.query("#summary-field .read").addEventListener("click", () => {
    opened += 1;
  });

  const report = JSON.parse(JSON.stringify(await h.send({ type: "GQA_DIAGNOSE" })));

  assert.equal(report.ok, true);
  assert.equal(report.dialogFound, true);
  assert.equal(report.dialogs.length, 1);
  assert.deepEqual(
    [report.dialogs[0].project, report.dialogs[0].issueType, report.dialogs[0].createButton],
    [true, true, true]
  );
  const byKey = Object.fromEntries(report.fields.map((field) => [field.key, field]));
  assert.equal(byKey.summary.control, null);
  assert.equal(byKey.summary.label.text, "zusammenfassung");
  assert.equal(byKey.working_hours.control.tag, "input");
  assert.equal(byKey.working_hours.control.type, "number");
  assert.equal(byKey.working_hours.via, "accessible-name");
  assert.equal(opened, 0);
  assert.equal(h.clicks.length, 0);
  assert.equal(h.document.activeElement, h.document.body);
  assert.equal(JSON.stringify(report).includes("value"), false);
});

test("the diagnosis report explains a failed dialog guard", async () => {
  const h = createHarness(dialog(inputRow("Zusammenfassung", { id: "summary" }), { project: "OTHER" }));

  const report = JSON.parse(JSON.stringify(await h.send({ type: "GQA_DIAGNOSE" })));

  assert.equal(report.dialogFound, false);
  assert.equal(report.dialogs.length, 1);
  assert.equal(report.dialogs[0].project, false);
  assert.equal(report.dialogs[0].issueType, true);
  assert.equal(report.dialogs[0].createButton, true);
  assert.deepEqual(report.fields, []);
});
