import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { DefaultSeo } from "next-seo";
import SEO_CONFIG from "@/config/seo.config";
import { trpc } from "@/lib/trpc";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import NavBar from "@/components/NavBar";
import { Sidebar } from "@/components/Sidebar";
import { Source_Serif_4, Inter } from "next/font/google";

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
    "/favorites": "My Favorites",
    "/comments": "My Comments",
    "/settings": "Settings",
    "/assistant": "AI Assistant",
    "/admin": "Admin",
    "/admin/articles/new": "New Article",
  };
  return titles[pathname] || "";
};

function AppContent({ Component, pageProps, router }: AppProps) {
  const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/callback", "/signout"];
  const isAuthPage = authRoutes.includes(router.pathname);

  const pagesWithOwnHeader = ["/admin/articles/new"];
  const hasOwnHeader = pagesWithOwnHeader.includes(router.pathname);

  const showSidebar = !isAuthPage;

  return (
    <>
      <DefaultSeo {...SEO_CONFIG} />

      {showSidebar && <Sidebar />}

      <div className={showSidebar ? "lg:pl-64" : ""}>
        {!hasOwnHeader && <NavBar title={getPageTitle(router.pathname)} hideAuth={showSidebar} />}
        <Component {...pageProps} />
      </div>
    </>
  );
}

function App(props: AppProps) {
  return (
    <div className={`${sourceSerif.variable} ${inter.variable}`}>
      <AuthProvider>
        <ThemeProvider>
          <AppContent {...props} />
        </ThemeProvider>
      </AuthProvider>
    </div>
  );
}

export default trpc.withTRPC(App);
