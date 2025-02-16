import { z } from 'zod';

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  tag: z.string()
});

export type Attachment = z.infer<typeof AttachmentSchema>;
