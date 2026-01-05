"use client";

export type AvatarBodyType = "MALE" | "NEUTRAL" | "FEMALE";
export type AvatarSkinColor = "LIGHT" | "MEDIUM" | "DARK";
export type AvatarHairstyle = "MALE_SHORT" | "MALE_SPIKY" | "NEUTRAL_BOB" | "NEUTRAL_CURLY" | "FEMALE_LONG" | "FEMALE_PONYTAIL";
export type AvatarAccessory = "NONE" | "EARRING" | "SUNGLASSES" | "PARROT";

export interface AvatarConfig {
  bodyType?: AvatarBodyType | null;
  skinColor?: AvatarSkinColor | null;
  hairstyle?: AvatarHairstyle | null;
  accessory?: AvatarAccessory | null;
}

interface AvatarProps {
  config?: AvatarConfig | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SKIN_COLORS: Record<AvatarSkinColor, string> = {
  LIGHT: "#FFDBB4",
  MEDIUM: "#C68642",
  DARK: "#8D5524"
};

const HAIR_COLORS: Record<AvatarBodyType, string> = {
  MALE: "#4A3728",
  NEUTRAL: "#2C1810",
  FEMALE: "#1A0F0A"
};

const SIZES = {
  sm: 32,
  md: 48,
  lg: 96
};

export function Avatar({ config, size = "md", className = "" }: AvatarProps) {
  const sizeValue = SIZES[size];

  // Default fallback if no config
  if (!config || !config.bodyType || !config.skinColor || !config.hairstyle) {
    return (
      <div
        className={`rounded-full bg-gray-300 flex items-center justify-center ${className}`}
        style={{ width: sizeValue, height: sizeValue }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="text-gray-500"
          style={{ width: sizeValue * 0.5, height: sizeValue * 0.5 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    );
  }

  const skinColor = SKIN_COLORS[config.skinColor];
  const hairColor = HAIR_COLORS[config.bodyType];
  const accessory = config.accessory || "NONE";

  return (
    <svg
      viewBox="0 0 100 100"
      className={`rounded-full ${className}`}
      style={{ width: sizeValue, height: sizeValue }}
    >
      {/* Background */}
      <circle cx="50" cy="50" r="50" fill="#E8F4F8" />

      {/* Body/Shoulders based on body type */}
      {config.bodyType === "MALE" && (
        <ellipse cx="50" cy="95" rx="35" ry="20" fill={skinColor} />
      )}
      {config.bodyType === "FEMALE" && (
        <ellipse cx="50" cy="95" rx="30" ry="18" fill={skinColor} />
      )}
      {config.bodyType === "NEUTRAL" && (
        <ellipse cx="50" cy="95" rx="32" ry="19" fill={skinColor} />
      )}

      {/* Neck */}
      <rect x="42" y="65" width="16" height="15" fill={skinColor} />

      {/* Face */}
      <ellipse cx="50" cy="45" rx="25" ry="28" fill={skinColor} />

      {/* Eyes */}
      <ellipse cx="40" cy="45" rx="4" ry="5" fill="white" />
      <ellipse cx="60" cy="45" rx="4" ry="5" fill="white" />
      <circle cx="40" cy="45" r="2" fill="#2C1810" />
      <circle cx="60" cy="45" r="2" fill="#2C1810" />

      {/* Nose */}
      <ellipse cx="50" cy="52" rx="3" ry="4" fill={skinColor} opacity="0.8" />

      {/* Mouth */}
      <path d="M 44 60 Q 50 64 56 60" stroke="#8B4513" strokeWidth="2" fill="none" />

      {/* Hairstyles */}
      {config.hairstyle === "MALE_SHORT" && (
        <>
          <ellipse cx="50" cy="25" rx="26" ry="15" fill={hairColor} />
          <rect x="24" y="25" width="52" height="10" fill={hairColor} />
        </>
      )}
      {config.hairstyle === "MALE_SPIKY" && (
        <>
          <ellipse cx="50" cy="25" rx="26" ry="15" fill={hairColor} />
          <polygon points="30,20 35,5 40,20" fill={hairColor} />
          <polygon points="45,18 50,2 55,18" fill={hairColor} />
          <polygon points="60,20 65,5 70,20" fill={hairColor} />
        </>
      )}
      {config.hairstyle === "NEUTRAL_BOB" && (
        <>
          <ellipse cx="50" cy="25" rx="28" ry="16" fill={hairColor} />
          <rect x="22" y="25" width="56" height="25" rx="10" fill={hairColor} />
        </>
      )}
      {config.hairstyle === "NEUTRAL_CURLY" && (
        <>
          <circle cx="35" cy="22" r="12" fill={hairColor} />
          <circle cx="50" cy="18" r="14" fill={hairColor} />
          <circle cx="65" cy="22" r="12" fill={hairColor} />
          <circle cx="28" cy="35" r="10" fill={hairColor} />
          <circle cx="72" cy="35" r="10" fill={hairColor} />
        </>
      )}
      {config.hairstyle === "FEMALE_LONG" && (
        <>
          <ellipse cx="50" cy="25" rx="28" ry="16" fill={hairColor} />
          <rect x="22" y="25" width="12" height="55" rx="6" fill={hairColor} />
          <rect x="66" y="25" width="12" height="55" rx="6" fill={hairColor} />
        </>
      )}
      {config.hairstyle === "FEMALE_PONYTAIL" && (
        <>
          <ellipse cx="50" cy="25" rx="28" ry="16" fill={hairColor} />
          <ellipse cx="80" cy="30" rx="12" ry="20" fill={hairColor} />
          <rect x="70" y="25" width="10" height="10" fill={hairColor} />
        </>
      )}

      {/* Accessories */}
      {accessory === "EARRING" && (
        <>
          <circle cx="24" cy="50" r="4" fill="#FFD700" />
          <circle cx="76" cy="50" r="4" fill="#FFD700" />
        </>
      )}
      {accessory === "SUNGLASSES" && (
        <>
          <rect x="28" y="40" width="18" height="12" rx="3" fill="#1A1A1A" />
          <rect x="54" y="40" width="18" height="12" rx="3" fill="#1A1A1A" />
          <rect x="46" y="44" width="8" height="3" fill="#1A1A1A" />
          <rect x="24" y="44" width="4" height="3" fill="#1A1A1A" />
          <rect x="72" y="44" width="4" height="3" fill="#1A1A1A" />
        </>
      )}
      {accessory === "PARROT" && (
        <>
          {/* Parrot body */}
          <ellipse cx="88" cy="60" rx="10" ry="15" fill="#FF4500" />
          {/* Parrot head */}
          <circle cx="88" cy="45" r="8" fill="#32CD32" />
          {/* Parrot beak */}
          <polygon points="95,45 102,48 95,50" fill="#FFD700" />
          {/* Parrot eye */}
          <circle cx="90" cy="43" r="2" fill="black" />
          {/* Parrot wing */}
          <ellipse cx="85" cy="60" rx="6" ry="10" fill="#1E90FF" />
          {/* Parrot tail */}
          <rect x="85" y="70" width="6" height="15" rx="2" fill="#FF4500" />
        </>
      )}
    </svg>
  );
}

// Avatar selector component for picking avatar options
interface AvatarSelectorProps {
  value: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
}

export function AvatarSelector({ value, onChange }: AvatarSelectorProps) {
  const bodyTypes: AvatarBodyType[] = ["MALE", "NEUTRAL", "FEMALE"];
  const skinColors: AvatarSkinColor[] = ["LIGHT", "MEDIUM", "DARK"];
  const hairstyles: AvatarHairstyle[] = ["MALE_SHORT", "MALE_SPIKY", "NEUTRAL_BOB", "NEUTRAL_CURLY", "FEMALE_LONG", "FEMALE_PONYTAIL"];
  const accessories: AvatarAccessory[] = ["NONE", "EARRING", "SUNGLASSES", "PARROT"];

  const bodyTypeLabels: Record<AvatarBodyType, string> = {
    MALE: "Male",
    NEUTRAL: "Neutral",
    FEMALE: "Female"
  };

  const skinColorLabels: Record<AvatarSkinColor, string> = {
    LIGHT: "Light",
    MEDIUM: "Medium",
    DARK: "Dark"
  };

  const hairstyleLabels: Record<AvatarHairstyle, string> = {
    MALE_SHORT: "Short",
    MALE_SPIKY: "Spiky",
    NEUTRAL_BOB: "Bob",
    NEUTRAL_CURLY: "Curly",
    FEMALE_LONG: "Long",
    FEMALE_PONYTAIL: "Ponytail"
  };

  const accessoryLabels: Record<AvatarAccessory, string> = {
    NONE: "None",
    EARRING: "Earring",
    SUNGLASSES: "Sunglasses",
    PARROT: "Parrot"
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex justify-center">
        <Avatar config={value} size="lg" />
      </div>

      {/* Body Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Body Type</label>
        <div className="flex gap-2">
          {bodyTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ ...value, bodyType: type })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                value.bodyType === type
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {bodyTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Skin Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Skin Color</label>
        <div className="flex gap-2">
          {skinColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ ...value, skinColor: color })}
              className={`w-12 h-12 rounded-lg border-2 transition-colors ${
                value.skinColor === color
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              style={{ backgroundColor: SKIN_COLORS[color] }}
              title={skinColorLabels[color]}
            />
          ))}
        </div>
      </div>

      {/* Hairstyle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Hairstyle</label>
        <div className="flex flex-wrap gap-2">
          {hairstyles.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ ...value, hairstyle: style })}
              className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                value.hairstyle === style
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {hairstyleLabels[style]}
            </button>
          ))}
        </div>
      </div>

      {/* Accessory */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Accessory</label>
        <div className="flex flex-wrap gap-2">
          {accessories.map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => onChange({ ...value, accessory: acc })}
              className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                value.accessory === acc
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {accessoryLabels[acc]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
