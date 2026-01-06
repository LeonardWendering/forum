/**
 * Community name generator for bot automation system.
 * Generates friendly, nature-inspired community names.
 */

// Nature/cozy themed adjectives
const ADJECTIVES = [
  "Sunny", "Cozy", "Quiet", "Happy", "Peaceful", "Gentle", "Warm", "Calm",
  "Golden", "Silver", "Misty", "Crystal", "Amber", "Willow", "Maple",
  "Cedar", "Birch", "Mossy", "Fern", "Clover", "Sage", "Rustic",
  "Meadow", "Forest", "River", "Mountain", "Ocean", "Valley", "Prairie",
  "Twilight", "Dawn", "Dusk", "Starry", "Moonlit", "Breezy", "Serene"
];

// Nature/place themed nouns
const NOUNS = [
  "Meadow", "Harbor", "Pond", "Valley", "Garden", "Grove", "Glen",
  "Hollow", "Ridge", "Brook", "Creek", "Springs", "Falls", "Cove",
  "Haven", "Retreat", "Sanctuary", "Nook", "Corner", "Terrace",
  "Orchard", "Vineyard", "Fields", "Woods", "Pines", "Oaks", "Willows",
  "Heights", "Vista", "Shores", "Landing", "Crossing", "Trail", "Path"
];

// Bot display name adjectives
const BOT_ADJECTIVES = [
  "Happy", "Sunny", "Bright", "Cheerful", "Friendly", "Gentle", "Kind",
  "Calm", "Warm", "Cool", "Swift", "Clever", "Wise", "Bold", "Brave",
  "Quiet", "Lively", "Merry", "Jolly", "Cozy", "Snug", "Neat", "Tidy"
];

// Bot display name nouns (animals, nature, objects)
const BOT_NOUNS = [
  "Fox", "Bear", "Wolf", "Deer", "Owl", "Eagle", "Hawk", "Robin",
  "Maple", "Oak", "Pine", "Birch", "Willow", "Cedar", "Fern", "Moss",
  "River", "Creek", "Brook", "Lake", "Cloud", "Star", "Moon", "Sun",
  "Pebble", "Stone", "Crystal", "Amber", "Jade", "Pearl", "Coral"
];

/**
 * Randomly pick an element from an array
 */
function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a random community name like "SunnyMeadow" or "CozyHarbor"
 */
export function generateCommunityName(): string {
  const adjective = randomPick(ADJECTIVES);
  const noun = randomPick(NOUNS);
  return `${adjective}${noun}`;
}

/**
 * Generate a random bot display name like "HappyFox" or "WiseMoon"
 */
export function generateBotDisplayName(): string {
  const adjective = randomPick(BOT_ADJECTIVES);
  const noun = randomPick(BOT_NOUNS);
  return `${adjective}${noun}`;
}

/**
 * Convert a PascalCase name to a slug.
 * "SunnyMeadow" -> "sunny-meadow"
 */
export function nameToSlug(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Generate a unique community name by checking against existing slugs.
 * Appends a number suffix if the base name is taken.
 */
export async function generateUniqueCommunityName(
  checkSlugExists: (slug: string) => Promise<boolean>
): Promise<{ name: string; slug: string }> {
  // Try up to 100 times to find a unique name
  for (let i = 0; i < 100; i++) {
    const name = generateCommunityName();
    const slug = nameToSlug(name);

    const exists = await checkSlugExists(slug);
    if (!exists) {
      return { name, slug };
    }
  }

  // If all attempts failed, append a random number
  const baseName = generateCommunityName();
  const randomSuffix = Math.floor(Math.random() * 9999);
  const name = `${baseName}${randomSuffix}`;
  const slug = nameToSlug(name).replace(/(\d+)$/, "-$1");

  return { name, slug };
}

/**
 * Generate a unique bot display name.
 * Appends a number suffix if needed.
 */
export async function generateUniqueBotName(
  checkNameExists: (name: string) => Promise<boolean>
): Promise<string> {
  // Try up to 50 times to find a unique name
  for (let i = 0; i < 50; i++) {
    const name = generateBotDisplayName();
    const exists = await checkNameExists(name);
    if (!exists) {
      return name;
    }
  }

  // If all attempts failed, append a random number
  const baseName = generateBotDisplayName();
  const randomSuffix = Math.floor(Math.random() * 999);
  return `${baseName}${randomSuffix}`;
}
