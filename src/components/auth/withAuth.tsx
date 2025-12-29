import { useEffect, type ComponentType } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Higher-Order Component to protect routes that require authentication
 */
export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options?: {
    redirectTo?: string;
    requireAdmin?: boolean;
    requireAuthor?: boolean;
  }
) {
  const { redirectTo = "/login", requireAdmin = false, requireAuthor = false } = options || {};

  return function WithAuthComponent(props: P) {
    const { user, isLoading, isRoleLoading, isAdmin, role } = useAuth();
    const router = useRouter();

    const isAuthorOrAdmin = role === "author" || role === "admin";
    const needsRoleCheck = requireAdmin || requireAuthor;

    useEffect(() => {
      if (!isLoading && !user) {
        // Include the current path as redirectTo param
        router.push(`${redirectTo}?redirectTo=${encodeURIComponent(router.asPath)}`);
      }
    }, [user, isLoading, router]);

    // Redirect non-admins if admin is required (wait for role to load first)
    useEffect(() => {
      if (!isLoading && !isRoleLoading && user && requireAdmin && !isAdmin) {
        router.push("/");
      }
    }, [user, isLoading, isRoleLoading, isAdmin, router]);

    // Redirect non-authors/non-admins if author is required
    useEffect(() => {
      if (!isLoading && !isRoleLoading && user && requireAuthor && !isAuthorOrAdmin) {
        router.push("/");
      }
    }, [user, isLoading, isRoleLoading, isAuthorOrAdmin, router]);

    // Show loading state while checking auth or role
    if (isLoading || (needsRoleCheck && isRoleLoading)) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </main>
      );
    }

    // Don't render the protected component if not authenticated
    if (!user) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </main>
      );
    }

    // Don't render if admin required but user is not admin
    if (requireAdmin && !isAdmin) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </main>
      );
    }

    // Don't render if author required but user is not author or admin
    if (requireAuthor && !isAuthorOrAdmin) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </main>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Higher-Order Component to redirect authenticated users away from auth pages
 */
export function withGuest<P extends object>(
  WrappedComponent: ComponentType<P>,
  options?: {
    redirectTo?: string;
  }
) {
  const { redirectTo = "/" } = options || {};

  return function WithGuestComponent(props: P) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && user) {
        router.push(redirectTo);
      }
    }, [user, isLoading, router]);

    // Show loading state while checking auth
    if (isLoading) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </main>
      );
    }

    // User is authenticated, show loading while redirecting
    if (user) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </main>
      );
    }

    // User is not authenticated, render the wrapped component
    return <WrappedComponent {...props} />;
  };
}
