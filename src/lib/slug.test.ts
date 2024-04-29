import { test, expect, describe } from 'vitest';
import { slugger } from './slugger';

describe('Slugger library tests', () => {
  test('Convert titles to slugs', () => {
    expect(slugger('Amazing Incredible Beautiful')).toBe('amazing-incredible-beautiful');
  });
  
  test('Remove stopwords and emoji', () => {
    expect(slugger('I ♥ chickens')).toBe('love-chickens');
    expect(slugger('Chicken poop is ☢')).toBe('chicken-poop');
    expect(slugger('This is the song that never ends')).toBe('song-ends');
  });
  
  test('Trim strings that are too long', () => {
    expect(slugger('Amazing Incredible Beautiful Unique Dazzling Wonderful')).toBe(
      'amazing-incredible-beautiful-unique-dazzling'
    );
  });
});
