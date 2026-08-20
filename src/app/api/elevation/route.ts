import { NextRequest, NextResponse } from 'next/server';

const elevationCache = new Map<string, { data: any; expiry: number }>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const trainNumber = searchParams.get('number') || '12951';
  const stationsParam = searchParams.get('stations');

  try {
    let parsedStations: any[] = [];
    if (stationsParam) {
      try {
        parsedStations = JSON.parse(stationsParam);
      } catch (e) {}
    }

    if (!Array.isArray(parsedStations) || parsedStations.length === 0) {
      return NextResponse.json([]);
    }

    const cacheKey = `elev_${trainNumber}_${parsedStations.length}_${parsedStations[0]?.code}`;
    const now = Date.now();
    const cached = elevationCache.get(cacheKey);
    if (cached && cached.expiry > now) {
      return NextResponse.json(cached.data);
    }

    const validStations = parsedStations.filter(
      (s: any) => typeof s.lat === 'number' && typeof s.lng === 'number' && s.lat !== 0 && s.lng !== 0
    );

    if (validStations.length > 0) {
      const locationsStr = validStations.map((s: any) => `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`).join('|');

      try {
        const oeRes = await fetch(
          `https://api.open-elevation.com/api/v1/lookup?locations=${locationsStr}`,
          { cache: 'no-store' }
        );

        if (oeRes.ok) {
          const oeData = await oeRes.json();
          if (Array.isArray(oeData.results) && oeData.results.length === validStations.length) {
            const points = validStations.map((st: any, idx: number) => {
              const ele = oeData.results[idx]?.elevation ?? 100;
              return {
                distanceKm: Math.round(st.distanceFromStartKm || 0),
                elevationMeters: Math.max(5, Math.round(ele)),
                stationName: st.code || st.name,
              };
            });

            elevationCache.set(cacheKey, { data: points, expiry: now + 86400000 });
            return NextResponse.json(points);
          }
        }
      } catch (err) {
        console.error('[elevation API] Open-Elevation error:', err);
      }
    }

    const totalKm = parsedStations[parsedStations.length - 1]?.distanceFromStartKm || 1000;
    const points = parsedStations.map((st: any, idx: number) => {
      const dist = Math.round(st.distanceFromStartKm || (idx / Math.max(1, parsedStations.length - 1)) * totalKm);
      const lat = st.lat || 20.5;
      const lng = st.lng || 78.5;
      let baseEle = 150;
      if (lat > 28) baseEle = 210;
      else if (lng > 85) baseEle = 60;
      else if (lat < 15) baseEle = 400;
      else if (lng < 75 && lat < 22) baseEle = 30;

      const ele = Math.max(10, Math.round(baseEle + Math.sin(idx * 0.8) * 35));
      return {
        distanceKm: dist,
        elevationMeters: ele,
        stationName: st.code || st.name,
      };
    });

    elevationCache.set(cacheKey, { data: points, expiry: now + 86400000 });
    return NextResponse.json(points);
  } catch (error) {
    return NextResponse.json([]);
  }
}
