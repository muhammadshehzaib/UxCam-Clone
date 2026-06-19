import { v2 as cloudinary } from 'cloudinary';
import { config, cloudinaryEnabled } from '../config';

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key:    config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure:     true,
  });
}

export { cloudinaryEnabled };

/**
 * Upload one mobile screenshot frame to Cloudinary and return its CDN URL.
 *
 * `data` is a base64 string (no data-URI prefix) or a full `data:` URI, exactly
 * as the mobile SDKs send it. Frames for a session are grouped in one folder so
 * they're easy to find / purge together. Throws on failure — the caller decides
 * whether to fall back to storing the base64 in Postgres.
 */
export async function uploadScreenshot(
  data:      string,
  sessionId: string,
  elapsedMs: number
): Promise<string> {
  const fileUri = data.startsWith('data:') ? data : `data:image/jpeg;base64,${data}`;
  const result = await cloudinary.uploader.upload(fileUri, {
    folder:        `uxclone/screens/${sessionId}`,
    public_id:     String(elapsedMs),
    resource_type: 'image',
    format:        'jpg',
    overwrite:     true,
  });
  return result.secure_url;
}
