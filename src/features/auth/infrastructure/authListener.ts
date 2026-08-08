import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/shared/infrastructure/supabase/client';

// Small stable shape mirroring the fields the app actually reads off Firebase's
// User object, so every other file that does `user.uid`/`user.displayName`/
// `user.photoURL` needed no changes when auth moved to Supabase.
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

function toAuthUser(supabaseUser: SupabaseUser | null | undefined): User | null {
  if (!supabaseUser) return null;
  const metadata = supabaseUser.user_metadata || {};
  return {
    uid: supabaseUser.id,
    email: supabaseUser.email ?? null,
    displayName: metadata.full_name || metadata.name || null,
    photoURL: metadata.avatar_url || metadata.picture || null,
  };
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(toAuthUser(session?.user));
  });
  return () => data.subscription.unsubscribe();
}

// redirectTo is the current page (not just the origin) so the user lands back
// where they started instead of always being dropped on the homepage — the
// wildcard entries in supabase/config.toml's additional_redirect_urls allow this.
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  });
  if (error) throw error;
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
