import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute } from '../lib/http.js';

const router = Router();

const LATITUDE = Number(process.env.WEATHER_LAT) || 11.0849;
const LONGITUDE = Number(process.env.WEATHER_LON) || 39.7392;
const TIMEOUT_MS = Number(process.env.WEATHER_TIMEOUT_MS) || 8000;
const ENABLED = process.env.WEATHER_ENABLED !== 'false';

// Fresh responses are served for 15 minutes. If the provider is unavailable,
// the last successful response can be served for up to 6 hours. WeatherAPI.com
// current conditions may only be cached for 60 minutes under its terms, so
// fallback data from that provider gets a shorter stale window.
export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
export const WEATHER_STALE_TTL_MS = 6 * 60 * 60 * 1000;
export const WEATHERAPI_STALE_TTL_MS = 60 * 60 * 1000;
export const WEATHER_PERSISTENCE_TIMEOUT_MS = 2000;
// After a persisted read fails or returns an unusable row, skip further reads
// for this long. Live provider calls and stale fallback are never suppressed.
export const WEATHER_PERSISTENCE_RETRY_MS = 60 * 1000;
const RATE_LIMIT_FALLBACK_MS = 60 * 1000;
const WEATHERAPI_FORECAST_DAYS = 3;

// The persisted row is keyed by location and timezone so a coordinate change
// cannot reuse a reading for another place. The key is kept stable for existing
// rows even when the current reading came from the secondary provider.
const WEATHER_CACHE_KEY = `open-meteo:v1:${LATITUDE}:${LONGITUDE}:Africa/Addis_Ababa`;

export const WEATHER_SOURCE = Object.freeze({
  name: 'Open-Meteo',
  url: 'https://open-meteo.com/',
  license: 'CC BY 4.0',
  attribution: 'Weather data by Open-Meteo.com',
});

export const WEATHERAPI_SOURCE = Object.freeze({
  name: 'WeatherAPI.com',
  url: 'https://www.weatherapi.com/',
  license: 'WeatherAPI.com Terms and Conditions',
  attribution: 'Powered by WeatherAPI.com',
});

// WeatherAPI.com condition codes mapped onto the WMO codes used by the public
// response shape. Descriptions still use the provider's own condition text when
// available, which keeps rare conditions such as dust storms accurate.
export const WEATHERAPI_TO_WMO = Object.freeze({
  1000: 0, // Sunny / Clear
  1003: 2, // Partly cloudy
  1006: 3, // Cloudy
  1009: 3, // Overcast
  1012: 45, // Haze
  1015: 45, // Dust haze
  1018: 45, // Blowing dust
  1021: 45, // Dust storm
  1024: 45, // Sandstorm
  1027: 45, // Severe sandstorm
  1030: 45, // Mist
  1033: 45, // Smoke
  1036: 45, // Smoky haze
  1039: 45, // Smog
  1042: 45, // Severe smog
  1045: 45, // Saharan dust
  1048: 45, // Dust
  1063: 80, // Patchy rain possible
  1066: 85, // Patchy snow possible
  1069: 66, // Patchy sleet possible
  1072: 56, // Patchy freezing drizzle possible
  1087: 95, // Thundery outbreaks possible
  1114: 85, // Blowing snow
  1117: 75, // Blizzard
  1135: 45, // Fog
  1147: 48, // Freezing fog
  1150: 51, // Patchy light drizzle
  1153: 51, // Light drizzle
  1168: 56, // Freezing drizzle
  1171: 57, // Heavy freezing drizzle
  1180: 80, // Patchy light rain
  1183: 61, // Light rain
  1186: 63, // Moderate rain at times
  1189: 63, // Moderate rain
  1192: 65, // Heavy rain at times
  1195: 65, // Heavy rain
  1198: 66, // Light freezing rain
  1201: 67, // Moderate or heavy freezing rain
  1204: 66, // Light sleet
  1207: 67, // Moderate or heavy sleet
  1210: 85, // Patchy light snow
  1213: 71, // Light snow
  1216: 73, // Patchy moderate snow
  1219: 73, // Moderate snow
  1222: 75, // Patchy heavy snow
  1225: 75, // Heavy snow
  1237: 77, // Ice pellets
  1240: 80, // Light rain shower
  1243: 81, // Moderate or heavy rain shower
  1246: 82, // Torrential rain shower
  1249: 85, // Light sleet showers
  1252: 86, // Moderate or heavy sleet showers
  1255: 85, // Light snow showers
  1258: 86, // Moderate or heavy snow showers
  1261: 85, // Light showers of ice pellets
  1264: 86, // Moderate or heavy showers of ice pellets
  1273: 95, // Patchy light rain with thunder
  1276: 95, // Moderate or heavy rain with thunder
  1279: 95, // Patchy light snow with thunder
  1282: 95, // Moderate or heavy snow with thunder
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
let persistedLookup = null;
let persistedRetryAt = 0;
let primaryRateLimitedUntil = 0;
let secondaryRateLimitedUntil = 0;

export function resetWeatherCache() {
  cache = null;
  inFlight = null;
  persistedLookup = null;
  persistedRetryAt = 0;
  primaryRateLimitedUntil = 0;
  secondaryRateLimitedUntil = 0;
}

function weatherApiKey() {
  const value = process.env.WEATHERAPI_API_KEY;
  return typeof value === 'string' ? value.trim() : '';
}

function staleTtlMsForPayload(payload) {
  return payload?.source?.name === WEATHERAPI_SOURCE.name
    ? WEATHERAPI_STALE_TTL_MS
    : WEATHER_STALE_TTL_MS;
}

function staleTtlMsForRecord(record) {
  return staleTtlMsForPayload(record?.payload);
}

function safeFailureReason(error) {
  if (error?.status) return `HTTP ${error.status}`;
  if (error?.code) return String(error.code);
  if (error?.name === 'TimeoutError') return 'timeout';
  return 'network error';
}

function isRateLimitedError(error) {
  return Number(error?.status) === 429;
}

function isPermanentProviderFailure(error) {
  const status = Number(error?.status);
  if (!Number.isFinite(status)) return false;
  if (status === 408 || status === 425 || status === 429) return false;
  return status >= 400 && status < 500;
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
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;

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
  const code = numberOrNull(current.weather_code);

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
    temperatureC: numberOrNull(current.temperature_2m),
    apparentC: numberOrNull(current.apparent_temperature),
    humidity: numberOrNull(current.relative_humidity_2m),
    precipitationMm: numberOrNull(current.precipitation),
    windKph: numberOrNull(current.wind_speed_10m),
    windDirectionDeg: numberOrNull(current.wind_direction_10m),
    weatherCode: code,
    description: WMO_DESCRIPTIONS[code] ?? 'Unknown conditions',
    today: {
      maxC: numberOrNull(daily.temperature_2m_max?.[0]),
      minC: numberOrNull(daily.temperature_2m_min?.[0]),
      precipitationProbabilityMax: numberOrNull(
        daily.precipitation_probability_max?.[0]
      ),
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

function weatherApiCondition(condition) {
  const providerCode = numberOrNull(condition?.code);
  const text =
    typeof condition?.text === 'string' && condition.text.trim()
      ? condition.text.trim()
      : null;

  return {
    code:
      providerCode === null
        ? null
        : WEATHERAPI_TO_WMO[providerCode] ?? null,
    description: text,
  };
}

// WeatherAPI.com returns wall-clock times without an offset. Keep them as the
// same local strings the client already expects, and use the provider's epoch
// plus IANA timezone only to calculate the offset for observedAt.
function weatherApiLocalTime(value) {
  if (typeof value !== 'string') return null;

  const match = value
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);

  return match ? `${match[1]}T${match[2]}:${match[3]}` : null;
}

function timezoneOffsetSeconds(epochMs, timeZone) {
  if (!Number.isFinite(epochMs) || typeof timeZone !== 'string' || !timeZone) {
    return null;
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(epochMs));

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)])
    );

    if (
      ![
        values.year,
        values.month,
        values.day,
        values.hour,
        values.minute,
        values.second,
      ].every(Number.isFinite)
    ) {
      return null;
    }

    const asUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second
    );

    return Math.round(
      (asUtc - Math.floor(epochMs / 1000) * 1000) / 1000
    );
  } catch {
    return null;
  }
}

function formatWeatherApiTimestamp(localTime, epochSeconds, timeZone) {
  const local = weatherApiLocalTime(localTime);
  if (!local) return null;

  const epoch = numberOrNull(epochSeconds);
  if (epoch === null) return local;

  const offset = timezoneOffsetSeconds(epoch * 1000, timeZone);
  return offset === null ? local : toOffsetIso(local, offset);
}

function isoFromEpochSeconds(epochSeconds) {
  const epoch = numberOrNull(epochSeconds);
  if (epoch === null) return null;

  const date = new Date(epoch * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function weatherApiClock(date, value) {
  if (typeof date !== 'string' || typeof value !== 'string') {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const match = value
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) return null;

  const minutes = Number(match[2]);

  if (!Number.isInteger(minutes) || minutes > 59) {
    return null;
  }

  let hours = Number(match[1]);

  if (hours < 1 || hours > 12) {
    return null;
  }

  if (match[3].toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (match[3].toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${date}T${String(hours).padStart(2, '0')}:${String(
    minutes
  ).padStart(2, '0')}`;
}

function weatherApiPrecipitationChance(dayOrHour) {
  const rain = numberOrNull(
    dayOrHour?.daily_chance_of_rain ?? dayOrHour?.chance_of_rain
  );
  const snow = numberOrNull(
    dayOrHour?.daily_chance_of_snow ?? dayOrHour?.chance_of_snow
  );

  if (rain === null) return snow;
  if (snow === null) return rain;
  return Math.max(rain, snow);
}

function normalizeWeatherApiResponse(json) {
  const location = json?.location ?? {};
  const current = json?.current ?? {};
  const forecastDays = Array.isArray(json?.forecast?.forecastday)
    ? json.forecast.forecastday.filter(isPlainObject)
    : [];

  const timezone =
    typeof location.tz_id === 'string' && location.tz_id.trim()
      ? location.tz_id.trim()
      : 'Africa/Addis_Ababa';

  const currentCondition = weatherApiCondition(current.condition);
  const hourlyEntries = forecastDays.flatMap((day) =>
    Array.isArray(day.hour) ? day.hour.filter(isPlainObject) : []
  );
  const hourlyTimes = hourlyEntries.map((hour) =>
    weatherApiLocalTime(hour.time)
  );
  const currentLocal =
    weatherApiLocalTime(current.last_updated) ??
    weatherApiLocalTime(location.localtime);
  const currentIndex = Math.max(
    hourlyIndexFor(hourlyTimes, currentLocal),
    0
  );
  const currentHour = hourlyEntries[currentIndex] ?? {};

  const hourly = hourlyEntries
    .slice(currentIndex, currentIndex + HOURLY_WINDOW)
    .map((hour, offset) => {
      const index = currentIndex + offset;
      const condition = weatherApiCondition(hour.condition);

      return {
        time: hourlyTimes[index] ?? null,
        temperatureC: numberOrNull(hour.temp_c),
        weatherCode: condition.code,
        description:
          condition.description ??
          WMO_DESCRIPTIONS[condition.code] ??
          'Unknown conditions',
        precipitationProbability: weatherApiPrecipitationChance(hour),
        windKph: numberOrNull(hour.wind_kph),
        isDay: booleanOrNull(hour.is_day),
      };
    });

  const daily = forecastDays
    .map((day) => {
      if (typeof day.date !== 'string' || !day.date) return null;

      const condition = weatherApiCondition(day.day?.condition);

      return {
        date: day.date,
        maxC: numberOrNull(day.day?.maxtemp_c),
        minC: numberOrNull(day.day?.mintemp_c),
        weatherCode: condition.code,
        description:
          condition.description ??
          WMO_DESCRIPTIONS[condition.code] ??
          'Unknown conditions',
        precipitationProbabilityMax: weatherApiPrecipitationChance(day.day),
        precipitationMm: numberOrNull(day.day?.totalprecip_mm),
        uvIndexMax: numberOrNull(day.day?.uv),
        windKphMax: numberOrNull(day.day?.maxwind_kph),
        sunrise: weatherApiClock(day.date, day.astro?.sunrise),
        sunset: weatherApiClock(day.date, day.astro?.sunset),
      };
    })
    .filter(Boolean);

  const today = forecastDays[0]?.day ?? {};
  const firstDay = forecastDays[0];
  const observedEpoch =
    numberOrNull(current.last_updated_epoch) ??
    numberOrNull(location.localtime_epoch);
  const observedAt =
    formatWeatherApiTimestamp(
      current.last_updated ?? location.localtime,
      observedEpoch,
      timezone
    ) ?? isoFromEpochSeconds(observedEpoch);

  return {
    location: 'Kombolcha, Ethiopia',
    latitude: numberOrNull(location.lat) ?? LATITUDE,
    longitude: numberOrNull(location.lon) ?? LONGITUDE,
    timezone,
    observedAt,
    temperatureC: numberOrNull(current.temp_c),
    apparentC: numberOrNull(current.feelslike_c),
    humidity: numberOrNull(current.humidity),
    precipitationMm: numberOrNull(current.precip_mm),
    windKph: numberOrNull(current.wind_kph),
    windDirectionDeg: numberOrNull(current.wind_degree),
    weatherCode: currentCondition.code,
    description:
      currentCondition.description ??
      WMO_DESCRIPTIONS[currentCondition.code] ??
      'Unknown conditions',
    today: {
      maxC: numberOrNull(today.maxtemp_c),
      minC: numberOrNull(today.mintemp_c),
      precipitationProbabilityMax: weatherApiPrecipitationChance(today),
    },
    isDay: booleanOrNull(current.is_day),
    dewPointC: numberOrNull(currentHour.dewpoint_c),
    uvIndex:
      numberOrNull(current.uv) ?? numberOrNull(currentHour.uv),
    visibilityKm:
      numberOrNull(current.vis_km) ?? numberOrNull(currentHour.vis_km),
    sunrise: firstDay
      ? weatherApiClock(firstDay.date, firstDay.astro?.sunrise)
      : null,
    sunset: firstDay
      ? weatherApiClock(firstDay.date, firstDay.astro?.sunset)
      : null,
    hourly,
    daily,
    source: WEATHERAPI_SOURCE,
  };
}

export async function fetchWeatherApiWeather(apiKey) {
  const url = new URL('https://api.weatherapi.com/v1/forecast.json');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', `${LATITUDE},${LONGITUDE}`);
  url.searchParams.set('days', String(WEATHERAPI_FORECAST_DAYS));
  url.searchParams.set('aqi', 'no');
  url.searchParams.set('alerts', 'no');

  let response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': 'smart-city-information-portal' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    // Never carry through a raw error: some runtimes include the request URL,
    // which contains the API key, in the message or cause.
    const wrapped = new Error('WeatherAPI.com request failed');
    wrapped.code =
      error?.name === 'TimeoutError'
        ? 'TIMEOUT'
        : error?.cause?.code ||
          (typeof error?.code === 'string' ? error.code : 'NETWORK_ERROR');
    throw wrapped;
  }

  if (!response.ok) {
    const error = new Error('WeatherAPI.com request failed');
    error.status = response.status;
    error.retryAfter = response.headers?.get?.('retry-after') ?? null;
    throw error;
  }

  let json;
  try {
    json = await response.json();
  } catch {
    const error = new Error('WeatherAPI.com returned malformed JSON');
    error.code = 'MALFORMED_WEATHER';
    throw error;
  }

  try {
    return normalizeWeatherApiResponse(json);
  } catch {
    const error = new Error('WeatherAPI.com returned malformed weather data');
    error.code = 'MALFORMED_WEATHER';
    throw error;
  }
}

// Bound how long the route waits for persistence. This race does not cancel
// the underlying query. pg's query_timeout starts only after a pool client is
// acquired, so a query still queued for a client is not covered here; the
// 60-second read-suppression window prevents new reads from piling up.
function withPersistenceTimeout(promise, operation) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Persistent cache ${operation} timed out`));
    }, WEATHER_PERSISTENCE_TIMEOUT_MS);
    timer?.unref?.();
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// pg 8.23.x supports a per-query query_timeout in milliseconds. The existing
// query() wrapper forwards this object to pool.query. On expiry the query
// errors and the pool releases the client with an error, which closes it
// instead of returning it to the idle pool. This is a client-side timeout, not
// a PostgreSQL pg_cancel_backend/statement_timeout. It starts after a pool
// client is acquired, so it covers an executing query but not pool-acquisition
// time or a query still waiting for a client.
function persistenceQuery(text, values) {
  return query({
    text,
    values,
    query_timeout: WEATHER_PERSISTENCE_TIMEOUT_MS,
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const HOURLY_READING_KEYS = [
  'temperatureC',
  'weatherCode',
  'precipitationProbability',
  'windKph',
];

const DAILY_READING_KEYS = [
  'maxC',
  'minC',
  'weatherCode',
  'precipitationProbabilityMax',
  'precipitationMm',
  'uvIndexMax',
  'windKphMax',
];

function hasFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasFiniteReading(entry, keys) {
  return isPlainObject(entry) && keys.some((key) => hasFiniteNumber(entry[key]));
}

function blockHasFiniteReading(entries, keys) {
  return entries.some((entry) => hasFiniteReading(entry, keys));
}

// A payload is usable only when it contains at least one finite JSON number
// reading. A supplied non-empty hourly or daily block must also contain one;
// an absent or empty optional block is allowed. Time labels, nulls, booleans,
// numeric strings and empty objects do not count; zero is a valid reading.
function isUsableWeatherPayload(payload) {
  if (!isPlainObject(payload)) return false;

  if (payload.hourly !== undefined && !Array.isArray(payload.hourly)) {
    return false;
  }
  if (payload.daily !== undefined && !Array.isArray(payload.daily)) {
    return false;
  }
  if (Array.isArray(payload.hourly) && !payload.hourly.every(isPlainObject)) {
    return false;
  }
  if (Array.isArray(payload.daily) && !payload.daily.every(isPlainObject)) {
    return false;
  }

  const hasCurrent = [
    'temperatureC',
    'apparentC',
    'humidity',
    'weatherCode',
  ].some((key) => hasFiniteNumber(payload[key]));

  const hourlyProvided =
    Array.isArray(payload.hourly) && payload.hourly.length > 0;
  const dailyProvided =
    Array.isArray(payload.daily) && payload.daily.length > 0;

  const hasHourly =
    hourlyProvided &&
    blockHasFiniteReading(payload.hourly, HOURLY_READING_KEYS);
  const hasDaily =
    dailyProvided && blockHasFiniteReading(payload.daily, DAILY_READING_KEYS);

  if (hourlyProvided && !hasHourly) return false;
  if (dailyProvided && !hasDaily) return false;

  return hasCurrent || hasHourly || hasDaily;
}

async function readPersistedWeather() {
  const { rows } = await withPersistenceTimeout(
    persistenceQuery(
      `select payload, fetched_at
         from public.weather_cache
        where cache_key = $1
        limit 1`,
      [WEATHER_CACHE_KEY]
    ),
    'read'
  );

  const row = rows?.[0];
  if (!row) return { record: null, rejected: false };

  let payload = row.payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return { record: null, rejected: true };
    }
  }

  if (!isUsableWeatherPayload(payload)) {
    return { record: null, rejected: true };
  }

  const fetchedAt = new Date(row.fetched_at).getTime();
  const checkedAt = Date.now();
  if (
    !Number.isFinite(fetchedAt) ||
    fetchedAt > checkedAt ||
    checkedAt - fetchedAt > staleTtlMsForPayload(payload)
  ) {
    return { record: null, rejected: true };
  }

  return {
    record: {
      fetchedAt,
      payload: {
        ...payload,
        fetchedAt: new Date(fetchedAt).toISOString(),
      },
    },
    rejected: false,
  };
}

async function persistWeather(record) {
  await withPersistenceTimeout(
    persistenceQuery(
      `insert into public.weather_cache
         (cache_key, payload, fetched_at, updated_at)
       values ($1, $2::jsonb, $3, now())
       on conflict (cache_key) do update
         set payload = excluded.payload,
             fetched_at = excluded.fetched_at,
             updated_at = now()
         where excluded.fetched_at > weather_cache.fetched_at`,
      [
        WEATHER_CACHE_KEY,
        JSON.stringify(record),
        new Date(record.fetchedAt).toISOString(),
      ]
    ),
    'write'
  );
}

async function hydrateWeatherCache(now) {
  if (persistedLookup) return persistedLookup;
  if (Date.now() < persistedRetryAt) return cache;

  persistedLookup = (async () => {
    try {
      const { record, rejected } = await readPersistedWeather();
      persistedRetryAt = rejected
        ? Date.now() + WEATHER_PERSISTENCE_RETRY_MS
        : 0;

      if (
        record &&
        now - record.fetchedAt <= staleTtlMsForRecord(record) &&
        (!cache || record.fetchedAt > cache.fetchedAt)
      ) {
        cache = record;
      }

      return cache;
    } catch (error) {
      persistedRetryAt = Date.now() + WEATHER_PERSISTENCE_RETRY_MS;
      console.error(
        '[weather] Persistent cache read failed:',
        error?.message || 'unknown error'
      );
      return cache;
    } finally {
      persistedLookup = null;
    }
  })();

  return persistedLookup;
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

function setRetryAfterHeader(res, now, until) {
  if (!Number.isFinite(until) || now >= until) return;

  res.setHeader(
    'Retry-After',
    String(Math.max(1, Math.ceil((until - now) / 1000)))
  );
}

function sendWeatherFallback(
  res,
  now,
  { rateLimited = false, retryAt = 0 } = {}
) {
  if (cache && now - cache.fetchedAt <= staleTtlMsForRecord(cache)) {
    if (rateLimited) {
      setRetryAfterHeader(res, now, retryAt);
    }

    return res.json({
      data: { ...cache.payload, stale: true },
      cached: true,
      warning:
        'Live weather is temporarily unavailable; showing the last successful reading.',
    });
  }

  if (rateLimited) {
    setRetryAfterHeader(res, now, retryAt);

    return res.status(503).json({
      error:
        'Weather data is temporarily unavailable because the provider is limiting requests. Please try again later.',
    });
  }

  return res.status(502).json({
    error: 'Weather service is temporarily unavailable',
  });
}

async function storeWeather(payload) {
  const fetchedAt = Date.now();
  const record = {
    ...payload,
    fetchedAt: new Date(fetchedAt).toISOString(),
  };

  cache = { fetchedAt, payload: record };

  try {
    await persistWeather(record);
  } catch (error) {
    console.error(
      '[weather] Persistent cache write failed:',
      error?.message || 'unknown error'
    );
  }

  return record;
}

function activateRateLimit(error, currentUntil, provider) {
  const now = Date.now();
  // A provider can omit Retry-After or send a non-positive/expired value. Keep
  // the existing 60-second cooldown floor so a 429 always suppresses that
  // provider for at least the normal retry window.
  const delay = Math.max(
    RATE_LIMIT_FALLBACK_MS,
    retryAfterMs(error?.retryAfter, now)
  );
  const until = Math.max(currentUntil, now + delay);

  console.warn(
    `[weather] ${provider} rate limit active for ${Math.ceil(
      Math.max(0, until - now) / 1000
    )}s`
  );

  return until;
}

function earliestFutureRateLimit(...values) {
  const now = Date.now();
  const future = values.filter(
    (value) => Number.isFinite(value) && value > now
  );

  return future.length > 0 ? Math.min(...future) : 0;
}

function loadWeather() {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      let primaryError = null;
      let primaryRateLimited = false;

      if (Date.now() < primaryRateLimitedUntil) {
        primaryRateLimited = true;
        primaryError = new Error('Open-Meteo rate limit cooldown active');
        primaryError.status = 429;
      } else {
        try {
          const payload = await fetchWeather();

          if (!isUsableWeatherPayload(payload)) {
            const error = new Error(
              'Open-Meteo returned no usable weather data'
            );
            error.code = 'EMPTY_WEATHER';
            throw error;
          }

          const record = await storeWeather(payload);
          primaryRateLimitedUntil = 0;
          return { record, rateLimited: false, retryAt: 0 };
        } catch (error) {
          primaryError = error;
          primaryRateLimited = isRateLimitedError(error);

          if (primaryRateLimited) {
            primaryRateLimitedUntil = activateRateLimit(
              error,
              primaryRateLimitedUntil,
              'Open-Meteo'
            );
          }

          console.error(
            '[weather] Live fetch failed:',
            safeFailureReason(error)
          );

          if (isPermanentProviderFailure(error)) {
            return { error, rateLimited: false, retryAt: 0 };
          }
        }
      }

      const apiKey = weatherApiKey();
      if (!apiKey) {
        return {
          error: primaryError,
          rateLimited: primaryRateLimited,
          retryAt: primaryRateLimited ? primaryRateLimitedUntil : 0,
        };
      }

      if (Date.now() < secondaryRateLimitedUntil) {
        return {
          error: primaryError,
          rateLimited: true,
          retryAt: earliestFutureRateLimit(
            primaryRateLimitedUntil,
            secondaryRateLimitedUntil
          ),
        };
      }

      try {
        const payload = await fetchWeatherApiWeather(apiKey);

        if (!isUsableWeatherPayload(payload)) {
          const error = new Error(
            'WeatherAPI.com returned no usable weather data'
          );
          error.code = 'EMPTY_WEATHER';
          throw error;
        }

        const record = await storeWeather(payload);
        secondaryRateLimitedUntil = 0;
        return { record, rateLimited: false, retryAt: 0 };
      } catch (error) {
        const secondaryRateLimited = isRateLimitedError(error);

        if (secondaryRateLimited) {
          secondaryRateLimitedUntil = activateRateLimit(
            error,
            secondaryRateLimitedUntil,
            'WeatherAPI.com'
          );
        }

        console.error(
          '[weather] Secondary fetch failed:',
          safeFailureReason(error)
        );

        return {
          error,
          rateLimited: primaryRateLimited || secondaryRateLimited,
          retryAt: earliestFutureRateLimit(
            primaryRateLimited ? primaryRateLimitedUntil : 0,
            secondaryRateLimited ? secondaryRateLimitedUntil : 0
          ),
        };
      }
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

// PUBLIC: Current weather for Kombolcha. Open-Meteo is primary; WeatherAPI.com
// is used only after a temporary primary failure, and only when configured.
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

    if (!cache || now - cache.fetchedAt >= WEATHER_CACHE_TTL_MS) {
      await hydrateWeatherCache(now);

      if (cache && now - cache.fetchedAt < WEATHER_CACHE_TTL_MS) {
        return res.json({
          data: { ...cache.payload, stale: false },
          cached: true,
        });
      }
    }

    const result = await loadWeather();

    if (result.record) {
      return res.json({
        data: { ...result.record, stale: false },
        cached: false,
      });
    }

    return sendWeatherFallback(res, Date.now(), {
      rateLimited: result.rateLimited,
      retryAt: result.retryAt,
    });
  })
);

export default router;
