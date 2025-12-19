import { useState, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { withAuth } from "@/components/auth/withAuth";
import { NextSeo } from "next-seo";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { createClient } from "@/utils/supabase/clients/browser";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import {
  Settings,
  User,
  Palette,
  Globe,
  Bell,
  Shield,
  Camera,
  Loader2,
  Check,
  X,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SettingsSection = "profile" | "appearance" | "language" | "notifications" | "privacy";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

function SettingsPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const utils = trpc.useUtils();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Language state - use current locale from router
  const [language, setLanguage] = useState(router.locale || "en");

  // Notification settings state
  const [subscribeNewArticles, setSubscribeNewArticles] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [subscribeReactionNotifications, setSubscribeReactionNotifications] = useState(true);

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = trpc.users.getMyProfile.useQuery();

  // Fetch notification preferences from database
  const { data: preferences } = trpc.notifications.getPreferences.useQuery();

  // Update preference mutations
  const updatePreferencesMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      utils.notifications.getPreferences.invalidate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Update profile when data loads
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || "");
    }
  }, [profile]);

  // Load preferences from database
  useEffect(() => {
    if (preferences) {
      setSubscribeNewArticles(preferences.subscribeNewArticles);
      setEmailNotifications(preferences.emailNotifications);
      setSubscribeReactionNotifications(preferences.subscribeReactionNotifications);
    }
  }, [preferences]);

  // Sync language state with router locale
  useEffect(() => {
    if (router.locale) {
      setLanguage(router.locale);
    }
  }, [router.locale]);

  // Real-time subscription for profile updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-profile-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as {
            username: string | null;
            bio: string | null;
            avatarUrl: string | null;
          };
          // Update local state with real-time changes
          if (updated.username !== undefined) setUsername(updated.username || "");
          if (updated.bio !== undefined) setBio(updated.bio || "");
          if (updated.avatarUrl !== undefined) setAvatarUrl(updated.avatarUrl || "");
          // Also invalidate the query cache
          utils.users.getMyProfile.invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, utils.users.getMyProfile]);

  const updateProfileMutation = trpc.users.updateMyProfile.useMutation({
    onSuccess: () => {
      utils.users.getMyProfile.invalidate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsSaving(false);
    },
    onError: (err) => {
      setError(err.message);
      setIsSaving(false);
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("content_images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("content_images").getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      setAvatarPreview(null);
    } catch (err) {
      setError("Failed to upload avatar. Please try again.");
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveProfile = () => {
    setError(null);
    setIsSaving(true);

    updateProfileMutation.mutate({
      username: username.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim(),
    });
  };

  const handleSaveLanguage = () => {
    localStorage.setItem("pamphlets-language", language);
    router.push(router.pathname, router.asPath, { locale: language });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveNotifications = () => {
    updatePreferencesMutation.mutate({
      emailNotifications,
      subscribeNewArticles,
      subscribeReactionNotifications,
    });
  };

  const sections = [
    { id: "profile" as const, label: t("settings.sections.profile"), icon: User },
    { id: "appearance" as const, label: t("settings.sections.appearance"), icon: Palette },
    { id: "language" as const, label: t("settings.sections.language"), icon: Globe },
    { id: "notifications" as const, label: t("settings.sections.notifications"), icon: Bell },
    { id: "privacy" as const, label: t("settings.sections.privacy"), icon: Shield },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">{t("settings.profile.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.profile.description")}
              </p>
            </div>

            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Avatar */}
                <div className="space-y-2">
                  <Label>{t("settings.profile.profilePicture")}</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-muted overflow-hidden">
                        {avatarPreview || avatarUrl ? (
                          <img
                            src={avatarPreview || avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                            {username.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Loader2 className="size-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                      >
                        <Camera className="size-4 mr-2" />
                        {t("settings.profile.changePhoto")}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {t("settings.profile.imageRequirements")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">{t("settings.profile.username")}</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("settings.profile.usernamePlaceholder")}
                    maxLength={50}
                  />
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t("settings.profile.email")}</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("settings.profile.emailNote")}
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">{t("settings.profile.bio")}</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t("settings.profile.bioPlaceholder")}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {bio.length}/500 {t("settings.profile.characters")}
                  </p>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : saveSuccess ? (
                    <Check className="size-4 mr-2" />
                  ) : null}
                  {saveSuccess ? t("common.saved") : t("common.saveChanges")}
                </Button>
              </div>
            )}
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">{t("settings.appearance.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.appearance.description")}
              </p>
            </div>

            <div className="space-y-4">
              <Label>{t("settings.appearance.theme")}</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <Sun className="size-6" />
                  <span className="text-sm font-medium">{t("settings.appearance.light")}</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <Moon className="size-6" />
                  <span className="text-sm font-medium">{t("settings.appearance.dark")}</span>
                </button>
              </div>
            </div>
          </div>
        );

      case "language":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">{t("settings.language.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.language.description")}
              </p>
            </div>

            <div className="space-y-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    language === lang.code
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {language === lang.code && (
                    <Check className="size-4 ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>

            <Button onClick={handleSaveLanguage}>
              {saveSuccess ? <Check className="size-4 mr-2" /> : null}
              {saveSuccess ? t("common.saved") : t("settings.language.saveLanguage")}
            </Button>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">{t("settings.notifications.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.notifications.description")}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">{t("settings.notifications.newPamphlets")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.newPamphletsDesc")}
                  </p>
                </div>
                <button
                  onClick={() => setSubscribeNewArticles(!subscribeNewArticles)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    subscribeNewArticles ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      subscribeNewArticles ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">{t("settings.notifications.email")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.emailDesc")}
                  </p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    emailNotifications ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      emailNotifications ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">{t("settings.notifications.reactions")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.reactionsDesc")}
                  </p>
                </div>
                <button
                  onClick={() => setSubscribeReactionNotifications(!subscribeReactionNotifications)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    subscribeReactionNotifications ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      subscribeReactionNotifications ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            <Button
              onClick={handleSaveNotifications}
              disabled={updatePreferencesMutation.isPending}
            >
              {saveSuccess ? <Check className="size-4 mr-2" /> : null}
              {saveSuccess ? t("common.saved") : t("settings.notifications.savePreferences")}
            </Button>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">{t("settings.privacy.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.privacy.description")}
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border">
                <h3 className="font-medium mb-2">{t("settings.privacy.accountData")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("settings.privacy.accountDataDesc")}
                </p>
                <Button variant="outline" size="sm">
                  {t("settings.privacy.requestExport")}
                </Button>
              </div>

              <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                <h3 className="font-medium text-destructive mb-2">{t("settings.privacy.dangerZone")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("settings.privacy.dangerZoneDesc")}
                </p>
                <Button variant="destructive" size="sm">
                  {t("settings.privacy.deleteAccount")}
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <NextSeo title={t("settings.pageTitle")} description={t("settings.pageDescription")} noindex />

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <Settings className="size-6 sm:size-8" />
          <h1 className="text-2xl sm:text-3xl font-bold">{t("settings.pageTitle")}</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
            <X className="size-4" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 sm:gap-8">
          {/* Sidebar Navigation */}
          <nav className="md:w-64 shrink-0">
            <div className="flex md:flex-col overflow-x-auto md:overflow-visible gap-2 md:gap-1 pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors whitespace-nowrap touch-manipulation ${
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 md:bg-transparent hover:bg-muted"
                  }`}
                >
                  <section.icon className="size-4 md:size-5" />
                  <span className="font-medium text-sm md:text-base">{section.label}</span>
                  <ChevronRight
                    className={`size-4 ml-auto hidden md:block transition-transform ${
                      activeSection === section.id ? "rotate-90" : ""
                    }`}
                  />
                </button>
              ))}
            </div>
          </nav>

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            <div className="bg-card rounded-xl border p-4 sm:p-6">{renderContent()}</div>
          </main>
        </div>
      </div>
    </>
  );
}

export default withAuth(SettingsPage);

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
