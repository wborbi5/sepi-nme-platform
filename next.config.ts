import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co")
      .hostname;
  } catch {
    return "placeholder.supabase.co";
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/**" }],
  },
  experimental: {
    // Server Actions receive resized WebP blobs at most; file bytes go
    // browser -> Storage directly and never through a function.
    serverActions: { bodySizeLimit: "1mb" },
  },
};

export default nextConfig;
