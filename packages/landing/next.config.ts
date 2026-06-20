import type { NextConfig } from "next";

// standalone: emit a minimal self-contained server bundle for the Docker image.
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
