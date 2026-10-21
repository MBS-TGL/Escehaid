"use server";

/**
 * Server action untuk Media Library (panel /admin/media).
 *
 * Pemindaian referensi file berjalan DI SERVER: sebelumnya
 * `collectMediaReferences` dieksekusi dari browser — menarik tabel
 * `select("*")` penuh ke client dan membuat panel bergantung pada
 * supabase-js untuk hal admin berat ini.
 */

import { requirePermission } from "@/lib/rbac/server";
import { collectMediaReferences } from "@/lib/queries/media";

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

  const scan = await collectMediaReferences();
  return {
    complete: scan.complete,
    failedTables: scan.failedTables,
    refs: Array.from(scan.refs),
  };
}
