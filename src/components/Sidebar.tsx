import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Home,
  Heart,
  MessageCircle,
  Settings,
  Bot,
  Shield,
  Menu,
  X,
  LogOut,
  LogIn,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal, useAuthModal } from "@/components/AuthModal";
import Image from "next/image";

// Home is accessible to everyone
const publicNavItems = [
  { href: "/", label: "Home", icon: Home, requiresAuth: false },
];

// These require authentication
const protectedNavItems = [
  { href: "/favorites", label: "My Favorites", icon: Heart, action: "view your favorites" },
  { href: "/comments", label: "My Comments", icon: MessageCircle, action: "view your comments" },
  { href: "/settings", label: "Settings", icon: Settings, action: "access settings" },
  { href: "/assistant", label: "AI Assistant", icon: Bot, action: "use the AI assistant" },
];

const adminItems = [
  { href: "/admin", label: "Admin", icon: Shield },
];

export function Sidebar() {
  const router = useRouter();
  const { user, signOut, isAdmin, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { isOpen: isAuthModalOpen, action, openModal, closeModal } = useAuthModal();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const handleProtectedClick = (e: React.MouseEvent, item: { href: string; action: string }) => {
    if (!user) {
      e.preventDefault();
      setIsOpen(false);
      openModal(item.action);
    } else {
      setIsOpen(false);
    }
  };

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 h-[61px] flex items-center border-b dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
          <Image
            src="/pamphlets.svg"
            alt="Pamphlets"
            width={28}
            height={28}
            className="dark:invert dark:brightness-200"
          />
          <span className="font-bold text-lg leading-none">Pamphlets</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {/* Public nav items (Home) */}
        {publicNavItems.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Protected nav items - show to everyone but require auth */}
        {protectedNavItems.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={user ? item.href : "#"}
              onClick={(e) => handleProtectedClick(e, item)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Admin section - only show for admins */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <span className="px-3 text-xs font-semibold uppercase text-muted-foreground">
                Admin
              </span>
            </div>
            {adminItems.map((item) => {
              const isActive = router.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t dark:border-zinc-800">
        {user ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.user_metadata?.username || user.email?.split("@")[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                <User size={20} className="text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Guest</p>
                <p className="text-xs text-muted-foreground">Not signed in</p>
              </div>
            </div>
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors justify-center"
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={closeModal} action={action} />
      
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-3 left-4 z-40 p-2 rounded-lg bg-white dark:bg-zinc-900 border dark:border-zinc-800 shadow-sm"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-white dark:bg-zinc-950 border-r dark:border-zinc-800">
        {navContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-zinc-950 shadow-xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
