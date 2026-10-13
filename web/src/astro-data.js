/* StarSource reference tables: signs, bodies, points, aspects, house systems, dignities.
   Plain data, no DOM. Sources: Ptolemy, Tetrabiblos I.17–21 (domiciles, exaltations, Egyptian bounds,
   triplicities after Dorotheus), Chaldean faces as in Brennan, Hellenistic Astrology ch. 9;
   modern rulers and minor aspects after Hand, Horoscope Symbols. */
(function (root) {
  "use strict";
  const VS = "︎"; // text presentation selector: keeps ♈ ☉ … from turning into emoji
  const g = s => s + VS;

  const SIGNS = [
    ["aries", "Aries", "♈", "fire", "cardinal", "mars", null, "sun", 19],
    ["taurus", "Taurus", "♉", "earth", "fixed", "venus", null, "moon", 3],
    ["gemini", "Gemini", "♊", "air", "mutable", "mercury", null, null, null],
    ["cancer", "Cancer", "♋", "water", "cardinal", "moon", null, "jupiter", 15],
    ["leo", "Leo", "♌", "fire", "fixed", "sun", null, null, null],
    ["virgo", "Virgo", "♍", "earth", "mutable", "mercury", null, "mercury", 15],
    ["libra", "Libra", "♎", "air", "cardinal", "venus", null, "saturn", 21],
    ["scorpio", "Scorpio", "♏", "water", "fixed", "mars", "pluto", null, null],
    ["sagittarius", "Sagittarius", "♐", "fire", "mutable", "jupiter", null, null, null],
    ["capricorn", "Capricorn", "♑", "earth", "cardinal", "saturn", null, "mars", 28],
    ["aquarius", "Aquarius", "♒", "air", "fixed", "saturn", "uranus", null, null],
    ["pisces", "Pisces", "♓", "water", "mutable", "jupiter", "neptune", "venus", 27]
  ].map(([key, name, glyph, element, modality, ruler, modern, exalt, exaltDeg], i) => ({
    i, key, name, glyph: g(glyph), element, modality, polarity: i % 2 === 0 ? "masculine" : "feminine",
    ruler, modern: modern || ruler, exalt, exaltDeg
  }));
  // detriment = ruler of the opposite sign, fall = exalted planet of the opposite sign
  SIGNS.forEach(s => { const o = SIGNS[(s.i + 6) % 12]; s.detriment = o.ruler; s.fall = o.exalt; });

  const ELEMENTS = { fire: { name: "Fire", c: "var(--el-fire)" }, earth: { name: "Earth", c: "var(--el-earth)" }, air: { name: "Air", c: "var(--el-air)" }, water: { name: "Water", c: "var(--el-water)" } };
  const MODALITIES = { cardinal: "Cardinal", fixed: "Fixed", mutable: "Mutable" };

  /* Bodies the engine computes. id = Swiss Ephemeris body number; node/lilith ids are picked from settings. */
  const BODIES = [
    { key: "sun", name: "Sun", glyph: g("☉"), id: 0, cls: "luminary", on: true, orbBonus: 2 },
    { key: "moon", name: "Moon", glyph: g("☽"), id: 1, cls: "luminary", on: true, orbBonus: 2 },
    { key: "mercury", name: "Mercury", glyph: g("☿"), id: 2, cls: "personal", on: true },
    { key: "venus", name: "Venus", glyph: g("♀"), id: 3, cls: "personal", on: true },
    { key: "mars", name: "Mars", glyph: g("♂"), id: 4, cls: "personal", on: true },
    { key: "jupiter", name: "Jupiter", glyph: g("♃"), id: 5, cls: "social", on: true },
    { key: "saturn", name: "Saturn", glyph: g("♄"), id: 6, cls: "social", on: true },
    { key: "uranus", name: "Uranus", glyph: g("♅"), id: 7, cls: "outer", on: true },
    { key: "neptune", name: "Neptune", glyph: g("♆"), id: 8, cls: "outer", on: true },
    { key: "pluto", name: "Pluto", glyph: g("♇"), id: 9, cls: "outer", on: true },
    { key: "node", name: "North Node", glyph: g("☊"), id: 11, cls: "point", on: true, alt: { mean: 10, true: 11 } },
    { key: "snode", name: "South Node", glyph: g("☋"), id: null, cls: "point", on: true, derived: "node" },
    { key: "lilith", name: "Black Moon Lilith", glyph: g("⚸"), id: 12, cls: "point", on: false, alt: { mean: 12, oscu: 13 } },
    { key: "chiron", name: "Chiron", glyph: g("⚷"), id: 15, cls: "asteroid", on: true },
    { key: "ceres", name: "Ceres", glyph: g("⚳"), id: 17, cls: "asteroid", on: false },
    { key: "pallas", name: "Pallas", glyph: g("⚴"), id: 18, cls: "asteroid", on: false },
    { key: "juno", name: "Juno", glyph: g("⚵"), id: 19, cls: "asteroid", on: false },
    { key: "vesta", name: "Vesta", glyph: g("⚶"), id: 20, cls: "asteroid", on: false }
  ];
  /* Chart points computed from houses / lots */
  const POINTS = [
    { key: "asc", name: "Ascendant", glyph: "AC", on: true },
    { key: "mc", name: "Midheaven", glyph: "MC", on: true },
    { key: "dsc", name: "Descendant", glyph: "DC", on: false },
    { key: "ic", name: "Imum Coeli", glyph: "IC", on: false },
    { key: "vertex", name: "Vertex", glyph: "Vx", on: false },
    { key: "fortune", name: "Lot of Fortune", glyph: g("⊗"), on: true },
    { key: "spirit", name: "Lot of Spirit", glyph: "⊙", on: false }
  ];

  /* Aspects. orb = default orb in degrees; harmonic = 360/angle division; family for colour. */
  const ASPECTS = [
    { key: "conj", name: "Conjunction", angle: 0, glyph: g("☌"), harmonic: 1, cls: "major", orb: 8, family: "conj", on: true },
    { key: "opp", name: "Opposition", angle: 180, glyph: g("☍"), harmonic: 2, cls: "major", orb: 8, family: "hard", on: true },
    { key: "tri", name: "Trine", angle: 120, glyph: "△", harmonic: 3, cls: "major", orb: 7, family: "soft", on: true },
    { key: "sq", name: "Square", angle: 90, glyph: "□", harmonic: 4, cls: "major", orb: 7, family: "hard", on: true },
    { key: "sext", name: "Sextile", angle: 60, glyph: g("⚹"), harmonic: 6, cls: "major", orb: 5, family: "soft", on: true },
    { key: "qcx", name: "Quincunx", angle: 150, glyph: g("⚻"), harmonic: 12, cls: "minor", orb: 3, family: "minor", on: true },
    { key: "ssx", name: "Semi-sextile", angle: 30, glyph: g("⚺"), harmonic: 12, cls: "minor", orb: 2, family: "minor", on: true },
    { key: "ssq", name: "Semi-square", angle: 45, glyph: "∠", harmonic: 8, cls: "minor", orb: 2, family: "hard", on: true },
    { key: "sesq", name: "Sesquiquadrate", angle: 135, glyph: g("⚼"), harmonic: 8, cls: "minor", orb: 2, family: "hard", on: true },
    { key: "qnt", name: "Quintile", angle: 72, glyph: "Q", harmonic: 5, cls: "harmonic", orb: 1.5, family: "creative", on: false },
    { key: "bqnt", name: "Biquintile", angle: 144, glyph: "bQ", harmonic: 5, cls: "harmonic", orb: 1.5, family: "creative", on: false },
    { key: "sept", name: "Septile", angle: 360 / 7, glyph: "S", harmonic: 7, cls: "harmonic", orb: 1, family: "creative", on: false },
    { key: "bsept", name: "Biseptile", angle: 720 / 7, glyph: "bS", harmonic: 7, cls: "harmonic", orb: 1, family: "creative", on: false },
    { key: "tsept", name: "Triseptile", angle: 1080 / 7, glyph: "tS", harmonic: 7, cls: "harmonic", orb: 1, family: "creative", on: false },
    { key: "nov", name: "Novile", angle: 40, glyph: "N", harmonic: 9, cls: "harmonic", orb: 1, family: "creative", on: false },
    { key: "bnov", name: "Binovile", angle: 80, glyph: "bN", harmonic: 9, cls: "harmonic", orb: 1, family: "creative", on: false },
    { key: "qnov", name: "Quadranovile", angle: 160, glyph: "qN", harmonic: 9, cls: "harmonic", orb: 1, family: "creative", on: false },
    { key: "dec", name: "Decile", angle: 36, glyph: "D", harmonic: 10, cls: "harmonic", orb: 1, family: "creative", on: false },
    { key: "tdec", name: "Tredecile", angle: 108, glyph: "tD", harmonic: 10, cls: "harmonic", orb: 1, family: "creative", on: false },
    { key: "und", name: "Undecile", angle: 360 / 11, glyph: "U", harmonic: 11, cls: "harmonic", orb: 1, family: "creative", on: false }
  ];

  /* Every house system the Swiss Ephemeris offers (one-letter code → our label, grouped). */
  const HOUSE_SYSTEMS = [
    ["P", "Placidus", "Quadrant (time)"], ["K", "Koch", "Quadrant (time)"], ["B", "Alcabitius", "Quadrant (time)"],
    ["T", "Topocentric (Polich/Page)", "Quadrant (time)"], ["Y", "APC houses", "Quadrant (time)"],
    ["R", "Regiomontanus", "Quadrant (space)"], ["C", "Campanus", "Quadrant (space)"], ["U", "Krusinski-Pisa-Goelzer", "Quadrant (space)"],
    ["H", "Horizontal (azimuthal)", "Quadrant (space)"], ["O", "Porphyry", "Quadrant (division)"], ["S", "Sripati", "Quadrant (division)"],
    ["L", "Pullen SD (sinusoidal delta)", "Quadrant (division)"], ["Q", "Pullen SR (sinusoidal ratio)", "Quadrant (division)"],
    ["I", "Sunshine (Makransky)", "Quadrant (division)"],
    ["W", "Whole Sign", "Equal"], ["A", "Equal (from Ascendant)", "Equal"], ["D", "Equal (from MC)", "Equal"],
    ["V", "Vehlow Equal", "Equal"], ["N", "Equal / 1 = 0° Aries", "Equal"],
    ["M", "Morinus", "Equatorial"], ["X", "Meridian (axial rotation)", "Equatorial"], ["F", "Carter poli-equatorial", "Equatorial"],
    ["G", "Gauquelin sectors (36)", "Sectors"]
  ].map(([code, name, group]) => ({ code, name, group }));

  const ZODIACS = [
    { key: "tropical", name: "Tropical" },
    { key: "sidereal", name: "Sidereal" }
  ];
  /* Ayanamsas worth listing first; the rest come from the engine's own names (0 … 46). */
  const AYANAMSA_TOP = [1, 0, 3, 5, 27, 7, 17, 14, 9, 12, 13, 38];

  const CHART_TYPES = [
    { key: "natal", name: "Natal", ready: true, desc: "The sky at the moment and place of birth." },
    { key: "transit", name: "Transit", ready: true, desc: "Today's sky (or any moment) around the natal chart, at the current location." },
    { key: "progressed", name: "Secondary Progression", ready: true, desc: "Day-for-a-year: one day after birth stands for one year of life." },
    { key: "composite", name: "Composite", ready: true, desc: "Midpoints of two natal charts, one chart for the relationship." },
    { key: "synastry", name: "Synastry", ready: true, desc: "Two natal charts on one wheel: the partner outside, aspects between the two people." },
    { key: "solararc", name: "Solar Arc Directions", ready: true, desc: "Every natal point moved forward by the solar arc: progressed Sun minus natal Sun (about 1° a year)." },
    { key: "solarreturn", name: "Solar Return", ready: true, desc: "The last moment before the chosen date when the Sun returned to its natal degree, cast for your current location (or the birthplace)." },
    { key: "lunarreturn", name: "Lunar Return", ready: true, desc: "The last moment before the chosen date when the Moon returned to its natal degree (about every 27.3 days)." },
    { key: "harmonic", name: "Harmonic Chart", ready: true, desc: "Every longitude multiplied by n (Addey): a harmonic-n conjunction marks an aspect of 360°/n in the natal chart." }
  ];

  /* Egyptian bounds (terms), Ptolemy Tetrabiblos I.20: [ruler, end degree] per sign */
  const TERMS = [
    [["jupiter", 6], ["venus", 12], ["mercury", 20], ["mars", 25], ["saturn", 30]],
    [["venus", 8], ["mercury", 14], ["jupiter", 22], ["saturn", 27], ["mars", 30]],
    [["mercury", 6], ["jupiter", 12], ["venus", 17], ["mars", 24], ["saturn", 30]],
    [["mars", 7], ["venus", 13], ["mercury", 19], ["jupiter", 26], ["saturn", 30]],
    [["jupiter", 6], ["venus", 11], ["saturn", 18], ["mercury", 24], ["mars", 30]],
    [["mercury", 7], ["venus", 17], ["jupiter", 21], ["mars", 28], ["saturn", 30]],
    [["saturn", 6], ["mercury", 14], ["jupiter", 21], ["venus", 28], ["mars", 30]],
    [["mars", 7], ["venus", 11], ["mercury", 19], ["jupiter", 24], ["saturn", 30]],
    [["jupiter", 12], ["venus", 17], ["mercury", 21], ["saturn", 26], ["mars", 30]],
    [["mercury", 7], ["jupiter", 14], ["venus", 22], ["saturn", 26], ["mars", 30]],
    [["mercury", 7], ["venus", 13], ["jupiter", 20], ["mars", 25], ["saturn", 30]],
    [["venus", 12], ["jupiter", 16], ["mercury", 19], ["mars", 28], ["saturn", 30]]
  ];
  /* Chaldean faces: 36 decans in Chaldean order starting with Mars at 0° Aries */
  const CHALDEAN = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"];
  const FACES = Array.from({ length: 36 }, (_, i) => CHALDEAN[(2 + i) % 7]);
  /* Triplicity rulers (Dorotheus): day, night, participating */
  const TRIPLICITY = {
    fire: ["sun", "jupiter", "saturn"], earth: ["venus", "moon", "mars"],
    air: ["saturn", "mercury", "jupiter"], water: ["venus", "mars", "moon"]
  };
  /* Modern (triplicity) decan rulers: 1st decan = sign ruler, 2nd/3rd = rulers of the next signs of the same element */
  const decanSign = (signIdx, d) => (signIdx + 4 * d) % 12;

  const HOUSE_MEANINGS = ["Self, body", "Resources", "Siblings, near travel", "Home, parents", "Children, pleasure", "Health, work",
    "Partners, open enemies", "Death, others' resources", "Far travel, religion", "Career, reputation", "Friends, hopes", "Hidden enemies, confinement"];
  /* Hellenistic house names (Brennan) */
  const HOUSE_NAMES = ["Hour-marker", "Gate of Hades", "Goddess", "Subterraneous", "Good Fortune", "Bad Fortune",
    "Setting", "Idle place", "God", "Midheaven", "Good Spirit", "Bad Spirit"];

  const DATA = { VS, SIGNS, ELEMENTS, MODALITIES, BODIES, POINTS, ASPECTS, HOUSE_SYSTEMS, ZODIACS, AYANAMSA_TOP, CHART_TYPES,
    TERMS, FACES, CHALDEAN, TRIPLICITY, decanSign, HOUSE_MEANINGS, HOUSE_NAMES };
  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
  else root.AstroData = DATA;
})(typeof window !== "undefined" ? window : globalThis);
