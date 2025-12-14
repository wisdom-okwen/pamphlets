import slugify from "slugify";

/**
 * Generate a URL-friendly slug from a title
 * @example generateSlug("How to Land Your Dream Job") => "how-to-land-your-dream-job"
 */
export function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,      // Convert to lowercase
    strict: true,     // Strip special characters
    trim: true,       // Trim leading/trailing spaces
  });
}

/**
 * Generate a unique slug by appending a random suffix
 * Useful when a slug already exists
 * @example generateUniqueSlug("my-article") => "my-article-a1b2c3"
 */
export function generateUniqueSlug(baseSlug: string): string {
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${suffix}`;
}
