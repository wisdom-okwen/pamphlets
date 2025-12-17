import { useState, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Paperclip,
  Eye,
  Edit3,
  Loader2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients/browser";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your content in markdown...",
  minHeight = "min-h-[300px]",
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload to Supabase Storage
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `article-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('content_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content_images')
        .getPublicUrl(filePath);

      const imageMarkdown = `![${file.name}](${publicUrl})`;
      onChange(value + '\n' + imageMarkdown + '\n');
    } catch (err) {
      alert('Failed to upload image. Check your permissions for the "content_images" bucket.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  }, [value, onChange]);

  const insertMarkdown = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      const textarea = document.querySelector(
        "[data-markdown-editor]"
      ) as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const textToInsert = selectedText || placeholder;

      const newValue =
        value.substring(0, start) +
        before +
        textToInsert +
        after +
        value.substring(end);

      onChange(newValue);

      // Restore cursor position after state update
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + textToInsert.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange]
  );

  const toolbarButtons = [
    {
      icon: Bold,
      label: "Bold",
      action: () => insertMarkdown("**", "**", "bold text"),
    },
    {
      icon: Italic,
      label: "Italic",
      action: () => insertMarkdown("*", "*", "italic text"),
    },
    {
      icon: Heading1,
      label: "Heading 1",
      action: () => insertMarkdown("# ", "", "Heading"),
    },
    {
      icon: Heading2,
      label: "Heading 2",
      action: () => insertMarkdown("## ", "", "Heading"),
    },
    {
      icon: List,
      label: "Bullet List",
      action: () => insertMarkdown("- ", "", "List item"),
    },
    {
      icon: ListOrdered,
      label: "Numbered List",
      action: () => insertMarkdown("1. ", "", "List item"),
    },
    {
      icon: Quote,
      label: "Quote",
      action: () => insertMarkdown("> ", "", "Quote"),
    },
    {
      icon: Code,
      label: "Code",
      action: () => insertMarkdown("`", "`", "code"),
    },
    {
      icon: Link,
      label: "Link",
      action: () => insertMarkdown("[", "](url)", "link text"),
    },
  ];


  return (
    <div className="rounded-md border border-input bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-input p-2">
        <div className="flex flex-wrap gap-1">
          {toolbarButtons.map(({ icon: Icon, label, action }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={action}
              disabled={isPreview}
              title={label}
              className="size-8"
            >
              <Icon className="size-4" />
            </Button>
          ))}
          {/* Image upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPreview || isUploading}
            title="Upload Image"
            className="size-8"
          >
            {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          </Button>
        </div>

        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            variant={!isPreview ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsPreview(false)}
            className="gap-1.5"
          >
            <Edit3 className="size-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            type="button"
            variant={isPreview ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsPreview(true)}
            className="gap-1.5"
          >
            <Eye className="size-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
        </div>
      </div>

      {/* Editor / Preview */}
      {isPreview ? (
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none p-4",
            minHeight,
            "overflow-auto"
          )}
        >
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">Nothing to preview</p>
          )}
        </div>
      ) : (
        <Textarea
          data-markdown-editor
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            minHeight,
            "resize-none rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          )}
        />
      )}
    </div>
  );
}
