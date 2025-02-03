import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { getStringHash } from './hash';

const commonTypeProps = {
  name: { type: 'string' },
  hash: { type: 'string' },
  schema: { type: 'string' },
  singular: { type: 'string' },
  plural: { type: 'string' }
} as const;

export const TypeDbCreateSchema = {
  type: 'object',
  properties: commonTypeProps,
  required: ['name', 'hash', 'schema', 'singular', 'plural'],
  additionalProperties: false
} as const satisfies JSONSchema;

export const TypeDbUpdateSchema = {
  type: 'object',
  properties: commonTypeProps,
  additionalProperties: false
} as const satisfies JSONSchema;

export const TypeSchema = {
  type: 'object',
  properties: {
    ...commonTypeProps,
    created_date: { type: 'string' },
    updated_date: { type: 'string' }
  },
  required: ['name', 'hash', 'schema', 'singular', 'plural', 'created_date', 'updated_date'],
  additionalProperties: false
} as const satisfies JSONSchema;

export const TypeArraySchema = {
  type: 'array',
  items: TypeSchema
} as const satisfies JSONSchema;

export type TypeDbCreate = FromSchema<typeof TypeDbCreateSchema>;
export type TypeDbUpdate = FromSchema<typeof TypeDbUpdateSchema>;
export type Type = FromSchema<typeof TypeSchema>;

const sortObj = (unsortedObj: unknown): unknown => {
  if (Array.isArray(unsortedObj)) {
    const newArr: unknown[] = unsortedObj.sort();
    for (let i = 0; i < newArr.length; i++) {
      newArr[i] = sortObj(newArr[i]);
    }
    return newArr;
  }
  if (typeof unsortedObj != 'object' || unsortedObj === null || unsortedObj === undefined) {
    return unsortedObj;
  }
  return Object.keys(unsortedObj)
    .sort()
    .reduce((obj, key) => {
      obj[key] = sortObj(unsortedObj[key]);
      return obj;
    }, {});
};

export const getTypeSchema = (schemaObj: Record<string, unknown>) => {
  return JSON.stringify(sortObj(schemaObj));
};

export const getTypeHash = async (schemaObj: Record<string, unknown>): Promise<string> => {
  return getStringHash(getTypeSchema(schemaObj));
};
