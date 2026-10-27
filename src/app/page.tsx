import Studio from "@/components/Studio";
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Orbit Studio",
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web browser",
            description:
              "A free bouncing ball simulator and satisfying video creator with musical sound, configurable rules, and saved story episodes.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            ...(process.env.NEXT_PUBLIC_SITE_URL
              ? { url: process.env.NEXT_PUBLIC_SITE_URL }
              : {}),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <Studio />
    </>
  );
}
