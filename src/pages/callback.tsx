import { useEffect } from "react";
import { useRouter } from "next/router";
import { createClient } from "@/utils/supabase/clients/browser";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();

      // The auth callback is handled automatically by Supabase
      // We just need to wait for the session to be established
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        router.push("/auth/login?error=callback_failed");
        return;
      }

      if (data.session) {
        // Successfully authenticated, redirect to home
        router.push("/");
      } else {
        // No session, redirect to login
        router.push("/auth/login");
      }
    };

    // Wait for the URL hash to be processed
    handleCallback();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Completing sign in...</p>
    </main>
  );
}
