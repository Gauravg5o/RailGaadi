import { GeoPOI } from '@/types';

export async function getNearbyGeography(
  stationCode: string,
  stationName?: string,
  lat?: number,
  lng?: number
): Promise<GeoPOI[]> {
  try {
    const query = new URLSearchParams({
      code: stationCode,
      ...(stationName ? { name: stationName } : {}),
      ...(lat ? { lat: String(lat) } : {}),
      ...(lng ? { lon: String(lng) } : {}),
    }).toString();

    const res = await fetch(`/api/geography?${query}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {}
  return [];
}
