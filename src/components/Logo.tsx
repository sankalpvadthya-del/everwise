import { Link } from "@tanstack/react-router";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <g className="stroke-primary-foreground" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M10 21 L16 11 L22 21 M12.5 17 H19.5" />
      </g>
      <circle cx="16" cy="11" r="2.2" className="fill-brand" />
      <circle cx="10" cy="21" r="2" className="fill-primary-foreground" />
      <circle cx="22" cy="21" r="2" className="fill-primary-foreground" />
    </svg>
  );
}

export function Logo({ to = "/" }: { to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 font-display font-semibold tracking-tight text-foreground">
      <LogoMark />
      <span>AI Memory Trainer</span>
    </Link>
  );
}
