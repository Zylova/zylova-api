/**
 * Automated Backup Script
 *
 * Usage:
 *   npm run backup              # full backup (DB + uploads)
 *   npm run backup -- --db-only # DB only
 *   npm run backup -- --uploads-only # uploads only
 *
 * Environment variables:
 *   BACKUP_S3_ENDPOINT   - S3-compatible endpoint (optional, default: s3.amazonaws.com)
 *   BACKUP_S3_REGION     - AWS region (optional, default: ap-southeast-1)
 *   BACKUP_S3_BUCKET     - S3 bucket name (required for S3 upload)
 *   BACKUP_S3_ACCESS_KEY - S3 access key (required for S3 upload)
 *   BACKUP_S3_SECRET_KEY - S3 secret key (required for S3 upload)
 *   BACKUP_DIR           - Local backup directory (optional, default: ./backups)
 *   DATABASE_URL         - PostgreSQL connection string
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const args = process.argv.slice(2);
const DB_ONLY = args.includes('--db-only');
const UPLOADS_ONLY = args.includes('--uploads-only');

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function dbBackup(): string {
  const filename = `db-${TIMESTAMP}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);
  console.log(`[backup] Backing up database to ${filepath}...`);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not set');

  // Extract connection details from DATABASE_URL
  const url = new URL(dbUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const database = url.pathname.slice(1).split('?')[0];
  const username = url.username;
  const password = url.password;

  // Use PGPASSWORD env var to pass password securely
  execSync(
    `pg_dump --host=${host} --port=${port} --username=${username} --dbname=${database} --format=plain --no-owner --no-acl > "${filepath}"`,
    {
      env: { ...process.env, PGPASSWORD: password },
      stdio: 'inherit',
    },
  );

  console.log(`[backup] Database backup saved: ${filepath}`);

  // Compress
  execSync(`gzip "${filepath}"`, { stdio: 'inherit' });
  return `${filepath}.gz`;
}

function uploadsBackup(): string {
  const uploadsDir = './uploads';
  const filename = `uploads-${TIMESTAMP}.tar.gz`;
  const filepath = path.join(BACKUP_DIR, filename);
  console.log(`[backup] Backing up uploads to ${filepath}...`);

  if (fs.existsSync(uploadsDir)) {
    execSync(`tar -czf "${filepath}" -C "${path.dirname(uploadsDir)}" "${path.basename(uploadsDir)}"`, {
      stdio: 'inherit',
    });
    console.log(`[backup] Uploads backup saved: ${filepath}`);
  } else {
    console.log('[backup] No uploads directory found, skipping uploads backup');
    return '';
  }

  return filepath;
}

async function uploadToS3(filepath: string, prefix: string) {
  const bucket = process.env.BACKUP_S3_BUCKET;
  if (!bucket) {
    console.log('[backup] BACKUP_S3_BUCKET not set, skipping S3 upload');
    return;
  }

  const endpoint = process.env.BACKUP_S3_ENDPOINT || 'https://s3.amazonaws.com';
  const region = process.env.BACKUP_S3_REGION || 'ap-southeast-1';
  const accessKey = process.env.BACKUP_S3_ACCESS_KEY;
  const secretKey = process.env.BACKUP_S3_SECRET_KEY;

  if (!accessKey || !secretKey) {
    console.log('[backup] BACKUP_S3_ACCESS_KEY or BACKUP_S3_SECRET_KEY not set, skipping S3 upload');
    return;
  }

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ endpoint, region, credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } });

  const key = `backups/${prefix}/${path.basename(filepath)}`;
  const fileContent = fs.readFileSync(filepath);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileContent,
    }),
  );

  console.log(`[backup] Uploaded to S3: s3://${bucket}/${key}`);
}

function cleanup(keepCount = 14) {
  console.log(`[backup] Cleaning up old backups (keeping ${keepCount})...`);
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('db-') || f.startsWith('uploads-'))
    .map((f) => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  for (let i = keepCount; i < files.length; i++) {
    fs.unlinkSync(path.join(BACKUP_DIR, files[i].name));
    console.log(`[backup] Deleted old backup: ${files[i].name}`);
  }
}

async function main() {
  console.log(`[backup] Starting backup at ${new Date().toISOString()}`);
  await ensureDir(BACKUP_DIR);

  const files: string[] = [];

  if (!UPLOADS_ONLY) {
    try {
      files.push(dbBackup());
    } catch (err) {
      console.error('[backup] Database backup failed:', (err as Error).message);
      throw err;
    }
  }

  if (!DB_ONLY) {
    const uploadFile = uploadsBackup();
    if (uploadFile) files.push(uploadFile);
  }

  for (const file of files) {
    await uploadToS3(file, DB_ONLY ? 'db' : UPLOADS_ONLY ? 'uploads' : 'full');
  }

  cleanup(14);
  console.log(`[backup] Backup completed at ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error('[backup] Backup failed:', err);
  process.exit(1);
});
