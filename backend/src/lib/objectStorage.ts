import { Client } from 'minio';
import zlib from 'zlib';
import { config, minioEnabled } from '../config';

let client: Client | null = null;
let bucketReady = false;

function getClient(): Client {
  if (!client) {
    client = new Client({
      endPoint:  config.minio.endpoint,
      port:      config.minio.port,
      useSSL:    config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
  }
  return client;
}

/** Create the bucket on first use. Retries because MinIO may still be starting. */
async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const c = getClient();
  const bucket = config.minio.bucket;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const exists = await c.bucketExists(bucket);
      if (!exists) await c.makeBucket(bucket);
      bucketReady = true;
      return;
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

/** Gzip `data` and store it at `objectKey`. */
export async function putGzipped(objectKey: string, data: string | Buffer): Promise<number> {
  await ensureBucket();
  const gz = zlib.gzipSync(typeof data === 'string' ? Buffer.from(data, 'utf8') : data);
  await getClient().putObject(config.minio.bucket, objectKey, gz, gz.length, {
    'Content-Type': 'application/gzip',
  });
  return gz.length;
}

/** Fetch `objectKey` and return the gunzipped bytes. */
export async function getGunzipped(objectKey: string): Promise<Buffer> {
  await ensureBucket();
  const stream = await getClient().getObject(config.minio.bucket, objectKey);
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.on('end', () => {
      try { resolve(zlib.gunzipSync(Buffer.concat(chunks))); }
      catch (e) { reject(e); }
    });
    stream.on('error', reject);
  });
}

export { minioEnabled };
