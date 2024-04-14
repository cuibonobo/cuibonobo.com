import { BucketFile } from './models.js';
import { isAuthConfigured, isValidAuth } from '../auth.js';
import { getNormalizedPath, getDigest, getHash } from '../util.js';

interface Env {
  MEDIA_BUCKET: R2Bucket;
  API_TOKEN: string;
}

const BASE_PATH = '/media';
const RESTRICTED_METHODS = ['POST', 'DELETE'];
const CACHE_DAYS = 365;

// Routes
export const onRequest: PagesFunction<Env> = async (context) => {
  if (!isAuthConfigured(context)) {
    return new Response('API token not set!', { status: 500 });
  }
  if (context.request.method in RESTRICTED_METHODS && !isValidAuth(context)) {
    return new Response('Forbidden', { status: 400 });
  }
  const url = new URL(context.request.url);
  const key = getNormalizedPath(url.pathname, BASE_PATH);

  // Redirect to origin if no key is given for GET
  if (!key && context.request.method == 'GET') {
    return Response.redirect(url.origin, 302);
  }
  // Reject updates at a particular key
  if (key && context.request.method == 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'GET, DELETE'
      }
    });
  }
  // Reject deletes if no key is given
  if (!key && context.request.method == 'DELETE') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'POST'
      }
    });
  }

  switch (context.request.method) {
    case 'GET': {
      const object = await context.env.MEDIA_BUCKET.get(key);
      if (object === null) {
        return new Response('Object Not Found', { status: 404 });
      }

      const cacheDate = new Date();
      cacheDate.setDate(cacheDate.getDate() + CACHE_DAYS);
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Expires', cacheDate.toUTCString());
      headers.set('etag', object.httpEtag);

      return new Response(object.body, { headers });
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
        bucketFiles.push(metadata);
      }
      return new Response(JSON.stringify(bucketFiles), {
        headers: { 'content-type': 'application/json' }
      });
    }
    case 'DELETE': {
      await context.env.MEDIA_BUCKET.delete(key);
      return new Response('Deleted!');
    }
    default: {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          Allow: 'POST, GET, DELETE'
        }
      });
    }
  }
};
