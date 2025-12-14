/**
 * Subject represents the currently authenticated user
 */
export interface Subject {
  id: string;
  email?: string;
  role?: "admin" | "author" | "visitor";
}
