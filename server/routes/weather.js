import { Router } from 'express';
import { asyncRoute } from '../lib/http.js';

const router = Router();

const LATITUDE = Number(process.env.WEATHER_LAT) || 11.0849;
const LONGITUDE = Number(process.env.WEATHER_LON) || 39.7392;
const TIMEOUT_MS = Number(process.env.WEATHER_TIMEOUT_MS) || 8000;
const ENABLED = process.env.WEATHER_ENABLED !== 'false';

// Fresh responses are served for 15 minutes. If the provider is unavailable,
// the last successful response can be served for up to 6 hours.
export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
export const WEATHER_STALE_TTL_MS = 6 * 60 * 60 * 1000;
const RATE_LIMIT_FALLBACK_MS = 60 * 1000;

export const WEATHER_SOURCE = Object.freeze({
  name: 'Open-Meteo',
  url: 'https://open-meteo.com/',
  license: 'CC BY 4.0',
  attribution: 'Weather data by Open-Meteo.com',
});

// WMO weather interpretation codes used by Open-Meteo.
export const WMO_DESCRIPTIONS = Object.freeze({
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
});

let cache = null;
let inFlight = null;
let rateLimitedUntil = 0;

export function resetWeatherCache() {
  cache = null;
  inFlight = null;
  rateLimitedUntil = 0;
}

function toOffsetIso(localTime, offsetSeconds) {
  if (!localTime) return null;

  const offset = Number(offsetSeconds);
  if (!Number.isFinite(offset)) return localTime;

  const sign = offset >= 0 ? '+' : '-';
  const absolute = Math.abs(offset);
  const hours = String(Math.floor(absolute / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((absolute % 3600) / 60)).padStart(2, '0');

  return `${localTime}${sign}${hours}:${minutes}`;
}

const HOURLY_WINDOW = 24;
const FORECAST_DAYS = 7;

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function booleanOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number === 1 : null;
}

// Open-Meteo returns hourly values on the hour in the requested timezone, so the
// current reading maps onto the hour block it falls inside.
function hourlyIndexFor(times, currentTime) {
  if (!Array.isArray(times) || times.length === 0) return -1;
  if (!currentTime) return 0;

  const key = String(currentTime).slice(0, 13);
  const exact = times.indexOf(`${key}:00`);
  if (exact !== -1) return exact;

  let fallback = 0;
  for (let index = 0; index < times.length; index += 1) {
    if (String(times[index]).slice(0, 13) <= key) fallback = index;
    else break;
  }
  return fallback;
}

export async function fetchWeather() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(LATITUDE));
  url.searchParams.set('longitude', String(LONGITUDE));
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'is_day',
    ].join(',')
  );
  url.searchParams.set(
    'hourly',
    [
      'temperature_2m',
      'weather_code',
      'precipitation_probability',
      'is_day',
      'wind_speed_10m',
      'uv_index',
      'visibility',
      'dew_point_2m',
    ].join(',')
  );
  url.searchParams.set(
    'daily',
    [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'weather_code',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_sum',
      'wind_speed_10m_max',
    ].join(',')
  );
  url.searchParams.set('timezone', 'Africa/Addis_Ababa');
  url.searchParams.set('forecast_days', String(FORECAST_DAYS));

  const response = await fetch(url, {
    headers: { 'User-Agent': 'smart-city-information-portal' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = new Error(
      `Open-Meteo responded with status ${response.status}`
    );
    error.status = response.status;
    error.retryAfter = response.headers?.get?.('retry-after') ?? null;
    throw error;
  }

  const json = await response.json();
  const current = json.current ?? {};
  const daily = json.daily ?? {};
  const hourly = json.hourly ?? {};
  const code = Number(current.weather_code);

  const hourlyTimes = Array.isArray(hourly.time) ? hourly.time : [];
  const nowIndex = hourlyIndexFor(hourlyTimes, current.time);
  const windowStart = Math.max(nowIndex, 0);

  const hourlyForecast = hourlyTimes
    .slice(windowStart, windowStart + HOURLY_WINDOW)
    .map((time, offset) => {
      const index = windowStart + offset;
      const hourCode = numberOrNull(hourly.weather_code?.[index]);

      return {
        time,
        temperatureC: numberOrNull(hourly.temperature_2m?.[index]),
        weatherCode: hourCode,
        description: WMO_DESCRIPTIONS[hourCode] ?? 'Unknown conditions',
        precipitationProbability: numberOrNull(
          hourly.precipitation_probability?.[index]
        ),
        windKph: numberOrNull(hourly.wind_speed_10m?.[index]),
        isDay: booleanOrNull(hourly.is_day?.[index]),
      };
    });

  const dailyTimes = Array.isArray(daily.time) ? daily.time : [];

  const dailyForecast = dailyTimes.map((date, index) => {
    const dayCode = numberOrNull(daily.weather_code?.[index]);

    return {
      date,
      maxC: numberOrNull(daily.temperature_2m_max?.[index]),
      minC: numberOrNull(daily.temperature_2m_min?.[index]),
      weatherCode: dayCode,
      description: WMO_DESCRIPTIONS[dayCode] ?? 'Unknown conditions',
      precipitationProbabilityMax: numberOrNull(
        daily.precipitation_probability_max?.[index]
      ),
      precipitationMm: numberOrNull(daily.precipitation_sum?.[index]),
      uvIndexMax: numberOrNull(daily.uv_index_max?.[index]),
      windKphMax: numberOrNull(daily.wind_speed_10m_max?.[index]),
      sunrise: daily.sunrise?.[index] ?? null,
      sunset: daily.sunset?.[index] ?? null,
    };
  });

  const currentHour = Math.max(nowIndex, 0);
  const visibilityM = numberOrNull(hourly.visibility?.[currentHour]);

  return {
    // --- current conditions (unchanged fields) ---
    location: 'Kombolcha, Ethiopia',
    latitude: json.latitude ?? LATITUDE,
    longitude: json.longitude ?? LONGITUDE,
    timezone: json.timezone ?? 'Africa/Addis_Ababa',
    observedAt: toOffsetIso(current.time, json.utc_offset_seconds),
    temperatureC: current.temperature_2m ?? null,
    apparentC: current.apparent_temperature ?? null,
    humidity: current.relative_humidity_2m ?? null,
    precipitationMm: current.precipitation ?? null,
    windKph: current.wind_speed_10m ?? null,
    windDirectionDeg: current.wind_direction_10m ?? null,
    weatherCode: Number.isFinite(code) ? code : null,
    description: WMO_DESCRIPTIONS[code] ?? 'Unknown conditions',
    today: {
      maxC: daily.temperature_2m_max?.[0] ?? null,
      minC: daily.temperature_2m_min?.[0] ?? null,
      precipitationProbabilityMax:
        daily.precipitation_probability_max?.[0] ?? null,
    },

    // --- additive detail (same Open-Meteo response, no new provider) ---
    isDay: booleanOrNull(current.is_day),
    dewPointC: numberOrNull(hourly.dew_point_2m?.[currentHour]),
    uvIndex: numberOrNull(hourly.uv_index?.[currentHour]),
    visibilityKm:
      visibilityM === null ? null : Math.round((visibilityM / 1000) * 10) / 10,
    sunrise: daily.sunrise?.[0] ?? null,
    sunset: daily.sunset?.[0] ?? null,
    hourly: hourlyForecast,
    daily: dailyForecast,
    source: WEATHER_SOURCE,
  };
}

function retryAfterMs(value, now) {
  if (value === null || value === undefined) {
    return RATE_LIMIT_FALLBACK_MS;
  }

  const text = String(value).trim();
  if (!text) return RATE_LIMIT_FALLBACK_MS;

  const seconds = Number(text);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const date = Date.parse(text);
  if (Number.isFinite(date)) {
    return Math.max(0, date - now);
  }

  return RATE_LIMIT_FALLBACK_MS;
}

function setRetryAfterHeader(res, now) {
  if (now >= rateLimitedUntil) return;

  res.setHeader(
    'Retry-After',
    String(Math.max(1, Math.ceil((rateLimitedUntil - now) / 1000)))
  );
}

function sendWeatherFallback(res, now, rateLimited) {
  if (cache && now - cache.fetchedAt <= WEATHER_STALE_TTL_MS) {
    if (now < rateLimitedUntil) {
      setRetryAfterHeader(res, now);
    }

    return res.json({
      data: { ...cache.payload, stale: true },
      cached: true,
      warning:
        'Live weather is temporarily unavailable; showing the last successful reading.',
    });
  }

  if (rateLimited || now < rateLimitedUntil) {
    if (now < rateLimitedUntil) {
      setRetryAfterHeader(res, now);
    }

    return res.status(503).json({
      error:
        'Weather data is temporarily unavailable because the provider is limiting requests. Please try again later.',
    });
  }

  return res.status(502).json({
    error: 'Weather service is temporarily unavailable',
  });
}

function loadWeather() {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const payload = await fetchWeather();
      const fetchedAt = Date.now();
      const record = {
        ...payload,
        fetchedAt: new Date(fetchedAt).toISOString(),
      };

      cache = { fetchedAt, payload: record };
      rateLimitedUntil = 0;

      return { record, rateLimited: false };
    } catch (error) {
      const rateLimited = error?.status === 429;
      const now = Date.now();

      if (rateLimited) {
        const delay = retryAfterMs(error.retryAfter, now);
        rateLimitedUntil = Math.max(rateLimitedUntil, now + delay);

        console.warn(
          `[weather] Provider rate limit active for ${Math.ceil(
            Math.max(0, rateLimitedUntil - now) / 1000
          )}s`
        );
      }

      let reason = error?.cause?.code || error?.message || 'unknown error';
      if (rateLimited) reason = 'HTTP 429';
      else if (error?.status) reason = `HTTP ${error.status}`;

      console.error('[weather] Live fetch failed:', reason);

      return { error, rateLimited };
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

// PUBLIC: Current weather for Kombolcha, sourced from Open-Meteo (no API key).
router.get(
  '/',
  asyncRoute(async (_req, res) => {
    if (!ENABLED) {
      return res.status(503).json({
        error: 'Weather information is disabled on this deployment',
      });
    }

    const now = Date.now();

    if (cache && now - cache.fetchedAt < WEATHER_CACHE_TTL_MS) {
      return res.json({
        data: { ...cache.payload, stale: false },
        cached: true,
      });
    }

    if (now < rateLimitedUntil) {
      return sendWeatherFallback(res, now, true);
    }

    const result = await loadWeather();

    if (result.record) {
      return res.json({
        data: { ...result.record, stale: false },
        cached: false,
      });
    }

    return sendWeatherFallback(res, Date.now(), result.rateLimited);
  })
);

export default router;
