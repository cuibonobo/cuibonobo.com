import { z } from 'zod';
import { parseJsonPreprocessor } from './preprocessors';
import { AttachmentSchema } from './attachment';

const AttachmentArrayShapeSchema = z.array(AttachmentSchema);
const AttachmentArraySchema = z.preprocess(parseJsonPreprocessor, AttachmentArrayShapeSchema);
const ContentShapeSchema = z.object({}).partial();
const ContentSchema = z.preprocess(parseJsonPreprocessor, ContentShapeSchema);

const ResourceShapeSchema = z.object({
  id: z.string(),
  type: z.string(),
  create_date: z.date(),
  updated_date: z.date(),
  is_public: z.boolean(),
  attachments: AttachmentArraySchema,
  content: ContentSchema
});
export const ResourceSchema = z.preprocess(parseJsonPreprocessor, ResourceShapeSchema);

export type Resource = z.infer<typeof ResourceSchema>;
