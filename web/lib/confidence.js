/**
 * Confidence band mapping. Pure functions only.
 *   >= 80  -> HIGH
 *   60-79  -> MEDIUM
 *   < 60   -> LOW
 */

export const BANDS = ["HIGH", "MEDIUM", "LOW"];

export function confidenceBand(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return "LOW";
  if (score >= 80) return "HIGH";
  if (score >= 60) return "MEDIUM";
  return "LOW";
}

export function downgradeBand(band) {
  if (band === "HIGH") return "MEDIUM";
  return "LOW";
}
