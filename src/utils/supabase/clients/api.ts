import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { type NextApiRequest, type NextApiResponse } from "next";

/**
 * Creates a Supabase client for API routes (for auth only)
 */
export default function createApiClient(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name];
        },
        set(name: string, value: string, options: CookieOptions) {
          res.setHeader("Set-Cookie", `${name}=${value}; Path=/; ${options.maxAge ? `Max-Age=${options.maxAge};` : ""} ${options.httpOnly ? "HttpOnly;" : ""} ${options.secure ? "Secure;" : ""} SameSite=Lax`);
        },
        remove(name: string, options: CookieOptions) {
          res.setHeader("Set-Cookie", `${name}=; Path=/; Max-Age=0`);
        },
      },
    }
  );
}

/**
 * Creates a Supabase admin client with service role key
 * This bypasses RLS - use only on the server side!
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
