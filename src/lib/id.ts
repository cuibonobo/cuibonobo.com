import crypto from 'crypto';

const CHARACTERS = '0123456789abcdefghjkmnpqrstvwxyz';
export const BASE = CHARACTERS.length;
const MIN_TIMESTAMP_LENGTH = 9;
export const RAND_SUFFIX_LENGTH = 3;

let lastNowId = '';
let lastRandChars = '';

export class IdGenerationError extends Error {
  constructor(message = '') {
    super(message);
    this.name = 'IdGenerationError';
    if (!message) {
      this.message = 'An ID could not be generated.';
    }
  }
}
export class IdGenerationOverflowError extends IdGenerationError {
  constructor(message = '') {
    super(message);
    this.name = 'IdGenerationOverflowError';
    if (!message) {
      this.message = 'Too many IDs have been generated in the same millisecond.';
    }
  }
}

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
    throw new RangeError('String must not be empty!');
  }
  s = s.toLowerCase();
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s[s.length - i - 1];
    const val = CHARACTERS.indexOf(char);
    if (val < 0) {
      throw new RangeError('Undefined characters in string!');
    }
    n += val * Math.pow(BASE, i);
  }
  return n;
};

const formatChars = (chars: string, length: number, padChar: string = CHARACTERS[0]): string => {
  return chars.padStart(length, padChar);
};

const generateRandChars = (): string => {
  const randInt = crypto.randomInt(0, Math.pow(BASE, RAND_SUFFIX_LENGTH) - 1);
  return formatChars(crockford32Encode(randInt), RAND_SUFFIX_LENGTH);
};

const incrementRandChars = (randChars: string): string => {
  const val = crockford32Decode(randChars);
  const newRandChars = crockford32Encode(val + 1);
  if (newRandChars.length > RAND_SUFFIX_LENGTH) {
    throw new IdGenerationOverflowError();
  }
  return formatChars(newRandChars, RAND_SUFFIX_LENGTH);
};

export const _setLastNowId = (chars: string): void => {
  if (chars.length < MIN_TIMESTAMP_LENGTH) {
    throw new RangeError(
      `Value of lastNowId must have at least ${MIN_TIMESTAMP_LENGTH} characters.`
    );
  }
  lastNowId = chars;
};

export const _setLastRandChars = (chars: string): void => {
  if (chars.length !== RAND_SUFFIX_LENGTH) {
    throw new RangeError(`Value of lastRandChars must have ${RAND_SUFFIX_LENGTH} characters.`);
  }
  lastRandChars = chars;
};

export const generateId = (timestamp: number = -1): string => {
  if (timestamp < 0) {
    timestamp = Date.now();
  }
  const nowId: string = formatChars(crockford32Encode(timestamp), MIN_TIMESTAMP_LENGTH);
  const randChars: string =
    nowId !== lastNowId ? generateRandChars() : incrementRandChars(lastRandChars);
  lastNowId = nowId;
  lastRandChars = randChars;
  return nowId + randChars;
};
