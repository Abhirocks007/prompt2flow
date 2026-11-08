export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#16161b" />
      <circle cx="10" cy="16" r="4.2" fill="#a78bfa" />
      <circle cx="22" cy="16" r="4.2" fill="#67e8f9" />
      <path d="M14 16h4" stroke="#ececf1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
