// src/pages/Report.tsx
import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, X, Eye } from "lucide-react";

interface Report {
  id: string;
  reporterName: string;
  reportedUserName: string;
  reason: string;
  type: "video" | "post" | "user";
  status: "pending" | "solved" | "rejected";
  createdAt: number;
}

export default function Report() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [filtered, setFiltered] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0, solved: 0, video: 0, post: 0, user: 0 });

  useEffect(() => {
    const refReports = ref(db, "reports");
    const unsub = onValue(refReports, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list: Report[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setReports(list);
        setFiltered(list);
        calculateStats(list);
      } else { setReports([]); setFiltered([]); setStats({ total: 0, pending: 0, solved: 0, video: 0, post: 0, user: 0 }); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const calculateStats = (list: Report[]) => {
    setStats({
      total: list.length,
      pending: list.filter(r => r.status === "pending").length,
      solved: list.filter(r => r.status === "solved").length,
      video: list.filter(r => r.type === "video").length,
      post: list.filter(r => r.type === "post").length,
      user: list.filter(r => r.type === "user").length,
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setSearch(q);
    setFiltered(reports.filter(r => r.reporterName.toLowerCase().includes(q) || r.reportedUserName.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q)));
  };

  const resolveReport = async (id: string) => {
    await update(ref(db, `reports/${id}`), { status: "solved" });
    toast({ title: "Report resolved" });
  };

  const rejectReport = async (id: string) => {
    await update(ref(db, `reports/${id}`), { status: "rejected" });
    toast({ title: "Report rejected" });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <h1 className="text-2xl font-bold text-white">Reports</h1>
      <div className="grid grid-cols-6 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-400">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Solved</p><p className="text-2xl font-bold text-green-400">{stats.solved}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Video</p><p className="text-2xl font-bold text-blue-400">{stats.video}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Post</p><p className="text-2xl font-bold text-purple-400">{stats.post}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">User</p><p className="text-2xl font-bold text-pink-400">{stats.user}</p></CardContent></Card>
      </div>

      <Input placeholder="Search by name, username, reason..." value={search} onChange={handleSearch} className="max-w-md bg-background border-border" />

      <div className="bg-card border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground"><th>Reporter</th><th>Reported User</th><th>Reason</th><th>Type</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (<tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No reports found</td></tr>) : (
              filtered.map(r => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="p-3 text-white">{r.reporterName}</td>
                  <td className="p-3 text-white">{r.reportedUserName}</td>
                  <td className="p-3 text-white">{r.reason}</td>
                  <td className="p-3"><Badge>{r.type}</Badge></td>
                  <td className="p-3 text-white text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="p-3"><Badge className={r.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}>{r.status}</Badge></td>
                  <td className="p-3 flex gap-1">
                    {r.status === "pending" && (<><Button size="sm" variant="ghost" className="text-green-400" onClick={() => resolveReport(r.id)}><Check className="w-4 h-4" /></Button><Button size="sm" variant="ghost" className="text-red-400" onClick={() => rejectReport(r.id)}><X className="w-4 h-4" /></Button></>)}
                    <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
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