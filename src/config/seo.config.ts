import { DefaultSeoProps } from "next-seo";

const SEO_CONFIG: DefaultSeoProps = {
    titleTemplate: "%s | Pamphlets",
    defaultTitle: "Pamphlets - Read & Share Personal Writings",
    description:
        "A platform for reading and posting personal writeups, free writings, and thoughts on anything. Share your stories and discover writings from others.",
    canonical: "https://pamflets.vercel.app",
    languageAlternates: [
        {
            hrefLang: "en-US",
            href: "https://pamflets.vercel.app",
        },
    ],
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://pamflets.vercel.app",
        siteName: "Pamphlets",
        title: "Pamphlets - Read & Share Personal Writings",
        description:
            "A platform for reading and posting personal writeups, free writings, and thoughts on anything.",
        images: [
            {
                url: "https://pamflets.vercel.app/pamphlets.png",
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
                "pamphlets, personal writings, free writing, blog, stories, thoughts, creative writing, sharing",
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
        {
            name: "google-site-verification",
            content: "X5NeDfA5p10G_SOucGsO4nGnKNJYaabWuxCfBedSaVY",
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
            href: "https://pamflets.vercel.app",
            hrefLang: "en-US",
        },
    ],
};

export default SEO_CONFIG;
