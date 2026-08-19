import type { Metadata } from "next";
import "./globals.css";
import BrandInitializer from "@/components/BrandInitializer";

export const metadata: Metadata = {
  title: "PutiMach | Timeless Style. Modern Soul.",
  description: "PutiMach Luxury Streetwear & Heritage E-Commerce Platform",
  icons: {
    icon: "/api/media/uploads/img_1786602897193_2103.webp",
    shortcut: "/api/media/uploads/img_1786602897193_2103.webp",
    apple: "/api/media/uploads/img_1786602897193_2103.webp",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link id="dynamic-favicon" rel="icon" type="image/webp" href="/api/media/uploads/img_1786602897193_2103.webp" />
        <link id="dynamic-shortcut-favicon" rel="shortcut icon" href="/api/media/uploads/img_1786602897193_2103.webp" />
        <link id="dynamic-apple-icon" rel="apple-touch-icon" href="/api/media/uploads/img_1786602897193_2103.webp" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Outfit:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <BrandInitializer />
        {children}
      </body>
    </html>
  );
}
