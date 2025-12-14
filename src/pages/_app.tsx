import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { DefaultSeo } from "next-seo";
import SEO_CONFIG from "@/config/seo.config";
import { trpc } from "@/lib/trpc";

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <DefaultSeo {...SEO_CONFIG} />
      <Component {...pageProps} />
    </>
  );
}

export default trpc.withTRPC(App);
