import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { NextSeo } from "next-seo";

export default function About() {
  const { t } = useTranslation("common");

  return (
    <>
      <NextSeo
        title={t("about.title")}
        description={t("about.description")}
      />
      
      <main className="px-4 py-8 max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            {t("about.title")}
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-2">
            {t("about.tagline")}
          </p>
          <p className="text-zinc-500 dark:text-zinc-500 max-w-2xl mx-auto">
            {t("about.description")}
          </p>
        </div>

        {/* Features Section */}
        <div className="grid gap-8 md:grid-cols-3 mb-12">
          {/* Free Expression */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {t("about.features.freeExpression")}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              {t("about.features.freeExpressionDesc")}
            </p>
          </div>

          {/* Personal Writings */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {t("about.features.personalWritings")}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              {t("about.features.personalWritingsDesc")}
            </p>
          </div>

          {/* Community */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {t("about.features.community")}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              {t("about.features.communityDesc")}
            </p>
          </div>
        </div>

        {/* Quote Section */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-8 text-center mb-12">
          <blockquote className="text-xl italic text-zinc-700 dark:text-zinc-300 mb-4">
            &ldquo;{t("about.quote")}&rdquo;
          </blockquote>
          <cite className="text-zinc-500 dark:text-zinc-400 not-italic">
            — {t("about.quoteAuthor")}
          </cite>
        </div>
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
