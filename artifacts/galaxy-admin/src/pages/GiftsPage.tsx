import { useState, useEffect, useRef } from "react";
import { Gift, Plus, Trash2, RefreshCw, Edit2, Check, X, ImagePlus, Palette, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ref as dbRef, set, remove, onValue, off } from "firebase/database";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

type AnimationType = "float" | "fullscreen" | "particle";

// ─── Gift Types ──────────────────────────────────────────────
interface GiftItem {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  enabled: boolean;
  url?: string;
  animationType?: AnimationType;
  soundUrl?: string;
}

// ─── Theme Types ──────────────────────────────────────────────
interface ThemeItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  preview: string;        // gradient or color string
  imageUrl?: string;
  enabled: boolean;
}

type AdminMode = "gifts" | "themes";

const ANIM_META: Record<AnimationType, { label: string; color: string; desc: string }> = {
  float:      { label: "Float",      color: "bg-blue-500/20 text-blue-400",    desc: "Small animation top of room" },
  fullscreen: { label: "Fullscreen", color: "bg-yellow-500/20 text-yellow-400", desc: "Full-screen reveal (Yalla style)" },
  particle:   { label: "Particle",   color: "bg-purple-500/20 text-purple-400", desc: "Burst + sparkles effect" },
};

const RARITY_LABEL: Record<string, string> = {
  common: "COMMON", rare: "RARE", epic: "EPIC", legendary: "LEGENDARY",
};
const RARITY_COLORS: Record<string, string> = {
  common: "#8B8B8B", rare: "#4FC3F7", epic: "#AB47BC", legendary: "#FFD700",
};

const DEFAULT_GIFTS: GiftItem[] = [
  { id: "rose",    emoji: "🌹", name: "Rose",    cost: 10,   enabled: true, animationType: "float"      },
  { id: "heart",   emoji: "❤️",  name: "Heart",   cost: 20,   enabled: true, animationType: "float"      },
  { id: "star",    emoji: "⭐",  name: "Star",    cost: 50,   enabled: true, animationType: "particle"   },
  { id: "crown",   emoji: "👑",  name: "Crown",   cost: 100,  enabled: true, animationType: "fullscreen" },
  { id: "diamond", emoji: "💎",  name: "Diamond", cost: 200,  enabled: true, animationType: "fullscreen" },
  { id: "rocket",  emoji: "🚀",  name: "Rocket",  cost: 500,  enabled: true, animationType: "fullscreen" },
  { id: "dragon",  emoji: "🐉",  name: "Dragon",  cost: 1000, enabled: true, animationType: "fullscreen" },
  { id: "trophy",  emoji: "🏆",  name: "Trophy",  cost: 2000, enabled: true, animationType: "fullscreen" },
  { id: "galaxy",  emoji: "🌌",  name: "Galaxy",  cost: 5000, enabled: true, animationType: "fullscreen" },
];

const DEFAULT_THEMES: ThemeItem[] = [
  {
    id: "theme_galaxy_cosmic",
    name: "Cosmic Galaxy",
    icon: "🌌",
    price: 190,
    rarity: "rare",
    preview: "linear-gradient(135deg, #1a0f2e, #0a0614)",
    imageUrl: "https://res.cloudinary.com/dz1bhfpkc/image/upload/v1782285782/Screenshot_20260623_125325_ChatGPT_nusel5.jpg",
    enabled: true,
  },
  {
    id: "theme_celestial_wave",
    name: "Celestial Wave",
    icon: "🌊",
    price: 1440,
    rarity: "epic",
    preview: "linear-gradient(135deg, #0d47a1, #6c5ce7)",
    imageUrl: "https://res.cloudinary.com/dz1bhfpkc/image/upload/v1782285782/Screenshot_20260623_125351_ChatGPT_lg7hbl.jpg",
    enabled: true,
  },
];

const EMPTY_NEW_GIFT: Partial<GiftItem> = { emoji: "🎁", name: "", cost: 50, enabled: true, animationType: "float", url: "", soundUrl: "" };
const EMPTY_NEW_THEME: Partial<ThemeItem> = { icon: "🌌", name: "", price: 100, rarity: "rare", preview: "linear-gradient(135deg, #1a0f2e, #0a0614)", imageUrl: "", enabled: true };

function AppPreviewCard({ item, mode }: { item: GiftItem | ThemeItem; mode: AdminMode }) {
  if (mode === "gifts") {
    const g = item as GiftItem;
    const meta = ANIM_META[g.animationType || "float"];
    return (
      <div style={{
        background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.4)",
        borderRadius: 16, padding: "10px 8px", display: "flex", flexDirection: "column",
        alignItems: "center", width: 80, position: "relative", flexShrink: 0,
      }}>
        {g.animationType === "fullscreen" && (
          <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: 3, background: "#FFD700" }} />
        )}
        <div style={{ width: 54, height: 54, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 12, background: "rgba(255,255,255,0.04)" }}>
          {g.url ? (
            <img src={g.url} alt={g.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <span style={{ fontSize: 32 }}>{g.emoji}</span>
          )}
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: 500, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{g.name}</span>
        <span style={{ fontSize: 10, color: "#ffb703", fontWeight: 700 }}>💎 {g.cost}</span>
        <span style={{ fontSize: 8, color: meta.color.split(" ")[1], marginTop: 2 }}>{meta.label}</span>
      </div>
    );
  } else {
    const t = item as ThemeItem;
    const rarityColor = RARITY_COLORS[t.rarity] || "#fff";
    return (
      <div style={{
        background: "rgba(108,92,231,0.08)", border: `1px solid ${rarityColor}40`,
        borderRadius: 16, padding: "10px 8px", display: "flex", flexDirection: "column",
        alignItems: "center", width: 80, position: "relative", flexShrink: 0,
      }}>
        <div style={{ width: 54, height: 54, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 12, background: "rgba(255,255,255,0.04)" }}>
          {t.imageUrl ? (
            <img src={t.imageUrl} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <span style={{ fontSize: 32 }}>{t.icon}</span>
          )}
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: 500, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{t.name}</span>
        <span style={{ fontSize: 10, color: "#ffb703", fontWeight: 700 }}>💎 {t.price}</span>
        <span style={{ fontSize: 8, color: rarityColor, fontWeight: 700, marginTop: 2 }}>{RARITY_LABEL[t.rarity]}</span>
      </div>
    );
  }
}

function UploadImageButton({ onUploaded, itemId }: { onUploaded: (url: string) => void; itemId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Only image files allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Max 5MB"); return; }
    setError("");
    setProgress(0);
    const path = `store/${itemId}_${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);
    task.on(
      "state_changed",
      snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => { setError(err.message); setProgress(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onUploaded(url);
        setProgress(null);
      }
    );
  };

  return (
    <div className="space-y-1.5">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full h-10 border-dashed border-primary/40 text-primary hover:bg-primary/10 text-xs gap-2"
        onClick={() => fileRef.current?.click()}
        disabled={progress !== null}
      >
        <ImagePlus className="w-4 h-4" />
        {progress !== null ? `Uploading… ${progress}%` : "📱 Upload from Gallery"}
      </Button>
      {progress !== null && (
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

// ─── GIFT ROW ──────────────────────────────────────────────
function GiftRow({ gift, onSave, onDelete }: { gift: GiftItem; onSave: (g: GiftItem) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(gift);
  const meta = ANIM_META[form.animationType || "float"];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {form.url ? <img src={form.url} alt={form.name} className="w-full h-full object-contain" onError={e => { e.currentTarget.style.display = "none"; }} /> : null}
          <span className="text-2xl" style={{ display: form.url ? "none" : "inline" }}>{form.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-white">{form.name}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">💎 {form.cost}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${meta.color}`}>{meta.label}</span>
            {!form.enabled && <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">OFF</span>}
          </div>
          {form.url && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{form.url.slice(0, 50)}…</p>}
          {form.soundUrl && <p className="text-[10px] text-green-500/70 mt-0.5">🔊 Sound attached</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white" onClick={() => { const upd = { ...form, enabled: !form.enabled }; onSave(upd); setForm(upd); }}>
            {form.enabled ? "👁️" : "🚫"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white" onClick={() => setEditing(v => !v)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(gift.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Emoji (fallback)</Label>
              <Input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} className="bg-background border-border text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-background border-border text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Cost (coins)</Label>
              <Input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} className="bg-background border-border text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Animation</Label>
              <select value={form.animationType || "float"} onChange={e => setForm(f => ({ ...f, animationType: e.target.value as AnimationType }))} className="w-full h-8 rounded-md border border-border bg-background text-xs text-white px-2">
                {(Object.entries(ANIM_META) as [AnimationType, typeof ANIM_META[AnimationType]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <UploadImageButton itemId={gift.id} onUploaded={url => setForm(f => ({ ...f, url }))} />
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Or paste Image URL</Label>
            <Input value={form.url || ""} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="bg-background border-border text-xs h-8" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">🔊 Sound URL (.mp3 — optional)</Label>
            <Input value={form.soundUrl || ""} onChange={e => setForm(f => ({ ...f, soundUrl: e.target.value }))} className="bg-background border-border text-xs h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground block">📱 App Preview</Label>
            <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(18,10,36,0.95)", border: "1px solid rgba(236,72,153,0.2)" }}>
              <AppPreviewCard item={form} mode="gifts" />
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><span className="text-white font-semibold">Animation:</span> <span className={meta.color.split(" ")[1]}>{meta.label}</span></p>
                <p><span className="text-white font-semibold">Cost:</span> 💎 {form.cost}</p>
                {form.soundUrl && <p className="text-green-400">🔊 Sound</p>}
                {!form.url && <p className="text-yellow-500/70">⚠ No image</p>}
                {form.url && <p className="text-green-400/80">✓ Image set</p>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => { onSave(form); setEditing(false); }}>
              <Check className="w-3 h-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { setForm(gift); setEditing(false); }}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── THEME ROW ──────────────────────────────────────────────
function ThemeRow({ theme, onSave, onDelete }: { theme: ThemeItem; onSave: (t: ThemeItem) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(theme);
  const rarityColor = RARITY_COLORS[form.rarity] || "#fff";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {form.imageUrl ? <img src={form.imageUrl} alt={form.name} className="w-full h-full object-contain" onError={e => { e.currentTarget.style.display = "none"; }} /> : null}
          <span className="text-2xl" style={{ display: form.imageUrl ? "none" : "inline" }}>{form.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-white">{form.name}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">💎 {form.price}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded`} style={{ background: `${rarityColor}20`, color: rarityColor }}>{RARITY_LABEL[form.rarity]}</span>
            {!form.enabled && <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">OFF</span>}
          </div>
          {form.imageUrl && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{form.imageUrl.slice(0, 50)}…</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white" onClick={() => { const upd = { ...form, enabled: !form.enabled }; onSave(upd); setForm(upd); }}>
            {form.enabled ? "👁️" : "🚫"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white" onClick={() => setEditing(v => !v)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(theme.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Icon (emoji)</Label>
              <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="bg-background border-border text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-background border-border text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Price (coins)</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} className="bg-background border-border text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Rarity</Label>
              <select value={form.rarity} onChange={e => setForm(f => ({ ...f, rarity: e.target.value as ThemeItem["rarity"] }))} className="w-full h-8 rounded-md border border-border bg-background text-xs text-white px-2">
                {["common", "rare", "epic", "legendary"].map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Preview Gradient (CSS)</Label>
            <Input value={form.preview} onChange={e => setForm(f => ({ ...f, preview: e.target.value }))} className="bg-background border-border text-xs h-8" placeholder="linear-gradient(...)" />
          </div>
          <UploadImageButton itemId={theme.id} onUploaded={url => setForm(f => ({ ...f, imageUrl: url }))} />
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Or paste Image URL</Label>
            <Input value={form.imageUrl || ""} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="bg-background border-border text-xs h-8" placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground block">📱 App Preview</Label>
            <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(18,10,36,0.95)", border: `1px solid ${rarityColor}40` }}>
              <AppPreviewCard item={form} mode="themes" />
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><span className="text-white font-semibold">Rarity:</span> <span style={{ color: rarityColor }}>{RARITY_LABEL[form.rarity]}</span></p>
                <p><span className="text-white font-semibold">Price:</span> 💎 {form.price}</p>
                {!form.imageUrl && <p className="text-yellow-500/70">⚠ No image</p>}
                {form.imageUrl && <p className="text-green-400/80">✓ Image set</p>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => { onSave(form); setEditing(false); }}>
              <Check className="w-3 h-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { setForm(theme); setEditing(false); }}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────
export default function GiftsPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<AdminMode>("gifts");
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newGift, setNewGift] = useState<Partial<GiftItem>>(EMPTY_NEW_GIFT);
  const [newTheme, setNewTheme] = useState<Partial<ThemeItem>>(EMPTY_NEW_THEME);
  const newItemId = useRef(`item_${Date.now()}`);

  // Load gifts
  useEffect(() => {
    const r = dbRef(db, "appConfig/gifts");
    const unsub = onValue(r, snap => {
      if (snap.exists()) {
        const val = snap.val() as Record<string, GiftItem>;
        setGifts(Object.values(val).sort((a, b) => a.cost - b.cost));
      } else {
        const batch: Record<string, GiftItem> = {};
        DEFAULT_GIFTS.forEach(g => { batch[g.id] = g; });
        set(r, batch);
        setGifts(DEFAULT_GIFTS);
      }
      setLoading(false);
    });
    return () => off(r, "value", unsub);
  }, []);

  // Load themes
  useEffect(() => {
    const r = dbRef(db, "appConfig/themes");
    const unsub = onValue(r, snap => {
      if (snap.exists()) {
        const val = snap.val() as Record<string, ThemeItem>;
        setThemes(Object.values(val).sort((a, b) => a.price - b.price));
      } else {
        const batch: Record<string, ThemeItem> = {};
        DEFAULT_THEMES.forEach(t => { batch[t.id] = t; });
        set(r, batch);
        setThemes(DEFAULT_THEMES);
      }
    });
    return () => off(r, "value", unsub);
  }, []);

  async function handleSaveGift(gift: GiftItem) {
    await set(dbRef(db, `appConfig/gifts/${gift.id}`), gift);
    toast({ title: "Gift updated ✓" });
  }
  async function handleDeleteGift(id: string) {
    await remove(dbRef(db, `appConfig/gifts/${id}`));
    toast({ title: "Gift deleted" });
  }
  async function handleAddGift() {
    if (!newGift.name) { toast({ title: "Gift name required", variant: "destructive" }); return; }
    const id = newItemId.current;
    const gift: GiftItem = {
      id,
      emoji: newGift.emoji || "🎁",
      name: newGift.name!,
      cost: newGift.cost || 50,
      enabled: true,
      animationType: newGift.animationType || "float",
      url: newGift.url || "",
      soundUrl: newGift.soundUrl || "",
    };
    await set(dbRef(db, `appConfig/gifts/${id}`), gift);
    newItemId.current = `item_${Date.now()}`;
    setNewGift(EMPTY_NEW_GIFT);
    setAdding(false);
    toast({ title: "Gift added ✓" });
  }

  async function handleSaveTheme(theme: ThemeItem) {
    await set(dbRef(db, `appConfig/themes/${theme.id}`), theme);
    toast({ title: "Theme updated ✓" });
  }
  async function handleDeleteTheme(id: string) {
    await remove(dbRef(db, `appConfig/themes/${id}`));
    toast({ title: "Theme deleted" });
  }
  async function handleAddTheme() {
    if (!newTheme.name) { toast({ title: "Theme name required", variant: "destructive" }); return; }
    const id = newItemId.current;
    const theme: ThemeItem = {
      id,
      name: newTheme.name!,
      icon: newTheme.icon || "🌌",
      price: newTheme.price || 100,
      rarity: newTheme.rarity || "rare",
      preview: newTheme.preview || "linear-gradient(135deg, #1a0f2e, #0a0614)",
      imageUrl: newTheme.imageUrl || "",
      enabled: true,
    };
    await set(dbRef(db, `appConfig/themes/${id}`), theme);
    newItemId.current = `item_${Date.now()}`;
    setNewTheme(EMPTY_NEW_THEME);
    setAdding(false);
    toast({ title: "Theme added ✓" });
  }

  const currentItems = mode === "gifts" ? gifts : themes;
  const loadingState = loading;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {mode === "gifts" ? <Gift className="w-6 h-6 text-primary" /> : <Palette className="w-6 h-6 text-primary" />}
            {mode === "gifts" ? "Gifts Management" : "Themes Management"}
          </h1>
          <p className="text-muted-foreground text-sm">{currentItems.length} items · Changes reflect instantly</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={mode === "gifts" ? "default" : "outline"} onClick={() => setMode("gifts")} className="text-xs">
            <Gift className="w-3.5 h-3.5 mr-1" /> Gifts
          </Button>
          <Button size="sm" variant={mode === "themes" ? "default" : "outline"} onClick={() => setMode("themes")} className="text-xs">
            <Palette className="w-3.5 h-3.5 mr-1" /> Themes
          </Button>
          <Button size="sm" variant="outline" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Live ✓"}
          </Button>
          <Button size="sm" onClick={() => { setAdding(v => !v); newItemId.current = `item_${Date.now()}`; }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add {mode === "gifts" ? "Gift" : "Theme"}
          </Button>
        </div>
      </div>

      {/* Animation Legend (only for gifts) */}
      {mode === "gifts" && (
        <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-3 gap-4">
          {(Object.entries(ANIM_META) as [AnimationType, typeof ANIM_META[AnimationType]][]).map(([k, v]) => (
            <div key={k} className={`rounded-lg p-3 text-center ${v.color.split(" ")[0]}`}>
              <p className={`text-sm font-bold mb-0.5 ${v.color.split(" ")[1]}`}>{v.label}</p>
              <p className="text-[10px] text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white">➕ New {mode === "gifts" ? "Gift" : "Theme"}</p>
          {mode === "gifts" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Emoji (fallback)" value={newGift.emoji} onChange={e => setNewGift(f => ({ ...f, emoji: e.target.value }))} className="bg-background border-border text-xs" />
                <Input placeholder="Gift Name *" value={newGift.name} onChange={e => setNewGift(f => ({ ...f, name: e.target.value }))} className="bg-background border-border text-xs" />
                <Input type="number" placeholder="Cost (coins)" value={newGift.cost} onChange={e => setNewGift(f => ({ ...f, cost: Number(e.target.value) }))} className="bg-background border-border text-xs" />
                <select value={newGift.animationType || "float"} onChange={e => setNewGift(f => ({ ...f, animationType: e.target.value as AnimationType }))} className="rounded-md border border-border bg-background text-xs text-white px-2 h-10">
                  {(Object.entries(ANIM_META) as [AnimationType, typeof ANIM_META[AnimationType]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <UploadImageButton itemId={newItemId.current} onUploaded={url => setNewGift(f => ({ ...f, url }))} />
              <Input placeholder="Or paste Image URL" value={newGift.url || ""} onChange={e => setNewGift(f => ({ ...f, url: e.target.value }))} className="bg-background border-border text-xs" />
              <Input placeholder="🔊 Sound URL (.mp3 optional)" value={newGift.soundUrl || ""} onChange={e => setNewGift(f => ({ ...f, soundUrl: e.target.value }))} className="bg-background border-border text-xs" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">📱 App Preview</p>
                <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(18,10,36,0.95)", border: "1px solid rgba(236,72,153,0.2)" }}>
                  <AppPreviewCard item={newGift as GiftItem} mode="gifts" />
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p><span className="text-white font-semibold">Animation:</span> <span className={ANIM_META[(newGift.animationType as AnimationType) || "float"].color.split(" ")[1]}>{ANIM_META[(newGift.animationType as AnimationType) || "float"].label}</span></p>
                    {!newGift.url && <p className="text-yellow-500/70">⚠ No image — emoji shown</p>}
                    {newGift.url && <p className="text-green-400/80">✓ Image set</p>}
                    {newGift.soundUrl && <p className="text-green-400">🔊 Sound attached</p>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={handleAddGift} disabled={!newGift.name}>
                  <Check className="w-3 h-3 mr-1" /> Add Gift
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => { setAdding(false); setNewGift(EMPTY_NEW_GIFT); }}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Icon (emoji)" value={newTheme.icon} onChange={e => setNewTheme(f => ({ ...f, icon: e.target.value }))} className="bg-background border-border text-xs" />
                <Input placeholder="Theme Name *" value={newTheme.name} onChange={e => setNewTheme(f => ({ ...f, name: e.target.value }))} className="bg-background border-border text-xs" />
                <Input type="number" placeholder="Price (coins)" value={newTheme.price} onChange={e => setNewTheme(f => ({ ...f, price: Number(e.target.value) }))} className="bg-background border-border text-xs" />
                <select value={newTheme.rarity || "rare"} onChange={e => setNewTheme(f => ({ ...f, rarity: e.target.value as ThemeItem["rarity"] }))} className="rounded-md border border-border bg-background text-xs text-white px-2 h-10">
                  {["common", "rare", "epic", "legendary"].map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                </select>
              </div>
              <Input placeholder="Preview Gradient (CSS)" value={newTheme.preview || ""} onChange={e => setNewTheme(f => ({ ...f, preview: e.target.value }))} className="bg-background border-border text-xs" />
              <UploadImageButton itemId={newItemId.current} onUploaded={url => setNewTheme(f => ({ ...f, imageUrl: url }))} />
              <Input placeholder="Or paste Image URL" value={newTheme.imageUrl || ""} onChange={e => setNewTheme(f => ({ ...f, imageUrl: e.target.value }))} className="bg-background border-border text-xs" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">📱 App Preview</p>
                <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(18,10,36,0.95)", border: `1px solid ${RARITY_COLORS[(newTheme.rarity as ThemeItem["rarity"]) || "rare"]}40` }}>
                  <AppPreviewCard item={newTheme as ThemeItem} mode="themes" />
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p><span className="text-white font-semibold">Rarity:</span> <span style={{ color: RARITY_COLORS[(newTheme.rarity as ThemeItem["rarity"]) || "rare"] }}>{RARITY_LABEL[(newTheme.rarity as ThemeItem["rarity"]) || "rare"]}</span></p>
                    {!newTheme.imageUrl && <p className="text-yellow-500/70">⚠ No image — icon shown</p>}
                    {newTheme.imageUrl && <p className="text-green-400/80">✓ Image set</p>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={handleAddTheme} disabled={!newTheme.name}>
                  <Check className="w-3 h-3 mr-1" /> Add Theme
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => { setAdding(false); setNewTheme(EMPTY_NEW_THEME); }}>Cancel</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* List */}
      {loadingState ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : currentItems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {mode === "gifts" ? <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" /> : <Palette className="w-10 h-10 mx-auto mb-3 opacity-30" />}
          <p className="text-sm">No {mode} yet. Add your first {mode === "gifts" ? "gift" : "theme"} above.</p>
        </div>
      ) : mode === "gifts" ? (
        <div className="space-y-2">
          {gifts.map(g => <GiftRow key={g.id} gift={g} onSave={handleSaveGift} onDelete={handleDeleteGift} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {themes.map(t => <ThemeRow key={t.id} theme={t} onSave={handleSaveTheme} onDelete={handleDeleteTheme} />)}
        </div>
      )}
    </div>
  );
}