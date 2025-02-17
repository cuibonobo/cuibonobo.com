export class LockfileError extends Error {}
export class MissingLockfileError extends LockfileError {
  constructor(message?: string) {
    super(message);
    message = message ? message : 'The .lock file was not found!';
  }
}
export class CorruptedLockfileError extends LockfileError {
  constructor(message?: string) {
    super(message);
    message = message ? message : 'The .lock file could not be read!';
  }
}
export class LockedDataError extends LockfileError {
  constructor(message?: string) {
    super(message);
    message = message ? message : 'Data is locked!';
  }
}
export class ResourceError extends Error {}
export class ResourceTypeError extends ResourceError {}
export class ResourceNotFoundError extends ResourceError {}
