import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Sun, Moon, Archive, ArrowLeft, User, LogIn, Bell, Info, X, Sparkles, Heart, Users, PenTool, MessageCircle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/clients/browser";
import { trpc } from "@/lib/trpc";

export default function NavBar({
  title,
  onArchive,
  backHref,
  hideAuth,
  actions,
}: {
  title?: string;
  onArchive?: () => void;
  backHref?: string;
  hideAuth?: boolean;
  actions?: ReactNode;
}) {
  const router = useRouter();
  const { theme, toggle, mounted } = useTheme();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const utils = trpc.useUtils();
  const isUserReady = mounted && user !== undefined;
  const [showAbout, setShowAbout] = useState(false);

  const { data: unreadCountData } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    {
      enabled: !!user && isUserReady,
      refetchInterval: 30000,
    }
  );

  // Setup realtime subscription for notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          utils.notifications.getUnreadCount.invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, utils]);

  const computedTitle =
    title || (router.pathname === "/" ? "Home" : router.pathname.replace("/", " "));

  return (
    <>
      <header className="w-full sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 pr-16 lg:pr-8 h-15 flex items-center">
        {/* Left: Logo / Back button */}
        <div className="flex items-center gap-2 w-1/3">
          {backHref ? (
            <button
              onClick={() => router.push(backHref)}
              aria-label="back"
              className="p-2.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 touch-manipulation"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            hideAuth ? (
              <div className="w-7 h-7" />
            ) : (
              <Image
                src="/pamphlets.svg"
                alt="Pamphlets"
                width={28}
                height={28}
                className="cursor-pointer dark:invert dark:brightness-200"
                onClick={() => router.push("/")}
              />
            )
          )}
        </div>

        {/* Center: Page title */}
        <h1 className="text-lg font-bold text-center w-1/3">{computedTitle}</h1>

        {/* Right: Notifications, Theme toggle, About */}
        <div className="flex items-center gap-2 w-1/3 justify-end">
          {actions}

          {onArchive ? (
            <button
              onClick={onArchive}
              className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Archive"
            >
              <Archive size={16} />
            </button>
          ) : null}

          {isUserReady && user && (
            <Link
              href="/notifications"
              className="p-2.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 relative touch-manipulation"
              title="Notifications"
            >
              <Bell size={16} />
              {(unreadCountData || 0) > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-5">
                  {(unreadCountData || 0) > 99 ? "99+" : unreadCountData || 0}
                </span>
              )}
            </Link>
          )}

          {/* About button */}
          <button
            onClick={() => setShowAbout(true)}
            aria-label="About"
            className="p-2.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 touch-manipulation"
            title="About"
          >
            <Info size={16} />
          </button>

          {/* Theme toggle - only render after mount to avoid hydration mismatch */}
          {mounted ? (
            <button
              onClick={toggle}
              aria-label="toggle-theme"
              className="p-2.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 touch-manipulation"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          ) : (
            <div className="p-2.5 w-9 h-9" />
          )}

          {/* Auth: Login button or Profile avatar. Hidden when `hideAuth` true (sidebar shows auth controls) */}
          {!hideAuth && mounted && (
            user ? (
              <Link
                href="/profile"
                className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600 transition-all"
              >
                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center rounded-full">
                    <User size={16} className="text-zinc-600 dark:text-zinc-300" />
                  </div>
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors touch-manipulation"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )
          )}
        </div>
      </div>
    </header>

    {/* About Modal */}
    {showAbout && (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={() => setShowAbout(false)}
      >
        <div 
          className="bg-background text-foreground rounded-2xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button 
            onClick={() => setShowAbout(false)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/pamphlets.svg"
              alt="Pamphlets Logo"
              className="size-10"
            />
            <span className="text-2xl font-bold">Pamphlets</span>
          </div>
          <p className="text-muted-foreground text-sm mb-6">Read and share personal writings on anything</p>

          {/* Content */}
          <h2 className="text-xl font-bold mb-3">
            Start writing.<br />Share your voice.
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Join a community of writers and readers sharing personal writeups, free writings, and thoughts on anything that inspires them.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Sparkles className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Free Expression</h3>
                <p className="text-muted-foreground text-xs">Write about anything - no topic restrictions</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                <Heart className="size-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Personal Writings</h3>
                <p className="text-muted-foreground text-xs">Share your thoughts, stories, and ideas</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Community</h3>
                <p className="text-muted-foreground text-xs">Connect with others who love to read and write</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <PenTool className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Become an Author</h3>
                <p className="text-muted-foreground text-xs">Sign up to create and publish your own pamphlets</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <MessageCircle className="size-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Chatbot</h3>
                <p className="text-muted-foreground text-xs">Chat with AI to get help, brainstorm ideas, or ask questions</p>
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
            <p className="text-muted-foreground text-xs italic">
              &quot;Start writing, no matter what. The water does not flow until the faucet is turned on.&quot;
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">— Louis L&apos;Amour</p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
