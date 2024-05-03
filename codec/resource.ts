import { String, Record, Static } from 'runtypes';

export const AttachmentCodec = Record({
  id: String,
  name: String,
  tag: String
});
export type Attachment = Static<typeof AttachmentCodec>;
