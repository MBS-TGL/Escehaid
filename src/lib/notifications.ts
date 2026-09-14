let resend: any;

async function getResend() {
  if (!resend) {
    const { Resend } = await import("resend");
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = "SMP Muhammadiyah 4 Tanggul <noreply@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "itzme.rizal@gmail.com";
const SCHOOL_NAME = "SMP Muhammadiyah 4 Tanggul";

// ============================================================
// Email: SPMB Registration Confirmation
// ============================================================
export async function sendRegistrationEmail(reg: {
  full_name: string;
  email?: string;
  registration_path: string;
  parent_name?: string;
}): Promise<void> {
  const pathLabel =
    reg.registration_path === "beasiswa"
      ? "Beasiswa"
      : reg.registration_path === "prestasi"
      ? "Prestasi"
      : "Reguler";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#1767b1;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">${SCHOOL_NAME}</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">Konfirmasi Pendaftaran SPMB</p>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
        <p style="margin:0 0 16px;color:#334155;">Yth. Bapak/Ibu <strong>${reg.parent_name || reg.full_name}</strong>,</p>
        <p style="margin:0 0 16px;color:#334155;">
          Terima kasih telah mendaftarkan <strong>${reg.full_name}</strong> di ${SCHOOL_NAME}.
          Berikut data pendaftaran Anda:
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Nama Lengkap</td>
            <td style="padding:8px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;font-weight:600;">${reg.full_name}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Jalur Pendaftaran</td>
            <td style="padding:8px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;font-weight:600;">${pathLabel}</td>
          </tr>
        </table>
        <p style="margin:16px 0 0;color:#334155;">
          Silakan cek email ini secara berkala untuk informasi lanjutan mengenai jadwal tes dan pengumuman.
        </p>
        <p style="margin:16px 0 0;color:#64748b;font-size:13px;">
          Salam hangat,<br/>${SCHOOL_NAME}
        </p>
      </div>
    </div>`;

  try {
    const client = await getResend();
    await client.emails.send({
      from: FROM_EMAIL,
      to: reg.email || ADMIN_EMAIL,
      subject: `Konfirmasi Pendaftaran SPMB - ${reg.full_name}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send registration email:", err);
  }
}

// ============================================================
// Email: Admin notification for new registration
// ============================================================
export async function sendRegistrationAdminEmail(reg: {
  full_name: string;
  parent_name?: string;
  phone?: string;
  email?: string;
  registration_path: string;
  previous_school?: string;
}): Promise<void> {
  const pathLabel =
    reg.registration_path === "beasiswa"
      ? "Beasiswa"
      : reg.registration_path === "prestasi"
      ? "Prestasi"
      : "Reguler";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#10b981;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:18px;">Pendaftaran SPMB Baru</h1>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Nama Siswa</td>
            <td style="padding:8px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;font-weight:600;">${reg.full_name}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Nama Orang Tua</td>
            <td style="padding:8px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${reg.parent_name || "-"}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Telepon</td>
            <td style="padding:8px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${reg.phone || "-"}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Email</td>
            <td style="padding:8px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${reg.email || "-"}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Jalur</td>
            <td style="padding:8px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;font-weight:600;">${pathLabel}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#64748b;">Asal Sekolah</td>
            <td style="padding:8px 12px;color:#1e293b;">${reg.previous_school || "-"}</td>
          </tr>
        </table>
        <p style="margin:16px 0 0;">
          <a href="https://smpmuh4tanggul.web.id/admin/admission" style="background:#1767b1;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Lihat di Admin</a>
        </p>
      </div>
    </div>`;

  try {
    const client = await getResend();
    await client.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `[SPMB Baru] ${reg.full_name} - ${pathLabel}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send admin registration email:", err);
  }
}

// ============================================================
// Email: Contact Message Confirmation
// ============================================================
export async function sendContactEmail(msg: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#1767b1;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">${SCHOOL_NAME}</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">Pesan Terkirim</p>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
        <p style="margin:0 0 16px;color:#334155;">Halo <strong>${msg.name}</strong>,</p>
        <p style="margin:0 0 16px;color:#334155;">
          Terima kasih telah menghubungi ${SCHOOL_NAME}. Pesan Anda dengan subjek "<strong>${msg.subject || "Tanpa Subjek"}</strong>" telah kami terima dan akan segera kami balas.
        </p>
        <div style="background:#e2e8f0;padding:16px;border-radius:6px;margin:16px 0;">
          <p style="margin:0;color:#64748b;font-size:13px;">Isi Pesan:</p>
          <p style="margin:8px 0 0;color:#1e293b;">${msg.message}</p>
        </div>
        <p style="margin:16px 0 0;color:#64748b;font-size:13px;">
          Salam hangat,<br/>${SCHOOL_NAME}
        </p>
      </div>
    </div>`;

  try {
    const client = await getResend();
    await client.emails.send({
      from: FROM_EMAIL,
      to: msg.email,
      subject: `Terima Kasih - ${msg.subject || "Pesan dari Website"}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send contact confirmation email:", err);
  }
}

// ============================================================
// Email: Admin notification for new contact message
// ============================================================
export async function sendContactAdminEmail(msg: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#f59e0b;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:18px;">Pesan Baru dari Website</h1>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Nama</td>
            <td style="padding:8px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;font-weight:600;">${msg.name}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Email</td>
            <td style="padding:8px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${msg.email}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Telepon</td>
            <td style="padding:8px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${msg.phone || "-"}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#64748b;">Subjek</td>
            <td style="padding:8px 12px;color:#1e293b;font-weight:600;">${msg.subject || "Tanpa Subjek"}</td>
          </tr>
        </table>
        <div style="background:#e2e8f0;padding:16px;border-radius:6px;margin:16px 0;">
          <p style="margin:0;color:#64748b;font-size:13px;">Isi Pesan:</p>
          <p style="margin:8px 0 0;color:#1e293b;white-space:pre-wrap;">${msg.message}</p>
        </div>
        <p style="margin:16px 0 0;">
          <a href="https://smpmuh4tanggul.web.id/admin/contact" style="background:#1767b1;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Lihat di Admin</a>
        </p>
      </div>
    </div>`;

  try {
    const client = await getResend();
    await client.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `[Pesan Baru] ${msg.subject || msg.name}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send admin contact email:", err);
  }
}
