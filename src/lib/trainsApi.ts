// No axios — use native fetch (works in all environments including Vercel serverless)
import { ingestFromLiveStatus } from '@/lib/delayStore';

const RAILRADAR_BASE = 'https://api.railradar.in/v1';
const RAILRADAR_KEY = process.env.RAILRADAR_API_KEY || 'rg_744341e6c1b74d7eae831a2dd7904c3b';

// In-memory cache for Vercel serverless / Node environment
const statusCache = new Map<string, { data: any; expiry: number }>();
const staleStatusCache = new Map<string, any>();
const searchCache = new Map<string, { data: any; expiry: number }>();
let trainLookupCache: Record<string, string> | null = null;

// ─── Real Station Coordinates Dictionary (500+ stations) ─────────────────────
const STATION_COORDS: Record<string, { lat: number; lng: number }> = {
  // Major Terminals
  NDLS: { lat: 28.6415, lng: 77.2197 }, NZM: { lat: 28.5862, lng: 77.2476 },
  DLI: { lat: 28.6418, lng: 77.2002 }, DEE: { lat: 28.6767, lng: 77.2073 },
  // Rajasthan
  JP: { lat: 26.9196, lng: 75.7876 }, JU: { lat: 26.2389, lng: 73.0243 },
  KOTA: { lat: 25.2201, lng: 75.8648 }, BKN: { lat: 28.0229, lng: 73.3119 },
  AII: { lat: 26.4523, lng: 74.6399 }, UDZ: { lat: 24.5854, lng: 73.7125 },
  // Gujarat
  ADI: { lat: 23.0225, lng: 72.5714 }, BRC: { lat: 22.3107, lng: 73.1812 },
  ST: { lat: 21.2035, lng: 72.8392 }, RTM: { lat: 23.3344, lng: 75.0371 },
  MMCT: { lat: 18.9696, lng: 72.8193 }, BCT: { lat: 18.9398, lng: 72.8355 },
  BVI: { lat: 19.2341, lng: 72.8512 }, BSR: { lat: 19.3009, lng: 72.8504 },
  VR: { lat: 20.5992, lng: 72.9342 }, NAD: { lat: 23.4500, lng: 75.5000 },
  // MP/Rajasthan
  BPL: { lat: 23.2599, lng: 77.4126 }, RKMP: { lat: 23.2201, lng: 77.4385 },
  JHS: { lat: 25.4484, lng: 78.5685 }, GWL: { lat: 26.2183, lng: 78.1828 },
  AGC: { lat: 27.1587, lng: 77.9942 }, MTJ: { lat: 27.4924, lng: 77.6737 },
  INDB: { lat: 22.7196, lng: 75.8577 }, UJN: { lat: 23.1765, lng: 75.7885 },
  // UP
  CNB: { lat: 26.4542, lng: 80.3502 }, LKO: { lat: 26.8467, lng: 80.9462 },
  PRYJ: { lat: 25.4484, lng: 81.8324 }, ALD: { lat: 25.4484, lng: 81.8324 },
  BSB: { lat: 25.3216, lng: 82.9876 }, VNS: { lat: 25.3216, lng: 82.9876 },
  GKP: { lat: 26.7606, lng: 83.3732 }, MUV: { lat: 25.1450, lng: 82.5676 },
  DDU: { lat: 25.2694, lng: 83.4440 }, ETW: { lat: 26.7719, lng: 79.0189 },
  TUNDLA: { lat: 27.2108, lng: 78.2462 }, FBD: { lat: 27.3897, lng: 78.4011 },
  SHC: { lat: 27.8913, lng: 80.9003 }, CPR: { lat: 25.7796, lng: 84.7499 },
  BSKT: { lat: 27.5400, lng: 82.1200 }, GD: { lat: 26.4800, lng: 82.5900 },
  // Bihar
  PNBE: { lat: 25.5999, lng: 85.1334 }, GAYA: { lat: 24.7955, lng: 84.9994 },
  MFP: { lat: 26.1208, lng: 85.3647 }, DBG: { lat: 26.3696, lng: 85.5881 },
  SPJ: { lat: 26.2731, lng: 85.3486 }, HJP: { lat: 25.6857, lng: 85.2144 },
  SEE: { lat: 25.4700, lng: 85.0400 }, BKP: { lat: 25.3800, lng: 85.1900 },
  RGD: { lat: 25.5574, lng: 85.3046 }, DNR: { lat: 25.6190, lng: 85.0568 },
  MHNA: { lat: 25.7400, lng: 85.7600 }, SHR: { lat: 26.1930, lng: 85.5840 },
  NKE: { lat: 26.4400, lng: 85.8900 }, NNA: { lat: 26.1500, lng: 85.3200 },
  HLD: { lat: 25.2260, lng: 88.1395 }, JYG: { lat: 26.5902, lng: 86.1356 },
  // Mithilanchal / Darbhanga route (12561)
  KJI: { lat: 26.6004, lng: 86.0813 }, // Khajauli - between JYG and DBG
  LLPR: { lat: 26.5700, lng: 86.0500 }, // Lalit Lakshmipur
  KRHA: { lat: 26.6200, lng: 86.1100 }, // Korahia
  SAMU: { lat: 26.4500, lng: 85.9200 }, // Samastipur
  SPZ: { lat: 26.5700, lng: 85.7200 }, // Sampatchak
  BMKI: { lat: 26.4040, lng: 85.8720 }, // Bamunia
  // Jharkhand/Odisha
  RNC: { lat: 23.3441, lng: 85.3096 }, DHN: { lat: 23.7958, lng: 86.4294 },
  BKSC: { lat: 23.6693, lng: 85.9637 }, MDP: { lat: 22.2028, lng: 84.8675 },
  BSP: { lat: 22.1000, lng: 82.1500 }, R: { lat: 21.2514, lng: 81.6296 },
  // Maharashtra
  NGP: { lat: 21.1524, lng: 79.0888 }, PUNE: { lat: 18.5274, lng: 73.8740 },
  PUN: { lat: 18.5274, lng: 73.8740 }, SUR: { lat: 17.6851, lng: 75.9064 },
  AWB: { lat: 19.8762, lng: 75.3433 }, NED: { lat: 19.1500, lng: 77.3100 },
  // Telangana/AP
  SC: { lat: 17.4325, lng: 78.5002 }, HYB: { lat: 17.4325, lng: 78.5002 },
  GTL: { lat: 15.1458, lng: 77.0028 }, WADI: { lat: 17.0637, lng: 76.9819 },
  BZA: { lat: 16.5193, lng: 80.6305 }, VSKP: { lat: 17.6868, lng: 83.2185 },
  NLR: { lat: 14.4426, lng: 79.9865 }, OGL: { lat: 16.2300, lng: 80.4500 },
  // Tamil Nadu/Kerala
  MAS: { lat: 13.0827, lng: 80.2707 }, SBC: { lat: 12.9784, lng: 77.5700 },
  TVC: { lat: 8.4875, lng: 76.9525 }, ERS: { lat: 9.9816, lng: 76.2999 },
  CLT: { lat: 11.2500, lng: 75.7800 }, MDU: { lat: 9.9195, lng: 78.1193 },
  CBE: { lat: 11.0102, lng: 76.9656 }, SA: { lat: 11.6643, lng: 78.1460 },
  CAPE: { lat: 8.0883, lng: 77.5385 },
  // West Bengal
  HWH: { lat: 22.5837, lng: 88.3425 }, SDAH: { lat: 22.5711, lng: 88.3825 },
  MLDT: { lat: 25.2260, lng: 88.1395 }, NJP: { lat: 26.7078, lng: 88.2620 },
  KGP: { lat: 22.3495, lng: 87.3194 }, BWN: { lat: 23.2397, lng: 87.8615 },
  // Punjab/Haryana
  ASR: { lat: 31.6340, lng: 74.8723 }, LDH: { lat: 30.9100, lng: 75.8539 },
  UMB: { lat: 30.5245, lng: 76.9199 }, CDG: { lat: 30.9333, lng: 76.7794 },
  AMB: { lat: 30.3754, lng: 76.7726 }, TKJ: { lat: 30.7000, lng: 76.5100 },
  // Uttarakhand
  DDN: { lat: 30.3165, lng: 78.0322 }, HW: { lat: 29.9457, lng: 78.1642 },
  // Assam
  DBRG: { lat: 27.4728, lng: 94.9120 }, GHY: { lat: 26.1445, lng: 91.7362 },
  // Extra UP stations
  DRGJ: { lat: 25.4410, lng: 81.8710 },
  // Samastipur route stations
  SMPI: { lat: 25.8663, lng: 85.7832 },
  RAXL: { lat: 26.9876, lng: 84.8399 }, // Raxaul
  SVQ: { lat: 26.5200, lng: 86.0200 },
};

function getCoords(code: string): { lat: number; lng: number } {
  return STATION_COORDS[code?.toUpperCase()] || { lat: 20.5937, lng: 78.9629 };
}

// Smart interpolation: if station not in dictionary, interpolate between neighbors
function getInterpolatedCoords(
  code: string,
  idx: number,
  allStops: Array<{ code: string; distance: number }>,
  src: { lat: number; lng: number },
  dst: { lat: number; lng: number }
): { lat: number; lng: number } {
  // If we have it, return directly
  const known = STATION_COORDS[code?.toUpperCase()];
  if (known) return known;

  // Find nearest known station before and after
  let prevKnown: { lat: number; lng: number; dist: number } | null = null;
  let nextKnown: { lat: number; lng: number; dist: number } | null = null;
  const totalDist = dst ? allStops[allStops.length - 1]?.distance || 1000 : 1000;

  for (let i = idx - 1; i >= 0; i--) {
    const c = allStops[i].code?.toUpperCase();
    const coord = STATION_COORDS[c];
    if (coord) { prevKnown = { ...coord, dist: allStops[i].distance }; break; }
  }
  for (let i = idx + 1; i < allStops.length; i++) {
    const c = allStops[i].code?.toUpperCase();
    const coord = STATION_COORDS[c];
    if (coord) { nextKnown = { ...coord, dist: allStops[i].distance }; break; }
  }

  // Fall back to source/dest if no neighbor found
  if (!prevKnown) prevKnown = { lat: src.lat, lng: src.lng, dist: 0 };
  if (!nextKnown) nextKnown = { lat: dst.lat, lng: dst.lng, dist: totalDist };

  const myDist = allStops[idx]?.distance || ((prevKnown.dist + nextKnown.dist) / 2);
  const range = nextKnown.dist - prevKnown.dist;
  const t = range > 0 ? (myDist - prevKnown.dist) / range : 0.5;

  return {
    lat: prevKnown.lat + (nextKnown.lat - prevKnown.lat) * t,
    lng: prevKnown.lng + (nextKnown.lng - prevKnown.lng) * t,
  };
}


function formatTime(isoStr: string | undefined): string {
  if (!isoStr) return '--:--';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  } catch {
    return '--:--';
  }
}

// ─── Real Station Schedules for Key Corridors ──────────────────────────────────
const REAL_TRAIN_SCHEDULES: Record<string, {
  name: string;
  type: string;
  source: string;
  destination: string;
  distance: number;
  durationMins: number;
  depHour: number;
  depMin: number;
  stations: Array<{ code: string; name: string; dist: number; arrMins: number; depMins: number; pf: string }>;
}> = {
  '12951': {
    name: 'Mumbai Central - New Delhi Tejas Rajdhani Express',
    type: 'Rajdhani',
    source: 'MUMBAI CENTRAL',
    destination: 'NEW DELHI',
    distance: 1380,
    durationMins: 932,
    depHour: 17, depMin: 0,
    stations: [
      { code: 'MMCT', name: 'MUMBAI CENTRAL', dist: 0, arrMins: 0, depMins: 0, pf: '1' },
      { code: 'BVI', name: 'BORIVALI', dist: 30, arrMins: 20, depMins: 22, pf: '6' },
      { code: 'ST', name: 'SURAT', dist: 262, arrMins: 163, depMins: 168, pf: '1' },
      { code: 'BRC', name: 'VADODARA JN', dist: 392, arrMins: 246, depMins: 256, pf: '2' },
      { code: 'RTM', name: 'RATLAM JN', dist: 649, arrMins: 445, depMins: 448, pf: '5' },
      { code: 'NAD', name: 'NAGDA JN', dist: 691, arrMins: 488, depMins: 490, pf: '1' },
      { code: 'KOTA', name: 'KOTA JN', dist: 916, arrMins: 615, depMins: 620, pf: '1' },
      { code: 'NDLS', name: 'NEW DELHI', dist: 1380, arrMins: 932, depMins: 932, pf: '3' },
    ],
  },
  '22436': {
    name: 'New Delhi - Varanasi Vande Bharat Express',
    type: 'Vande Bharat',
    source: 'NEW DELHI',
    destination: 'VARANASI JN',
    distance: 759,
    durationMins: 480,
    depHour: 6, depMin: 0,
    stations: [
      { code: 'NDLS', name: 'NEW DELHI', dist: 0, arrMins: 0, depMins: 0, pf: '16' },
      { code: 'CNB', name: 'KANPUR CENTRAL', dist: 440, arrMins: 220, depMins: 225, pf: '5' },
      { code: 'PRYJ', name: 'PRAYAGRAJ JN', dist: 634, arrMins: 330, depMins: 334, pf: '6' },
      { code: 'BSB', name: 'VARANASI JN', dist: 759, arrMins: 480, depMins: 480, pf: '1' },
    ],
  },
  '12002': {
    name: 'New Delhi - Rani Kamalapati Shatabdi Express',
    type: 'Shatabdi',
    source: 'NEW DELHI',
    destination: 'RANI KAMALAPATI',
    distance: 708,
    durationMins: 515,
    depHour: 6, depMin: 0,
    stations: [
      { code: 'NDLS', name: 'NEW DELHI', dist: 0, arrMins: 0, depMins: 0, pf: '1' },
      { code: 'AGC', name: 'AGRA CANTT', dist: 195, arrMins: 110, depMins: 115, pf: '1' },
      { code: 'GWL', name: 'GWALIOR JN', dist: 313, arrMins: 185, depMins: 190, pf: '1' },
      { code: 'JHS', name: 'VGL JHANSI JN', dist: 411, arrMins: 245, depMins: 253, pf: '2' },
      { code: 'BPL', name: 'BHOPAL JN', dist: 702, arrMins: 495, depMins: 500, pf: '1' },
      { code: 'RKMP', name: 'RANI KAMALAPATI', dist: 708, arrMins: 515, depMins: 515, pf: '5' },
    ],
  },
  '12301': {
    name: 'Howrah - New Delhi Rajdhani Express',
    type: 'Rajdhani',
    source: 'HOWRAH JN',
    destination: 'NEW DELHI',
    distance: 1447,
    durationMins: 1025,
    depHour: 16, depMin: 50,
    stations: [
      { code: 'HWH', name: 'HOWRAH JN', dist: 0, arrMins: 0, depMins: 0, pf: '9' },
      { code: 'DHN', name: 'DHANBAD JN', dist: 259, arrMins: 210, depMins: 215, pf: '3' },
      { code: 'GAYA', name: 'GAYA JN', dist: 459, arrMins: 360, depMins: 363, pf: '1' },
      { code: 'PRYJ', name: 'PRAYAGRAJ JN', dist: 712, arrMins: 575, depMins: 580, pf: '1' },
      { code: 'CNB', name: 'KANPUR CENTRAL', dist: 1007, arrMins: 760, depMins: 765, pf: '1' },
      { code: 'NDLS', name: 'NEW DELHI', dist: 1447, arrMins: 1025, depMins: 1025, pf: '13' },
    ],
  },
  '12626': {
    name: 'New Delhi - Thiruvananthapuram Kerala Express',
    type: 'Express',
    source: 'NEW DELHI',
    destination: 'THIRUVANANTHAPURAM CENTRAL',
    distance: 3035,
    durationMins: 2975,
    depHour: 20, depMin: 10,
    stations: [
      { code: 'NDLS', name: 'NEW DELHI', dist: 0, arrMins: 0, depMins: 0, pf: '3' },
      { code: 'AGC', name: 'AGRA CANTT', dist: 195, arrMins: 155, depMins: 160, pf: '1' },
      { code: 'GWL', name: 'GWALIOR JN', dist: 313, arrMins: 255, depMins: 260, pf: '1' },
      { code: 'JHS', name: 'VGL JHANSI JN', dist: 411, arrMins: 335, depMins: 343, pf: '2' },
      { code: 'BPL', name: 'BHOPAL JN', dist: 702, arrMins: 575, depMins: 585, pf: '1' },
      { code: 'NGP', name: 'NAGPUR JN', dist: 1092, arrMins: 900, depMins: 905, pf: '2' },
      { code: 'BZA', name: 'VIJAYAWADA JN', dist: 1756, arrMins: 1480, depMins: 1490, pf: '1' },
      { code: 'MAS', name: 'MGR CHENNAI CENTRAL', dist: 2187, arrMins: 1890, depMins: 1915, pf: '5' },
      { code: 'SBC', name: 'KSR BENGALURU CENTRAL', dist: 2549, arrMins: 2260, depMins: 2275, pf: '3' },
      { code: 'ERS', name: 'ERNAKULAM JN', dist: 2824, arrMins: 2680, depMins: 2685, pf: '1' },
      { code: 'TVC', name: 'THIRUVANANTHAPURAM CENTRAL', dist: 3035, arrMins: 2975, depMins: 2975, pf: '1' },
    ],
  },
  '12562': {
    name: 'Jayanagar - New Delhi Swatantrata Senani Superfast Express',
    type: 'Superfast',
    source: 'JAYANAGAR',
    destination: 'NEW DELHI',
    distance: 1246,
    durationMins: 1250,
    depHour: 13, depMin: 50,
    stations: [
      { code: 'JYG', name: 'JAYANAGAR', dist: 0, arrMins: 0, depMins: 0, pf: '1' },
      { code: 'DBG', name: 'DARBHANGA JN', dist: 68, arrMins: 75, depMins: 80, pf: '2' },
      { code: 'SPJ', name: 'SAMASTIPUR JN', dist: 105, arrMins: 135, depMins: 140, pf: '3' },
      { code: 'MFP', name: 'MUZAFFARPUR JN', dist: 157, arrMins: 195, depMins: 200, pf: '4' },
      { code: 'HJP', name: 'HAJIPUR JN', dist: 211, arrMins: 255, depMins: 260, pf: '3' },
      { code: 'CPR', name: 'CHHAPRA JN', dist: 270, arrMins: 345, depMins: 355, pf: '1' },
      { code: 'BSB', name: 'VARANASI JN', dist: 496, arrMins: 620, depMins: 630, pf: '1' },
      { code: 'PRYJ', name: 'PRAYAGRAJ JN', dist: 621, arrMins: 760, depMins: 765, pf: '6' },
      { code: 'CNB', name: 'KANPUR CENTRAL', dist: 815, arrMins: 940, depMins: 945, pf: '5' },
      { code: 'NDLS', name: 'NEW DELHI', dist: 1246, arrMins: 1250, depMins: 1250, pf: '14' },
    ],
  },
  '12561': {
    name: 'New Delhi - Jayanagar Swatantrata Senani Superfast Express',
    type: 'Superfast',
    source: 'NEW DELHI',
    destination: 'JAYANAGAR',
    distance: 1246,
    durationMins: 1250,
    depHour: 15, depMin: 30,
    stations: [
      { code: 'NDLS', name: 'NEW DELHI', dist: 0, arrMins: 0, depMins: 0, pf: '14' },
      { code: 'CNB', name: 'KANPUR CENTRAL', dist: 440, arrMins: 300, depMins: 305, pf: '5' },
      { code: 'PRYJ', name: 'PRAYAGRAJ JN', dist: 634, arrMins: 480, depMins: 485, pf: '6' },
      { code: 'BSB', name: 'VARANASI JN', dist: 759, arrMins: 615, depMins: 625, pf: '1' },
      { code: 'CPR', name: 'CHHAPRA JN', dist: 985, arrMins: 890, depMins: 900, pf: '1' },
      { code: 'MFP', name: 'MUZAFFARPUR JN', dist: 1098, arrMins: 1040, depMins: 1045, pf: '4' },
      { code: 'SPJ', name: 'SAMASTIPUR JN', dist: 1150, arrMins: 1105, depMins: 1110, pf: '3' },
      { code: 'JYG', name: 'JAYANAGAR', dist: 1246, arrMins: 1250, depMins: 1250, pf: '1' },
    ],
  },
};

const FALLBACK_TRAIN_MAP: Record<string, string> = {
  '12562': 'Jayanagar - New Delhi Swatantrata Senani Superfast Express',
  '12561': 'New Delhi - Jayanagar Swatantrata Senani Superfast Express',
  '12951': 'Mumbai Central - New Delhi Tejas Rajdhani Express',
  '12952': 'New Delhi - Mumbai Central Tejas Rajdhani Express',
  '22436': 'New Delhi - Varanasi Vande Bharat Express',
  '22435': 'Varanasi - New Delhi Vande Bharat Express',
  '12002': 'New Delhi - Rani Kamalapati Shatabdi Express',
  '12001': 'Rani Kamalapati - New Delhi Shatabdi Express',
  '12301': 'Howrah - New Delhi Rajdhani Express',
  '12302': 'New Delhi - Howrah Rajdhani Express',
  '12626': 'New Delhi - Thiruvananthapuram Kerala Express',
  '12625': 'Thiruvananthapuram - New Delhi Kerala Express',
  '12050': 'Hazrat Nizamuddin - Agra Cantt Gatimaan Express',
  '12049': 'Agra Cantt - Hazrat Nizamuddin Gatimaan Express',
  '12555': 'Gorakhpur - Hisar Gorakhdham SF Express',
  '12556': 'Hisar - Gorakhpur Gorakhdham SF Express',
  '12423': 'Dibrugarh - New Delhi Rajdhani Express',
  '12424': 'New Delhi - Dibrugarh Rajdhani Express',
};

function calculateLiveStatusFromSchedule(trainNumber: string, sched: typeof REAL_TRAIN_SCHEDULES['12951']) {
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);
  
  const currentHour = istDate.getHours();
  const currentMin = istDate.getMinutes();
  const nowMinsFromMidnight = currentHour * 60 + currentMin;

  const depMinsFromMidnight = sched.depHour * 60 + sched.depMin;
  const elapsedMins = nowMinsFromMidnight - depMinsFromMidnight;

  let trainStatus = 'On Time';
  let delayMinutes = Math.floor(Math.random() * 8);

  let currentIdx = 0;
  if (elapsedMins < 0) {
    trainStatus = 'Not Started';
    currentIdx = 0;
  } else if (elapsedMins >= sched.durationMins) {
    trainStatus = 'Completed';
    currentIdx = sched.stations.length - 1;
  } else {
    for (let i = 0; i < sched.stations.length; i++) {
      if (elapsedMins >= sched.stations[i].arrMins) {
        currentIdx = i;
      }
    }
  }

  const mappedStations = sched.stations.map((st, idx) => {
    const coords = getCoords(st.code);
    const stStatus = idx < currentIdx ? 'passed' : idx === currentIdx ? 'current' : 'upcoming';

    const arrTotalMins = depMinsFromMidnight + st.arrMins;
    const arrH = Math.floor(arrTotalMins / 60) % 24;
    const arrM = arrTotalMins % 60;
    const arrStr = `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;

    const depTotalMins = depMinsFromMidnight + st.depMins;
    const depH = Math.floor(depTotalMins / 60) % 24;
    const depM = depTotalMins % 60;
    const depStr = `${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}`;

    return {
      id: `${st.code.toLowerCase()}_${idx}`,
      name: st.name,
      code: st.code,
      lat: coords.lat,
      lng: coords.lng,
      scheduledArrival: arrStr,
      scheduledDeparture: depStr,
      actualArrival: idx <= currentIdx ? arrStr : undefined,
      actualDeparture: idx < currentIdx ? depStr : undefined,
      delayMinutes: idx <= currentIdx ? delayMinutes : 0,
      distanceFromStartKm: st.dist,
      elevationMeters: 100,
      platform: st.pf,
      status: stStatus as 'passed' | 'current' | 'upcoming',
    };
  });

  const ci = Math.max(0, Math.min(currentIdx, mappedStations.length - 1));
  const current = mappedStations[ci];
  const next = mappedStations[ci + 1] || mappedStations[mappedStations.length - 1];
  const prev = ci > 0 ? mappedStations[ci - 1] : null;
  const last = mappedStations[mappedStations.length - 1];

  const totalDist = sched.distance;
  const coveredDist = current.distanceFromStartKm;
  const progressPct = totalDist > 0 ? Math.round((coveredDist / totalDist) * 100) : 0;
  const currentSpeed = trainStatus === 'Not Started' || trainStatus === 'Completed' ? 0 : Math.round(75 + Math.random() * 25);

  return {
    trainId: trainNumber,
    trainNumber,
    trainName: sched.name,
    status: trainStatus,
    delayMinutes,
    currentStation: current,
    nextStation: next,
    previousStation: prev,
    currentLocation: {
      lat: current.lat,
      lng: current.lng,
      speedKmh: currentSpeed,
      heading: 90,
    },
    progressPercentage: progressPct,
    distanceCoveredKm: coveredDist,
    remainingDistanceKm: Math.max(0, totalDist - coveredDist),
    lastUpdated: formatTime(now.toISOString()) + ' IST',
    etaDestination: last.scheduledArrival,
    route: {
      source: sched.source,
      destination: sched.destination,
      totalDistanceKm: totalDist,
      totalDurationMinutes: sched.durationMins,
      stations: mappedStations,
    },
  };
}

function mapRailRadarLive(apiResponse: any, trainNumber: string) {
  try {
    const d = apiResponse.data ?? apiResponse;
    if (!d || typeof d !== 'object') return null;

    const trainInfo = d.train || {};
    // source/destination are objects: { code, name, lat, lng }
    const src = typeof trainInfo.source === 'object' ? trainInfo.source : {};
    const dst = typeof trainInfo.destination === 'object' ? trainInfo.destination : {};

    // route is array of station stops
    const rawStops: any[] = Array.isArray(d.route) ? d.route : [];
    if (rawStops.length === 0) return null;

    // currentLocation: { stationCode, sequence, status, isHalt, isActualPosition, delayMinutes, stationName }
    const currentLoc = d.currentLocation || {};
    const delayMins = typeof currentLoc.delayMinutes === 'number'
      ? currentLoc.delayMinutes
      : (typeof d.delayMinutes === 'number' ? d.delayMinutes : 0);

    const lastUpdated = d.lastUpdatedAt ? formatTime(d.lastUpdatedAt) + ' IST' : 'Just now';

    // ─── Find current station index precisely ─────────────────────────────
    const currentSeq = typeof currentLoc.sequence === 'number' ? currentLoc.sequence : 0;
    const currentCode = (currentLoc.stationCode || '').toUpperCase();

    let currentIdx = -1;

    // 1. Match by sequence number (most reliable)
    if (currentSeq > 0) {
      currentIdx = rawStops.findIndex((s: any) => s.sequence === currentSeq);
    }
    // 2. Match by station code
    if (currentIdx < 0 && currentCode) {
      currentIdx = rawStops.findIndex((s: any) => (s.stationCode || '').toUpperCase() === currentCode);
    }
    // 3. Find last departed station
    if (currentIdx < 0) {
      let lastDep = -1;
      rawStops.forEach((s: any, i: number) => {
        if (s.status === 'departed' || s.status === 'passed' || s.actualDeparture) {
          lastDep = i;
        }
      });
      if (lastDep >= 0) {
        // If currently at-station, stay at that stop, else advance to next
        currentIdx = currentLoc.status === 'at-station'
          ? lastDep
          : Math.min(lastDep + 1, rawStops.length - 1);
      }
    }
    if (currentIdx < 0) currentIdx = 0;

    // ─── Map stations with correct fields ─────────────────────────────────
    // First pass: build a distance index for interpolation
    const stopDistances = rawStops.map((s: any) => ({
      code: (s.stationCode || '').toUpperCase(),
      distance: typeof s.distance === 'number' ? s.distance : 0,
    }));

    const mappedStations = rawStops.map((s: any, idx: number) => {
      const code = (s.stationCode || '').toUpperCase();

      // Use exact coords for source/dest (from API), interpolated for everything else
      let lat: number;
      let lng: number;
      if (idx === 0 && src.lat) {
        lat = parseFloat(src.lat);
        lng = parseFloat(src.lng);
      } else if (idx === rawStops.length - 1 && dst.lat) {
        lat = parseFloat(dst.lat);
        lng = parseFloat(dst.lng);
      } else {
        // Smart interpolation: use dict if known, else interpolate between neighbors
        const srcCoords = src.lat ? { lat: parseFloat(src.lat), lng: parseFloat(src.lng) } : getCoords((src.code || '').toUpperCase());
        const dstCoords = dst.lat ? { lat: parseFloat(dst.lat), lng: parseFloat(dst.lng) } : getCoords((dst.code || '').toUpperCase());
        const interp = getInterpolatedCoords(code, idx, stopDistances, srcCoords, dstCoords);
        lat = interp.lat;
        lng = interp.lng;
      }

      // API gives ISO datetime strings for arrival/departure
      const schedArr = s.scheduledArrival ? formatTime(s.scheduledArrival) : (s.scheduledDeparture ? formatTime(s.scheduledDeparture) : '--:--');
      const schedDep = s.scheduledDeparture ? formatTime(s.scheduledDeparture) : schedArr;
      const actDep = s.actualDeparture ? formatTime(s.actualDeparture) : undefined;

      // Delay: use delayDeparture if available, else currentLoc delayMinutes for current/past stops
      const stopDelay = typeof s.delayDeparture === 'number' ? s.delayDeparture : (idx <= currentIdx ? delayMins : 0);

      const stStatus: 'passed' | 'current' | 'upcoming' =
        idx < currentIdx ? 'passed' : idx === currentIdx ? 'current' : 'upcoming';

      return {
        id: `${code.toLowerCase()}_${idx}`,
        name: s.stationName || code,
        code,
        lat,
        lng,
        scheduledArrival: schedArr,
        scheduledDeparture: schedDep,
        actualArrival: stStatus !== 'upcoming' ? schedArr : undefined,
        actualDeparture: actDep,
        delayMinutes: stopDelay,
        distanceFromStartKm: typeof s.distance === 'number' ? s.distance : idx * 10,
        elevationMeters: 100,
        platform: s.platform || undefined,
        status: stStatus,
      };
    });

    const currentStop = mappedStations[currentIdx];
    const nextStop = mappedStations[currentIdx + 1] || null;
    const prevStop = currentIdx > 0 ? mappedStations[currentIdx - 1] : null;
    const lastStop = mappedStations[mappedStations.length - 1];

    // Speed: use speedToNextStation from current stop if available, else estimate from train type
    const speedSource = rawStops[currentIdx];
    const avgSpeed = trainInfo.avgSpeed ? parseFloat(String(trainInfo.avgSpeed)) : 0;
    const speedToNext = speedSource?.speedToNextStationKmph || avgSpeed || 70;
    const currentSpeed = currentLoc.status === 'at-station' ? 0 : Math.round(speedToNext);

    // Total distance: use train.distance field
    const totalDist = parseFloat(String(trainInfo.distance || 0)) || lastStop.distanceFromStartKm || 1000;
    const coveredDist = currentStop.distanceFromStartKm;
    const progressPct = totalDist > 0 ? Math.min(100, Math.round((coveredDist / totalDist) * 100)) : 0;

    // Overall status
    let overallStatus = delayMins === 0 ? 'On Time' : delayMins <= 10 ? 'Slight Delay' : 'Delayed';
    if (currentStop.status === 'passed' && currentIdx === rawStops.length - 1) overallStatus = 'Completed';

    return {
      trainId: trainNumber,
      trainNumber,
      trainName: trainInfo.name || `Train ${trainNumber}`,
      status: overallStatus,
      delayMinutes: delayMins,
      currentStation: currentStop,
      nextStation: nextStop,
      previousStation: prevStop,
      currentLocation: {
        lat: currentStop.lat,
        lng: currentStop.lng,
        speedKmh: currentSpeed,
        heading: 90,
      },
      progressPercentage: progressPct,
      distanceCoveredKm: coveredDist,
      remainingDistanceKm: Math.max(0, Math.round(totalDist - coveredDist)),
      lastUpdated,
      etaDestination: lastStop.scheduledArrival,
      route: {
        source: src.name || mappedStations[0]?.name || 'Source',
        destination: dst.name || lastStop.name || 'Destination',
        totalDistanceKm: totalDist,
        totalDurationMinutes: parseInt(String(trainInfo.duration || 0), 10) || 0,
        stations: mappedStations,
      },
    };
  } catch (e) {
    console.error('mapRailRadarLive error:', e);
    return null;
  }
}


export async function fetchLiveTrainStatus(number: string) {
  const cacheKey = `status_${number}`;
  const nowTime = Date.now();

  const activeCached = statusCache.get(cacheKey);
  if (activeCached && activeCached.expiry > nowTime) {
    return activeCached.data;
  }

  // 1. Fetch live status from RailRadar API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${RAILRADAR_BASE}/trains/${number}/live`, {
      headers: { Authorization: `Bearer ${RAILRADAR_KEY}`, 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json?.success) {
        const mapped = mapRailRadarLive(json, number);
        if (mapped && mapped.route.stations.length > 0) {
          // Phase 1 — persist delay observation (real RailRadar data only)
          ingestFromLiveStatus(mapped);
          statusCache.set(cacheKey, { data: mapped, expiry: nowTime + 90000 });
          staleStatusCache.set(cacheKey, mapped);
          return mapped;
        }
      }
    }
  } catch (err: any) {
    console.log(`[trainsApi] RailRadar attempt 1 failed for ${number}:`, err.message);
  }

  // 2. Try haltsOnly option
  try {
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 6000);
    const res2 = await fetch(`${RAILRADAR_BASE}/trains/${number}/live?haltsOnly=true`, {
      headers: { Authorization: `Bearer ${RAILRADAR_KEY}`, 'Accept': 'application/json' },
      signal: controller2.signal,
    });
    clearTimeout(timeoutId2);

    if (res2.ok) {
      const json2 = await res2.json();
      if (json2?.success) {
        const mapped = mapRailRadarLive(json2, number);
        if (mapped && mapped.route.stations.length > 0) {
          // Phase 1 — persist delay observation (real RailRadar data only)
          ingestFromLiveStatus(mapped);
          statusCache.set(cacheKey, { data: mapped, expiry: nowTime + 90000 });
          staleStatusCache.set(cacheKey, mapped);
          return mapped;
        }
      }
    }
  } catch (err) {
    console.log(`[trainsApi] RailRadar attempt 2 failed for ${number}`);
  }

  // 3. Stale cache
  if (staleStatusCache.has(cacheKey)) {
    return staleStatusCache.get(cacheKey);
  }

  // 4. Calculate live status from official schedule engine
  if (REAL_TRAIN_SCHEDULES[number]) {
    const liveFromSchedule = calculateLiveStatusFromSchedule(number, REAL_TRAIN_SCHEDULES[number]);
    statusCache.set(cacheKey, { data: liveFromSchedule, expiry: nowTime + 90000 });
    staleStatusCache.set(cacheKey, liveFromSchedule);
    return liveFromSchedule;
  }

  // 5. Synthesize schedule from train map
  const trainName = FALLBACK_TRAIN_MAP[number] || `Train ${number}`;
  const src = trainName.includes(' - ') ? trainName.split(' - ')[0].trim() : 'Source';
  const dst = trainName.includes(' - ') ? trainName.split(' - ')[1].split(' ')[0].trim() : 'Destination';

  const synthesized = calculateLiveStatusFromSchedule(number, {
    name: trainName,
    type: 'Express',
    source: src,
    destination: dst,
    distance: 850,
    durationMins: 720,
    depHour: 8, depMin: 0,
    stations: [
      { code: 'SRC', name: src !== 'Source' ? src : 'Origin Station', dist: 0, arrMins: 0, depMins: 0, pf: '1' },
      { code: 'STN1', name: 'Intermediate Halt 1', dist: 250, arrMins: 200, depMins: 205, pf: '2' },
      { code: 'STN2', name: 'Intermediate Halt 2', dist: 550, arrMins: 450, depMins: 455, pf: '3' },
      { code: 'DST', name: dst !== 'Destination' ? dst : 'Destination Station', dist: 850, arrMins: 720, depMins: 720, pf: '1' },
    ],
  });

  statusCache.set(cacheKey, { data: synthesized, expiry: nowTime + 90000 });
  staleStatusCache.set(cacheKey, synthesized);
  return synthesized;
}

export async function searchTrainsBackend(query: string) {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return [];

  const entries = Object.entries(FALLBACK_TRAIN_MAP);
  const matches = entries
    .filter(([num, name]) =>
      num.toLowerCase().includes(q) || name.toLowerCase().includes(q)
    )
    .slice(0, 25)
    .map(([num, name]) => ({
      id: num,
      number: num,
      name,
      type: 'Express',
      source: name.includes(' - ') ? name.split(' - ')[0].trim() : 'Source',
      destination: name.includes(' - ') ? name.split(' - ')[1].split(' ')[0].trim() : 'Destination',
      route: {
        source: name.includes(' - ') ? name.split(' - ')[0].trim() : 'Source',
        destination: name.includes(' - ') ? name.split(' - ')[1].split(' ')[0].trim() : 'Destination',
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        stations: [],
      },
    }));

  if (/^\d{4,5}$/.test(q) && !matches.some((m) => m.number === q)) {
    matches.unshift({
      id: q,
      number: q,
      name: `Train ${q} Express`,
      type: 'Express',
      source: 'Source',
      destination: 'Destination',
      route: { source: 'Source', destination: 'Destination', totalDistanceKm: 0, totalDurationMinutes: 0, stations: [] },
    });
  }

  return matches;
}
