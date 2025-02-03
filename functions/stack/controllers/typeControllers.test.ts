import { test, expect, describe } from 'vitest';
import { getStringHash } from '../../../codec/hash.js';
import { validateType, validateTypeUpdate } from './typeControllers.js';
import { getTypeHash } from '@codec/type.js';

describe('Type codec tests', () => {
  test('Invalid JSON throws', async () => {
    const schema = '{foo: "bar"}';
    const hash = await getStringHash(schema);
    await expect(() => validateType(schema, hash)).rejects.toThrow(
      'Unexpected token f in JSON at position 1'
    );
  });

  // test('Invalid JTD schema throws', async () => {
  //   const schema = '{"foo":"bar"}';
  //   const hash = await getStringHash(schema);
  //   await expect(() => validateType(schema, hash)).rejects.toThrow('Given schema is not valid JTD!');
  // });

  test('Valid JTD schema with correct hash will not throw', async () => {
    const schemaObj = { properties: { name: { type: 'string' } } };
    const schema = JSON.stringify(schemaObj);
    const hash = await getStringHash(schema);
    expect(await validateType(schema, hash));
  });

  test('A given schema generates the same hash regardless of property ordering', async () => {
    const schemaA = { properties: { name: { type: 'string' }, body: [1, 2, 3, 4] } };
    const schemaB = { properties: { body: [4, 3, 2, 1], name: { type: 'string' } } };
    const hashA = await getTypeHash(schemaA);
    const hashB = await getTypeHash(schemaB);
    expect(hashA).toEqual(hashB);
  });

  test('Hash that does not match will throw', async () => {
    const schema = '{"foo":"bar"}';
    await expect(() => validateTypeUpdate({ hash: 'foo', schema })).rejects.toThrow(
      'Given hash does not match computed hash of schema!'
    );
  });

  test('Hash without a schema will throw and schema without hash will throw', async () => {
    const err = 'Schema and hash must be updated at the same time!';
    await expect(() => validateTypeUpdate({ hash: 'foo' })).rejects.toThrow(err);
    await expect(() => validateTypeUpdate({ schema: '{"foo":"bar"}' })).rejects.toThrow(err);
  });
});
