// src/pages/Post.tsx
import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface Post {
  id: string;
  userName: string;
  content: string;
  hashtags: string[];
  createdAt: number;
  status: "real" | "fake" | "banned";
}

export default function Post() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filtered, setFiltered] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, real: 0, fake: 0, banned: 0 });

  useEffect(() => {
    const refPosts = ref(db, "posts");
    const unsub = onValue(refPosts, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list: Post[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setPosts(list);
        setFiltered(list);
        setStats({ total: list.length, real: list.filter(p => p.status === "real").length, fake: list.filter(p => p.status === "fake").length, banned: list.filter(p => p.status === "banned").length });
      } else { setPosts([]); setFiltered([]); setStats({ total: 0, real: 0, fake: 0, banned: 0 }); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setSearch(q);
    setFiltered(posts.filter(p => p.userName.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)));
  };

  const updateStatus = async (id: string, status: "real" | "fake" | "banned") => {
    await update(ref(db, `posts/${id}`), { status });
    toast({ title: `Post ${status}` });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <h1 className="text-2xl font-bold text-white">Posts</h1>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Post</p><p className="text-2xl font-bold text-white">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Real Post</p><p className="text-2xl font-bold text-green-400">{stats.real}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Fake Post</p><p className="text-2xl font-bold text-red-400">{stats.fake}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Banned Post</p><p className="text-2xl font-bold text-yellow-400">{stats.banned}</p></CardContent></Card>
      </div>

      <Input placeholder="Search by name, username, content..." value={search} onChange={handleSearch} className="max-w-md bg-background border-border" />

      <div className="bg-card border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground"><th>User</th><th>Content</th><th>Hashtags</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (<tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No posts</td></tr>) : (
              filtered.map(p => (
                <tr key={p.id} className="border-b border-border/40">
                  <td className="p-3 text-white">{p.userName}</td>
                  <td className="p-3 text-white max-w-xs truncate">{p.content}</td>
                  <td className="p-3 text-white">{p.hashtags?.join(", ")}</td>
                  <td className="p-3 text-white text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-3"><Badge className={p.status === "real" ? "bg-green-500/20 text-green-400" : p.status === "fake" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}>{p.status}</Badge></td>
                  <td className="p-3 flex gap-1">
                    {p.status !== "real" && <Button size="sm" variant="ghost" className="text-green-400" onClick={() => updateStatus(p.id, "real")}><Check className="w-4 h-4" /></Button>}
                    {p.status !== "fake" && <Button size="sm" variant="ghost" className="text-red-400" onClick={() => updateStatus(p.id, "fake")}><X className="w-4 h-4" /></Button>}
                    {p.status !== "banned" && <Button size="sm" variant="ghost" className="text-yellow-400" onClick={() => updateStatus(p.id, "banned")}>Ban</Button>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}