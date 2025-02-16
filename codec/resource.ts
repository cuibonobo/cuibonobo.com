import { z } from 'zod';
import { AttachmentSchema } from './attachment';

export const ResourceSchema = z.object({
  id: z.string(),
  type: z.string(),
  create_date: z.date(),
  updated_date: z.date(),
  is_public: z.boolean(),
  attachments: z.array(AttachmentSchema),
  content: z.object({}).partial()
});

export type Resource = z.infer<typeof ResourceSchema>;
