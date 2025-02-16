import { isSchema, isValidSchema } from 'jtd';
import {
  ITypes,
  TypeDbCreate,
  TypeDbUpdate,
  TypeDbCreateSchema,
  TypeDbUpdateSchema
} from '../models/types.js';
import { getStringHash } from '@codec/hash.js';

export const validateUntrustedSchema = async (schemaText: string, hash: string): Promise<void> => {
  const computedHash = await getStringHash(schemaText);
  if (hash != computedHash) {
    throw new Error('Given hash does not match computed hash of schema!');
  }
  const schema: unknown = JSON.parse(schemaText);
  if (!isSchema(schema) || !isValidSchema(schema)) {
    throw new Error('Given schema is not valid JTD!');
  }
};

export const validateTypeUpdate = async (data: TypeDbUpdate): Promise<void> => {
  if (Object.hasOwn(data, 'hash') && Object.hasOwn(data, 'schema')) {
    await validateUntrustedSchema(data.schema, data.hash);
  } else if (Object.hasOwn(data, 'hash') || Object.hasOwn(data, 'schema')) {
    throw new Error('Schema and hash must be updated at the same time!');
  }
};

export const getTypes = async (types: ITypes): Promise<Response> => {
  return Response.json(await types.getAll());
};

export const getTypeByName = async (types: ITypes, typeName: string): Promise<Response> => {
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

export const postType = async (types: ITypes, data: string): Promise<Response> => {
  const type = TypeDbCreateSchema.parse(data);
  await validateUntrustedSchema(type.schema, type.hash);
  try {
    return Response.json(await types.createOne(type));
  } catch (e: unknown) {
    return handleDbError(e as Error, type);
  }
};

export const postTypeByName = async (
  types: ITypes,
  typeName: string,
  data: string
): Promise<Response> => {
  const type = TypeDbUpdateSchema.parse(data);
  await validateTypeUpdate(type);
  try {
    return Response.json(await types.updateOne(typeName, type));
  } catch (e: unknown) {
    return handleDbError(e as Error, type);
  }
};
