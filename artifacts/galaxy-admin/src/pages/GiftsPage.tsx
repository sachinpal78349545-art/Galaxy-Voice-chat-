import { useState, useEffect } from "react";
import { Gift, Plus, Trash2, RefreshCw, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ref, set, remove, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";

type AnimationType = "float" | "fullscreen" | "particle";

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

const ANIM_META: Record<AnimationType, { label: string; color: string; desc: string }> = {
  float:      { label: "Float",      color: "bg-blue-500/20 text-blue-400",   desc: "Small animation top of room" },
  fullscreen: { label: "Fullscreen", color: "bg-yellow-500/20 text-yellow-400", desc: "Full-screen reveal (Yalla style)" },
  particle:   { label: "Particle",   color: "bg-purple-500/20 text-purple-400", desc: "Burst + sparkles effect" },
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

const EMPTY_NEW: Partial<GiftItem> = { emoji: "🎁", name: "", cost: 50, enabled: true, animationType: "float", url: "", soundUrl: "" };

function GiftRow({ gift, onSave, onDelete }: { gift: GiftItem; onSave: (g: GiftItem) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState(gift);
  const meta = ANIM_META[form.animationType || "float"];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {form.url ? (
            <img src={form.url} alt={form.name} className="w-full h-full object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span className="text-2xl">{form.emoji}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-white">{form.name}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">💎 {form.cost}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${meta.color}`}>{meta.label}</span>
            {!form.enabled && <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">OFF</span>}
          </div>
          {form.url && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{form.url.slice(0, 52)}…</p>}
          {form.soundUrl && <p className="text-[10px] text-green-500/70 mt-0.5">🔊 Sound attached</p>}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
            onClick={() => { const upd = { ...form, enabled: !form.enabled }; onSave(upd); setForm(upd); }}>
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
              <Label className="text-xs text-muted-foreground mb-1 block">Emoji (fallback if no image)</Label>
              <Input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                className="bg-background border-border text-xs h-8" placeholder="🎁" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-background border-border text-xs h-8" placeholder="Gift Name" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Cost (coins)</Label>
              <Input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))}
                className="bg-background border-border text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Animation Type</Label>
              <select value={form.animationType || "float"}
                onChange={e => setForm(f => ({ ...f, animationType: e.target.value as AnimationType }))}
                className="w-full h-8 rounded-md border border-border bg-background text-xs text-white px-2">
                {(Object.entries(ANIM_META) as [AnimationType, typeof ANIM_META[AnimationType]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} — {v.desc}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">🖼️ Image URL (Cloudinary / any CDN)</Label>
            <Input value={form.url || ""} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              className="bg-background border-border text-xs h-8"
              placeholder="https://res.cloudinary.com/…/gift.png" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">🔊 Sound URL (.mp3 / .ogg — optional)</Label>
            <Input value={form.soundUrl || ""} onChange={e => setForm(f => ({ ...f, soundUrl: e.target.value }))}
              className="bg-background border-border text-xs h-8"
              placeholder="https://cdn.example.com/gift-sound.mp3" />
          </div>

          {/* 📱 App Preview Card — Exactly like Voice Room BottomBar */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground block">📱 App Preview (how it looks in gift grid)</Label>
            <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(18,10,36,0.95)", border: "1px solid rgba(236,72,153,0.2)" }}>
              {/* Gift card exactly like BottomBar */}
              <div style={{
                background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.4)",
                borderRadius: 16, padding: "10px 8px", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", width: 72, position: "relative", flexShrink: 0,
              }}>
                {form.animationType === "fullscreen" && (
                  <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: 3, background: "#FFD700" }} />
                )}
                <div style={{ width: 54, height: 54, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 12, background: "rgba(255,255,255,0.04)", position: "relative" }}>
                  {form.url ? (
                    <img
                      src={form.url}
                      alt={form.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      onError={e => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = "none";
                        const fb = img.nextElementSibling as HTMLElement;
                        if (fb) fb.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <span style={{
                    fontSize: 32, display: form.url ? "none" : "flex",
                    alignItems: "center", justifyContent: "center", width: "100%", height: "100%",
                  }}>{form.emoji || "🎁"}</span>
                </div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: 500, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.name || "Gift"}</span>
                <span style={{ fontSize: 10, color: "#ffb703", fontWeight: 700 }}>💎 {form.cost}</span>
              </div>
              {/* Info */}
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><span className="text-white font-semibold">Animation:</span> <span className={ANIM_META[form.animationType || "float"].color.split(" ")[1]}>{ANIM_META[form.animationType || "float"].label}</span></p>
                <p><span className="text-white font-semibold">Cost:</span> 💎 {form.cost} coins</p>
                {form.soundUrl && <p className="text-green-400">🔊 Sound attached</p>}
                {!form.url && <p className="text-yellow-500/70">⚠ No image — showing emoji</p>}
                {form.url && <p className="text-green-400/80">✓ Image URL set</p>}
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

export default function GiftsPage() {
  const { toast } = useToast();
  const [gifts,   setGifts]   = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [newGift, setNewGift] = useState<Partial<GiftItem>>(EMPTY_NEW);

  useEffect(() => {
    const r = ref(db, "appConfig/gifts");
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

  async function handleSave(gift: GiftItem) {
    await set(ref(db, `appConfig/gifts/${gift.id}`), gift);
    toast({ title: "Gift updated ✓" });
  }

  async function handleDelete(id: string) {
    await remove(ref(db, `appConfig/gifts/${id}`));
    toast({ title: "Gift deleted" });
  }

  async function handleAdd() {
    if (!newGift.name || !newGift.emoji) { toast({ title: "Name & emoji required", variant: "destructive" }); return; }
    const id = `gift_${Date.now()}`;
    const gift: GiftItem = {
      id, emoji: newGift.emoji!, name: newGift.name!, cost: newGift.cost || 50,
      enabled: true, animationType: newGift.animationType || "float",
      url: newGift.url || "", soundUrl: newGift.soundUrl || "",
    };
    await set(ref(db, `appConfig/gifts/${id}`), gift);
    setNewGift(EMPTY_NEW);
    setAdding(false);
    toast({ title: "Gift added ✓" });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" /> Gifts Management
          </h1>
          <p className="text-muted-foreground text-sm">{gifts.length} gifts · Changes reflect instantly in voice rooms</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Live ✓"}
          </Button>
          <Button size="sm" onClick={() => setAdding(v => !v)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Gift
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-3 gap-4">
        {(Object.entries(ANIM_META) as [AnimationType, typeof ANIM_META[AnimationType]][]).map(([k, v]) => (
          <div key={k} className={`rounded-lg p-3 text-center ${v.color.split(" ")[0]}`}>
            <p className={`text-sm font-bold mb-0.5 ${v.color.split(" ")[1]}`}>{v.label}</p>
            <p className="text-[10px] text-muted-foreground">{v.desc}</p>
          </div>
        ))}
      </div>

      {adding && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white">➕ New Gift</p>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Emoji" value={newGift.emoji} onChange={e => setNewGift(f => ({ ...f, emoji: e.target.value }))} className="bg-background border-border text-xs" />
            <Input placeholder="Gift Name" value={newGift.name} onChange={e => setNewGift(f => ({ ...f, name: e.target.value }))} className="bg-background border-border text-xs" />
            <Input type="number" placeholder="Cost (coins)" value={newGift.cost} onChange={e => setNewGift(f => ({ ...f, cost: Number(e.target.value) }))} className="bg-background border-border text-xs" />
            <select value={newGift.animationType || "float"}
              onChange={e => setNewGift(f => ({ ...f, animationType: e.target.value as AnimationType }))}
              className="rounded-md border border-border bg-background text-xs text-white px-2 h-10">
              {(Object.entries(ANIM_META) as [AnimationType, typeof ANIM_META[AnimationType]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label} — {v.desc}</option>
              ))}
            </select>
          </div>
          <Input placeholder="🖼️ Image URL (Cloudinary / any CDN link)" value={newGift.url || ""} onChange={e => setNewGift(f => ({ ...f, url: e.target.value }))} className="bg-background border-border text-xs" />
          <Input placeholder="🔊 Sound URL (.mp3 optional)" value={newGift.soundUrl || ""} onChange={e => setNewGift(f => ({ ...f, soundUrl: e.target.value }))} className="bg-background border-border text-xs" />

          {/* 📱 Live App Preview */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">📱 App Preview</p>
            <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(18,10,36,0.95)", border: "1px solid rgba(236,72,153,0.2)" }}>
              <div style={{
                background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.4)",
                borderRadius: 16, padding: "10px 8px", display: "flex", flexDirection: "column",
                alignItems: "center", width: 72, position: "relative", flexShrink: 0,
              }}>
                {newGift.animationType === "fullscreen" && (
                  <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: 3, background: "#FFD700" }} />
                )}
                <div style={{ width: 54, height: 54, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 12, background: "rgba(255,255,255,0.04)", position: "relative" }}>
                  {newGift.url ? (
                    <img src={newGift.url} alt="preview"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      onError={e => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = "none";
                        const fb = img.nextElementSibling as HTMLElement;
                        if (fb) fb.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <span style={{ fontSize: 32, display: newGift.url ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{newGift.emoji || "🎁"}</span>
                </div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: 500, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{newGift.name || "Gift"}</span>
                <span style={{ fontSize: 10, color: "#ffb703", fontWeight: 700 }}>💎 {newGift.cost}</span>
              </div>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><span className="text-white font-semibold">Animation:</span> <span className={ANIM_META[(newGift.animationType as AnimationType) || "float"].color.split(" ")[1]}>{ANIM_META[(newGift.animationType as AnimationType) || "float"].label}</span></p>
                {!newGift.url && <p className="text-yellow-500/70">⚠ No image — emoji shown</p>}
                {newGift.url && <p className="text-green-400/80">✓ Image URL set</p>}
                {newGift.soundUrl && <p className="text-green-400">🔊 Sound attached</p>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={handleAdd} disabled={!newGift.name}>
              <Check className="w-3 h-3 mr-1" /> Add Gift
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { setAdding(false); setNewGift(EMPTY_NEW); }}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : gifts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No gifts yet. Add your first gift above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {gifts.map(g => <GiftRow key={g.id} gift={g} onSave={handleSave} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}
