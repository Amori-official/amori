"use client";

import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

interface Props {
  initialUser: User | null;
  children: React.ReactNode;
}

export default function AuthProvider({ initialUser, children }: Props) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    setUser(initialUser);

    const supabase = createClient();
    if (!supabase) return; // Supabase 미설정 시 스킵

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [initialUser, setUser]);

  return <>{children}</>;
}
