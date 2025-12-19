import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";
import { trpc } from "@/lib/trpc";
import { withAuth } from "@/components/auth/withAuth";
import { createClient } from "@/utils/supabase/clients/browser";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { getGenreColor } from "@/models/genreColors";
import { Users, FileText, PlusSquare, Search, ArrowLeft } from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  role: string;
}

interface AdminArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  genres?: { id: number; name: string; slug: string }[];
}

export default withAuth(function AdminPage() {
  const router = useRouter();
  const { isAdmin, user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [query, setQuery] = useState("");

  // Derive activeView from URL query parameter for persistence across refreshes
  const activeView = (router.query.view as "home" | "users" | "articles") || "home";
  const setActiveView = (view: "home" | "users" | "articles") => {
    router.push({ pathname: "/admin", query: view === "home" ? {} : { view } }, undefined, { shallow: true });
  };

  // Users data via tRPC (admin only, bypasses RLS)
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = trpc.users.getAll.useQuery(
    { limit: 500 },
    { enabled: activeView === "users" && isAdmin }
  );
  const [usersList, setUsersList] = useState<AdminUser[]>([]);

  const trpcCtx = trpc.useContext();

  // Users mutations
  const updateUserRole = trpc.users.updateRole.useMutation({
    onMutate: async ({ id, role }) => {
      // Optimistically update the local state immediately
      setUsersList((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role } : u))
      );
    },
    onSuccess() {
      trpcCtx.users.getAll.invalidate();
    },
    onError: (err) => {
      // Revert on error by refetching
      trpcCtx.users.getAll.invalidate();
      alert("Failed to update role: " + err.message);
    },
  });
  const deleteUserMutation = trpc.users.delete.useMutation({
    onMutate: async ({ id }) => {
      // Optimistically remove the user from the list
      setUsersList((prev) => prev.filter((u) => u.id !== id));
    },
    onSuccess() {
      trpcCtx.users.getAll.invalidate();
    },
    onError: (err) => {
      // Revert on error by refetching
      trpcCtx.users.getAll.invalidate();
      alert("Failed to delete user: " + err.message);
    },
  });

  const { data: articlesData, isLoading: articlesLoading } = trpc.articles.getAll.useQuery({ limit: 100 });
  const [viewStatus, setViewStatus] = useState<"all" | "published" | "archived" | "draft">("published");
  const {
    data: adminArticlesData,
  } = trpc.articles.adminGetAll.useQuery(
    { limit: 200, status: viewStatus === "all" ? undefined : viewStatus },
    { enabled: activeView === "articles" && isAdmin, refetchOnWindowFocus: false, staleTime: Infinity }
  );
  const [articlesList, setArticlesList] = useState<AdminArticle[]>([]);
  const deleteArticle = trpc.articles.delete.useMutation({
    onMutate: async ({ id }) => {
      setArticlesList((prev) => prev.filter((a) => a.id !== id));
    },
    onSuccess() {},
    onError: (err) => {
      trpcCtx.articles.getAll.invalidate();
      alert("Failed to delete pamphlet: " + err.message);
    },
  });
  const updateArticle = trpc.articles.update.useMutation({
    onMutate: async ({ id, status }) => {
      setArticlesList((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: status || a.status } : a))
      );
    },
    onSuccess() {
      trpcCtx.articles.getAll.invalidate();
      trpcCtx.articles.adminGetAll.invalidate();
    },
    onError: (err) => {
      trpcCtx.articles.getAll.invalidate();
      trpcCtx.articles.adminGetAll.invalidate();
      alert("Failed to update pamphlet: " + err.message);
    },
  });

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin && user) {
      router.replace("/");
    }
  }, [isAdmin, user, router]);

  // Sync users data from tRPC to local state for realtime updates
  useEffect(() => {
    if (usersData?.items) {
      setUsersList(usersData.items as AdminUser[]);
    }
  }, [usersData]);

  // Real-time: subscribe to users table changes when users view active
  useEffect(() => {
    if (!isAdmin || activeView !== "users") return;

    const channel = supabase
      .channel("realtime-users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        (payload: RealtimePostgresChangesPayload<AdminUser>) => {
          const e = payload.eventType;
          if (e === "INSERT" && payload.new) {
            setUsersList((prev) => [payload.new as AdminUser, ...prev]);
          } else if (e === "UPDATE" && payload.new) {
            setUsersList((prev) => prev.map((u) => (u.id === (payload.new as AdminUser).id ? payload.new as AdminUser : u)));
          } else if (e === "DELETE" && payload.old) {
            setUsersList((prev) => prev.filter((u) => u.id !== (payload.old as AdminUser).id));
          }
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [isAdmin, activeView, supabase]);

  // maintain a local articles list for realtime updates
  useEffect(() => {
    const base = activeView === "articles" && isAdmin ? (adminArticlesData?.items || []) : (articlesData?.items || []);
    setArticlesList(base as AdminArticle[]);
  }, [adminArticlesData, articlesData, activeView, isAdmin]);

  // Real-time: subscribe to articles changes when admin viewing articles
  useEffect(() => {
    if (!isAdmin || activeView !== "articles") return;

    const channel = supabase
      .channel("realtime-articles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "articles" },
        (payload: RealtimePostgresChangesPayload<AdminArticle>) => {
          const e = payload.eventType;
          if (e === "INSERT" && payload.new) {
            setArticlesList((prev) => [payload.new as AdminArticle, ...prev]);
          } else if (e === "UPDATE" && payload.new) {
            setArticlesList((prev) => prev.map((it) => (it.id === (payload.new as AdminArticle).id ? payload.new as AdminArticle : it)));
          } else if (e === "DELETE" && payload.old) {
            setArticlesList((prev) => prev.filter((it) => it.id !== (payload.old as AdminArticle).id));
          }
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [isAdmin, activeView, supabase]);

  // Admin statistics (overview + timeseries)
  const { data: statsOverview } = trpc.adminStats.overview.useQuery(undefined, { enabled: activeView === "home" && isAdmin });
  const { data: statsTimeseries } = trpc.adminStats.timeseries.useQuery({ days: 14 }, { enabled: activeView === "home" && isAdmin });

  const handleChangeRole = (id: string, newRole: string) => {
    updateUserRole.mutate({ id, role: newRole as "visitor" | "author" | "admin" });
  };

  const handleDeleteUser = (id: string) => {
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    deleteUserMutation.mutate({ id });
  };

  const handleDeleteArticle = async (id: number) => {
    if (!confirm("Delete this pamphlet? This action cannot be undone.")) return;
    deleteArticle.mutate({ id });
  };

  const filteredUsers = usersList.filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (u.email || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  const sourceArticles = (articlesList && articlesList.length > 0)
    ? articlesList
    : activeView === "articles" && isAdmin
    ? (adminArticlesData?.items || [])
    : (articlesData?.items || []);

  const articles = (sourceArticles || []).filter((a: AdminArticle) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (a.title || "").toLowerCase().includes(q) ||
      (a.slug || "").toLowerCase().includes(q) ||
      (a.excerpt || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <NextSeo title="Admin" description="Admin dashboard" noindex />

      <main className="min-h-screen bg-background px-4 py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

          {/* Top card buttons (only on home) */}
          {activeView === "home" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setActiveView("users")}
                className="group flex flex-col items-start gap-2 p-4 rounded-lg border shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 bg-card"
              >
                <div className="flex items-center gap-3">
                  <Users className="text-primary" />
                  <div>
                    <span className="text-sm font-semibold">Manage Users</span>
                    <div className="text-xs text-muted-foreground">View, change roles, and remove users</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveView("articles")}
                className="group flex flex-col items-start gap-2 p-4 rounded-lg border shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 bg-card"
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-primary" />
                  <div>
                    <span className="text-sm font-semibold">Manage Pamphlets</span>
                    <div className="text-xs text-muted-foreground">Edit, publish, or delete pamphlets</div>
                  </div>
                </div>
              </button>

              <Link
                href="/admin/articles/new"
                className="group flex flex-col items-start gap-2 p-4 rounded-lg border shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 bg-card"
              >
                <div className="flex items-center gap-3">
                  <PlusSquare className="text-primary" />
                  <div>
                    <span className="text-sm font-semibold">Create New Pamphlet</span>
                    <div className="text-xs text-muted-foreground">Open the editor to publish a new pamphlet</div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Admin stats: overview cards + recent timeseries */}
          {activeView === "home" && isAdmin && (
            <div className="mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded border shadow-sm bg-card">
                  <div className="text-xs text-muted-foreground">Total Users</div>
                  <div className="text-lg font-semibold">{Number(statsOverview?.totalUsers ?? 0)}</div>
                </div>
                <div className="p-3 rounded border shadow-sm bg-card">
                  <div className="text-xs text-muted-foreground">Total Pamphlets</div>
                  <div className="text-lg font-semibold">{Number(statsOverview?.totalArticles ?? 0)}</div>
                </div>
                <div className="p-3 rounded border shadow-sm bg-card">
                  <div className="text-xs text-muted-foreground">Published</div>
                  <div className="text-lg font-semibold">{Number(statsOverview?.published ?? 0)}</div>
                </div>
                <div className="p-3 rounded border shadow-sm bg-card">
                  <div className="text-xs text-muted-foreground">Archived</div>
                  <div className="text-lg font-semibold">{Number(statsOverview?.archived ?? 0)}</div>
                </div>
              </div>

              <div className="border rounded p-3 bg-card">
                <div className="text-sm font-medium mb-2">Recent activity (last 14 days)</div>
                <div className="overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1 w-1/3">Day</th>
                        <th className="px-2 py-1 w-1/3">Pamphlets</th>
                        <th className="px-2 py-1 w-1/3">New Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsTimeseries?.articlesPerDay?.map((row, idx) => {
                        const day = row.day ? String(row.day) : "-";
                        const articlesCount = Number(row.count ?? 0);
                        const userRow = statsTimeseries?.usersPerDay?.find((r) => String(r.day) === String(row.day));
                        const usersCount = Number(userRow?.count ?? 0);
                        return (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1">{day}</td>
                            <td className="px-2 py-1">{articlesCount}</td>
                            <td className="px-2 py-1">{usersCount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Back + search (shown when not on home) */}
        {activeView !== "home" && (
          <div className="mb-4 flex items-center gap-3">
            <button onClick={() => setActiveView("home")} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={activeView === "users" ? "Search users by email, username or role" : "Search pamphlets by title, slug or excerpt"}
                  className="pl-10 w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Users section (only when active) */}
        {activeView === "users" && (
          <section id="users-section" className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Users</h2>
            {usersLoading ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : usersError ? (
              <p className="text-sm text-destructive">{usersError.message}</p>
            ) : (
              <div className="overflow-auto border rounded-md">
                <table className="w-full text-left table-fixed">
                  <thead className="bg-muted/5">
                    <tr>
                      <th className="px-3 py-2 w-1/3">Email</th>
                      <th className="px-3 py-2 w-1/4">Username</th>
                      <th className="px-3 py-2 w-1/6">Role</th>
                      <th className="px-3 py-2 w-1/6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2">{u.email}</td>
                        <td className="px-3 py-2">{u.username}</td>
                        <td className="px-3 py-2">
                          <select
                            value={u.role || "visitor"}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="visitor">visitor</option>
                            <option value="author">author</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-sm text-destructive px-2 py-1 rounded bg-destructive/10 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Articles section (only when active) */}
        {activeView === "articles" && (
          <section id="articles-section">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Pamphlets</h2>
              <div className="flex gap-1 bg-muted/20 rounded p-1">
                <button
                  onClick={() => setViewStatus("published")}
                  className={`text-sm px-3 py-1 rounded transition-colors ${viewStatus === "published" ? "bg-primary text-primary-foreground" : "hover:bg-muted/40"}`}
                >
                  Published
                </button>
                <button
                  onClick={() => setViewStatus("draft")}
                  className={`text-sm px-3 py-1 rounded transition-colors ${viewStatus === "draft" ? "bg-primary text-primary-foreground" : "hover:bg-muted/40"}`}
                >
                  Drafts
                </button>
                <button
                  onClick={() => setViewStatus("archived")}
                  className={`text-sm px-3 py-1 rounded transition-colors ${viewStatus === "archived" ? "bg-primary text-primary-foreground" : "hover:bg-muted/40"}`}
                >
                  Archived
                </button>
                <button
                  onClick={() => setViewStatus("all")}
                  className={`text-sm px-3 py-1 rounded transition-colors ${viewStatus === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted/40"}`}
                >
                  All
                </button>
              </div>
            </div>
            {articlesLoading ? (
              <p className="text-sm text-muted-foreground">Loading pamphlets...</p>
            ) : (
              <div className="space-y-3">
                {articles.map((a: AdminArticle) => (
                  <div key={a.id} className="group flex items-center justify-between gap-4 border rounded px-3 py-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transform transition-all duration-200 bg-card">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium line-clamp-1">
                        {a.title}
                        {a.status === "archived" && (
                          <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Archived</span>
                        )}
                      </div>
                      <div className="mt-1">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                            {(a.genres && a.genres.length > 0 ? a.genres : []).map((g: { id: number; name: string; slug: string }) => (
                              <span key={g.id} className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap shrink-0 ${getGenreColor(g.slug)}`}> 
                                {g.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{a.excerpt || a.slug}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/articles/${a.slug}`} className="text-sm px-2 py-1 rounded border shadow-sm bg-muted/5 text-primary hover:shadow-md">View</Link>
                      <Link href={`/admin/articles/${a.slug}/edit`} className="text-sm px-2 py-1 rounded border shadow-sm bg-muted/5 hover:shadow-md">Edit</Link>
                      {a.status === "archived" ? (
                        <button
                          onClick={() => updateArticle.mutate({ id: a.id, status: "published" })}
                          className="text-sm px-2 py-1 rounded border shadow-sm bg-green-50 text-green-700 hover:shadow-md"
                          title="Unarchive pamphlet"
                        >
                          Unarchive
                        </button>
                      ) : (
                        <button
                          onClick={() => updateArticle.mutate({ id: a.id, status: "archived" })}
                          className="text-sm px-2 py-1 rounded border shadow-sm bg-amber-50 text-amber-700 hover:shadow-md"
                          title="Archive pamphlet"
                        >
                          Archive
                        </button>
                      )}
                      <button onClick={() => handleDeleteArticle(a.id)} className="text-sm px-2 py-1 rounded border shadow-sm bg-destructive/10 text-destructive hover:shadow-md">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}, { requireAdmin: true });
