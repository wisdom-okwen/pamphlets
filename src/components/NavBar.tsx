import React from "react";
import { useRouter } from "next/router";
import { Sun, Moon, Archive, ArrowLeft } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export default function NavBar({
  title,
  onArchive,
  backHref,
}: {
  title?: string;
  onArchive?: () => void;
  backHref?: string;
}) {
  const router = useRouter();
  const { theme, toggle, mounted } = useTheme();

  const computedTitle =
    title || (router.pathname === "/" ? "Home" : router.pathname.replace("/", " "));

  return (
    <header className="w-full border-b bg-white dark:bg-black/90 dark:border-zinc-800">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center">
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
            <span className="text-lg font-bold tracking-tight">Pamphlets</span>
          )}
        </div>

        {/* Center: Page title */}
        <h1 className="text-lg font-bold text-center w-1/3">{computedTitle}</h1>

        {/* Right: Theme toggle & actions */}
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

          {/* Only render theme toggle after mount to avoid hydration mismatch */}
          {mounted ? (
            <button
              onClick={toggle}
              aria-label="toggle-theme"
              className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          ) : (
            <div className="p-2 w-8 h-8" /> // placeholder to prevent layout shift
          )}
        </div>
      </div>
    </header>
  );
}
