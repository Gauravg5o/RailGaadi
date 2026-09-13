/**
 * Delay Observation Store — Phase 1 of the Delay Intelligence Engine
 *
 * Stores per-station delay readings as trains are polled. Uses an in-memory
 * structure (Option A) so it works on Vercel serverless without extra infra.
 * The data model is deliberately identical to what you'd write to a DB —
 * swap `persistDelayObservation` body with a DB INSERT when ready.
 *
 * ─── Equivalent Postgres DDL ─────────────────────────────────────────────────
 *
 * CREATE TABLE delay_observations (
 *   id             SERIAL          PRIMARY KEY,
 *   train_id       VARCHAR(10)     NOT NULL,
 *   station_code   VARCHAR(10)     NOT NULL,
 *   scheduled_time VARCHAR(8),                  -- 'HH:MM' IST
 *   actual_time    VARCHAR(8),                  -- 'HH:MM' IST (estimated)
 *   delay_minutes  INTEGER         NOT NULL,
 *   observed_at    BIGINT          NOT NULL,     -- Unix ms (UTC)
 *   day_of_week    SMALLINT        NOT NULL      -- 0 = Sunday … 6 = Saturday
 * );
 *
 * CREATE INDEX idx_do_train         ON delay_observations (train_id);
 * CREATE INDEX idx_do_train_station ON delay_observations (train_id, station_code);
 * CREATE INDEX idx_do_observed_at   ON delay_observations (observed_at DESC);
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * To swap to Postgres later: replace the three functions that touch `_store`
 * (`persistDelayObservation`, `getObservationsForTrain`,
 * `getObservationsForStation`) with equivalent SQL queries. Everything above
 * that layer (Phase 2 computation, Phase 3 API) stays unchanged.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DelayObservation {
  /** Train number string, e.g. "12561" */
  trainId: string;
  /** NTES station code, e.g. "CNB" */
  stationCode: string;
  /** Scheduled departure (or arrival) at this station — 'HH:MM' IST */
  scheduledTime: string;
  /** Estimated actual departure = scheduled + delayMinutes — 'HH:MM' IST */
  actualTime: string;
  /** Delay in minutes at this station (positive = late, 0 = on time) */
  delayMinutes: number;
  /** Unix ms UTC when this observation was recorded */
  observedAt: number;
  /** JS day-of-week: 0 = Sunday, 1 = Monday, …, 6 = Saturday */
  dayOfWeek: number;
}

// ─── In-memory store ──────────────────────────────────────────────────────────

/**
 * Ring buffer of observations.
 * Capacity: MAX_TOTAL entries. When full, the oldest entry is evicted (FIFO).
 * In production, replace with DB rows — no logic above this layer changes.
 */
const MAX_TOTAL = 500;
const _store: DelayObservation[] = [];

/**
 * Dedupe guard: we write at most one observation per (train, station) per
 * DEDUPE_WINDOW_MS, even though the frontend polls every 30 s.
 * This keeps the data model clean — one record per actual station visit.
 *
 * In Postgres this would be a partial unique index or an ON CONFLICT DO NOTHING.
 */
const DEDUPE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const _lastSeen = new Map<string, number>(); // "trainId::stationCode" → observedAt

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Persist one delay observation.
 *
 * Skips silently if the same (trainId, stationCode) was written within
 * DEDUPE_WINDOW_MS. Evicts the oldest record when MAX_TOTAL is reached.
 *
 * This is the only function that writes to _store. Replace its body with a
 * `db.query("INSERT INTO delay_observations …", obs)` to migrate to Postgres.
 */
export function persistDelayObservation(obs: DelayObservation): void {
  // Validate: reject placeholder station codes that are not real stations
  const PLACEHOLDER_CODES = new Set(['GPS', 'SRC', 'DST', 'STN1', 'STN2', 'SCHED_CURR']);
  if (PLACEHOLDER_CODES.has(obs.stationCode.toUpperCase())) return;
  if (!obs.trainId || !obs.stationCode) return;

  // Dedupe: don't write the same station observation twice within 5 min
  const key = `${obs.trainId}::${obs.stationCode}`;
  const lastObserved = _lastSeen.get(key) ?? 0;
  if (obs.observedAt - lastObserved < DEDUPE_WINDOW_MS) return;

  _lastSeen.set(key, obs.observedAt);

  // Evict oldest if at capacity
  if (_store.length >= MAX_TOTAL) {
    _store.shift();
  }

  _store.push(obs);

  // Transparent logging — you can see exactly what was stored and why
  console.log(
    `[delayStore] WRITE | train=${obs.trainId} station=${obs.stationCode} ` +
    `delay=${obs.delayMinutes}m sched=${obs.scheduledTime} actual=${obs.actualTime} ` +
    `day=${obs.dayOfWeek} | store_size=${_store.length}`
  );
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * All observations for a train, newest-first.
 * In Postgres: SELECT * FROM delay_observations WHERE train_id = $1 ORDER BY observed_at DESC
 */
export function getObservationsForTrain(trainId: string): DelayObservation[] {
  return _store
    .filter((o) => o.trainId === trainId)
    .sort((a, b) => b.observedAt - a.observedAt);
}

/**
 * All observations for a specific (train, station) pair, newest-first.
 * In Postgres: SELECT * FROM delay_observations
 *              WHERE train_id = $1 AND station_code = $2 ORDER BY observed_at DESC
 */
export function getObservationsForStation(
  trainId: string,
  stationCode: string
): DelayObservation[] {
  return _store
    .filter((o) => o.trainId === trainId && o.stationCode === stationCode)
    .sort((a, b) => b.observedAt - a.observedAt);
}

/**
 * Total observation count across all trains (for health-check / debugging).
 */
export function getObservationCount(): number {
  return _store.length;
}

/**
 * Per-train observation counts — useful for the introspection endpoint.
 */
export function getTrainObservationCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const obs of _store) {
    counts[obs.trainId] = (counts[obs.trainId] ?? 0) + 1;
  }
  return counts;
}

/**
 * Full store snapshot — useful for debugging or a future "flush to DB" job.
 * Returns a shallow copy so callers cannot mutate the store.
 */
export function getAllObservations(): DelayObservation[] {
  return [..._store];
}

// ─── Ingestion helper (called from trainsApi.ts) ──────────────────────────────

/**
 * Extract a DelayObservation from a live-mapped status response and persist it.
 *
 * Only called for real RailRadar data (not schedule-computed fallbacks), so
 * delayMinutes here reflects actual train performance, not theoretical schedules.
 *
 * @param liveStatus - the object returned by mapRailRadarLive()
 */
export function ingestFromLiveStatus(liveStatus: {
  trainId: string;
  delayMinutes: number;
  currentStation: {
    code: string;
    scheduledArrival: string;
    scheduledDeparture: string;
    delayMinutes: number;
  };
}): void {
  const station = liveStatus.currentStation;
  if (!station?.code) return;

  // Prefer departure time; fall back to arrival; final fallback '--:--'
  const scheduledTime =
    (station.scheduledDeparture && station.scheduledDeparture !== '--:--')
      ? station.scheduledDeparture
      : (station.scheduledArrival && station.scheduledArrival !== '--:--')
        ? station.scheduledArrival
        : '--:--';

  // The actual delay at this station (station-level wins over train-level)
  const delayMins =
    typeof station.delayMinutes === 'number'
      ? station.delayMinutes
      : liveStatus.delayMinutes ?? 0;

  // Compute actual time = scheduled + delay (keeps it explainable)
  let actualTime = '--:--';
  if (scheduledTime !== '--:--') {
    const [hStr, mStr] = scheduledTime.split(':');
    const hh = parseInt(hStr, 10);
    const mm = parseInt(mStr, 10);
    if (!isNaN(hh) && !isNaN(mm)) {
      const totalMins = hh * 60 + mm + delayMins;
      const ah = Math.floor(totalMins / 60) % 24;
      const am = totalMins % 60;
      actualTime = `${String(ah).padStart(2, '0')}:${String(am).padStart(2, '0')}`;
    }
  }

  persistDelayObservation({
    trainId: liveStatus.trainId,
    stationCode: station.code,
    scheduledTime,
    actualTime,
    delayMinutes: delayMins,
    observedAt: Date.now(),
    dayOfWeek: new Date().getDay(),
  });
}
