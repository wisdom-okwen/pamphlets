import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { withAuth } from "@/components/auth/withAuth";
import { NextSeo } from "next-seo";
import { createClient } from "@/utils/supabase/clients/browser";
import {
  Bell,
  X,
  ExternalLink,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Notification } from "@/server/db/schema";

type TabType = "all" | "subscribe";

function NotificationsPage() {
  const { t } = useTranslation("common");
  const supabase = useMemo(() => createClient(), []);
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const { data: notifications = [], isLoading: notificationsLoading } =
    trpc.notifications.getNotifications.useQuery({ limit: 50 });

  const { data: preferences } = trpc.notifications.getPreferences.useQuery();

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getNotifications.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getNotifications.invalidate();
    },
  });

  const updatePreferencesMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      utils.notifications.getPreferences.invalidate();
    },
  });

  const deleteNotificationMutation = trpc.notifications.deleteNotification.useMutation({
    onSuccess: () => {
      utils.notifications.getNotifications.invalidate();
      utils.notifications.getUnreadCount.invalidate();
      setSelectedNotification(null);
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          utils.notifications.getNotifications.invalidate();
          utils.notifications.getUnreadCount.invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, utils]);

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.isRead) {
      markAsReadMutation.mutate({ notificationId: notification.id });
    }
  };

  const handleSubscribeToggle = () => {
    if (preferences) {
      updatePreferencesMutation.mutate({
        subscribeNewArticles: !preferences.subscribeNewArticles,
      });
    }
  };

  const renderNotificationDetail = (notification: Notification) => {
    let articleSlug: string | null = null;

    if (notification.type === "new_article" && notification.articleId) {
      articleSlug = `/articles/${notification.articleId}`;
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{notification.title}</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(notification.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <p className="text-sm leading-relaxed">{notification.message}</p>

        {articleSlug && (
          <Link
            href={articleSlug}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            View Article
            <ExternalLink size={14} />
          </Link>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              deleteNotificationMutation.mutate({
                notificationId: notification.id,
              })
            }
            disabled={deleteNotificationMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <NextSeo
        title={t("notifications.title")}
        description={t("notifications.emptyDesc")}
        noindex
      />

      <main className="flex h-[calc(100vh-60px)]">
        <div className="flex-1 border-r overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-black border-b px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab("subscribe")}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeTab === "subscribe"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                Subscribe
              </button>
            </div>

            {activeTab === "all" && notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={
                  markAllAsReadMutation.isPending ||
                  notifications.every((n) => n.isRead)
                }
              >
                {t("notifications.markAllRead")}
              </Button>
            )}
          </div>

          {activeTab === "all" ? (
            <div className="divide-y">
              {notificationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Bell className="size-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="font-medium text-muted-foreground">
                    {t("notifications.empty")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("notifications.emptyDesc")}
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-l-2 ${
                      selectedNotification?.id === notification.id
                        ? "border-l-primary bg-muted/30"
                        : "border-l-transparent"
                    } ${!notification.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`truncate ${
                            !notification.isRead
                              ? "font-bold"
                              : "font-normal text-muted-foreground"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Notification Subscriptions</h3>

                {/* Subscribe to New Articles */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bell size={18} />
                      Subscribe to New Articles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when new articles are published.
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences?.subscribeNewArticles ?? true}
                        onChange={handleSubscribeToggle}
                        disabled={updatePreferencesMutation.isPending}
                        className="size-4 rounded"
                      />
                      <span className="text-sm">
                        {preferences?.subscribeNewArticles
                          ? "Subscribed"
                          : "Not subscribed"}
                      </span>
                    </label>
                  </CardContent>
                </Card>

                {/* Email Notifications */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle size={18} />
                      Email Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Receive email updates for your notifications.
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences?.emailNotifications ?? true}
                        onChange={() => {
                          if (preferences) {
                            updatePreferencesMutation.mutate({
                              emailNotifications:
                                !preferences.emailNotifications,
                            });
                          }
                        }}
                        disabled={updatePreferencesMutation.isPending}
                        className="size-4 rounded"
                      />
                      <span className="text-sm">
                        {preferences?.emailNotifications
                          ? "Enabled"
                          : "Disabled"}
                      </span>
                    </label>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Right: Notification Detail Panel */}
        {selectedNotification && (
          <div className="w-96 border-l bg-muted/50 overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-background">
              <h2 className="font-semibold">Details</h2>
              <button
                onClick={() => setSelectedNotification(null)}
                className="p-1 rounded hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              {renderNotificationDetail(selectedNotification)}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default withAuth(NotificationsPage);

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
