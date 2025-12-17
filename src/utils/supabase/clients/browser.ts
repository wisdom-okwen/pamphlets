import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser/client-side usage
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

/**
 * @deprecated No longer needed - each component manages its own client via useMemo
 */
export function resetClient() {
  // No-op for backwards compatibility
}
