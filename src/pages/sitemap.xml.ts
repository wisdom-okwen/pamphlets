import { GetServerSideProps } from "next";

function generateSiteMap(articles: any[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://pamphlets.vercel.app</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>weekly</changefreq>
       <priority>1.0</priority>
     </url>
     <url>
       <loc>https://pamphlets.vercel.app/bookmarks</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>weekly</changefreq>
       <priority>0.8</priority>
     </url>
     <url>
       <loc>https://pamphlets.vercel.app/comments</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>weekly</changefreq>
       <priority>0.8</priority>
     </url>
     ${articles
       .map(({ slug, updatedAt }: any) => {
         return `
       <url>
           <loc>${`https://pamphlets.vercel.app/articles/${slug}`}</loc>
           <lastmod>${new Date(updatedAt).toISOString()}</lastmod>
           <changefreq>weekly</changefreq>
           <priority>0.9</priority>
       </url>
     `;
       })
       .join("")}
   </urlset>
 `;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    // Fetch articles from the public API
    const response = await fetch("https://pamphlets.vercel.app/api/trpc/articles.getAll?input=%7B%22limit%22%3A1000%7D", {
      headers: {
        "User-Agent": "SitemapGenerator/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`API response: ${response.status}`);
    }

    const data = await response.json();
    const articles = data.result?.data?.items || [];

    const sitemap = generateSiteMap(articles);

    res.setHeader("Content-Type", "text/xml");
    res.write(sitemap);
    res.end();

    return {
      props: {},
    };
  } catch (error) {
    console.error("Error generating sitemap:", error);
    
    // Return basic sitemap on error
    const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://pamphlets.vercel.app</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>weekly</changefreq>
       <priority>1.0</priority>
     </url>
   </urlset>`;
    
    res.setHeader("Content-Type", "text/xml");
    res.write(basicSitemap);
    res.end();

    return {
      props: {},
    };
  }
};

export default function SiteMap() {
  return null;
}
