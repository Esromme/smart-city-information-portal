import { useState } from 'react';
import { api } from '../api.js';
import { CITY_CENTER, categoryOptions } from '../categories.js';

function useSubmit(onSubmit) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, error, handleSubmit };
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function CategorySelect({ value, onChange }) {
  return (
    <select name="category" value={value} onChange={(event) => onChange(event.target.value)}>
      {categoryOptions(value).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const required = (value, message) => {
  if (!value.trim()) throw new Error(message);
};

export function AnnouncementForm({ initial, onSaved, onCancel }) {
  const editing = Boolean(initial?.id);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'water');
  const [content, setContent] = useState(initial?.content ?? '');

  const { submitting, error, handleSubmit } = useSubmit(async () => {
    required(title, 'Please add a title');
    required(content, 'Please write the announcement message');

    const payload = { title, category, content };

    if (editing) {
      await api.announcements.update(initial.id, payload);
    } else {
      await api.announcements.create(payload);
    }

    onSaved();
  });

  return (
    <form className="form" onSubmit={handleSubmit}>
      <Field label="Title">
        <input
          type="text"
          name="title"
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Water maintenance on Saturday"
          maxLength={200}
          autoFocus
        />
      </Field>

      <Field label="Category">
        <CategorySelect value={category} onChange={setCategory} />
      </Field>

      <Field label="Message">
        <textarea
          name="content"
          autoComplete="off"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={6}
          maxLength={10000}
          placeholder="Share the details residents need to know…"
        />
      </Field>

      {error && <div className="alert" role="alert">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : editing
              ? 'Save changes'
              : 'Publish announcement'}
        </button>
      </div>
    </form>
  );
}

export function ServiceForm({ initial, onSaved, onCancel }) {
  const editing = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'emergency');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');

  const { submitting, error, handleSubmit } = useSubmit(async () => {
    required(name, 'Please add the service name');

    const payload = { name, category, description, location };

    if (editing) {
      await api.services.update(initial.id, payload);
    } else {
      await api.services.create(payload);
    }

    onSaved();
  });

  return (
    <form className="form" onSubmit={handleSubmit}>
      <Field label="Service name">
        <input
          type="text"
          name="name"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Kombolcha Public Library"
          maxLength={200}
          autoFocus
        />
      </Field>

      <div className="form-row">
        <Field label="Category">
          <CategorySelect value={category} onChange={setCategory} />
        </Field>

        <Field label="Location">
          <input
            type="text"
            name="location"
            autoComplete="off"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Main Road, Kombolcha"
            maxLength={500}
          />
        </Field>
      </div>

      <Field label="Description" hint="Optional. Opening hours, contact details or who the service is for.">
        <textarea
          name="description"
          autoComplete="off"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Describe what this service offers…"
        />
      </Field>

      {error && <div className="alert" role="alert">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : editing
              ? 'Save changes'
              : 'Add service'}
        </button>
      </div>
    </form>
  );
}

function parseCoordinate(value, label, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a number`);
  }

  if (number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}`);
  }

  return number;
}

export function LocationForm({ initial, onSaved, onCancel }) {
  const editing = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'emergency');
  const [latitude, setLatitude] = useState(
    initial?.latitude != null ? String(initial.latitude) : CITY_CENTER[0].toFixed(6)
  );
  const [longitude, setLongitude] = useState(
    initial?.longitude != null ? String(initial.longitude) : CITY_CENTER[1].toFixed(6)
  );
  const [geoMessage, setGeoMessage] = useState(null);
  const [locating, setLocating] = useState(false);

  const { submitting, error, handleSubmit } = useSubmit(async () => {
    required(name, 'Please add the place name');

    const coordinates = {
      latitude: parseCoordinate(latitude, 'Latitude', -90, 90),
      longitude: parseCoordinate(longitude, 'Longitude', -180, 180),
    };

    const payload = { name, category, ...coordinates };

    if (editing) {
      await api.locations.update(initial.id, payload);
    } else {
      await api.locations.create(payload);
    }

    onSaved();
  });

  function useDeviceLocation() {
    if (!navigator.geolocation) {
      setGeoMessage('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGeoMessage('Coordinates captured from this device.');
        setLocating(false);
      },
      () => {
        setGeoMessage('Could not read your location. Enter coordinates manually.');
        setLocating(false);
      },
      { timeout: 10000 }
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <Field label="Place name">
        <input
          type="text"
          name="name"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Kombolcha Community Market"
          maxLength={200}
          autoFocus
        />
      </Field>

      <Field label="Category">
        <CategorySelect value={category} onChange={setCategory} />
      </Field>

      <div className="form-row">
        <Field label="Latitude">
          <input
            type="text"
            name="latitude"
            autoComplete="off"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            inputMode="decimal"
            placeholder="11.0849"
          />
        </Field>
        <Field label="Longitude">
          <input
            type="text"
            name="longitude"
            autoComplete="off"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            inputMode="decimal"
            placeholder="39.7392"
          />
        </Field>
      </div>

      <button type="button" className="btn ghost small" onClick={useDeviceLocation} disabled={locating}>
        <IconPin />
        {locating ? 'Reading location…' : 'Use my current location'}
      </button>
      {geoMessage && <p className="field-hint">{geoMessage}</p>}

      {error && <div className="alert" role="alert">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : editing
              ? 'Save changes'
              : 'Add location'}
        </button>
      </div>
    </form>
  );
}

function IconPin() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
