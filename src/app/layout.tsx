import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AWS Student Builder Group at Chandigarh University – Uttar Pradesh",
  description: "A student-led technology community at Chandigarh University – Uttar Pradesh exploring AWS Cloud, Artificial Intelligence, Data, DevOps and emerging technologies through learning and hands-on activities.",
  metadataBase: new URL('https://awssbg-cuup.vercel.app'),
  icons: {
    icon: [
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  openGraph: {
    title: "AWS Student Builder Group at Chandigarh University – Uttar Pradesh",
    description: "A student-led technology community exploring AWS Cloud, AI, Data, DevOps and emerging technologies.",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "AWS Student Builder Group at Chandigarh University – Uttar Pradesh",
    description: "A student-led technology community exploring AWS Cloud, AI, Data, DevOps and emerging technologies.",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
        <Navbar />
        <main className="flex-grow flex flex-col relative bg-slate-50">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
