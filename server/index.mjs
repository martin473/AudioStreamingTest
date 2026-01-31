/**
 * Phase 1.3–1.5: Custom HTTP server with WebSocket at /ws and Astro middleware.
 * Serves static from dist/client, passes other requests to Astro handler.
 * On WS connect: send first 30s chunk (binary). On message: parse JSON {t} or {next}, send chunk (binary).
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { getChunk, getChunkByIndex, getChunkStartingAt } from "./chunkIndex.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHUNKS_DIR = path.join(ROOT, "music", "chunks");
const INDEX_PATH = path.join(CHUNKS_DIR, "chunk_index.json");
const DIST_CLIENT = path.join(ROOT, "dist", "client");

let chunkIndex = [];
try {
  const raw = fs.readFileSync(INDEX_PATH, "utf8");
  chunkIndex = JSON.parse(raw);
} catch {
  console.warn("No chunk index at", INDEX_PATH, "- run npm run preprocess first. WS will 404.");
}

function readChunkFile(entry) {
  const filePath = path.join(CHUNKS_DIR, entry.path);
  return fs.readFileSync(filePath);
}

async function createServer() {
  const handler = (await import("../dist/server/entry.mjs")).handler;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = url.pathname;

    // Static assets from dist/client (/_astro/*, etc.); pages go to Astro handler
    if (pathname !== "/ws" && (pathname.startsWith("/_astro/") || pathname.includes("."))) {
      const subPath = pathname.replace(/^\//, "");
      const filePath = path.resolve(DIST_CLIENT, subPath);
      if (filePath.startsWith(DIST_CLIENT) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".ico": "image/x-icon" };
        res.setHeader("Content-Type", types[ext] ?? "application/octet-stream");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "public, max-age=31536000");
        res.end(fs.readFileSync(filePath));
        return;
      }
      // Missing static asset (e.g. old build hash): 404, never HTML (avoids MIME/sniff errors)
      res.writeHead(404, { "Content-Type": "text/plain", "X-Content-Type-Options": "nosniff" });
      res.end("Not Found");
      return;
    }

    // Document (/) with no-store so browser always gets fresh HTML after rebuilds
    const isDocument = pathname === "/" || pathname === "" || pathname === "/index.html";
    if (isDocument) {
      const origSetHeader = res.setHeader.bind(res);
      res.setHeader = (name, value) => {
        if (String(name).toLowerCase() === "cache-control") return origSetHeader("Cache-Control", "no-store");
        return origSetHeader(name, value);
      };
      const origWriteHead = res.writeHead.bind(res);
      res.writeHead = function (statusCode, ...args) {
        origSetHeader("Cache-Control", "no-store");
        return origWriteHead(statusCode, ...args);
      };
      origSetHeader("Cache-Control", "no-store");
    }

    handler(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    let lastSentChunkIndex = -1;

    // Phase 2: send total duration (for progress/timestamps), then first chunk
    const lastChunk = chunkIndex[chunkIndex.length - 1];
    if (lastChunk) {
      try {
        ws.send(JSON.stringify({ duration: lastChunk.end_s }), { binary: false });
      } catch (err) {
        console.error("Failed to send duration:", err.message);
      }
    }
    const first = chunkIndex[0];
    if (first) {
      try {
        ws.send(JSON.stringify({ start_s: first.start_s, end_s: first.end_s }), { binary: false });
        const buf = readChunkFile(first);
        ws.send(buf, { binary: true });
        lastSentChunkIndex = 0;
      } catch (err) {
        console.error("Failed to send chunk_0:", err.message);
      }
    }

    ws.on("message", (data) => {
      // Phase 1.5: parse JSON {t: number} or {next: true}, send chunk (binary)
      let payload;
      try {
        payload = JSON.parse(data.toString());
      } catch {
        return;
      }
      let entry = null;
      if (typeof payload.t === "number") {
        entry = getChunk(chunkIndex, payload.t);
      } else if (payload.next === true) {
        if (typeof payload.bufferEnd === "number") {
          entry = getChunkStartingAt(chunkIndex, payload.bufferEnd);
        }
        if (!entry) {
          entry = getChunkByIndex(chunkIndex, lastSentChunkIndex + 1);
        }
      }
      if (entry) {
        try {
          ws.send(JSON.stringify({ start_s: entry.start_s, end_s: entry.end_s }), { binary: false });
          const buf = readChunkFile(entry);
          ws.send(buf, { binary: true });
          lastSentChunkIndex = entry.id;
        } catch (err) {
          console.error("Failed to send chunk:", err.message);
          try {
            ws.send(JSON.stringify({ error: "chunk_unavailable", start_s: entry.start_s, end_s: entry.end_s }), { binary: false });
          } catch (sendErr) {
            console.error("Failed to send chunk_unavailable:", sendErr.message);
          }
        }
      }
    });
  });

  const port = Number(process.env.PORT) || 4321;
  server.listen(port, () => {
    console.log("Server listening on http://localhost:" + port);
    console.log("WebSocket: ws://localhost:" + port + "/ws");
  });
}

createServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
