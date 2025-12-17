import { useState, useRef } from "react";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";
import { trpc } from "@/lib/trpc";
import { withAuth } from "@/components/auth/withAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save, Send, Upload, Link as LinkIcon, X, Sun, Moon } from "lucide-react";
import Link from "next/link";

interface GenreType {
  id: number;
  name: string;
  slug: string;
}

function EditArticlePage() {
  const router = useRouter();
  const { slug } = router.query as { slug?: string };

  const { data: article, isLoading: loadingArticle } = trpc.articles.getBySlug.useQuery({ slug: slug || "" }, { enabled: !!slug });
  const { data: genres, isLoading: genresLoading } = trpc.genres.getAll.useQuery();

  const articleGenres = (article?.genres || []) as GenreType[];
  const initialGenreIds = articleGenres.length > 0 
    ? articleGenres.map((g) => String(g.id)) 
    : (article?.genre ? [String(article.genre.id)] : []);

  const [title, setTitle] = useState(article?.title || "");
  const [excerpt, setExcerpt] = useState(article?.excerpt || "");
  const [content, setContent] = useState(() => {
    if (article && Array.isArray(article.content) && article.content.length > 0) {
      const first = article.content[0];
      return (first as { content?: string })?.content || "";
    }
    return "";
  });
  const [genreIds, setGenreIds] = useState<string[]>(initialGenreIds);
  const [coverImageUrl, setCoverImageUrl] = useState(article?.coverImageUrl || "");
  const [coverImageMode, setCoverImageMode] = useState<"url" | "upload">("url");
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (article && !title && article.title) {
    setTitle(article.title);
    setExcerpt(article.excerpt || "");
    if (Array.isArray(article.content) && article.content.length > 0) {
      const first = article.content[0];
      setContent((first as { content?: string })?.content || "");
    }
    setCoverImageUrl(article.coverImageUrl || "");
    const gids = articleGenres.map((g) => String(g.id));
    setGenreIds(gids.length > 0 ? gids : (article.genre ? [String(article.genre.id)] : []));
  }

  const updateArticle = trpc.articles.update.useMutation({
    onSuccess: (a) => {
      router.push(`/articles/${a.slug}`);
    },
    onError: (err) => {
      setError(err.message);
      setIsSubmitting(false);
    },
  });

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

    if (!article) return;

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
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
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
                    <Label className="text-base font-medium">Cover Image <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    
                    {/* Toggle between URL and Upload */}
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setCoverImageMode("url")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          coverImageMode === "url"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <LinkIcon size={14} />
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverImageMode("upload")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          coverImageMode === "upload"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <Upload size={14} />
                        Upload
                      </button>
                    </div>

                    {coverImageMode === "url" ? (
                      <>
                        <Input id="coverImage" type="url" placeholder="https://example.com/image.jpg" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} />
                        {coverImageUrl && (
                          <div className="mt-2">
                            <img
                              src={coverImageUrl}
                              alt="Cover preview"
                              className="max-h-40 rounded-lg border object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            if (file.size > 5 * 1024 * 1024) {
                              setError("Image must be less than 5MB");
                              return;
                            }
                            
                            setIsUploading(true);
                            setError(null);
                            
                            try {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setUploadedImagePreview(event.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                              
                              const formData = new FormData();
                              formData.append("file", file);
                              
                              const response = await fetch("/api/upload", {
                                method: "POST",
                                body: formData,
                              });
                              
                              if (!response.ok) {
                                throw new Error("Upload failed");
                              }
                              
                              const data = await response.json();
                              setCoverImageUrl(data.url);
                            } catch (err) {
                              setError("Failed to upload image. Please try again or use a URL instead.");
                              setUploadedImagePreview(null);
                            } finally {
                              setIsUploading(false);
                            }
                          }}
                        />
                        
                        {uploadedImagePreview || coverImageUrl ? (
                          <div className="relative inline-block">
                            <img
                              src={uploadedImagePreview || coverImageUrl}
                              alt="Cover preview"
                              className="max-h-40 rounded-lg border object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCoverImageUrl("");
                                setUploadedImagePreview(null);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                                }
                              }}
                              className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center hover:border-primary hover:bg-muted/50 transition-colors disabled:opacity-50"
                          >
                            {isUploading ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Uploading...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="size-8 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Click to upload an image</span>
                                <span className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</span>
                              </div>
                            )}
                          </button>
                        )}
                      </div>
                    )}
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

export default withAuth(EditArticlePage, { requireAdmin: true });
