export class LockfileError extends Error {}
export class MissingLockfileError extends LockfileError {
  message: 'The .lock file was not found!';
}
export class CorruptedLockfileError extends LockfileError {
  message: 'The .lock file could not be read!';
}
export class LockedDataError extends LockfileError {
  message: 'Data is locked!';
}
export class PostError extends Error {}
export class PostTypeError extends PostError {}
export class PostNotFoundError extends PostError {}
