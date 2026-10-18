# yyc_ — YYC Strip Board

A web application that mimics an electronic air-traffic-control flight-strip
board (tower/terminal strip display). The board is laid out as four panels:

| Panel     | Position     | Purpose                          |
|-----------|--------------|----------------------------------|
| `PL`      | left column  | Preference list (departure strips, `EARLY DEP` / `SORT` controls, cut icon) |
| `CL`      | middle column| Clearance list                   |
| `APR 1`   | right, top   | Apron 1 (print icon)             |
| `APR TSF` | right, bottom| Apron transfer                   |

The board **starts empty** — every panel shows a count of `0` and no strips.
The PL header's **LOAD STRIPS** button loads a planned-departure dataset
(`js/pl-data.js`, 30 YYC departures); other strips can be added at runtime
through the `StripBoard` API.

## PL strip columns

| # | Column | Content |
|---|--------|---------|
| 1 | parking | Apron 1 gate (1-6, 11-24, 31-40, 50-59, 70-76, 78-92, 94-97) or apron R3-R9; intl 70-83, US 84-97, domestic 1-83, cargo R7/R9 |
| 2 | destination | 4-letter ICAO (e.g. `CYVR`) |
| 3 | aircraft | cyan callsign over wake (`L/M/H`, H in orange) + ICAO type + 4-digit squawk |
| 4 | blank | reserved |
| 5 | waypoint | initial IFR fix, jet/prop appropriate (35L: BITGA IPSIT BOTAG / PEVLU AGMAK ROVMA; 35R: AVROM LOMLO / SAXOL VETBI; both: OTARA DUMRA NOSIV GADKI UBVAL) |
| 6 | runway | blank, dim `RWY` placeholder until assigned |
| 7 | SID | blank holder until assigned |
| 8 | action | whole column clickable — opens the EDIT IFR clearance popup |

## Active runway bar

A bar above the board shows the active runway configuration (`35L/35R` or
`17L/17R`). The `35s` / `17s` push-buttons switch it (`StripBoard.setActiveRwy`).

## EDIT IFR popup

Clicking a PL strip's last column opens a modal clearance window modelled on
the classic editor (`js/editor.js`, `editor.css`): blue title bar
(`EDIT IFR - <CALLSIGN>`), CLEARANCE INFO fields pre-filled from the strip
(ACID, DEST, CAT, SSR, LOCATION, TYPE, ROUTE), SID / DEP RWY / LOCATION /
DE-ICE button groups, FLOW INFORMATION boxes, and system buttons
(XBLD, RUIP, NADP, W GND, CLX ISSUED). Closes via the **X** button at the
bottom, a click outside the window, or Escape.

Live popup controls:

* clicking a **SID** option assigns it — the SID appears in the strip's SID
  column and in the popup's SID field (selected option stays pressed)
* clicking a **DEP RWY** option assigns the runway — shown bold in the
  strip's RWY column (`NC` variants add an orange NC marker) and in the
  popup's DEP RWY field
* **CLX ISSUED** clears the aircraft: strips parked at an Apron 1 gate
  move to the CL panel keeping the exact same strip layout and every
  assigned value; strips parked on remote aprons (R3-R9) disappear from
  the board.  The next-action column stays live on CL strips.

## APR 1 spots

The next-action column of an APR 1 strip shows the dim placeholder
`SPOT`. Clicking it opens the **Spot menu** (`js/spots.js`, `spots.css`):
a stylised apron chart (concourses A-E, gate circles for reference) whose
clickable spots are the dashed stand lines **4-11 and 14-24**; spots already
in use are greyed out. Closes via its X, outside click, or Escape.

Picking a spot:

* the spot number appears in big font above the IFR waypoint, which
  shrinks to a small font
* the strip is disabled (dimmed, inert) and parked on the right side of
  the APR 1 panel
* it disappears from the board after a random 10-15 s

## Simulation

The play button next to the runway switch starts/stops the simulation.
While running, each panel raises at most **one call at a time** (PL and
CL may call simultaneously):

* a **PL** strip flashes yellow — plane calling for clearance
  (answer: open the EDIT IFR popup and issue the clearance)
* a **CL** strip flashes orange — plane calling for pushback
  (answer: next-action click moves it to APR 1)
* an **APR 1** strip (without a spot yet) flashes green — ready to taxi
  (answer: assign a spot via the Spot menu)

A call persists — and blocks any new call in that panel — until the
highlighted strip leaves the panel (clearance issued, pushback approved,
or dragged away) or the simulation stops
(`StripBoard.startSimulation()` / `stopSimulation()`).

## Moving strips back: CL -> PL

CL strips are draggable (`cursor: grab`).  Dropping one on the PL panel
moves it back without clearing any assigned information; the PL body
highlights while a CL strip is dragged over it
(`StripBoard.moveStrip(strip, panel)` does the same programmatically).

## Run

```bash
npm start          # or: node server.js   (PORT env var optional, default 3000)
```

Then open http://localhost:3000 — no build step, no dependencies.

## Layout & files

```
index.html    panel chrome (headers, counts, icon/push buttons, bodies)
styles.css    strip-board look: grey panels, black strip grid, cyan callsigns,
              yellow FLOW tags, orange annotations, classic scrollbars
js/pl-data.js planned-departure dataset loaded by the LOAD STRIPS button
js/board.js   strip data model + renderer + public API (starts empty)
server.js     zero-dependency static file server (binds 0.0.0.0)
```

## Strip API (browser console / future code)

```js
StripBoard.addStrip("PL", {
  gate: "52", dest: "CYYZ", callsign: "ACA142",
  wake: "M", type: "A321", squawk: "1201", fix: "LOMLO"
});
StripBoard.loadPlStrips();  // same as pressing LOAD STRIPS

StripBoard.addStrip("CL", {
  seq: 19, origin: "CYEG", originTime: "1645",
  callsign: "ANT701", wake: "M", type: "B734", extra: "7334",
  fix: "BITGA", rwy: "35L", sid: "COW2"
});

StripBoard.addStrip("APR1", {
  seq: 86, origin: "MMUN", callsign: "WJA2310",
  wake: "H", wakeOrange: true, type: "B789",
  fix: "NOSIV", rwy: "35R", sid: "COW2", spot: "SPOT"
});

StripBoard.sort("PL");        // sort by seq
StripBoard.clear("CL");       // empty a panel
StripBoard.getState();        // snapshot of all panels
```

Supported strip fields — PL: `gate`, `dest`, `callsign`, `wake`, `type`,
`squawk`, `fix`, `action`; CL/APR: `seq`, `seqLabel`, `origin`, `originTime`,
`flow` (yellow tag), `callsign`, `wake`, `wakeOrange`, `type`, `extra`, `fix`,
`rwy`, `sid`, `sidOrange`, `spot`.
