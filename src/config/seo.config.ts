import { DefaultSeoProps } from "next-seo";

const SEO_CONFIG: DefaultSeoProps = {
  titleTemplate: "%s | Pamphlets",
  defaultTitle: "Pamphlets",
  description:
    "Discover insightful articles on Career, Academic, Religious topics and more. Expert-written pamphlets to guide your journey.",
  canonical: "https://pamphlets.vercel.app",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pamphlets.vercel.app",
    siteName: "Pamphlets",
    title: "Pamphlets",
    description:
      "Discover insightful articles on Career, Academic, Religious topics and more.",
    images: [
      {
        url: "https://pamphlets.vercel.app/pamphlets.png",
        width: 1200,
        height: 630,
        alt: "Pamphlets",
        type: "image/png",
      },
    ],
  },
  twitter: {
    handle: "@pamphlets",
    site: "@pamphlets",
    cardType: "summary_large_image",
  },
  additionalMetaTags: [
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1",
    },
    {
      name: "theme-color",
      content: "#05486fff",
    },
    {
      name: "author",
      content: "Pamphlets",
    },
  ],
  additionalLinkTags: [
    {
      rel: "icon",
      href: "/pamphlets.png",
    },
    {
      rel: "apple-touch-icon",
      href: "/pamphlets.png",
      sizes: "180x180",
    },
    {
      rel: "manifest",
      href: "/manifest.json",
    },
  ],
};

export default SEO_CONFIG;
