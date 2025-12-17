import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";
import { trpc } from "@/lib/trpc";
import { withAuth } from "@/components/auth/withAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

function EditArticlePage() {
  const router = useRouter();
  const { slug } = router.query as { slug?: string };

  const { data: article, isLoading: loadingArticle } = trpc.articles.getBySlug.useQuery({ slug: slug || "" }, { enabled: !!slug });
  const { data: genres, isLoading: genresLoading } = trpc.genres.getAll.useQuery();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateArticle = trpc.articles.update.useMutation({
    onSuccess: (a) => {
      router.push(`/articles/${a.slug}`);
    },
    onError: (err) => {
      setError(err.message);
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (article) {
      setTitle(article.title || "");
      setExcerpt(article.excerpt || "");
      try {
        if (Array.isArray(article.content) && article.content.length > 0) {
          const first = article.content[0];
          setContent(first?.content || "");
        } else {
          setContent("");
        }
      } catch {
        setContent("");
      }
      setCoverImageUrl(article.coverImageUrl || "");
      const gids = (article.genres || []).map((g: any) => String(g.id));
      setGenreIds(gids.length > 0 ? gids : (article.genre ? [String(article.genre.id)] : []));
    }
  }, [article]);

  const handleSubmit = async (status: "draft" | "published") => {
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!genreIds || genreIds.length === 0) {
      setError("Please select at least one genre");
      return;
    }
    if (!excerpt.trim()) {
      setError("Synopsis is required");
      return;
    }
    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    setIsSubmitting(true);

    const contentBlocks = [
      {
        type: "paragraph" as const,
        content: content,
      },
    ];

    updateArticle.mutate({
      id: article.id,
      title: title.trim(),
      excerpt: excerpt.trim() || undefined,
      content: contentBlocks,
      genreIds: genreIds.map((g) => parseInt(g)),
      coverImageUrl: coverImageUrl.trim() || undefined,
      status,
    });
  };

  const { theme, toggle, mounted } = useTheme();

  if (loadingArticle) return <p className="p-4">Loading...</p>;

  if (!article) return <p className="p-4">Article not found</p>;

  return (
    <>
      <NextSeo title={`Edit: ${article.title}`} description={`Edit article ${article.title}`} noindex />

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center">
            <div className="flex items-center gap-2 w-1/3">
              <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Back</span>
              </Link>
            </div>

            <h1 className="text-lg font-bold text-center w-1/3">Edit Article</h1>

            <div className="flex items-center gap-2 w-1/3 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => handleSubmit("draft")} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                <span className="hidden sm:inline">Save Draft</span>
              </Button>
              <Button type="button" size="sm" onClick={() => handleSubmit("published")} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                <span className="hidden sm:inline">Publish</span>
              </Button>
              {mounted && (
                <button onClick={toggle} aria-label="toggle-theme" className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  {theme === "dark" ? <Save size={16} /> : <Send size={16} />}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="container px-4 py-6">
          <div className="mx-auto w-full max-w-3xl">
            <Card className="rounded-xl border p-6 shadow-sm">
              <CardContent>
                {error && <div className="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-base font-medium">Title</Label>
                    <Input id="title" type="text" placeholder="Enter your article title..." value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genre" className="text-base font-medium">Genres</Label>
                    <div className="flex gap-2 overflow-x-auto max-w-full py-1">
                      {genresLoading ? (
                        <div className="text-sm text-muted-foreground">Loading genres...</div>
                      ) : genres && genres.length > 0 ? (
                        genres.map((genre) => {
                          const gid = genre.id.toString();
                          const selected = genreIds.includes(gid);
                          return (
                            <button type="button" key={genre.id} onClick={() => setGenreIds((prev) => prev.includes(gid) ? prev.filter((p) => p !== gid) : [...prev, gid])} className={`rounded-full px-3 py-1 text-sm transition-colors focus:outline-none ${selected ? "bg-primary text-primary-foreground" : "bg-muted/10 text-muted-foreground"}`}>
                              {genre.name}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-sm text-muted-foreground">No genres available</div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Select one or more genres</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excerpt" className="text-base font-medium">Synopsis <span className="text-destructive">*</span></Label>
                    <Textarea id="excerpt" placeholder="A brief summary of your article..." value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} required />
                    <p className="text-xs text-muted-foreground">A short description that appears in article previews (required)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coverImage" className="text-base font-medium">Cover Image URL <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Input id="coverImage" type="url" placeholder="https://example.com/image.jpg" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-medium">Content</Label>
                    <MarkdownEditor value={content} onChange={setContent} placeholder="Write your article content in markdown..." minHeight="min-h-[400px]" />
                    <p className="text-xs text-muted-foreground">Supports Markdown formatting. Use the toolbar or write markdown directly.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}

export default withAuth(EditArticlePage);
