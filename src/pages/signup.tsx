import { useMemo, useState } from "react";
import Link from "next/link";
import { NextSeo } from "next-seo";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { createClient } from "@/utils/supabase/clients/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Lock, User, Loader2, Heart, Users, Sparkles, Sun, Moon, Info, X } from "lucide-react";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useTheme } from "@/contexts/ThemeContext";

export default function SignupPage() {
  const { t } = useTranslation("common");
  const supabase = useMemo(() => createClient(), []);
  const { theme, toggle, mounted } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [showAbout, setShowAbout] = useState(false);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = data.user ?? null;

      if (!data.session && user) {
        setConfirmationEmail(email);
        setShowConfirmation(true);
        return;
      }

      if (!user) {
        setError("Unable to complete sign up. Please try again.");
        return;
      }

      // Create user record in public.users table
      const { error: profileError } = await supabase
        .from("users")
        .upsert(
          {
            id: user.id,
            email: user.email,
            username: displayName || user.email?.split("@")[0],
            role: "visitor",
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.error("Error creating user profile:", profileError);
        // Don't block signup if profile creation fails
      }

      // Redirect to home page after successful signup
      window.location.href = "/";
    } catch {
      setError("An error occurred during signup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <>
      <NextSeo
        title={t("nav.signUp")}
        description={t("auth.joinCommunity")}
        noindex
      />

      <main className="flex min-h-screen">
        {/* Left Side - About Section */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-white p-12 flex-col justify-between relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 border border-white/20 rounded-full" />
            <div className="absolute top-40 right-20 w-24 h-24 border border-white/20 rounded-full" />
            <div className="absolute bottom-20 left-1/4 w-40 h-40 border border-white/20 rounded-full" />
            <div className="absolute bottom-40 right-10 w-20 h-20 border border-white/20 rounded-full" />
          </div>

          <div className="relative z-20">
            <div className="flex items-center gap-4 mb-2">
              <img
                src="/pamphlets.svg"
                alt="Pamphlets Logo"
                className="size-12"
              />
              <span className="text-4xl font-bold">{t("common.appName")}</span>
            </div>
            <p className="text-white/80 text-lg">{t("common.tagline")}</p>
          </div>

          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl font-bold leading-tight">
              {t("about.tagline")}
            </h2>
            <p className="text-white/90 text-lg max-w-md">
              {t("about.description")}
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("about.features.freeExpression")}</h3>
                  <p className="text-white/70 text-sm">{t("about.features.freeExpressionDesc")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Heart className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("about.features.personalWritings")}</h3>
                  <p className="text-white/70 text-sm">{t("about.features.personalWritingsDesc")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Users className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("about.features.community")}</h3>
                  <p className="text-white/70 text-sm">{t("about.features.communityDesc")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-white/60 text-sm">
              &quot;{t("about.quote")}&quot;
            </p>
            <p className="text-white/40 text-sm mt-1">— {t("about.quoteAuthor")}</p>
          </div>
        </div>

        {/* Right Side - Signup */}
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-background px-4 sm:px-6 py-8 min-h-screen overflow-y-auto relative">
          {/* Top buttons - About (mobile only) and Theme Toggle */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {mounted && (
              <>
                <button
                  onClick={() => setShowAbout(true)}
                  aria-label={t("about.title")}
                  className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <Info size={18} />
                  <span>{t("about.title").replace("About ", "")}</span>
                </button>
                <button
                  onClick={toggle}
                  aria-label="toggle-theme"
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </>
            )}
          </div>
          <Card className="w-full max-w-md border-0 shadow-none lg:shadow-lg lg:border my-auto">
            {showConfirmation ? (
              <>
                <CardHeader className="space-y-1 text-center px-4 sm:px-6">
                  <div className="mb-2 flex justify-center">
                    <Mail className="size-12 text-primary" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-bold">{t("auth.checkEmail")}</CardTitle>
                  <CardDescription>
                    We&apos;ve sent a confirmation link to <strong>{confirmationEmail}</strong>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 px-4 sm:px-6">
                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  
                  <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-4 text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-2">Didn&apos;t receive the email?</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Check your spam folder</li>
                      <li>Try adding us to your contacts</li>
                      <li>The link expires in 24 hours</li>
                    </ul>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => {
                      setShowConfirmation(false);
                      setError(null);
                    }}
                  >
                    {t("common.back")} to {t("nav.signUp").toLowerCase()}
                  </Button>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 px-4 sm:px-6 pb-8">
                  <p className="text-center text-xs text-muted-foreground">
                    Once you confirm your email, you&apos;ll be able to sign in to your account.
                  </p>
                  <p className="text-center text-xs text-muted-foreground">
                    Already signed in?{" "}
                    <Link
                      href="/"
                      className="font-medium text-primary hover:underline"
                    >
                      Go to home
                    </Link>
                  </p>
                </CardFooter>
              </>
            ) : (
              <>
                <CardHeader className="space-y-1 text-center px-4 sm:px-6">
                  {/* Mobile Logo */}
                  <div className="lg:hidden flex flex-col items-center mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src="/pamphlets.svg"
                        alt="Pamphlets Logo"
                        className="size-10"
                      />
                      <span className="text-2xl font-bold">{t("common.appName")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{t("common.tagline")}</p>
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-bold">{t("auth.createAccount")}</CardTitle>
                  <CardDescription>
                    {t("auth.joinCommunity")}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 px-4 sm:px-6">
                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={handleGoogleSignup}
                    disabled={isGoogleLoading || isLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <GoogleIcon className="mr-2 size-4" />
                    )}
                    {t("auth.continueWithGoogle")}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        {t("auth.orContinueWith")} email
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleEmailSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">{t("auth.username")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="displayName"
                          type="text"
                          placeholder="John Doe"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="pl-10"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t("auth.email")}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">{t("auth.password")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                          required
                          minLength={8}
                          disabled={isLoading}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("auth.passwordRequirements")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          {t("auth.signingUp")}
                        </>
                      ) : (
                        t("auth.createAccount")
                      )}
                    </Button>
                  </form>

                  <p className="text-center text-xs text-muted-foreground">
                    By signing up, you agree to our{" "}
                    <Link href="/terms" className="underline hover:text-primary">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline hover:text-primary">
                      Privacy Policy
                    </Link>
                  </p>
                </CardContent>

                <CardFooter className="flex justify-center px-4 sm:px-6 pb-8">
                  <p className="text-sm text-muted-foreground">
                    {t("auth.haveAccount")}{" "}
                    <Link
                      href="/login"
                      className="font-medium text-primary hover:underline"
                    >
                      {t("auth.loginNow")}
                    </Link>
                  </p>
                </CardFooter>
              </>
            )}
          </Card>
        </div>

        {/* Mobile About Modal */}
        {showAbout && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAbout(false)}
            />
            
            {/* Modal */}
            <div className="relative w-full sm:max-w-md bg-zinc-900 text-white rounded-t-2xl sm:rounded-2xl p-6 pb-8 sm:m-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
              {/* Close button */}
              <button
                onClick={() => setShowAbout(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/pamphlets.svg"
                  alt="Pamphlets Logo"
                  className="size-10"
                />
                <span className="text-2xl font-bold">{t("common.appName")}</span>
              </div>
              <p className="text-white/80 text-sm mb-6">{t("common.tagline")}</p>

              {/* Content */}
              <h2 className="text-xl font-bold mb-3">
                {t("about.tagline")}
              </h2>
              <p className="text-white/80 text-sm mb-6">
                {t("about.description")}
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-lg">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{t("about.features.freeExpression")}</h3>
                    <p className="text-white/60 text-xs">{t("about.features.freeExpressionDesc")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-lg">
                    <Heart className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{t("about.features.personalWritings")}</h3>
                    <p className="text-white/60 text-xs">{t("about.features.personalWritingsDesc")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-lg">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{t("about.features.community")}</h3>
                    <p className="text-white/60 text-xs">{t("about.features.communityDesc")}</p>
                  </div>
                </div>
              </div>

              {/* Quote */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-white/50 text-xs italic">
                  &quot;{t("about.quote")}&quot;
                </p>
                <p className="text-white/30 text-xs mt-1">— {t("about.quoteAuthor")}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
