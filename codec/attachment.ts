import { z } from 'zod';
import { parseJsonPreprocessor } from './preprocessors';

const AttachmentShapeSchema = z.object({
  id: z.string(),
  name: z.string(),
  tag: z.string()
});
export const AttachmentSchema = z.preprocess(parseJsonPreprocessor, AttachmentShapeSchema);

export type Attachment = z.infer<typeof AttachmentSchema>;
