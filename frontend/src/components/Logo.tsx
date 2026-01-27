interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { wrapper: "h-8 w-8", icon: "h-4 w-4" },
  md: { wrapper: "h-10 w-10", icon: "h-5 w-5" },
  lg: { wrapper: "h-12 w-12", icon: "h-6 w-6" },
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={`${s.wrapper} rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center ${className}`}>
      <svg
        className={s.icon}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Map pin shape */}
        <path
          d="M10 2C6.13 2 3 5.13 3 9C3 14.25 10 19 10 19C10 19 17 14.25 17 9C17 5.13 13.87 2 10 2Z"
          fill="white"
        />
        {/* Inner site/property square with grid */}
        <rect x="6.5" y="6" width="7" height="5" rx="1" fill="url(#logoGradientInline)"/>
        <line x1="10" y1="6" x2="10" y2="11" stroke="white" strokeWidth="0.6" strokeOpacity="0.6"/>
        <line x1="6.5" y1="8.5" x2="13.5" y2="8.5" stroke="white" strokeWidth="0.6" strokeOpacity="0.6"/>
        <defs>
          <linearGradient id="logoGradientInline" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316"/>
            <stop offset="100%" stopColor="#ea580c"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function LogoWithText({ size = "md", className = "" }: LogoProps) {
  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Logo size={size} />
      <span className={`${textSizes[size]} font-semibold text-white`}>Siteora</span>
    </div>
  );
}
