'use client';

import React from 'react';

export function SportIcon({
  name,
  className = 'w-6 h-6',
}: {
  name: string;
  className?: string;
}) {
  const lower = name.toLowerCase();

  if (lower.includes('cricket')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.78 2.22a2 2 0 0 0-2.83 0l-9.9 9.9a1 1 0 0 0-.25.43l-1.74 6.1a1 1 0 0 0 1.22 1.22l6.1-1.74a1 1 0 0 0 .43-.25l9.9-9.9a2 2 0 0 0 0-2.83l-2.93-2.93zM4 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      </svg>
    );
  }

  if (lower.includes('football')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="12 7 16.5 10.3 14.8 15.5 9.2 15.5 7.5 10.3 12 7" />
        <line x1="12" y1="2" x2="12" y2="7" />
        <line x1="21.5" y1="9" x2="16.5" y2="10.3" />
        <line x1="18" y1="20" x2="14.8" y2="15.5" />
        <line x1="6" y1="20" x2="9.2" y2="15.5" />
        <line x1="2.5" y1="9" x2="7.5" y2="10.3" />
      </svg>
    );
  }

  if (lower.includes('tug')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12h20" />
        <path d="M6 8l-4 4 4 4" />
        <path d="M18 8l4 4-4 4" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    );
  }

  if (lower.includes('badminton')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a5 5 0 0 1 5 5c0 2-1.5 3.5-3 4.5l5 10-2 1-5-10c-1 .5-2 1-3 1a5 5 0 0 1-5-5 5 5 0 0 1 5-5z" />
        <line x1="10" y1="5" x2="14" y2="9" />
        <line x1="14" y1="5" x2="10" y2="9" />
      </svg>
    );
  }

  if (lower.includes('ludo')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" />
        <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" />
        <circle cx="12" cy="12" r="1.3" fill="currentColor" />
        <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" />
      </svg>
    );
  }

  if (lower.includes('table tennis')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="11" cy="10" r="6.5" />
        <rect x="9.8" y="16" width="2.4" height="6" rx="1" />
        <circle cx="19" cy="18.5" r="2.2" />
      </svg>
    );
  }

  if (lower.includes('basketball')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <path d="M4.93 4.93c4.2 4.2 4.2 10.04 0 14.14" />
        <path d="M19.07 4.93c-4.2 4.2-4.2 10.04 0 14.14" />
      </svg>
    );
  }

  if (lower.includes('chess')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 22H5v-2h14v2zm-3.5-4h-7l1-3h5l1 3zm-1.2-5c.4-.7.7-1.5.7-2.3 0-2.6-2.1-4.7-4.7-4.7-.5 0-1 .1-1.5.3L9 4h2V2H7v4l2.4 2.4C8.5 9.2 8 10.3 8 11.5c0 1.2.5 2.3 1.3 3.1l.9-1.3c-.5-.5-.8-1.2-.8-1.9 0-1.5 1.2-2.7 2.7-2.7s2.7 1.2 2.7 2.7c0 .5-.1 1-.4 1.4l1.3.9z" />
      </svg>
    );
  }

  if (lower.includes('rubik')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
        <line x1="12" y1="22" x2="12" y2="7" />
      </svg>
    );
  }

  if (lower.includes('arm')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19h16" />
        <path d="M6 15l3-4 4 4 5-6" />
        <path d="M18 9V5h-4" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 8 8 12 12 16 16 12 12 8" />
    </svg>
  );
}
