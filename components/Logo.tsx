export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <span className="flex size-full items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_1px_0_0_var(--border)]">
        <svg
          viewBox="0 0 100 100"
          className="size-3/5"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Head Outline */}
          <path
            d="M 50 25 C 35 25, 25 40, 25 70 C 25 75, 35 75, 40 75 C 45 75, 45 80, 50 80 C 55 80, 55 75, 60 75 C 65 75, 75 75, 75 70 C 75 40, 65 25, 50 25 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Comb */}
          <ellipse cx="50" cy="20" rx="5" ry="9" fill="currentColor" opacity="0.85" />
          {/* Eyes */}
          <circle cx="40" cy="45" r="4.5" fill="currentColor" />
          <circle cx="60" cy="45" r="4.5" fill="currentColor" />
          {/* Beak */}
          <polygon points="43,50 57,50 50,65" fill="currentColor" opacity="0.75" stroke="none" />
          {/* Wattle */}
          <path d="M 50 65 Q 45 75, 50 80 Q 55 75, 50 65 Z" fill="currentColor" opacity="0.85" />
        </svg>
      </span>
    </div>
  );
}
