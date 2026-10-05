import type { ComponentType, CSSProperties } from "react";
import {
    House,
    HandCoins,
    Building,
    Newspaper,
    Trophy,
    ImageSquare,
    FileText,
    CalendarBlank,
    MapPin,
    Star,
    SquaresFour,
    BookOpen,
    GraduationCap,
    ChartBar,
    Clock,
} from "@/components/Icons";

export type PortalIcon = ComponentType<{ className?: string; weight?: "regular" | "fill" }>;

/**
 * Sumber tunggal ikon portal. Kunci = nilai kolom `icon` di tabel portal_apps.
 * Untuk menambah ikon: export dulu dari "@/components/Icons", lalu tambah satu baris di sini
 * dan satu baris di PORTAL_ICON_LABELS.
 */
export const PORTAL_ICONS: Record<string, PortalIcon> = {
    House,
    HandCoins,
    Building,
    Newspaper,
    Trophy,
    ImageSquare,
    FileText,
    CalendarBlank,
    MapPin,
    Star,
    SquaresFour,
    BookOpen,
    GraduationCap,
    ChartBar,
    Clock,
};

/** Nama ikon dalam bahasa Indonesia, dipakai untuk tooltip dan pembaca layar. */
export const PORTAL_ICON_LABELS: Record<string, string> = {
    House: "Rumah",
    HandCoins: "Koin",
    Building: "Gedung",
    Newspaper: "Koran",
    Trophy: "Piala",
    ImageSquare: "Gambar",
    FileText: "Dokumen",
    CalendarBlank: "Kalender",
    MapPin: "Lokasi",
    Star: "Bintang",
    SquaresFour: "Kotak-kotak",
    BookOpen: "Buku",
    GraduationCap: "Toga",
    ChartBar: "Grafik",
    Clock: "Jam",
};

/**
 * Sumber tunggal warna portal. Kunci = nilai kolom `color` di tabel portal_apps.
 * Kelas Tailwind ditulis utuh supaya terbaca saat build.
 * `dot` hanya dipakai untuk bulatan pilihan warna di admin.
 */
export const PORTAL_COLORS: Record<string, { label: string; box: string; ink: string; dot: string }> = {
    navy: { label: "Biru tua", box: "bg-[#082b59]/10", ink: "text-[#082b59]", dot: "bg-[#082b59]" },
    sky: { label: "Biru muda", box: "bg-sky-50", ink: "text-sky-600", dot: "bg-sky-500" },
    blue: { label: "Biru", box: "bg-blue-50", ink: "text-blue-600", dot: "bg-blue-500" },
    indigo: { label: "Indigo", box: "bg-indigo-50", ink: "text-indigo-600", dot: "bg-indigo-500" },
    violet: { label: "Ungu", box: "bg-violet-50", ink: "text-violet-600", dot: "bg-violet-500" },
    pink: { label: "Merah muda", box: "bg-pink-50", ink: "text-pink-600", dot: "bg-pink-500" },
    rose: { label: "Mawar", box: "bg-rose-50", ink: "text-rose-600", dot: "bg-rose-500" },
    orange: { label: "Oranye", box: "bg-orange-50", ink: "text-orange-600", dot: "bg-orange-500" },
    amber: { label: "Emas", box: "bg-amber-50", ink: "text-amber-600", dot: "bg-amber-500" },
    emerald: { label: "Hijau", box: "bg-emerald-50", ink: "text-emerald-600", dot: "bg-emerald-500" },
    teal: { label: "Tosca", box: "bg-teal-50", ink: "text-teal-600", dot: "bg-teal-500" },
    slate: { label: "Abu-abu", box: "bg-slate-100", ink: "text-slate-600", dot: "bg-slate-500" },
};

/** Terima "#abc", "abc", "#aabbcc"; kembalikan "#aabbcc" huruf kecil, atau null bila tidak valid. */
export function normalizeHex(value: string): string | null {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
    if (!m) return null;
    let hex = m[1].toLowerCase();
    if (hex.length === 3) hex = hex.split("").map((ch) => ch + ch).join("");
    return `#${hex}`;
}

export interface ResolvedPortalColor {
    label: string;
    /** Kelas untuk kotak ikon (latar + warna ikon). Kosong untuk warna kustom. */
    tileClass: string;
    /** Style untuk kotak ikon pada warna kustom. */
    tileStyle?: CSSProperties;
    /** Kelas / style untuk bulatan swatch. */
    dotClass: string;
    dotStyle?: CSSProperties;
    custom: boolean;
}

/**
 * Nilai kolom `color` bisa kunci preset ("navy", "sky", ...) atau hex kustom ("#7c3aed").
 * Warna kustom memakai inline style karena Tailwind tidak bisa membuat kelas dari nilai dinamis.
 */
export function resolvePortalColor(color: string): ResolvedPortalColor {
    const preset = PORTAL_COLORS[color];
    if (preset) {
        return {
            label: preset.label,
            tileClass: `${preset.box} ${preset.ink}`,
            dotClass: preset.dot,
            custom: false,
        };
    }
    const hex = normalizeHex(color);
    if (hex) {
        return {
            label: `Kustom ${hex}`,
            tileClass: "",
            tileStyle: { backgroundColor: `${hex}1f`, color: hex },
            dotClass: "",
            dotStyle: { backgroundColor: hex },
            custom: true,
        };
    }
    return resolvePortalColor("navy");
}