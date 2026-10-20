const ICONS = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M2 13h20" />
    </>
  ),
  map: (
    <>
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2z" />
      <path d="M9 3v16" />
      <path d="M15 5v16" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  sort: (
    <>
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-4h4v4" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bus: (
    <>
      <rect x="4" y="4" width="16" height="13" rx="2" />
      <path d="M4 11h16" />
      <path d="M8 4v7M16 4v7" />
      <path d="M8 20v-3M16 20v-3" />
      <circle cx="8" cy="20" r="1.4" />
      <circle cx="16" cy="20" r="1.4" />
    </>
  ),
  cloud: (
    <>
      <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 11 4 4 0 0 0 6.5 19h11z" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4l10-10a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M14.5 6.5 17.5 9.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4 2.5 20h19L12 4z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: (
    <>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </>
  ),
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.6 7.2 8.4 5.6 8.4-5.6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
      <path d="M8 10.5v-3a4 4 0 0 1 8 0v3" />
      <path d="M12 14v2.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M10.6 6.1A9.3 9.3 0 0 1 12 6c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-2.3 2.9" />
      <path d="M6.6 7.1A17 17 0 0 0 2.5 12.2S6 18.4 12 18.4a9.4 9.4 0 0 0 3.4-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.4V12l3 1.9" />
    </>
  ),
  droplet: (
    <>
      <path d="M12 3.4c2.6 2.9 6 6.6 6 10.1a6 6 0 0 1-12 0c0-3.5 3.4-7.2 6-10.1z" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8.2h10.2a2.6 2.6 0 1 0-2.6-2.6" />
      <path d="M3 12.4h14a2.6 2.6 0 1 1-2.6 2.6" />
      <path d="M3 16.6h7.4" />
    </>
  ),
  'cloud-sun': (
    <>
      <circle cx="7" cy="6.4" r="2.5" />
      <path d="M7 1.8v1.4M2.8 6.4h1.4M3.9 3.3l1 1M10.1 3.3l-1 1" />
      <path d="M20.4 18.4a4.3 4.3 0 0 0 .5-8.56A5.7 5.7 0 0 0 9.7 10.2 3.8 3.8 0 0 0 10 18.4h10.4z" />
    </>
  ),
  'cloud-moon': (
    <>
      <path d="M14.2 3.2a4.7 4.7 0 0 0 4.4 6.3 4.7 4.7 0 1 1-4.4-6.3z" />
      <path d="M20.4 19.4a4.3 4.3 0 0 0 .5-8.56A5.7 5.7 0 0 0 9.7 11.2 3.8 3.8 0 0 0 10 19.4h10.4z" />
    </>
  ),
  fog: (
    <>
      <path d="M7 14.4a4.2 4.2 0 0 1 .42-8.37A5.6 5.6 0 0 1 18.1 8.2 3.4 3.4 0 0 1 17.5 14.4H7z" />
      <path d="M4.5 17.8h13M7 21h9.5" />
    </>
  ),
  drizzle: (
    <>
      <path d="M17.5 15a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 7 4 4 0 0 0 6.5 15h11z" />
      <path d="M10 17.6v1.9M15 17.4v2.1" />
    </>
  ),
  rain: (
    <>
      <path d="M17.5 15a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 7 4 4 0 0 0 6.5 15h11z" />
      <path d="M8.6 17.2 7.4 20.4M12.6 17.2l-1.2 3.2M16.6 17.2l-1.2 3.2" />
    </>
  ),
  snow: (
    <>
      <path d="M17.5 14.6a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 6.6 4 4 0 0 0 6.5 14.6h11z" />
      <path d="M9 17.6h.01M12.4 17.6h.01M15.8 17.6h.01M10.7 20.6h.01M14.1 20.6h.01" />
    </>
  ),
  thunder: (
    <>
      <path d="M17.5 14.8a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 6.8 4 4 0 0 0 6.5 14.8h11z" />
      <path d="M13.2 16.4h-3l1.6 2.4h-2.2l3.6 3.2-1-2.9h1.8z" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 16.2a8 8 0 1 1 16 0" />
      <path d="m12 16 3.6-4.7" />
      <circle cx="12" cy="16" r="1.1" />
    </>
  ),
  sunrise: (
    <>
      <path d="M12 2.6V6M5.8 8.4 4.4 7M18.2 8.4 19.6 7" />
      <path d="M7.6 13.6a4.4 4.4 0 0 1 8.8 0" />
      <path d="M3 17.4h18M6.2 21h11.6" />
    </>
  ),
  sunset: (
    <>
      <path d="M12 6V2.6M5.8 8.4 4.4 7M18.2 8.4 19.6 7" />
      <path d="M7.6 13.6a4.4 4.4 0 0 1 8.8 0" />
      <path d="M3 17.4h18M6.2 21h11.6" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.2 8.8-1.8 4.6-4.6 1.8 1.8-4.6 4.6-1.8z" />
    </>
  ),
  recycle: (
    <>
      <path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-.9 1.8 1.8 0 0 1 0-1.8L7.2 9.5" />
      <path d="M11 19h8.2a1.8 1.8 0 0 0 1.6-.9 1.8 1.8 0 0 0 0-1.8l-1.2-2.1" />
      <path d="m14 16-3 3 3 3" />
      <path d="M8.3 13.6 7.2 9.5 3.1 10.6" />
      <path d="m9.3 5.8 1.1-1.9A1.8 1.8 0 0 1 12 3a1.8 1.8 0 0 1 1.5.9l3.9 6.8" />
      <path d="m13.4 9.6 4.1 1.1 1.1-4.1" />
    </>
  ),
  heart: (
    <path d="M19.5 12.6 12 20.1l-7.5-7.5a4.6 4.6 0 0 1 6.5-6.5l1 1 1-1a4.6 4.6 0 0 1 6.5 6.5z" />
  ),
  cap: (
    <>
      <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5z" />
      <path d="M7 12v3.5c0 1.1 2.2 2 5 2s5-.9 5-2V12" />
    </>
  ),
};

export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name] || ICONS.spark}
    </svg>
  );
}
