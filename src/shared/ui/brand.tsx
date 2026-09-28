export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
        <rect width="48" height="48" rx="16" fill="currentColor" />
        <path
          d="M12 26c0-9 5-15 13-15s14 6 14 14-5 14-14 14c-3 0-6-1-8-2l-6 2 2-7c-1-2-1-3-1-6Z"
          fill="white"
        />
        <circle cx="25" cy="25" r="5" fill="currentColor" />
      </svg>
      {!compact && (
        <span>
          MAX<span className="brand-light"> чат</span>
        </span>
      )}
    </div>
  );
}
