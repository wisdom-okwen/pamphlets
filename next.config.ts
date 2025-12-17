import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*.supabase.co",
                pathname: "/storage/v1/object/public/**",
            },
            {
                protocol: "https",
                hostname: "swxptmwmrpltcduzmvit.supabase.co",
            },
            {
                protocol: "https",
                hostname: "insanelygoodrecipes.com",
            },
            {
                protocol: "https",
                hostname: "**.com",
            },
            {
                protocol: "https",
                hostname: "**.co",
            },
            {
                protocol: "https",
                hostname: "**.org",
            },
            {
                protocol: "https",
                hostname: "**.io",
            },
        ],
    },
};

export default nextConfig;
