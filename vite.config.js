import { defineConfig } from "vite";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";
const base = process.env.BASE_PATH
  ? `/${process.env.BASE_PATH}/`
  : repoName
    ? `/${repoName}/`
    : "/";

export default defineConfig({
  base,
});
