import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "middleware" }),
  // Dev on 4325 so port 4321 is always used by npm run preview (our server)
  server: { port: 4325 },
});
