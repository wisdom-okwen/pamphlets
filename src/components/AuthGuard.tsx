import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes that don't require authentication
const publicRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/callback",
  "/signout",
];

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const isPublicRoute = publicRoutes.includes(router.pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!user && !isPublicRoute) {
      router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
    }

    if (user && isPublicRoute && router.pathname !== "/signout" && router.pathname !== "/callback") {
      router.replace("/");
    }
  }, [user, isLoading, isPublicRoute, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
