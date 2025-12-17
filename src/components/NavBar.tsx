import React from "react";
import { useRouter } from "next/router";
import { Sun, Moon, Archive, ArrowLeft, User, LogIn } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";

export default function NavBar({
  title,
  onArchive,
  backHref,
  hideAuth,
}: {
  title?: string;
  onArchive?: () => void;
  backHref?: string;
  hideAuth?: boolean;
}) {
  const router = useRouter();
  const { theme, toggle, mounted } = useTheme();
  const { user } = useAuth();

  const computedTitle =
    title || (router.pathname === "/" ? "Home" : router.pathname.replace("/", " "));

  return (
    <header className="w-full border-b bg-white dark:bg-black/90 dark:border-zinc-800">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-[60px] flex items-center">
        {/* Left: Logo / Back button */}
        <div className="flex items-center gap-2 w-1/3">
          {backHref ? (
            <button
              onClick={() => router.push(backHref)}
              aria-label="back"
              className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
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

        {/* Right: Theme toggle, auth & actions */}
        <div className="flex items-center gap-2 w-1/3 justify-end">
          {onArchive ? (
            <button
              onClick={onArchive}
              className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Archive"
            >
              <Archive size={16} />
            </button>
          ) : null}

          {/* Theme toggle - only render after mount to avoid hydration mismatch */}
          {mounted ? (
            <button
              onClick={toggle}
              aria-label="toggle-theme"
              className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          ) : (
            <div className="p-2 w-8 h-8" />
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
