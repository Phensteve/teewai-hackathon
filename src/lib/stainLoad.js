// Daily stain load saturates: enamel can only hold so much pigment per day,
// so repeated items have diminishing returns. A raw sum of per-item stain
// levels would let two ordinary foods (e.g. jollof rice + a snack ≈ 97) max
// out the meter and trigger a "high stain day" alert. This saturating curve
// maps the raw sum to a 0-100 "stain pressure" score where 100 is reserved for
// genuinely extreme days (coffee + wine + cola + smoking). Two normal meals
// land in the moderate band (~50), not the alert band.
//
// Shared by the StainTracker page and the Dashboard quick card so both always
// show the same number.
export const saturateStainLoad = (raw) =>
  Math.round(100 * (1 - Math.exp(-Math.max(0, raw) / 130)));