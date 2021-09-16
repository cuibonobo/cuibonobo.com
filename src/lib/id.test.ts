import timekeeper from 'timekeeper';
import { generateId, intToCrockford32, RAND_SUFFIX_LENGTH } from './id';

test('Generate Crockford base 32 for single digits', () => {
  expect(intToCrockford32(0)).toBe('0');
  expect(intToCrockford32(1)).toBe('1');
  expect(intToCrockford32(10)).toBe('a');
  expect(intToCrockford32(18)).toBe('j');
  expect(intToCrockford32(20)).toBe('m');
  expect(intToCrockford32(22)).toBe('p');
  expect(intToCrockford32(27)).toBe('v');
  expect(intToCrockford32(31)).toBe('z');
});

test('Crockford base 32 generates the correct number of digits', () => {
  expect(intToCrockford32(32)).toBe('10');
  expect(intToCrockford32(1024)).toBe('100');
  expect(intToCrockford32(32768)).toBe('1000');
  expect(intToCrockford32(1048576)).toBe('10000');
  expect(intToCrockford32(33554432)).toBe('100000');
  expect(intToCrockford32(1073741824)).toBe('1000000');
  expect(intToCrockford32(34359738368)).toBe('10000000');
  expect(intToCrockford32(1099511627776)).toBe('100000000');
  expect(intToCrockford32(35184372088832)).toBe('1000000000');
});

test('Crockford base 32 throws an error for negative numbers', () => {
  expect(() => intToCrockford32(-1)).toThrow(RangeError);
});

test('ID contains at least 12 characters', () => {
  const id = generateId();
  expect(typeof id).toBe('string');
  expect(id.length).toBeGreaterThanOrEqual(12);
});

test('ID gets more digits for dates far into the future', () => {
  const id = generateId(35184372088833);
  expect(typeof id).toBe('string');
  expect(id.length).toBeGreaterThanOrEqual(13);
});

test('ID reflects current time', () => {
  const now = Date.now();
  const id = generateId(now);
  const timestamp = id.substr(0, 9);
  expect(timestamp).toBe(intToCrockford32(now));
});

test('IDs generated in the same millisecond will be different', () => {
  // The `generateId()` function is time-dependent, so we are freezing
  // time to better test the random suffixes.
  const currentTime = new Date();
  timekeeper.freeze(currentTime);
  const idArray = [];
  // Playing the odds: once we have gone through half plus one of a 3-digit
  // Crockford-32 number, we should have seen a repeat random suffix at least
  // once. This is to improve the code coverage of the
  // `while(usedRandChars.includes(randChars))` block.
  const length = Math.ceil(Math.pow(32, RAND_SUFFIX_LENGTH) / 2) + 1;
  for (let i = 0; i < length; i++) {
    idArray[i] = generateId();
  }
  // All of the timestamp parts of the IDs should be the same
  const timestampSet = new Set(idArray.map((s) => s.slice(0, -RAND_SUFFIX_LENGTH)));
  expect(new Set([idArray[0].slice(0, -RAND_SUFFIX_LENGTH)])).toEqual(timestampSet);
  // All of the IDs should be unique
  expect(new Set(idArray).size).toBe(idArray.length);
  timekeeper.reset();
});
