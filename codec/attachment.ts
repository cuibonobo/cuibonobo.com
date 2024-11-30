import { JTDSchemaType } from 'ajv/dist/jtd';

export interface Attachment {
  id: string;
  name: string;
  tag: string;
}

export const AttachmentSchema: JTDSchemaType<Attachment> = {
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    tag: { type: 'string' }
  }
} as const;
