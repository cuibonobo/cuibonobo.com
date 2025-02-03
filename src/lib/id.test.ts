import { describe, test, expect } from 'vitest';
import {
  generateId,
  crockford32Encode,
  crockford32Decode,
  RAND_SUFFIX_LENGTH,
  BASE,
  IdGenerationOverflowError,
  _setLastNowId,
  _setLastRandChars
} from './id';

describe('ID generation library', () => {
  test('Encode Crockford-32 for single digits', () => {
    expect(crockford32Encode(0)).toBe('0');
    expect(crockford32Encode(1)).toBe('1');
    expect(crockford32Encode(10)).toBe('a');
    expect(crockford32Encode(18)).toBe('j');
    expect(crockford32Encode(20)).toBe('m');
    expect(crockford32Encode(22)).toBe('p');
    expect(crockford32Encode(27)).toBe('v');
    expect(crockford32Encode(31)).toBe('z');
  });

  test('Decode Crockford-32 for single digits', () => {
    expect(crockford32Decode('0')).toBe(0);
    expect(crockford32Decode('1')).toBe(1);
    expect(crockford32Decode('a')).toBe(10);
    expect(crockford32Decode('j')).toBe(18);
    expect(crockford32Decode('m')).toBe(20);
    expect(crockford32Decode('p')).toBe(22);
    expect(crockford32Decode('v')).toBe(27);
    expect(crockford32Decode('z')).toBe(31);
  });

  test('Crockford-32 encodes to the correct number of digits', () => {
    expect(crockford32Encode(32)).toBe('10');
    expect(crockford32Encode(1024)).toBe('100');
    expect(crockford32Encode(32768)).toBe('1000');
    expect(crockford32Encode(1048576)).toBe('10000');
    expect(crockford32Encode(33554432)).toBe('100000');
    expect(crockford32Encode(1073741824)).toBe('1000000');
    expect(crockford32Encode(34359738368)).toBe('10000000');
    expect(crockford32Encode(1099511627776)).toBe('100000000');
    expect(crockford32Encode(35184372088832)).toBe('1000000000');
  });

  test('Crockford-32 with multiple digits decode to the correct number', () => {
    expect(crockford32Decode('10')).toBe(32);
    expect(crockford32Decode('100')).toBe(1024);
    expect(crockford32Decode('1000')).toBe(32768);
    expect(crockford32Decode('10000')).toBe(1048576);
    expect(crockford32Decode('100000')).toBe(33554432);
    expect(crockford32Decode('1000000')).toBe(1073741824);
    expect(crockford32Decode('10000000')).toBe(34359738368);
    expect(crockford32Decode('100000000')).toBe(1099511627776);
    expect(crockford32Decode('1000000000')).toBe(35184372088832);
  });

  test('Crockford-32 encoder throws an error for negative numbers', () => {
    expect(() => crockford32Encode(-1)).toThrow(RangeError);
  });

  test('Crockford-32 decoder throws an error for invalid strings', () => {
    expect(() => crockford32Decode('')).toThrow(Error);
    expect(() => crockford32Decode('l')).toThrow(Error);
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
    const timestamp = id.substring(0, 9);
    expect(timestamp).toBe(crockford32Encode(now));
  });

  test('IDs generated in the same millisecond will increment the random suffix', () => {
    const currentTime = new Date('2024-01-01T00:00:00.0');
    const numIds = 5;
    const idArray: string[] = [];
    for (let i = 0; i < numIds; i++) {
      idArray[i] = generateId(currentTime.valueOf());
    }
    // All of the timestamp parts of the IDs should be the same
    const timestampSet = new Set(idArray.map((s: string) => s.slice(0, -RAND_SUFFIX_LENGTH)));
    const randCharList = idArray.map((s: string) => s.slice(-RAND_SUFFIX_LENGTH));
    expect(new Set([idArray[0].slice(0, -RAND_SUFFIX_LENGTH)])).toEqual(timestampSet);
    // All of the IDs should be unique
    expect(new Set(idArray).size).toBe(numIds);
    // The random characters should increment
    for (let i = 1; i < randCharList.length; i++) {
      expect(crockford32Decode(randCharList[i]) - 1).toBe(crockford32Decode(randCharList[i - 1]));
    }
  });

  test('Generating too many IDs in the same millisecond will cause an overflow', () => {
    // Once we have gone through all the possibilities for the random suffix,
    // we should see an overflow.
    const generateAllSuffixes = () => {
      const currentTime = new Date();
      const idArray: string[] = [];
      const length = Math.pow(BASE, RAND_SUFFIX_LENGTH) - 1;
      for (let i = 0; i < length; i++) {
        idArray[i] = generateId(currentTime.valueOf());
      }
    };
    expect(generateAllSuffixes).toThrow(IdGenerationOverflowError);
  });

  test('An incremented random suffix that starts with zero will generate a correct ID. Fixes #90.', () => {
    // The `now` value below is equivalent to a timestamp prefix of '1hk1p9749'
    const now = 1704085200009;
    _setLastNowId('1hk1p9749');
    // Set the last random characters to start with 0 to trigger a potential increment padding bug
    _setLastRandChars('0ar');
    const newId = generateId(now);
    // A buggy padding increment will be missing the leading zero in '0as'
    expect(newId).toBe('1hk1p97490as');
  });
});
