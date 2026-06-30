import { useState, useEffect } from "react";
import { Settings, AlertTriangle, Radio, Wrench, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  setMaintenanceMode, subscribeMaintenanceMode,
  setAutoEntryRoom, getAutoEntryRoom, subscribeRooms, Room,
} from "@/lib/adminService";
import { cn } from "@/lib/utils";

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);
  const [maintMsg, setMaintMsg] = useState("");
  const [maintLoading, setMaintLoading] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [autoEntryRoom, setAutoEntry] = useState<string>("");
  const [currentAutoEntry, setCurrentAutoEntry] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeMaintenanceMode(data => {
      setMaintenance(data);
      if (data) setMaintMsg(data.message);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeRooms(list => setRooms(list));
    return unsub;
  }, []);

  useEffect(() => {
    getAutoEntryRoom().then(id => {
      setCurrentAutoEntry(id);
      if (id) setAutoEntry(id);
    });
  }, []);

  async function toggleMaintenance() {
    setMaintLoading(true);
    try {
      const newState = !maintenance?.enabled;
      await setMaintenanceMode(newState, maintMsg || undefined);
      toast({ title: newState ? "🔧 Maintenance mode ON" : "✅ Maintenance mode OFF" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setMaintLoading(false);
  }

  async function saveMaintMsg() {
    setMaintLoading(true);
    try {
      await setMaintenanceMode(maintenance?.enabled ?? false, maintMsg);
      toast({ title: "Message updated" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setMaintLoading(false);
  }

  async function handleSetAutoEntry() {
    setAutoLoading(true);
    try {
      await setAutoEntryRoom(autoEntryRoom.trim() || null);
      setCurrentAutoEntry(autoEntryRoom.trim() || null);
      toast({ title: autoEntryRoom.trim() ? `Auto-entry room set` : "Auto-entry room cleared" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setAutoLoading(false);
  }

  async function clearAutoEntry() {
    setAutoLoading(true);
    try {
      await setAutoEntryRoom(null);
      setCurrentAutoEntry(null);
      setAutoEntry("");
      toast({ title: "Auto-entry room cleared" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setAutoLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-muted-foreground text-sm">App-wide configuration and controls</p>
      </div>

      <SectionCard title="Maintenance Mode" icon={Wrench}>
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg border",
          maintenance?.enabled
            ? "bg-red-500/10 border-red-500/30"
            : "bg-green-500/10 border-green-500/30"
        )}>
          <div>
            <p className="text-sm font-semibold text-white">
              {maintenance?.enabled ? "🔧 Maintenance is ON" : "✅ App is Live"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {maintenance?.enabled
                ? "Users cannot access the app right now"
                : "App is accessible to all users"}
            </p>
          </div>
          <Button
            size="sm"
            variant={maintenance?.enabled ? "outline" : "destructive"}
            onClick={toggleMaintenance}
            disabled={maintLoading}
            className={maintenance?.enabled ? "border-green-500 text-green-400 hover:bg-green-500/10" : ""}
          >
            {maintLoading ? "..." : maintenance?.enabled ? "Turn OFF" : "Turn ON"}
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Maintenance Message</Label>
          <div className="flex gap-2">
            <Input
              placeholder="App is under maintenance. Please try again later."
              value={maintMsg}
              onChange={e => setMaintMsg(e.target.value)}
              className="bg-background border-border flex-1"
            />
            <Button size="sm" variant="outline" onClick={saveMaintMsg} disabled={maintLoading}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Auto-Entry Room" icon={Radio}>
        <p className="text-xs text-muted-foreground">
          Set a room that users are automatically redirected to when they open the app.
        </p>

        {currentAutoEntry && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
            <div>
              <p className="text-xs text-muted-foreground">Current auto-entry room</p>
              <code className="text-sm text-primary font-mono">{currentAutoEntry}</code>
            </div>
            <Button size="sm" variant="outline" onClick={clearAutoEntry} disabled={autoLoading} className="text-xs text-destructive hover:bg-destructive/10">
              Clear
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Select from active rooms</Label>
          <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border bg-background p-2">
            {rooms.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No active rooms</p>
            ) : rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setAutoEntry(room.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors",
                  autoEntryRoom === room.id
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span>{room.coverEmoji || "🎤"}</span>
                <span className="flex-1 truncate">{room.name}</span>
                <span className="text-muted-foreground shrink-0">{room.listeners ?? 0} listeners</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Or enter room ID manually"
              value={autoEntryRoom}
              onChange={e => setAutoEntry(e.target.value)}
              className="bg-background border-border text-xs flex-1"
            />
            <Button size="sm" onClick={handleSetAutoEntry} disabled={autoLoading || !autoEntryRoom.trim()}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Set
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="App Info" icon={Settings}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "App Name", value: "Galaxy Voice Chat" },
            { label: "Admin Version", value: "1.0.0" },
            { label: "SuperAdmin ID", value: "306623582" },
            { label: "Backend", value: "Firebase Realtime DB" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/50 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
