export function WaveDividerTop({ className = "", color = "#ffffff" }: { className?: string; color?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${className}`}>
      <svg
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative block w-full h-[60px] md:h-[80px]"
        preserveAspectRatio="none"
      >
        <path
          d="M0 60L48 54C96 48 192 36 288 30C384 24 480 24 576 30C672 36 768 48 864 54C960 60 1056 60 1152 54C1248 48 1344 36 1392 30L1440 24V120H0V60Z"
          fill={color}
        />
      </svg>
    </div>
  );
}

export function WaveDividerBottom({ className = "", color = "#ffffff" }: { className?: string; color?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${className}`}>
      <svg
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative block w-full h-[60px] md:h-[80px]"
        preserveAspectRatio="none"
      >
        <path
          d="M0 0L48 6C96 12 192 24 288 30C384 36 480 36 576 30C672 24 768 12 864 6C960 0 1056 0 1152 6C1248 12 1344 24 1392 30L1440 36V120H0V0Z"
          fill={color}
        />
      </svg>
    </div>
  );
}

export function CurveDivider({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? "rotate-180" : ""} ${className}`}>
      <svg
        viewBox="0 0 1440 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative block w-full h-[40px] md:h-[60px]"
        preserveAspectRatio="none"
      >
        <path
          d="M0 80C240 0 480 0 720 40C960 80 1200 80 1440 0V80H0Z"
          fill="currentColor"
          className="text-[#f4f7fb]"
        />
      </svg>
    </div>
  );
}
