import { InstanceOf, Number, String, Record, Static } from 'runtypes';

export const BucketFileCodec = Record({
  name: String,
  size: Number,
  mtime: InstanceOf(Date),
  mime: String,
  hash: String
});
export type BucketFile = Static<typeof BucketFileCodec>;
