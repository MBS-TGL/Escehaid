import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { forbiddenResponseIfLacks } from "@/lib/rbac/server";
import { buildSpmbCsv, buildSpmbSheets } from "@/lib/spmb-export";
import { buildXlsx } from "@/lib/spmb-xlsx";
import { normalizeSpmbFormSchema } from "@/lib/queries/spmb";
import type { SpmbAdminListRow, SpmbListQuery } from "@/lib/queries/spmb-list";

/**
 * Ekspor SPMB sisi-server — menggantikan CSV klien yang memuat seluruh
 * dataset. Mendukung filter yang sama dengan daftar + mode "terpilih".
 * Format: `csv` (kompatibel Excel ID, pemisah ;) atau `xlsx` multi-sheet.
 */
export const runtime = "nodejs";

const MAX_ROWS = 20000;

type ExportBody = {
  format?: "csv" | "xlsx";
  selectedIds?: string[];
  filters?: SpmbListQuery;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  accepted: "Diterima",
  rejected: "Ditolak",
};

const PATH_LABELS: Record<string, string> = {
  reguler: "Reguler",
  prestasi: "Prestasi",
  beasiswa: "Beasiswa",
};

export async function POST(req: Request) {
  const denied = await forbiddenResponseIfLacks("spmb:export");
  if (denied) return NextResponse.json(denied.body, { status: denied.status });

  const body = (await req.json().catch(() => null)) as ExportBody | null;
  if (!body) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  const format = body.format === "xlsx" ? "xlsx" : "csv";
  const selected = Array.from(new Set((body.selectedIds ?? []).filter((id) => typeof id === "string"))).slice(0, MAX_ROWS);
  const f = body.filters ?? {};

  const supabase = await createClient();

  // Profil: gelombang (nama), skema form, ringkasan verifikasi.
  const [wavesRes, profileRes, verifRes] = await Promise.all([
    supabase.from("spmb_waves").select("id, name"),
    supabase.from("school_profile").select("spmb_form_schema").limit(1).maybeSingle(),
    supabase.from("spmb_document_verifications").select("registration_id, status").limit(20000),
  ]);
  if (wavesRes.error) return NextResponse.json({ error: wavesRes.error.message }, { status: 502 });

  async function fetchRows(): Promise<SpmbAdminListRow[]> {
    // Mode terpilih: ambil langsung by id (chunk 500).
    if (selected.length > 0) {
      const out: SpmbAdminListRow[] = [];
      for (let i = 0; i < selected.length; i += 500) {
        const chunk = selected.slice(i, i + 500);
        const { data, error } = await supabase
          .from("spmb_admin_registrations")
          .select("*")
          .in("id", chunk);
        if (error) throw new Error(error.message);
        out.push(...((data ?? []) as SpmbAdminListRow[]));
      }
      return out;
    }
    // Mode filter: halaman berulang (maks MAX_ROWS).
    const out: SpmbAdminListRow[] = [];
    const pageSize = 1000;
    let page = 0;
    for (;;) {
      let query = supabase.from("spmb_admin_registrations").select("*");
      if (f.status && f.status !== "all") query = query.eq("status", f.status);
      if (f.path && f.path !== "all") query = query.eq("registration_path", f.path);
      if (f.gender && f.gender !== "all") query = query.eq("gender", f.gender);
      if (f.program && f.program !== "all") {
        query =
          f.program === "none"
            ? query.or("documents->>program.is.null,documents->>program.eq.")
            : query.filter("documents->>program", "eq", f.program);
      }
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as SpmbAdminListRow[];
      out.push(...rows);
      if (rows.length < pageSize || out.length >= MAX_ROWS) break;
      page += 1;
    }
    return out.slice(0, MAX_ROWS);
  }

  let rows: SpmbAdminListRow[];
  try {
    rows = await fetchRows();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal mengambil data." },
      { status: 502 }
    );
  }

  const waveNames = new Map<string, string>(
    ((wavesRes.data ?? []) as { id: string; name: string }[]).map((w) => [w.id, w.name])
  );
  const docSummary: Record<string, { total: number; verified: number; rejected: number }> = {};
  for (const v of (verifRes.data ?? []) as { registration_id: string; status: string }[]) {
    const e = (docSummary[v.registration_id] ??= { total: 0, verified: 0, rejected: 0 });
    e.total += 1;
    if (v.status === "verified") e.verified += 1;
    else if (v.status === "rejected") e.rejected += 1;
  }
  const ctx = {
    waveNames,
    formFields: normalizeSpmbFormSchema(
      (profileRes.data as { spmb_form_schema?: unknown } | null)?.spmb_form_schema
    ),
    docSummary,
    statusLabels: STATUS_LABELS,
    pathLabels: PATH_LABELS,
    today: new Date().toISOString().slice(0, 10),
  };

  if (format === "xlsx") {
    const bytes = buildXlsx(buildSpmbSheets(rows, ctx));
    // NextResponse butuh BodyInit — salin ke ArrayBuffer milik runtime.
    const body = new Uint8Array(bytes).buffer as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pendaftar-spmb-${ctx.today}.xlsx"`,
      },
    });
  }

  const csv = buildSpmbCsv(rows, ctx);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="pendaftar-spmb-${ctx.today}.csv"`,
    },
  });
}
