import { supabase } from "../supabase";

export async function postRevalidate(
  paths: string[],
  logLabel: string,
  type?: "page" | "layout"
): Promise<void> {
  try {
    // Ambil session token untuk otorisasi di server
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const res = await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(type ? { paths, type } : { paths }),
    });

    if (!res.ok) {
      let message = "";
      try {
        const payload = (await res.json()) as { error?: unknown };
        message = typeof payload?.error === "string" ? payload.error : "";
      } catch {
        // body bukan JSON — abaikan
      }
      console.warn(
        `[${logLabel}] revalidate gagal: HTTP ${res.status}${message ? ` (${message})` : ""} | paths: ${paths.join(", ")}`
      );
    }
  } catch (e) {
    console.warn(
      `[${logLabel}] fetch failed, cache not invalidated:`,
      e instanceof Error ? e.message : e
    );
  }
}

/**
 * Panggil revalidatePath untuk halaman berita via API route /api/revalidate.
 * Aman dipanggil dari client component admin setelah create/update/delete/togglePublish.
 */
export async function revalidateNews(
  slug: string,
  oldSlug?: string
): Promise<void> {
  const paths = Array.from(
    new Set(
      [
        slug ? `/news/${slug}` : null,
        oldSlug && oldSlug !== slug ? `/news/${oldSlug}` : null,
        "/news",
        "/",
      ].filter(Boolean) as string[]
    )
  );
  await postRevalidate(paths, "revalidateNews");
}

/**
 * Invalidasi ISR halaman artikel (/ + /articles + /articles/[slug])
 * via API route /api/revalidate. Dipanggil dari client component admin
 * artikel setelah create/update/delete/togglePublish/bulk/duplicate.
 */
export async function revalidateArticles(
  slug?: string,
  oldSlug?: string
): Promise<void> {
  const paths = Array.from(
    new Set(
      [
        slug ? `/articles/${slug}` : null,
        oldSlug && oldSlug !== slug ? `/articles/${oldSlug}` : null,
        "/articles",
        "/",
      ].filter(Boolean) as string[]
    )
  );
  await postRevalidate(paths, "revalidateArticles");
}

/**
 * Invalidasi ISR untuk halaman yang menampilkan fasilitas (beranda + profil)
 * via API route /api/revalidate. Dipanggil dari client component admin
 * setelah create/update/delete/toggle fasilitas.
 */
export async function revalidateFacilities(): Promise<void> {
  await postRevalidate(["/", "/profile"], "revalidateFacilities");
}

/**
 * Invalidasi ISR halaman prestasi (/achievements + beranda) via API route
 * /api/revalidate. Dipanggil dari client component admin prestasi setelah
 * create/update/delete/bulk/duplikat+simpan.
 */
export async function revalidateAchievements(): Promise<void> {
  await postRevalidate(["/achievements", "/"], "revalidateAchievements");
}

/**
 * Revalidate path publik tertentu (mis. "/admission") via API route /api/revalidate.
 * Dipanggil dari client component admin setelah create/update/delete/toggle gelombang.
 * `type` opsional: "layout" → revalidatePath(path, "layout") di server
 * (me-revalidate layout + semua halaman di bawahnya — dipakai untuk "/",
 * karena footer & banner ada di root layout).
 * Kredensial & whitelist path dicek di server (route /api/revalidate).
 */
export async function revalidatePaths(
  paths: string[],
  type?: "page" | "layout"
): Promise<void> {
  const unique = Array.from(
    new Set(paths.filter((p) => typeof p === "string" && p.startsWith("/")))
  );
  if (unique.length === 0) return;
  await postRevalidate(unique, "revalidatePaths", type);
}

// ============ SUMBER PENDAFTARAN (MODE REGISTRASI) ============
/** URL Google Form penerimaan — sumber tunggal semua CTA "Daftar" + redirect halaman form. */
