import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sunday Football",
  description: "Sign up, get your team, play.",
  // Ready to be installed to the home screen later (spec §89).
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Sunday Football" },
};

export const viewport: Viewport = {
  themeColor: "#090d0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
