import fs from 'fs';
import path from 'path';
import { db } from './client';

const migrationsDir = path.join(__dirname, 'migrations');

async function migrate() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration: ${file}`);
    await db.query(sql);
    console.log(`  ✓ ${file}`);
  }

  await db.end();
  console.log('Migrations complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
