<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## Workflow pemilik repo (preferensi eksplisit)

- Setiap kali satu fase/tahap pekerjaan selesai → langsung `git commit` lalu `git push` ke `origin/main`.
- Sertakan blok auto-generated AGENTS.md dalam commit agar tree tetap bersih.
- Verifikasi wajib sebelum commit: `npx tsc --noEmit`, `npm run lint`, `npm test`, dan (bila pekerjaan menyentuh build) `npm run build`.

## Guardrail kerja paralel (pemilik & agen memakai tree yang sama)

Pemilik sering mengedit/commit di direktori ini secara paralel, dan `next dev`
pemilik lama-berjalan di sini. Aturan wajib saat bekerja di tree ini:

- **Staging eksplisit.** `git add` dengan path yang jelas, tidak pernah `git add -A`, `git add -u`/`-a`. Sebelum commit, wajib: `git status --porcelain` + `git diff --cached --name-only` — hanya file yang kamu ubah boleh masuk. JANGAN menyentuh file WIP milik pemilik; jika lint/tsc gagal di file yang BUKAN bagian pekerjaanmu, laporkan saja — jangan perbaiki/commit.
- **Larangan berbahaya di tree bersama:** `git stash`, `git clean`, `git checkout -- .`, `git reset --hard`, `next start`/`next build` — perintah-perintah ini dapat mengrenamasi/menghapus WIP pemilik atau merusak `.next` yang dipakai dev server.
- **Lint terkotori WIP:** bila full-tree lint banyak error karena file WIP pemilik, jalankan ESLint hanya pada file yang kamu ubah (`npx eslint <path>`); error di file WIP hanya dilaporkan.
- `next dev` aktif = `.next` milik dev; `next build`/`next start` di direktori ini akan saling membanting `.next` (build lokal gagal semu). Verifikasi build: lewat CI atau tunggu dev berhenti; smoke lokal cukup via `next dev` atau produksi.
- **Sebelum push:** `git fetch` lalu `git log --oneline @{u}..HEAD` — commit milik pemilik yang sudah ada di local main BOLEH ikut terpush, tetapi WAJIB dilaporkan di ringkasan.
- **CI = sumber kebenaran.** Release production adalah Vercel auto-deploy (tidak menunggu CI). Setelah push, cek run GitHub Actions (`/actions/runs?head_sha=`) sampai hijau; jangan klaim selesai kalau CI merah.
- Pre-commit `.githooks/` memblokir rahasia + lint file staged; escape: `SKIP_SECRET_SCAN=1` / `SKIP_LINT_GUARD=1`.

## SQL manual: runner migrasi + `sql/pg-trgm.sql`

Repo ini **tidak punya migration otomatis saat deploy** — rilis SQL sengaja dipisah dari rilis kode. Kode aplikasi dan isi DB bisa tidak sinkron; pada 24 Okt itu mematikan seluruh pencarian DB di produksi dua kali (detail: komentar header `sql/pg-trgm.sql`).

**Sejak Okt 2026 ada runner manual** yang mencatat riwayat, supaya "kode sudah deploy tapi SQL belum jalan" terlihat:

```bash
npm run db:migrate:status   # daftar berkas + applied/pending (dari schema_migrations)
npm run db:migrate:dry      # tampilkan SQL yang AKAN dijalankan
npm run db:migrate          # terapkan yang pending, satu transaksi per berkas
```

- Berkas di `supabase/migrations/`, bernomor urut, **idempoten**.
- Env: `DATABASE_URL`. Tidak auto-apply; CI hanya melapor (`|| true`).
- Berkas yang sudah diterapkan **tidak boleh diubah** (runner menolak via checksum) — buat berkas baru bernomor lanjut.
- `/admin/sql` menampilkan status: label **runner** = dari ledger, **probe** = disimpulkan dari efek di DB (untuk SQL lama yang dijalankan manual sebelum runner ada).

**Urutan wajib untuk rangkaian RBAC:** `0001` (backfill `system_role`) → `0002` (pengetatan `has_permission`) → `0003` (RLS konten). `0003` punya preflight yang membatalkan seluruh transaksi bila ada akun panel aktif yang belum punya izin tulis — itu pengaman, bukan error.

**Aturan `sql/pg-trgm.sql`:** setiap kali berkas itu berubah, rilisnya proses 3 langkah — jangan klaim selesai sebelum ketiganya beres.

1. `git push` (kode) → tunggu deploy Vercel.
2. Jalankan **seluruh isi** `sql/pg-trgm.sql` di **Supabase → SQL Editor → Run** (idempoten: `create extension/index if not exists`, `create or replace function`).
3. Verifikasi berurutan (gagal di salah satu = rollback pemahaman, bukan lanjut):

```bash
U="https://<project>.supabase.co/rest/v1/rpc"; H="apikey: $SUPABASE_ANON_KEY"
curl -sS -X POST "$U/search_trgm_enabled" -H "$H" -H "Content-Type: application/json" -d '{}'
curl -sS -X POST "$U/search_news_ids" -H "$H" -H "Content-Type: application/json" -d '{"tokens":["spmb"]}'
curl -sS -X POST "$U/search_news_ids" -H "$H" -H "Content-Type: application/json" -d '{"tokens":["tapak"]}'
# lalu di produksi:
for q in spmb "tapak suci" ustadzhtub galeri; do curl -sS ".../api/search?q=$(printf %s "$q" | jq -sRr @uri)"; done
```

Ekspektasi kanonik (v3, ambang `word_similarity` 0,50): `search_trgm_enabled`→`true`, `news['spmb']`→non-kosong, `news['tapak']`→**kosong** (noise sub-kata tertolak), `tapak suci`→1 (hanya Ekstrakurikuler), typo `ustadzhtub`→≥1.

**Jebakan yang sudah pernah menggigit:**

- `similarity(kolom, token)` = kemiripan **seluruh-string** → selalu < 0,25 untuk judul panjang → kandidat kosong → **0 hasil total**. Jangan kembali ke bentuk ini.
- `word_similarity` argumennya **dibalik**: needle dulu, haystack kemudian — `word_similarity(t, kolom)`.
- Ambang 0,25 terlalu longgar (potongan kata lolos: `tapak` vs "Pendaftar"). Ambang aman 0,50; turunkan ke 0,40 hanya bila ada keluhan typo 2+ huruf pada kata pendek, dan **uji ulang presisi** sebelum rilis.
- Klien **wajib** tetap punya fallback: kandidat trgm kosong/gagal → `.or()` ilike. Jangan pernah early-return "0 hasil" hanya karena RPC mengembalikan array kosong — itulah yang membuat DB-side bug berubah jadi outage pencarian.
