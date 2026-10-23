"use server";

/**
 * Server action untuk Media Library (panel /admin/media).
 *
 * Pemindaian referensi file berjalan DI SERVER: sebelumnya
 * `collectMediaReferences` dieksekusi dari browser — menarik tabel
 * `select("*")` penuh ke client dan membuat panel bergantung pada
 * supabase-js untuk hal admin berat ini.
 *
 * Listing file juga server-side (`listMediaFiles`): walk rekursif folder
 * berjalan di server lewat driver storage (tanpa N round-trip HTTP dari
 * browser) — browser hanya menerima daftar final yang sudah dipaginasi UI.
 */

import { requirePermission } from "@/lib/rbac/server";
import { collectMediaReferences, walkStorageFiles, type MediaBucket, type MediaFile } from "@/lib/queries/media";
import { createClient } from "@/lib/supabase-server";
import { storageFrom, type StorageBucket } from "@/lib/storage";

export interface MediaScanResult {
  complete: boolean;
  failedTables: string[];
  /** Referensi dikembalikan array (amani serialisasi server action; Set dibangun ulang di client). */
  refs: string[];
  error?: string;
}

export async function scanMediaReferences(): Promise<MediaScanResult> {
  const guard = requirePermission("media:read");
  const check = await guard();
  if (!check.ok) {
    return { complete: false, failedTables: [], refs: [], error: check.error };
  }

  const supabase = await createClient();
  const scan = await collectMediaReferences(supabase as unknown as Parameters<typeof collectMediaReferences>[0]);
  return {
    complete: scan.complete,
    failedTables: scan.failedTables,
    refs: Array.from(scan.refs),
  };
}

export interface MediaListResult {
  files: MediaFile[] | null;
  error?: string;
}

const LIST_BUCKETS = new Set<MediaBucket>(["images", "documents", "spmb-documents"]);

/**
 * Daftar semua file sebuah bucket — walk rekursif DI SERVER (pola route
 * GET /api/admin/storage: izin per bucket; list limit 1000/folder).
 * Args server action bisa dipanggil bebas dari client → validasi bucket
 * eksplisit (tipe MediaUnion tidak menjamin runtime).
 */
export async function listMediaFiles(bucket: MediaBucket): Promise<MediaListResult> {
  if (!LIST_BUCKETS.has(bucket)) {
    return { files: null, error: "Bucket tidak valid." };
  }
  const perm = bucket === "spmb-documents" ? "spmb:read" : "media:read";
  const guard = requirePermission(perm);
  const check = await guard();
  if (!check.ok) {
    return { files: null, error: check.error };
  }

  const supabase = await createClient();
  try {
    const files = await walkStorageFiles(bucket, async (prefix) => {
      const { data, error } = await storageFrom(bucket as StorageBucket, supabase).list(prefix, {
        limit: 1000,
      });
      return { data, error };
    });
    return { files };
  } catch (e) {
    return { files: null, error: e instanceof Error ? e.message : "Gagal memuat daftar file" };
  }
}
