import { JTDSchemaType } from 'ajv/dist/jtd';
import { Attachment, AttachmentSchema } from './attachment';

export interface Resource {
  id: string;
  type: string;
  created_date: Date;
  updated_date: Date;
  is_public: boolean;
  attachments: Attachment[];
  content: Record<string, unknown>;
}

interface ResourceDbRequired {
  id: string;
  type: string;
}

interface ResourceDbOptional {
  created_date: string;
  updated_date: string;
  is_public: boolean;
  attachments: string;
  content: string;
}

export type ResourceDbResult = ResourceDbRequired & ResourceDbOptional;
export type ResourceDbInput = ResourceDbRequired & Partial<ResourceDbOptional>;

export const ResourceSchema: JTDSchemaType<Resource> = {
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    created_date: { type: 'timestamp' },
    updated_date: { type: 'timestamp' },
    is_public: { type: 'boolean' },
    attachments: { elements: AttachmentSchema },
    content: {
      values: {}
    }
  }
} as const;

const ResourceDbRequiredSchema = {
  id: { type: 'string' },
  type: { type: 'string' }
} as const;

const ResourceDbOptionalSchema = {
  created_date: { type: 'string' },
  updated_date: { type: 'string' },
  is_public: { type: 'boolean' },
  attachments: { type: 'string' },
  content: { type: 'string' }
} as const;

export const ResourceDbInputSchema: JTDSchemaType<ResourceDbInput> = {
  properties: ResourceDbRequiredSchema,
  optionalProperties: ResourceDbOptionalSchema
} as const;

export const ResourceDbResultSchema: JTDSchemaType<ResourceDbResult> = {
  properties: { ...ResourceDbRequiredSchema, ...ResourceDbOptionalSchema }
} as const;
