import { FromSchema, JSONSchema } from 'json-schema-to-ts';

export const AttachmentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    tag: { type: 'string' }
  },
  required: ['id', 'name', 'tag'],
  additionalProperties: false
} as const satisfies JSONSchema;

export type Attachment = FromSchema<typeof AttachmentSchema>;
