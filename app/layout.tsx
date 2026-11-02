import { CategoryProvider } from "@/components/CategoryProvider";
import { getCategoryRegistry } from "@/lib/categories-server";
import type { Metadata, Viewport } from "next";
import { PublicBusinessProvider } from "@/components/PublicBusinessProvider";
import { getPublicBusinessServer } from "@/lib/public-business-server";
import { getSiteUrl } from "@/lib/site-url";
import { MotionProvider } from "@/components/MotionProvider";
import "./globals.css";
import "./editorial.css";
import "./muse.css";
import "./studio.css";
import { KeoMuse } from "@/components/KeoMuse";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KEO Hairven — Premium Wigs, Hair Extensions & Bundles",
    template: "%s — KEO Hairven",
  },
  description:
    "Discover KEO Hairven wigs, hair extensions and bundles. Explore the collection and enquire directly on WhatsApp.",
  applicationName: "KEO Hairven",
  alternates: { canonical: "/" },
  icons: {
    icon: "/assets/brand/keo-hairven-icon.png",
    apple: "/assets/brand/keo-hairven-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "KEO Hairven",
    url: siteUrl,
    title: "KEO Hairven — Premium Wigs, Hair Extensions & Bundles",
    description: "Browse premium hair, wigs, extensions and bundles from KEO Hairven. Enquire on WhatsApp.",
    images: [{ url: "/assets/campaign/waves-campaign.webp", alt: "KEO Hairven hair inspiration" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KEO Hairven",
    description: "Hair, wigs, bundles and extensions with direct WhatsApp enquiries.",
    images: ["/assets/campaign/waves-campaign.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2B1D1B",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const business = await getPublicBusinessServer();
  const [products,gallery]=await Promise.all([getCategoryRegistry("products"),getCategoryRegistry("gallery")]);
  const sameAs = [business.instagramUrl, business.tiktokUrl].filter((value): value is string => Boolean(value));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: business.name,
    url: siteUrl,
    description: business.tagline,
    ...(business.whatsappE164 ? { telephone: business.whatsappE164 } : {}),
    areaServed: business.publicLocation,
    ...(business.address ? { address: business.address } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };

  return (
    <html lang="en">
      <body>
        <CategoryProvider entries={{products:products.entries,gallery:gallery.entries}}><PublicBusinessProvider business={business}><MotionProvider>{children}<KeoMuse /></MotionProvider></PublicBusinessProvider></CategoryProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
