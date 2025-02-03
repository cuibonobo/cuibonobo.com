import { Validator, Schema } from '@cfworker/json-schema';
import { Types } from '../models/index.js';
import { getStringHash } from '@codec/hash.js';
import {
  TypeDbCreateSchema,
  TypeDbUpdateSchema,
  type TypeDbCreate,
  type TypeDbUpdate
} from '@codec/type.js';

export const validateType = async (schema: string, hash: string): Promise<void> => {
  const computedHash = await getStringHash(schema);
  if (hash != computedHash) {
    throw new Error('Given hash does not match computed hash of schema!');
  }
  JSON.parse(schema);
  // FIXME: Need to check if the schema itself is valid
};

export const validateTypeUpdate = async (data: TypeDbUpdate): Promise<void> => {
  if (Object.hasOwn(data, 'hash') && Object.hasOwn(data, 'schema')) {
    await validateType(data.schema, data.hash);
  } else if (Object.hasOwn(data, 'hash') || Object.hasOwn(data, 'schema')) {
    throw new Error('Schema and hash must be updated at the same time!');
  }
};

export const getTypes = async (types: Types): Promise<Response> => {
  return Response.json(await types.getAll());
};

export const getTypeByName = async (types: Types, typeName: string): Promise<Response> => {
  const result = await types.getOne(typeName);
  if (result == null) {
    return Response.json({}, { status: 404 });
  }
  return Response.json(result);
};

const handleDbError = (err: Error, data: TypeDbCreate | TypeDbUpdate): Response => {
  if (err.message.indexOf('UNIQUE constraint failed') > -1) {
    if (err.message.indexOf('types.name') > -1) {
      return Response.json(
        { error: `There is already a type with the name '${data.name}'!` },
        { status: 409 }
      );
    }
  }
  return Response.json({ error: err.message }, { status: 409 });
};

export const postType = async (types: Types, text: string): Promise<Response> => {
  const validator = new Validator(TypeDbCreateSchema as unknown as Schema);
  if (!validator.validate(text)) {
    throw new Error('The uploaded type has invalid schema!');
  }
  const data: TypeDbCreate = JSON.parse(text);
  if (!data) {
    throw new Error('Could not parse type data!');
  }
  await validateType(data.schema, data.hash);
  try {
    return Response.json(await types.createOne(data));
  } catch (e: unknown) {
    return handleDbError(e as Error, data);
  }
};

export const postTypeByName = async (
  types: Types,
  typeName: string,
  text: string
): Promise<Response> => {
  const validator = new Validator(TypeDbUpdateSchema);
  if (!validator.validate(text)) {
    throw new Error('The uploaded type has invalid schema!');
  }
  const data: TypeDbUpdate = JSON.parse(text);
  await validateTypeUpdate(data);
  try {
    return Response.json(await types.updateOne(typeName, data));
  } catch (e: unknown) {
    return handleDbError(e as Error, data);
  }
};
