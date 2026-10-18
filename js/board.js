/* =====================================================================
   YYC Strip Board — panel / flight-strip engine
   ---------------------------------------------------------------------
   The board starts EMPTY (no strips in any panel).  The PL header's
   LOAD STRIPS button loads the planned departure dataset
   (js/pl-data.js).  Strips can also be managed through the public API,
   e.g. from the devtools console:

     StripBoard.addStrip("CL", {
       seq: 19, origin: "CYEG", originTime: "1645",
       callsign: "ANT701", wake: "M", type: "B734", extra: "7334",
       fix: "BITGA", rwy: "35L", sid: "COW2"
     });

   PL strip fields (planned departures):
     gate     parking: Apron 1 gate or remote apron (R3-R9)
     dest     4-letter destination ICAO (e.g. "CYVR")
     callsign e.g. "ACA118"
     wake     wake category "L" / "M" / "H"  ("H" renders orange)
     type     4-letter ICAO type (e.g. "B38M")
     squawk   4-digit transponder code
     fix      initial IFR waypoint (jet/prop appropriate)
     rwy      unassigned -> dim "RWY" placeholder until the user assigns
     sid      unassigned -> blank holder until the user assigns
   Next-action column: in PL it opens the EDIT IFR popup (CLX ISSUED there
   sends gate strips to CL and removes remote-apron strips); in CL it
   moves the strip to the APR 1 panel.
   Simulation: PL strips flash yellow when calling for clearance, CL
   strips flash orange when calling for pushback.

   CL / APR strip fields:
     seq, seqLabel, origin, originTime, flow (yellow tag), callsign,
     wake, wakeOrange, type, extra, fix, rwy, sid, sidOrange, spot
   ===================================================================== */

(function () {
  "use strict";

  /** Panel id -> strip layout flavour.  PL and CL share the same
      departure-strip look; strips keep it when moved between them. */
  const PANEL_TYPES = { PL: "dep", CL: "dep", APR1: "apr", APRTSF: "apr" };

  /** Board state: starts completely empty. */
  const state = { PL: [], CL: [], APR1: [], APRTSF: [] };

  /** Main-apron (Apron 1) gate ranges; anything else (R3-R9) is remote. */
  const GATE_RANGES = [[1, 6], [11, 24], [31, 40], [50, 59], [70, 76], [78, 92], [94, 97]];

  function isMainApronGate(gate) {
    const n = parseInt(gate, 10);
    if (String(n) !== String(gate).trim()) return false;
    return GATE_RANGES.some(([lo, hi]) => n >= lo && n <= hi);
  }

  /** Active runway configuration: "35" (35L/35R) or "17" (17L/17R). */
  let activeRwy = "35";

  /* --------------------------- simulation state --------------------------- */
  /** Callsigns of strips currently "calling" (flashing). */
  const calling = new Set();
  let simTimer = null;
  const SIM_INTERVAL_MS = 4000;

  /* ----------------------------- DOM helpers ----------------------------- */

  function div(className, text) {
    const node = document.createElement("div");
    node.className = className;
    if (text !== undefined && text !== null && text !== "") {
      node.textContent = String(text);
    }
    return node;
  }

  function panelEl(panelId) {
    return document.querySelector('.panel[data-panel="' + panelId + '"]');
  }

  /* --------------------------- strip cell builders --------------------------- */

  /** PL column 1: parking location (gate number or remote apron). */
  function cellGate(s) {
    const cell = div("cell cell--gate");
    cell.append(div("gate", s.gate !== undefined ? s.gate : s.seq));
    if (s.seqLabel) cell.append(div("seq-label", s.seqLabel));
    return cell;
  }

  /** PL column 2: destination identifier. */
  function cellDest(s) {
    const cell = div("cell cell--dest");
    cell.append(div("dest", s.dest !== undefined ? s.dest : s.origin));
    return cell;
  }

  /** CL / APR column 2: origin + time / FLOW tag. */
  function cellOrigin(s) {
    const cell = div("cell cell--origin");
    cell.append(div("icao", s.origin));
    if (s.flow) {
      cell.append(div("tag-flow", s.flow === true ? "FLOW" : s.flow));
    } else if (s.originTime) {
      cell.append(div("time", s.originTime));
    }
    return cell;
  }

  /** Callsign cell: cyan callsign over wake / type / squawk-or-extra. */
  function cellCallsign(s, withSquawk) {
    const cell = div("cell cell--callsign");
    cell.append(div("callsign", s.callsign));
    const info = div("acinfo");
    if (s.wake) {
      const heavy = s.wake === "H" || s.wakeOrange;
      info.append(div("wake" + (heavy ? " wake--orange" : ""), s.wake));
    }
    if (s.type) info.append(div("atype", s.type));
    if (withSquawk && s.squawk) info.append(div("asquawk", s.squawk));
    else if (s.extra) info.append(div("aextra", s.extra));
    if (info.childNodes.length) cell.append(info);
    return cell;
  }

  /** PL column 4: reserved blank column. */
  function cellBlank() {
    return div("cell cell--blank");
  }

  function cellFix(s) {
    const cell = div("cell cell--fix");
    if (s.spot) cell.append(div("spot-big", s.spot));
    cell.append(div(s.spot ? "fix-small" : "fix", s.fix));
    return cell;
  }

  /** APR 1 next-action column: placeholder SPOT until a spot is
      assigned; opens the Spot menu when clicked. */
  function cellAprAction(s) {
    const cell = div("cell cell--action");
    cell.dataset.slot = "action";
    cell.dataset.callsign = s.callsign || "";
    cell.append(div("rwy-dim", s.spot || "SPOT"));
    if (!s.spot) cell.title = "Assign spot";
    return cell;
  }

  /** PL runway column: dim placeholder until the user assigns a runway. */
  function cellRwyPlaceholder(s) {
    const cell = div("cell cell--rwy");
    cell.dataset.slot = "rwy";
    if (s && s.rwy) {
      cell.append(div("rwy", s.rwy));
      if (s.rwyNC) cell.append(div("rwy-nc", "NC"));
    } else {
      cell.append(div("rwy-dim", "RWY"));
    }
    return cell;
  }

  function cellRwy(s) {
    const cell = div("cell cell--rwy");
    cell.append(div("rwy", s.rwy));
    return cell;
  }

  /** PL SID column: blank holder until the user assigns a SID. */
  function cellSidHolder(s) {
    const cell = div("cell cell--sidholder");
    cell.dataset.slot = "sid";
    if (s && s.sid) cell.append(div("sid-assigned", s.sid));
    return cell;
  }

  function cellSid(s) {
    const cell = div("cell cell--sid");
    cell.append(div("sid" + (s.sidOrange ? " sid--orange" : ""), s.sid));
    cell.append(div("sid", "ALT"));
    return cell;
  }

  /** PL last column: next-action column — the whole cell is clickable
      and opens the EDIT IFR clearance popup. */
  function cellAction(s) {
    const cell = div("cell cell--action");
    cell.dataset.slot = "action";
    cell.dataset.callsign = s.callsign || "";
    cell.title = "Edit clearance";
    return cell;
  }

  function cellSpot(s) {
    const cell = div("cell cell--spot");
    cell.append(div("spot", s.spot));
    return cell;
  }

  /* ------------------------------ strip builder ------------------------------ */

  function buildStrip(panelId, strip) {
    const flavour = PANEL_TYPES[panelId];
    const el = div("strip strip--" + flavour);
    el.dataset.callsign = strip.callsign || "";
    el.dataset.panel = panelId;

    if (flavour === "dep") {
      /* CL strips can be dragged back to PL */
      if (panelId === "CL") {
        el.draggable = true;
        el.classList.add("strip--draggable");
        el.title = "Drag to PL to move back";
      }
      el.append(
        cellGate(strip),
        cellDest(strip),
        cellCallsign(strip, true),
        cellBlank(),
        cellFix(strip),
        cellRwyPlaceholder(strip),
        cellSidHolder(strip),
        cellAction(strip)
      );
    } else { /* apr */
      if (strip.spot) el.classList.add("strip--parked");
      el.append(
        cellSeq(strip),
        cellOrigin(strip),
        cellCallsign(strip, false),
        cellFix(strip),
        cellRwy(strip),
        cellSid(strip),
        cellAprAction(strip)
      );
    }
    return el;
  }

  /** CL / APR column 1: sequence number + optional label. */
  function cellSeq(s) {
    const cell = div("cell cell--seq");
    cell.append(div("seq-num", s.seq));
    if (s.seqLabel) cell.append(div("seq-label", s.seqLabel));
    return cell;
  }

  /* -------------------------------- rendering -------------------------------- */

  function render(panelId) {
    const panel = panelEl(panelId);
    if (!panel) return;
    const body = panel.querySelector('[data-role="body"]');
    const count = panel.querySelector('[data-role="count"]');
    body.textContent = "";
    for (const strip of state[panelId]) {
      const el = buildStrip(panelId, strip);
      if (calling.has(strip.callsign) &&
          (panelId === "PL" || panelId === "CL" || panelId === "APR1")) {
        const type = panelId === "PL" ? "clearance"
          : panelId === "CL" ? "pushback" : "taxi";
        el.classList.add("strip--calling");
        el.dataset.call = type;
        el.title = type === "clearance" ? "Calling for clearance"
          : type === "pushback" ? "Calling for pushback"
          : "Ready to taxi";
      }
      body.append(el);
    }
    count.textContent = String(state[panelId].length);
  }

  function renderAll() {
    for (const panelId of Object.keys(state)) render(panelId);
    renderRwBar();
  }

  /** One simulation step: each panel may raise a new call only when it
      has none pending — one highlight at a time per panel, but PL and
      CL can call simultaneously.  A call stays pending until the strip
      leaves the panel (cleared / pushback approved) or the sim stops. */
  function simTick() {
    for (const panelId of ["PL", "CL", "APR1"]) {
      if (state[panelId].some((s) => calling.has(s.callsign))) continue;
      const pool = state[panelId].filter(
        (s) => !calling.has(s.callsign) && !(panelId === "APR1" && s.spot)
      );
      if (!pool.length) continue;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      calling.add(pick.callsign);
      render(panelId);
    }
  }

  function renderSimButton() {
    const btn = document.querySelector('[data-action="sim-toggle"]');
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(simTimer !== null));
    btn.title = simTimer ? "Stop simulation" : "Start simulation";
  }

  /** Active-runway bar: value box + pressed state of the 35s/17s buttons. */
  function renderRwBar() {
    const bar = document.querySelector(".rwbar");
    if (!bar) return;
    const value = bar.querySelector('[data-role="rw-value"]');
    if (value) value.textContent = activeRwy === "35" ? "35L/35R" : "17L/17R";
    const b35 = bar.querySelector('[data-action="rwy-35"]');
    const b17 = bar.querySelector('[data-action="rwy-17"]');
    if (b35) b35.setAttribute("aria-pressed", String(activeRwy === "35"));
    if (b17) b17.setAttribute("aria-pressed", String(activeRwy === "17"));
  }

  /* ------------------------------ public API ------------------------------ */

  const StripBoard = {
    /** Ids of every panel on the board. */
    panels: Object.keys(state),

    /** Copy of the current strips in one panel. */
    getState(panelId) {
      return panelId ? state[panelId].slice() : JSON.parse(JSON.stringify(state));
    },

    /** Append one strip to a panel and re-render it. */
    addStrip(panelId, strip) {
      if (!state[panelId]) throw new Error("Unknown panel: " + panelId);
      state[panelId].push(strip || {});
      render(panelId);
      return this;
    },

    /** Replace every strip in a panel (pass [] to empty it). */
    setStrips(panelId, strips) {
      if (!state[panelId]) throw new Error("Unknown panel: " + panelId);
      state[panelId] = (strips || []).slice();
      render(panelId);
      return this;
    },

    /** Remove every strip from a panel. */
    clear(panelId) {
      return this.setStrips(panelId, []);
    },

    /** Sort a panel's strips by seq/gate number, ascending. */
    sort(panelId) {
      if (!state[panelId]) throw new Error("Unknown panel: " + panelId);
      const key = (s) => parseInt(s.seq !== undefined ? s.seq : s.gate, 10) || 0;
      state[panelId].sort((a, b) => key(a) - key(b));
      render(panelId);
      return this;
    },

    /** Load the planned-departure dataset into the PL panel. */
    loadPlStrips() {
      return this.setStrips("PL", (window.PL_STRIP_DATA || []).slice());
    },

    /** Active runway configuration ("35" or "17"). */
    getActiveRwy() {
      return activeRwy;
    },

    setActiveRwy(rwy) {
      if (rwy !== "35" && rwy !== "17") throw new Error("Runway must be 35 or 17");
      activeRwy = rwy;
      renderRwBar();
      return this;
    },

    /** Clearance issued from the PL panel: gate strips move to CL,
        remote-apron strips disappear from the board. */
    clearToCL(strip) {
      if (!state.PL.includes(strip)) return this;
      if (isMainApronGate(strip.gate)) this.moveStrip(strip, "CL");
      else this.removeStrip(strip);
      return this;
    },

    /** True if the parking location is an Apron 1 gate. */
    isMainApronGate,

    /** Move a strip to another panel, keeping every assigned value. */
    moveStrip(strip, toPanel) {
      if (!state[toPanel]) throw new Error("Unknown panel: " + toPanel);
      const from = Object.keys(state).find((p) => state[p].includes(strip));
      if (from === undefined || from === toPanel) return this;
      state[from].splice(state[from].indexOf(strip), 1);
      calling.delete(strip.callsign);
      /* apron panels show gate/destination in their first columns */
      if (PANEL_TYPES[toPanel] === "apr") {
        if (strip.seq === undefined) strip.seq = strip.gate;
        if (strip.origin === undefined) strip.origin = strip.dest;
      }
      state[toPanel].push(strip);
      render(from);
      render(toPanel);
      return this;
    },

    /** Remove a strip from the board entirely. */
    removeStrip(strip) {
      const from = Object.keys(state).find((p) => state[p].includes(strip));
      if (from === undefined) return this;
      if (strip.spotTimer) clearTimeout(strip.spotTimer);
      state[from].splice(state[from].indexOf(strip), 1);
      calling.delete(strip.callsign);
      render(from);
      return this;
    },

    /** Assign a spot (dashed stand line) to an APR 1 strip: the spot
        shows above the waypoint, the strip is disabled and parked on
        the right, and it disappears after a random 10-15 s. */
    assignSpot(strip, spot) {
      if (!state.APR1.includes(strip)) return this;
      strip.spot = String(spot);
      calling.delete(strip.callsign);
      if (strip.spotTimer) clearTimeout(strip.spotTimer);
      strip.spotTimer = setTimeout(
        () => StripBoard.removeStrip(strip),
        10000 + Math.random() * 5000
      );
      render("APR1");
      return this;
    },

    /* ------------------------------ simulation ------------------------------ */

    isSimulationRunning() {
      return simTimer !== null;
    },

    /** Start the simulation: each panel raises at most one call at a
        time — PL strips flash yellow calling for clearance, CL strips
        flash orange calling for pushback.  A call persists until the
        strip leaves the panel or the simulation stops. */
    startSimulation() {
      if (simTimer) return this;
      simTimer = setInterval(simTick, SIM_INTERVAL_MS);
      renderSimButton();
      simTick();
      return this;
    },

    stopSimulation() {
      if (simTimer) {
        clearInterval(simTimer);
        simTimer = null;
      }
      calling.clear();
      renderSimButton();
      render("PL");
      render("CL");
      return this;
    },

    render,
    renderAll
  };

  window.StripBoard = StripBoard;

  /* --------------------------- header interactions --------------------------- */

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const panel = btn.closest(".panel");
    const panelId = panel ? panel.dataset.panel : null;

    switch (btn.dataset.action) {
      case "sort":
        if (panelId) StripBoard.sort(panelId);
        break;
      case "early-dep":
        btn.setAttribute(
          "aria-pressed",
          btn.getAttribute("aria-pressed") === "true" ? "false" : "true"
        );
        break;
      case "load-strips":
        StripBoard.loadPlStrips();
        break;
      case "rwy-35":
        StripBoard.setActiveRwy("35");
        break;
      case "rwy-17":
        StripBoard.setActiveRwy("17");
        break;
      case "sim-toggle":
        if (StripBoard.isSimulationRunning()) StripBoard.stopSimulation();
        else StripBoard.startSimulation();
        break;
      case "cut":
      case "print":
        /* hooked up later — visual press feedback only for now */
        break;
    }
  });

  /* Next-action column (PL and CL): opens the EDIT IFR clearance popup.
     Its full purpose will be described later. */
  document.addEventListener("click", (event) => {
    const cell = event.target.closest('.panel[data-panel="PL"] .cell--action, .panel[data-panel="CL"] .cell--action, .panel[data-panel="APR1"] .cell--action');
    if (!cell) return;
    const panelId = cell.closest(".panel").dataset.panel;
    const strip = state[panelId].find((s) => s.callsign === cell.dataset.callsign);
    if (!strip) return;
    if (panelId === "CL") {
      /* next action in CL: pushback approved -> apron control */
      StripBoard.moveStrip(strip, "APR1");
      return;
    }
    if (panelId === "APR1") {
      /* next action in APR 1: open the Spot menu until a spot is set */
      if (!strip.spot && typeof window.openSpotMenu === "function") {
        window.openSpotMenu(strip);
      }
      return;
    }
    if (typeof window.openStripEditor === "function") {
      window.openStripEditor(strip);
    }
  });

  /* --------------------- drag & drop: CL back to PL --------------------- */

  let dragging = null;   /* { callsign, from } while a strip is dragged */

  function dropTargetBody(event) {
    const body = event.target.closest
      ? event.target.closest('.panel[data-panel="PL"] .panel__body')
      : null;
    return body;
  }

  function clearDropHighlight() {
    document.querySelectorAll(".panel__body.is-drop-target")
      .forEach((b) => b.classList.remove("is-drop-target"));
  }

  document.addEventListener("dragstart", (event) => {
    const el = event.target.closest ? event.target.closest(".strip--draggable") : null;
    if (!el) return;
    dragging = { callsign: el.dataset.callsign, from: el.dataset.panel };
    event.dataTransfer.setData("text/plain", el.dataset.callsign);
    event.dataTransfer.effectAllowed = "move";
    el.classList.add("is-dragging");
  });

  document.addEventListener("dragend", () => {
    dragging = null;
    document.querySelectorAll(".strip.is-dragging")
      .forEach((s) => s.classList.remove("is-dragging"));
    clearDropHighlight();
  });

  document.addEventListener("dragover", (event) => {
    if (!dragging || dragging.from !== "CL") return;
    const body = dropTargetBody(event);
    if (!body) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    body.classList.add("is-drop-target");
  });

  document.addEventListener("dragleave", (event) => {
    const body = dropTargetBody(event);
    if (body && !body.contains(event.relatedTarget)) {
      body.classList.remove("is-drop-target");
    }
  });

  document.addEventListener("drop", (event) => {
    const body = dropTargetBody(event);
    if (!body) return;
    event.preventDefault();
    clearDropHighlight();
    if (!dragging || dragging.from !== "CL") return;
    const callsign = event.dataTransfer.getData("text/plain") || dragging.callsign;
    const strip = state.CL.find((s) => s.callsign === callsign);
    if (strip) StripBoard.moveStrip(strip, "PL");   /* keeps assigned info */
    dragging = null;
  });

  /* Start with an empty board: headers show 0, bodies show nothing. */
  renderAll();
})();
