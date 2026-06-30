import { useState, useEffect } from "react";
import { Image, Plus, Trash2, Edit2, Check, X, Save, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ref, get, set, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image?: string;
  gradient: string;
  order: number;
  enabled: boolean;
}

const DEFAULT_BANNERS: Banner[] = [
  { id: "portal", title: "Welcome to Galaxy", subtitle: "Discover magical voice rooms", badge: "NEW", gradient: "linear-gradient(135deg, rgba(255,215,0,0.3), rgba(191,0,255,0.2))", order: 0, enabled: true },
  { id: "gaming", title: "New Features", subtitle: "Play with friends worldwide", badge: "HOT", gradient: "linear-gradient(135deg, rgba(108,92,231,0.3), rgba(0,230,118,0.15))", order: 1, enabled: true },
  { id: "rewards", title: "Daily Rewards", subtitle: "Claim coins & gifts every day", badge: "REWARDS", gradient: "linear-gradient(135deg, rgba(255,100,50,0.3), rgba(255,215,0,0.2))", order: 2, enabled: true },
  { id: "event1", title: "Special Event", subtitle: "Join the exclusive party", badge: "EVENT", gradient: "linear-gradient(135deg, rgba(255,0,150,0.3), rgba(0,200,255,0.2))", order: 3, enabled: true },
  { id: "event2", title: "Leaderboard", subtitle: "Climb the leaderboard now", badge: "RANKED", gradient: "linear-gradient(135deg, rgba(50,200,50,0.3), rgba(255,255,0,0.2))", order: 4, enabled: true },
];

const GRADIENTS = [
  "linear-gradient(135deg, rgba(255,215,0,0.3), rgba(191,0,255,0.2))",
  "linear-gradient(135deg, rgba(108,92,231,0.3), rgba(0,230,118,0.15))",
  "linear-gradient(135deg, rgba(255,100,50,0.3), rgba(255,215,0,0.2))",
  "linear-gradient(135deg, rgba(255,0,150,0.3), rgba(0,200,255,0.2))",
  "linear-gradient(135deg, rgba(50,200,50,0.3), rgba(255,255,0,0.2))",
  "linear-gradient(135deg, rgba(0,200,255,0.3), rgba(138,43,226,0.2))",
  "linear-gradient(135deg, rgba(255,20,147,0.3), rgba(255,140,0,0.2))",
];

function BannerCard({ banner, onSave, onDelete, onMove }: {
  banner: Banner;
  onSave: (b: Banner) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(banner);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="h-14 relative" style={{ background: form.gradient }}>
        <div className="absolute inset-0 flex items-center px-4 gap-3">
          <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded">{form.badge}</span>
          <div>
            <p className="text-sm font-bold text-white leading-none">{form.title}</p>
            <p className="text-[10px] text-white/70">{form.subtitle}</p>
          </div>
          {!form.enabled && <span className="ml-auto text-[10px] bg-black/40 text-white/60 px-2 py-0.5 rounded">HIDDEN</span>}
        </div>
      </div>
      {editing ? (
        <div className="p-4 space-y-3 border-t border-border">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-background border-border text-xs" />
            <Input placeholder="Subtitle" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="bg-background border-border text-xs" />
            <Input placeholder="Badge (e.g. HOT)" value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} className="bg-background border-border text-xs" />
            <Input placeholder="Image URL (optional)" value={form.image || ""} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} className="bg-background border-border text-xs" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Background</p>
            <div className="flex gap-2 flex-wrap">
              {GRADIENTS.map((g, i) => (
                <button key={i} onClick={() => setForm(f => ({ ...f, gradient: g }))}
                  className={`w-8 h-8 rounded-lg border-2 ${form.gradient === g ? "border-primary" : "border-transparent"}`}
                  style={{ background: g }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => { onSave(form); setEditing(false); }}>
              <Check className="w-3 h-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { setForm(banner); setEditing(false); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-2 border-t border-border flex items-center gap-2">
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-white" onClick={() => onMove(banner.id, "up")}><ArrowUp className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-white" onClick={() => onMove(banner.id, "down")}><ArrowDown className="w-3 h-3" /></Button>
          </div>
          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-white h-6 px-2" onClick={() => { onSave({ ...form, enabled: !form.enabled }); setForm(f => ({ ...f, enabled: !f.enabled })); }}>
            {form.enabled ? "Hide" : "Show"}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-white ml-auto" onClick={() => setEditing(true)}><Edit2 className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(banner.id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      )}
    </div>
  );
}

export default function BannersPage() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBanners() {
    setLoading(true);
    const snap = await get(ref(db, "appConfig/banners"));
    if (snap.exists()) {
      const val = snap.val() as Record<string, Banner>;
      setBanners(Object.values(val).sort((a, b) => a.order - b.order));
    } else {
      setBanners(DEFAULT_BANNERS);
      const batch: Record<string, Banner> = {};
      DEFAULT_BANNERS.forEach(b => { batch[b.id] = b; });
      await set(ref(db, "appConfig/banners"), batch);
    }
    setLoading(false);
  }

  useEffect(() => { loadBanners(); }, []);

  async function handleSave(banner: Banner) {
    await set(ref(db, `appConfig/banners/${banner.id}`), banner);
    setBanners(prev => prev.map(b => b.id === banner.id ? banner : b));
    toast({ title: "Banner updated" });
  }

  async function handleDelete(id: string) {
    await remove(ref(db, `appConfig/banners/${id}`));
    setBanners(prev => prev.filter(b => b.id !== id));
    toast({ title: "Banner deleted" });
  }

  function handleMove(id: string, dir: "up" | "down") {
    const idx = banners.findIndex(b => b.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === banners.length - 1) return;
    const newBanners = [...banners];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newBanners[idx], newBanners[swapIdx]] = [newBanners[swapIdx], newBanners[idx]];
    const reordered = newBanners.map((b, i) => ({ ...b, order: i }));
    setBanners(reordered);
    const batch: Record<string, Banner> = {};
    reordered.forEach(b => { batch[b.id] = b; });
    set(ref(db, "appConfig/banners"), batch);
  }

  async function handleAdd() {
    const id = `banner_${Date.now()}`;
    const banner: Banner = { id, title: "New Banner", subtitle: "Subtitle here", badge: "NEW", gradient: GRADIENTS[0], order: banners.length, enabled: true };
    await set(ref(db, `appConfig/banners/${id}`), banner);
    setBanners(prev => [...prev, banner]);
    toast({ title: "Banner added" });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Banners</h1>
          <p className="text-muted-foreground text-sm">Home screen carousel banners</p>
        </div>
        <Button size="sm" onClick={handleAdd}><Plus className="w-3.5 h-3.5 mr-1.5" />Add Banner</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Image className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No banners</p></div>
      ) : (
        <div className="space-y-2">
          {banners.map(b => <BannerCard key={b.id} banner={b} onSave={handleSave} onDelete={handleDelete} onMove={handleMove} />)}
        </div>
      )}
    </div>
  );
}
