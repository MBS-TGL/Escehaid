import type { ComponentType, CSSProperties } from "react";
import {
    House,
    Buildings,
    Building,
    MapPin,
    Star,
    Heart,
    SquaresFour,
    Flag,
    Lightbulb,
    Target,
    Rocket,
    Sparkle,
    Lightning,
    Crown,
    Gift,
    GraduationCap,
    BookOpen,
    Book,
    Books,
    BookBookmark,
    Notebook,
    Student,
    Chalkboard,
    ChalkboardTeacher,
    Exam,
    Backpack,
    Certificate,
    Medal,
    Trophy,
    Atom,
    Flask,
    Calculator,
    Translate,
    Pencil,
    Mosque,
    HandCoins,
    Coins,
    Wallet,
    Money,
    Receipt,
    CreditCard,
    Bank,
    Storefront,
    ShoppingCart,
    ChartBar,
    ChartLine,
    ChartPie,
    Users,
    UsersThree,
    User,
    UserCircle,
    IdentificationCard,
    IdentificationBadge,
    Handshake,
    FileText,
    Files,
    Folder,
    FolderOpen,
    ClipboardText,
    Article,
    Newspaper,
    EnvelopeSimple,
    NotePencil,
    Scroll,
    CalendarBlank,
    CalendarCheck,
    Clock,
    Desktop,
    Laptop,
    DeviceMobile,
    Globe,
    Cloud,
    Database,
    Gear,
    QrCode,
    Barcode,
    Printer,
    Camera,
    VideoCamera,
    ImageSquare,
    Megaphone,
    Bell,
    ChatCircle,
    ChatsCircle,
    Phone,
    WhatsappLogo,
    Shield,
    ShieldCheck,
    Lock,
    Key,
    Moon,
    MoonStars,
    Plant,
    Leaf,
    SoccerBall,
    MusicNotes,
    Palette,
    Bus,
    ForkKnife,
    Heartbeat,
    FirstAid,
    Package,
    Truck,
    Briefcase,
    Wrench,
    Compass,
    ListChecks,
    CheckCircle,
    Info,
    Question,
} from "@/components/Icons";

export type PortalIcon = ComponentType<{ className?: string; weight?: "regular" | "fill" }>;

/**
 * Sumber tunggal ikon portal. Kunci = nilai kolom `icon` di tabel portal_apps.
 * Untuk menambah ikon: export dulu dari "@/components/Icons", lalu tambah SATU baris di DEFS:
 * [nama komponen, komponen, label Indonesia, kata kunci pencarian].
 */
const DEFS: Array<[string, PortalIcon, string, string]> = [
    ["House", House, "Rumah", "beranda home"],
    ["Buildings", Buildings, "Gedung kota", "kantor sekolah"],
    ["Building", Building, "Gedung", "kantor"],
    ["MapPin", MapPin, "Lokasi", "peta alamat"],
    ["Star", Star, "Bintang", "favorit unggulan"],
    ["Heart", Heart, "Hati", "suka peduli"],
    ["SquaresFour", SquaresFour, "Kotak-kotak", "menu aplikasi grid"],
    ["Flag", Flag, "Bendera", "target"],
    ["Lightbulb", Lightbulb, "Lampu", "ide inovasi"],
    ["Target", Target, "Target", "sasaran tujuan"],
    ["Rocket", Rocket, "Roket", "mulai peluncuran"],
    ["Sparkle", Sparkle, "Kilau", "baru spesial"],
    ["Lightning", Lightning, "Petir", "cepat kilat"],
    ["Crown", Crown, "Mahkota", "juara"],
    ["Gift", Gift, "Hadiah", "bonus"],
    ["GraduationCap", GraduationCap, "Toga", "wisuda lulus kelulusan"],
    ["BookOpen", BookOpen, "Buku terbuka", "baca belajar"],
    ["Book", Book, "Buku", "pustaka"],
    ["Books", Books, "Rak buku", "perpustakaan library"],
    ["BookBookmark", BookBookmark, "Buku penanda", "kitab"],
    ["Notebook", Notebook, "Buku catatan", "tulis"],
    ["Student", Student, "Siswa", "santri murid pelajar"],
    ["Chalkboard", Chalkboard, "Papan tulis", "kelas"],
    ["ChalkboardTeacher", ChalkboardTeacher, "Guru", "mengajar ustadz"],
    ["Exam", Exam, "Ujian", "tes soal"],
    ["Backpack", Backpack, "Tas sekolah", "ransel"],
    ["Certificate", Certificate, "Sertifikat", "piagam"],
    ["Medal", Medal, "Medali", "prestasi"],
    ["Trophy", Trophy, "Piala", "juara lomba prestasi"],
    ["Atom", Atom, "Atom", "sains ipa"],
    ["Flask", Flask, "Labu kimia", "laboratorium praktikum"],
    ["Calculator", Calculator, "Kalkulator", "hitung matematika"],
    ["Translate", Translate, "Terjemah", "bahasa arab inggris"],
    ["Pencil", Pencil, "Pensil", "tulis edit"],
    ["Mosque", Mosque, "Masjid", "ibadah islam"],
    ["HandCoins", HandCoins, "Koin di tangan", "koperasi uang"],
    ["Coins", Coins, "Koin", "uang"],
    ["Wallet", Wallet, "Dompet", "saldo uang"],
    ["Money", Money, "Uang kertas", "tunai"],
    ["Receipt", Receipt, "Struk", "nota transaksi"],
    ["CreditCard", CreditCard, "Kartu", "pembayaran spp"],
    ["Bank", Bank, "Bank", "keuangan"],
    ["Storefront", Storefront, "Toko", "kantin koperasi"],
    ["ShoppingCart", ShoppingCart, "Keranjang", "belanja"],
    ["ChartBar", ChartBar, "Grafik batang", "statistik data"],
    ["ChartLine", ChartLine, "Grafik garis", "tren"],
    ["ChartPie", ChartPie, "Grafik lingkaran", "persentase"],
    ["Users", Users, "Pengguna", "kelompok anggota"],
    ["UsersThree", UsersThree, "Tim", "kelompok guru"],
    ["User", User, "Satu pengguna", "akun profil"],
    ["UserCircle", UserCircle, "Akun", "profil"],
    ["IdentificationCard", IdentificationCard, "Kartu identitas", "id kartu pelajar"],
    ["IdentificationBadge", IdentificationBadge, "Tanda pengenal", "badge"],
    ["Handshake", Handshake, "Jabat tangan", "kerja sama mitra"],
    ["FileText", FileText, "Dokumen", "berkas surat"],
    ["Files", Files, "Banyak berkas", "arsip"],
    ["Folder", Folder, "Map", "folder"],
    ["FolderOpen", FolderOpen, "Map terbuka", "arsip"],
    ["ClipboardText", ClipboardText, "Papan klip", "laporan rapor daftar"],
    ["Article", Article, "Artikel", "tulisan"],
    ["Newspaper", Newspaper, "Koran", "berita"],
    ["EnvelopeSimple", EnvelopeSimple, "Surat", "email pesan"],
    ["NotePencil", NotePencil, "Catatan", "tulis jurnal"],
    ["Scroll", Scroll, "Gulungan", "naskah"],
    ["CalendarBlank", CalendarBlank, "Kalender", "agenda jadwal"],
    ["CalendarCheck", CalendarCheck, "Kalender centang", "kegiatan presensi"],
    ["Clock", Clock, "Jam", "waktu"],
    ["Desktop", Desktop, "Komputer", "pc monitor"],
    ["Laptop", Laptop, "Laptop", "komputer"],
    ["DeviceMobile", DeviceMobile, "Ponsel", "hp android"],
    ["Globe", Globe, "Dunia", "website internet"],
    ["Cloud", Cloud, "Awan", "cloud"],
    ["Database", Database, "Basis data", "database"],
    ["Gear", Gear, "Roda gigi", "pengaturan setting"],
    ["QrCode", QrCode, "Kode QR", "scan"],
    ["Barcode", Barcode, "Barcode", "scan"],
    ["Printer", Printer, "Printer", "cetak"],
    ["Camera", Camera, "Kamera", "foto"],
    ["VideoCamera", VideoCamera, "Kamera video", "video"],
    ["ImageSquare", ImageSquare, "Gambar", "galeri foto"],
    ["Megaphone", Megaphone, "Pengeras suara", "pengumuman"],
    ["Bell", Bell, "Lonceng", "notifikasi bel"],
    ["ChatCircle", ChatCircle, "Obrolan", "chat pesan"],
    ["ChatsCircle", ChatsCircle, "Diskusi", "forum chat"],
    ["Phone", Phone, "Telepon", "kontak"],
    ["WhatsappLogo", WhatsappLogo, "WhatsApp", "wa"],
    ["Shield", Shield, "Perisai", "keamanan"],
    ["ShieldCheck", ShieldCheck, "Perisai centang", "aman"],
    ["Lock", Lock, "Gembok", "kunci privasi"],
    ["Key", Key, "Kunci", "akses login"],
    ["Moon", Moon, "Bulan", "malam"],
    ["MoonStars", MoonStars, "Bulan bintang", "ramadan islam"],
    ["Plant", Plant, "Tanaman", "tumbuh"],
    ["Leaf", Leaf, "Daun", "lingkungan"],
    ["SoccerBall", SoccerBall, "Sepak bola", "olahraga"],
    ["MusicNotes", MusicNotes, "Not musik", "musik hadrah"],
    ["Palette", Palette, "Palet", "seni lukis"],
    ["Bus", Bus, "Bus", "antar jemput transportasi"],
    ["ForkKnife", ForkKnife, "Makan", "konsumsi dapur"],
    ["Heartbeat", Heartbeat, "Detak jantung", "kesehatan uks"],
    ["FirstAid", FirstAid, "P3K", "kesehatan"],
    ["Package", Package, "Paket", "barang inventaris"],
    ["Truck", Truck, "Truk", "pengiriman"],
    ["Briefcase", Briefcase, "Tas kerja", "pekerjaan"],
    ["Wrench", Wrench, "Kunci inggris", "perbaikan"],
    ["Compass", Compass, "Kompas", "arah"],
    ["ListChecks", ListChecks, "Daftar centang", "tugas cek"],
    ["CheckCircle", CheckCircle, "Centang", "selesai"],
    ["Info", Info, "Info", "informasi"],
    ["Question", Question, "Tanya", "bantuan faq"],
];

export const PORTAL_ICONS: Record<string, PortalIcon> = Object.fromEntries(
    DEFS.map(([name, Icon]) => [name, Icon]),
);

/** Nama ikon dalam bahasa Indonesia, dipakai untuk tooltip dan pembaca layar. */
export const PORTAL_ICON_LABELS: Record<string, string> = Object.fromEntries(
    DEFS.map(([name, , label]) => [name, label]),
);

/** Teks pencarian (huruf kecil): nama komponen + label + kata kunci. */
export const PORTAL_ICON_SEARCH: Record<string, string> = Object.fromEntries(
    DEFS.map(([name, , label, keywords]) => [name, `${name} ${label} ${keywords}`.toLowerCase()]),
);

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