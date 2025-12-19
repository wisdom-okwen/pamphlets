import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { DefaultSeo } from "next-seo";
import SEO_CONFIG from "@/config/seo.config";
import { trpc } from "@/lib/trpc";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NavBarProvider, useNavBarActions } from "@/contexts/NavBarContext";
import { AuthGuard } from "@/components/AuthGuard";
import NavBar from "@/components/NavBar";
import { Sidebar } from "@/components/Sidebar";
import { Chatbot } from "@/components/Chatbot";
import { Source_Serif_4, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Map routes to page titles
const getPageTitle = (pathname: string): string => {
  const titles: Record<string, string> = {
    "/": "Home",
    "/login": "Login",
    "/signup": "Sign Up",
    "/forgot-password": "Forgot Password",
    "/reset-password": "Reset Password",
    "/profile": "Profile",
    "/bookmarks": "My Bookmarks",
    "/comments": "My Comments",
    "/settings": "Settings",
    "/admin": "Admin",
    "/admin/articles/new": "New Article",
  };
  return titles[pathname] || "";
};

function AppContent({ Component, pageProps, router }: AppProps) {
  const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/callback", "/signout"];
  const isAuthPage = authRoutes.includes(router.pathname);
  const { actions } = useNavBarActions();

  const pagesWithOwnHeader: string[] = [];
  const hasOwnHeader = pagesWithOwnHeader.includes(router.pathname);

  const showSidebar = !isAuthPage;

  return (
    <>
      <DefaultSeo {...SEO_CONFIG} />

      {showSidebar && <Sidebar />}

      <div className={showSidebar ? "lg:pl-64" : ""}>
        {!hasOwnHeader && <NavBar title={getPageTitle(router.pathname)} hideAuth={showSidebar} actions={actions} />}
        <Component {...pageProps} />
      </div>

      <Chatbot />
    </>
  );
}

function App(props: AppProps) {
  return (
    <div className={`${sourceSerif.variable} ${inter.variable}`}>
      <AuthProvider>
        <ThemeProvider>
          <NavBarProvider>
            <AuthGuard>
              <AppContent {...props} />
            </AuthGuard>
          </NavBarProvider>
        </ThemeProvider>
      </AuthProvider>
      <Analytics />
    </div>
  );
}

export default trpc.withTRPC(App);
