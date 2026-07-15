import path from "node:path";

const packagePath = path.join(
  path.dirname(Bun.fileURLToPath(import.meta.url)),
  "../package.json",
);
const packageJson = await Bun.file(packagePath).json();

export const version: string = packageJson.version;
