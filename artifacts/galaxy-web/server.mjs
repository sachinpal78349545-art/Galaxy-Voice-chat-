import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "24090", 10);

const publicDir = path.join(__dirname, "dist", "public");
app.use(express.static(publicDir));

app.get("/ping", (_req, res) => {
  res.json({ status: "alive", timestamp: Date.now() });
});

app.use((_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Keep-alive endpoint: /ping`);
});
