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
  try {
    const res = await fetch(`${API_BASE}/${trainNumber}/status`, {
      cache: 'no-store',
      // No timeout on fetch but Next.js proxy will handle it
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.trainNumber && data.currentStation) {
        // Valid live data received — return it
        console.log(`[getLiveStatus] Live data received for ${trainNumber}: ${data.currentStation.name} (${data.currentStation.code})`);
        return data as LiveStatus;
      }
    }
  } catch (err) {
    console.error(`[getLiveStatus] Error fetching status for ${trainNumber}:`, err);
  }

  // Fallback — only shown while backend is unreachable
  console.warn(`[getLiveStatus] Using fallback for train ${trainNumber}`);
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return {
    trainId: trainNumber,
    trainNumber,
    trainName: POPULAR_TRAINS_LIST.find(t => t.number === trainNumber)?.name || `Train ${trainNumber} Express`,
    status: 'Not Started',
    delayMinutes: 0,
    currentStation: {
      id: 'src',
      name: 'Connecting to GPS…',
      code: 'GPS',
      lat: 20.5937,
      lng: 78.9629,
      scheduledArrival: '--:--',
      scheduledDeparture: '--:--',
      delayMinutes: 0,
      distanceFromStartKm: 0,
      elevationMeters: 100,
      status: 'current',
    },
    nextStation: null,
    previousStation: null,
    currentLocation: { lat: 20.5937, lng: 78.9629, speedKmh: 0, heading: 0 },
    progressPercentage: 0,
    distanceCoveredKm: 0,
    remainingDistanceKm: 0,
    lastUpdated: `${now} IST · Connecting…`,
    etaDestination: '--:--',
  };
}
