/**
 * Client-side service for the Delay Intelligence Engine API.
 * Fetches from GET /api/predict-delay/:trainId — which itself
 * has a 3-minute server-side TTL cache, so rapid calls are free.
 */

export interface DelayForecast {
  trainId: string;
  currentDelay: number;
  projectedDelay: number | null;
  confidence: 'none' | 'low' | 'medium' | 'high';
  trendDirection: 'growing' | 'recovering' | 'stable';
  trendSlopePerStation: number;
  basis: string;
  trendNote: string;
  remainingStations: number;
  recentObservations: number;
  totalObservations: number;
  computedAt: number;
  cachedUntil: number;
}

export async function getDelayForecast(trainId: string): Promise<DelayForecast | null> {
  if (!trainId || !/^\d{4,5}$/.test(trainId)) return null;
  try {
    const res = await fetch(`/api/predict-delay/${trainId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.trainId) return data as DelayForecast;
    return null;
  } catch {
    return null;
  }
}
