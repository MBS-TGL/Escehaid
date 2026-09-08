import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface SchoolProfile {
  id: string;
  school_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  vision: string;
  mission: string;
  history: string;
  logo_url: string;
  banner_url: string;
  principal_name: string;
  principal_photo_url: string;
  principal_quote: string;
  total_teachers: number;
  total_students: number;
  total_classes: number;
  accreditation: string;
  created_at: string;
  updated_at: string;
}

export interface SpmbRegistration {
  id: string;
  full_name: string;
  birth_place: string;
  birth_date: string;
  gender: "L" | "P";
  address: string;
  phone: string;
  email: string;
  parent_name: string;
  parent_occupation: string;
  previous_school: string;
  registration_path: "reguler" | "prestasi" | "beasiswa";
  status: "pending" | "accepted" | "rejected";
  documents: Record<string, string> | null;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface News {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: "berita" | "pengumuman" | "agenda";
  image_url: string;
  cover_image_position: "top" | "center" | "bottom";
  writer_name: string;
  editor_name: string;
  author_id: string | null;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface Gallery {
  id: string;
  title: string;
  description: string;
  media_type: "foto" | "video";
  url: string;
  thumbnail_url: string;
  category: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  name: string;
  position: string;
  photo_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Facility {
  id: string;
  name: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author_id: string | null;
  category: string;
  image_url: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  activity_date: string;
  activity_type: "kajian" | "peringatan" | "lomba" | "upacara" | "ekskul" | "umum";
  location: string;
  image_url: string;
  is_published: boolean;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  year: number;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}