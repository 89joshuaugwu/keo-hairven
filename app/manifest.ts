import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KEO Hairven",
    short_name: "KEO Hairven",
    description: "Hair, wigs, attachments and hair collection with direct WhatsApp enquiries.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F3",
    theme_color: "#442913",
    icons: [
      {
        src: "/assets/brand/keo-hairven-icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
