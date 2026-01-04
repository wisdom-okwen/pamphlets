import { useState, useRef, useEffect, useCallback } from "react";
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
import { Loader2, Save, Send, Upload, Link as LinkIcon, X, Plus, Check, Search } from "lucide-react";
import { useNavBarActions } from "@/contexts/NavBarContext";

function NewArticlePage() {
  const router = useRouter();
  const { setActions } = useNavBarActions();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [genreIds, setGenreIds] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageMode, setCoverImageMode] = useState<"url" | "upload">("url");
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  const utils = trpc.useUtils();
  const { data: genres, isLoading: genresLoading } = trpc.genres.getAll.useQuery();

  // Create genre mutation
  const createGenre = trpc.genres.createByAuthor.useMutation({
    onSuccess: (genre) => {
      setGenreIds((prev) => [...prev, genre.id.toString()]);
      setNewTagName("");
      setIsCreatingTag(false);
      utils.genres.getAll.invalidate();
    },
    onError: (err) => {
      setError(err.message);
      setIsCreatingTag(false);
    },
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    setIsCreatingTag(true);
    createGenre.mutate({ name: newTagName.trim() });
  };

  // Create article mutation
  const createArticle = trpc.articles.create.useMutation({
    onSuccess: (article) => {
      router.push(`/articles/${article.slug}`);
    },
    onError: (err) => {
      setError(err.message);
      setIsSubmitting(false);
    },
  });

  // Use refs to avoid stale closures and infinite loops
  const formRef = useRef({ title, excerpt, content, genreIds, coverImageUrl });
  const createArticleRef = useRef(createArticle);
  
  useEffect(() => {
    formRef.current = { title, excerpt, content, genreIds, coverImageUrl };
  }, [title, excerpt, content, genreIds, coverImageUrl]);
  
  useEffect(() => {
    createArticleRef.current = createArticle;
  }, [createArticle]);

  const handleSubmit = useCallback((status: "draft" | "published") => {
    const { title, excerpt, content, genreIds, coverImageUrl } = formRef.current;
    setError(null);

    // Validation
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

    createArticleRef.current.mutate({
      title: title.trim(),
      excerpt: excerpt.trim() || undefined,
      content: contentBlocks,
      genreIds: genreIds.map((g) => parseInt(g)),
      coverImageUrl: coverImageUrl.trim() || undefined,
      status,
    });
  }, []);

  // Set navbar actions
  useEffect(() => {
    setActions(
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleSubmit("draft")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          <span className="hidden sm:inline">Save Draft</span>
          <span className="sm:hidden">Draft</span>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => handleSubmit("published")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Send className="mr-2 size-4" />
          )}
          <span className="hidden sm:inline">Publish</span>
          <span className="sm:hidden">Post</span>
        </Button>
      </>
    );

    // Clear actions when leaving the page
    return () => setActions(null);
  }, [isSubmitting, setActions, handleSubmit]);

  return (
    <>
      <NextSeo
        title="New Pamphlet"
        description="Create a new pamphlet"
       
      />

      <div className="min-h-screen bg-background">
        {/* Main Content */}
        <main className="container px-4 py-6">
          <div className="mx-auto w-full max-w-3xl">
            <Card className="rounded-xl border p-6 shadow-sm">
              <CardContent>
                {error && (
                  <div className="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-medium">
                Title
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="Enter your pamphlet title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Genre (multi-select chips) */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Tags
              </Label>

              {/* Selected tags */}
              {genreIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {genres?.filter(g => genreIds.includes(g.id.toString())).map((genre) => (
                    <span
                      key={genre.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-sm"
                    >
                      {genre.name}
                      <button
                        type="button"
                        onClick={() => setGenreIds((prev) => prev.filter((p) => p !== genre.id.toString()))}
                        className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Scrollable tag list */}
              <div className="relative border border-border rounded-lg">
                {/* Search input */}
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                      type="text"
                      placeholder="Search tags..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto p-2 scrollbar-hide">
                  {genresLoading ? (
                    <div className="text-sm text-muted-foreground p-2">Loading tags...</div>
                  ) : genres && genres.length > 0 ? (
                    <div className="space-y-1">
                      {genres
                        .filter((genre) => 
                          genre.name.toLowerCase().includes(tagSearch.toLowerCase())
                        )
                        .map((genre) => {
                        const gid = genre.id.toString();
                        const selected = genreIds.includes(gid);
                        return (
                          <button
                            type="button"
                            key={genre.id}
                            onClick={() =>
                              setGenreIds((prev) =>
                                prev.includes(gid)
                                  ? prev.filter((p) => p !== gid)
                                  : [...prev, gid]
                              )
                            }
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                              selected
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <span>{genre.name}</span>
                            {selected && <Check size={16} className="text-primary" />}
                          </button>
                        );
                      })}
                      {genres.filter((genre) => 
                        genre.name.toLowerCase().includes(tagSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="text-sm text-muted-foreground p-2">No tags match "{tagSearch}"</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-2">No tags available</div>
                  )}
                </div>
              </div>

              {/* Create new tag */}
              <div className="flex gap-2 mt-2">
                <Input
                  type="text"
                  placeholder="Create new tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || isCreatingTag}
                  className="shrink-0"
                >
                  {isCreatingTag ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span className="ml-1">Add</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Select one or more tags, or create your own</p>
            </div>

            {/* Synopsis */}
            <div className="space-y-2">
              <Label htmlFor="excerpt" className="text-base font-medium">
                Synopsis <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="excerpt"
                placeholder="A brief summary of your pamphlet..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                A short description that appears in pamphlet previews (required)
              </p>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Cover Image{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              
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
                <Input
                  id="coverImage"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                />
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
                      
                      // Validate file size (max 5MB)
                      if (file.size > 5 * 1024 * 1024) {
                        setError("Image must be less than 5MB");
                        return;
                      }
                      
                      setIsUploading(true);
                      setError(null);
                      
                      try {
                        // Create a preview
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setUploadedImagePreview(event.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                        
                        // Upload to server
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
                          <span className="text-sm text-muted-foreground">
                            Click to upload an image
                          </span>
                          <span className="text-xs text-muted-foreground">
                            PNG, JPG, GIF up to 5MB
                          </span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              )}
              
              {/* Preview for URL mode */}
              {coverImageMode === "url" && coverImageUrl && (
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
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Content</Label>
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="Write your pamphlet content in markdown..."
                minHeight="min-h-[400px]"
              />
              <p className="text-xs text-muted-foreground">
                Supports Markdown formatting. Use the toolbar or write markdown
                directly.
              </p>
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

export default withAuth(NewArticlePage, { requireAuthor: true });
