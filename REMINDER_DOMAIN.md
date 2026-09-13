# Reminder: Ganti Domain ke .sch.id

## Status Domain
- **Sekarang**: `smpmuh4tanggul.web.id` (deploy test)
- **Target**: `smpmuh4tanggul.sch.id` (domain resmi)
- **Deadline**: 17 September 2026 (domain .sch.id habis masa kepemilikan operator lama)

---

## Checklist Ketika Domain .sch Sudah Di Tangan

### 1. Update di Codebase
- [ ] `src/app/layout.tsx` → ganti `metadataBase` ke `https://smpmuh4tanggul.sch.id`
- [ ] `src/app/sitemap.ts` → ganti `BASE_URL` ke `https://smpmuh4tanggul.sch.id`
- [ ] `src/app/robots.ts` → ganti `sitemap:` ke `https://smpmuh4tanggul.sch.id/sitemap.xml`
- [ ] Cari link hardcoded lain yang masih pakai `smpmuh4tanggul.web.id` (grep di seluruh codebase)

### 2. Setup di Vercel
- [ ] Tambahkan domain `smpmuh4tanggul.sch.id` di Vercel Dashboard → Project → Settings → Domains
- [ ] Setup redirect `smpmuh4tanggul.web.id` → `smpmuh4tanggul.sch.id` (agar link lama tetap jalan)
- [ ] Pastikan SSL/TLS aktif untuk domain baru
- [ ] Update DNS records (A / CNAME) sesuai instruksi Vercel

### 3. Google Search Console
- [ ] Tambahkan properti baru: `https://smpmuh4tanggul.sch.id`
- [ ] Verifikasi kepemilikan (DNS TXT record atau HTML file)
- [ ] Submit sitemap baru: `https://smpmuh4tanggul.sch.id/sitemap.xml`
- [ ] Request indexing untuk halaman utama

### 4. External Services
- [ ] Update domain di Google Analytics (kalau pakai)
- [ ] Update domain di WhatsApp link (footer, kontak)
- [ ] Update link di media sosial (Instagram, YouTube, Facebook)
- [ ] Update link di Google Maps (kalau ada)
- [ ] Beri tahu operator/CSMP bahwa domain sudah berganti

### 5. Cleanup
- [ ] Pastikan redirect `.web.id` → `.sch.id` sudah jalan
- [ ] Test semua halaman utama via domain baru
- [ ] Test Google Search Console → Coverage (pastikan tidak ada error)
- [ ] Hapus properti lama `.web.id` di Search Console (opsional, setelah yakin redirect jalan)

---

## File yang Perlu Diubah

```
src/app/layout.tsx          → metadataBase
src/app/sitemap.ts          → BASE_URL
src/app/robots.ts           → sitemap URL
```

## Grep Command untuk Cari Link Lama
```bash
grep -r "smpmuh4tanggul.web.id" src/ public/
```

---

## Catatan
- Domain `.sch.id` lebih SEO-friendly untuk sekolah
- Google lebih authoritative untuk domain pendidikan
- Jangan lupa backup sebelum deploy perubahan domain
