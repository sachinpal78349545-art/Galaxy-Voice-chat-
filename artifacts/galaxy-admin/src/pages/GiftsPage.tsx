import { useState, useEffect } from "react";
import { Gift, Plus, Trash2, Save, RefreshCw, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ref, get, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";

interface GiftItem {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  enabled: boolean;
}

const DEFAULT_GIFTS: GiftItem[] = [
  { id: "rose", emoji: "🌹", name: "Rose", cost: 10, enabled: true },
  { id: "heart", emoji: "❤️", name: "Heart", cost: 20, enabled: true },
  { id: "star", emoji: "⭐", name: "Star", cost: 50, enabled: true },
  { id: "crown", emoji: "👑", name: "Crown", cost: 100, enabled: true },
  { id: "diamond", emoji: "💎", name: "Diamond", cost: 200, enabled: true },
  { id: "rocket", emoji: "🚀", name: "Rocket", cost: 500, enabled: true },
  { id: "dragon", emoji: "🐉", name: "Dragon", cost: 1000, enabled: true },
  { id: "trophy", emoji: "🏆", name: "Trophy", cost: 2000, enabled: true },
  { id: "galaxy", emoji: "🌌", name: "Galaxy", cost: 5000, enabled: true },
  { id: "gift_box", emoji: "🎁", name: "Gift Box", cost: 10, enabled: true },
  { id: "fire", emoji: "🔥", name: "Fire", cost: 30, enabled: true },
  { id: "rainbow", emoji: "🌈", name: "Rainbow", cost: 300, enabled: true },
];

function GiftRow({ gift, onSave, onDelete }: {
  gift: GiftItem;
  onSave: (g: GiftItem) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(gift);

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
        {editing ? (
          <Input
            value={form.emoji}
            onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
            className="w-10 h-10 text-center text-lg bg-background border-border p-0"
          />
        ) : form.emoji}
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-2">
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Name"
              className="h-8 text-xs bg-background border-border flex-1"
            />
            <Input
              type="number"
              value={form.cost}
              onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))}
              placeholder="Cost"
              className="h-8 text-xs bg-background border-border w-24"
            />
          </div>
        ) : (
          <>
            <p className="font-semibold text-sm text-white">{form.name}</p>
            <p className="text-xs text-muted-foreground">🪙 {form.cost} coins</p>
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {editing ? (
          <>
            <Button size="sm" className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700" onClick={() => { onSave(form); setEditing(false); }}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => { setForm(gift); setEditing(false); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${form.enabled ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
              {form.enabled ? "ON" : "OFF"}
            </span>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white" onClick={() => { onSave({ ...form, enabled: !form.enabled }); setForm(f => ({ ...f, enabled: !f.enabled })); }}>
              {form.enabled ? "🔇" : "🔊"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white" onClick={() => setEditing(true)}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(gift.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GiftsPage() {
  const { toast } = useToast();
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newGift, setNewGift] = useState<Partial<GiftItem>>({ emoji: "🎁", name: "", cost: 50, enabled: true });

  async function loadGifts() {
    setLoading(true);
    const snap = await get(ref(db, "appConfig/gifts"));
    if (snap.exists()) {
      const val = snap.val() as Record<string, GiftItem>;
      setGifts(Object.values(val).sort((a, b) => a.cost - b.cost));
    } else {
      setGifts(DEFAULT_GIFTS);
      const batch: Record<string, GiftItem> = {};
      DEFAULT_GIFTS.forEach(g => { batch[g.id] = g; });
      await set(ref(db, "appConfig/gifts"), batch);
    }
    setLoading(false);
  }

  useEffect(() => { loadGifts(); }, []);

  async function handleSave(gift: GiftItem) {
    await set(ref(db, `appConfig/gifts/${gift.id}`), gift);
    setGifts(prev => prev.map(g => g.id === gift.id ? gift : g));
    toast({ title: "Gift updated" });
  }

  async function handleDelete(id: string) {
    await remove(ref(db, `appConfig/gifts/${id}`));
    setGifts(prev => prev.filter(g => g.id !== id));
    toast({ title: "Gift deleted" });
  }

  async function handleAdd() {
    if (!newGift.name || !newGift.emoji) return;
    const id = `gift_${Date.now()}`;
    const gift: GiftItem = { id, emoji: newGift.emoji!, name: newGift.name!, cost: newGift.cost || 50, enabled: true };
    await set(ref(db, `appConfig/gifts/${id}`), gift);
    setGifts(prev => [...prev, gift].sort((a, b) => a.cost - b.cost));
    setNewGift({ emoji: "🎁", name: "", cost: 50, enabled: true });
    setAdding(false);
    toast({ title: "Gift added" });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Gifts Management</h1>
          <p className="text-muted-foreground text-sm">{gifts.length} gift items</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadGifts} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAdding(v => !v)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Gift
          </Button>
        </div>
      </div>

      {adding && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white">New Gift</p>
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Emoji" value={newGift.emoji} onChange={e => setNewGift(f => ({ ...f, emoji: e.target.value }))} className="w-20 bg-background border-border" />
            <Input placeholder="Name" value={newGift.name} onChange={e => setNewGift(f => ({ ...f, name: e.target.value }))} className="flex-1 bg-background border-border" />
            <Input type="number" placeholder="Cost" value={newGift.cost} onChange={e => setNewGift(f => ({ ...f, cost: Number(e.target.value) }))} className="w-28 bg-background border-border" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={handleAdd} disabled={!newGift.name}>
              <Check className="w-3 h-3 mr-1" /> Add
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {gifts.map(g => <GiftRow key={g.id} gift={g} onSave={handleSave} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}
