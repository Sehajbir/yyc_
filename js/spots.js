/* =====================================================================
   Spot menu — apron chart popup (YYC terminal chart, stylised).
   Opened from the next-action column of an APR 1 strip.  The clickable
   spots are the dashed stand lines numbered 4-11 and 14-24; gates are
   drawn for reference only.  Clicking a free spot assigns it via
   StripBoard.assignSpot().
   ===================================================================== */

(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  /* gate circles [num, x, y] — reference only */
  const GATES = [
    [6, 300, 76], [5, 300, 99], [4, 300, 123], [3, 300, 148], [2, 300, 172], [1, 300, 197],
    [12, 293, 221], [14, 262, 220], [16, 232, 220], [18, 203, 220], [20, 172, 236],
    [19, 163, 268], [17, 178, 302], [15, 207, 311], [13, 237, 292], [11, 267, 308],
    [21, 313, 301], [22, 318, 331], [23, 325, 359], [24, 332, 386],
    [32, 322, 447], [34, 300, 462], [36, 281, 484], [38, 287, 512], [40, 307, 527],
    [39, 333, 538], [37, 355, 516], [35, 365, 489], [33, 375, 465], [31, 394, 467],
    [50, 458, 484], [52, 458, 513], [54, 458, 542], [56, 462, 574], [58, 487, 590],
    [59, 512, 590], [57, 537, 574], [55, 537, 542], [53, 537, 513], [51, 537, 484],
    [70, 617, 467], [71, 627, 487], [72, 637, 507], [73, 627, 527], [76, 637, 592],
    [78, 687, 615], [79, 687, 585], [74, 687, 542], [75, 687, 515], [80, 737, 512], [81, 747, 484],
    [82, 737, 420], [83, 757, 407], [84, 777, 494], [85, 797, 494], [86, 797, 428],
    [87, 817, 402], [88, 837, 502], [89, 857, 478], [90, 857, 428], [91, 867, 402],
    [92, 907, 484], [94, 927, 428], [95, 927, 407], [96, 962, 417], [97, 972, 440]
  ];

  /* clickable spots (dashed stand lines) [num, x, y] */
  const SPOTS = [
    [4, 157, 203], [5, 137, 257], [6, 147, 337], [7, 172, 347],
    [8, 237, 517], [9, 247, 552], [10, 297, 607], [11, 347, 567],
    [14, 527, 662], [15, 577, 667], [16, 687, 662], [17, 757, 607],
    [18, 847, 562], [19, 877, 632], [20, 907, 562], [21, 977, 542],
    [22, 977, 477], [23, 977, 387], [24, 947, 372]
  ];

  /* black concourse / terminal shapes */
  const SHAPES = [
    ["rect", { x: 210, y: 248, width: 170, height: 26 }],
    ["rect", { x: 318, y: 70, width: 6, height: 140 }],
    ["path", { d: "M338,232 C430,248 492,320 512,412 L560,438 C548,330 470,244 372,222 Z" }],
    ["polygon", { points: "318,432 348,408 402,478 372,502" }],
    ["rect", { x: 402, y: 214, width: 58, height: 52, transform: "rotate(8 431 240)" }],
    ["rect", { x: 462, y: 272, width: 40, height: 26, transform: "rotate(20 482 285)" }],
    ["rect", { x: 498, y: 282, width: 34, height: 26, transform: "rotate(15 515 295)" }],
    ["rect", { x: 528, y: 332, width: 40, height: 30, transform: "rotate(20 548 347)" }],
    ["rect", { x: 712, y: 344, width: 14, height: 14, transform: "rotate(45 719 351)" }],
    ["rect", { x: 478, y: 468, width: 20, height: 96 }],
    ["rect", { x: 648, y: 462, width: 20, height: 116 }],
    ["polygon", { points: "668,442 760,442 760,464 700,500" }],
    ["rect", { x: 760, y: 442, width: 152, height: 22 }]
  ];

  const LABELS = [
    ["Concourse A", 295, 266, 0],
    ["Concourse B", 362, 452, 48],
    ["Concourse C", 488, 516, 90],
    ["Concourse D", 658, 520, 90],
    ["Concourse E", 836, 457, 0]
  ];

  let current = null;

  function svgEl(name, attrs, text) {
    const n = document.createElementNS(SVG_NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function takenSpots() {
    const set = new Set();
    if (!window.StripBoard) return set;
    for (const p of window.StripBoard.panels) {
      for (const s of window.StripBoard.getState(p)) {
        if (s.spot) set.add(String(s.spot));
      }
    }
    return set;
  }

  function buildChart(strip, taken) {
    const svg = svgEl("svg", { viewBox: "0 0 1018 764", role: "img", "aria-label": "Apron spot chart" });

    for (const [name, attrs] of SHAPES) svg.append(svgEl(name, Object.assign({ fill: "#000000" }, attrs)));
    for (const [text, x, y, rot] of LABELS) {
      svg.append(svgEl("text", {
        x, y, fill: "#ffffff", "font-size": 13, "font-weight": 700,
        "text-anchor": "middle", "font-family": "inherit",
        transform: rot ? `rotate(${rot} ${x} ${y})` : ""
      }, text));
    }
    for (const [n, x, y] of GATES) {
      const g = svgEl("g", { class: "gate-circle" });
      g.append(svgEl("circle", { cx: x, cy: y, r: 11 }));
      g.append(svgEl("text", { x, y: y + 3.5 }, String(n)));
      svg.append(g);
    }
    for (const [n, x, y] of SPOTS) {
      const free = !taken.has(String(n));
      const g = svgEl("g", { class: "spot" + (free ? "" : " spot--taken"), tabindex: free ? 0 : -1 });
      g.dataset.spot = String(n);
      g.append(svgEl("line", { x1: x - 24, y1: y, x2: x - 10, y2: y }));
      g.append(svgEl("text", { x, y: y + 4 }, String(n)));
      g.append(svgEl("circle", { cx: x, cy: y, r: 13, fill: "transparent" }));
      if (free) {
        g.addEventListener("click", () => {
          if (window.StripBoard) window.StripBoard.assignSpot(strip, n);
          close();
        });
      }
      svg.append(g);
    }
    return svg;
  }

  function build(strip) {
    const overlay = document.createElement("div");
    overlay.className = "spot-overlay";
    const win = document.createElement("div");
    win.className = "spotwin";
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-modal", "true");
    win.setAttribute("aria-label", "SPOT - " + (strip.callsign || ""));

    const title = document.createElement("div");
    title.className = "editor__titlebar spot-title";
    title.append(document.createTextNode("SPOT - " + (strip.callsign || "")));
    const x = document.createElement("button");
    x.type = "button";
    x.className = "spot-x";
    x.dataset.action = "spot-close";
    x.textContent = "X";
    title.append(x);
    win.append(title);
    win.append(buildChart(strip, takenSpots()));

    overlay.append(win);
    return overlay;
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
    current.addEventListener("click", (event) => {
      if (event.target === current) close();
      else if (event.target.closest('[data-action="spot-close"]')) close();
    });
    document.body.append(current);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  window.openSpotMenu = open;
  window.closeSpotMenu = close;
})();
