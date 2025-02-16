import { z } from 'zod';
import { getStringHash } from './hash';

export const TypeSchema = z.object({
  name: z.string(),
  hash: z.string(),
  schema: z.string(),
  singular: z.string(),
  plural: z.string(),
  created_date: z.date(),
  updated_date: z.date()
});

export type Type = z.infer<typeof TypeSchema>;

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
