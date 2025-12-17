import { DefaultSeoProps } from "next-seo";

const SEO_CONFIG: DefaultSeoProps = {
  titleTemplate: "%s | Pamphlets",
  defaultTitle: "Pamphlets - Expert Articles on Career, Academic & Religious Topics",
  description:
    "Discover insightful articles on Career, Academic, Religious topics and more. Expert-written pamphlets to guide your journey. Read curated content from experts and community members.",
  canonical: "https://pamphlets.vercel.app",
  languageAlternates: [
    {
      hrefLang: "en-US",
      href: "https://pamphlets.vercel.app",
    },
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pamphlets.vercel.app",
    siteName: "Pamphlets",
    title: "Pamphlets - Expert Articles on Career, Academic & Religious Topics",
    description:
      "Discover insightful articles on Career, Academic, Religious topics and more. Expert-written pamphlets to guide your journey.",
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
    {
      name: "keywords",
      content:
        "articles, career advice, academic resources, religious education, expert content, pamphlets, guides, learning, knowledge",
    },
    {
      httpEquiv: "x-ua-compatible",
      content: "IE=edge",
    },
    {
      name: "mobile-web-app-capable",
      content: "yes",
    },
    {
      name: "apple-mobile-web-app-capable",
      content: "yes",
    },
    {
      name: "apple-mobile-web-app-status-bar-style",
      content: "default",
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
    {
      rel: "alternate",
      href: "https://pamphlets.vercel.app",
      hrefLang: "en-US",
    },
  ],
};

export default SEO_CONFIG;
