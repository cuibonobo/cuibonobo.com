import { JTDSchemaType } from 'ajv/dist/jtd';

export interface BucketFile {
  name: string;
  size: number;
  mtime: Date;
  mime: string;
  hash: string;
}

export const BucketFileSchema: JTDSchemaType<BucketFile> = {
  properties: {
    name: { type: 'string' },
    size: { type: 'uint32' },
    mtime: { type: 'timestamp' },
    mime: { type: 'string' },
    hash: { type: 'string' }
  }
} as const;
