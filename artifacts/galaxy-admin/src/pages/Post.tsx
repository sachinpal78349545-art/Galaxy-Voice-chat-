// src/pages/Post.tsx
import { useState, useEffect, useRef } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, Edit, ImagePlus, Loader2, Filter, Eye } from "lucide-react";

// ─── Cloudinary Upload ──────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dz1bhfpkc";
const CLOUDINARY_UPLOAD_PRESET = "Profile_pic";

function UploadImageButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Only image files allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Max 5MB"); return; }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Upload failed"); }
      const data = await res.json();
      onUploaded(data.secure_url);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <Button type="button" variant="outline" size="sm" className="gap-2 border-dashed"
        onClick={() => fileRef.current?.click()} disabled={uploading}>
        <ImagePlus className="w-4 h-4" />
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : "Upload from Gallery"}
      </Button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

// ─── Post Interface ──────────────────────────────────────────────
interface Post {
  id: string;
  userId: string;
  userName?: string;
  content: string;
  hashtags: string[];
  createdAt: number;
  status: "real" | "fake" | "banned";
  mentionedUsers?: string[];
  likes?: number;
  comments?: number;
  shares?: number;
  imageUrl?: string;      // ✅ Single image URL (जैसा Firebase में है)
}

export default function Post() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filtered, setFiltered] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, real: 0, fake: 0, banned: 0 });

  const [showAll, setShowAll] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editForm, setEditForm] = useState<Partial<Post>>({});
  const [newImageUrl, setNewImageUrl] = useState<string>("");

  // ─── Fetch Posts ──────────────────────────────────────────────
  useEffect(() => {
    const POSTS_PATH = "moments";
    const refPosts = ref(db, POSTS_PATH);
    const unsub = onValue(refPosts, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list: Post[] = [];

        Object.keys(data).forEach(userId => {
          // Skip demo/fake/test users
          const isDemoUser = userId.startsWith("demo_") || userId.startsWith("fake_") || userId.includes("test");
          if (isDemoUser) return;

          const userPosts = data[userId];
          Object.keys(userPosts).forEach(postId => {
            const p = userPosts[postId];
            
            // 🔍 Debug logs (remove after confirming)
            console.log("🔍 Post keys:", Object.keys(p));
            console.log("🖼️ imageUrl:", p.imageUrl);

            list.push({
              id: `${userId}_${postId}`,
              userId: userId,
              userName: p.userName || p.name || p.author || "Unknown",
              content: p.text || p.content || p.caption || "",
              hashtags: p.hashtags || p.tags || [],
              createdAt: p.timestamp || p.createdAt || p.postedAt || Date.now(),
              status: p.status || "real",
              mentionedUsers: p.mentionedUsers || p.mentions || [],
              likes: p.likes || p.likeCount || 0,
              comments: p.comments || p.commentCount || 0,
              shares: p.shares || p.shareCount || 0,
              imageUrl: p.imageUrl || p.image || p.img || null,   // ✅ Correct field
            });
          });
        });

        list.sort((a, b) => b.createdAt - a.createdAt);
        setPosts(list);
        applyFilters(list, search, showAll);
        calculateStats(list);
      } else {
        setPosts([]);
        setFiltered([]);
        setStats({ total: 0, real: 0, fake: 0, banned: 0 });
      }
      setLoading(false);
    }, error => {
      console.error("❌ Error fetching posts:", error);
      toast({ title: "Failed to load posts", variant: "destructive" });
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const applyFilters = (postList: Post[], searchTerm: string, all: boolean) => {
    let result = postList;
    if (!all) {
      result = result.filter(p => p.status === "real");
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.userId.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  };

  const calculateStats = (list: Post[]) => {
    const filteredList = list.filter(p => p.status === "real" || p.status === "fake" || p.status === "banned");
    setStats({
      total: filteredList.length,
      real: filteredList.filter(p => p.status === "real").length,
      fake: filteredList.filter(p => p.status === "fake").length,
      banned: filteredList.filter(p => p.status === "banned").length,
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearch(q);
    applyFilters(posts, q, showAll);
  };

  const toggleShowAll = () => {
    const newVal = !showAll;
    setShowAll(newVal);
    applyFilters(posts, search, newVal);
  };

  const updateStatus = async (id: string, status: "real" | "fake" | "banned") => {
    const [userId, postId] = id.split("_");
    try {
      await update(ref(db, `moments/${userId}/${postId}`), { status });
      toast({ title: `Post marked as ${status}` });
      const updatedPosts = posts.map(p => p.id === id ? { ...p, status } : p);
      setPosts(updatedPosts);
      applyFilters(updatedPosts, search, showAll);
      calculateStats(updatedPosts);
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const openEditModal = (post: Post) => {
    setEditingPost(post);
    setEditForm({ ...post });
    setNewImageUrl("");
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingPost(null);
    setEditForm({});
    setNewImageUrl("");
  };

  const handleEditSave = async () => {
    if (!editingPost) return;
    const [userId, postId] = editingPost.id.split("_");
    const updates: any = {};
    if (editForm.content !== undefined) updates.content = editForm.content;
    if (editForm.hashtags !== undefined) updates.hashtags = editForm.hashtags;
    if (editForm.mentionedUsers !== undefined) updates.mentionedUsers = editForm.mentionedUsers;
    if (newImageUrl) {
      updates.imageUrl = newImageUrl;   // ✅ Single image
    }
    try {
      await update(ref(db, `moments/${userId}/${postId}`), updates);
      toast({ title: "Post updated" });
      const updatedPost = { ...editingPost, ...updates };
      const newPosts = posts.map(p => p.id === editingPost.id ? updatedPost : p);
      setPosts(newPosts);
      applyFilters(newPosts, search, showAll);
      closeEditModal();
    } catch {
      toast({ title: "Failed to update post", variant: "destructive" });
    }
  };

  const handleImageUploaded = (url: string) => {
    setNewImageUrl(url);
  };

  if (loading) return <div className="text-white p-6">Loading posts...</div>;

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Posts</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={showAll ? "default" : "outline"}
            size="sm"
            onClick={toggleShowAll}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {showAll ? "All Posts" : "Real Posts Only"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Real</p><p className="text-2xl font-bold text-green-400">{stats.real}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Fake</p><p className="text-2xl font-bold text-red-400">{stats.fake}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Banned</p><p className="text-2xl font-bold text-yellow-400">{stats.banned}</p></CardContent></Card>
      </div>

      <Input
        placeholder="Search by User ID or content..."
        value={search}
        onChange={handleSearch}
        className="max-w-md bg-background border-border"
      />

      <div className="bg-card border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="p-3 text-left">User ID</th>
              <th className="p-3 text-left">Content</th>
              <th className="p-3 text-left">Image</th>
              <th className="p-3 text-left">Hashtags</th>
              <th className="p-3 text-left">Mentions</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">
                {showAll ? "No posts found" : "No real posts found."}
              </td></tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className="border-b border-border/40">
                  <td className="p-3 text-white font-mono text-xs">{p.userId}</td>
                  <td className="p-3 text-white max-w-xs truncate">{p.content}</td>
                  <td className="p-3">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt="post"
                        className="w-10 h-10 rounded object-cover border border-border"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-white">{p.hashtags?.join(", ") || "—"}</td>
                  <td className="p-3 text-white">{p.mentionedUsers?.join(", ") || "—"}</td>
                  <td className="p-3 text-white text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <Badge className={
                      p.status === "real" ? "bg-green-500/20 text-green-400" :
                      p.status === "fake" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }>{p.status}</Badge>
                  </td>
                  <td className="p-3 flex gap-1 flex-wrap">
                    {p.status !== "real" && (
                      <Button size="sm" variant="ghost" className="text-green-400" onClick={() => updateStatus(p.id, "real")}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    {p.status !== "fake" && (
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => updateStatus(p.id, "fake")}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    {p.status !== "banned" && (
                      <Button size="sm" variant="ghost" className="text-yellow-400" onClick={() => updateStatus(p.id, "banned")}>
                        Ban
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-blue-400" onClick={() => openEditModal(p)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Edit Modal ────────────────────────────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground">Content</label>
              <textarea
                className="w-full bg-background border border-border rounded p-2 text-white text-sm"
                rows={3}
                value={editForm.content || ""}
                onChange={e => setEditForm({ ...editForm, content: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Hashtags (comma separated)</label>
              <Input
                value={editForm.hashtags?.join(", ") || ""}
                onChange={e => setEditForm({ ...editForm, hashtags: e.target.value.split(",").map(s => s.trim()) })}
                placeholder="e.g. #photography, #love"
                className="bg-background border-border"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Mentioned Users (comma separated)</label>
              <Input
                value={editForm.mentionedUsers?.join(", ") || ""}
                onChange={e => setEditForm({ ...editForm, mentionedUsers: e.target.value.split(",").map(s => s.trim()) })}
                placeholder="e.g. @john, @jane"
                className="bg-background border-border"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Add Image</label>
              <UploadImageButton onUploaded={handleImageUploaded} />
              {newImageUrl && (
                <div className="mt-2 w-32 h-32 rounded overflow-hidden bg-muted/20">
                  <img src={newImageUrl} alt="New upload" className="w-full h-full object-cover" />
                </div>
              )}
              {editingPost?.imageUrl && (
                <div className="mt-2 w-32 h-32 rounded overflow-hidden bg-muted/20">
                  <img src={editingPost.imageUrl} alt="Current" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>❤️ {editingPost?.likes || 0}</span>
              <span>💬 {editingPost?.comments || 0}</span>
              <span>↗️ {editingPost?.shares || 0}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}