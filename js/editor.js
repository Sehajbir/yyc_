/* =====================================================================
   EDIT IFR clearance popup
   ---------------------------------------------------------------------
   Opens when the next-action column of a PL strip is clicked.
   Closes via the X button at the bottom, a click outside the window,
   or the Escape key.  Field/button behaviour inside the popup is a
   placeholder — functionality to be added later.
   ===================================================================== */

(function () {
  "use strict";

  const SID_OPTIONS   = ["CWBOY2", "RODEO2", "STAMP2", "YYC8"];
  const RWY_OPTIONS   = ["17R", "17L", "17R NC", "17L NC",
                         "35L", "35R", "35L NC", "35R NC", "11", "29"];
  const LOC_OPTIONS   = ["R3", "R4", "R5", "R6",
                         "R7", "R8", "R9", "CUST",
                         "AirP", "Mill", "SunW", "ASP"];
  const DEICE_OPTIONS = ["W⊗", "E⊗", "9⊗", "X⊗", "ND", "⊗"];

  let current = null;

  /* ----------------------------- DOM helpers ----------------------------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined && text !== null && text !== "") {
      node.textContent = String(text);
    }
    return node;
  }

  function field(label, boxClass, value, width, key) {
    const wrap = el("div", "efield");
    const box = el("span", "ebox " + boxClass, value);
    if (width) box.style.width = width + "px";
    if (key) box.dataset.field = key;
    wrap.append(el("span", "efield__label", label), box);
    return wrap;
  }

  function group(label, modClass, children) {
    const g = el("div", "egroup " + modClass);
    g.append(el("span", "egroup__label", label));
    children.forEach((c) => g.append(c));
    return g;
  }

  function btn(text, modClass) {
    const b = el("button", "ebtn" + (modClass ? " " + modClass : ""), text);
    b.type = "button";
    return b;
  }

  /* ------------------------------ window build ------------------------------ */

  function build(strip) {
    const s = strip || {};
    const overlay = el("div", "editor-overlay");
    const win = el("div", "editor");
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-modal", "true");
    win.setAttribute("aria-label", "EDIT IFR - " + (s.callsign || ""));

    win.append(el("div", "editor__titlebar", "EDIT IFR - " + (s.callsign || "")));

    const body = el("div", "editor__body");
    body.append(el("div", "editor__section-label", "CLEARANCE INFO"));

    /* row 1: clearance fields */
    const row1 = el("div", "editor__row");
    row1.append(
      field("ACID", "", s.callsign, 92),
      field("DEST", "", s.dest, 56),
      field("SID", "ebox--input", s.sid || "", 56, "sid"),
      field("CAT", "ebox--plain", s.wake || "", 34),
      field("DEP RWY", "ebox--input", rwyLabel(s), 52, "deprwy"),
      field("INTX", "ebox--input", "", 44),
      field("SSR", "", s.squawk, 56),
      field("FPUI", "ebox--input", "", 50),
      field("ATIS", "ebox--input", "", 44),
      field("LOCATION", "", s.gate, 56),
      field("DE-ICE", "ebox--plain", "", 50)
    );
    body.append(row1);

    /* row 2: type + SID / DEP RWY / LOCATION / DE-ICE groups */
    const row2 = el("div", "editor__row editor__row2");
    row2.append(field("TYPE", "", s.type, 56));
    row2.append(group("SID", "egroup--sid", SID_OPTIONS.map((t) => btn(t))));
    row2.append(group(
      "DEP RWY", "egroup--rwy",
      RWY_OPTIONS.map((t) => btn(t, t.includes("NC") ? "ebtn--nc" : ""))
    ));
    row2.append(group("LOCATION", "egroup--loc", LOC_OPTIONS.map((t) => btn(t))));
    row2.append(group("DE-ICE", "egroup--deice", DEICE_OPTIONS.map((t) => btn(t))));
    body.append(row2);

    /* row 3: route + flow information */
    const row3 = el("div", "editor__row editor__row3");
    row3.append(field("ROUTE", "ebox--route", s.fix || ""));
    row3.append(group("FLOW INFORMATION", "egroup--flow", [
      field("FLOW TYPE", "", "APREQ", 64),
      field("PROPOSED", "ebox--input", "", 64),
      field("REQUESTED", "ebox--yellow", "", 64),
      field("APPROVED", "ebox--plain", "", 64),
      field("ISSUED", "ebox--plain", "", 64)
    ]));
    body.append(row3);

    /* footer: X close, system buttons, CLX ISSUED */
    const footer = el("div", "editor__footer");
    const close = btn("X", "ebtn--close");
    close.dataset.action = "editor-close";
    close.title = "Close";
    footer.append(close);
    footer.append(el("span", "spacer"));
    const center = el("div", "editor__footer-center");
    ["XBLD", "RUIP", "NADP", "W GND"].forEach((t) => center.append(btn(t)));
    footer.append(center);
    footer.append(el("span", "spacer"));
    const clx = btn("CLX ISSUED", "ebtn--yellow");
    clx.dataset.action = "clx-issued";
    footer.append(clx);
    body.append(footer);

    win.append(body);
    overlay.append(win);
    return overlay;
  }

  /* ------------------------------ open / close ------------------------------ */

  function rwyLabel(s) {
    return s && s.rwy ? s.rwy + (s.rwyNC ? " NC" : "") : "";
  }

  function markSelected(group, label) {
    if (!group) return;
    group.querySelectorAll(".ebtn").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.textContent === label));
    });
  }

  function close() {
    if (current) {
      current.remove();
      current = null;
    }
  }

  function open(strip) {
    close();
    current = build(strip);
    const win = current.firstElementChild;

    const syncSid = () => {
      const box = current.querySelector('[data-field="sid"]');
      if (box) box.textContent = strip.sid || "";
      markSelected(current.querySelector(".egroup--sid"), strip.sid || "");
    };
    const syncRwy = () => {
      const box = current.querySelector('[data-field="deprwy"]');
      if (box) box.textContent = rwyLabel(strip);
      markSelected(current.querySelector(".egroup--rwy"), rwyLabel(strip));
    };

    /* reflect values the strip already carries */
    syncSid();
    syncRwy();

    /* click outside the window closes it */
    current.addEventListener("click", (event) => {
      if (event.target === current) close();
    });
    /* X button closes it */
    current.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="editor-close"]')) close();
    });

    /* SID / DEP RWY assignment + CLX ISSUED */
    win.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="clx-issued"]')) {
        if (window.StripBoard) window.StripBoard.clearToCL(strip);
        close();
        return;
      }
      const b = event.target.closest(".ebtn");
      const grp = b && b.closest(".egroup");
      if (!grp) return;
      if (grp.classList.contains("egroup--sid")) {
        strip.sid = b.textContent;
        syncSid();
        if (window.StripBoard) window.StripBoard.render("PL");
      } else if (grp.classList.contains("egroup--rwy")) {
        const label = b.textContent;
        const nc = label.endsWith("NC");
        strip.rwy = nc ? label.replace(/\s*NC$/, "") : label;
        strip.rwyNC = nc;
        syncRwy();
        if (window.StripBoard) window.StripBoard.render("PL");
      }
    });

    document.body.append(current);
    const closeBtn = current.querySelector('[data-action="editor-close"]');
    if (closeBtn) closeBtn.focus();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  window.openStripEditor = open;
  window.closeStripEditor = close;
})();
