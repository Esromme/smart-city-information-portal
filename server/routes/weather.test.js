import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({ query: mockQuery, pool: {} }));

const { buildApp } = await import('../test/buildApp.js');
const {
  default: weather,
  resetWeatherCache,
  WEATHER_CACHE_TTL_MS,
  WEATHER_PERSISTENCE_RETRY_MS,
  WEATHER_PERSISTENCE_TIMEOUT_MS,
  WEATHER_STALE_TTL_MS,
  WEATHERAPI_STALE_TTL_MS,
  WEATHERAPI_SOURCE,
} = await import('./weather.js');

const app = buildApp(weather);
const originalWeatherApiKey = process.env.WEATHERAPI_API_KEY;

function openMeteoResponse(overrides = {}) {
  return {
    latitude: 11.07,
    longitude: 39.77,
    timezone: 'Africa/Addis_Ababa',
    utc_offset_seconds: 10800,
    current: {
      time: '2026-10-19T17:15',
      temperature_2m: 22.9,
      apparent_temperature: 20.2,
      relative_humidity_2m: 30,
      precipitation: 0,
      weather_code: 0,
      wind_speed_10m: 9,
      wind_direction_10m: 91,
      is_day: 1,
    },
    hourly: {
      time: [
        '2026-10-19T16:00',
        '2026-10-19T17:00',
        '2026-10-19T18:00',
        '2026-10-19T19:00',
      ],
      temperature_2m: [23.1, 22.9, 21.4, 20],
      weather_code: [0, 0, 1, 2],
      precipitation_probability: [0, 0, 5, 10],
      is_day: [1, 1, 1, 0],
      wind_speed_10m: [8, 9, 7, 6],
      uv_index: [4.2, 3.8, 1.1, 0],
      visibility: [24000, 20000, 18000, 15000],
      dew_point_2m: [4.1, 4.4, 5, 5.6],
    },
    daily: {
      time: ['2026-10-19', '2026-10-20'],
      temperature_2m_max: [25.5, 26.1],
      temperature_2m_min: [12.1, 12.6],
      precipitation_probability_max: [10, 20],
      weather_code: [0, 2],
      sunrise: ['2026-10-19T06:12', '2026-10-20T06:12'],
      sunset: ['2026-10-19T18:04', '2026-10-20T18:03'],
      uv_index_max: [7.1, 6.4],
      precipitation_sum: [0, 0.4],
      wind_speed_10m_max: [14, 16],
    },
    ...overrides,
  };
}

// A provider payload without the additive blocks, to prove the mapping still
// works when Open-Meteo omits them.
function minimalResponse() {
  return {
    latitude: 11.07,
    longitude: 39.77,
    timezone: 'Africa/Addis_Ababa',
    utc_offset_seconds: 10800,
    current: {
      time: '2026-10-19T17:15',
      temperature_2m: 22.9,
      apparent_temperature: 20.2,
      relative_humidity_2m: 30,
      precipitation: 0,
      weather_code: 0,
      wind_speed_10m: 9,
      wind_direction_10m: 91,
    },
    daily: {
      temperature_2m_max: [25.5],
      temperature_2m_min: [12.1],
      precipitation_probability_max: [10],
    },
  };
}

const WEATHERAPI_LAST_UPDATED = '2026-10-19 17:15';
const WEATHERAPI_LAST_UPDATED_EPOCH =
  Date.parse('2026-10-19T17:15:00+03:00') / 1000;

function weatherApiResponse(overrides = {}) {
  return {
    location: {
      name: 'Kombolcha',
      region: 'Amhara',
      country: 'Ethiopia',
      lat: 11.0849,
      lon: 39.7392,
      tz_id: 'Africa/Addis_Ababa',
      localtime_epoch: WEATHERAPI_LAST_UPDATED_EPOCH,
      localtime: WEATHERAPI_LAST_UPDATED,
    },
    current: {
      last_updated_epoch: WEATHERAPI_LAST_UPDATED_EPOCH,
      last_updated: WEATHERAPI_LAST_UPDATED,
      temp_c: 21.5,
      feelslike_c: 21,
      humidity: 55,
      precip_mm: 0.2,
      wind_kph: 12.3,
      wind_degree: 180,
      is_day: 1,
      uv: 4.1,
      vis_km: 16,
      condition: { text: 'Partly cloudy', code: 1003 },
    },
    forecast: {
      forecastday: [
        {
          date: '2026-10-19',
          day: {
            maxtemp_c: 25.1,
            mintemp_c: 12.2,
            maxwind_kph: 18,
            totalprecip_mm: 0.6,
            daily_chance_of_rain: 25,
            daily_chance_of_snow: 0,
            uv: 7.2,
            condition: { text: 'Partly cloudy', code: 1003 },
          },
          astro: { sunrise: '06:12 AM', sunset: '06:04 PM' },
          hour: [
            {
              time: '2026-10-19 17:00',
              temp_c: 21.5,
              condition: { text: 'Partly cloudy', code: 1003 },
              chance_of_rain: 20,
              chance_of_snow: 0,
              wind_kph: 12.3,
              is_day: 1,
              dewpoint_c: 11.5,
              uv: 4.1,
              vis_km: 16,
            },
            {
              time: '2026-10-19 18:00',
              temp_c: 20.2,
              condition: { text: 'Clear', code: 1000 },
              chance_of_rain: 0,
              chance_of_snow: 0,
              wind_kph: 10,
              is_day: 1,
              dewpoint_c: 10.8,
              uv: 1.2,
              vis_km: 18,
            },
          ],
        },
        {
          date: '2026-10-20',
          day: {
            maxtemp_c: 26,
            mintemp_c: 12.8,
            maxwind_kph: 20,
            totalprecip_mm: 0,
            daily_chance_of_rain: 10,
            daily_chance_of_snow: 0,
            uv: 7.5,
            condition: { text: 'Sunny', code: 1000 },
          },
          astro: { sunrise: '06:12 AM', sunset: '06:03 PM' },
          hour: [
            {
              time: '2026-10-20 00:00',
              temp_c: 15,
              condition: { text: 'Clear', code: 1000 },
              chance_of_rain: 0,
              chance_of_snow: 0,
              wind_kph: 5,
              is_day: 0,
              dewpoint_c: 9,
              uv: 0,
              vis_km: 20,
            },
          ],
        },
        {
          date: '2026-10-21',
          day: {
            maxtemp_c: 27,
            mintemp_c: 13,
            maxwind_kph: 22,
            totalprecip_mm: 0,
            daily_chance_of_rain: 5,
            daily_chance_of_snow: 0,
            uv: 7.8,
            condition: { text: 'Sunny', code: 1000 },
          },
          astro: { sunrise: '06:11 AM', sunset: '06:02 PM' },
          hour: [],
        },
      ],
    },
    ...overrides,
  };
}

function persistedWeather(overrides = {}) {
  return {
    location: 'Kombolcha, Ethiopia',
    latitude: 11.07,
    longitude: 39.77,
    timezone: 'Africa/Addis_Ababa',
    observedAt: '2026-10-19T17:15+03:00',
    temperatureC: 19.4,
    apparentC: 19,
    humidity: 45,
    precipitationMm: 0,
    windKph: 7,
    windDirectionDeg: 90,
    weatherCode: 2,
    description: 'Partly cloudy',
    today: {
      maxC: 24,
      minC: 12,
      precipitationProbabilityMax: 20,
    },
    isDay: true,
    dewPointC: 7,
    uvIndex: 3,
    visibilityKm: 18,
    sunrise: '2026-10-19T06:12',
    sunset: '2026-10-19T18:04',
    hourly: [],
    daily: [],
    source: {
      name: 'Open-Meteo',
      url: 'https://open-meteo.com/',
      license: 'CC BY 4.0',
      attribution: 'Weather data by Open-Meteo.com',
    },
    ...overrides,
  };
}

function persistedRow(payload, fetchedAt) {
  return {
    rows: [
      {
        payload,
        fetched_at: new Date(fetchedAt).toISOString(),
      },
    ],
  };
}

// The route sends pg a config object so it can attach query_timeout. Keep the
// existing assertions readable while supporting that shape.
function queryConfig(call) {
  if (!Array.isArray(call)) return call;
  const [first, second] = call;
  return typeof first === 'string'
    ? { text: first, values: second }
    : first;
}

function queryText(call) {
  return queryConfig(call).text;
}

function queryValues(call) {
  return queryConfig(call).values ?? [];
}

function persistenceWrites() {
  return mockQuery.mock.calls.filter((call) =>
    /insert into public\.weather_cache/i.test(queryText(call))
  );
}

function expectNoPersistenceWrite() {
  expect(persistenceWrites()).toHaveLength(0);
}

// Small in-memory stand-in for the conditional PostgreSQL upsert. The route
// still owns the real SQL predicate; this lets the tests prove that an older
// incoming timestamp does not replace a newer stored row.
function installPersistedStore(payload, fetchedAt) {
  const state = { payload, fetchedAt };

  mockQuery.mockImplementation(async (call) => {
    const sql = queryText(call);
    if (/from public\.weather_cache/i.test(sql)) {
      return persistedRow(state.payload, state.fetchedAt);
    }
    if (/insert into public\.weather_cache/i.test(sql)) {
      const values = queryValues(call);
      const incomingAt = new Date(values[2]).getTime();
      if (incomingAt > state.fetchedAt) {
        state.payload = JSON.parse(values[1]);
        state.fetchedAt = incomingAt;
      }
      return { rows: [] };
    }
    return { rows: [] };
  });

  return state;
}

function mockProvider(payload) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function mockRateLimit(retryAfter = '120') {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status: 429,
    headers: {
      get: (name) =>
        name.toLowerCase() === 'retry-after' ? retryAfter : null,
    },
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function okResponse(payload) {
  return { ok: true, json: async () => payload };
}

function failedResponse(status, retryAfter = null) {
  return {
    ok: false,
    status,
    headers: {
      get: (name) =>
        name.toLowerCase() === 'retry-after' ? retryAfter : null,
    },
  };
}

function mockWeatherProviders({ primary, secondary }) {
  const respond = (handler) =>
    typeof handler === 'function' ? handler() : handler;

  const fetchMock = vi.fn(async (input) => {
    const url = String(input);
    if (url.startsWith('https://api.open-meteo.com/')) {
      return respond(primary);
    }
    if (url.startsWith('https://api.weatherapi.com/')) {
      return respond(secondary);
    }
    throw new Error('Unexpected provider URL');
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function providerCalls(fetchMock) {
  const urls = fetchMock.mock.calls.map(([input]) => String(input));

  return {
    primary: urls.filter((url) => url.includes('api.open-meteo.com')).length,
    secondary: urls.filter((url) => url.includes('api.weatherapi.com')).length,
    urls,
  };
}

function deferredProvider(payload = openMeteoResponse()) {
  let resolveFetch;
  const pending = new Promise((resolve) => {
    resolveFetch = resolve;
  });
  const fetchMock = vi.fn().mockReturnValue(pending);
  vi.stubGlobal('fetch', fetchMock);

  return {
    fetchMock,
    resolve() {
      resolveFetch({ ok: true, json: async () => payload });
    },
  };
}

beforeEach(() => {
  delete process.env.WEATHERAPI_API_KEY;
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
  resetWeatherCache();
});

afterEach(() => {
  if (originalWeatherApiKey === undefined) {
    delete process.env.WEATHERAPI_API_KEY;
  } else {
    process.env.WEATHERAPI_API_KEY = originalWeatherApiKey;
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GET /weather', () => {
  it('maps an Open-Meteo response into the public shape', async () => {
    const fetchMock = mockProvider(openMeteoResponse());

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.cached).toBe(false);
    expect(response.body.data.description).toBe('Clear sky');
    expect(response.body.data.temperatureC).toBe(22.9);
    expect(response.body.data.observedAt).toBe('2026-10-19T17:15+03:00');
    expect(response.body.data.source.name).toBe('Open-Meteo');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps the additive hourly and daily forecast blocks', async () => {
    mockProvider(openMeteoResponse());

    const response = await request(app).get('/');
    const { data } = response.body;

    // The current reading falls inside the 17:00 hour block.
    expect(data.hourly).toHaveLength(3);
    expect(data.hourly[0]).toMatchObject({
      time: '2026-10-19T17:00',
      temperatureC: 22.9,
      weatherCode: 0,
      description: 'Clear sky',
      precipitationProbability: 0,
      isDay: true,
    });
    expect(data.hourly[2]).toMatchObject({
      time: '2026-10-19T19:00',
      isDay: false,
    });

    expect(data.daily).toHaveLength(2);
    expect(data.daily[0]).toMatchObject({
      date: '2026-10-19',
      maxC: 25.5,
      minC: 12.1,
      weatherCode: 0,
      precipitationProbabilityMax: 10,
      uvIndexMax: 7.1,
      sunrise: '2026-10-19T06:12',
      sunset: '2026-10-19T18:04',
    });
    expect(data.daily[1].description).toBe('Partly cloudy');
  });

  it('exposes the current UV, visibility, dew point and daylight window', async () => {
    mockProvider(openMeteoResponse());

    const response = await request(app).get('/');
    const { data } = response.body;

    expect(data.isDay).toBe(true);
    expect(data.uvIndex).toBe(3.8);
    expect(data.visibilityKm).toBe(20);
    expect(data.dewPointC).toBe(4.4);
    expect(data.sunrise).toBe('2026-10-19T06:12');
    expect(data.sunset).toBe('2026-10-19T18:04');
  });

  it('still maps cleanly when the provider omits hourly and extra daily fields', async () => {
    mockProvider(minimalResponse());

    const response = await request(app).get('/');
    const { data } = response.body;

    expect(response.status).toBe(200);
    expect(data.temperatureC).toBe(22.9);
    expect(data.today).toEqual({
      maxC: 25.5,
      minC: 12.1,
      precipitationProbabilityMax: 10,
    });
    expect(data.hourly).toEqual([]);
    expect(data.daily).toEqual([]);
    expect(data.uvIndex).toBeNull();
    expect(data.visibilityKm).toBeNull();
    expect(data.dewPointC).toBeNull();
    expect(data.isDay).toBeNull();
  });

  it('accepts a live zero reading', async () => {
    const payload = minimalResponse();
    payload.current.temperature_2m = 0;
    payload.current.apparent_temperature = 0;
    payload.current.relative_humidity_2m = 0;
    payload.current.weather_code = 0;
    payload.daily.temperature_2m_max = [0];
    payload.daily.temperature_2m_min = [0];
    payload.daily.precipitation_probability_max = [0];

    mockProvider(payload);
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.data.temperatureC).toBe(0);
    expect(response.body.data.weatherCode).toBe(0);
    expect(response.body.data.today.maxC).toBe(0);
  });

  it('accepts a zero reading inside a supplied hourly block', async () => {
    const payload = openMeteoResponse();
    payload.current = {
      time: '2026-10-19T17:15',
      temperature_2m: null,
      apparent_temperature: null,
      relative_humidity_2m: null,
      precipitation: null,
      weather_code: null,
      wind_speed_10m: null,
      wind_direction_10m: null,
      is_day: null,
    };
    payload.hourly = {
      time: ['2026-10-19T17:00'],
      temperature_2m: [0],
      weather_code: [0],
      precipitation_probability: [0],
      is_day: [0],
      wind_speed_10m: [0],
      uv_index: [0],
      visibility: [0],
      dew_point_2m: [0],
    };
    payload.daily = undefined;

    mockProvider(payload);
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.data.temperatureC).toBeNull();
    expect(response.body.data.hourly[0].temperatureC).toBe(0);
    expect(response.body.data.hourly[0].weatherCode).toBe(0);
    expect(response.body.data.hourly[0].precipitationProbability).toBe(0);
  });

  it('serves a cached reading without calling the provider again', async () => {
    const fetchMock = mockProvider(openMeteoResponse());

    await request(app).get('/');
    const second = await request(app).get('/');

    expect(second.body.cached).toBe(true);
    expect(second.body.data.stale).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not query PostgreSQL when the in-memory cache is fresh', async () => {
    const fetchMock = mockProvider(openMeteoResponse());

    await request(app).get('/');
    mockQuery.mockClear();

    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.data.stale).toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('passes the pg per-query timeout to persistence calls', async () => {
    mockProvider(openMeteoResponse());

    await request(app).get('/');

    expect(mockQuery).toHaveBeenCalled();
    for (const [config] of mockQuery.mock.calls) {
      expect(config.query_timeout).toBe(WEATHER_PERSISTENCE_TIMEOUT_MS);
    }
  });

  it('persists a successful provider response', async () => {
    const fetchMock = mockProvider(openMeteoResponse());

    await request(app).get('/');

    const insertCall = mockQuery.mock.calls.find((call) =>
      /insert into public\.weather_cache/i.test(queryText(call))
    );

    expect(insertCall).toBeDefined();
    const params = queryValues(insertCall);
    const stored = JSON.parse(params[1]);

    expect(params[0]).toMatch(/^open-meteo:v1:/);
    expect(stored.temperatureC).toBe(22.9);
    expect(stored.fetchedAt).toBe(params[2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves persistent cache after the in-memory cache is reset', async () => {
    const fetchMock = mockProvider(openMeteoResponse());

    await request(app).get('/');

    const insertCall = mockQuery.mock.calls.find((call) =>
      /insert into public\.weather_cache/i.test(queryText(call))
    );
    const stored = JSON.parse(queryValues(insertCall)[1]);
    const fetchedAt = queryValues(insertCall)[2];

    resetWeatherCache();
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        return persistedRow(stored, fetchedAt);
      }
      return { rows: [] };
    });

    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.data.stale).toBe(false);
    expect(second.body.data.temperatureC).toBe(22.9);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('repairs a rejected persisted row with a successful live response', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const fetchMock = mockProvider(openMeteoResponse());

    let persisted = persistedRow(
      persistedWeather({ hourly: 'not-an-array' }),
      now - 60 * 1000
    );
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) return persisted;
      return { rows: [] };
    });

    const first = await request(app).get('/');

    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);
    expect(first.body.data.temperatureC).toBe(22.9);

    const insertCall = mockQuery.mock.calls.find((call) =>
      /insert into public\.weather_cache/i.test(queryText(call))
    );

    expect(insertCall).toBeDefined();
    const stored = JSON.parse(queryValues(insertCall)[1]);
    const fetchedAt = queryValues(insertCall)[2];
    expect(stored.temperatureC).toBe(22.9);

    // Simulate another process reading the row written by the live repair.
    resetWeatherCache();
    persisted = persistedRow(stored, fetchedAt);

    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.data.temperatureC).toBe(22.9);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses a newer persisted row when the in-memory entry is stale', async () => {
    const t0 = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(t0);
    const fetchMock = mockProvider(openMeteoResponse());

    await request(app).get('/');

    const insertCall = mockQuery.mock.calls.find((call) =>
      /insert into public\.weather_cache/i.test(queryText(call))
    );
    const stored = JSON.parse(queryValues(insertCall)[1]);
    const refreshed = {
      ...stored,
      temperatureC: 30.1,
      fetchedAt: new Date(t0 + 15 * 60 * 1000).toISOString(),
    };

    nowSpy.mockReturnValue(t0 + 16 * 60 * 1000);
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        return persistedRow(refreshed, t0 + 15 * 60 * 1000);
      }
      return { rows: [] };
    });

    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.data.stale).toBe(false);
    expect(second.body.data.temperatureC).toBe(30.1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('allows a newer live reading to replace an older persisted row', async () => {
    const t0 = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(t0);
    const oldAt = t0 - WEATHER_CACHE_TTL_MS - 60 * 1000;
    const persisted = installPersistedStore(persistedWeather(), oldAt);
    const fetchMock = mockProvider(openMeteoResponse());

    const first = await request(app).get('/');

    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);
    expect(first.body.data.temperatureC).toBe(22.9);
    expect(persisted.fetchedAt).toBe(t0);
    expect(persisted.payload.temperatureC).toBe(22.9);

    expect(persistenceWrites()).toHaveLength(1);
    expect(queryText(persistenceWrites()[0])).toMatch(
      /where excluded\.fetched_at > weather_cache\.fetched_at/i
    );

    resetWeatherCache();
    nowSpy.mockReturnValue(t0 + 60 * 1000);
    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.data.temperatureC).toBe(22.9);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not let an older live reading replace a newer persisted row', async () => {
    const t0 = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(t0);
    const newerAt = t0 + 5 * 60 * 1000;
    const persisted = installPersistedStore(persistedWeather(), newerAt);
    const fetchMock = mockProvider(openMeteoResponse());

    const first = await request(app).get('/');

    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);
    expect(first.body.data.temperatureC).toBe(22.9);
    expect(persisted.fetchedAt).toBe(newerAt);
    expect(persisted.payload.temperatureC).toBe(19.4);

    expect(persistenceWrites()).toHaveLength(1);
    expect(queryText(persistenceWrites()[0])).toMatch(
      /where excluded\.fetched_at > weather_cache\.fetched_at/i
    );

    resetWeatherCache();
    nowSpy.mockReturnValue(t0 + 6 * 60 * 1000);
    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.data.temperatureC).toBe(19.4);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves a persisted reading at exactly six hours after a provider failure', async () => {
    const realNow = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(realNow);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const staleAt = realNow - WEATHER_STALE_TTL_MS;
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        return persistedRow(persistedWeather(), staleAt);
      }
      return { rows: [] };
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.cached).toBe(true);
    expect(response.body.data.stale).toBe(true);
    expect(response.body.data.temperatureC).toBe(19.4);
    expect(response.body.warning).toMatch(/last successful reading/);
  });

  it('serves persisted stale data and honors Retry-After on 429', async () => {
    const realNow = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(realNow);
    const fetchMock = mockRateLimit('90');

    const staleAt = realNow - WEATHER_CACHE_TTL_MS - 60 * 1000;
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        return persistedRow(persistedWeather(), staleAt);
      }
      return { rows: [] };
    });

    const first = await request(app).get('/');

    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(true);
    expect(first.body.data.stale).toBe(true);
    expect(first.headers['retry-after']).toBe('90');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.data.stale).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['future-dated', 60 * 1000],
    ['older than six hours', -WEATHER_STALE_TTL_MS - 1],
  ])('rejects a %s persisted row', async (_label, offset) => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        return persistedRow(persistedWeather(), now + offset);
      }
      return { rows: [] };
    });

    const fetchMock = vi.fn().mockRejectedValue(new Error('provider offline'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
    expect(response.body.data).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'a numeric-string current reading',
      persistedWeather({
        temperatureC: '19.4',
        apparentC: null,
        humidity: null,
        weatherCode: null,
      }),
    ],
    [
      'a forecast with no finite readings',
      persistedWeather({
        temperatureC: null,
        apparentC: null,
        humidity: null,
        weatherCode: null,
        hourly: [
          {
            time: '2026-10-19T17:00',
            temperatureC: null,
            weatherCode: null,
            precipitationProbability: null,
            windKph: null,
          },
        ],
      }),
    ],
    [
      'a malformed hourly block',
      persistedWeather({ hourly: 'not-an-array' }),
    ],
    [
      'a supplied all-null hourly block with a valid current reading',
      persistedWeather({
        hourly: [
          {
            time: '2026-10-19T17:00',
            temperatureC: null,
            weatherCode: null,
            precipitationProbability: null,
            windKph: null,
          },
        ],
      }),
    ],
    [
      'a supplied all-null daily block with a valid current reading',
      persistedWeather({
        daily: [
          {
            date: '2026-10-19',
            maxC: null,
            minC: null,
            weatherCode: null,
            precipitationProbabilityMax: null,
            precipitationMm: null,
            uvIndexMax: null,
            windKphMax: null,
          },
        ],
      }),
    ],
  ])('rejects a persisted payload with %s', async (_label, payload) => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        return persistedRow(payload, now - 60 * 1000);
      }
      return { rows: [] };
    });

    const fetchMock = vi.fn().mockRejectedValue(new Error('provider offline'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
    expect(response.body.data).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('accepts a persisted zero reading', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        return persistedRow(
          persistedWeather({
            temperatureC: 0,
            apparentC: 0,
            humidity: 0,
            weatherCode: 0,
          }),
          now - 60 * 1000
        );
      }
      return { rows: [] };
    });

    const fetchMock = mockProvider(openMeteoResponse());
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.cached).toBe(true);
    expect(response.body.data.stale).toBe(false);
    expect(response.body.data.temperatureC).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns live weather when the persistent cache read fails', async () => {
    mockProvider(openMeteoResponse());
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        throw new Error('read failed');
      }
      return { rows: [] };
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.cached).toBe(false);
    expect(response.body.data.temperatureC).toBe(22.9);
  });

  it('returns live weather when the persistent cache write fails', async () => {
    mockProvider(openMeteoResponse());
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        return { rows: [] };
      }
      throw new Error('write failed');
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.cached).toBe(false);
    expect(response.body.data.temperatureC).toBe(22.9);
  });

  it('suppresses repeated database reads after a failure and keeps live weather available', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    let readCalls = 0;
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        readCalls += 1;
        throw new Error('read failed');
      }
      return { rows: [] };
    });

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('provider offline'))
      .mockResolvedValue({
        ok: true,
        json: async () => openMeteoResponse(),
      });
    vi.stubGlobal('fetch', fetchMock);

    const first = await request(app).get('/');
    expect(first.status).toBe(502);

    const second = await request(app).get('/');
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(false);
    expect(readCalls).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resumes a suppressed database read at the 60-second boundary', async () => {
    const t0 = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(t0);

    let readCalls = 0;
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        readCalls += 1;
        throw new Error('read failed');
      }
      return { rows: [] };
    });

    const fetchMock = vi.fn().mockRejectedValue(new Error('provider offline'));
    vi.stubGlobal('fetch', fetchMock);

    await request(app).get('/');

    nowSpy.mockReturnValue(t0 + WEATHER_PERSISTENCE_RETRY_MS - 1);
    const second = await request(app).get('/');

    expect(second.status).toBe(502);
    expect(readCalls).toBe(1);

    nowSpy.mockReturnValue(t0 + WEATHER_PERSISTENCE_RETRY_MS);
    const third = await request(app).get('/');

    expect(third.status).toBe(502);
    expect(readCalls).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('keeps serving stale fallback while database reads are suppressed', async () => {
    const t0 = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(t0);

    let readCalls = 0;
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        readCalls += 1;
        if (readCalls === 1) return { rows: [] };
        throw new Error('read failed');
      }
      return { rows: [] };
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => openMeteoResponse(),
      })
      .mockRejectedValue(new Error('provider offline'));
    vi.stubGlobal('fetch', fetchMock);

    const first = await request(app).get('/');
    expect(first.status).toBe(200);

    nowSpy.mockReturnValue(t0 + WEATHER_CACHE_TTL_MS + 60 * 1000);

    const second = await request(app).get('/');
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.data.stale).toBe(true);

    const third = await request(app).get('/');
    expect(third.status).toBe(200);
    expect(third.body.data.stale).toBe(true);
    expect(readCalls).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not turn an empty provider response into a successful forecast', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
    expect(response.body.data).toBeUndefined();
    expectNoPersistenceWrite();

    const second = await request(app).get('/');
    expect(second.status).toBe(502);
    expectNoPersistenceWrite();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a provider response with timestamps but no finite readings', async () => {
    const fetchMock = mockProvider({
      latitude: 11.07,
      longitude: 39.77,
      timezone: 'Africa/Addis_Ababa',
      utc_offset_seconds: 10800,
      current: { time: '2026-10-19T17:15' },
      hourly: {
        time: ['2026-10-19T17:00'],
        temperature_2m: ['n/a'],
        weather_code: [null],
        precipitation_probability: [null],
        is_day: [null],
        wind_speed_10m: [null],
        uv_index: [null],
        visibility: [null],
        dew_point_2m: [null],
      },
      daily: {
        time: ['2026-10-19'],
        temperature_2m_max: ['n/a'],
        temperature_2m_min: [null],
        precipitation_probability_max: [null],
        weather_code: [null],
        sunrise: [null],
        sunset: [null],
        uv_index_max: [null],
        precipitation_sum: [null],
        wind_speed_10m_max: [null],
      },
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
    expect(response.body.data).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectNoPersistenceWrite();
  });

  it('rejects a supplied all-null hourly block even when current is valid', async () => {
    const fetchMock = mockProvider({
      ...openMeteoResponse(),
      hourly: {
        time: ['2026-10-19T17:00'],
        temperature_2m: [null],
        weather_code: [null],
        precipitation_probability: [null],
        is_day: [null],
        wind_speed_10m: [null],
        uv_index: [null],
        visibility: [null],
        dew_point_2m: [null],
      },
      daily: undefined,
    });

    const first = await request(app).get('/');

    expect(first.status).toBe(502);
    expect(first.body.data).toBeUndefined();
    expectNoPersistenceWrite();

    const second = await request(app).get('/');

    expect(second.status).toBe(502);
    expect(second.body.data).toBeUndefined();
    expectNoPersistenceWrite();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a supplied all-null daily block even when current is valid', async () => {
    const fetchMock = mockProvider({
      ...openMeteoResponse(),
      hourly: undefined,
      daily: {
        time: ['2026-10-19'],
        temperature_2m_max: [null],
        temperature_2m_min: [null],
        precipitation_probability_max: [null],
        weather_code: [null],
        sunrise: [null],
        sunset: [null],
        uv_index_max: [null],
        precipitation_sum: [null],
        wind_speed_10m_max: [null],
      },
    });

    const first = await request(app).get('/');

    expect(first.status).toBe(502);
    expect(first.body.data).toBeUndefined();
    expectNoPersistenceWrite();

    const second = await request(app).get('/');

    expect(second.status).toBe(502);
    expect(second.body.data).toBeUndefined();
    expectNoPersistenceWrite();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refetches after the 15-minute cache window', async () => {
    const realNow = 1_700_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(realNow);
    const fetchMock = mockProvider(openMeteoResponse());

    await request(app).get('/');

    now.mockReturnValue(realNow + WEATHER_CACHE_TTL_MS);
    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('deduplicates simultaneous requests into one provider call', async () => {
    const provider = deferredProvider();

    const pending = Promise.all([
      request(app).get('/'),
      request(app).get('/'),
    ]);

    await vi.waitFor(() =>
      expect(provider.fetchMock).toHaveBeenCalledTimes(1)
    );
    provider.resolve();

    const [first, second] = await pending;

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(provider.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when the provider fails and no reading is cached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
    expect(response.body.error).toMatch(/temporarily unavailable/);
  });

  it('serves the last successful reading, marked stale, after a later failure', async () => {
    const fetchMock = mockProvider(openMeteoResponse());

    await request(app).get('/');

    // Expire the fresh cache window, then make the provider fail.
    const realNow = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(
      realNow + WEATHER_CACHE_TTL_MS + 60 * 1000
    );
    fetchMock.mockRejectedValue(new Error('offline'));

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.cached).toBe(true);
    expect(response.body.data.stale).toBe(true);
    expect(response.body.warning).toMatch(/last successful reading/);
  });

  it('serves stale data at exactly six hours and stops after that', async () => {
    const t0 = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(t0);
    const fetchMock = mockProvider(openMeteoResponse());

    await request(app).get('/');

    nowSpy.mockReturnValue(t0 + WEATHER_STALE_TTL_MS);
    fetchMock.mockRejectedValue(new Error('offline'));

    const atLimit = await request(app).get('/');

    expect(atLimit.status).toBe(200);
    expect(atLimit.body.cached).toBe(true);
    expect(atLimit.body.data.stale).toBe(true);

    nowSpy.mockReturnValue(t0 + WEATHER_STALE_TTL_MS + 1);
    const pastLimit = await request(app).get('/');

    expect(pastLimit.status).toBe(502);
    expect(pastLimit.body.data).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns 503 and honors Retry-After when rate-limited without a cache', async () => {
    const realNow = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(realNow);
    const fetchMock = mockRateLimit('120');

    const first = await request(app).get('/');

    expect(first.status).toBe(503);
    expect(first.body.error).toMatch(/limiting requests/);
    expect(first.headers['retry-after']).toBe('120');

    const second = await request(app).get('/');

    expect(second.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honors an HTTP-date Retry-After', async () => {
    const now = Date.parse('2026-10-21T07:27:00Z');
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const fetchMock = mockRateLimit(new Date(now + 90 * 1000).toUTCString());

    const first = await request(app).get('/');

    expect(first.status).toBe(503);
    expect(first.headers['retry-after']).toBe('90');

    const second = await request(app).get('/');

    expect(second.status).toBe(503);
    expect(second.headers['retry-after']).toBe('90');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves stale data and suppresses upstream calls while rate-limited', async () => {
    const realNow = 1_700_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(realNow);
    const fetchMock = mockProvider(openMeteoResponse());

    await request(app).get('/');

    now.mockReturnValue(realNow + WEATHER_CACHE_TTL_MS + 60 * 1000);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (name) =>
          name.toLowerCase() === 'retry-after' ? '120' : null,
      },
    });

    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.data.stale).toBe(true);
    expect(second.headers['retry-after']).toBe('120');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const third = await request(app).get('/');

    expect(third.status).toBe(200);
    expect(third.body.data.stale).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries after Retry-After and recovers when the provider works again', async () => {
    const realNow = 1_700_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(realNow);
    const fetchMock = mockRateLimit('60');

    const first = await request(app).get('/');
    expect(first.status).toBe(503);

    now.mockReturnValue(realNow + 60 * 1000);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => openMeteoResponse(),
    });

    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(false);
    expect(second.body.data.stale).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports a non-OK provider response as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
  });
});

describe('WeatherAPI secondary provider', () => {
  it('uses Open-Meteo and does not call WeatherAPI when the primary succeeds', async () => {
    process.env.WEATHERAPI_API_KEY = 'dummy-weatherapi-key';
    const fetchMock = mockWeatherProviders({
      primary: okResponse(openMeteoResponse()),
      secondary: okResponse(weatherApiResponse()),
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.data.source.name).toBe('Open-Meteo');
    expect(providerCalls(fetchMock)).toMatchObject({
      primary: 1,
      secondary: 0,
    });
  });

  it('normalizes a WeatherAPI response after a temporary primary failure', async () => {
    process.env.WEATHERAPI_API_KEY = 'dummy-weatherapi-key';
    const payload = weatherApiResponse();
    delete payload.current.uv;
    delete payload.current.vis_km;

    const fetchMock = mockWeatherProviders({
      primary: () => failedResponse(503),
      secondary: () => okResponse(payload),
    });

    const response = await request(app).get('/');
    const { data } = response.body;

    expect(response.status).toBe(200);
    expect(response.body.cached).toBe(false);
    expect(data.source).toEqual(WEATHERAPI_SOURCE);
    expect(data.observedAt).toBe('2026-10-19T17:15+03:00');
    expect(data.temperatureC).toBe(21.5);
    expect(data.weatherCode).toBe(2);
    expect(data.description).toBe('Partly cloudy');
    expect(data.today).toEqual({
      maxC: 25.1,
      minC: 12.2,
      precipitationProbabilityMax: 25,
    });
    expect(data.isDay).toBe(true);
    expect(data.dewPointC).toBe(11.5);
    expect(data.uvIndex).toBe(4.1);
    expect(data.visibilityKm).toBe(16);
    expect(data.sunrise).toBe('2026-10-19T06:12');
    expect(data.sunset).toBe('2026-10-19T18:04');

    expect(data.hourly).toHaveLength(3);
    expect(data.hourly[0]).toMatchObject({
      time: '2026-10-19T17:00',
      temperatureC: 21.5,
      weatherCode: 2,
      description: 'Partly cloudy',
      precipitationProbability: 20,
      windKph: 12.3,
      isDay: true,
    });
    expect(data.hourly[1]).toMatchObject({
      time: '2026-10-19T18:00',
      weatherCode: 0,
      description: 'Clear',
    });
    expect(data.hourly[2]).toMatchObject({
      time: '2026-10-20T00:00',
      isDay: false,
    });

    expect(data.daily).toHaveLength(3);
    expect(data.daily[0]).toMatchObject({
      date: '2026-10-19',
      maxC: 25.1,
      minC: 12.2,
      weatherCode: 2,
      description: 'Partly cloudy',
      precipitationProbabilityMax: 25,
      precipitationMm: 0.6,
      uvIndexMax: 7.2,
      windKphMax: 18,
      sunrise: '2026-10-19T06:12',
      sunset: '2026-10-19T18:04',
    });
    expect(data.daily[2].date).toBe('2026-10-21');

    const calls = providerCalls(fetchMock);
    expect(calls).toMatchObject({ primary: 1, secondary: 1 });
    const secondaryUrl = calls.urls.find((url) =>
      url.includes('api.weatherapi.com')
    );
    expect(secondaryUrl).toContain('days=3');
    expect(secondaryUrl).toContain('key=dummy-weatherapi-key');
  });

  it('uses WeatherAPI after an Open-Meteo 429 and skips the primary during its cooldown', async () => {
    const t0 = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(t0);
    process.env.WEATHERAPI_API_KEY = 'dummy-weatherapi-key';

    const fetchMock = mockWeatherProviders({
      primary: () => failedResponse(429, '3600'),
      secondary: () => okResponse(weatherApiResponse()),
    });

    const first = await request(app).get('/');

    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);
    expect(first.body.data.source.name).toBe('WeatherAPI.com');
    expect(providerCalls(fetchMock)).toMatchObject({
      primary: 1,
      secondary: 1,
    });

    nowSpy.mockReturnValue(t0 + WEATHER_CACHE_TTL_MS + 1000);

    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(false);
    expect(second.body.data.source.name).toBe('WeatherAPI.com');
    expect(providerCalls(fetchMock)).toMatchObject({
      primary: 1,
      secondary: 2,
    });
  });

  it('does not try WeatherAPI after a permanent Open-Meteo failure', async () => {
    process.env.WEATHERAPI_API_KEY = 'dummy-weatherapi-key';
    const fetchMock = mockWeatherProviders({
      primary: () => failedResponse(401),
      secondary: () => okResponse(weatherApiResponse()),
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
    expect(providerCalls(fetchMock)).toMatchObject({
      primary: 1,
      secondary: 0,
    });
    expectNoPersistenceWrite();
  });

  it('does not try WeatherAPI when the key is missing', async () => {
    delete process.env.WEATHERAPI_API_KEY;
    const fetchMock = mockWeatherProviders({
      primary: () => failedResponse(500),
      secondary: () => okResponse(weatherApiResponse()),
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
    expect(providerCalls(fetchMock)).toMatchObject({
      primary: 1,
      secondary: 0,
    });
    expectNoPersistenceWrite();
  });

  it('returns 502 when both providers fail without a cache', async () => {
    process.env.WEATHERAPI_API_KEY = 'dummy-weatherapi-key';
    const fetchMock = mockWeatherProviders({
      primary: () => failedResponse(500),
      secondary: () => failedResponse(503),
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
    expect(response.body.error).toMatch(/temporarily unavailable/);
    expect(providerCalls(fetchMock)).toMatchObject({
      primary: 1,
      secondary: 1,
    });
    expectNoPersistenceWrite();
  });

  it('honors WeatherAPI Retry-After when the fallback is rate-limited', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    process.env.WEATHERAPI_API_KEY = 'dummy-weatherapi-key';

    const fetchMock = mockWeatherProviders({
      primary: () => failedResponse(500),
      secondary: () => failedResponse(429, '60'),
    });

    const first = await request(app).get('/');

    expect(first.status).toBe(503);
    expect(first.headers['retry-after']).toBe('60');
    expect(providerCalls(fetchMock)).toMatchObject({
      primary: 1,
      secondary: 1,
    });

    const second = await request(app).get('/');

    expect(second.status).toBe(503);
    expect(second.headers['retry-after']).toBe('60');
    // The primary is still retried, but WeatherAPI is suppressed until its
    // Retry-After window expires.
    expect(providerCalls(fetchMock).secondary).toBe(1);
  });

  it.each([
    ['an empty payload', () => okResponse({})],
    [
      'invalid JSON',
      () => ({
        ok: true,
        json: async () => {
          throw new Error('invalid JSON');
        },
      }),
    ],
    [
      'a payload with no finite readings',
      () =>
        okResponse({
          current: { temp_c: 'n/a', humidity: null },
          forecast: { forecastday: [] },
        }),
    ],
  ])(
    'rejects %s from WeatherAPI without persisting it',
    async (_label, secondary) => {
      process.env.WEATHERAPI_API_KEY = 'dummy-weatherapi-key';
      const fetchMock = mockWeatherProviders({
        primary: () => failedResponse(500),
        secondary,
      });

      const response = await request(app).get('/');

      expect(response.status).toBe(502);
      expect(response.body.data).toBeUndefined();
      expect(providerCalls(fetchMock)).toMatchObject({
        primary: 1,
        secondary: 1,
      });
      expectNoPersistenceWrite();
    }
  );

  it('persists a WeatherAPI fallback and serves it from the persisted row', async () => {
    process.env.WEATHERAPI_API_KEY = 'dummy-weatherapi-key';
    const fetchMock = mockWeatherProviders({
      primary: () => failedResponse(500),
      secondary: () => okResponse(weatherApiResponse()),
    });

    await request(app).get('/');

    const insertCall = persistenceWrites()[0];
    expect(insertCall).toBeDefined();

    const stored = JSON.parse(queryValues(insertCall)[1]);
    const fetchedAt = queryValues(insertCall)[2];

    expect(stored.source.name).toBe('WeatherAPI.com');
    expect(stored.temperatureC).toBe(21.5);

    resetWeatherCache();
    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        return persistedRow(stored, fetchedAt);
      }
      return { rows: [] };
    });

    const second = await request(app).get('/');

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.data.source.name).toBe('WeatherAPI.com');
    expect(second.body.data.temperatureC).toBe(21.5);
    expect(providerCalls(fetchMock)).toMatchObject({
      primary: 1,
      secondary: 1,
    });
  });

  it('serves WeatherAPI fallback for at most 60 minutes', async () => {
    const t0 = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(t0);
    process.env.WEATHERAPI_API_KEY = 'dummy-weatherapi-key';

    const fetchMock = mockWeatherProviders({
      primary: () => failedResponse(500),
      secondary: () => okResponse(weatherApiResponse()),
    });

    const first = await request(app).get('/');
    expect(first.body.data.source.name).toBe('WeatherAPI.com');

    fetchMock.mockImplementation(async (input) =>
      String(input).includes('api.open-meteo.com')
        ? failedResponse(500)
        : failedResponse(503)
    );

    nowSpy.mockReturnValue(t0 + WEATHERAPI_STALE_TTL_MS);

    const atLimit = await request(app).get('/');
    expect(atLimit.status).toBe(200);
    expect(atLimit.body.cached).toBe(true);
    expect(atLimit.body.data.stale).toBe(true);

    nowSpy.mockReturnValue(t0 + WEATHERAPI_STALE_TTL_MS + 1);

    const pastLimit = await request(app).get('/');
    expect(pastLimit.status).toBe(502);
    expect(pastLimit.body.data).toBeUndefined();
  });

  it('rejects a persisted WeatherAPI row older than 60 minutes', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    mockQuery.mockImplementation(async (call) => {
      const sql = queryText(call);
      if (/from public\.weather_cache/i.test(sql)) {
        return persistedRow(
          persistedWeather({ source: WEATHERAPI_SOURCE }),
          now - WEATHERAPI_STALE_TTL_MS - 1
        );
      }
      return { rows: [] };
    });

    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
    expect(response.body.data).toBeUndefined();
  });

  it('never logs the WeatherAPI key, request URL, or raw provider error', async () => {
    const secret = 'dummy-secret-weatherapi-key';
    process.env.WEATHERAPI_API_KEY = secret;

    const rawMessage =
      `request to https://api.weatherapi.com/v1/forecast.json?key=${secret} failed`;

    const fetchMock = mockWeatherProviders({
      primary: () => failedResponse(500),
      secondary: () => {
        throw new Error(rawMessage);
      },
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
    expect(providerCalls(fetchMock)).toMatchObject({
      primary: 1,
      secondary: 1,
    });

    const logs = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
      .flat()
      .map(String)
      .join('\n');

    expect(logs).not.toContain(secret);
    expect(logs).not.toContain('api.weatherapi.com');
    expect(response.text).not.toContain(secret);
    expect(response.text).not.toContain('api.weatherapi.com');
  });
});
