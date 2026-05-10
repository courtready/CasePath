/* NSW-first postcode → region / court hints (no external APIs). */
window.POSTCODE_MAP = [
  { range: [1000, 1999], region: "Sydney", court: "Sydney Registry" },
  { range: [2000, 2239], region: "Sydney", court: "Sydney Registry" },
  { range: [2250, 2330], region: "Central Coast / Newcastle", court: "Newcastle Registry" },
  /* Narrow ranges before broad Regional NSW so overlaps resolve correctly. */
  { range: [2560, 2570], region: "Campbelltown", court: "Campbelltown Registry" },
  { range: [2331, 2599], region: "Regional NSW", court: "Nearest Circuit Court" },
  { range: [2740, 2786], region: "Western Sydney", court: "Parramatta Registry" },
];
