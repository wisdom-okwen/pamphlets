import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { DefaultSeo } from "next-seo";
import SEO_CONFIG from "@/config/seo.config";
import { trpc } from "@/lib/trpc";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
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

function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${sourceSerif.variable} ${inter.variable}`}>
      <AuthProvider>
        <ThemeProvider>
          <DefaultSeo {...SEO_CONFIG} />
          <Component {...pageProps} />
        </ThemeProvider>
      </AuthProvider>
    </div>
  );
}

export default trpc.withTRPC(App);
