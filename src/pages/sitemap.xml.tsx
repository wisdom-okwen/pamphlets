import { GetServerSideProps } from "next";

// Generate dynamic sitemap
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pamphlets.com";

  // Static pages
  const staticPages = ["", "/about", "/contact"];

  // TODO: Fetch dynamic pages from database
  // const articles = await db.query.articles.findMany({
  //   where: eq(articles.status, "published"),
  //   columns: { slug: true, updatedAt: true },
  // });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page === "" ? "daily" : "weekly"}</changefreq>
    <priority>${page === "" ? "1.0" : "0.8"}</priority>
  </url>`
    )
    .join("")}
</urlset>`;

  res.setHeader("Content-Type", "text/xml");
  res.write(sitemap);
  res.end();

  return { props: {} };
};

// Default export to prevent Next.js errors
export default function Sitemap() {
  return null;
}
