import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  ...(process.env.TYCOON_STATIC_EXPORT === "1"
    ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
    : {}),
};
export default config;
