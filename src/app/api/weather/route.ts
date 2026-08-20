import { NextRequest, NextResponse } from 'next/server';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '5105f8e243c9ae93fc6eebfcb6ea9b24';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon') || searchParams.get('lng');
  const stationCode = searchParams.get('code') || 'STN';
  const stationName = searchParams.get('name') || 'Station';

  const defaultMock = {
    stationCode,
    stationName,
    temperature: 29,
    condition: 'Partly Cloudy',
    humidity: 58,
    windSpeedKmh: 12,
    rainProbability: 10,
    icon: 'partly-cloudy',
    forecast: [
      { time: '12:00', temp: 30, condition: 'Sunny' },
      { time: '14:00', temp: 31, condition: 'Sunny' },
      { time: '16:00', temp: 28, condition: 'Partly Cloudy' },
    ],
  };

  if (!lat || !lon) {
    return NextResponse.json(defaultMock);
  }

  try {
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`,
      { cache: 'no-store' }
    );
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`,
      { cache: 'no-store' }
    );

    if (weatherRes.ok && forecastRes.ok) {
      const wData = await weatherRes.json();
      const fData = await forecastRes.json();

      const forecast = (fData.list || []).slice(0, 4).map((item: any) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: Math.round(item.main.temp),
        condition: item.weather[0]?.main || 'Clear',
      }));

      return NextResponse.json({
        stationCode,
        stationName,
        temperature: Math.round(wData.main.temp),
        condition: wData.weather[0]?.main || 'Clear',
        humidity: wData.main.humidity,
        windSpeedKmh: Math.round(wData.wind.speed * 3.6),
        rainProbability: wData.clouds?.all || 10,
        icon: wData.weather[0]?.icon || '01d',
        forecast,
      });
    }
  } catch (err) {
    console.error('[weather API] error:', err);
  }

  return NextResponse.json(defaultMock);
}
