import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { createClient } from "@/utils/supabase/clients/browser";
import type { User, Session } from "@supabase/supabase-js";

type UserRole = "admin" | "author" | "visitor";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Helper function to check if user exists and sign out if not
  const checkUserExists = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      console.log("User deleted, signing out...");
      await supabase.auth.signOut({ scope: 'global' });
      setUser(null);
      setSession(null);
      setRole(null);
      return false;
    }
    return true;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log("Auth state changed:", _event, !!newSession);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Periodic check to ensure user still exists (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkUserExists(user.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [user, supabase]);

  // Effect 2: Fetch role when user changes
  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }

    const fetchRole = async () => {
      console.log("Fetching role for user:", user.id);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        console.log("Role query result:", { data, error });

        if (error) {
          console.error("Error fetching role:", error);
          if (error.code === "PGRST116") {
            console.log("User not found in database, signing out...");
            await supabase.auth.signOut({ scope: 'global' });
            setUser(null);
            setSession(null);
          }
          setRole(null);
        } else {
          setRole(data?.role as UserRole ?? null);
        }
      } catch (err) {
        console.error("Exception fetching role:", err);
        setRole(null);
      }
    };

    fetchRole();
  }, [user, supabase]);

  const signOut = async () => {
    console.log("Signing out...");
    setUser(null);
    setSession(null);
    setRole(null);
    
    await supabase.auth.signOut({ scope: 'global' });
    
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider value={{ user, session, isLoading, role, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
