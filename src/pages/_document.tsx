import { Html, Head, Main, NextScript } from "next/document";

// Script to set theme before React hydrates to prevent flash
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme = 'light';
    if (stored === 'dark') {
      theme = 'dark';
    } else if (stored === 'light') {
      theme = 'light';
    } else {
      // system or no preference - check system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
      }
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en" className="scrollbar-gutter-stable" suppressHydrationWarning>
      <Head>
        <meta name="google-site-verification" content="X5NeDfA5p10G_SOucGsO4nGnKNJYaabWuxCfBedSaVY" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
