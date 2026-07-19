import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dragon Mode — Protect your hoard",
  description: "A visual-first fantasy finance app that helps you understand, protect, and grow your hoard.",
  applicationName: "Dragon Mode",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Dragon Mode" },
  openGraph: {
    title: "Dragon Mode",
    description: "Protect your hoard. Rest easier.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Dragon Mode fantasy finance app" }],
  },
  twitter: { card: "summary_large_image", title: "Dragon Mode", description: "Protect your hoard. Rest easier.", images: ["/og.png"] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
