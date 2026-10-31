import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import AutomationClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Otomatisasi & Alert",
};

export default async function AutomationPage() {
  const supabase = await createClient();

  const [rulesRes, eventsRes] = await Promise.all([
    supabase
      .from("alert_rules")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("alert_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  type RuleRow = {
    id: string;
    name: string;
    metric_key: string;
    comparator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
    threshold: number;
    enabled: boolean;
    channel: "webhook" | "whatsapp" | "telegram";
    recipients: string[];
    cooldown_minutes: number;
    created_at: string;
  };

  type EventRow = {
    id: string;
    rule_name: string;
    metric_key: string;
    observed_value: number;
    message: string;
    delivered_at: string | null;
    delivery_status: string;
    delivery_error: string;
    created_at: string;
  };

  return (
    <AutomationClientPage
      initialRules={(rulesRes.data || []) as RuleRow[]}
      initialEvents={(eventsRes.data || []) as EventRow[]}
    />
  );
}
