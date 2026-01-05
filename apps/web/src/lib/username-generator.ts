const ADJECTIVES = [
  "happy", "clever", "swift", "brave", "calm",
  "eager", "fancy", "gentle", "jolly", "kind",
  "lively", "merry", "nice", "proud", "quick",
  "sharp", "smart", "sunny", "witty", "zesty",
  "cosmic", "golden", "silver", "crystal", "mystic",
  "royal", "ancient", "wild", "noble", "mighty"
];

const FRUITS_AND_VEGETABLES = [
  "apple", "banana", "cherry", "date", "elderberry",
  "fig", "grape", "honeydew", "kiwi", "lemon",
  "mango", "nectarine", "orange", "papaya", "quince",
  "raspberry", "strawberry", "tangerine", "vanilla", "watermelon",
  "carrot", "broccoli", "spinach", "potato", "tomato",
  "pepper", "onion", "garlic", "celery", "cucumber"
];

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomLetter(): string {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

function getRandomFourDigits(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function generateUsername(): string {
  const adjective = getRandomElement(ADJECTIVES);
  const fruitOrVegetable = getRandomElement(FRUITS_AND_VEGETABLES);
  const letter = getRandomLetter();
  const digits = getRandomFourDigits();

  return `${adjective}-${fruitOrVegetable}-${letter}-${digits}`;
}
