import { supabase, supabaseConfigError } from "./supabaseClient";

export async function getCurrentUser() {
  if (!supabase) {
    return { user: null, error: supabaseConfigError };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error?.message.toLowerCase().includes("auth session missing")) {
    return { user: null, error: "" };
  }

  return { user: data.user ?? null, error: error?.message || "" };
}

export async function signOut() {
  if (!supabase) {
    return { error: supabaseConfigError };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error?.message || "" };
}
