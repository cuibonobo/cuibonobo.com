import { z } from 'zod';
import { parseJsonPreprocessor } from './preprocessors';

const BucketFileShapeSchema = z.object({
  name: z.string(),
  size: z.number(),
  mtime: z.date(),
  mime: z.string(),
  hash: z.string()
});
export const BucketFileSchema = z.preprocess(parseJsonPreprocessor, BucketFileShapeSchema);

export type BucketFile = z.infer<typeof BucketFileSchema>;
