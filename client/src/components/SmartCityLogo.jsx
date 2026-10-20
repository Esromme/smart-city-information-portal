import { useId } from 'react';

const FULL_NAME = 'Smart City Information Portal';

/**
 * Smart City Information Portal brand mark.
 *
 * A location-pin silhouette holding a minimal city skyline with a smart-city
 * node above it. Pure inline SVG on a transparent background, so it renders
 * sharply at any size and works on both light and dark surfaces.
 *
 * - `size`         pixel size of the mark (square).
 * - `showWordmark` render the "Smart City Information Portal" wordmark lockup.
 * - `title`        accessible name (defaults to the full application name).
 */
export default function SmartCityLogo({
  size = 40,
  showWordmark = false,
  className = '',
  title = FULL_NAME,
}) {
  const uid = useId().replace(/:/g, '');
  const pinId = `scip-pin-${uid}`;
  const headId = `scip-head-${uid}`;

  const classes = ['scip-logo'];
  if (showWordmark) classes.push('scip-logo--wordmark');
  if (className) classes.push(className);

  return (
    <span
      className={classes.join(' ')}
      role="img"
      aria-label={title}
    >
      <svg
        className="scip-mark"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient
            id={pinId}
            x1="10"
            y1="6"
            x2="54"
            y2="58"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#0f766e" />
            <stop offset="0.55" stopColor="#14b8a6" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
          <clipPath id={headId}>
            <circle cx="32" cy="25" r="17.5" />
          </clipPath>
        </defs>

        {/* Location pin */}
        <path
          d="M32 60C32 60 14.5 42 14.5 25a17.5 17.5 0 1 1 35 0C50 42 32 60 32 60Z"
          fill={`url(#${pinId})`}
        />

        {/* City skyline, clipped to the pin head */}
        <g clipPath={`url(#${headId})`} fill="#08243d">
          <rect x="20.6" y="26.5" width="6.2" height="17" rx="1.5" />
          <rect x="28.9" y="19.5" width="6.2" height="24" rx="1.5" />
          <rect x="37.2" y="25.5" width="6.2" height="18" rx="1.5" />
          <rect x="30.3" y="23.4" width="3.4" height="3.4" rx="1" fill="#22d3ee" />
          <rect
            x="30.3"
            y="29.6"
            width="3.4"
            height="3.4"
            rx="1"
            fill="#22d3ee"
            opacity="0.7"
          />
        </g>

        {/* Smart-city node */}
        <circle cx="32" cy="13.6" r="2.7" fill="#08243d" />
        <circle cx="32" cy="13.6" r="1.1" fill="#a5f3fc" />
      </svg>

      {showWordmark && (
        <span className="scip-wordmark" aria-hidden="true">
          <strong>Smart City</strong>
          <span>Information Portal</span>
        </span>
      )}
    </span>
  );
}
