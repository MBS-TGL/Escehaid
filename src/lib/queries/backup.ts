/**
 * Status backup — membaca `backups/manifest.json` dari bucket R2 privat
 * (ditulis scripts/backup-scheduled.mjs via GitHub Actions "Backup").
 * Server-only: kredensial R2 tidak pernah bocor ke klien.
 */

export interface BackupEntry {
  key: string;
  date: string;
  bytes: number;
}

export interface BackupManifest {
  last_run: string;
  bucket: string;
  backups: BackupEntry[];
}

const MANIFEST_KEY = "backups/manifest.json";

/** Baca manifest backup dari R2; null bila belum pernah ada backup /
 *  env R2 belum lengkap / error jaringan (halaman admin tetap terbuka). */
export async function getBackupManifest(): Promise<BackupManifest | null> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  try {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    const bucket = process.env.R2_PRIVATE_BUCKET || process.env.R2_BUCKET || "esceha-private";
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: MANIFEST_KEY }));
    if (!res.Body) return null;
    const manifest = JSON.parse(await res.Body.transformToString("utf8")) as BackupManifest;
    if (!Array.isArray(manifest.backups)) return null;
    return manifest;
  } catch (e) {
    console.error("Error membaca manifest backup:", e);
    return null;
  }
}
