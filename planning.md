# SMP Muhammadiyah 4 Tanggul - SIS (School Information System)

## Overview

Website informasi sekolah untuk menggantikan WordPress lama. Fitur utama: PPDB online, berita/pengumuman, gallery, profil sekolah.

**Domain:** smpmuh4tanggul.sch.id (belum dibeli, domain lama expired September 2026)

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **Backend:** Next.js API Routes + Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage (foto gallery)
- **Deploy:** Vercel
- **Domain:** .sch.id (beli sendiri nanti)

---

## Struktur Project

```
Esceha.id/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx            # Root layout + Navbar + Footer
│   │   ├── profil/page.tsx       # Profil sekolah
│   │   ├── ppdb/
│   │   │   ├── page.tsx          # Info PPDB + jadwal
│   │   │   └── daftar/page.tsx   # Form pendaftaran
│   │   ├── berita/
│   │   │   ├── page.tsx          # List berita
│   │   │   └── [slug]/page.tsx   # Detail berita
│   │   ├── gallery/page.tsx      # Gallery foto/video
│   │   └── admin/
│   │       ├── page.tsx          # Dashboard admin
│   │       └── ppdb/page.tsx     # Kelola pendaftar
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── lib/
│       ├── supabase.ts           # Client + types
│       └── queries.ts            # CRUD functions
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.local
└── package.json
```

---

## Database Tables

| Table | Fungsi | Kolom Utama |
|-------|--------|-------------|
| `school_profile` | Profil sekolah (1 baris) | school_name, address, phone, email, vision, mission, history |
| `ppdb_registrations` | Pendaftar PPDB | full_name, birth_date, gender, registration_path, status |
| `news` | Berita & pengumuman | title, slug, summary, content, category, is_published |
| `gallery` | Foto/video | title, media_type, url, thumbnail_url, category |
| `admin_users` | Admin auth | id (ref auth.users), full_name, role |

---

## Progress

### ✅ Done

- [x] Setup Next.js + Tailwind + Supabase
- [x] Database schema (English names)
- [x] RLS policies + indexes
- [x] Auto-update timestamp + auto-slug
- [x] Navbar responsive (mobile hamburger)
- [x] Footer
- [x] Landing page (basic)
- [x] Halaman PPDB (info + form pendaftaran)
- [x] Halaman Berita + detail page
- [x] Halaman Gallery
- [x] Halaman Profil Sekolah
- [x] Admin dashboard
- [x] Admin kelola PPDB (list + status update)
- [x] Supabase queries (CRUD functions)
- [x] TypeScript types

### 🔲 Todo

#### Prioritas Tinggi

- [ ] **Redesign UI** — terlalu AI slop, perlu desain yang lebih natural
- [ ] **Auth admin** — login/logout pakai Supabase Auth
- [ ] **Deploy ke Vercel**
- [ ] **Connect domain** smpmuh4tanggul.sch.id

#### Prioritas Sedang

- [ ] **Admin CRUD berita** — tambah/edit/hapus berita
- [ ] **Admin upload gallery** — upload foto + kelola
- [ ] **Admin kelola profil sekolah** — edit visi, misi, alamat, dll

#### Prioritas Rendah

- [ ] Halaman agenda/kalender akademik
- [ ] Export Excel pendaftar PPDB
- [ ] Email notifikasi saat ada pendaftar baru
- [ ] Search berita

---

## Catatan Penting

- **WordPress lama:** ga punya akses admin, cuma publisher. Biar expire aja.
- **Domain:** bulan September 2026 expired, beli baru nanti pakai data NPSN/IJOP.
- **Supabase:** `.env.local` udah diisi, SQL migration belum di-run di dashboard.
- **Next.js Turbopack:** ga support di Windows, pakai `--webpack` flag.

---

## Next Steps

1. Redesign UI landing page biar ga generik
2. Setup auth login admin
3. Lengkapi admin CRUD (berita, gallery, profil)
4. Test semua fitur
5. Deploy Vercel
6. Beli domain + connect
