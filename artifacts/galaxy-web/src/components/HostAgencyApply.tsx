/**
 * HostAgencyApply – Full-screen panel for applying to be a Host or creating an Agency.
 * Used inside ProfilePage as a sub-page.
 */
import React, { useState, useEffect } from "react";
import { applyForHost, applyForAgency, getUserHostApplication, getUserAgencyApplication, HostApplication, AgencyApplication } from "../lib/agencyService";
import { useToast } from "../lib/toastContext";

interface Props {
  uid: string;
  userId: string;
  name: string;
  avatar: string;
  onClose: () => void;
}

type Tab = "host" | "agency";
type HostStatus = HostApplication | null;
type AgencyStatus = AgencyApplication | null;

export default function HostAgencyApply({ uid, userId, name, avatar, onClose }: Props) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("host");

  // Host form
  const [hReason, setHReason] = useState("");
  const [hExperience, setHExperience] = useState("");
  const [hSocial, setHSocial] = useState("");
  const [hLang, setHLang] = useState("");
  const [hSubmitting, setHSubmitting] = useState(false);
  const [hostStatus, setHostStatus] = useState<HostStatus>(null);
  const [hostLoading, setHostLoading] = useState(true);

  // Agency form
  const [aName, setAName] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aHostCount, setAHostCount] = useState("");
  const [aSite, setASite] = useState("");
  const [aSubmitting, setASubmitting] = useState(false);
  const [agencyStatus, setAgencyStatus] = useState<AgencyStatus>(null);
  const [agencyLoading, setAgencyLoading] = useState(true);

  useEffect(() => {
    getUserHostApplication(uid).then(a => { setHostStatus(a); setHostLoading(false); });
    getUserAgencyApplication(uid).then(a => { setAgencyStatus(a); setAgencyLoading(false); });
  }, [uid]);

  async function submitHost(e: React.FormEvent) {
    e.preventDefault();
    if (!hReason.trim() || !hExperience.trim()) { showToast("Please fill all required fields", "error"); return; }
    setHSubmitting(true);
    try {
      await applyForHost(uid, { userId, name, avatar, reason: hReason, experience: hExperience, socialLinks: hSocial, languages: hLang });
      showToast("Host application submitted! ✅ Our team will review it.", "success");
      const updated = await getUserHostApplication(uid);
      setHostStatus(updated);
      setHReason(""); setHExperience(""); setHSocial(""); setHLang("");
    } catch (err: any) {
      showToast(err?.message || "Failed to submit application", "error");
    }
    setHSubmitting(false);
  }

  async function submitAgency(e: React.FormEvent) {
    e.preventDefault();
    if (!aName.trim() || !aDesc.trim() || !aHostCount.trim()) { showToast("Please fill all required fields", "error"); return; }
    setASubmitting(true);
    try {
      await applyForAgency(uid, { userId, name, avatar, agencyName: aName, description: aDesc, hostCount: aHostCount, website: aSite });
      showToast("Agency application submitted! ✅ Our team will review it.", "success");
      const updated = await getUserAgencyApplication(uid);
      setAgencyStatus(updated);
      setAName(""); setADesc(""); setAHostCount(""); setASite("");
    } catch (err: any) {
      showToast(err?.message || "Failed to submit application", "error");
    }
    setASubmitting(false);
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "rgba(245,158,11,0.2)",
      approved: "rgba(34,197,94,0.2)",
      rejected: "rgba(239,68,68,0.2)",
    };
    const text: Record<string, string> = { pending: "⏳ Pending Review", approved: "✅ Approved", rejected: "❌ Rejected" };
    const tColor: Record<string, string> = { pending: "#F59E0B", approved: "#22C55E", rejected: "#EF4444" };
    return (
      <div style={{ background: colors[status], border: `1px solid ${tColor[status]}44`, borderRadius: 10, padding: "10px 14px" }}>
        <p style={{ color: tColor[status], fontWeight: 700, fontSize: 14 }}>{text[status] || status}</p>
      </div>
    );
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4, display: "block" };
  const required = <span style={{ color: "#ff6b6b" }}> *</span>;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(160deg, #0d001a 0%, #1a0030 100%)",
      zIndex: 1100, display: "flex", flexDirection: "column",
      fontFamily: "'Poppins', 'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 16px 0", gap: 12, shrink: 0 }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: "8px 12px", color: "#fff", cursor: "pointer", fontSize: 18 }}>←</button>
        <div>
          <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 18, margin: 0 }}>Apply / Official Roles</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0 }}>Become a Host or start an Agency</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
        {([["host", "🎤 Host", "Become a voice room host"], ["agency", "🏢 Agency", "Create your own agency"]] as const).map(([id, label, sub]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, background: tab === id ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${tab === id ? "#6C5CE7" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12, padding: "10px 8px", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
          }}>
            <p style={{ color: tab === id ? "#A29BFE" : "#fff", fontWeight: 700, fontSize: 13, margin: 0 }}>{label}</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, margin: "2px 0 0" }}>{sub}</p>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 40px" }}>

        {/* ── HOST TAB ── */}
        {tab === "host" && (
          <div>
            {/* Benefits card */}
            <div style={{ background: "rgba(108,92,231,0.1)", border: "1px solid rgba(108,92,231,0.3)", borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <p style={{ color: "#A29BFE", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🎤 Host Benefits</p>
              {["✨ Official HOST badge on your avatar", "🌟 Golden frame visible in all rooms", "💰 Earn coins from room gifts", "📢 Featured in recommended rooms", "🛡️ Advanced room controls"].map(b => (
                <p key={b} style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "4px 0" }}>{b}</p>
              ))}
            </div>

            {hostLoading ? (
              <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 20 }}>Loading...</p>
            ) : hostStatus ? (
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Your Application Status:</p>
                {statusBadge(hostStatus.status)}
                {hostStatus.reviewNote && (
                  <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 12, marginTop: 10 }}>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Review note:</p>
                    <p style={{ color: "#fff", fontSize: 13, marginTop: 4 }}>{hostStatus.reviewNote}</p>
                  </div>
                )}
                {hostStatus.status === "rejected" && (
                  <button onClick={() => setHostStatus(null)} style={{ marginTop: 12, background: "rgba(108,92,231,0.2)", border: "1px solid #6C5CE7", borderRadius: 10, padding: "10px 16px", color: "#A29BFE", cursor: "pointer", fontWeight: 600, fontSize: 13, width: "100%" }}>
                    Re-apply
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={submitHost} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Why do you want to become a host?{required}</label>
                  <textarea value={hReason} onChange={e => setHReason(e.target.value)} rows={3}
                    placeholder="Tell us about yourself and why you'd make a great host..."
                    style={{ ...inputStyle, resize: "none" }} required />
                </div>
                <div>
                  <label style={labelStyle}>Previous experience{required}</label>
                  <textarea value={hExperience} onChange={e => setHExperience(e.target.value)} rows={2}
                    placeholder="e.g. Hosted rooms on other apps, content creator, etc."
                    style={{ ...inputStyle, resize: "none" }} required />
                </div>
                <div>
                  <label style={labelStyle}>Languages you speak</label>
                  <input value={hLang} onChange={e => setHLang(e.target.value)} placeholder="e.g. English, Hindi, Urdu" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Social media / profile links</label>
                  <input value={hSocial} onChange={e => setHSocial(e.target.value)} placeholder="Instagram, TikTok, YouTube..." style={inputStyle} />
                </div>
                <button type="submit" disabled={hSubmitting} style={{
                  background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                  border: "none", borderRadius: 12, padding: "14px", color: "#fff",
                  fontWeight: 700, fontSize: 15, cursor: hSubmitting ? "not-allowed" : "pointer",
                  opacity: hSubmitting ? 0.7 : 1,
                }}>
                  {hSubmitting ? "Submitting..." : "🎤 Submit Host Application"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── AGENCY TAB ── */}
        {tab === "agency" && (
          <div>
            <div style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <p style={{ color: "#FFD700", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🏢 Agency Benefits</p>
              {["👑 Official Agency badge", "🎤 Manage your host team", "💼 Agency profile page", "📊 Performance stats for all hosts", "🏆 Agency leaderboard ranking"].map(b => (
                <p key={b} style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "4px 0" }}>{b}</p>
              ))}
            </div>

            {agencyLoading ? (
              <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 20 }}>Loading...</p>
            ) : agencyStatus ? (
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Your Agency Application:</p>
                {statusBadge(agencyStatus.status)}
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 12, marginTop: 10 }}>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Agency Name</p>
                  <p style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{agencyStatus.agencyName}</p>
                </div>
                {agencyStatus.reviewNote && (
                  <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 12, marginTop: 8 }}>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Review note:</p>
                    <p style={{ color: "#fff", fontSize: 13, marginTop: 4 }}>{agencyStatus.reviewNote}</p>
                  </div>
                )}
                {agencyStatus.status === "rejected" && (
                  <button onClick={() => setAgencyStatus(null)} style={{ marginTop: 12, background: "rgba(255,215,0,0.15)", border: "1px solid #FFD700", borderRadius: 10, padding: "10px 16px", color: "#FFD700", cursor: "pointer", fontWeight: 600, fontSize: 13, width: "100%" }}>
                    Re-apply
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={submitAgency} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Agency Name{required}</label>
                  <input value={aName} onChange={e => setAName(e.target.value)} placeholder="Your agency name" style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Description{required}</label>
                  <textarea value={aDesc} onChange={e => setADesc(e.target.value)} rows={3}
                    placeholder="What is your agency about? What kind of hosts will you manage?"
                    style={{ ...inputStyle, resize: "none" }} required />
                </div>
                <div>
                  <label style={labelStyle}>How many hosts do you plan to manage?{required}</label>
                  <input value={aHostCount} onChange={e => setAHostCount(e.target.value)} placeholder="e.g. 5-10" style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Website / Social link (optional)</label>
                  <input value={aSite} onChange={e => setASite(e.target.value)} placeholder="https://..." style={inputStyle} />
                </div>
                <button type="submit" disabled={aSubmitting} style={{
                  background: "linear-gradient(135deg, #FFD700, #FFA500)",
                  border: "none", borderRadius: 12, padding: "14px", color: "#1a0a00",
                  fontWeight: 700, fontSize: 15, cursor: aSubmitting ? "not-allowed" : "pointer",
                  opacity: aSubmitting ? 0.7 : 1,
                }}>
                  {aSubmitting ? "Submitting..." : "🏢 Submit Agency Application"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
