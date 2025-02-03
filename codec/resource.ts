import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { AttachmentSchema } from './attachment';

export const ResourceSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    created_date: { type: 'string' },
    updated_date: { type: 'string' },
    is_public: { type: 'boolean' },
    attachments: { type: 'array', items: AttachmentSchema },
    content: {
      type: 'object',
      additionalProperties: true
    }
  },
  required: ['id', 'type', 'created_date', 'updated_date', 'is_public', 'attachments', 'content'],
  additionalProperties: false
} as const satisfies JSONSchema;

const commonResourceDbRequiredProps = {
  id: { type: 'string' },
  type: { type: 'string' },
  created_date: { type: 'string' },
  updated_date: { type: 'string' },
  is_public: { type: 'boolean' },
  attachments: { type: 'string' },
  content: { type: 'string' }
} as const;

export const ResourceDbInputSchema = {
  type: 'object',
  properties: commonResourceDbRequiredProps,
  required: ['id', 'type'],
  additionalProperties: false
} as const satisfies JSONSchema;

export const ResourceDbResultSchema = {
  type: 'object',
  properties: commonResourceDbRequiredProps,
  required: ['id', 'type', 'created_date', 'updated_date', 'is_public', 'attachments', 'content'],
  additionalProperties: false
} as const satisfies JSONSchema;

export type ResourceDbInput = FromSchema<typeof ResourceDbInputSchema>;
export type ResourceDbResult = FromSchema<typeof ResourceDbResultSchema>;
export type Resource = FromSchema<typeof ResourceSchema>;
