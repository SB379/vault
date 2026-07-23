import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN devices (iPad etc.) to load dev assets — dev server binds 0.0.0.0.
  allowedDevOrigins: ["192.168.1.75", "192.168.1.*"],
};

export default nextConfig;
