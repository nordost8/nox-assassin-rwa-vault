import { SVGProps } from "react";

/**
 * Custom Assassin's Creed–inspired SVG icons.
 * Stroke uses currentColor so they inherit Tailwind text colors.
 *
 * Available icons:
 *  - BrotherhoodSigil: the iconic A-shape Assassin insignia
 *  - HoodedFigure: side-profile hood
 *  - HiddenBlade: vambrace + blade
 *  - EagleHead: piercing eagle profile
 *  - AnimusReticle: digital reticle ring
 *  - LeapMark: feather mid-flight
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, "viewBox"> & { size?: number };

const base = (size: number = 20) => ({
  width: size,
  height: size,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function BrotherhoodSigil({ size = 20, ...rest }: IconProps) {
  // The iconic Assassin sigil: stylised "A" with curved wings and centre point
  return (
    <svg viewBox="0 0 32 32" {...base(size)} {...rest}>
      {/* central blade/A */}
      <path d="M16 3 L9 28" />
      <path d="M16 3 L23 28" />
      {/* curved wings */}
      <path d="M5 24 C 8 18, 12 14, 16 13" />
      <path d="M27 24 C 24 18, 20 14, 16 13" />
      {/* base notch */}
      <path d="M11 28 L21 28" />
      {/* centre eye */}
      <circle cx="16" cy="20.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HoodedFigure({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" {...base(size)} {...rest}>
      {/* hood outer */}
      <path d="M5 27 C 5 14, 11 6, 16 5 C 21 6, 27 14, 27 27" />
      {/* hood inner shadow */}
      <path d="M9 27 C 10 18, 13 13, 16 12 C 19 13, 22 18, 23 27" />
      {/* face void */}
      <path d="M13 19 C 14 22, 18 22, 19 19" />
      {/* chin */}
      <path d="M11 27 L21 27" />
    </svg>
  );
}

export function HiddenBlade({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" {...base(size)} {...rest}>
      {/* vambrace */}
      <path d="M6 22 L18 18 L22 19 L22 23 L18 24 L6 26 Z" />
      {/* straps */}
      <path d="M10 21.2 L10 24.8" />
      <path d="M14 20.2 L14 25.2" />
      {/* extended blade */}
      <path d="M22 21 L29 20.5 L30 21 L29 21.5 L22 22 Z" fill="currentColor" stroke="none" opacity="0.85" />
      <path d="M22 21 L29 20.5 L30 21 L29 21.5 L22 22 Z" />
    </svg>
  );
}

export function EagleHead({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" {...base(size)} {...rest}>
      {/* head + crest */}
      <path d="M5 17 C 6 11, 12 7, 18 8 C 23 9, 26 12, 27 16" />
      {/* beak */}
      <path d="M27 16 L31 17 L27 19 Z" fill="currentColor" stroke="none" />
      <path d="M27 16 L31 17 L27 19 Z" />
      {/* mouth line */}
      <path d="M22 17.5 L28 17.8" />
      {/* eye */}
      <circle cx="22" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
      {/* feathers under */}
      <path d="M8 19 C 12 24, 18 25, 23 22" />
      <path d="M11 22 L9 26" />
      <path d="M15 24 L14 27" />
      <path d="M20 24.5 L20 27" />
    </svg>
  );
}

export function AnimusReticle({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" {...base(size)} {...rest}>
      <circle cx="16" cy="16" r="11" />
      <circle cx="16" cy="16" r="6" />
      <circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none" />
      {/* tick marks */}
      <path d="M16 2 L16 6" />
      <path d="M16 26 L16 30" />
      <path d="M2 16 L6 16" />
      <path d="M26 16 L30 16" />
      {/* corner brackets */}
      <path d="M5 7 L5 5 L7 5" />
      <path d="M27 5 L25 5 L25 7" />
      <path d="M5 25 L5 27 L7 27" />
      <path d="M25 27 L27 27 L27 25" />
    </svg>
  );
}

export function LeapMark({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" {...base(size)} {...rest}>
      {/* feather */}
      <path d="M22 5 C 12 9, 7 16, 6 27" />
      <path d="M19 8 L11 11" />
      <path d="M15 13 L9 16" />
      <path d="M11 18 L7 21" />
      {/* shaft tip */}
      <circle cx="22" cy="5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
