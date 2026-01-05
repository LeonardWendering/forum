import ms from "ms";

export const durationToMs = (value: string, fallback: string) => {
  const parsed = ms(value ?? fallback);
  if (typeof parsed === "undefined") {
    const fallbackParsed = ms(fallback);
    if (typeof fallbackParsed === "undefined") {
      throw new Error(`Invalid duration value: ${value}`);
    }
    return fallbackParsed;
  }

  return parsed;
};
