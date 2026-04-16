import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "24090", 10);

app.use(express.json());

const publicDir = path.join(__dirname, "dist", "public");
app.use(express.static(publicDir));

const SERVER_STARTED_AT = Date.now();

app.get("/ping", (_req, res) => {
  res.json({ status: "alive", timestamp: Date.now() });
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: Math.floor((Date.now() - SERVER_STARTED_AT) / 1000),
    timestamp: new Date().toISOString(),
    service: "galaxy-voice-chat",
  });
});

app.head("/healthz", (_req, res) => res.sendStatus(200));

const AGORA_APP_ID = process.env.AGORA_APP_ID || "5a9957fd6a8047f48310fd0e5545d42c";
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "";

function buildAgoraToken(appId, appCertificate, channelName, uid, role, expireTs) {
  if (!appCertificate) return null;

  const VERSION = "007";
  const privileges = {};
  privileges[1] = expireTs;
  privileges[2] = expireTs;
  if (role === 1) {
    privileges[3] = expireTs;
    privileges[4] = expireTs;
  }

  const privilegesStr = Object.entries(privileges)
    .map(([k, v]) => `${k}:${v}`)
    .join(",");

  const content = `${appId}${channelName}${uid}${privilegesStr}`;
  const sign = crypto
    .createHmac("sha256", appCertificate)
    .update(content)
    .digest("hex");

  return `${VERSION}${Buffer.from(JSON.stringify({
    appId,
    channelName,
    uid: String(uid),
    privileges,
    sign,
    ts: Math.floor(Date.now() / 1000),
  })).toString("base64")}`;
}

app.post("/api/agora-token", (req, res) => {
  const { channelName, uid, role } = req.body;

  if (!channelName || uid === undefined) {
    return res.status(400).json({ error: "channelName and uid required" });
  }

  if (!AGORA_APP_CERTIFICATE) {
    return res.json({ token: null, appId: AGORA_APP_ID, message: "No certificate configured, using app ID only" });
  }

  const expireTs = Math.floor(Date.now() / 1000) + 3600;
  const token = buildAgoraToken(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, role || 2, expireTs);

  res.json({ token, appId: AGORA_APP_ID });
});

const RECHARGE_PACKAGES = [
  { id: "pack_100", coins: 100, price: 0.99, currency: "USD", bonus: 0 },
  { id: "pack_500", coins: 500, price: 4.99, currency: "USD", bonus: 50 },
  { id: "pack_1000", coins: 1000, price: 9.99, currency: "USD", bonus: 150 },
  { id: "pack_5000", coins: 5000, price: 49.99, currency: "USD", bonus: 1000 },
  { id: "pack_10000", coins: 10000, price: 99.99, currency: "USD", bonus: 3000 },
  { id: "pack_50000", coins: 50000, price: 499.99, currency: "USD", bonus: 20000 },
];

app.get("/api/recharge-packages", (_req, res) => {
  res.json(RECHARGE_PACKAGES);
});

app.post("/api/recharge", (req, res) => {
  const { packageId, userId, paymentMethod } = req.body;
  const pkg = RECHARGE_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return res.status(400).json({ error: "Invalid package" });
  if (!userId) return res.status(400).json({ error: "userId required" });

  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  res.json({
    orderId,
    packageId: pkg.id,
    coins: pkg.coins + pkg.bonus,
    price: pkg.price,
    currency: pkg.currency,
    status: "pending",
    paymentUrl: null,
    message: "Payment gateway integration pending. Connect Stripe/Razorpay to enable real payments.",
  });
});

app.use((_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Keep-alive endpoint: /ping`);
  console.log(`Agora token endpoint: POST /api/agora-token`);
  console.log(`Recharge API: GET /api/recharge-packages, POST /api/recharge`);
});
