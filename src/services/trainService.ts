import { Train, LiveStatus } from '@/types';

// Use Next.js API proxy routes (relative URLs) so they always work regardless of backend port/CORS
const API_BASE = '/api/trains';

// Popular trains curated list
export const POPULAR_TRAINS_LIST = [
  { number: '12951', name: 'Mumbai Rajdhani Express', source: 'Mumbai Central', destination: 'New Delhi' },
  { number: '22436', name: 'Vande Bharat Express', source: 'New Delhi', destination: 'Varanasi' },
  { number: '12562', name: 'Swatantrata Senani Express', source: 'Jayanagar', destination: 'New Delhi' },
  { number: '12561', name: 'Swatantrata Senani Express', source: 'New Delhi', destination: 'Jayanagar' },
  { number: '12002', name: 'Bhopal Shatabdi Express', source: 'New Delhi', destination: 'Rani Kamlapati' },
  { number: '12626', name: 'Kerala Express', source: 'New Delhi', destination: 'Thiruvananthapuram' },
  { number: '12301', name: 'Howrah Rajdhani Express', source: 'Howrah', destination: 'New Delhi' },
  { number: '12259', name: 'Sealdah Duronto Express', source: 'New Delhi', destination: 'Sealdah' },
  { number: '22221', name: 'CSMT Mumbai Rajdhani', source: 'Hazrat Nizamuddin', destination: 'Mumbai CSMT' },
  { number: '12050', name: 'Gatimaan Express', source: 'Hazrat Nizamuddin', destination: 'Agra Cantt' },
  { number: '12555', name: 'Gorakhdham SF Express', source: 'Gorakhpur', destination: 'Hisar' },
  { number: '12423', name: 'Dibrugarh Rajdhani Express', source: 'Dibrugarh', destination: 'New Delhi' },
  { number: '12801', name: 'Purushottam Express', source: 'Puri', destination: 'New Delhi' },
  { number: '12627', name: 'Karnataka Express', source: 'KSR Bengaluru', destination: 'New Delhi' },
];

function inferType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('vande bharat')) return 'Vande Bharat';
  if (n.includes('rajdhani')) return 'Rajdhani';
  if (n.includes('shatabdi')) return 'Shatabdi';
  if (n.includes('duronto')) return 'Duronto';
  if (n.includes('superfast') || n.includes(' sf ')) return 'Superfast';
  return 'Express';
}

export async function searchTrains(query: string): Promise<Train[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(cleanQuery)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.error('searchTrains error:', err);
  }

  // Client-side fallback search
  const filtered = POPULAR_TRAINS_LIST.filter(
    (t) =>
      t.number.toLowerCase().includes(cleanQuery) ||
      t.name.toLowerCase().includes(cleanQuery) ||
      t.source.toLowerCase().includes(cleanQuery) ||
      t.destination.toLowerCase().includes(cleanQuery)
  );

  const results: Train[] = filtered.map((t) => ({
    id: t.number,
    number: t.number,
    name: t.name,
    type: inferType(t.name),
    source: t.source,
    destination: t.destination,
    route: { source: t.source, destination: t.destination, totalDistanceKm: 0, totalDurationMinutes: 0, stations: [] },
  }));

  if (/^\d{4,5}$/.test(cleanQuery) && !results.some((r) => r.number === cleanQuery)) {
    results.unshift({
      id: cleanQuery,
      number: cleanQuery,
      name: `Train ${cleanQuery} Express`,
      type: 'Express',
      source: 'Source',
      destination: 'Destination',
      route: { source: 'Source', destination: 'Destination', totalDistanceKm: 0, totalDurationMinutes: 0, stations: [] },
    });
  }

  return results;
}

export async function getTrainByNumber(trainNumber: string): Promise<Train | null> {
  // Primary: get from the status endpoint which has full route
  try {
    const res = await fetch(`${API_BASE}/${trainNumber}/status`, { cache: 'no-store' });
    if (res.ok) {
      const statusData = await res.json();
      if (statusData && statusData.trainNumber) {
        return {
          id: trainNumber,
          number: trainNumber,
          name: statusData.trainName || `Train ${trainNumber}`,
          type: inferType(statusData.trainName || ''),
          source: statusData.route?.source || 'Source',
          destination: statusData.route?.destination || 'Destination',
          route: statusData.route || {
            source: statusData.route?.source || 'Source',
            destination: statusData.route?.destination || 'Destination',
            totalDistanceKm: 0,
            totalDurationMinutes: 0,
            stations: [],
          },
        };
      }
    }
  } catch (err) {
    console.error('getTrainByNumber error:', err);
  }

  // Fallback to popular list
  const popular = POPULAR_TRAINS_LIST.find((t) => t.number === trainNumber);
  if (popular) {
    return {
      id: trainNumber,
      number: trainNumber,
      name: popular.name,
      type: inferType(popular.name),
      source: popular.source,
      destination: popular.destination,
      route: { source: popular.source, destination: popular.destination, totalDistanceKm: 0, totalDurationMinutes: 0, stations: [] },
    };
  }

  return null;
}


export async function getLiveStatus(trainNumber: string): Promise<LiveStatus> {
  // Try fetching up to 2 times
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/${trainNumber}/status`, {
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        // Accept ONLY valid data — must have a real station code (not 'GPS'/'SRC'/'STN1')
        const isValid =
          data &&
          data.trainNumber &&
          data.currentStation &&
          data.currentStation.name &&
          data.currentStation.code &&
          !['GPS', 'SRC', 'STN1', 'STN2', 'DST'].includes(data.currentStation.code) &&
          data.currentStation.name !== 'Connecting to GPS…';

        if (isValid) {
          return data as LiveStatus;
        }
        // If we got a response but it was the fallback GPS stub, log and retry
        console.warn(`[getLiveStatus] Got placeholder data on attempt ${attempt} for ${trainNumber}, retrying...`);
      }
    } catch (err) {
      console.error(`[getLiveStatus] Attempt ${attempt} failed for ${trainNumber}:`, err);
    }

    // Brief pause before retry
    if (attempt < 2) await new Promise(r => setTimeout(r, 800));
  }

  // Last resort: calculate from schedule client-side using the known schedules
  console.warn(`[getLiveStatus] API failed 2x for ${trainNumber}, computing from schedule`);
  return computeScheduleFallback(trainNumber);
}

// Compute live data from known schedules as absolute last resort
function computeScheduleFallback(trainNumber: string): LiveStatus {
  const SCHEDULE_MAP: Record<string, { name: string; src: string; dst: string; srcCode: string; dstCode: string; srcLat: number; srcLng: number; dstLat: number; dstLng: number; depHour: number; depMin: number; durationMins: number; dist: number }> = {
    '12561': { name: 'Swatantrata Senani Express', src: 'NEW DELHI', dst: 'JAYANAGAR', srcCode: 'NDLS', dstCode: 'JYG', srcLat: 28.6415, srcLng: 77.2197, dstLat: 26.5902, dstLng: 86.1356, depHour: 15, depMin: 30, durationMins: 1250, dist: 1246 },
    '12562': { name: 'Swatantrata Senani Express', src: 'JAYANAGAR', dst: 'NEW DELHI', srcCode: 'JYG', dstCode: 'NDLS', srcLat: 26.5902, srcLng: 86.1356, dstLat: 28.6415, dstLng: 77.2197, depHour: 13, depMin: 50, durationMins: 1250, dist: 1246 },
    '12951': { name: 'Mumbai Rajdhani Express', src: 'MUMBAI CENTRAL', dst: 'NEW DELHI', srcCode: 'MMCT', dstCode: 'NDLS', srcLat: 18.9696, srcLng: 72.8193, dstLat: 28.6415, dstLng: 77.2197, depHour: 17, depMin: 0, durationMins: 932, dist: 1380 },
    '22436': { name: 'Vande Bharat Express', src: 'NEW DELHI', dst: 'VARANASI', srcCode: 'NDLS', dstCode: 'BSB', srcLat: 28.6415, srcLng: 77.2197, dstLat: 25.3216, dstLng: 82.9876, depHour: 6, depMin: 0, durationMins: 480, dist: 759 },
    '12301': { name: 'Howrah Rajdhani Express', src: 'HOWRAH JN', dst: 'NEW DELHI', srcCode: 'HWH', dstCode: 'NDLS', srcLat: 22.5837, srcLng: 88.3425, dstLat: 28.6415, dstLng: 77.2197, depHour: 16, depMin: 50, durationMins: 1025, dist: 1447 },
  };

  const sched = SCHEDULE_MAP[trainNumber];
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);
  const nowMins = istDate.getHours() * 60 + istDate.getMinutes();
  const nowTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (!sched) {
    // Unknown train — use source as placeholder but with real info
    const popular = POPULAR_TRAINS_LIST.find(t => t.number === trainNumber);
    return {
      trainId: trainNumber,
      trainNumber,
      trainName: popular?.name || `Train ${trainNumber}`,
      status: 'Not Started',
      delayMinutes: 0,
      currentStation: {
        id: 'src',
        name: popular?.source || 'Origin Station',
        code: 'SRC',
        lat: 20.5937,
        lng: 78.9629,
        scheduledArrival: '--:--',
        scheduledDeparture: '--:--',
        delayMinutes: 0,
        distanceFromStartKm: 0,
        elevationMeters: 100,
        status: 'current',
      },
      nextStation: popular ? {
        id: 'dst',
        name: popular.destination,
        code: 'DST',
        lat: 20.5937,
        lng: 78.9629,
        scheduledArrival: '--:--',
        scheduledDeparture: '--:--',
        delayMinutes: 0,
        distanceFromStartKm: 0,
        elevationMeters: 100,
        status: 'upcoming',
      } : null,
      previousStation: null,
      currentLocation: { lat: 20.5937, lng: 78.9629, speedKmh: 0, heading: 0 },
      progressPercentage: 0,
      distanceCoveredKm: 0,
      remainingDistanceKm: 0,
      lastUpdated: `${nowTime} IST`,
      etaDestination: '--:--',
    };
  }

  const depMins = sched.depHour * 60 + sched.depMin;
  const elapsedMins = nowMins - depMins;
  let status = 'On Time';
  let progressPct = 0;
  let coveredDist = 0;
  let speed = 0;

  if (elapsedMins < 0) {
    status = 'Not Started';
    progressPct = 0;
    coveredDist = 0;
  } else if (elapsedMins >= sched.durationMins) {
    status = 'Completed';
    progressPct = 100;
    coveredDist = sched.dist;
  } else {
    progressPct = Math.round((elapsedMins / sched.durationMins) * 100);
    coveredDist = Math.round((elapsedMins / sched.durationMins) * sched.dist);
    speed = 65 + Math.round(Math.random() * 20);
  }

  const interpLat = sched.srcLat + (sched.dstLat - sched.srcLat) * (progressPct / 100);
  const interpLng = sched.srcLng + (sched.dstLng - sched.srcLng) * (progressPct / 100);

  // ETA calculation
  const remainingMins = Math.max(0, sched.durationMins - elapsedMins);
  const etaDate = new Date(istDate.getTime() + remainingMins * 60000);
  const etaH = String(etaDate.getHours()).padStart(2, '0');
  const etaM = String(etaDate.getMinutes()).padStart(2, '0');

  return {
    trainId: trainNumber,
    trainNumber,
    trainName: sched.name,
    status,
    delayMinutes: 0,
    currentStation: {
      id: 'sched_curr',
      name: status === 'Not Started' ? sched.src : status === 'Completed' ? sched.dst : `En Route (${progressPct}%)`,
      code: status === 'Not Started' ? sched.srcCode : sched.dstCode,
      lat: interpLat,
      lng: interpLng,
      scheduledArrival: `${String(sched.depHour).padStart(2,'0')}:${String(sched.depMin).padStart(2,'0')}`,
      scheduledDeparture: `${String(sched.depHour).padStart(2,'0')}:${String(sched.depMin).padStart(2,'0')}`,
      delayMinutes: 0,
      distanceFromStartKm: coveredDist,
      elevationMeters: 100,
      platform: '1',
      status: 'current',
    },
    nextStation: {
      id: 'sched_next',
      name: sched.dst,
      code: sched.dstCode,
      lat: sched.dstLat,
      lng: sched.dstLng,
      scheduledArrival: `${etaH}:${etaM}`,
      scheduledDeparture: `${etaH}:${etaM}`,
      delayMinutes: 0,
      distanceFromStartKm: sched.dist,
      elevationMeters: 100,
      status: 'upcoming',
    },
    previousStation: null,
    currentLocation: { lat: interpLat, lng: interpLng, speedKmh: speed, heading: 90 },
    progressPercentage: progressPct,
    distanceCoveredKm: coveredDist,
    remainingDistanceKm: Math.max(0, sched.dist - coveredDist),
    lastUpdated: `${nowTime} IST`,
    etaDestination: `${etaH}:${etaM}`,
  };
}
