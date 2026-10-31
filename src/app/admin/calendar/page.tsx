import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import CalendarClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Kalender Redaksi",
};

export default async function CalendarPage() {
  const supabase = await createClient();

  const [newsRes, articlesRes, agendaRes, wavesRes] = await Promise.all([
    supabase
      .from("news")
      .select("id, title, published_at, is_published")
      .not("published_at", "is", null)
      .limit(60),
    supabase
      .from("articles")
      .select("id, title, published_at, is_published")
      .not("published_at", "is", null)
      .limit(60),
    supabase
      .from("agenda_events")
      .select("id, title, event_date")
      .limit(60),
    supabase
      .from("spmb_waves")
      .select("id, name, start_date, end_date")
      .limit(20),
  ]);

  const events: {
    id: string;
    title: string;
    date: string;
    type: "news" | "article" | "agenda" | "spmb";
    href: string;
  }[] = [];

  for (const n of ((newsRes.data || []) as { id: string; title: string; published_at: string | null }[])) {
    if (n.published_at) {
      events.push({
        id: `news-${n.id}`,
        title: n.title,
        date: n.published_at.slice(0, 10),
        type: "news",
        href: "/admin/news",
      });
    }
  }

  for (const a of ((articlesRes.data || []) as { id: string; title: string; published_at: string | null }[])) {
    if (a.published_at) {
      events.push({
        id: `art-${a.id}`,
        title: a.title,
        date: a.published_at.slice(0, 10),
        type: "article",
        href: "/admin/articles",
      });
    }
  }

  for (const ag of ((agendaRes.data || []) as { id: string; title: string; event_date: string | null }[])) {
    if (ag.event_date) {
      events.push({
        id: `agenda-${ag.id}`,
        title: ag.title,
        date: ag.event_date.slice(0, 10),
        type: "agenda",
        href: "/admin/agenda",
      });
    }
  }

  for (const w of ((wavesRes.data || []) as { id: string; name: string; start_date: string | null }[])) {
    if (w.start_date) {
      events.push({
        id: `wave-${w.id}`,
        title: `Buka: ${w.name}`,
        date: w.start_date.slice(0, 10),
        type: "spmb",
        href: "/admin/admission",
      });
    }
  }

  return <CalendarClientPage initialEvents={events} />;
}
