import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dragon Mode — Protect your hoard",
  description: "A visual-first fantasy finance app that helps you understand, protect, and grow your hoard.",
  applicationName: "Dragon Mode",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Dragon Mode" },
  openGraph: {
    title: "Dragon Mode",
    description: "Protect your hoard. Keep the path.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Dragon Mode keepers overlooking a branching fantasy atlas" }],
  },
  twitter: { card: "summary_large_image", title: "Dragon Mode", description: "Protect your hoard. Keep the path.", images: ["/og.png"] },
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
