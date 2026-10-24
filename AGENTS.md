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
