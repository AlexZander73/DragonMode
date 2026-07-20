import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DragonMode — Protect your hoard",
  description: "A visual-first fantasy finance app that helps you understand, protect, and grow your hoard.",
  applicationName: "DragonMode",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "DragonMode" },
  openGraph: {
    title: "DragonMode",
    description: "Turn financial progress into an adventure.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "An emerald dragon peacefully protecting a glowing hoard in a sky vault" }],
  },
  twitter: { card: "summary_large_image", title: "DragonMode", description: "Turn financial progress into an adventure.", images: ["/og.png"] },
  icons: {
    icon: "/art/app-icon-v2.png",
    shortcut: "/art/app-icon-v2.png",
    apple: "/art/app-icon-v2.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#08182f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
