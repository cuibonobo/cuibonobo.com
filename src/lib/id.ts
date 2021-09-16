import crypto from 'crypto';

const CHARACTERS = '0123456789abcdefghjkmnpqrstvwxyz';
const BASE = CHARACTERS.length;
const MIN_TIMESTAMP = 9;
export const RAND_SUFFIX_LENGTH = 3;

let lastNowId: string | null = null;
let usedRandChars: string[] = [];

export const intToCrockford32 = (n: number): string => {
  if (n < 0) {
    throw new RangeError('Not defined for negative numbers!');
  }
  // Convert number to integer
  n = Math.floor(n);
  let crock32 = '';
  if (n === 0) {
    return CHARACTERS[n];
  }
  while (n > 0) {
    const remainder = n % BASE;
    n = Math.floor(n / BASE);
    crock32 = CHARACTERS[remainder] + crock32;
  }
  return crock32;
};

const generateRandChars = (): string => {
  let randChars = '';
  for (let i = 0; i < RAND_SUFFIX_LENGTH; i++) {
    randChars += intToCrockford32(crypto.randomInt(0, BASE));
  }
  return randChars;
};

export const generateId = (timestamp = -1): string => {
  if (timestamp < 0) {
    timestamp = Date.now();
  }
  const nowId: string = intToCrockford32(timestamp).padStart(MIN_TIMESTAMP, '0');
  let randChars: string = generateRandChars();
  if (nowId !== lastNowId) {
    usedRandChars = [];
  }
  while (usedRandChars.includes(randChars)) {
    randChars = generateRandChars();
  }
  usedRandChars.push(randChars);
  lastNowId = nowId;
  return nowId + randChars;
};
