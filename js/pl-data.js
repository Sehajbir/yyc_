/* =====================================================================
   PL (planned) strip dataset — departures out of CYYC (Calgary).
   Loaded into the PL panel by the "LOAD STRIPS" header button.

   Rules honoured when this data was built:
     * Parking: Apron 1 gates 1-6, 11-24, 31-40, 50-59, 70-76, 78-92,
       94-97, or remote aprons R3-R9.
         - international departures: gates 70-83
         - domestic departures:      gates 1-83
         - US departures:            gates 84-97
         - cargo:                    R7 / R9
     * Waypoint (initial IFR fix) by aircraft class:
         35L/17R  PROP:      PEVLU AGMAK ROVMA
         35L/17R  JET:       BITGA IPSIT BOTAG
         35L/17R  PROP+JET:  OTARA DUMRA
         35R/17L  PROP:      SAXOL VETBI
         35R/17L  JET:       AVROM LOMLO
         35R/17L  PROP+JET:  NOSIV GADKI UBVAL
       Jets only receive JET (or PROP+JET) fixes, props only PROP
       (or PROP+JET) fixes.
     * RWY and SID are left unassigned (user assigns them later).
   ===================================================================== */

window.PL_STRIP_DATA = [
  /* ---------------- domestic (gates 1-83) ---------------- */
  { gate: "2",  dest: "CYXY", callsign: "ANT551",  wake: "M", type: "AT43", squawk: "6105", fix: "AGMAK" },  /* Air North ATR42, prop */
  { gate: "3",  dest: "CYVR", callsign: "ACA118",  wake: "M", type: "A21N", squawk: "1201", fix: "BOTAG" },  /* Air Canada A321neo */
  { gate: "5",  dest: "CYVR", callsign: "WJA214",  wake: "M", type: "B38M", squawk: "1203", fix: "LOMLO" },  /* WestJet 737 MAX 8 */
  { gate: "12", dest: "CYYZ", callsign: "ACA345",  wake: "M", type: "B38M", squawk: "2105", fix: "BITGA" },
  { gate: "14", dest: "CYYZ", callsign: "WJA604",  wake: "M", type: "B738", squawk: "2106", fix: "IPSIT" },
  { gate: "16", dest: "CYKA", callsign: "WEN312",  wake: "M", type: "DH8D", squawk: "3402", fix: "SAXOL" },  /* Encore Q400, prop */
  { gate: "18", dest: "CYQR", callsign: "WEN381",  wake: "M", type: "DH8D", squawk: "3405", fix: "VETBI" },
  { gate: "21", dest: "CYWG", callsign: "FLE812",  wake: "M", type: "B738", squawk: "4106", fix: "AVROM" },  /* Flair */
  { gate: "24", dest: "CYEG", callsign: "POE213",  wake: "M", type: "E295", squawk: "4102", fix: "OTARA" },  /* Porter E195-E2 */
  { gate: "31", dest: "CYUL", callsign: "ACA246",  wake: "M", type: "A20N", squawk: "4521", fix: "BITGA" },
  { gate: "35", dest: "CYOW", callsign: "WJA322",  wake: "M", type: "B38M", squawk: "4522", fix: "LOMLO" },
  { gate: "38", dest: "CYMM", callsign: "CGJ118",  wake: "M", type: "B738", squawk: "5203", fix: "IPSIT" },  /* Canada Jetlines */
  { gate: "52", dest: "CYYZ", callsign: "SWG512",  wake: "M", type: "B738", squawk: "5206", fix: "BOTAG" },  /* Sunwing */
  { gate: "55", dest: "CYHZ", callsign: "ACA659",  wake: "M", type: "A21N", squawk: "5307", fix: "AVROM" },
  { gate: "58", dest: "CYYJ", callsign: "WEN418",  wake: "M", type: "DH8D", squawk: "6102", fix: "PEVLU" },

  /* ---------------- international (gates 70-83) ---------------- */
  { gate: "71", dest: "EGLL", callsign: "ACA854",  wake: "H", type: "B789", squawk: "6305", fix: "LOMLO" },  /* London Heathrow */
  { gate: "72", dest: "EHAM", callsign: "KLM678",  wake: "H", type: "B789", squawk: "6306", fix: "AVROM" },  /* Amsterdam */
  { gate: "74", dest: "EDDF", callsign: "CFG842",  wake: "H", type: "A339", squawk: "6307", fix: "BITGA" },  /* Condor, Frankfurt */
  { gate: "76", dest: "MMUN", callsign: "SWG774",  wake: "M", type: "B38M", squawk: "7106", fix: "GADKI" },  /* Cancun */
  { gate: "78", dest: "MMSD", callsign: "WJA1802", wake: "M", type: "B38M", squawk: "7102", fix: "NOSIV" },  /* San Jose del Cabo */
  { gate: "80", dest: "MMMX", callsign: "AMX674",  wake: "M", type: "A20N", squawk: "7205", fix: "UBVAL" },  /* Mexico City */

  /* ---------------- US transborder (gates 84-97) ---------------- */
  { gate: "85", dest: "KSEA", callsign: "ASA112",  wake: "M", type: "B739", squawk: "7405", fix: "AVROM" },  /* Alaska, Seattle */
  { gate: "88", dest: "KDEN", callsign: "UAL512",  wake: "M", type: "B738", squawk: "6502", fix: "BITGA" },  /* United, Denver */
  { gate: "90", dest: "KORD", callsign: "AAL2381", wake: "M", type: "A321", squawk: "6503", fix: "IPSIT" },  /* American, Chicago */
  { gate: "92", dest: "KLAX", callsign: "DAL2214", wake: "M", type: "A20N", squawk: "6505", fix: "BOTAG" },  /* Delta, Los Angeles */
  { gate: "95", dest: "KPHX", callsign: "WN1432",  wake: "M", type: "B737", squawk: "6701", fix: "LOMLO" },  /* Southwest, Phoenix */
  { gate: "96", dest: "KSFO", callsign: "UAL2158", wake: "M", type: "B739", squawk: "6703", fix: "AVROM" },  /* United, San Francisco */

  /* ---------------- cargo (R7 / R9) + GA remote ---------------- */
  { gate: "R7", dest: "CYHM", callsign: "CJT502",  wake: "H", type: "B763", squawk: "4201", fix: "NOSIV" },  /* Cargojet, Hamilton */
  { gate: "R9", dest: "KMEM", callsign: "FDX139",  wake: "H", type: "MD11", squawk: "4203", fix: "GADKI" },  /* FedEx, Memphis */
  { gate: "R3", dest: "CYBW", callsign: "N482BB",  wake: "L", type: "C172", squawk: "1207", fix: "ROVMA" }   /* GA Skyhawk, prop (light) */
];
