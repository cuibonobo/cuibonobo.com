import { z } from 'zod';

export const BucketFileSchema = z.object({
  name: z.string(),
  size: z.number(),
  mtime: z.date(),
  mime: z.string(),
  hash: z.string()
});

export type BucketFile = z.infer<typeof BucketFileSchema>;
