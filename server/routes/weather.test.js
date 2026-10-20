import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { buildApp } = await import('../test/buildApp.js');
const { default: weather, resetWeatherCache } = await import('./weather.js');

const app = buildApp(weather);

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

function mockProvider(payload) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  resetWeatherCache();
});

afterEach(() => {
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

  it('serves a cached reading without calling the provider again', async () => {
    const fetchMock = mockProvider(openMeteoResponse());

    await request(app).get('/');
    const second = await request(app).get('/');

    expect(second.body.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

    // Expire the cache window, then make the provider fail.
    const realNow = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(realNow + 11 * 60 * 1000);
    fetchMock.mockRejectedValue(new Error('offline'));

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.data.stale).toBe(true);
    expect(response.body.warning).toMatch(/last successful reading/);
  });

  it('reports a non-OK provider response as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const response = await request(app).get('/');

    expect(response.status).toBe(502);
  });
});
