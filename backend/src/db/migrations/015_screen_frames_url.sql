-- Move mobile screenshots out of Postgres into object storage (Cloudinary).
-- We now store a CDN URL instead of the base64 image bytes, so rows shrink from
-- tens of KB to ~100 bytes. `data` becomes optional (still used as a fallback
-- when Cloudinary isn't configured); `url` holds the uploaded image URL.
ALTER TABLE screen_frames ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE screen_frames ALTER COLUMN data DROP NOT NULL;
