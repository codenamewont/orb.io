import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
export const supabase =
  typeof url === "string" &&
  url.length > 0 &&
  typeof key === "string" &&
  key.length > 0
    ? createClient(url, key)
    : null;
