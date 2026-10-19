export const CATEGORY_META = {
  health: { label: 'Health', color: '#0d9488' },
  education: { label: 'Education', color: '#6366f1' },
  utilities: { label: 'Utilities', color: '#d97706' },
  emergency: { label: 'Emergency', color: '#dc2626' },
  government: { label: 'Government', color: '#2563eb' },
  transport: { label: 'Transport', color: '#7c3aed' },
  community: { label: 'Community', color: '#059669' },
  safety: { label: 'Safety', color: '#db2777' },
};

export function categoryMeta(key) {
  return CATEGORY_META[key] || { label: key || 'Other', color: '#64748b' };
}

export const ANNOUNCEMENT_CATEGORIES = [
  'community',
  'health',
  'transport',
  'utilities',
  'education',
  'safety',
];

export const SERVICE_CATEGORIES = [
  'health',
  'education',
  'utilities',
  'emergency',
  'government',
  'transport',
  'community',
];

export const CITY_CENTER = [11.0849, 39.7392];
