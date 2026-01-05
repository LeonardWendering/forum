"use client";

export type AvatarBodyType = "MASCULINE" | "NEUTRAL" | "FEMININE";
export type AvatarSkinTone = "LIGHT" | "MEDIUM" | "DARK";
export type AvatarAccessory = "NONE" | "EARRINGS" | "SUNGLASSES" | "PARROT";

export interface AvatarConfig {
  bodyType: AvatarBodyType;
  skinTone: AvatarSkinTone;
  hairstyle: number; // 1-6
  accessory: AvatarAccessory;
}

interface AvatarProps {
  config?: AvatarConfig;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SKIN_TONES = {
  LIGHT: "#F5D0C5",
  MEDIUM: "#D4A373",
  DARK: "#8B6F47"
};

const HAIR_COLORS = ["#2C1B18", "#B55239", "#E6C45C", "#4A4A4A"];

export function Avatar({ config, size = "md", className = "" }: AvatarProps) {
  // Default config if none provided
  const defaultConfig: AvatarConfig = {
    bodyType: "NEUTRAL",
    skinTone: "MEDIUM",
    hairstyle: 1,
    accessory: "NONE"
  };

  const avatarConfig = config || defaultConfig;
  const skinColor = SKIN_TONES[avatarConfig.skinTone];
  const hairColor = HAIR_COLORS[(avatarConfig.hairstyle - 1) % HAIR_COLORS.length];

  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 96
  };

  const svgSize = sizeMap[size];

  // Hairstyle paths
  const getHairstyle = (style: number, bodyType: AvatarBodyType) => {
    // Styles 1-2: Masculine
    // Styles 3-4: Neutral
    // Styles 5-6: Feminine

    if (style === 1) {
      // Short cropped
      return <path d="M30 15 Q20 10, 15 12 Q12 15, 12 20 L12 25 Q30 22, 48 25 L48 20 Q48 15, 45 12 Q40 10, 30 15 Z" fill={hairColor} />;
    } else if (style === 2) {
      // Side swept
      return <path d="M30 15 Q18 12, 15 15 Q12 18, 12 22 L15 25 Q30 23, 48 25 L48 20 Q46 15, 40 13 Q35 12, 30 15 Z" fill={hairColor} />;
    } else if (style === 3) {
      // Medium length
      return <path d="M30 15 Q20 10, 15 14 Q10 18, 10 25 L10 30 Q30 28, 50 30 L50 25 Q50 18, 45 14 Q40 10, 30 15 Z" fill={hairColor} />;
    } else if (style === 4) {
      // Wavy medium
      return <path d="M30 15 Q18 10, 12 16 Q8 22, 10 28 L12 32 Q30 30, 48 32 L50 28 Q52 22, 48 16 Q42 10, 30 15 Z" fill={hairColor} />;
    } else if (style === 5) {
      // Long straight
      return <path d="M30 15 Q18 8, 12 14 Q6 20, 8 30 L8 38 Q30 36, 52 38 L52 30 Q54 20, 48 14 Q42 8, 30 15 Z" fill={hairColor} />;
    } else {
      // Long curly
      return <path d="M30 15 Q16 8, 10 16 Q4 24, 6 35 L10 40 Q30 38, 50 40 L54 35 Q56 24, 50 16 Q44 8, 30 15 Z" fill={hairColor} />;
    }
  };

  const getAccessory = (accessory: AvatarAccessory) => {
    switch (accessory) {
      case "EARRINGS":
        return (
          <g>
            <circle cx="15" cy="32" r="2" fill="#FFD700" />
            <circle cx="45" cy="32" r="2" fill="#FFD700" />
          </g>
        );
      case "SUNGLASSES":
        return (
          <g>
            <rect x="16" y="25" width="12" height="8" rx="2" fill="#2C3E50" opacity="0.7" />
            <rect x="32" y="25" width="12" height="8" rx="2" fill="#2C3E50" opacity="0.7" />
            <line x1="28" y1="29" x2="32" y2="29" stroke="#2C3E50" strokeWidth="1.5" />
          </g>
        );
      case "PARROT":
        return (
          <g transform="translate(48, 20)">
            {/* Parrot body */}
            <ellipse cx="0" cy="0" rx="6" ry="8" fill="#DC143C" />
            {/* Wing */}
            <ellipse cx="-2" cy="2" rx="3" ry="5" fill="#B22222" />
            {/* Head */}
            <circle cx="2" cy="-6" r="4" fill="#FF6347" />
            {/* Beak */}
            <path d="M4 -6 L7 -6 L5 -5 Z" fill="#FFA500" />
            {/* Eye */}
            <circle cx="3" cy="-6" r="1" fill="white" />
            <circle cx="3" cy="-6" r="0.5" fill="black" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox="0 0 60 60"
      className={`rounded-full ${className}`}
      style={{ backgroundColor: "#E8F4F8" }}
    >
      {/* Background circle */}
      <circle cx="30" cy="30" r="28" fill="#E8F4F8" />

      {/* Hair */}
      {getHairstyle(avatarConfig.hairstyle, avatarConfig.bodyType)}

      {/* Head */}
      <circle cx="30" cy="30" r="14" fill={skinColor} />

      {/* Eyes */}
      <circle cx="24" cy="28" r="2" fill="#2C3E50" />
      <circle cx="36" cy="28" r="2" fill="#2C3E50" />

      {/* Nose */}
      <path d="M30 32 L28 34 L30 34 Z" fill={skinColor} stroke={skinColor} strokeWidth="0.5" opacity="0.6" />

      {/* Mouth */}
      <path d="M26 36 Q30 38, 34 36" stroke="#2C3E50" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* Body/Neck */}
      <rect x="22" y="42" width="16" height="10" fill={skinColor} />
      <rect x="20" y="48" width="20" height="12" rx="4" fill="#4A90E2" />

      {/* Accessories */}
      {getAccessory(avatarConfig.accessory)}
    </svg>
  );
}
