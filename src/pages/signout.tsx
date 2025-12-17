import { useEffect } from "react";
import { createClient, resetClient } from "@/utils/supabase/clients/browser";

export default function SignOutPage() {
  useEffect(() => {
    const performSignOut = async () => {
      try {
        const supabase = createClient();
        
        await supabase.auth.signOut({ scope: 'global' });
        
        resetClient();
        
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
      } catch (err) {
        console.error("Sign out error:", err);
      }
      
      window.location.href = "/";
    };

    performSignOut();
  }, []);

  // Show a brief loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Signing out...</p>
    </div>
  );
}
