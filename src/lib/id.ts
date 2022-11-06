import crypto from 'crypto';

const CHARACTERS = '0123456789abcdefghjkmnpqrstvwxyz';
export const BASE = CHARACTERS.length;
const MIN_TIMESTAMP = 9;
export const RAND_SUFFIX_LENGTH = 3;

let lastNowId = '';
let lastRandChars = '';

export const crockford32Encode = (n: number): string => {
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

export const crockford32Decode = (s: string): number => {
  if (s.length === 0) {
    throw new Error('String must not be empty!');
  }
  s = s.toLowerCase();
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s[s.length - i - 1];
    const val = CHARACTERS.indexOf(char);
    if (val < 0) {
      throw new Error('Undefined characters in string!');
    }
    n += val * Math.pow(BASE, i);
  }
  return n;
};

const generateRandChars = (): string => {
  const randInt = crypto.randomInt(0, Math.pow(BASE, RAND_SUFFIX_LENGTH) - 1);
  return crockford32Encode(randInt).padStart(RAND_SUFFIX_LENGTH, CHARACTERS[0]);
};

const incrementRandChars = (randChars: string): string => {
  const val = crockford32Decode(randChars);
  const newRandChars = crockford32Encode(val + 1);
  if (newRandChars.length > RAND_SUFFIX_LENGTH) {
    throw new Error('Random character overflow!');
  }
  return newRandChars;
};

export const generateId = (timestamp = -1): string => {
  if (timestamp < 0) {
    timestamp = Date.now();
  }
  const nowId: string = crockford32Encode(timestamp).padStart(MIN_TIMESTAMP, CHARACTERS[0]);
  const randChars: string =
    nowId !== lastNowId ? generateRandChars() : incrementRandChars(lastRandChars);
  lastNowId = nowId;
  lastRandChars = randChars;
  return nowId + randChars;
};
