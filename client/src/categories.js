// Canonical service categories for the Smart City Information Portal.
export const SERVICE_CATEGORIES = [
  'waste',
  'water',
  'transportation',
  'weather',
  'emergency',
];

// Announcements use the same five service areas.
export const ANNOUNCEMENT_CATEGORIES = SERVICE_CATEGORIES;

// Filter chips add a group for records that predate the canonical categories.
export const FILTER_CATEGORIES = [...SERVICE_CATEGORIES, 'other'];

// Existing rows in the database still use these values. They are shown with
// their original label so older records stay readable, and the server accepts
// them when editing an existing record. New records always use a canonical id.
export const LEGACY_CATEGORY_LABELS = {
  community: 'Community',
  education: 'Education',
  government: 'Government',
  health: 'Health',
  safety: 'Safety',
  transport: 'Transportation',
  utilities: 'Utilities',
};

export const CATEGORY_META = {
  waste: { label: 'Waste', color: '#16a34a', icon: 'recycle' },
  water: { label: 'Water', color: '#0284c7', icon: 'droplet' },
  transportation: { label: 'Transportation', color: '#7c3aed', icon: 'bus' },
  weather: { label: 'Weather', color: '#0891b2', icon: 'cloud-sun' },
  emergency: { label: 'Emergency', color: '#dc2626', icon: 'shield' },
  other: { label: 'Other', color: '#64748b', icon: 'grid' },

  // Legacy values keep their own label, colour and icon for display.
  community: { label: 'Community', color: '#059669', icon: 'users' },
  education: { label: 'Education', color: '#6366f1', icon: 'cap' },
  government: { label: 'Government', color: '#2563eb', icon: 'building' },
  health: { label: 'Health', color: '#0d9488', icon: 'heart' },
  safety: { label: 'Safety', color: '#db2777', icon: 'shield' },
  transport: { label: 'Transportation', color: '#7c3aed', icon: 'bus' },
  utilities: { label: 'Utilities', color: '#d97706', icon: 'gauge' },
};

export function categoryMeta(key) {
  return (
    CATEGORY_META[key] || {
      label: key || 'Other',
      color: '#64748b',
      icon: 'briefcase',
    }
  );
}

export function isCanonicalCategory(key) {
  return SERVICE_CATEGORIES.includes(key);
}

// Options for create/edit forms: always the canonical five, plus the current
// value when editing a record that still uses a legacy category.
export function categoryOptions(current) {
  const options = SERVICE_CATEGORIES.map((key) => ({
    value: key,
    label: CATEGORY_META[key].label,
  }));

  if (current && !isCanonicalCategory(current)) {
    options.push({
      value: current,
      label: `${LEGACY_CATEGORY_LABELS[current] || current} (existing)`,
    });
  }

  return options;
}

// Normalise a stored category to the matching filter chip.
export function filterKeyForCategory(key) {
  if (SERVICE_CATEGORIES.includes(key)) return key;
  if (key === 'transport') return 'transportation';
  return 'other';
}

export const CITY_CENTER = [11.0849, 39.7392];
