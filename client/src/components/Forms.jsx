import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

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

const required = (value, message) => {
  if (!value.trim()) throw new Error(message);
};

export function AnnouncementForm({ onSaved, onCancel }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('community');
  const [content, setContent] = useState('');
  const { submitting, error, handleSubmit } = useSubmit(async () => {
    required(title, 'Please add a title');
    required(content, 'Please write the announcement message');
    await api.announcements.create({ title, category, content });
    onSaved();
  });

  return (
    <form className="form" onSubmit={handleSubmit}>
      <Field label="Title">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Water maintenance on Saturday"
          maxLength={200}
          autoFocus
        />
      </Field>

      <Field label="Category">
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="community">Community</option>
          <option value="health">Health</option>
          <option value="transport">Transport</option>
          <option value="utilities">Utilities</option>
          <option value="education">Education</option>
          <option value="safety">Safety</option>
        </select>
      </Field>

      <Field label="Message">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={6}
          maxLength={10000}
          placeholder="Share the details residents need to know..."
        />
      </Field>

      {error && <div className="alert">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Publishing...' : 'Publish announcement'}
        </button>
      </div>
    </form>
  );
}

export function ServiceForm({ onSaved, onCancel }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('government');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const { submitting, error, handleSubmit } = useSubmit(async () => {
    required(name, 'Please add the service name');
    await api.services.create({ name, category, description, location });
    onSaved();
  });

  return (
    <form className="form" onSubmit={handleSubmit}>
      <Field label="Service name">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Kombolcha Public Library"
          maxLength={200}
          autoFocus
        />
      </Field>

      <div className="form-row">
        <Field label="Category">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="government">Government</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="utilities">Utilities</option>
            <option value="emergency">Emergency</option>
            <option value="transport">Transport</option>
            <option value="community">Community</option>
          </select>
        </Field>

        <Field label="Location">
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Main Road, Kombolcha"
            maxLength={500}
          />
        </Field>
      </div>

      <Field label="Description" hint="Optional. Opening hours, contact details or who the service is for.">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Describe what this service offers..."
        />
      </Field>

      {error && <div className="alert">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Add service'}
        </button>
      </div>
    </form>
  );
}

export function LocationForm({ onSaved, onCancel }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('government');
  const [latitude, setLatitude] = useState('11.084900');
  const [longitude, setLongitude] = useState('39.739200');
  const [geoMessage, setGeoMessage] = useState(null);
  const [locating, setLocating] = useState(false);

  const { submitting, error, handleSubmit } = useSubmit(async () => {
    required(name, 'Please add the place name');
    if (latitude === '' || longitude === '') throw new Error('Latitude and longitude are required');
    await api.locations.create({ name, category, latitude, longitude });
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
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Kombolcha Community Market"
          maxLength={200}
          autoFocus
        />
      </Field>

      <Field label="Category">
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="government">Government</option>
          <option value="health">Health</option>
          <option value="education">Education</option>
          <option value="utilities">Utilities</option>
          <option value="emergency">Emergency</option>
          <option value="transport">Transport</option>
          <option value="community">Community</option>
        </select>
      </Field>

      <div className="form-row">
        <Field label="Latitude">
          <input
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            inputMode="decimal"
            placeholder="11.0849"
          />
        </Field>
        <Field label="Longitude">
          <input
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            inputMode="decimal"
            placeholder="39.7392"
          />
        </Field>
      </div>

      <button type="button" className="btn ghost small" onClick={useDeviceLocation} disabled={locating}>
        <IconPin />
        {locating ? 'Reading location...' : 'Use my current location'}
      </button>
      {geoMessage && <p className="field-hint">{geoMessage}</p>}

      {error && <div className="alert">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Add location'}
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
