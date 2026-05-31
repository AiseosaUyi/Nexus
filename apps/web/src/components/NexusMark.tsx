/**
 * Nexus brand mark — "Blocks": three cascading rounded blocks (gold · clay · ink).
 * The bottom block uses currentColor so it adapts to light/dark (ink on light,
 * paper on dark). Set the text color on the element (e.g. `text-foreground`).
 */
export default function NexusMark({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="16" y="22" width="50" height="18" rx="6" fill="#c08a3e" />
      <rect x="25" y="41" width="50" height="18" rx="6" fill="#b14e2c" />
      <rect x="34" y="60" width="50" height="18" rx="6" fill="currentColor" />
    </svg>
  );
}
