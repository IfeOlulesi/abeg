// Lucide-style inline SVG icons, sized via className.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const BagIcon = (p) => (
  <svg {...base} strokeWidth={2.2} {...p}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export const BotIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
  </svg>
);

export const PlusIcon = (p) => (
  <svg {...base} strokeWidth={2.4} {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export const MicIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

export const SendIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

export const CheckIcon = (p) => (
  <svg {...base} strokeWidth={3} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const CloseIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const BackstageIcon = (p) => (
  <svg {...base} {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
  </svg>
);

export const TrophyIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m13 2-3 7h4l-3 7" />
    <path d="M12 22a10 10 0 1 0-8-4" />
  </svg>
);

export const ResetIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const DotIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <circle cx="12" cy="12" r="4" />
  </svg>
);

export const SearchIcon = (p) => (
  <svg {...base} strokeWidth={2.5} {...p}>
    <path d="m21 21-4.3-4.3" />
    <circle cx="11" cy="11" r="8" />
  </svg>
);
