-- Seed a default project for local development
INSERT INTO projects (id, name, api_key)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Dev Project',
  'proj_dev_key'
)
ON CONFLICT (api_key) DO NOTHING;
