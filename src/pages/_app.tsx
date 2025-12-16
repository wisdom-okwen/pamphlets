import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { DefaultSeo } from "next-seo";
import SEO_CONFIG from "@/config/seo.config";
import { trpc } from "@/lib/trpc";
import { AuthProvider } from "@/contexts/AuthContext";

function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <DefaultSeo {...SEO_CONFIG} />
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default trpc.withTRPC(App);
