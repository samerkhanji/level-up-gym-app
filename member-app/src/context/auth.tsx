import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

type MemberProfile = {
  id: string;
  full_name: string;
  photo_url: string | null;
  status: 'active' | 'blocked';
  balance_due_usd: number;
  home_branch_id: string | null;
};

type AuthState = {
  session: Session | null;
  member: MemberProfile | null;
  loading: boolean;
  refreshMember: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  member: null,
  loading: true,
  refreshMember: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMember() {
    const { data } = await supabase
      .from('members')
      .select('id, full_name, photo_url, status, balance_due_usd, home_branch_id')
      .maybeSingle();
    setMember((data as MemberProfile) ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadMember().finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadMember();
      else setMember(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        member,
        loading,
        refreshMember: loadMember,
        signOut: () => supabase.auth.signOut().then(() => {}),
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
