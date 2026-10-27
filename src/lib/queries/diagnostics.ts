import { unstable_cache } from "next/cache";
import { supabase } from "../supabase";
import { tableHasColumn, trgmSearchReady } from "./shared";
import { newsHasScheduledColumns } from "./news";
import { articlesHasScheduledColumns } from "./articles";
import { getBackupManifest } from "./backup";

/**
 * Kolektor diagnostik — data untuk /admin/diagnostics & kartu Dashboard.
 * Semua fungsi read-only; kegagalan tiap aspek DITELAN menjadi hasil merah
 * (halaman tetap terbuka), bukan melempar error.
 */

// ── Tabel inti ──────────────────────────────────────────────────────────────

export interface CoreTableStatus {
  table: string;
  label: string;
  ok: boolean;
  count: number | null;
  error?: string;
}

const CORE_TABLES: { table: string; label: string }[] = [
  { table: "site_settings", label: "Pengaturan situs" },
  { table: "school_profile", label: "Profil sekolah" },
  { table: "news", label: "Berita" },
  { table: "articles", label: "Artikel" },
  { table: "activities", label: "Kegiatan" },
  { table: "achievements", label: "Prestasi" },
  { table: "gallery", label: "Galeri" },
  { table: "downloads", label: "Unduhan" },
  { table: "announcements", label: "Pengumuman" },
  { table: "agenda_events", label: "Agenda" },
  { table: "faqs", label: "FAQ" },
  { table: "ekskuls", label: "Ekstrakurikuler" },
  { table: "teachers", label: "Guru & Tendik" },
  { table: "spmb_registrations", label: "Pendaftar SPMB" },
  { table: "user_profiles", label: "Pengguna admin" },
];

/** Head-count per tabel inti — sekaligus membuktikan tabel ada & RLS jalan. */
export async function checkCoreTables(): Promise<CoreTableStatus[]> {
  return Promise.all(
    CORE_TABLES.map(async ({ table, label }): Promise<CoreTableStatus> => {
      try {
        // select("*") — aman utk semua bentuk tabel (site_settings key/value
        // tidak punya kolom id); head:true → tanpa payload data.
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        if (error) {
          // Tabel/kolom belum dimigrasi → PGRST205 "Could not find the table",
          // 42P01 dsb. Tampilkan pesan ringkas tanpa detail teknis berlebih.
          return { table, label, ok: false, count: null, error: error.message };
        }
        return { table, label, ok: true, count: count ?? 0 };
      } catch (e) {
        return {
          table,
          label,
          ok: false,
          count: null,
          error: e instanceof Error ? e.message : "Gagal mengecek tabel",
        };
      }
    })
  );
}

// ── Probe migrasi kolom/fitur ───────────────────────────────────────────────

export interface ProbeStatus {
  name: string;
  desc: string;
  ok: boolean;
}

/**
 * Kolom media yang wajib berisi URL CDN R2. Dipakai probe "media belum di R2":
 * nilai lokal (`/images/...`) atau sisa URL Supabase berarti objeknya tidak
 * dilayani CDN dan akan 404 di produksi.
 */
const MEDIA_COLUMNS: Array<[table: string, column: string]> = [
  ["teachers", "photo_url"],
  ["facilities", "image_url"],
  ["school_profile", "principal_photo_url"],
  ["news", "image_url"],
  ["news", "attachment_url"],
  ["activities", "image_url"],
  ["articles", "image_url"],
  ["gallery", "url"],
  ["gallery", "thumbnail_url"],
  ["achievements", "image_url"],
  ["ekskuls", "image_url"],
  ["downloads", "file_url"],
];

/** Hitung baris media yang nilainya bukan URL CDN (kosong/NULL diabaikan). */
export async function countMediaOffCdn(): Promise<number> {
  const base = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return 0;
  const counts = await Promise.all(
    MEDIA_COLUMNS.map(async ([table, column]) => {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .not(column, "is", null)
        .neq(column, "")
        .not(column, "like", `${base}%`);
      if (error) throw error;
      return count ?? 0;
    })
  );
  return counts.reduce((n, c) => n + c, 0);
}

/** Probe kolom/tambahan yang dipakai fitur tertentu — false berarti SQL
 *  migrasi belum dijalankan (fitur masih fallback, tidak crash). */
export async function checkFeatureProbes(): Promise<ProbeStatus[]> {
  const [newsSched, artSched, trgm] = await Promise.all([
    newsHasScheduledColumns().catch(() => false),
    articlesHasScheduledColumns().catch(() => false),
    trgmSearchReady().catch(() => false),
  ]);
  const [newsVideo, faqScope, achEkskul] = await Promise.all([
    tableHasColumn("news", "video_url").catch(() => false),
    tableHasColumn("faqs", "scope").catch(() => false),
    tableHasColumn("achievements", "ekskul_id").catch(() => false),
  ]);
  const mediaOffCdn = await countMediaOffCdn().catch(() => -1);
  return [
    { name: "news.scheduled_*", desc: "Jadwal tayang berita (publish_at/unpublish_at)", ok: newsSched },
    { name: "articles.scheduled_*", desc: "Jadwal tayang artikel", ok: artSched },
    { name: "pg_trgm search", desc: "Pencarian toleran typo (sql/pg-trgm.sql)", ok: trgm },
    { name: "news.video_url", desc: "Video embed pada berita", ok: newsVideo },
    { name: "faqs.scope", desc: "FAQ dinamis beranda & SPMB (supabase/faq.sql)", ok: faqScope },
    { name: "achievements.ekskul_id", desc: "Tautan prestasi ↔ ekstrakurikuler", ok: achEkskul },
    {
      name: "media.r2",
      desc:
        mediaOffCdn < 0
          ? "Kolom media memakai URL CDN R2 (gagal diperiksa)"
          : mediaOffCdn === 0
            ? "Semua kolom media memakai URL CDN R2"
            : `${mediaOffCdn} baris media belum memakai URL CDN R2`,
      ok: mediaOffCdn === 0,
    },
  ];
}

// ── Storage R2 (cache 6 jam — jangan hammer ListObjectsV2) ─────────────────

export interface StorageBucketUsage {
  bucket: string;
  role: string;
  objects: number;
  bytes: number;
  error?: string;
}

export interface R2Usage {
  driver: string;
  buckets: StorageBucketUsage[];
  totalBytes: number;
  totalObjects: number;
}

/** Jumlah objek & total ukuran per bucket R2 (publik + privat). */
export const getR2Usage = unstable_cache(
  async (): Promise<R2Usage | null> => {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) return null;
    const driver = process.env.STORAGE_DRIVER === "r2" ? "r2" : "supabase";
    try {
      const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      const targets: { bucket: string; role: string }[] = [
        {
          bucket: process.env.R2_BUCKET || "esceha-cdn",
          role: "publik (CDN)",
        },
        {
          bucket: process.env.R2_PRIVATE_BUCKET || "esceha-private",
          role: "privat (SPMB + backup)",
        },
      ];
      const buckets: StorageBucketUsage[] = [];
      for (const { bucket, role } of targets) {
        let objects = 0;
        let bytes = 0;
        let token: string | undefined;
        try {
          do {
            const res = await s3.send(
              new ListObjectsV2Command({
                Bucket: bucket,
                ContinuationToken: token,
              })
            );
            for (const o of res.Contents ?? []) {
              objects += 1;
              bytes += o.Size ?? 0;
            }
            token = res.IsTruncated ? res.NextContinuationToken : undefined;
          } while (token);
          buckets.push({ bucket, role, objects, bytes });
        } catch (e) {
          buckets.push({
            bucket,
            role,
            objects,
            bytes,
            error: e instanceof Error ? e.message : "Gagal me-list bucket",
          });
        }
      }
      return {
        driver,
        buckets,
        totalBytes: buckets.reduce((a, b) => a + b.bytes, 0),
        totalObjects: buckets.reduce((a, b) => a + b.objects, 0),
      };
    } catch {
      return { driver, buckets: [], totalBytes: 0, totalObjects: 0 };
    }
  },
  ["r2-usage-diagnostics"],
  { revalidate: 6 * 3600 }
);

// ── GitHub CI + deploy sha (cache 5 menit) ──────────────────────────────────

export interface GithubStatus {
  repo: string;
  lastRun: {
    name: string;
    status: string;
    conclusion: string | null;
    url: string;
    createdAt: string;
  } | null;
  headSha: string | null;
  deploySha: string | null;
  error?: string;
}

export const getGithubStatus = unstable_cache(
  async (): Promise<GithubStatus | null> => {
    const repo = process.env.BACKUP_GH_REPO || "MBS-TGL/Escehaid";
    const token = process.env.BACKUP_GH_TOKEN;
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        // PAT (backup:update → Actions:write) menghindari rate-limit IP bersama.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const [runsRes, branchRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`, {
          headers,
          cache: "no-store",
        }),
        fetch(`https://api.github.com/repos/${repo}/commits/main`, {
          headers,
          cache: "no-store",
        }),
      ]);
      if (!runsRes.ok) {
        return { repo, lastRun: null, headSha: null, deploySha: null, error: `GitHub API ${runsRes.status}` };
      }
      const runs = (await runsRes.json()) as {
        workflow_runs: {
          name: string;
          status: string;
          conclusion: string | null;
          html_url: string;
          created_at: string;
        }[];
      };
      const r = runs.workflow_runs?.[0] ?? null;
      let headSha: string | null = null;
      if (branchRes.ok) {
        const branch = (await branchRes.json()) as { sha: string };
        headSha = branch.sha?.slice(0, 7) ?? null;
      }
      const deploySha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;
      return {
        repo,
        lastRun: r
          ? { name: r.name, status: r.status, conclusion: r.conclusion, url: r.html_url, createdAt: r.created_at }
          : null,
        headSha,
        deploySha,
      };
    } catch (e) {
      return { repo, lastRun: null, headSha: null, deploySha: null, error: e instanceof Error ? e.message : "Gagal" };
    }
  },
  ["github-status-diagnostics"],
  { revalidate: 300 }
);

// ── Env vars (nama + status saja, TANPA nilai) ──────────────────────────────

export interface EnvStatus {
  key: string;
  label: string;
  set: boolean;
  optional: boolean;
}

export function getEnvStatus(): EnvStatus[] {
  const defs: { key: string; label: string; optional?: boolean }[] = [
    { key: "SUPABASE_URL", label: "Supabase URL" },
    { key: "SUPABASE_ANON_KEY", label: "Supabase anon key" },
    { key: "STORAGE_DRIVER", label: "Driver storage (r2/supabase)" },
    { key: "R2_ACCOUNT_ID", label: "Cloudflare R2 — account ID" },
    { key: "R2_ACCESS_KEY_ID", label: "Cloudflare R2 — access key" },
    { key: "R2_SECRET_ACCESS_KEY", label: "Cloudflare R2 — secret key" },
    { key: "GEMINI_API_KEY", label: "Gemini (fitur AI admin)", optional: true },
    { key: "BACKUP_GH_TOKEN", label: "GitHub PAT — tombol 'Backup sekarang'", optional: true },
    { key: "BACKUP_GH_REPO", label: "GitHub repo — status CI & backup", optional: true },
  ];
  return defs.map(({ key, label, optional }) => ({
    key,
    label,
    optional: Boolean(optional),
    set: Boolean(process.env[key]),
  }));
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export type OverallTone = "hijau" | "kuning" | "merah";

export interface Diagnostics {
  tables: CoreTableStatus[];
  probes: ProbeStatus[];
  storage: R2Usage | null;
  github: GithubStatus | null;
  envs: EnvStatus[];
  backup: { lastRun: string | null; ageDays: number | null } | null;
  dbLatencyMs: number | null;
  overall: OverallTone;
}

function backupAgeDays(manifest: Awaited<ReturnType<typeof getBackupManifest>>): number | null {
  if (!manifest?.last_run) return null;
  return Math.floor((Date.now() - new Date(manifest.last_run).getTime()) / 86400_000);
}

/** Kumpulkan semua aspek — tiap aspek aman-tergagal (tidak melempar). */
export async function collectDiagnostics(): Promise<Diagnostics> {
  const t0 = Date.now();
  const [tables, probes, storage, github, manifest] = await Promise.all([
    checkCoreTables(),
    checkFeatureProbes(),
    getR2Usage().catch(() => null),
    getGithubStatus().catch(() => null),
    getBackupManifest().catch(() => null),
  ]);

  const { error: latencyError } = await supabase.from("site_settings").select("key").limit(1);
  const dbLatencyMs = latencyError ? null : Date.now() - t0;

  const ageDays = backupAgeDays(manifest);
  const tablesOk = tables.every((t) => t.ok);
  const envMissingRequired = getEnvStatus().some((e) => !e.set && !e.optional);

  // Merah: tabel inti gagal ATAU DB tak terjangkau.
  // Kuning: tabel ok tapi ada probe migrasi yang belum jalan / env wajib
  //         kosong / backup >7 hari / storage bucket bermasalah.
  // Hijau: selainnya.
  let overall: OverallTone = "hijau";
  if (!tablesOk || dbLatencyMs === null) overall = "merah";
  else if (
    probes.some((p) => !p.ok) ||
    envMissingRequired ||
    (ageDays !== null && ageDays > 7) ||
    storage?.buckets.some((b) => b.error)
  ) {
    overall = "kuning";
  }

  return {
    tables,
    probes,
    storage,
    github,
    envs: getEnvStatus(),
    backup: { lastRun: manifest?.last_run ?? null, ageDays },
    dbLatencyMs,
    overall,
  };
}
