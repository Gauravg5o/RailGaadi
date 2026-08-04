import { ElevationPoint, Station } from '@/types';

/**
 * Generates elevation profile points for a train route.
 * Uses the backend elevation API (OpenTopography) for real DEM data.
 */
export async function getElevationProfile(trainNumber: string, stations?: Station[]): Promise<ElevationPoint[]> {
  if (stations && stations.length >= 2) {
    try {
      const simplified = stations.map((s) => ({
        code: s.code,
        name: s.name,
        distanceFromStartKm: s.distanceFromStartKm,
        lat: s.lat,
        lng: s.lng,
      }));

      const res = await fetch(
        `/api/elevation?number=${trainNumber}&stations=${encodeURIComponent(JSON.stringify(simplified))}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (err) {}

    // Fallback: derive from station elevation data
    return stations
      .filter((s) => s.distanceFromStartKm >= 0)
      .map((s) => ({
        distanceKm: s.distanceFromStartKm,
        elevationMeters: s.elevationMeters || 100,
        stationName: s.code,
      }));
  }

  try {
    const res = await fetch(`/api/elevation?number=${trainNumber}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {}

  return [];
}
