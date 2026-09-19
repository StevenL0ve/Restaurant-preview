// Cloud configuration reader (Phase 2). Reads the publishable Supabase values
// from the build env. When they're absent the app runs fully on-device (current
// behavior); when present, the data layer can sync to Supabase. The heavy
// @supabase/supabase-js client is wired in the step where sync is implemented,
// so dormant builds stay lean.

interface CloudConfig {
  url: string;
  anonKey: string;
}

export function cloudConfig(): CloudConfig | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (url && anonKey) return { url, anonKey };
  return null;
}

export function isCloudConfigured(): boolean {
  return cloudConfig() !== null;
}
