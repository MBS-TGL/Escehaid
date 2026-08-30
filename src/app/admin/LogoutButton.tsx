"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SignOut } from "@/components/Icons";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-xl border border-[#dce3ed] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600"
    >
      <SignOut className="h-4 w-4" />
      Keluar
    </button>
  );
}
