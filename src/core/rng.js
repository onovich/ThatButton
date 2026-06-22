export function hashSeed(seedText) {
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index++) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRng(seedText) {
  let state = hashSeed(seedText);
  return function seededRandom() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandomTools(rng) {
  const randomValue = () => rng();
  const randomInt = (min, max) => Math.floor(randomValue() * (max - min + 1)) + min;
  const randomItem = (items) => items[Math.floor(randomValue() * items.length)];
  const shuffledNumbers = (count) => {
    const pool = Array.from({ length: 9 }, (_, index) => index + 1);
    const numbers = [];
    while (numbers.length < count && pool.length > 0) {
      const index = randomInt(0, pool.length - 1);
      numbers.push(pool.splice(index, 1)[0]);
    }
    while (numbers.length < count) {
      numbers.push(randomInt(1, 9));
    }
    return numbers;
  };

  return {
    randomValue,
    randomInt,
    randomItem,
    shuffledNumbers
  };
}
