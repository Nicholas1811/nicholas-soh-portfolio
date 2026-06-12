import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SmoothScroll from "@/components/providers/SmoothScroll";
import NoiseOverlay from "@/components/ui/NoiseOverlay";
import CustomCursor from "@/components/ui/CustomCursor";

const fraunces = localFont({
  src: [
    {
      path: "./fonts/Fraunces-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/Fraunces-Italic-Variable.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-fraunces",
});

const switzer = localFont({
  src: [
    {
      path: "./fonts/Switzer-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/Switzer-Italic-Variable.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-switzer",
});

const fragment = localFont({
  src: [
    { path: "./fonts/FragmentMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/FragmentMono-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-fragment",
});

export const metadata: Metadata = {
  title: "Nicholas Soh — Software Engineer",
  description:
    "Nicholas Soh is a software engineering student at SMU who builds backends, breaks frontends, and ships things. Currently interning at Tan Tock Seng Hospital.",
  openGraph: {
    title: "Nicholas Soh — Software Engineer",
    description:
      "Software engineering student at SMU. Builds backends, breaks frontends, ships things.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${switzer.variable} ${fragment.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScroll>{children}</SmoothScroll>
        <NoiseOverlay />
        <CustomCursor />
      </body>
    </html>
  );
}
