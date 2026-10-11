import type { Metadata, Viewport } from "next";
import { Geist_Mono, Rubik } from "next/font/google";
import { GeistPixelSquare } from "geist/font/pixel";
import Script from "next/script";
import type { CSSProperties } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { loadInstallationConfig } from "@/config/installation";
import { publicInstallationBranding } from "@/config/installation-branding";
import { THEME_BOOTSTRAP_SCRIPT } from "@/ui/theme";
import { translate } from "@/i18n/messages";
import { installationUiLocale } from "@/i18n/server";
import { UiLocaleProvider } from "@/i18n/provider";
import "./globals.css";
import "../styles/neska.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Neska: Rubik for reading, Geist Pixel only for short uppercase labels.
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export async function generateMetadata(): Promise<Metadata> {
  const installation = await loadInstallationConfig();
  return {
    metadataBase: new URL(installation.publicUrl),
    applicationName: installation.branding.productName,
    title: {
      default: `${installation.branding.productName} · ${installation.companyName}`,
      template: `%s · ${installation.branding.productName}`,
    },
    description: translate(await installationUiLocale(), "Espacio de trabajo privado de {company}.", { company: installation.companyName }),
    icons: {
      icon: installation.branding.faviconPath,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await installationUiLocale();
  const installation = await loadInstallationConfig();
  const branding = publicInstallationBranding(installation);
  const installationStyle = { "--installation-accent": branding.accentColor } as CSSProperties;

  return (
    <html
      lang={locale}
      data-installation={branding.installationId}
      data-visual-theme={installation.branding.visualTheme}
      data-theme="light"
      className={`${rubik.variable} ${GeistPixelSquare.variable}`}
      suppressHydrationWarning
      style={installationStyle}
    >
      <body className={geistMono.variable}>
        <UiLocaleProvider locale={locale}><ThemeProvider>{children}</ThemeProvider></UiLocaleProvider>
        <Script id="aibrain-theme" strategy="beforeInteractive">
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
      </body>
    </html>
  );
}
