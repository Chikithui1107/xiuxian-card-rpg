import type { NextConfig } from "next";

const repoName = "xiuxian-card-rpg";

const nextConfig: NextConfig = {
  output: "export",
  basePath: `/${repoName}`,
  assetPrefix: `/${repoName}/`,
  trailingSlash: true,
};

export default nextConfig;
