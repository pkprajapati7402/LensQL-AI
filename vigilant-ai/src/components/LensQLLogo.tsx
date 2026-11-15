interface LensQLLogoProps {
    className?: string
    size?: number
    showText?: boolean
    textClassName?: string
}

export function LensQLLogo({
    className = 'w-8 h-8',
    showText = false,
    textClassName = 'text-lg font-extrabold tracking-tight text-slate-900',
}: LensQLLogoProps) {
    return (
        <div className="flex items-center gap-2.5">
            <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
            >
                <defs>
                    <linearGradient id="lensql-comp-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#1D4ED8" />
                        <stop offset="50%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#0284C7" />
                    </linearGradient>
                    <linearGradient id="lensql-comp-glow" x1="16" y1="16" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#60A5FA" />
                        <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>
                </defs>

                {/* Squircle Base */}
                <rect x="3" y="3" width="42" height="42" rx="11" fill="url(#lensql-comp-grad)" />
                <rect x="3" y="3" width="42" height="42" rx="11" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1.5" />

                {/* Optical Camera Aperture Reticle */}
                <circle cx="23" cy="23" r="13" stroke="#FFFFFF" strokeWidth="1.8" strokeDasharray="5 2.5" strokeOpacity="0.85" />

                {/* Inner Iris Chamber */}
                <circle cx="23" cy="23" r="8.5" fill="#0B132B" fillOpacity="0.3" stroke="#FFFFFF" strokeWidth="2.2" />
                <circle cx="23" cy="23" r="4" fill="url(#lensql-comp-glow)" />

                {/* Query Lens Tail (LensQL 'Q' Symbol) */}
                <path d="M28.5 28.5L37 37" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                <circle cx="37" cy="37" r="1.75" fill="#38BDF8" />

                {/* Corner HUD Target Sensor Brackets */}
                <path d="M9 15V10H14" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
                <path d="M39 15V10H34" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
                <path d="M9 31V36H14" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
            </svg>
            {showText && (
                <span className={textClassName}>
                    Lens<span className="text-blue-600">QL</span> <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-700 font-mono tracking-wider font-bold ml-0.5">AI</span>
                </span>
            )}
        </div>
    )
}
