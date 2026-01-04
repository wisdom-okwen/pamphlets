import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { trpc } from "@/lib/trpc";
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, Bookmark, ThumbsUp, HandHeart } from "lucide-react";
import { getGenreColor } from "@/models/genreColors";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal, useAuthModal } from "@/components/AuthModal";
import { createClient } from "@/utils/supabase/clients/browser";

interface GenreType {
  id: number;
  name: string;
  slug: string;
}

interface ContentBlock {
  type: string;
  content?: string;
}

interface CommentType {
  id: number;
  content: string;
  createdAt: Date;
  user?: {
    username?: string;
  };
  likeCount?: number;
  loveCount?: number;
  supportCount?: number;
  userLiked?: boolean;
  userLoved?: boolean;
  userSupported?: boolean;
}

interface ArticleWithCounts {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: ContentBlock[];
  coverImageUrl?: string | null;
  viewCount: number;
  genre?: GenreType | null;
  genres?: GenreType[];
  author?: { username?: string };
  userHasLiked?: boolean;
  likeCount?: number;
  commentCount?: number;
  status: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Render markdown-like text to JSX, handling images, YouTube embeds, bold, italic, links, headers, and paragraphs.
 */
function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Pre-process: merge consecutive list items separated by blank lines
  // This handles cases like "1. Item\n\n2. Item\n\n   - nested\n\n3. Item"
  const preprocessText = (input: string): string => {
    const blocks = input.split(/\n\n+/);
    const mergedBlocks: string[] = [];
    let currentListBlock: string[] = [];
    
    const isListLine = (line: string) => /^\s*(\d+\.|-|\*)\s+/.test(line);
    const isBlockAList = (block: string) => {
      const lines = block.split('\n').filter(l => l.trim());
      return lines.length > 0 && lines.every(l => isListLine(l));
    };
    
    for (const block of blocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;
      
      if (isBlockAList(trimmedBlock)) {
        // This block is entirely list items - add to current list
        currentListBlock.push(trimmedBlock);
      } else {
        // Not a list block - flush any accumulated list and add this block
        if (currentListBlock.length > 0) {
          mergedBlocks.push(currentListBlock.join('\n'));
          currentListBlock = [];
        }
        mergedBlocks.push(trimmedBlock);
      }
    }
    
    // Don't forget to flush any remaining list items
    if (currentListBlock.length > 0) {
      mergedBlocks.push(currentListBlock.join('\n'));
    }
    
    return mergedBlocks.join('\n\n');
  };

  const processedText = preprocessText(text);

  // Split into blocks (paragraphs, lists, code blocks, etc.)
  const blocks = processedText.split(/\n\n+/);
  
  for (const block of blocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    // Code block: ```language\ncode\n```
    const codeBlockMatch = trimmedBlock.match(/^```(\w+)?\n([\s\S]*?)\n```$/);
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || '';
      const code = codeBlockMatch[2];
      parts.push(
        <pre key={key++} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4 text-sm">
          <code className={`language-${language}`}>{code}</code>
        </pre>
      );
      continue;
    }

    // Blockquote: > text
    if (trimmedBlock.startsWith('> ')) {
      const quoteText = trimmedBlock.replace(/^>\s?/gm, '').trim();
      parts.push(
        <blockquote key={key++} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4 text-gray-700 dark:text-gray-300">
          {renderInlineMarkdown(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Horizontal rule: --- or *** or ___
    if (/^[-*_]{3,}$/.test(trimmedBlock)) {
      parts.push(<hr key={key++} className="my-6 border-gray-300 dark:border-gray-600" />);
      continue;
    }

    // Table detection
    const lines = trimmedBlock.split('\n');
    const tableLines = lines.filter(line => line.trim());
    if (tableLines.length >= 2) {
      const isTable = tableLines.every(line => line.includes('|'));
      if (isTable) {
        const tableRows = tableLines.map(line => 
          line.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
        );
        
        // Check if second row is separator row
        if (tableRows.length >= 2 && tableRows[1].every(cell => /^:?-+:?$/.test(cell))) {
          const headers = tableRows[0];
          const alignments = tableRows[1].map(cell => {
            if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
            if (cell.endsWith(':')) return 'right';
            return 'left';
          });
          const dataRows = tableRows.slice(2);
          
          parts.push(
            <table key={key++} className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 my-4">
              <thead>
                <tr>
                  {headers.map((header, idx) => (
                    <th key={idx} className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-zinc-800 font-semibold text-gray-900 dark:text-gray-100">
                      {renderInlineMarkdown(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => {
                      const alignClass = alignments[cellIdx] === 'center' ? 'text-center' : 
                                        alignments[cellIdx] === 'right' ? 'text-right' : 'text-left';
                      return (
                        <td key={cellIdx} className={`border border-gray-300 dark:border-gray-600 px-4 py-2 ${alignClass}`}>
                          {renderInlineMarkdown(cell)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
          continue;
        }
      }
    }

    // Task list detection
    const isTaskList = lines.every(line => /^\s*[-*]\s+\[[ x]\]\s/.test(line.trim()));
    if (isTaskList) {
      const taskItems = lines.map(line => {
        const match = line.trim().match(/^[-*]\s+\[([ x])\]\s(.+)$/);
        if (match) {
          return { checked: match[1] === 'x', text: match[2] };
        }
        return { checked: false, text: line.trim() };
      });
      
      parts.push(
        <ul key={key++} className="my-4 space-y-2">
          {taskItems.map((item, idx) => (
            <li key={idx} className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={item.checked} 
                readOnly 
                className="rounded border-gray-300 dark:border-gray-600" 
              />
              <span className={item.checked ? 'line-through text-gray-500' : ''}>
                {renderInlineMarkdown(item.text)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Mixed list detection - supports ordered lists with nested unordered items
    const isMixedList = lines.some(line => /^\s*\d+\.\s+/.test(line)) && 
                        lines.every(line => /^\s*(\d+\.|-|\*)\s+/.test(line));
    
    // Ordered list detection (1. 2. 3. etc) - with nested list support
    const isOrderedList = lines.every(line => /^\s*\d+\.\s+/.test(line));
    
    if ((isOrderedList || isMixedList) && lines.length > 0) {
      const renderMixedList = (items: string[], startIdx: number = 0, baseIndent: number = 0, listType: 'ol' | 'ul' = 'ol'): { element: React.ReactNode; endIdx: number } => {
        const listItems: React.ReactNode[] = [];
        let i = startIdx;
        
        while (i < items.length) {
          const line = items[i];
          const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
          const unorderedMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
          const match = orderedMatch || unorderedMatch;
          
          if (!match) { i++; continue; }
          
          const currentIndent = match[1].length;
          const content = match[2];
          const isOrdered = !!orderedMatch;
          
          if (currentIndent < baseIndent) break;
          
          if (currentIndent > baseIndent) {
            // This is a nested item, determine its type
            const nestedType = isOrdered ? 'ol' : 'ul';
            const nested = renderMixedList(items, i, currentIndent, nestedType);
            if (listItems.length > 0) {
              // Append nested list to last item
              const lastItem = listItems.pop();
              listItems.push(
                <li key={i} className="pl-1">
                  {lastItem}
                  {nested.element}
                </li>
              );
            }
            i = nested.endIdx;
            continue;
          }
          
          listItems.push(
            <li key={i} className="pl-1">
              {renderInlineMarkdown(content)}
            </li>
          );
          i++;
        }
        
        const ListTag = listType;
        const listClass = listType === 'ol' ? "ml-6 space-y-1 list-decimal" : "ml-6 space-y-1 list-disc";
        
        return {
          element: <ListTag className={listClass}>{listItems}</ListTag>,
          endIdx: i
        };
      };
      
      // Determine if top level starts with ordered or unordered
      const firstLine = lines[0];
      const topLevelType = /^\s*\d+\.\s+/.test(firstLine) ? 'ol' : 'ul';
      
      const result = renderMixedList(lines, 0, 0, topLevelType);
      parts.push(<div key={key++} className="my-4">{result.element}</div>);
      continue;
    }

    // Unordered list detection (- or * without checkbox) - with nested list support
    const isUnorderedList = lines.every(line => /^\s*[-*]\s+(?!\[[ x]\])/.test(line));
    if (isUnorderedList && lines.length > 0) {
      const renderNestedUnorderedList = (items: string[], startIdx: number = 0, baseIndent: number = 0): { element: React.ReactNode; endIdx: number } => {
        const listItems: React.ReactNode[] = [];
        let i = startIdx;
        
        while (i < items.length) {
          const line = items[i];
          const indentMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
          if (!indentMatch) { i++; continue; }
          
          const currentIndent = indentMatch[1].length;
          const content = indentMatch[2];
          
          if (currentIndent < baseIndent) break;
          
          if (currentIndent > baseIndent) {
            // This is a nested item, recurse
            const nested = renderNestedUnorderedList(items, i, currentIndent);
            if (listItems.length > 0) {
              // Append nested list to last item
              const lastItem = listItems.pop();
              listItems.push(
                <li key={i} className="pl-1">
                  {lastItem}
                  {nested.element}
                </li>
              );
            }
            i = nested.endIdx;
            continue;
          }
          
          listItems.push(
            <li key={i} className="pl-1">
              {renderInlineMarkdown(content)}
            </li>
          );
          i++;
        }
        
        return {
          element: <ul className="ml-6 space-y-1 list-disc">{listItems}</ul>,
          endIdx: i
        };
      };
      
      const result = renderNestedUnorderedList(lines, 0, 0);
      parts.push(<div key={key++} className="my-4">{result.element}</div>);
      continue;
    }

    // Block image with optional caption: ![alt](url) followed by _caption_ or *caption*
    const blockImageMatch = trimmedBlock.match(/^!\[([^\]]*)\]\(([^)]+)\)(?:\s*\n\s*)?(?:[_*](.+?)[_*])?$/);
    if (blockImageMatch) {
      const alt = blockImageMatch[1];
      const src = blockImageMatch[2];
      const caption = blockImageMatch[3];
      
      parts.push(
        <figure key={key++} className="my-4">
          <img 
            src={src} 
            alt={alt} 
            className="w-full max-w-md mx-auto rounded-lg shadow-sm" 
            loading="lazy"
          />
          {caption && (
            <figcaption className="text-center text-sm text-gray-500 dark:text-gray-400 italic mt-2">
              {caption}
            </figcaption>
          )}
        </figure>
      );
      continue;
    }

    // Standalone block image (no caption)
    const standaloneImageMatch = trimmedBlock.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (standaloneImageMatch) {
      const alt = standaloneImageMatch[1];
      const src = standaloneImageMatch[2];
      
      parts.push(
        <figure key={key++} className="my-4">
          <img 
            src={src} 
            alt={alt} 
            className="w-full max-w-md mx-auto rounded-lg shadow-sm" 
            loading="lazy"
          />
        </figure>
      );
      continue;
    }

    // Headers: # ## ### etc.
    const firstLine = lines[0];
    const headerMatch = firstLine.match(/^(#{1,6})\s*(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerText = headerMatch[2].trim();
      const headerClasses: Record<number, string> = {
        1: "text-xl font-bold mb-2 mt-4",
        2: "text-lg font-bold mb-2 mt-3",
        3: "text-base font-semibold mb-2 mt-3",
        4: "text-sm font-semibold mb-1 mt-2",
        5: "text-sm font-medium mb-1 mt-2",
        6: "text-xs font-medium mb-1 mt-2",
      };
      parts.push(
        <div key={key++} className={headerClasses[level] || headerClasses[3]}>
          {renderInlineMarkdown(headerText)}
        </div>
      );
      continue;
    }

    // YouTube URL on its own line
    const youtubeMatch = firstLine.match(/^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+)$/);
    if (youtubeMatch) {
      const videoId = getYouTubeVideoId(youtubeMatch[1]);
      if (videoId) {
        parts.push(
          <div key={key++} className="my-3">
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="rounded shadow-sm"
            />
          </div>
        );
        continue;
      }
    }

    // @[youtube](url) syntax
    const youtubeEmbedMatch = firstLine.match(/^@\[youtube\]\(([^)]+)\)$/);
    if (youtubeEmbedMatch) {
      const videoId = getYouTubeVideoId(youtubeEmbedMatch[1]);
      if (videoId) {
        parts.push(
          <div key={key++} className="my-3">
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="rounded shadow-sm"
            />
          </div>
        );
        continue;
      }
    }

    // Table detection
    const isTable = lines.length >= 2 && 
      lines.every(line => /^\s*\|.*\|\s*$/.test(line)) && 
      /^\s*\|[\s\-\|:]+\|\s*$/.test(lines[1]);
    
    if (isTable) {
      const tableRows = lines.map(line => 
        line.split('|').slice(1, -1).map(cell => cell.trim())
      );
      const headers = tableRows[0];
      const bodyRows = tableRows.slice(2); // Skip header and separator
      
      parts.push(
        <div key={key++} className="my-4 overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-800">
                {headers.map((header, idx) => (
                  <th key={idx} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100">
                    {renderInlineMarkdown(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Regular paragraph
    parts.push(
      <p key={key++} className="mb-3">
        {renderInlineMarkdown(trimmedBlock)}
      </p>
    );
  }

  return <>{parts}</>;
}

/**
 * Handle inline markdown: ~~strikethrough~~, `code`, **bold**, __bold__, *italic*, _italic_, [links](url), inline images
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Regex to find inline elements: ~~strikethrough~~, `code`, **bold**, __bold__, *italic*, _italic_, [link](url), ![img](url)
  // Order matters: check longer patterns first (** before *, __ before _)
  const inlineRegex = /(~~([^~]+)~~)|(`([^`]+)`)|(\*\*(.+?)\*\*)|(__(.+?)__)|(?<!\w)_([^_]+?)_(?!\w)|(\*([^*]+?)\*)|(\[([^\]]+)\]\(([^)]+)\))|(!\[([^\]]*)\]\(([^)]+)\))/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }

    if (match[1]) {
      // Strikethrough: ~~text~~
      parts.push(<del key={key++} className="line-through">{match[2]}</del>);
    } else if (match[3]) {
      // Inline code: `code`
      parts.push(<code key={key++} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">{match[4]}</code>);
    } else if (match[5]) {
      // Bold: **text**
      parts.push(<strong key={key++}>{match[6]}</strong>);
    } else if (match[7]) {
      // Bold: __text__
      parts.push(<strong key={key++}>{match[8]}</strong>);
    } else if (match[9]) {
      // Italic: _text_ (underscore)
      parts.push(<em key={key++}>{match[9]}</em>);
    } else if (match[10]) {
      // Italic: *text* (asterisk)
      parts.push(<em key={key++}>{match[11]}</em>);
    } else if (match[12]) {
      // Link: [text](url)
      parts.push(
        <a key={key++} href={match[14]} className="text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener noreferrer">
          {match[13]}
        </a>
      );
    } else if (match[15]) {
      // Inline image: ![alt](url)
      parts.push(
        <img key={key++} src={match[17]} alt={match[16]} className="inline-block max-h-24 rounded" />
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

/**
 * Split text into pages, breaking at paragraph boundaries when possible.
 * Preserves markdown images, links, and code blocks by not splitting them mid-element.
 */
function chunkText(text: string, charsPerPage = 1200): string[] {
  const pages: string[] = [];
  
  // Split by double newlines to get paragraphs/blocks
  const blocks = text.split(/\n\n+/);
  let currentPage = "";
  
  for (const block of blocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;
    
    // Check if adding this block would exceed the limit
    const potentialPage = currentPage ? currentPage + "\n\n" + trimmedBlock : trimmedBlock;
    
    if (potentialPage.length <= charsPerPage) {
      // Block fits, add it to current page
      currentPage = potentialPage;
    } else if (currentPage) {
      // Block doesn't fit and we have content - save current page and start new one
      pages.push(currentPage);
      
      // If the block itself is too long, we need to split it
      if (trimmedBlock.length > charsPerPage) {
        // Split long block by sentences or at word boundaries
        const splitBlock = splitLongBlock(trimmedBlock, charsPerPage);
        for (let i = 0; i < splitBlock.length - 1; i++) {
          pages.push(splitBlock[i]);
        }
        currentPage = splitBlock[splitBlock.length - 1] || "";
      } else {
        currentPage = trimmedBlock;
      }
    } else {
      // Current page is empty but block is too long - split it
      const splitBlock = splitLongBlock(trimmedBlock, charsPerPage);
      for (let i = 0; i < splitBlock.length - 1; i++) {
        pages.push(splitBlock[i]);
      }
      currentPage = splitBlock[splitBlock.length - 1] || "";
    }
  }
  
  // Don't forget the last page
  if (currentPage) {
    pages.push(currentPage);
  }
  
  return pages.length > 0 ? pages : [""];
}

/**
 * Split a long block of text into smaller chunks, preferring sentence boundaries.
 */
function splitLongBlock(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > maxLength) {
    let end = maxLength;
    
    // Try to find a sentence boundary (. ! ?) followed by space
    const sentenceEnd = remaining.slice(0, maxLength).search(/[.!?]\s+(?=[A-Z])/);
    if (sentenceEnd > maxLength * 0.5) {
      // Found a good sentence break in the latter half
      end = sentenceEnd + 2; // Include the punctuation and space
    } else {
      // Fall back to word boundary
      while (end > 0 && remaining[end] !== " " && remaining[end] !== "\n") {
        end--;
      }
      if (end === 0) end = maxLength; // No space found, hard cut
    }
    
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  
  if (remaining) {
    chunks.push(remaining);
  }
  
  return chunks;
}

/**
 * Format a date as relative time (e.g., "2s ago", "5m ago", "3h ago", "2d ago", "1w ago", "3mo ago", "1y ago")
 */
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

export default function ArticleModalPage() {
  const router = useRouter();
  const slug = String(router.query.slug || "");
  const { user } = useAuth();
  const { isOpen, action, openModal, closeModal } = useAuthModal();
  const utils = trpc.useUtils();
  const supabase = useMemo(() => createClient(), []);

  const { data: article, isLoading } = trpc.articles.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  // Real-time subscription for reactions on this article
  useEffect(() => {
    if (!article?.id) return;

    const channel = supabase
      .channel(`realtime-reactions-article-${article.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions", filter: `article_id=eq.${article.id}` },
        () => {
          utils.articles.getBySlug.invalidate({ slug });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, article?.id, slug, utils]);

  // Real-time subscription for comments on this article
  useEffect(() => {
    if (!article?.id) return;

    const channel = supabase
      .channel(`realtime-comments-article-${article.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `article_id=eq.${article.id}` },
        () => {
          utils.comments.getByArticle.invalidate({ articleId: article.id });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, article?.id, utils]);

  // Real-time subscription for comment reactions (likes, loves, supports on comments)
  useEffect(() => {
    if (!article?.id) return;

    const channel = supabase
      .channel(`realtime-comment-reactions-article-${article.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        (payload) => {
          const data = payload.new as { comment_id?: number } | null;
          if (data?.comment_id) {
            utils.comments.getByArticle.invalidate({ articleId: article.id });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, article?.id, utils]);

  // Optimistic like state
  const [optimisticLike, setOptimisticLike] = useState<{ liked: boolean; count: number } | null>(null);

  const toggleLikeMutation = trpc.articles.toggleLike.useMutation({
    onSuccess: (data) => {
      setOptimisticLike((prev) => {
        if (!prev) return prev;
        return {
          liked: data.liked,
          count: prev.count,
        };
      });
    },
    onError: () => {
      setOptimisticLike(null);
    },
  });

  const handleLike = () => {
    if (!user) {
      openModal("like articles");
      return;
    }
    if (!article) return;

    // Get current state - use server's userHasLiked if we don't have optimistic state
    const typedArticle = article as ArticleWithCounts;
    const currentLiked = optimisticLike?.liked ?? typedArticle.userHasLiked ?? false;
    const currentCount = optimisticLike?.count ?? typedArticle.likeCount ?? 0;

    // Optimistically update immediately
    setOptimisticLike({
      liked: !currentLiked,
      count: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    });

    toggleLikeMutation.mutate({ articleId: article.id });
  };

  const contentText = useMemo(() => {
    if (!article) return "";
    try {
      if (Array.isArray(article.content)) {
        return article.content
          .map((b: ContentBlock) => (b.type === "paragraph" ? b.content : ""))
          .join("\n\n");
      }
      return String(article.content || "");
    } catch {
      return "";
    }
  }, [article]);

  // Build pages array; page 0 is the cover
  const textPages = useMemo(() => chunkText(contentText, 1200), [contentText]);

  // spread index: 0 = cover + first page, 1 = pages 2-3, etc.
  const [spread, setSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"forward" | "backward">("forward");
  const [showComments, setShowComments] = useState(() => {
    // Initialize from query param if available (client-side only)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("comments") === "true";
    }
    return false;
  });
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Bookmark state and queries
  const { data: bookmarkData } = trpc.bookmarks.isBookmarked.useQuery(
    { articleId: article?.id ?? 0 },
    { enabled: !!article?.id && !!user }
  );
  const [optimisticBookmarked, setOptimisticBookmarked] = useState<boolean | null>(null);
  const bookmarked = optimisticBookmarked ?? bookmarkData?.bookmarked ?? false;

  const toggleBookmarkMutation = trpc.bookmarks.toggle.useMutation({
    onSuccess: (data) => {
      setOptimisticBookmarked(data.bookmarked);
    },
    onError: () => {
      setOptimisticBookmarked(null);
    },
  });

  const handleToggleBookmark = () => {
    if (!user) {
      openModal("bookmark articles");
      return;
    }
    if (!article) return;
    setOptimisticBookmarked(!bookmarked);
    toggleBookmarkMutation.mutate({ articleId: article.id });
  };

  // Fetch comments when panel is open
  const { data: commentsData, isLoading: commentsLoading, refetch: refetchComments } = trpc.comments.getByArticle.useQuery(
    { articleId: article?.id ?? 0, limit: 50 },
    { enabled: !!article?.id && showComments }
  );

  // Create comment mutation
  const createCommentMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      setCommentText("");
      setPostingComment(false);
      refetchComments();
      // Also refetch article to update comment count
      utils.articles.getBySlug.invalidate({ slug });
    },
    onError: () => {
      setPostingComment(false);
    },
  });

  const handlePostComment = () => {
    if (!user) {
      openModal("post comments");
      return;
    }
    if (!article || !commentText.trim()) return;
    
    setPostingComment(true);
    createCommentMutation.mutate({
      articleId: article.id,
      content: commentText.trim(),
    });
  };

  // Comment reaction mutation
  const toggleCommentReactionMutation = trpc.comments.toggleReaction.useMutation({
    onSuccess: () => {
      refetchComments();
    },
    onError: (error) => {
      console.error("Failed to toggle reaction:", error);
    },
  });

  const handleCommentReaction = (commentId: number, type: "like" | "love" | "support") => {
    if (!user) {
      openModal("react to comments");
      return;
    }
    toggleCommentReactionMutation.mutate({ commentId, type });
  };

  // Computed like state - use server's userHasLiked if we don't have optimistic state
  const typedArticleForLike = article as ArticleWithCounts | undefined;
  const isLiked = optimisticLike?.liked ?? typedArticleForLike?.userHasLiked ?? false;
  const likeCount = optimisticLike?.count ?? typedArticleForLike?.likeCount ?? 0;

  // Total spreads (cover counts as left of spread 0)
  const totalSpreads = Math.ceil((textPages.length + 1) / 2);

  // Reset spread when slug changes
  const [prevSlug, setPrevSlug] = useState(slug);
  if (slug !== prevSlug) {
    setPrevSlug(slug);
    setSpread(0);
  }

  const close = () => router.back();

  const next = useCallback(() => {
    if (isFlipping || spread >= totalSpreads - 1) return;
    setFlipDirection("forward");
    setIsFlipping(true);
    setTimeout(() => {
      setSpread((s) => Math.min(s + 1, totalSpreads - 1));
      setTimeout(() => setIsFlipping(false), 400);
    }, 300);
  }, [isFlipping, spread, totalSpreads]);

  const prev = useCallback(() => {
    if (isFlipping || spread === 0) return;
    setFlipDirection("backward");
    setIsFlipping(true);
    setTimeout(() => {
      setSpread((s) => Math.max(s - 1, 0));
      setTimeout(() => setIsFlipping(false), 400);
    }, 300);
  }, [isFlipping, spread]);

  // Share functionality
  const handleShare = async () => {
    if (!article) return;
    
    const shareUrl = `${window.location.origin}/articles/${article.slug}`;
    const shareData = {
      title: article.title,
      text: article.excerpt || `Check out "${article.title}" on Pamphlets`,
      url: shareUrl,
    };

    // Try native share API first (works on mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or error - fall through to clipboard
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Could add a toast notification here
      alert('Link copied to clipboard!');
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copied to clipboard!');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="text-white">Pamphlet not found</div>
      </div>
    );
  }

  // Check if article is archived or not published
  if (article.status !== "published") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="text-white">Pamphlet no longer available</div>
      </div>
    );
  }

  // Determine left and right page content for current spread
  // Spread 0: left = cover, right = textPages[0]
  // Spread n: left = textPages[2n-1], right = textPages[2n]
  const leftPageIdx = spread === 0 ? -1 : spread * 2 - 1;
  const rightPageIdx = spread * 2;

  const leftContent = leftPageIdx < 0 ? null : textPages[leftPageIdx];
  const rightContent = textPages[rightPageIdx] ?? null;

  const typedArticle = article as ArticleWithCounts;
  const genres: GenreType[] = typedArticle.genres ?? (article.genre ? [article.genre] : []);

  return (
    <>
      <AuthModal isOpen={isOpen} onClose={closeModal} action={action} />
      
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4"
      >
        <div 
          className="absolute inset-0 bg-black/80 touch-manipulation"
          onClick={close}
        />
        <div
          className="relative flex flex-col items-center w-full max-w-[1100px] max-h-[100dvh] sm:max-h-[95vh]"
        >
          {/* Mobile top bar with close and action buttons */}
          <div className="lg:hidden absolute top-0 left-0 right-0 z-[80] flex items-center justify-end px-2 py-1">
            {/* Action buttons and close button on the right */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className={`relative p-2 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 touch-manipulation ${isLiked ? "text-red-500" : "text-zinc-600 dark:text-zinc-300"}`}
              >
                <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                <span className="absolute -top-1 -right-1 z-10 bg-red-500 text-white text-[8px] font-medium min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5">
                  {likeCount}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComments(!showComments);
                }}
                className={`relative p-2 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 touch-manipulation ${showComments ? "text-blue-500" : "text-zinc-600 dark:text-zinc-300"}`}
              >
                <MessageCircle size={16} fill={showComments ? "currentColor" : "none"} />
                <span className="absolute -top-1 -right-1 z-10 bg-blue-500 text-white text-[8px] font-medium min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5">
                  {typedArticle.commentCount ?? 0}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleBookmark();
                }}
                className={`p-2 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 touch-manipulation ${bookmarked ? "text-yellow-500" : "text-zinc-600 dark:text-zinc-300"}`}
              >
                <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="p-2 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 touch-manipulation text-zinc-600 dark:text-zinc-300"
              >
                <Share2 size={16} />
              </button>
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                }}
                className="p-2.5 rounded-full bg-white dark:bg-zinc-800 shadow-lg touch-manipulation"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Mobile Layout - Single page view */}
          <div className="lg:hidden w-full mt-12 sm:mt-10">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden">
              {/* Mobile content */}
              <div className="p-3 sm:p-4 min-h-[50vh] max-h-[60vh] sm:max-h-[65vh] overflow-y-auto">
                {spread === 0 ? (
                  // Cover page on mobile
                  <div className="flex flex-col h-full">
                    {/* Cover Image */}
                    {article.coverImageUrl && (
                      <div className="w-full h-36 sm:h-48 mb-3 sm:mb-4 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                        <img
                          src={article.coverImageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h1 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 leading-tight text-zinc-900 dark:text-zinc-100">{article.title}</h1>
                    {article.excerpt && (
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 italic mb-2 sm:mb-3">{article.excerpt}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                      {genres.map((g: GenreType) => (
                        <span
                          key={g.id}
                          className={`px-2 py-0.5 rounded-full text-xs ${getGenreColor(g.slug)}`}
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-auto pt-2">
                      By {typedArticle.author?.username ?? "Unknown"}
                    </div>
                  </div>
                ) : (
                  // Content pages on mobile - show one page at a time
                  <div className="book-page-content text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {textPages[spread - 1] && renderMarkdown(textPages[spread - 1])}
                  </div>
                )}
              </div>
              
              {/* Mobile page number */}
              <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 py-2 border-t border-zinc-200 dark:border-zinc-700">
                {spread === 0 ? "Cover" : `Page ${spread} of ${textPages.length}`}
              </div>
            </div>

            {/* Mobile comments panel */}
            {showComments && (
              <div className="mt-3 sm:mt-4 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-3 sm:p-4 max-h-[35vh] sm:max-h-[40vh] flex flex-col">
                <h3 className="text-sm font-semibold mb-2 sm:mb-3 shrink-0 text-zinc-900 dark:text-zinc-100">Comments ({typedArticle.commentCount ?? 0})</h3>
                <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0">
                  {commentsLoading ? (
                    <div className="text-xs text-muted-foreground">Loading comments...</div>
                  ) : commentsData?.items && commentsData.items.length > 0 ? (
                    commentsData.items.map((comment: CommentType) => (
                      <div key={comment.id} className="bg-zinc-100 dark:bg-zinc-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center text-xs font-medium">
                            {comment.user?.username?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="text-xs font-medium">{comment.user?.username || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">{comment.content}</p>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleCommentReaction(comment.id, "like")}
                            className={`flex items-center gap-1 transition-colors touch-manipulation ${
                              comment.userLiked 
                                ? "text-blue-500" 
                                : "text-zinc-500 hover:text-blue-500"
                            }`}
                          >
                            <ThumbsUp size={14} className={comment.userLiked ? "fill-current" : ""} />
                            <span className="text-[10px]">{comment.likeCount || 0}</span>
                          </button>
                          <button 
                            onClick={() => handleCommentReaction(comment.id, "love")}
                            className={`flex items-center gap-1 transition-colors touch-manipulation ${
                              comment.userLoved 
                                ? "text-red-500" 
                                : "text-zinc-500 hover:text-red-500"
                            }`}
                          >
                            <Heart size={14} className={comment.userLoved ? "fill-current" : ""} />
                            <span className="text-[10px]">{comment.loveCount || 0}</span>
                          </button>
                          <button 
                            onClick={() => handleCommentReaction(comment.id, "support")}
                            className={`flex items-center gap-1 transition-colors touch-manipulation ${
                              comment.userSupported 
                                ? "text-green-500" 
                                : "text-zinc-500 hover:text-green-500"
                            }`}
                          >
                            <HandHeart size={14} className={comment.userSupported ? "fill-current" : ""} />
                            <span className="text-[10px]">{comment.supportCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No comments yet. Be the first to comment!</div>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-col gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={user ? "Write a comment..." : "Sign in to comment"}
                    disabled={!user}
                    rows={2}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
                  />
                  <button 
                    onClick={handlePostComment}
                    disabled={!user || !commentText.trim() || postingComment}
                    className="w-full px-4 py-2.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {postingComment ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Navigation */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 mt-3 sm:mt-4 pb-2">
              <button
                onClick={() => {
                  if (spread > 0) setSpread(s => s - 1);
                }}
                disabled={spread === 0}
                className="p-2.5 sm:p-3 rounded-full bg-white dark:bg-zinc-800 shadow disabled:opacity-40 touch-manipulation text-zinc-700 dark:text-zinc-300"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs sm:text-sm text-white min-w-[70px] sm:min-w-[80px] text-center">
                {spread === 0 ? "Cover" : `${spread} / ${textPages.length}`}
              </span>
              <button
                onClick={() => {
                  if (spread < textPages.length) setSpread(s => s + 1);
                }}
                disabled={spread >= textPages.length}
                className="p-2.5 sm:p-3 rounded-full bg-white dark:bg-zinc-800 shadow disabled:opacity-40 touch-manipulation text-zinc-700 dark:text-zinc-300"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Desktop Layout - Book spread view */}
          <div className="hidden lg:flex flex-col items-center">
            <div className="flex">
          {/* Book container with flip effect */}
          <div className="relative flex rounded-lg shadow-2xl" style={{ perspective: "2000px" }}>
            {/* Left page (static) */}
            <div className="w-[320px] sm:w-[360px] md:w-[420px] lg:w-[480px] xl:w-[520px] h-[480px] sm:h-[540px] md:h-[620px] lg:h-[700px] xl:h-[750px] bg-amber-50 dark:bg-zinc-900 relative rounded-l-lg border-r border-amber-200 dark:border-zinc-700">
              {/* Page edge shadow for realism */}
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/10 to-transparent pointer-events-none z-20" />
              {/* Content container */}
              <div className="absolute inset-0 p-6 lg:p-8 flex flex-col">
              {spread === 0 ? (
                // Cover page
                <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                  {/* Cover Image */}
                  {article.coverImageUrl && (
                    <div className="w-full h-48 lg:h-56 mb-4 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                      <img
                        src={article.coverImageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-4 leading-tight">{article.title}</h1>
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground italic mb-4">{article.excerpt}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {genres.map((g: GenreType) => (
                        <span
                          key={g.id}
                          className={`px-2 py-0.5 rounded-full text-xs ${getGenreColor(g.slug)}`}
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    By {typedArticle.author?.username ?? "Unknown"}
                  </div>
                </div>
              ) : (
                // Text page - scrollable content area
                <div className="book-page-content text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 flex-1 min-h-0 overflow-y-auto pr-2">
                  {leftContent && renderMarkdown(leftContent)}
                </div>
              )}
              <div className="shrink-0 pt-2 text-center text-xs text-muted-foreground border-t border-amber-200/50 dark:border-zinc-700/50 mt-auto">
                {spread === 0 ? "" : leftPageIdx + 1}
              </div>
              </div>
            </div>

            {/* Right page (static) */}
            <div className="w-[320px] sm:w-[360px] md:w-[420px] lg:w-[480px] xl:w-[520px] h-[480px] sm:h-[540px] md:h-[620px] lg:h-[700px] xl:h-[750px] bg-amber-50 dark:bg-zinc-900 relative rounded-r-lg">
              {/* Left edge shadow */}
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-20" />
              {/* Content container */}
              <div className="absolute inset-0 p-6 lg:p-8 flex flex-col">
              {rightContent ? (
                <div className="book-page-content text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 flex-1 min-h-0 overflow-y-auto pl-2">
                  {renderMarkdown(rightContent)}
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground text-sm">
                  End of article
                </div>
              )}
              <div className="shrink-0 pt-2 text-center text-xs text-muted-foreground border-t border-amber-200/50 dark:border-zinc-700/50 mt-auto">
                {rightContent ? rightPageIdx + 1 : ""}
              </div>
              </div>
            </div>

            {/* Flipping page overlay - forward flip (right to left) */}
            {isFlipping && flipDirection === "forward" && (
              <div 
                className="absolute right-0 top-0 w-[320px] sm:w-[360px] md:w-[420px] lg:w-[480px] xl:w-[520px] h-full"
                style={{ 
                  perspective: "2000px",
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  className="absolute inset-0 bg-amber-50 dark:bg-zinc-900 rounded-r-lg shadow-2xl"
                  style={{
                    transformOrigin: "left center",
                    animation: "flipForward 0.7s ease-in-out forwards",
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-l from-black/20 to-transparent opacity-0" 
                    style={{ animation: "shadowFadeIn 0.35s ease-in-out forwards" }} 
                  />
                </div>
              </div>
            )}

            {/* Flipping page overlay - backward flip (left to right) */}
            {isFlipping && flipDirection === "backward" && (
              <div 
                className="absolute left-0 top-0 w-[320px] sm:w-[360px] md:w-[420px] lg:w-[480px] xl:w-[520px] h-full"
                style={{ 
                  perspective: "2000px",
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  className="absolute inset-0 bg-amber-50 dark:bg-zinc-900 rounded-l-lg shadow-2xl"
                  style={{
                    transformOrigin: "right center",
                    animation: "flipBackward 0.7s ease-in-out forwards",
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent opacity-0"
                    style={{ animation: "shadowFadeIn 0.35s ease-in-out forwards" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Social icons + Comments panel on right side */}
          <div className="ml-4 flex flex-col h-[480px] sm:h-[540px] md:h-[620px] lg:h-[700px] xl:h-[750px]">
            {/* Icons - always visible, transition from vertical to horizontal */}
            <div className={`flex gap-3 transition-all duration-300 ease-in-out ${
              showComments ? "flex-row mb-3 shrink-0" : "flex-col justify-center h-full"
            }`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                }}
                className="p-3 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 text-zinc-600 dark:text-zinc-300"
              >
                <X size={22} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className={`relative p-3 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 ${isLiked ? "text-red-500" : ""}`}
              >
                <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
                <span className="absolute -top-1 -right-1 z-10 bg-red-500 text-white text-[10px] font-medium min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {likeCount}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComments(!showComments);
                }}
                className={`relative p-3 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 ${showComments ? "text-blue-500" : ""}`}
              >
                <MessageCircle size={22} fill={showComments ? "currentColor" : "none"} />
                <span className="absolute -top-1 -right-1 z-10 bg-blue-500 text-white text-[10px] font-medium min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {typedArticle.commentCount ?? 0}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleBookmark();
                }}
                className={`p-3 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 ${bookmarked ? "text-yellow-500" : ""}`}
              >
                <Bookmark size={22} fill={bookmarked ? "currentColor" : "none"} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="p-3 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200"
              >
                <Share2 size={22} />
              </button>
            </div>

            {/* Comments section - slides in from right */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out flex-1 ${
              showComments ? "w-[280px] sm:w-[320px] opacity-100" : "w-0 opacity-0"
            }`}>
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 h-full flex flex-col">
                <h3 className="text-sm font-semibold mb-3 shrink-0">Comments ({typedArticle.commentCount ?? 0})</h3>
                <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                  {commentsLoading ? (
                    <div className="text-xs text-muted-foreground">Loading comments...</div>
                  ) : commentsData?.items && commentsData.items.length > 0 ? (
                    commentsData.items.map((comment: CommentType) => (
                      <div key={comment.id} className="bg-zinc-100 dark:bg-zinc-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center text-xs font-medium">
                            {comment.user?.username?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="text-xs font-medium">{comment.user?.username || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">{comment.content}</p>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleCommentReaction(comment.id, "like")}
                            className={`flex items-center gap-1 transition-colors ${
                              comment.userLiked 
                                ? "text-blue-500" 
                                : "text-zinc-500 hover:text-blue-500"
                            }`}
                          >
                            <ThumbsUp size={14} className={comment.userLiked ? "fill-current" : ""} />
                            <span className="text-[10px]">{comment.likeCount || 0}</span>
                          </button>
                          <button 
                            onClick={() => handleCommentReaction(comment.id, "love")}
                            className={`flex items-center gap-1 transition-colors ${
                              comment.userLoved 
                                ? "text-red-500" 
                                : "text-zinc-500 hover:text-red-500"
                            }`}
                          >
                            <Heart size={14} className={comment.userLoved ? "fill-current" : ""} />
                            <span className="text-[10px]">{comment.loveCount || 0}</span>
                          </button>
                          <button 
                            onClick={() => handleCommentReaction(comment.id, "support")}
                            className={`flex items-center gap-1 transition-colors ${
                              comment.userSupported 
                                ? "text-green-500" 
                                : "text-zinc-500 hover:text-green-500"
                            }`}
                          >
                            <HandHeart size={14} className={comment.userSupported ? "fill-current" : ""} />
                            <span className="text-[10px]">{comment.supportCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No comments yet. Be the first to comment!</div>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-col gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (user && commentText.trim() && !postingComment) {
                          handlePostComment();
                        }
                      }
                    }}
                    placeholder={user ? "Write a comment..." : "Sign in to comment"}
                    disabled={!user}
                    rows={3}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
                  />
                  <button 
                    onClick={handlePostComment}
                    disabled={!user || !commentText.trim() || postingComment}
                    className="w-full px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {postingComment ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>
            </div>

        {/* Navigation - Desktop only */}
        <div className="hidden lg:flex items-center gap-6 mt-4">
          <button
            onClick={prev}
            disabled={spread === 0}
            className="p-3 rounded-full bg-white dark:bg-zinc-800 shadow disabled:opacity-40"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-sm text-white">
            {spread + 1} / {totalSpreads}
          </span>
          <button
            onClick={next}
            disabled={spread >= totalSpreads - 1}
            className="p-3 rounded-full bg-white dark:bg-zinc-800 shadow disabled:opacity-40"
          >
            <ChevronRight size={24} />
          </button>
        </div>
          </div>
        </div>
      </div>
    </>
  );
}
