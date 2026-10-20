import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { mockWeather } = vi.hoisted(() => ({ mockWeather: vi.fn() }));

vi.mock('../api.js', () => ({
  api: { weather: mockWeather },
}));

const { default: Weather } = await import('./Weather.jsx');

function conditions(overrides = {}) {
  return {
    location: 'Kombolcha, Ethiopia',
    latitude: 11.0849,
    longitude: 39.7392,
    timezone: 'Africa/Addis_Ababa',
    observedAt: '2026-10-19T17:15+03:00',
    fetchedAt: new Date().toISOString(),
    temperatureC: 22.9,
    apparentC: 20.2,
    humidity: 30,
    precipitationMm: 0,
    windKph: 9,
    windDirectionDeg: 91,
    weatherCode: 0,
    description: 'Clear sky',
    today: { maxC: 25.5, minC: 12.1, precipitationProbabilityMax: 10 },
    isDay: true,
    dewPointC: 4.4,
    uvIndex: 3.8,
    visibilityKm: 20,
    sunrise: '2026-10-19T06:12',
    sunset: '2026-10-19T18:04',
    hourly: [
      {
        time: '2026-10-19T17:00',
        temperatureC: 22.9,
        weatherCode: 0,
        description: 'Clear sky',
        precipitationProbability: 0,
        windKph: 9,
        isDay: true,
      },
      {
        time: '2026-10-19T18:00',
        temperatureC: 21.4,
        weatherCode: 2,
        description: 'Partly cloudy',
        precipitationProbability: 5,
        windKph: 7,
        isDay: true,
      },
    ],
    daily: [
      {
        date: '2026-10-19',
        maxC: 25.5,
        minC: 12.1,
        weatherCode: 0,
        description: 'Clear sky',
        precipitationProbabilityMax: 10,
        precipitationMm: 0,
        uvIndexMax: 7.1,
        windKphMax: 14,
        sunrise: '2026-10-19T06:12',
        sunset: '2026-10-19T18:04',
      },
      {
        date: '2026-10-20',
        maxC: 26.1,
        minC: 12.6,
        weatherCode: 3,
        description: 'Overcast',
        precipitationProbabilityMax: 20,
        precipitationMm: 0.4,
        uvIndexMax: 6.4,
        windKphMax: 16,
        sunrise: '2026-10-20T06:12',
        sunset: '2026-10-20T18:03',
      },
    ],
    source: {
      name: 'Open-Meteo',
      url: 'https://open-meteo.com/',
      license: 'CC BY 4.0',
      attribution: 'Weather data by Open-Meteo.com',
    },
    ...overrides,
  };
}

function envelope(overrides = {}) {
  return { cached: false, data: conditions(overrides) };
}

beforeEach(() => {
  mockWeather.mockReset();
});

describe('Weather', () => {
  it('shows a loading skeleton before the reading arrives', async () => {
    let resolve;
    mockWeather.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );

    render(<Weather />);

    expect(
      screen.getByRole('status', { name: /loading weather/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /refreshing/i })
    ).toBeDisabled();

    resolve(envelope());

    expect(await screen.findByText('22.9')).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: /loading weather/i })
    ).not.toBeInTheDocument();
  });

  it('renders the current conditions, insights and both forecasts', async () => {
    mockWeather.mockResolvedValue(envelope());

    const { container } = render(<Weather />);

    // Current conditions.
    expect(await screen.findByText('22.9')).toBeInTheDocument();
    expect(screen.getByText('Feels like 20.2°C')).toBeInTheDocument();
    expect(screen.getByText('High 26° · Low 12°')).toBeInTheDocument();
    expect(screen.getByText('Kombolcha, Ethiopia')).toBeInTheDocument();

    // Insights derived from the same response.
    expect(screen.getByText('Humidity')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('Dew point 4.4°C')).toBeInTheDocument();
    expect(screen.getByText('Wind')).toBeInTheDocument();
    expect(screen.getByText('9.0 km/h')).toBeInTheDocument();
    expect(screen.getByText('Blowing from the E')).toBeInTheDocument();
    expect(screen.getByText('UV index')).toBeInTheDocument();
    expect(screen.getByText('3.8')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Visibility')).toBeInTheDocument();
    expect(screen.getByText('20.0 km')).toBeInTheDocument();
    expect(screen.getByText('Sunrise · Sunset')).toBeInTheDocument();
    expect(screen.getByText('Precipitation')).toBeInTheDocument();
    expect(screen.getByText('10% chance today')).toBeInTheDocument();

    // Forecasts.
    expect(container.querySelectorAll('.wx-hour')).toHaveLength(2);
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(container.querySelectorAll('.wx-day')).toHaveLength(2);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Overcast')).toBeInTheDocument();

    // Provider credit is preserved.
    expect(
      screen.getByRole('link', { name: /weather data by open-meteo/i })
    ).toHaveAttribute('href', 'https://open-meteo.com/');
  });

  it('offers a retry when the request fails, then recovers', async () => {
    mockWeather.mockRejectedValueOnce(new Error('Weather service is offline.'));

    render(<Weather />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Weather service is offline.');

    mockWeather.mockResolvedValue(envelope());
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('22.9')).toBeInTheDocument();
    expect(mockWeather).toHaveBeenCalledTimes(2);
  });

  it('falls back to a friendly empty state when no reading is returned', async () => {
    mockWeather.mockResolvedValue({ cached: false, data: null });

    render(<Weather />);

    expect(
      await screen.findByText('No weather reading available')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^refresh$/i })
    ).toBeInTheDocument();
  });

  it('flags a cached reading served after a failed refresh', async () => {
    mockWeather.mockResolvedValue({
      cached: true,
      warning: 'Showing the last successful reading.',
      data: conditions({ stale: true }),
    });

    render(<Weather />);

    expect(
      await screen.findByText('Showing the last successful reading.')
    ).toBeInTheDocument();
    expect(screen.getByText('Cached reading')).toBeInTheDocument();
  });

  it('keeps the last reading on screen when a refresh fails', async () => {
    mockWeather.mockResolvedValueOnce(envelope());
    render(<Weather />);
    expect(await screen.findByText('22.9')).toBeInTheDocument();

    mockWeather.mockRejectedValueOnce(new Error('Network error.'));
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Network error.');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /last successful reading below/i
    );
    await waitFor(() => expect(screen.getByText('22.9')).toBeInTheDocument());
  });

  it('requests the weather once when React StrictMode re-runs effects', async () => {
    mockWeather.mockResolvedValue(envelope());

    render(
      <StrictMode>
        <Weather />
      </StrictMode>
    );

    expect(await screen.findByText('22.9')).toBeInTheDocument();
    expect(mockWeather).toHaveBeenCalledTimes(1);
  });

  it('shows a friendly rate-limit message and waits for an explicit retry', async () => {
    mockWeather.mockRejectedValueOnce(
      Object.assign(new Error('Request failed (503)'), { status: 503 })
    );

    render(<Weather />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/provider is limiting requests/i);
    expect(mockWeather).toHaveBeenCalledTimes(1);

    mockWeather.mockResolvedValue(envelope());
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('22.9')).toBeInTheDocument();
    expect(mockWeather).toHaveBeenCalledTimes(2);
  });

  it('keeps the reading when a refresh is rate-limited', async () => {
    mockWeather.mockResolvedValueOnce(envelope());
    render(<Weather />);
    expect(await screen.findByText('22.9')).toBeInTheDocument();

    mockWeather.mockRejectedValueOnce(
      Object.assign(
        new Error(
          'Weather data is temporarily unavailable because the provider is limiting requests.'
        ),
        { status: 503 }
      )
    );
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /provider is limiting requests/i
    );
    expect(screen.getByText('22.9')).toBeInTheDocument();
    expect(mockWeather).toHaveBeenCalledTimes(2);
  });
});
