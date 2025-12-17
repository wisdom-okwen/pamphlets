// Genre color mapping - each genre gets a unique background color
export const genreColors: Record<string, string> = {
    // Creative & Writing
    fiction:
        "bg-purple-200 text-purple-900 dark:bg-purple-800/40 dark:text-purple-200",
    nonfiction:
        "bg-blue-200 text-blue-900 dark:bg-blue-800/40 dark:text-blue-200",
    "creative-writing":
        "bg-pink-200 text-pink-900 dark:bg-pink-800/40 dark:text-pink-200",
    "short-story":
        "bg-violet-200 text-violet-900 dark:bg-violet-800/40 dark:text-violet-200",
    poetry: "bg-fuchsia-200 text-fuchsia-900 dark:bg-fuchsia-800/40 dark:text-fuchsia-200",
    memoir: "bg-rose-200 text-rose-900 dark:bg-rose-800/40 dark:text-rose-200",
    "personal-essay":
        "bg-amber-200 text-amber-900 dark:bg-amber-800/40 dark:text-amber-200",

    // Opinion & News
    opinion:
        "bg-orange-200 text-orange-900 dark:bg-orange-800/40 dark:text-orange-200",
    journalism:
        "bg-slate-200 text-slate-900 dark:bg-slate-800/40 dark:text-slate-200",
    investigative:
        "bg-red-200 text-red-900 dark:bg-red-800/40 dark:text-red-200",
    news: "bg-sky-200 text-sky-900 dark:bg-sky-800/40 dark:text-sky-200",
    politics:
        "bg-indigo-200 text-indigo-900 dark:bg-indigo-800/40 dark:text-indigo-200",

    // Knowledge & Learning
    history:
        "bg-yellow-200 text-yellow-900 dark:bg-yellow-800/40 dark:text-yellow-200",
    philosophy:
        "bg-stone-200 text-stone-900 dark:bg-stone-800/40 dark:text-stone-200",
    society: "bg-teal-200 text-teal-900 dark:bg-teal-800/40 dark:text-teal-200",
    culture:
        "bg-emerald-200 text-emerald-900 dark:bg-emerald-800/40 dark:text-emerald-200",
    education:
        "bg-cyan-200 text-cyan-900 dark:bg-cyan-800/40 dark:text-cyan-200",

    // Arts & Entertainment
    art: "bg-lime-200 text-lime-900 dark:bg-lime-800/40 dark:text-lime-200",
    design: "bg-green-200 text-green-900 dark:bg-green-800/40 dark:text-green-200",
    architecture:
        "bg-zinc-200 text-zinc-900 dark:bg-zinc-800/40 dark:text-zinc-200",
    film: "bg-red-200 text-red-900 dark:bg-red-800/40 dark:text-red-200",
    television:
        "bg-blue-200 text-blue-900 dark:bg-blue-800/40 dark:text-blue-200",
    music: "bg-purple-200 text-purple-900 dark:bg-purple-800/40 dark:text-purple-200",
    theater: "bg-rose-200 text-rose-900 dark:bg-rose-800/40 dark:text-rose-200",
    literature:
        "bg-amber-200 text-amber-900 dark:bg-amber-800/40 dark:text-amber-200",
    books: "bg-orange-200 text-orange-900 dark:bg-orange-800/40 dark:text-orange-200",
    reviews:
        "bg-yellow-200 text-yellow-900 dark:bg-yellow-800/40 dark:text-yellow-200",
    interviews:
        "bg-pink-200 text-pink-900 dark:bg-pink-800/40 dark:text-pink-200",

    // Science & Tech
    science: "bg-cyan-200 text-cyan-900 dark:bg-cyan-800/40 dark:text-cyan-200",
    astronomy:
        "bg-indigo-200 text-indigo-900 dark:bg-indigo-800/40 dark:text-indigo-200",
    environment:
        "bg-green-200 text-green-900 dark:bg-green-800/40 dark:text-green-200",
    climate:
        "bg-emerald-200 text-emerald-900 dark:bg-emerald-800/40 dark:text-emerald-200",
    technology:
        "bg-blue-200 text-blue-900 dark:bg-blue-800/40 dark:text-blue-200",
    programming:
        "bg-violet-200 text-violet-900 dark:bg-violet-800/40 dark:text-violet-200",
    "ai-ml":
        "bg-fuchsia-200 text-fuchsia-900 dark:bg-fuchsia-800/40 dark:text-fuchsia-200",
    "data-science":
        "bg-sky-200 text-sky-900 dark:bg-sky-800/40 dark:text-sky-200",
    security: "bg-red-200 text-red-900 dark:bg-red-800/40 dark:text-red-200",

    // Business & Finance
    startups:
        "bg-orange-200 text-orange-900 dark:bg-orange-800/40 dark:text-orange-200",
    business:
        "bg-slate-200 text-slate-900 dark:bg-slate-800/40 dark:text-slate-200",
    finance:
        "bg-green-200 text-green-900 dark:bg-green-800/40 dark:text-green-200",
    economics:
        "bg-teal-200 text-teal-900 dark:bg-teal-800/40 dark:text-teal-200",
    marketing:
        "bg-pink-200 text-pink-900 dark:bg-pink-800/40 dark:text-pink-200",
    productivity:
        "bg-lime-200 text-lime-900 dark:bg-lime-800/40 dark:text-lime-200",

    // Health & Wellness
    health: "bg-red-200 text-red-900 dark:bg-red-800/40 dark:text-red-200",
    fitness:
        "bg-orange-200 text-orange-900 dark:bg-orange-800/40 dark:text-orange-200",
    wellness:
        "bg-teal-200 text-teal-900 dark:bg-teal-800/40 dark:text-teal-200",
    psychology:
        "bg-purple-200 text-purple-900 dark:bg-purple-800/40 dark:text-purple-200",
    sociology:
        "bg-blue-200 text-blue-900 dark:bg-blue-800/40 dark:text-blue-200",

    // Lifestyle
    parenting:
        "bg-pink-200 text-pink-900 dark:bg-pink-800/40 dark:text-pink-200",
    relationships:
        "bg-rose-200 text-rose-900 dark:bg-rose-800/40 dark:text-rose-200",
    travel: "bg-sky-200 text-sky-900 dark:bg-sky-800/40 dark:text-sky-200",
    food: "bg-amber-200 text-amber-900 dark:bg-amber-800/40 dark:text-amber-200",
    cooking:
        "bg-orange-200 text-orange-900 dark:bg-orange-800/40 dark:text-orange-200",
    fashion:
        "bg-fuchsia-200 text-fuchsia-900 dark:bg-fuchsia-800/40 dark:text-fuchsia-200",
    beauty: "bg-pink-200 text-pink-900 dark:bg-pink-800/40 dark:text-pink-200",
    photography:
        "bg-violet-200 text-violet-900 dark:bg-violet-800/40 dark:text-violet-200",
    gaming: "bg-indigo-200 text-indigo-900 dark:bg-indigo-800/40 dark:text-indigo-200",
    sports: "bg-green-200 text-green-900 dark:bg-green-800/40 dark:text-green-200",

    // How-to & Guides
    "diy-crafts":
        "bg-yellow-200 text-yellow-900 dark:bg-yellow-800/40 dark:text-yellow-200",
    "how-to":
        "bg-cyan-200 text-cyan-900 dark:bg-cyan-800/40 dark:text-cyan-200",
    guides: "bg-blue-200 text-blue-900 dark:bg-blue-800/40 dark:text-blue-200",

    // Other
    satire: "bg-amber-200 text-amber-900 dark:bg-amber-800/40 dark:text-amber-200",
    religion:
        "bg-stone-200 text-stone-900 dark:bg-stone-800/40 dark:text-stone-200",
    lgbtq: "bg-indigo-200 text-indigo-900 dark:bg-indigo-800/40 dark:text-indigo-200",
    "race-identity":
        "bg-amber-200 text-amber-900 dark:bg-amber-800/40 dark:text-amber-200",
    law: "bg-slate-200 text-slate-900 dark:bg-slate-800/40 dark:text-slate-200",
    ethics: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800/40 dark:text-zinc-200",
};

// Helper function to get genre color classes
export function getGenreColor(slug: string): string {
    const base =
        genreColors[slug] ||
        "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
    // Make colors slightly more vibrant by preferring -200 backgrounds and darker text where possible.
    // This transforms common Tailwind utility patterns without changing every mapping entry.
    let vibrant = base
        .replace(/-100/g, "-200")
        .replace(/text-([a-z0-9-]+)-800/g, "text-$1-900");
    vibrant = vibrant.replace(
        /dark:bg-([a-z0-9-]+)-900\/30/g,
        "dark:bg-$1-800/40"
    );
    vibrant = vibrant.replace(
        /dark:text-([a-z0-9-]+)-300/g,
        "dark:text-$1-200"
    );
    return vibrant;
}
