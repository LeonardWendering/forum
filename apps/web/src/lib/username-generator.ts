const ADJECTIVES = [
  "Happy", "Sunny", "Clever", "Brave", "Swift", "Calm", "Bright", "Bold",
  "Gentle", "Kind", "Wise", "Lucky", "Cheerful", "Proud", "Quick", "Silent",
  "Mighty", "Noble", "Witty", "Jolly", "Eager", "Fancy", "Zesty", "Lively",
  "Merry", "Quirky", "Daring", "Funky", "Groovy", "Jazzy"
];

const FRUITS_AND_VEGETABLES = [
  "Apple", "Banana", "Carrot", "Grape", "Lemon", "Mango", "Orange", "Peach",
  "Pear", "Plum", "Tomato", "Cucumber", "Pepper", "Radish", "Celery", "Onion",
  "Potato", "Pumpkin", "Melon", "Berry", "Cherry", "Kiwi", "Lime", "Papaya",
  "Avocado", "Broccoli", "Spinach", "Lettuce", "Cabbage", "Eggplant"
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Generates a random username in the format: adjective-fruit_or_vegetable-letter-four_digit_number
 * Example: "Happy-Carrot-A-1234"
 */
export function generateUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const item = FRUITS_AND_VEGETABLES[Math.floor(Math.random() * FRUITS_AND_VEGETABLES.length)];
  const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const number = Math.floor(1000 + Math.random() * 9000); // 1000-9999

  return `${adjective}-${item}-${letter}-${number}`;
}

/**
 * Generates multiple unique username suggestions
 */
export function generateUsernameSuggestions(count: number = 3): string[] {
  const suggestions = new Set<string>();

  while (suggestions.size < count) {
    suggestions.add(generateUsername());
  }

  return Array.from(suggestions);
}
