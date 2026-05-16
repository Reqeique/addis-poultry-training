export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full text-primary-dark"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Head Outline */}
        <path
          d="M 50 25 C 35 25, 25 40, 25 70 C 25 75, 35 75, 40 75 C 45 75, 45 80, 50 80 C 55 80, 55 75, 60 75 C 65 75, 75 75, 75 70 C 75 40, 65 25, 50 25 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Comb */}
        <ellipse cx="50" cy="20" rx="4" ry="8" fill="#ef4444" />
        
        {/* Eyes */}
        <circle cx="40" cy="45" r="4" fill="currentColor" />
        <circle cx="60" cy="45" r="4" fill="currentColor" />
        
        {/* Beak */}
        <polygon points="43,50 57,50 50,65" fill="#f59e0b" stroke="none" />
        
        {/* Wattle */}
        <path d="M 50 65 Q 45 75, 50 80 Q 55 75, 50 65 Z" fill="#ef4444" />
      </svg>
    </div>
  );
}
