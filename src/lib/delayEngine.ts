/**
 * Delay Intelligence Engine — Phase 2 Feature Computation
 *
 * Computes a statistically defensible delay trend and destination projection
 * for a given train, using only the observations collected in Phase 1.
 *
 * ─── Algorithm (fully explainable line by line) ───────────────────────────────
 *
 * STEP 1 — RECENT TREND
 *   Take the last MAX_TREND_POINTS observations for this train within the last
 *   RECENT_WINDOW_MS (6 hours), representing the current journey's progression
 *   through stations. Assign index x = 0, 1, 2, … to each in chronological
 *   order. Run Ordinary Least Squares on (x, delayMinutes) pairs:
 *
 *     slope = (n·Σ(xᵢ·yᵢ) − Σxᵢ·Σyᵢ) / (n·Σ(xᵢ²) − (Σxᵢ)²)
 *
 *   Interpretation: slope > 0 means the train is getting more delayed with
 *   each station; slope < 0 means it is recovering.
 *
 * STEP 2 — TREND CLASSIFICATION
 *   |slope| ≤ STABLE_THRESHOLD (0.5 min/station) → 'stable'
 *   slope  >  STABLE_THRESHOLD                   → 'growing'
 *   slope  < -STABLE_THRESHOLD                   → 'recovering'
 *
 * STEP 3 — PROJECTION
 *   projectedDelay = currentDelay + (slope × remainingStations)
 *   Clamped to [0, currentDelay + MAX_EXTRA_MINUTES] to prevent absurd values.
 *   Rounded to nearest integer minute.
 *
 * STEP 4 — CONFIDENCE
 *   Based on total observations ever stored for this train (historical depth):
 *   - 'none'   : fewer than 2 recent observations → cannot compute trend
 *   - 'low'    : 2+ recent, < 5 total
 *   - 'medium' : 2+ recent, 5–14 total
 *   - 'high'   : 2+ recent, ≥ 15 total
 *
 * COLD-START HANDLING
 *   If recent observations < 2, returns confidence='none' and
 *   projectedDelayMinutes=null. No fake numbers.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getObservationsForTrain, DelayObservation } from '@/lib/delayStore';

// ─── Constants ────────────────────────────────────────────────────────────────

/** How many of the most-recent observations to use for the trend slope */
const MAX_TREND_POINTS = 5;

/** Only count observations within this window as "this journey" for trend */
const RECENT_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Slopes within ±this threshold are classified as 'stable'.
 * 0.5 min/station = half a minute per station is noise, not a real trend.
 */
const STABLE_THRESHOLD = 0.5;

/** Max additional delay we'll ever project (caps absurd predictions) */
const MAX_EXTRA_MINUTES = 180;

// ─── Output Types ─────────────────────────────────────────────────────────────

export type TrendDirection = 'growing' | 'recovering' | 'stable';
export type ConfidenceLevel = 'none' | 'low' | 'medium' | 'high';

export interface DelayPrediction {
  trainId: string;

  /** Current live delay in minutes (passed in from live status) */
  currentDelayMinutes: number;

  /**
   * Projected delay at destination in minutes.
   * null when confidence = 'none' (cold start — no data yet).
   */
  projectedDelayMinutes: number | null;

  /** Which direction the trend is moving */
  trendDirection: TrendDirection;

  /**
   * OLS slope — minutes of delay gained (positive) or lost (negative)
   * per station. e.g. +1.2 means each station adds ~1.2 min of delay.
   * 0 when confidence = 'none'.
   */
  trendSlopePerStation: number;

  /** Confidence tier based on historical observation depth */
  confidence: ConfidenceLevel;

  /** How many recent observations informed the trend (≤ MAX_TREND_POINTS) */
  recentObservationCount: number;

  /** Total observations ever stored for this train (for historical depth) */
  totalObservationCount: number;

  /** Plain English: "Based on X observations over Y sessions" */
  basisDescription: string;

  /** Plain English trend explanation — safe to show in UI verbatim */
  trendNote: string;

  /** Unix ms when this prediction was computed */
  computedAt: number;
}

// ─── Core Math ────────────────────────────────────────────────────────────────

/**
 * Ordinary Least Squares slope for a set of (x, y) points.
 *
 *   slope = (n·Σ(xᵢ·yᵢ) − Σxᵢ·Σyᵢ) / (n·Σ(xᵢ²) − (Σxᵢ)²)
 *
 * Returns 0 if there are fewer than 2 points or if the denominator is zero
 * (all x values identical — degenerate case, no gradient information).
 *
 * This formula is standard OLS. You can verify it by hand with 3 points
 * in under 2 minutes — it is the simplest possible regression.
 */
function olsSlope(points: Array<{ x: number; y: number }>): number {
  const n = points.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of points) {
    sumX  += p.x;
    sumY  += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0; // all x values identical → no slope information

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Classify a slope value into a human-readable trend direction.
 */
function classifyTrend(slope: number): TrendDirection {
  if (slope >  STABLE_THRESHOLD) return 'growing';
  if (slope < -STABLE_THRESHOLD) return 'recovering';
  return 'stable';
}

/**
 * Map total observation count → confidence tier.
 * 'none' is set upstream (when recent obs < 2), not here.
 */
function computeConfidence(totalObs: number): Exclude<ConfidenceLevel, 'none'> {
  if (totalObs < 5)  return 'low';
  if (totalObs < 15) return 'medium';
  return 'high';
}

// ─── Human-readable Builders ─────────────────────────────────────────────────

function buildBasisDescription(
  confidence: ConfidenceLevel,
  recentCount: number,
  totalCount: number
): string {
  if (confidence === 'none') {
    return 'Not enough data yet — observations accumulate automatically each time this train is tracked.';
  }
  const sessionWord = totalCount === recentCount ? 'this session' : 'across multiple sessions';
  return `Based on ${totalCount} observation${totalCount !== 1 ? 's' : ''} ${sessionWord} (${recentCount} in the last 6 h).`;
}

function buildTrendNote(
  trend: TrendDirection,
  slope: number,
  recentCount: number,
  remainingStations: number,
  projectedDelay: number | null
): string {
  const slopeAbs = Math.abs(slope).toFixed(1);
  const stopsText = `last ${recentCount} stop${recentCount !== 1 ? 's' : ''}`;

  if (trend === 'growing') {
    const extra = projectedDelay !== null
      ? ` — projected ${projectedDelay} min at destination`
      : '';
    return (
      `Delay growing at ~+${slopeAbs} min/station over ${stopsText}. ` +
      `With ${remainingStations} station${remainingStations !== 1 ? 's' : ''} remaining, ` +
      `expect further slippage${extra}.`
    );
  }

  if (trend === 'recovering') {
    const recovered = projectedDelay !== null
      ? ` — projected ${projectedDelay} min at destination`
      : '';
    return (
      `Train is recovering: delay shrinking at ~${slopeAbs} min/station over ${stopsText}${recovered}.`
    );
  }

  // stable
  return (
    `Delay stable across ${stopsText} (slope: ${slope >= 0 ? '+' : ''}${slope.toFixed(2)} min/station). ` +
    `No significant change expected over ${remainingStations} remaining station${remainingStations !== 1 ? 's' : ''}.`
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Compute a delay prediction for a given train.
 *
 * @param trainId             - Train number string, e.g. "12561"
 * @param currentDelayMinutes - Current live delay from the status API
 * @param remainingStations   - Number of stations left (current → destination)
 *
 * @returns DelayPrediction — fully populated; projectedDelayMinutes is null
 *          when confidence = 'none' (cold start, not enough data).
 */
export function computeDelayPrediction(
  trainId: string,
  currentDelayMinutes: number,
  remainingStations: number
): DelayPrediction {
  const nowMs = Date.now();

  // ── Step 1: Fetch observations from the store ─────────────────────────────
  const allObs: DelayObservation[] = getObservationsForTrain(trainId);
  // allObs is already sorted newest-first by getObservationsForTrain

  // "Recent" = within the last 6 hours (this journey's progression)
  const recentObs: DelayObservation[] = allObs
    .filter((o) => nowMs - o.observedAt <= RECENT_WINDOW_MS)
    .sort((a, b) => a.observedAt - b.observedAt); // ascending (oldest first)

  const recentCount = recentObs.length;
  const totalCount  = allObs.length;

  // ── Step 2: Cold-start guard ──────────────────────────────────────────────
  // Need at least 2 recent points to fit a line (1 point has infinite slopes)
  if (recentCount < 2) {
    return {
      trainId,
      currentDelayMinutes,
      projectedDelayMinutes: null,
      trendDirection: 'stable',
      trendSlopePerStation: 0,
      confidence: 'none',
      recentObservationCount: recentCount,
      totalObservationCount: totalCount,
      basisDescription: buildBasisDescription('none', recentCount, totalCount),
      trendNote:
        recentCount === 0
          ? 'No observations recorded for this train yet. Data builds up automatically as the train is polled.'
          : 'Only 1 observation so far — need at least 2 stations to compute a trend.',
      computedAt: nowMs,
    };
  }

  // ── Step 3: Select up to MAX_TREND_POINTS most-recent observations ─────────
  // We want the last 5 because older readings from the same journey are less
  // relevant than the most recent run of stations.
  const trendPoints: DelayObservation[] = recentObs.slice(-MAX_TREND_POINTS);

  // Assign sequential x-values: 0, 1, 2, … (position in journey, normalised)
  // Using sequential integers rather than real timestamps avoids unit confusion
  // in the slope — the result is "minutes of delay per station", which is
  // exactly what we want to multiply by remainingStations later.
  const regressionInput = trendPoints.map((o, idx) => ({
    x: idx,
    y: o.delayMinutes,
  }));

  // ── Step 4: OLS regression ─────────────────────────────────────────────────
  const slope = olsSlope(regressionInput);
  const trend  = classifyTrend(slope);

  // Log the regression inputs so the prediction is fully auditable
  console.log(
    `[delayEngine] train=${trainId} | ` +
    `points=[${regressionInput.map((p) => `(${p.x},${p.y})`).join(', ')}] | ` +
    `slope=${slope.toFixed(3)} min/station | trend=${trend} | ` +
    `remainingStations=${remainingStations}`
  );

  // ── Step 5: Projection ────────────────────────────────────────────────────
  // projectedDelay = currentDelay + slope × remainingStations
  // Clamp: floor at 0 (trains don't typically arrive early in Indian railways),
  //        ceiling at currentDelay + MAX_EXTRA_MINUTES (prevents absurd outputs)
  const rawProjection = currentDelayMinutes + slope * remainingStations;
  const projectedDelay = Math.min(
    Math.max(0, Math.round(rawProjection)),
    currentDelayMinutes + MAX_EXTRA_MINUTES
  );

  // ── Step 6: Confidence ────────────────────────────────────────────────────
  const confidence: ConfidenceLevel = computeConfidence(totalCount);

  // ── Step 7: Human-readable descriptions ──────────────────────────────────
  const basisDescription = buildBasisDescription(confidence, recentCount, totalCount);
  const trendNote = buildTrendNote(
    trend,
    slope,
    recentCount,
    remainingStations,
    projectedDelay
  );

  return {
    trainId,
    currentDelayMinutes,
    projectedDelayMinutes: projectedDelay,
    trendDirection: trend,
    trendSlopePerStation: parseFloat(slope.toFixed(3)), // 3 dp is readable
    confidence,
    recentObservationCount: recentCount,
    totalObservationCount: totalCount,
    basisDescription,
    trendNote,
    computedAt: nowMs,
  };
}

// ─── Utility: extract remainingStations from a LiveStatus route ───────────────

/**
 * Count upcoming stations (status = 'upcoming') from a route stations array.
 * Pass this into computeDelayPrediction as `remainingStations`.
 *
 * Exported so the API route and the frontend service can both use it without
 * re-implementing the same filter.
 */
export function countRemainingStations(
  stations: Array<{ status: 'passed' | 'current' | 'upcoming' }>
): number {
  return stations.filter((s) => s.status === 'upcoming').length;
}
