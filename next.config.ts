import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    VITE_JUDGING_ENGINE_URL: process.env.VITE_JUDGING_ENGINE_URL || "",
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "",
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || "",
    VITE_ADMIN_PASSWORD: process.env.VITE_ADMIN_PASSWORD || "",
    VITE_HACKATHON_END_TIME: process.env.VITE_HACKATHON_END_TIME || "2025-12-01T18:00:00Z",
  }
};

export default nextConfig;
