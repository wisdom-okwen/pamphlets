import { useState } from "react";
import Link from "next/link";
import { NextSeo } from "next-seo";
import { createClient } from "@/utils/supabase/clients/browser";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
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
import { Mail, Loader2, ArrowLeft, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  };

  if (success) {
    return (
      <>
        <NextSeo
          title={t("auth.checkEmail")}
          description={t("auth.checkEmail")}
          noindex
        />

        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {t("auth.checkEmail")}
              </CardTitle>
              <CardDescription>
                {t("auth.resetLinkSent", "We sent a password reset link to")} <strong>{email}</strong>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t("auth.clickResetLink", "Click the link in the email to reset your password.")}
              </p>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSuccess(false)}
              >
                {t("auth.tryDifferentEmail", "Try a different email")}
              </Button>
              <Link
                href="/login"
                className="text-sm text-primary hover:underline"
              >
                {t("auth.backToLogin", "Back to login")}
              </Link>
            </CardFooter>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <NextSeo
        title={t("auth.forgotPassword")}
        description={t("auth.forgotPasswordDesc", "Reset your Pamphlets password")}
        noindex
      />

      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {t("auth.forgotPassword")}?
            </CardTitle>
            <CardDescription>
              {t("auth.forgotPasswordDesc", "Enter your email and we'll send you a reset link")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
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

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("auth.sending", "Sending...")}
                  </>
                ) : (
                  t("auth.sendResetLink")
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <Link
              href="/login"
              className="flex items-center text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="mr-2 size-4" />
              {t("auth.backToLogin", "Back to login")}
            </Link>
          </CardFooter>
        </Card>
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
