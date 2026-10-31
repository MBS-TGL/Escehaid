# Panduan Setup Kredensial & Migrasi Database (Reminder)

Dokumen ini adalah panduan langkah demi langkah saat Anda siap melakukan setup integrasi (Migrasi SQL, Fonnte WhatsApp, Telegram Bot, dan Discord Webhook).

---

## 1. Migrasi Database (Wajib untuk Mengaktifkan Fitur Baru)

Ada 5 file migrasi baru (`0016` s.d. `0020`) yang menambahkan tabel:
- `admin_saved_views` (Preset filter per modul)
- `analytics_events` (Page views internal tanpa cookie)
- `content_revisions` (Snapshot & restore konten)
- `alert_rules` & `alert_events` (Aturan otomatis & riwayat alert)
- Kolom `interview_at` di SPMB + tabel `spmb_message_log` & `spmb_wa_optout`

### Cara Eksekusi:

**Pilihan A (Lewat Terminal / Runner Otomatis):**
Pastikan variabel `DATABASE_URL` sudah ada di `.env.local`, lalu jalankan:
```bash
# 1. Cek pratinjau migrasi yang pending
npm run db:migrate:dry

# 2. Jalankan migrasi ke Supabase
npm run db:migrate

# 3. Pastikan semua file bertanda centang hijau (✓)
npm run db:migrate:status
```

**Pilihan B (Lewat Supabase Dashboard Langsung):**
Jika tidak memakai terminal:
1. Buka dashboard Supabase proyek Anda.
2. Buka menu **SQL Editor**.
3. Buka berkas berikut satu per satu di folder repo `supabase/migrations/`, salin isinya, dan klik **Run**:
   - `0016_admin_saved_views.sql`
   - `0017_analytics_events.sql`
   - `0018_content_revisions.sql`
   - `0019_alert_rules.sql`
   - `0020_spmb_interview_and_wa_log.sql`

---

## 2. Setup Kredensial (Bisa Dipilih Sesuai Kebutuhan)

Anda bebas memilih kanal notifikasi yang ingin diaktifkan (tidak harus semuanya).

### A. Telegram Bot (Paling Disarankan — Gratis & Cepat)
1. Buka aplikasi Telegram, cari **`@BotFather`**.
2. Ketik `/newbot`, beri nama bot (misal: `Esceha Alert Bot`) dan username (misal: `EscehaAlertBot`).
3. Salin token API yang diberikan. Ini adalah `TELEGRAM_BOT_TOKEN`.
4. Untuk mendapatkan `TELEGRAM_CHAT_ID`:
   - **Chat Pribadi**: Buka bot Anda, klik **Start**, lalu cari bot **`@userinfobot`** di Telegram untuk melihat ID angka Anda (mis. `123456789`).
   - **Grup Admin**: Masukkan bot Anda ke grup admin sekolah, jadikan bot sebagai admin, lalu gunakan ID grup (biasanya diawali minus, mis. `-1001987654321`).

### B. WhatsApp Gateway via Fonnte (Untuk Broadcast SPMB & Alert WA)
1. Buka [https://fonnte.com](https://fonnte.com) dan buat akun (ada opsi gratis/trial).
2. Di dashboard Fonnte, buka menu **Device** → hubungkan nomor WhatsApp resmi sekolah via scan QR code.
3. Salin **Token Device** yang muncul. Ini adalah `FONNTE_TOKEN`.
4. `FONNTE_COUNTRY_CODE` default adalah `62`.

### C. Webhook (Discord / Slack)
1. Di server Discord Anda, klik kanan channel (misal: `#notifikasi-web`) → **Edit Channel** → **Integrations** → **Webhooks** → **New Webhook**.
2. Salin Webhook URL. Ini adalah `ALERT_WEBHOOK_URL`.

---

## 3. Di Mana Menaruh Kredensial?

| Variabel | `.env.local` (Lokal Komputer) | **Vercel** (Website Produksi) | **GitHub Secrets** (Cron Tiap 30 Mnt) |
|---|---|---|---|
| `DATABASE_URL` | Ya (untuk runner migrasi) | - | Ya (untuk backup otomatis) |
| `TELEGRAM_BOT_TOKEN` | Ya | **Wajib** | **Wajib** |
| `TELEGRAM_CHAT_ID` | Ya | **Wajib** | **Wajib** |
| `FONNTE_TOKEN` | Ya (jika tes lokal) | **Wajib** (untuk broadcast SPMB) | **Wajib** (jika alert dikirim ke WA) |
| `ALERT_WEBHOOK_URL` | Ya (jika tes lokal) | **Wajib** (jika alert via Webhook) | **Wajib** (jika alert via Webhook) |

### Langkah Pasang:

1. **Di Komputer (`.env.local`)**:
   Tambahkan baris berikut di berkas `.env.local`:
   ```env
   # Notifikasi Telegram
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id

   # Notifikasi & Broadcast WhatsApp Fonnte
   FONNTE_TOKEN=your_fonnte_token
   FONNTE_COUNTRY_CODE=62

   # Webhook Discord/Slack
   ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```

2. **Di Vercel (Produksi Web)**:
   - Buka **Vercel Dashboard → Proyek Esceha.id → Settings → Environment Variables**.
   - Masukkan variabel di atas untuk lingkungan **Production**.
   - Redeploy proyek Anda sekali agar variabel aktif.

3. **Di GitHub (Background Job Alert 30-Menit)**:
   - Buka **GitHub Repo → Settings → Secrets and variables → Actions**.
   - Tambahkan *Repository Secrets*:
     - `TELEGRAM_BOT_TOKEN`
     - `TELEGRAM_CHAT_ID`
     - `FONNTE_TOKEN` (opsional)
     - `ALERT_WEBHOOK_URL` (opsional)

---

## 4. Cara Menguji Setelah Setup

1. Buka halaman admin: **`/admin/automation`**.
2. Klik tombol:
   - **Tes Telegram** untuk memastikan bot mengirim pesan uji coba ke chat/grup Anda.
   - **Tes WA Fonnte** untuk memastikan WhatsApp gateway terhubung.
   - **Tes Webhook** untuk memastikan channel Discord/Slack menerima notifikasi.
3. Buka **`/admin/admission`** tab **Pipeline** untuk melihat kanban alur SPMB dan mencoba modal **Broadcast WA**.
