import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { WORKSPACE_OWNER_ID } from "@/lib/workspace";

export const useAuth = () => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const resolveRole = async (u: User | null) => {
      if (!u) {
        if (active) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      setIsAdmin(!!data);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthUser(session?.user ?? null);
      // Defer the Supabase call out of the auth callback.
      setTimeout(() => resolveRole(session?.user ?? null), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthUser(session?.user ?? null);
      resolveRole(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Admins operate inside the owner's workspace, so every query/insert that
  // uses `user.id` is transparently scoped to the shared content.
  const user: User | null =
    authUser && isAdmin && authUser.id !== WORKSPACE_OWNER_ID
      ? ({ ...authUser, id: WORKSPACE_OWNER_ID } as User)
      : authUser;

  return { user, authUser, isAdmin, session, loading, signOut };
};
