// Genre color mapping - each genre gets a unique background color
export const genreColors: Record<string, string> = {
  // Creative & Writing
  "fiction": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "nonfiction": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "creative-writing": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "short-story": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "poetry": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  "memoir": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  "personal-essay": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  
  // Opinion & News
  "opinion": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "journalism": "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  "investigative": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "news": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "politics": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  
  // Knowledge & Learning
  "history": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "philosophy": "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300",
  "society": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "culture": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "education": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  
  // Arts & Entertainment
  "art": "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300",
  "design": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "architecture": "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300",
  "film": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "television": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "music": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "theater": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  "literature": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "books": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "reviews": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "interviews": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  
  // Science & Tech
  "science": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "astronomy": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "environment": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "climate": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "technology": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "programming": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "ai-ml": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  "data-science": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "security": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  
  // Business & Finance
  "startups": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "business": "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  "finance": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "economics": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "marketing": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "productivity": "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300",
  
  // Health & Wellness
  "health": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "fitness": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "wellness": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "psychology": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "sociology": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  
  // Lifestyle
  "parenting": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "relationships": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  "travel": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "food": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "cooking": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "fashion": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  "beauty": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "photography": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "gaming": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "sports": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  
  // How-to & Guides
  "diy-crafts": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "how-to": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "guides": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  
  // Other
  "satire": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "religion": "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300",
  "lgbtq": "bg-gradient-to-r from-red-100 via-yellow-100 to-blue-100 text-gray-800 dark:from-red-900/30 dark:via-yellow-900/30 dark:to-blue-900/30 dark:text-gray-300",
  "race-identity": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "law": "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  "ethics": "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300",
};

// Helper function to get genre color classes
export function getGenreColor(slug: string): string {
  return genreColors[slug] || "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
}
