export interface Station {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  scheduledArrival: string;
  scheduledDeparture: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayMinutes: number; // 0 = on time, positive = delayed, negative = early
  distanceFromStartKm: number;
  elevationMeters: number;
  platform?: string;
  status: 'passed' | 'current' | 'upcoming';
}

export interface TrainRoute {
  source: string;
  destination: string;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  stations: Station[];
}

export interface Train {
  id: string;
  number: string;
  name: string;
  type: string; // 'Vande Bharat' | 'Rajdhani' | 'Shatabdi' | 'Express' | 'Superfast' | 'Duronto' | 'Gatimaan' etc.
  source: string;
  destination: string;
  daysOfOperation?: string[]; // Optional — not always available from API
  route: TrainRoute;
}

export interface LiveStatus {
  trainId: string;
  trainNumber: string;
  trainName: string;
  status: 'On Time' | 'Delayed' | 'Cancelled' | 'Completed' | 'Not Started' | string;
  delayMinutes: number;
  currentStation: Station;
  nextStation: Station | null;
  previousStation: Station | null;
  currentLocation: {
    lat: number;
    lng: number;
    speedKmh: number;
    heading: number;
  };
  progressPercentage: number;
  distanceCoveredKm: number;
  remainingDistanceKm: number;
  lastUpdated: string;
  etaDestination: string;
  route?: TrainRoute; // Optional — populated from live status API when available
}

export interface WeatherData {
  stationCode: string;
  stationName: string;
  temperature: number; // Celsius
  condition: string; // 'Sunny' | 'Partly Cloudy' | 'Cloudy' | 'Rain' | 'Thunderstorm' | 'Fog' | 'Clear' | API string
  humidity: number; // %
  windSpeedKmh: number;
  rainProbability: number; // %
  icon: string;
  forecast: {
    time: string;
    temp: number;
    condition: string;
  }[];
}

export interface GeoPOI {
  id: string;
  name: string;
  type: 'river' | 'lake' | 'bridge' | 'tunnel' | 'ghat' | 'attraction' | 'city' | string;
  distanceKm: number;
  lat: number;
  lng: number;
  description?: string;
}

export interface ElevationPoint {
  distanceKm: number;
  elevationMeters: number;
  stationName?: string;
}

export interface FavouriteTrain {
  trainNumber: string;
  trainName: string;
  source: string;
  destination: string;
  savedAt: string;
}

export interface RecentSearch {
  trainNumber: string;
  trainName: string;
  searchedAt: string;
}
