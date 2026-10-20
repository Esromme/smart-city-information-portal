import { api } from '../api.js';
import { useApi } from '../hooks.js';
import { timeAgo } from '../utils.js';
import Icon from '../components/Icon.jsx';

const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

const UV_BANDS = [
  { max: 2, label: 'Low' },
  { max: 5, label: 'Moderate' },
  { max: 7, label: 'High' },
  { max: 10, label: 'Very high' },
  { max: Infinity, label: 'Extreme' },
];

function windDirection(degrees) {
  const value = Number(degrees);
  if (!Number.isFinite(value)) return null;
  const index = Math.round((((value % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[index];
}

function round(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number.toFixed(digits);
}

function temperature(value) {
  const text = round(value);
  return text === null ? null : `${text}°`;
}

function percent(value) {
  const text = round(value);
  return text === null ? null : `${text}%`;
}

function uvLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return UV_BANDS.find((band) => number <= band.max)?.label ?? null;
}

// Map a WMO weather code onto one of the portal's icon glyphs.
function weatherIconName(code, isDay) {
  const value = Number(code);
  const night = isDay === false;
  if (!Number.isFinite(value)) return 'cloud';
  if (value === 0) return night ? 'moon' : 'sun';
  if (value === 1 || value === 2) return night ? 'cloud-moon' : 'cloud-sun';
  if (value === 3) return 'cloud';
  if (value === 45 || value === 48) return 'fog';
  if (value >= 51 && value <= 57) return 'drizzle';
  if ((value >= 61 && value <= 67) || (value >= 80 && value <= 82)) return 'rain';
  if ((value >= 71 && value <= 77) || (value >= 85 && value <= 86)) return 'snow';
  if (value >= 95) return 'thunder';
  return 'cloud';
}

// Group weather codes into a small set of hero treatments.
function conditionClass(code, isDay) {
  const value = Number(code);
  const night = isDay === false;
  if (!Number.isFinite(value)) return 'wx-cloudy';
  if (value === 0 || value === 1) return night ? 'wx-clear-night' : 'wx-clear-day';
  if (value === 2) return night ? 'wx-cloudy-night' : 'wx-cloudy-day';
  if (value === 3) return 'wx-cloudy';
  if (value === 45 || value === 48) return 'wx-fog';
  if (value >= 51 && value <= 57) return 'wx-rain';
  if ((value >= 61 && value <= 67) || (value >= 80 && value <= 82)) return 'wx-rain';
  if ((value >= 71 && value <= 77) || (value >= 85 && value <= 86)) return 'wx-snow';
  if (value >= 95) return 'wx-thunder';
  return 'wx-cloudy';
}

// Times arrive as wall-clock strings already in the city's timezone
// ("2026-10-19T06:12"), so they are formatted without any timezone math.
function clockLabel(value) {
  if (typeof value !== 'string' || value.length < 16) return null;
  const hours = Number(value.slice(11, 13));
  const minutes = Number(value.slice(14, 16));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function hourLabel(value) {
  if (typeof value !== 'string' || value.length < 13) return '';
  const hours = Number(value.slice(11, 13));
  if (!Number.isFinite(hours)) return '';
  const date = new Date();
  date.setHours(hours, 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric' });
}

function dayLabel(value, index) {
  if (index === 0) return 'Today';
  if (typeof value !== 'string') return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
  });
}

function Insight({ icon, label, value, hint, children }) {
  return (
    <div className="wx-stat">
      <span className="wx-stat-icon" aria-hidden="true">
        <Icon name={icon} size={17} />
      </span>
      <div className="wx-stat-body">
        <span className="wx-stat-label">{label}</span>
        {children ?? <strong className="wx-stat-value">{value}</strong>}
        {hint && <span className="wx-stat-hint">{hint}</span>}
      </div>
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="wx-skeleton" role="status" aria-label="Loading weather">
      <div className="skeleton wx-skel-hero" />
      <div className="wx-skel-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="skeleton wx-skel-stat" key={index} />
        ))}
      </div>
      <div className="wx-skel-row">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="skeleton wx-skel-hour" key={index} />
        ))}
      </div>
    </div>
  );
}

export default function Weather() {
  const { data, loading, error, reload } = useApi(() => api.weather(), []);

  const weather = data?.data ?? null;
  const warning = data?.warning || weather?.warning || null;

  const hourly = weather?.hourly ?? [];
  const daily = weather?.daily ?? [];

  const range = (() => {
    const values = daily
      .flatMap((day) => [Number(day.minC), Number(day.maxC)])
      .filter((value) => Number.isFinite(value));
    if (values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, span: max - min || 1 };
  })();

  const highLow =
    round(weather?.today?.maxC) !== null && round(weather?.today?.minC) !== null
      ? { max: round(weather.today.maxC), min: round(weather.today.minC) }
      : null;

  const wind = round(weather?.windKph, 1);
  const direction = windDirection(weather?.windDirectionDeg);
  const humidity = round(weather?.humidity);
  const uv = round(weather?.uvIndex, 1);
  const visibility = round(weather?.visibilityKm, 1);
  const dewPoint = round(weather?.dewPointC, 1);
  const precipitation = round(weather?.precipitationMm, 1);
  const rainChance = percent(weather?.today?.precipitationProbabilityMax);

  return (
    <div className="page weather-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">City conditions</span>
          <h1>Weather</h1>
          <p>Current conditions and forecast for Kombolcha, sourced from Open-Meteo.</p>
        </div>
        <button type="button" className="btn ghost" onClick={reload} disabled={loading}>
          <Icon name="refresh" size={17} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {loading && !weather ? (
        <WeatherSkeleton />
      ) : error && !weather ? (
        <div className="empty-state" role="alert">
          <span className="empty-icon" aria-hidden="true">
            <Icon name="cloud" size={26} />
          </span>
          <h3>Weather is unavailable right now</h3>
          <p>{error}</p>
          <button type="button" className="btn" onClick={reload}>
            <Icon name="refresh" size={16} />
            Try again
          </button>
        </div>
      ) : weather ? (
        <>
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}

          {warning && (
            <p className="wx-note" role="status">
              <Icon name="warning" size={15} />
              <span>{warning}</span>
            </p>
          )}

          <section
            className={`card weather-hero ${conditionClass(
              weather.weatherCode,
              weather.isDay
            )}`}
            aria-label={`Current conditions in ${weather.location}`}
          >
            <div className="weather-hero-top">
              <span className="weather-place">
                <Icon name="pin" size={15} />
                <span>{weather.location}</span>
              </span>
              <span className="weather-updated">
                <Icon name="clock" size={14} />
                <span>Updated {timeAgo(weather.fetchedAt) || 'just now'}</span>
              </span>
            </div>

            <div className="weather-hero-main">
              <div className="weather-readout">
                <p className="weather-temp">
                  {round(weather.temperatureC, 1) ?? '–'}
                  <span className="weather-unit">°C</span>
                </p>
                <p className="weather-desc">{weather.description}</p>
                <div className="weather-meta">
                  {round(weather.apparentC, 1) !== null && (
                    <span className="weather-chip">
                      Feels like {round(weather.apparentC, 1)}°C
                    </span>
                  )}
                  {highLow && (
                    <span className="weather-chip">
                      High {highLow.max}° · Low {highLow.min}°
                    </span>
                  )}
                  {weather.stale && (
                    <span className="weather-chip is-stale">
                      <Icon name="warning" size={12} />
                      Cached reading
                    </span>
                  )}
                </div>
              </div>

              <div className="weather-illustration" aria-hidden="true">
                <Icon
                  name={weatherIconName(weather.weatherCode, weather.isDay)}
                  size={116}
                />
              </div>
            </div>

            <div className="weather-hero-foot">
              <span>
                Observed {timeAgo(weather.observedAt) || 'recently'}
                {weather.timezone ? ` · ${weather.timezone}` : ''}
              </span>
              <a href={weather.source?.url} target="_blank" rel="noreferrer">
                {weather.source?.attribution || 'Weather data'}
              </a>
            </div>
          </section>

          <section className="wx-section" aria-labelledby="wx-insights-heading">
            <div className="wx-section-head">
              <h2 id="wx-insights-heading">Right now</h2>
              <span className="wx-section-hint">At the last observation</span>
            </div>
            <div className="wx-insights">
              {humidity !== null && (
                <Insight
                  icon="droplet"
                  label="Humidity"
                  value={`${humidity}%`}
                  hint={dewPoint !== null ? `Dew point ${dewPoint}°C` : null}
                />
              )}
              {wind !== null && (
                <Insight
                  icon="wind"
                  label="Wind"
                  value={`${wind} km/h`}
                  hint={direction ? `Blowing from the ${direction}` : null}
                />
              )}
              {uv !== null && (
                <Insight
                  icon="sun"
                  label="UV index"
                  value={uv}
                  hint={uvLabel(uv)}
                />
              )}
              {visibility !== null && (
                <Insight icon="eye" label="Visibility" value={`${visibility} km`} />
              )}
              {(clockLabel(weather.sunrise) || clockLabel(weather.sunset)) && (
                <Insight icon="sunrise" label="Sunrise · Sunset">
                  <strong className="wx-stat-value">
                    {clockLabel(weather.sunrise) ?? '–'}
                    <span className="wx-stat-sep">·</span>
                    {clockLabel(weather.sunset) ?? '–'}
                  </strong>
                </Insight>
              )}
              {precipitation !== null && (
                <Insight
                  icon="rain"
                  label="Precipitation"
                  value={`${precipitation} mm`}
                  hint={rainChance ? `${rainChance} chance today` : null}
                />
              )}
            </div>
          </section>

          {hourly.length > 0 && (
            <section className="wx-section" aria-labelledby="wx-hourly-heading">
              <div className="wx-section-head">
                <h2 id="wx-hourly-heading">Hourly forecast</h2>
                <span className="wx-section-hint">
                  Next {hourly.length} hours
                </span>
              </div>
              <div
                className="wx-scroller"
                role="region"
                aria-label="Hourly forecast, scroll horizontally"
                tabIndex={0}
              >
                <ul className="wx-hourly">
                  {hourly.map((hour, index) => (
                    <li
                      className={`wx-hour ${index === 0 ? 'is-now' : ''}`}
                      key={hour.time}
                    >
                      <span className="wx-hour-time">
                        {index === 0 ? 'Now' : hourLabel(hour.time)}
                      </span>
                      <span className="wx-hour-icon" aria-hidden="true">
                        <Icon
                          name={weatherIconName(hour.weatherCode, hour.isDay)}
                          size={24}
                        />
                      </span>
                      <strong className="wx-hour-temp">
                        {temperature(hour.temperatureC) ?? '–'}
                      </strong>
                      <span
                        className={`wx-hour-pop ${
                          hour.precipitationProbability ? '' : 'is-empty'
                        }`}
                      >
                        {percent(hour.precipitationProbability) ?? ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {daily.length > 0 && (
            <section className="wx-section" aria-labelledby="wx-daily-heading">
              <div className="wx-section-head">
                <h2 id="wx-daily-heading">Daily forecast</h2>
                <span className="wx-section-hint">{daily.length}-day outlook</span>
              </div>
              <ul className="wx-daily">
                {daily.map((day, index) => {
                  const min = Number(day.minC);
                  const max = Number(day.maxC);
                  const hasRange =
                    Number.isFinite(min) && Number.isFinite(max) && Boolean(range);
                  const left = hasRange ? ((min - range.min) / range.span) * 100 : 0;
                  const width = hasRange
                    ? Math.max(((max - min) / range.span) * 100, 6)
                    : 0;

                  return (
                    <li className="wx-day" key={day.date}>
                      <span className="wx-day-name">
                        {dayLabel(day.date, index)}
                      </span>
                      <span className="wx-day-icon" aria-hidden="true">
                        <Icon
                          name={weatherIconName(day.weatherCode, true)}
                          size={22}
                        />
                      </span>
                      <span className="wx-day-desc">{day.description}</span>
                      <span className="wx-day-pop">
                        {percent(day.precipitationProbabilityMax) ?? ''}
                      </span>
                      <span className="wx-day-range">
                        <span className="wx-day-min">
                          {temperature(day.minC) ?? '–'}
                        </span>
                        {hasRange && (
                          <span className="wx-day-track" aria-hidden="true">
                            <span
                              className="wx-day-fill"
                              style={{ left: `${left}%`, width: `${width}%` }}
                            />
                          </span>
                        )}
                        <span className="wx-day-max">
                          {temperature(day.maxC) ?? '–'}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <Icon name="cloud" size={26} />
          </span>
          <h3>No weather reading available</h3>
          <p>
            Live weather data is not available right now. Core portal data is
            unaffected.
          </p>
        </div>
      )}
    </div>
  );
}
