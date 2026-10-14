# TUGAS: Optimasi kecepatan pindah halaman admin (hasil harus IDENTIK dengan spesifikasi di bawah)

## MODE KERJA (WAJIB)
- Kerjakan semuanya otonom dalam satu sesi. JANGAN bertanya, JANGAN minta konfirmasi.
- Kerjakan di BRANCH YANG SEDANG AKTIF (jangan buat/pindah branch). Mulai dengan `git status`; bila ada
  perubahan belum ter-commit, commit dulu (`chore: snapshot sebelum optimasi navigasi`). Commit hasil
  akhir dengan pesan `perf(admin): percepat navigasi (getClaims, matcher, layout, loading)`.
  Jangan `git push`.
- Pertahankan akhir baris asli (CRLF atau LF) tiap berkas. Jangan menyentuh `.env*`, skema DB, atau
  berkas di luar daftar di bawah. Jangan mengubah tampilan/desain apa pun.
- Berkas-berkas ini mungkin sudah diubah oleh pekerjaan lain (mis. redesign mobile). GABUNGKAN perubahan
  di bawah dengan isi berkas saat ini; jangan menimpa perubahan lain. Bila bagian yang disebut tidak
  persis ada, cari padanan terdekat dan terapkan maksud yang sama.

## 1. `proxy.ts` (cari lewat glob; di root atau `src/`)
Tujuan: hilangkan satu panggilan jaringan Auth per navigasi dan jangan jalankan proxy di halaman publik.
a. Ganti blok
```ts
  const {
    data: { user },
  } = await supabase.auth.getUser();
```
dengan
```ts
  // getClaims() memverifikasi JWT secara LOKAL (tanpa round-trip ke server Auth
  // Supabase) bila project memakai JWT signing keys asimetris; bila tidak, ia
  // otomatis jatuh ke pemeriksaan jaringan seperti getUser(). Tanpa ini, setiap
  // pindah halaman admin menambah satu panggilan jaringan berurutan.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;
```
b. Ganti semua pemakaian `user` berikutnya: `if (user)` → `if (userId)` (di cabang `/admin/login`),
   `if (!user)` → `if (!userId)` (redirect ke login), dan `.eq("id", user.id)` → `.eq("id", userId)`
   pada query `user_profiles`.
c. PERTAHANKAN semua logika lain persis: query `user_profiles` (`is_active, role`), redirect `no_profile`,
   redirect `inactive` + `signOut()`, pengecekan `adminOnlyRoutes`, `setDefaultResultOrder("ipv4first")`.
d. Ganti `export const config` menjadi:
```ts
// Hanya rute admin yang butuh pengecekan sesi. Matcher lama menjalankan proxy
// di SEMUA halaman publik juga (berita, kegiatan, dst.), padahal tidak ada
// logika yang dipakai di sana.
export const config = {
  matcher: ["/admin/:path*"],
};
```

## 2. `DashboardLayout.tsx` (komponen client pembungkus admin)
Tujuan: pengambilan profil dari browser hanya SEKALI, bukan di setiap pindah halaman.
a. Tepat setelah `const pathname = usePathname();` tambahkan:
```ts
  const isLogin = pathname === "/admin/login";
```
b. Di dalam `useEffect` yang berisi `fetchProfile`, ganti pengecekan awal
   `if (pathname === "/admin/login") { return; }` menjadi `if (isLogin) { return; }`.
c. Ganti larik dependensi efek itu dari `[pathname]` menjadi `[isLogin]`, dan tambahkan komentar tepat
   di atasnya:
```ts
    // Bergantung pada `isLogin`, BUKAN `pathname`: layout ini tetap terpasang saat
    // pindah antar halaman admin. Dengan [pathname], setiap klik menu mengulang
    // getUser() + query user_profiles dari browser (dua panggilan jaringan yang
    // sia-sia, karena proxy.ts sudah memeriksa sesi di server).
```
d. Biarkan semua yang lain (efek `searchParams`, efek redirect `loading/profile`, early-return
   `pathname === "/admin/login"`, spinner) tidak berubah.

## 3. Halaman Dashboard — `src/app/admin/page.tsx` (server component)
Tujuan: dari 3 langkah jaringan berurutan (getUser → profil → 9 query) menjadi 1.
Bagian pengambilan data di awal fungsi `AdminPage` (mulai dari `getUser()` sampai deklarasi
`visibleMenu` dan `Promise.all` data) diganti dengan struktur berikut, TANPA mengubah JSX/tampilan
sesudahnya (nama variabel `profile`, `newsCount`, `articlesCount`, `galleryCount`, `spmbCount`,
`achievementsCount`, `contactCount`, `recentNews`, `recentSpmb`, `recentMessages`, `visibleMenu`
harus tetap tersedia dengan arti yang sama):
```ts
  // getClaims(): verifikasi JWT lokal (tanpa panggilan Auth). proxy.ts sudah
  // memeriksa sesi, jadi di sini cukup mengambil id user.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/admin/login");

  // Profil diambil BERSAMAAN dengan data dashboard (sebelumnya berurutan:
  // getUser → profil → 9 query = 3 round-trip; kini 1).
  const [profileRes, newsCount, articlesCount, galleryCount, spmbCount, achievementsCount, contactCount, recentNews, recentSpmb, recentMessages] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", userId).single(),
    supabase.from("news").select("id", { count: "exact", head: true }),
    supabase.from("articles").select("id", { count: "exact", head: true }),
    supabase.from("gallery").select("id", { count: "exact", head: true }),
    supabase.from("spmb_registrations").select("id", { count: "exact", head: true }),
    supabase.from("achievements").select("id", { count: "exact", head: true }),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }),
    supabase.from("news").select("id, title, is_published, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("spmb_registrations").select("id, full_name, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("contact_messages").select("id, name, subject, is_read, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const profile = profileRes.data;
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=inactive");
  }

  const visibleMenu = menuItems.filter((item) => item.roles.includes(profile.role));
```
Bila dashboard sudah didesain ulang dan query/nama variabelnya berbeda, terapkan MAKSUD yang sama:
`getClaims()` menggantikan `getUser()`, dan query profil ikut di `Promise.all` bersama query data lain.
Hapus komentar lama "Fetch stats + recent data in parallel" bila jadi duplikat.

## 4. Berkas baru `src/app/admin/loading.tsx` (isi PERSIS seperti ini)
```tsx
// Tampil seketika saat berpindah halaman admin (dan memungkinkan Next
// memprefetch kerangka halaman), sehingga klik menu tidak terasa "diam".
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat…</span>
      <div className="mb-6 h-24 animate-pulse rounded-2xl bg-slate-200/70" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200/60" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
```
Bila sudah ada `loading.tsx` di folder itu, JANGAN menimpa; laporkan saja.

## VERIFIKASI (semua harus terpenuhi)
1. `grep -n "getUser" <proxy.ts>` → tidak ada hasil; `grep -n "getClaims"` ada di proxy.ts dan di
   `src/app/admin/page.tsx`; matcher persis `["/admin/:path*"]`.
2. Di DashboardLayout: efek `fetchProfile` berdependensi `[isLogin]` (bukan `[pathname]`).
3. `npx tsc --noEmit`, `npm run lint`, `npm run build` lulus tanpa error baru. Jika TypeScript
   memprotes `getClaims`, periksa versi `@supabase/supabase-js` di lockfile (diharapkan 2.114.0) dan
   jangan menurunkan versi; laporkan masalahnya.
4. Jalankan `git diff --stat` dan pastikan hanya berkas di atas yang berubah (proxy.ts,
   DashboardLayout.tsx, src/app/admin/page.tsx, src/app/admin/loading.tsx).
5. Tulis ringkasan singkat (berkas yang diubah, hasil tsc/lint/build, apa pun yang tidak persis
   sesuai spesifikasi dan alasannya) di terminal, dan tambahkan bagian "Optimasi navigasi" ke
   `MOBILE_UI_REPORT.md` bila berkas itu ada.