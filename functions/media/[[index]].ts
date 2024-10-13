import { BucketFile } from '@codec/bucket.js';
import { isAuthConfigured, isValidAuth } from '../auth.js';
import { getNormalizedPath, getDigest, getHash, getMethodNotAllowedResponse } from '../util.js';
import type { Context } from '../util.js';

interface Env {
  MEDIA_BUCKET: R2Bucket;
  API_TOKEN: string;
}

const BASE_PATH = '/media';
const RESTRICTED_METHODS = ['POST', 'DELETE'];
const CACHE_DAYS = 365;

const rejectInvalidConfig = (context: Context<Env>): Response | null => {
  if (!isAuthConfigured(context)) {
    return new Response('API token not set!', { status: 500 });
  }
  if (RESTRICTED_METHODS.indexOf(context.request.method) > -1 && !isValidAuth(context)) {
    return new Response('Forbidden', { status: 400 });
  }
  return null;
};

const rejectInvalidMethod = (context: Context<Env>, url: URL, key: string): Response | null => {
  // Redirect to origin if no key is given for GET
  if (!key && context.request.method == 'GET') {
    return Response.redirect(url.origin, 302);
  }
  // Reject updates at a particular key
  if (key && context.request.method == 'POST') {
    return getMethodNotAllowedResponse('GET, DELETE');
  }
  // Reject deletes if no key is given
  if (!key && context.request.method == 'DELETE') {
    return getMethodNotAllowedResponse('POST');
  }
  return null;
};

const getBucketResponse = (url: URL, object: R2ObjectBody): Response => {
  const cacheDate = new Date();
  cacheDate.setDate(cacheDate.getDate() + CACHE_DAYS);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Expires', cacheDate.toUTCString());
  headers.set('etag', object.httpEtag);

  // Allow files to be downloaded with arbitrary filenames
  if (url.searchParams.has('filename')) {
    headers.set('content-disposition', `filename="${url.searchParams.get('filename')}"`);
  }

  return new Response(object.body, { headers });
};

const uploadBucketFile = async (context: Context<Env>, file: File): Promise<BucketFile> => {
  const digest = await getDigest(file);
  const hash = getHash(digest);
  const metadata: BucketFile = {
    name: file.name,
    size: file.size,
    mime: file.type,
    mtime: new Date(),
    hash
  };
  await context.env.MEDIA_BUCKET.put(hash, file, {
    httpMetadata: {
      contentType: metadata.mime,
      cacheControl: 'public',
      contentDisposition: `filename="${metadata.name}"`
    },
    sha256: digest,
    customMetadata: JSON.parse(JSON.stringify(metadata)) as Record<string, string>
  });
  return metadata;
};

// Routes
export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const key = getNormalizedPath(url.pathname, BASE_PATH);

  const invalidConfigRejected = rejectInvalidConfig(context);
  if (invalidConfigRejected) {
    return invalidConfigRejected;
  }

  const invalidMethodRejected = rejectInvalidMethod(context, url, key);
  if (invalidMethodRejected) {
    return invalidMethodRejected;
  }

  switch (context.request.method) {
    case 'GET': {
      const object = await context.env.MEDIA_BUCKET.get(key);
      if (object === null) {
        return new Response('Object Not Found', { status: 404 });
      }

      return getBucketResponse(url, object);
    }
    case 'POST': {
      const contentType = context.request.headers.get('content-type');
      if (!contentType || contentType.indexOf('multipart/form-data') < 0) {
        return new Response('Content must be multipart form data!', { status: 422 });
      }
      const formData = await context.request.formData();
      if (!formData.has('files')) {
        return new Response("No 'files' property in form data!", { status: 422 });
      }
      const files = formData.getAll('files') as unknown[] as File[];
      const bucketFiles: BucketFile[] = [];
      for (const file of files) {
        const bucketFile = await uploadBucketFile(context, file);
        bucketFiles.push(bucketFile);
      }
      return Response.json(bucketFiles);
    }
    case 'DELETE': {
      await context.env.MEDIA_BUCKET.delete(key);
      return new Response('Deleted!');
    }
    default: {
      return getMethodNotAllowedResponse('GET, POST, DELETE');
    }
  }
};
