import { useState, useEffect, useRef } from 'react';
import { useApp } from '../lib/context';
import type { AppUser } from '../lib/fbAuth';
import {
  listenProfile, updateUserProfile, uploadAvatar,
  deleteAccount, setUserOffline, toggleProfileVisibility,
  getVIPTier, VIP_COLORS, VIP_GLOW, getAchievements, getAgencyStats,
  type VIPTier,
} from '../services/profileService';
import { followUser, unfollowUser, isFollowing, blockUser, reportUser } from '../services/followService';
import { getXpToNextLevel, GIFTS } from '../lib/storage';
import {
  Edit2, Camera, Check, X, ArrowLeft, Loader, Shield, Trash2,
  UserX, Flag, Lock, Unlock, Mic, MicOff, Star, Users, Gift,
  ChevronRight,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────

type Tab = 'profile' | 'wallet' | 'agency' | 'settings';

// ─── Constants ─────────────────────────────────────────────────────

const STORE_ITEMS = [
  { id: 'neon_frame',   icon: '💜', name: 'Neon Frame',    price: 500,  locked: false },
  { id: 'gold_entry',   icon: '✨', name: 'Gold Entry',    price: 2000, locked: true  },
  { id: 'vip_bubble',   icon: '👑', name: 'VIP Bubble',    price: 800,  locked: true  },
  { id: 'galaxy_frame', icon: '🌌', name: 'Galaxy Frame',  price: 5000, locked: true  },
  { id: 'stardust',     icon: '⭐', name: 'Stardust FX',   price: 1200, locked: true  },
  { id: 'crown_effect', icon: '🔮', name: 'Crown Effect',  price: 3500, locked: true  },
];

const BACKPACK_DEFAULTS = [
  { id: 'starter_frame', icon: '🟣', name: 'Starter Frame', equipped: true },
];

// ─── VIP Level Definitions ───────────────────────────────────────────
const VIP_LEVELS = [
  { level: 1, name: 'Bronze',   icon: '🥉', color: '#cd7f32', bg: 'linear-gradient(135deg,#3d1f00,#cd7f32)', benefit: 'Coin bonus +5%'       },
  { level: 2, name: 'Silver',   icon: '🥈', color: '#C0C0C0', bg: 'linear-gradient(135deg,#404040,#C0C0C0)', benefit: 'XP boost +10%'         },
  { level: 3, name: 'Gold',     icon: '🥇', color: '#ffd700', bg: 'linear-gradient(135deg,#6b4c00,#ffd700)', benefit: 'VIP room access'        },
  { level: 4, name: 'Platinum', icon: '💎', color: '#e5e4e2', bg: 'linear-gradient(135deg,#505050,#e5e4e2)', benefit: 'Custom avatar frame'    },
  { level: 5, name: 'Diamond',  icon: '🔷', color: '#7df9ff', bg: 'linear-gradient(135deg,#003f7f,#7df9ff)', benefit: 'Priority host queue'    },
  { level: 6, name: 'Nebula',   icon: '🌌', color: '#da77ff', bg: 'linear-gradient(135deg,#3d006b,#da77ff)', benefit: 'Nebula entry effect'    },
  { level: 7, name: 'Cosmic',   icon: '✨', color: '#fff0a0', bg: 'linear-gradient(135deg,#7f3500,#fff0a0)', benefit: 'Cosmic golden aura'     },
];

// ─── Original Medal Definitions ──────────────────────────────────────
const MEDAL_DEFS = [
  { id: 'rising_star',      icon: '🌟', name: 'Rising Star',      desc: 'Join 30 rooms'          },
  { id: 'elite_giver',      icon: '💝', name: 'Elite Giver',      desc: 'Send 50 gifts'          },
  { id: 'voice_legend',     icon: '🎙️', name: 'Voice Legend',    desc: '100h on-air'            },
  { id: 'social_magnet',    icon: '🧲', name: 'Social Magnet',    desc: '100 followers'          },
  { id: 'cosmic_host',      icon: '🌌', name: 'Cosmic Host',      desc: 'Host 30 rooms'          },
  { id: 'galaxy_guardian',  icon: '🛡️', name: 'Galaxy Guardian', desc: '90 days active'         },
  { id: 'gift_lord',        icon: '👑', name: 'Gift Lord',        desc: 'Receive 200 gifts'      },
  { id: 'nebula_citizen',   icon: '🔮', name: 'Nebula Citizen',   desc: 'Reach VIP Nebula'       },
];

// ─── Circular Progress Indicator ─────────────────────────────────────
function CircleProgress({
  value, max, color, label, sublabel, size = 90,
}: { value: number; max: number; color: string; label: string; sublabel: string; size?: number }) {
  const r = (size - 18) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const arcLen = circ * pct;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={`${arcLen} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.9s ease', filter: `drop-shadow(0 0 5px ${color})` }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{value}</span>
          <span style={{ color: 'rgba(162,155,254,0.5)', fontSize: 9, marginTop: 2 }}>{sublabel}</span>
        </div>
      </div>
      <div style={{ color: 'rgba(162,155,254,0.75)', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ─── SVG Avatar Frame ─────────────────────────────────────────────────
function SVGAvatarFrame({ size, tier }: { size: number; tier: string }) {
  type FrameDef = { stops: string[]; dash?: string; ornaments: boolean };
  const FRAMES: Record<string, FrameDef> = {
    Silver:   { stops: ['#00ffff','#a855f7','#ff00ff'], dash: '5 3', ornaments: true  },
    Gold:     { stops: ['#ffd700','#ff8c00','#ffd700'], dash: undefined, ornaments: true  },
    Platinum: { stops: ['#e5e4e2','#a9a9a9','#d3d3d3'], dash: undefined, ornaments: false },
    Diamond:  { stops: ['#7df9ff','#0077B6','#7df9ff'], dash: '4 2', ornaments: true  },
    Galactic: { stops: ['#fff0a0','#da77ff','#7df9ff'], dash: '3 2', ornaments: true  },
  };
  const f: FrameDef = FRAMES[tier] ?? FRAMES['Silver'];
  const cx = size / 2, cy = size / 2, r = size / 2 - 2.5;
  const gradId = `gfr-${tier}-${size}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {f.stops.map((c, i) => (
            <stop key={i} offset={`${Math.round((i / (f.stops.length - 1)) * 100)}%`} stopColor={c} />
          ))}
        </linearGradient>
        <filter id="fglow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={`url(#${gradId})`} strokeWidth="3.5"
        strokeDasharray={f.dash}
        filter="url(#fglow)" />
      {f.ornaments && [0, 90, 180, 270].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const ox = cx + r * Math.cos(rad);
        const oy = cy + r * Math.sin(rad);
        return (
          <polygon key={deg}
            points={`${ox},${oy - 5} ${ox + 5},${oy} ${ox},${oy + 5} ${ox - 5},${oy}`}
            fill={f.stops[0]} filter="url(#fglow)" />
        );
      })}
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export function ProfilePage() {
  const { currentUser, setUser, refreshUser, viewingProfile, setViewingProfile, setActivePage } = useApp();

  const viewedUid = viewingProfile ?? currentUser?.uid ?? '';
  const isOwnProfile = !viewingProfile || viewingProfile === currentUser?.uid;

  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('profile');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [followingState, setFollowingState] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [privacyPublic, setPrivacyPublic] = useState(true);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [cpPartner] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Listen to Firestore profile ─────────────────────────────────
  useEffect(() => {
    if (!viewedUid) return;
    setLoading(true);
    const unsub = listenProfile(viewedUid, (data) => {
      setProfile(data);
      if (data) {
        setEditName(data.displayName);
        setEditBio(data.bio || '');
        setPrivacyPublic((data as any).isPublic !== false);
      }
      setLoading(false);
    });
    return unsub;
  }, [viewedUid]);

  // ─── Check following state ────────────────────────────────────────
  useEffect(() => {
    if (isOwnProfile || !currentUser || !viewedUid) return;
    isFollowing(currentUser.uid, viewedUid).then(setFollowingState);
  }, [viewedUid, currentUser, isOwnProfile]);

  // ─── Derived ─────────────────────────────────────────────────────
  const vipTier: VIPTier = profile ? getVIPTier(profile.level, profile.coins) : 'Bronze';
  const vipColor = VIP_COLORS[vipTier];
  const vipGlow = VIP_GLOW[vipTier];
  const xpInfo = profile ? getXpToNextLevel(profile.xp) : { current: 0, needed: 100, pct: 0 };
  const achievements = profile ? getAchievements(profile) : [];
  const agencyStats = profile ? getAgencyStats(profile) : null;
  const isVerified = profile ? ((profile.level ?? 0) >= 5 || (profile.totalGiftsReceived ?? 0) >= 50) : false;
  const isOnline = (profile as any)?.online === true;

  // ─── Handlers ────────────────────────────────────────────────────

  function handleBack() {
    setViewingProfile(null);
    if (!isOwnProfile) setActivePage('home');
  }

  function openEditMode() {
    setEditMode(true);
    setEditName(profile?.displayName ?? '');
    setEditBio(profile?.bio ?? '');
    setAvatarError('');
  }

  async function handleSaveProfile() {
    if (!currentUser || !editName.trim()) return;
    setSaving(true);
    try {
      await updateUserProfile(currentUser.uid, {
        displayName: editName.trim(),
        bio: editBio.trim(),
      });
      refreshUser();
      setEditMode(false);
    } catch (err) {
      console.error('[ProfilePage] save error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Image must be under 5MB'); return; }
    setUploadingAvatar(true);
    setAvatarError('');
    try {
      const url = await uploadAvatar(currentUser.uid, file);
      await updateUserProfile(currentUser.uid, { photoURL: url });
      refreshUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('storage')) {
        setAvatarError('Avatar upload requires Firebase Storage (Blaze plan). Using emoji avatar.');
      } else {
        setAvatarError('Upload failed. Try again.');
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleFollowToggle() {
    if (!currentUser || !viewedUid) return;
    setFollowLoading(true);
    try {
      if (followingState) {
        await unfollowUser(currentUser.uid, viewedUid);
        setFollowingState(false);
      } else {
        await followUser(currentUser.uid, currentUser.displayName, viewedUid);
        setFollowingState(true);
      }
    } catch (err) {
      console.error('[ProfilePage] follow error:', err);
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleBlock() {
    if (!currentUser) return;
    try {
      await blockUser(currentUser.uid, viewedUid);
      setShowBlockConfirm(false);
      handleBack();
    } catch (err) {
      console.error('[ProfilePage] block error:', err);
    }
  }

  async function handleReport() {
    if (!currentUser || !reportReason.trim()) return;
    try {
      await reportUser(currentUser.uid, viewedUid, reportReason);
      setReportSent(true);
      setTimeout(() => { setShowReportSheet(false); setReportSent(false); setReportReason(''); }, 2000);
    } catch (err) {
      console.error('[ProfilePage] report error:', err);
    }
  }

  async function handleDeleteAccount() {
    if (!currentUser) return;
    try {
      await setUserOffline(currentUser.uid);
      await deleteAccount(currentUser.uid);
      setUser(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('[ProfilePage] delete account error:', err);
    }
  }

  async function handlePrivacyToggle() {
    if (!currentUser) return;
    const next = !privacyPublic;
    setPrivacyPublic(next);
    await toggleProfileVisibility(currentUser.uid, next);
  }

  // ─── Render helpers ───────────────────────────────────────────────

  function AvatarDisplay({ size = 90 }: { size?: number }) {
    const src = profile?.photoURL;
    const isEmoji = src && src.length <= 4 && !src.startsWith('http');
    const outer = size + 22;
    const hasSVGFrame = ['Silver','Gold','Platinum','Diamond','Galactic'].includes(vipTier);
    return (
      <div style={{ position: 'relative', width: outer, height: outer, flexShrink: 0 }}>
        {/* Ambient glow behind */}
        <div style={{
          position: 'absolute', inset: -8, borderRadius: '50%',
          background: `radial-gradient(circle, ${vipColor}30 0%, transparent 70%)`,
          animation: 'glow-pulse 3s ease-in-out infinite',
        }} />
        {/* Outer pulse ring */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `2px solid ${vipColor}99`,
          animation: 'avatar-ring-pulse 2.6s ease-in-out infinite',
        }} />
        {/* Inner clean ring */}
        <div style={{
          position: 'absolute', inset: 8, borderRadius: '50%',
          border: `1px solid ${vipColor}44`,
        }} />
        {/* Avatar photo area */}
        <div style={{
          position: 'absolute', inset: 11,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a0b2e, #050112)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: vipGlow,
        }}>
          {src && !isEmoji
            ? <img src={src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: (size - 10) * 0.48 }}>{src || '🌟'}</span>
          }
        </div>
        {/* SVG Premium Frame overlay */}
        {hasSVGFrame && (
          <div style={{ position: 'absolute', inset: 8 }}>
            <SVGAvatarFrame size={outer - 16} tier={vipTier} />
          </div>
        )}
        {/* Online indicator */}
        {isOnline && (
          <div style={{
            position: 'absolute', bottom: 11, right: 11, zIndex: 4,
            width: 13, height: 13, borderRadius: '50%',
            background: '#00e676', border: '2.5px solid #050112',
            boxShadow: '0 0 8px #00e676',
          }} />
        )}
        {/* VIP badge top-right */}
        <div style={{
          position: 'absolute', top: 4, right: 4, zIndex: 4,
          fontSize: 15, lineHeight: 1,
          filter: `drop-shadow(0 0 5px ${vipColor})`,
        }}>
          {VIP_LEVELS.find(v => v.name === vipTier)?.icon ?? '🥉'}
        </div>
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.page}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(108,92,231,0.3), rgba(162,155,254,0.1))',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }} />
          <Loader size={20} color="#6C5CE7" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'rgba(162,155,254,0.5)', fontSize: 13 }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={S.page}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
          <span style={{ fontSize: 48 }}>👤</span>
          <p style={{ color: 'rgba(162,155,254,0.5)', fontSize: 14 }}>Profile not found</p>
          <button onClick={handleBack} style={S.btnPrimary}>Go Back</button>
        </div>
      </div>
    );
  }

  // ─── Safe profile (guards undefined Firestore fields) ────────────
  const safeProfile = {
    ...profile,
    followers:          Array.isArray(profile.followers)         ? profile.followers         : [],
    following:          Array.isArray(profile.following)         ? profile.following         : [],
    totalGiftsReceived: profile.totalGiftsReceived               ?? 0,
    totalGiftsSent:     profile.totalGiftsSent                   ?? 0,
    coins:              profile.coins                            ?? 0,
    xp:                 profile.xp                              ?? 0,
    level:              profile.level                            ?? 1,
  };

  // ─── Main Render ──────────────────────────────────────────────────
  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <div style={S.header}>
        <button onClick={handleBack} style={S.iconBtn}>
          <ArrowLeft size={20} color="#A29BFE" />
        </button>
        <span style={S.headerTitle}>
          {isOwnProfile ? 'My Profile' : profile.displayName}
        </span>
        {isOwnProfile && (
          <button onClick={openEditMode} style={S.iconBtn}>
            <Edit2 size={18} color="#A29BFE" />
          </button>
        )}
        {!isOwnProfile && (
          <button onClick={() => setShowReportSheet(true)} style={S.iconBtn}>
            <Flag size={18} color="rgba(162,155,254,0.5)" />
          </button>
        )}
      </div>

      {/* ── Scrollable Content ── */}
      <div style={{ ...S.scroll, animation: 'profile-fade-in 0.4s ease-out' }}>

        {/* ── Avatar + Name Banner ── */}
        <div style={S.banner}>
          {/* decorative orb behind avatar */}
          <div style={{
            position: 'absolute', width: 200, height: 200, borderRadius: '50%',
            background: `radial-gradient(circle, ${vipColor}22 0%, transparent 70%)`,
            top: 0, left: '50%', transform: 'translateX(-50%)',
            animation: 'glow-pulse 3s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <AvatarDisplay size={92} />
            {isOwnProfile && editMode && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={S.cameraBtn}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar
                  ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Camera size={14} color="white" />
                }
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>

          {avatarError && <p style={{ color: '#ff7675', fontSize: 11, textAlign: 'center', marginTop: 6 }}>{avatarError}</p>}

          {editMode ? (
            <div style={{ width: '100%', marginTop: 12 }}>
              <input
                style={S.editInput}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Display name"
                maxLength={30}
              />
              <textarea
                style={{ ...S.editInput, resize: 'none', height: 60, fontSize: 13 }}
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                placeholder="Write your bio..."
                maxLength={150}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditMode(false)} style={{ ...S.btnOutline, flex: 1 }}>
                  <X size={14} /> Cancel
                </button>
                <button onClick={handleSaveProfile} disabled={saving} style={{ ...S.btnPrimary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <span style={S.displayName}>{profile.displayName}</span>
                {isVerified && (
                  <span style={S.verifiedBadge} title="Verified">✓</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                <span style={{ ...S.vipBadge, background: vipColor, color: vipTier === 'Gold' ? '#333' : '#fff' }}>
                  {vipTier} VIP
                </span>
                <span style={S.uidBadge}>
                  {profile.customUID}
                </span>
                {isOnline
                  ? <span style={S.onlineBadge}>🟢 Online</span>
                  : <span style={{ color: 'rgba(162,155,254,0.4)', fontSize: 11 }}>
                    Last seen {formatLastSeen((profile as any).lastSeen)}
                  </span>
                }
              </div>
              {profile.bio && (
                <p style={S.bio}>{profile.bio}</p>
              )}
            </>
          )}

          {/* ── XP Progress Bar ── */}
          {!editMode && (
            <div style={S.xpRow}>
              <span style={S.xpLabel}>Lv.{profile.level}</span>
              <div style={S.xpBar}>
                <div style={{ ...S.xpFill, width: `${xpInfo.pct}%`, background: vipColor }} />
              </div>
              <span style={S.xpLabel}>Lv.{profile.level + 1}</span>
            </div>
          )}
        </div>

        {/* ── Stats Row ── */}
        <div style={S.statsRow}>
          <StatBox value={safeProfile.followers.length} label="Followers" />
          <div style={S.statDivider} />
          <StatBox value={safeProfile.following.length} label="Following" />
          <div style={S.statDivider} />
          <StatBox value={safeProfile.totalGiftsReceived} label="Gifts" />
          <div style={S.statDivider} />
          <StatBox value={safeProfile.coins.toLocaleString()} label="Coins" />
        </div>

        {/* ── Action Buttons (for other user) ── */}
        {!isOwnProfile && (
          <div style={S.actionRow}>
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              style={{
                ...S.btnPrimary,
                flex: 1,
                background: followingState
                  ? 'rgba(108,92,231,0.15)'
                  : 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                border: followingState ? '1px solid #6C5CE7' : 'none',
                color: followingState ? '#A29BFE' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {followLoading
                ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Users size={14} />
              }
              {followingState ? 'Following' : 'Follow'}
            </button>
            <button style={{ ...S.btnOutline, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Gift size={14} /> Send Gift
            </button>
          </div>
        )}

        {/* ── Tab Bar ── */}
        <div style={S.tabBar}>
          {(['profile', 'wallet', 'agency', 'settings'] as Tab[])
            .filter(t => isOwnProfile || t !== 'settings')
            .map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ ...S.tabBtn, ...(tab === t ? S.tabBtnActive : {}) }}
              >
                {t === 'profile'  && '👤'}
                {t === 'wallet'   && '💰'}
                {t === 'agency'   && '🏢'}
                {t === 'settings' && '⚙️'}
                {' '}{t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))
          }
        </div>

        {/* ─────────── PROFILE TAB ─────────── */}
        {tab === 'profile' && (
          <div style={S.tabContent}>
            {/* CP / Partner Slot — Premium */}
            <div style={{
              ...S.card,
              background: 'linear-gradient(135deg, rgba(255,100,130,0.07), rgba(108,92,231,0.07))',
              border: '1px solid rgba(255,100,130,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ ...S.cardLabel, color: 'rgba(255,150,170,0.8)' }}>💑 Partner Link</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'rgba(255,100,130,0.7)',
                  background: 'rgba(255,100,130,0.1)', borderRadius: 20, padding: '3px 10px',
                  border: '1px solid rgba(255,100,130,0.2)',
                }}>CP MODE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '8px 0' }}>
                {/* Left avatar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    border: '2px solid rgba(255,100,130,0.5)',
                    boxShadow: '0 0 12px rgba(255,100,130,0.3)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,100,130,0.1)',
                    fontSize: 26,
                  }}>
                    {profile?.photoURL && profile.photoURL.startsWith('http')
                      ? <img src={profile.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (profile?.photoURL || '🌟')}
                  </div>
                  <span style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>
                    {isOwnProfile ? 'You' : profile.displayName?.split(' ')[0]}
                  </span>
                </div>
                {/* Heart connector */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <div style={{
                    fontSize: 28,
                    animation: 'cp-heart-beat 1.8s ease-in-out infinite',
                    display: 'inline-block',
                  }}>💗</div>
                  {/* Intimacy bar */}
                  <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: '15%', borderRadius: 2,
                      background: 'linear-gradient(90deg, #ff6482, #ff93a8)',
                      boxShadow: '0 0 6px rgba(255,100,130,0.7)',
                    }} />
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,150,170,0.6)', fontWeight: 600 }}>
                    INTIMACY · 15 pts
                  </span>
                </div>
                {/* Right slot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {cpPartner
                    ? <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        border: '2px solid rgba(255,100,130,0.5)',
                        background: 'rgba(255,100,130,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                      }}>👤</div>
                    : <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        border: '2px dashed rgba(255,100,130,0.3)',
                        background: 'rgba(255,100,130,0.05)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', gap: 2,
                      }}>
                        <span style={{ fontSize: 20, color: 'rgba(255,100,130,0.5)' }}>+</span>
                        <span style={{ fontSize: 8, color: 'rgba(255,150,170,0.4)' }}>Invite</span>
                      </div>
                  }
                  <span style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>Partner</span>
                </div>
              </div>
            </div>

            {/* Bio / About */}
            {profile.bio && (
              <div style={S.card}>
                <div style={S.cardLabel}>📝 About</div>
                <p style={{ color: 'rgba(162,155,254,0.8)', fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Medal Wall */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={S.cardLabel}>🏅 Medal Wall</span>
                <span style={{ fontSize: 10, color: 'rgba(162,155,254,0.4)' }}>
                  {MEDAL_DEFS.filter((_, i) => i < 3).length} / {MEDAL_DEFS.length} earned
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {MEDAL_DEFS.map((m, i) => {
                  const earned = i < 2;
                  return (
                    <div key={m.id} style={{
                      textAlign: 'center', padding: '10px 4px', borderRadius: 14,
                      background: earned
                        ? 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(108,92,231,0.1))'
                        : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${earned ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.05)'}`,
                      opacity: earned ? 1 : 0.38,
                      animation: earned ? `medal-pop 0.4s ease ${i * 0.08}s both` : undefined,
                      position: 'relative', overflow: 'hidden',
                    }}>
                      {earned && (
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: 14,
                          background: 'linear-gradient(135deg, rgba(255,215,0,0.06), transparent)',
                          pointerEvents: 'none',
                        }} />
                      )}
                      <div style={{ fontSize: 22 }}>{m.icon}</div>
                      <div style={{
                        fontSize: 8, color: earned ? 'rgba(255,215,0,0.8)' : 'rgba(162,155,254,0.5)',
                        marginTop: 4, lineHeight: 1.3, fontWeight: 600,
                      }}>{m.name}</div>
                      <div style={{ fontSize: 7, color: 'rgba(162,155,254,0.3)', marginTop: 2 }}>{m.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Level Progress Detail */}
            <div style={S.card}>
              <div style={S.cardLabel}>⚡ Level Progress</div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#A29BFE', fontSize: 13, fontWeight: 700 }}>Level {profile.level}</span>
                  <span style={{ color: 'rgba(162,155,254,0.5)', fontSize: 12 }}>
                    {xpInfo.current.toLocaleString()} / {xpInfo.needed.toLocaleString()} XP
                  </span>
                </div>
                <div style={{ background: 'rgba(108,92,231,0.15)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 20,
                    background: `linear-gradient(90deg, ${vipColor}, #A29BFE)`,
                    width: `${xpInfo.pct}%`, transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                  {[
                    { icon: '💎', label: 'Diamonds', value: safeProfile.totalGiftsReceived },
                    { icon: '📤', label: 'Gifts Sent', value: safeProfile.totalGiftsSent },
                    { icon: '✉️', label: 'Messages', value: Math.floor(safeProfile.xp / 5) },
                  ].map(stat => (
                    <div key={stat.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: 'rgba(108,92,231,0.08)', borderRadius: 10 }}>
                      <div style={{ fontSize: 18 }}>{stat.icon}</div>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{stat.value}</div>
                      <div style={{ color: 'rgba(162,155,254,0.5)', fontSize: 10 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────── WALLET TAB ─────────── */}
        {tab === 'wallet' && (
          <div style={S.tabContent}>

            {/* VIP Center Banner */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={S.cardLabel}>👑 VIP Center</span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: `linear-gradient(135deg, ${vipColor}, #A29BFE)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>Current: {vipTier}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {VIP_LEVELS.map(v => {
                  const isCurrent = v.name === vipTier;
                  return (
                    <div key={v.level} style={{
                      flexShrink: 0, width: 88, borderRadius: 16,
                      background: isCurrent ? v.bg : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isCurrent ? v.color : 'rgba(255,255,255,0.06)'}`,
                      padding: '12px 8px', textAlign: 'center',
                      boxShadow: isCurrent ? `0 0 16px ${v.color}55` : 'none',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ fontSize: 22 }}>{v.icon}</div>
                      <div style={{
                        fontSize: 11, fontWeight: 800, marginTop: 4,
                        color: isCurrent ? 'white' : v.color,
                      }}>{v.name}</div>
                      <div style={{
                        fontSize: 8, color: isCurrent ? 'rgba(255,255,255,0.7)' : 'rgba(162,155,254,0.4)',
                        marginTop: 4, lineHeight: 1.4,
                      }}>{v.benefit}</div>
                      {isCurrent && (
                        <div style={{
                          fontSize: 8, fontWeight: 700, color: 'white',
                          background: 'rgba(255,255,255,0.2)', borderRadius: 20,
                          padding: '2px 6px', marginTop: 6, display: 'inline-block',
                        }}>ACTIVE</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coin Balance */}
            <div style={{ ...S.card, textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,215,0,0.10), rgba(255,255,255,0.03))' }}>
              <div style={{ fontSize: 40 }}>💰</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffd700', marginTop: 4 }}>
                {safeProfile.coins.toLocaleString()}
              </div>
              <div style={{ color: 'rgba(162,155,254,0.5)', fontSize: 12, marginTop: 2 }}>Coin Balance</div>
              <button style={{ ...S.btnPrimary, marginTop: 14, width: '100%', background: 'linear-gradient(135deg, #ffd700, #ffb300)', color: '#333' }}>
                💎 Top Up Coins
              </button>
            </div>

            {/* Gift History */}
            <div style={S.card}>
              <div style={S.cardLabel}>🎁 Gifts Received ({safeProfile.totalGiftsReceived})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
                {GIFTS.slice(0, 8).map(g => (
                  <div key={g.id} style={{
                    textAlign: 'center', padding: '8px 4px', borderRadius: 10,
                    background: 'rgba(108,92,231,0.08)',
                  }}>
                    <div style={{ fontSize: 22 }}>{g.emoji}</div>
                    <div style={{ color: 'rgba(162,155,254,0.6)', fontSize: 9, marginTop: 2 }}>{g.name}</div>
                    <div style={{ color: '#ffd700', fontSize: 9 }}>{g.cost}💰</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Backpack */}
            <div style={S.card}>
              <div style={S.cardLabel}>🎒 My Backpack</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
                {BACKPACK_DEFAULTS.map(item => (
                  <div key={item.id} style={{
                    textAlign: 'center', padding: '10px 6px', borderRadius: 12,
                    background: item.equipped ? 'rgba(108,92,231,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${item.equipped ? 'rgba(108,92,231,0.5)' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    <div style={{ fontSize: 28 }}>{item.icon}</div>
                    <div style={{ fontSize: 10, color: 'rgba(162,155,254,0.8)', marginTop: 4 }}>{item.name}</div>
                    {item.equipped && (
                      <div style={{ fontSize: 9, color: '#6C5CE7', marginTop: 3, fontWeight: 700 }}>EQUIPPED</div>
                    )}
                  </div>
                ))}
                <div style={{
                  textAlign: 'center', padding: '10px 6px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px dashed rgba(108,92,231,0.2)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
                  onClick={() => setTab('wallet')}
                >
                  <span style={{ fontSize: 24, color: 'rgba(108,92,231,0.4)' }}>+</span>
                  <span style={{ fontSize: 10, color: 'rgba(162,155,254,0.3)', marginTop: 4 }}>Get More</span>
                </div>
              </div>
            </div>

            {/* Store */}
            <div style={S.card}>
              <div style={S.cardLabel}>🛍️ Galaxy Store</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
                {STORE_ITEMS.map(item => (
                  <div key={item.id} style={{
                    textAlign: 'center', padding: '10px 6px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(108,92,231,0.15)',
                    position: 'relative',
                  }}>
                    {item.locked && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 12,
                        background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Lock size={16} color="rgba(162,155,254,0.4)" />
                      </div>
                    )}
                    <div style={{ fontSize: 26 }}>{item.icon}</div>
                    <div style={{ fontSize: 10, color: 'rgba(162,155,254,0.8)', marginTop: 4 }}>{item.name}</div>
                    <div style={{ color: '#ffd700', fontSize: 10, marginTop: 2 }}>{item.price.toLocaleString()} 💰</div>
                    {!item.locked && (
                      <button style={{
                        background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                        border: 'none', color: 'white', fontSize: 9, padding: '4px 8px',
                        borderRadius: 8, marginTop: 5, cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        Buy
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─────────── AGENCY / EARNING DASHBOARD TAB ─────────── */}
        {tab === 'agency' && agencyStats && (
          <div style={S.tabContent}>

            {/* Agency Identity Card */}
            <div style={{
              ...S.card,
              background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,180,200,0.08))',
              border: '1px solid rgba(108,92,231,0.25)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 52 }}>{agencyStats.agencyBadge}</div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 17, marginTop: 8, letterSpacing: -0.3 }}>
                {agencyStats.agencyName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                <span style={{
                  padding: '4px 14px', background: 'rgba(108,92,231,0.2)',
                  border: '1px solid rgba(108,92,231,0.4)', borderRadius: 20,
                  color: '#A29BFE', fontSize: 12, fontWeight: 700,
                }}>{agencyStats.rank}</span>
                <span style={{
                  padding: '4px 14px', background: 'rgba(0,200,200,0.1)',
                  border: '1px solid rgba(0,200,200,0.25)', borderRadius: 20,
                  color: '#00cec9', fontSize: 12, fontWeight: 700,
                }}>Host ⭐ 4.8</span>
              </div>
            </div>

            {/* Monthly Earning Dashboard — Circular Progress */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <span style={S.cardLabel}>📊 Monthly Dashboard</span>
                <span style={{
                  fontSize: 9, color: 'rgba(0,200,200,0.7)', fontWeight: 700,
                  background: 'rgba(0,200,200,0.08)', border: '1px solid rgba(0,200,200,0.2)',
                  padding: '2px 8px', borderRadius: 20,
                }}>LIVE TRACKING</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
                <CircleProgress
                  value={agencyStats.salary}
                  max={agencyStats.targetSalary}
                  color="#ffd700"
                  label="Monthly Beans"
                  sublabel="beans"
                  size={92}
                />
                <CircleProgress
                  value={Math.min(28, Math.floor(agencyStats.liveHours / 3))}
                  max={28}
                  color="#00e676"
                  label="Valid Days"
                  sublabel="days"
                  size={92}
                />
                <CircleProgress
                  value={agencyStats.liveHours}
                  max={agencyStats.targetHours}
                  color="#7df9ff"
                  label="Live Hours"
                  sublabel="hours"
                  size={92}
                />
              </div>
              {/* Progress summary row */}
              <div style={{
                marginTop: 18, padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)', marginBottom: 2 }}>Remaining to target</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#ffd700' }}>
                    {Math.max(0, agencyStats.targetSalary - agencyStats.salary).toLocaleString()} beans
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)', marginBottom: 2 }}>Live hours left</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#7df9ff' }}>
                    {Math.max(0, agencyStats.targetHours - agencyStats.liveHours)}h
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Grid */}
            <div style={S.card}>
              <div style={S.cardLabel}>⚡ Performance</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
                {[
                  { icon: '🎤', label: 'Rooms Hosted', value: Math.floor(agencyStats.liveHours / 2), color: '#A29BFE' },
                  { icon: '💰', label: 'Total Earned', value: agencyStats.salary.toLocaleString(), color: '#ffd700' },
                  { icon: '⭐', label: 'Host Rating', value: '4.8', color: '#00e676' },
                  { icon: '👥', label: 'Peak Listeners', value: Math.floor(safeProfile.followers.length * 1.3 + 12), color: '#7df9ff' },
                  { icon: '🔥', label: 'Streak Days', value: Math.min(30, Math.floor(agencyStats.liveHours / 4)), color: '#ff7675' },
                  { icon: '🏆', label: 'Agency Rank', value: `#${Math.max(1, 50 - agencyStats.liveHours)}`, color: '#da77ff' },
                ].map(s => (
                  <div key={s.label} style={{
                    textAlign: 'center', padding: '12px 6px', borderRadius: 14,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div style={{ color: s.color, fontWeight: 800, fontSize: 15, marginTop: 4 }}>{s.value}</div>
                    <div style={{ color: 'rgba(162,155,254,0.45)', fontSize: 9, marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Salary linear bar */}
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={S.cardLabel}>💵 Salary Progress</span>
                <span style={{ color: '#ffd700', fontWeight: 700, fontSize: 14 }}>
                  {agencyStats.salary.toLocaleString()} / {agencyStats.targetSalary.toLocaleString()}
                </span>
              </div>
              <div style={{ background: 'rgba(255,215,0,0.07)', borderRadius: 20, height: 10, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 20,
                  background: 'linear-gradient(90deg, #ffb300, #ffd700)',
                  width: `${Math.min(100, (agencyStats.salary / agencyStats.targetSalary) * 100)}%`,
                  transition: 'width 0.8s ease',
                  boxShadow: '0 0 10px rgba(255,215,0,0.5)',
                }} />
              </div>
              <p style={{ color: 'rgba(162,155,254,0.35)', fontSize: 11, marginTop: 10 }}>
                Complete {Math.max(0, agencyStats.targetHours - agencyStats.liveHours)}h more live to unlock full salary payout.
              </p>
            </div>
          </div>
        )}

        {/* ─────────── SETTINGS TAB ─────────── */}
        {tab === 'settings' && isOwnProfile && (
          <div style={S.tabContent}>
            {/* Privacy */}
            <div style={S.card}>
              <div style={S.cardLabel}>🔒 Privacy</div>
              <div style={S.settingRow} onClick={handlePrivacyToggle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {privacyPublic ? <Unlock size={16} color="#A29BFE" /> : <Lock size={16} color="#A29BFE" />}
                  <div>
                    <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>
                      {privacyPublic ? 'Public Profile' : 'Private Profile'}
                    </div>
                    <div style={{ color: 'rgba(162,155,254,0.4)', fontSize: 11, marginTop: 2 }}>
                      {privacyPublic ? 'Anyone can view your profile' : 'Only followers can see your profile'}
                    </div>
                  </div>
                </div>
                <div style={{
                  width: 42, height: 24, borderRadius: 12,
                  background: privacyPublic ? '#6C5CE7' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 0.2s',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: 3,
                    left: privacyPublic ? 20 : 3,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                  }} />
                </div>
              </div>
            </div>

            {/* Account */}
            <div style={S.card}>
              <div style={S.cardLabel}>⚙️ Account</div>
              <div style={S.settingRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Shield size={16} color="#A29BFE" />
                  <div style={{ color: 'white', fontSize: 13 }}>Email</div>
                </div>
                <span style={{ color: 'rgba(162,155,254,0.5)', fontSize: 12 }}>{profile.email || 'Not set'}</span>
              </div>
              <div style={S.settingRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Star size={16} color="#ffd700" />
                  <div style={{ color: 'white', fontSize: 13 }}>VIP Status</div>
                </div>
                <span style={{ color: vipColor, fontSize: 12, fontWeight: 700 }}>{vipTier}</span>
              </div>
            </div>

            {/* Danger Zone */}
            <div style={{ ...S.card, border: '1px solid rgba(231,76,60,0.2)' }}>
              <div style={{ color: '#ff7675', fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: 0.5 }}>
                ⚠️ DANGER ZONE
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ ...S.dangerBtn, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Trash2 size={14} /> Delete Account
              </button>
              <p style={{ color: 'rgba(255,118,117,0.5)', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                This will permanently delete your account and all data (GDPR/CCPA compliant).
              </p>
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div style={{ height: 32 }} />
      </div>

      {/* ── Block Confirmation Modal ── */}
      {showBlockConfirm && (
        <Modal onClose={() => setShowBlockConfirm(false)}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Block {profile.displayName}?</div>
          <p style={{ color: 'rgba(162,155,254,0.6)', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
            They won't be able to see your profile or send you messages.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowBlockConfirm(false)} style={{ ...S.btnOutline, flex: 1 }}>Cancel</button>
            <button onClick={handleBlock} style={{ ...S.dangerBtn, flex: 1 }}>Block</button>
          </div>
        </Modal>
      )}

      {/* ── Delete Account Modal ── */}
      {showDeleteConfirm && (
        <Modal onClose={() => setShowDeleteConfirm(false)}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💀</div>
          <div style={{ color: '#ff7675', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Account?</div>
          <p style={{ color: 'rgba(162,155,254,0.6)', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
            All your data will be permanently deleted. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowDeleteConfirm(false)} style={{ ...S.btnOutline, flex: 1 }}>Cancel</button>
            <button onClick={handleDeleteAccount} style={{ ...S.dangerBtn, flex: 1 }}>Delete Forever</button>
          </div>
        </Modal>
      )}

      {/* ── Report Sheet ── */}
      {showReportSheet && (
        <div style={S.overlay} onClick={() => setShowReportSheet(false)}>
          <div style={S.bottomSheet} onClick={e => e.stopPropagation()}>
            <div style={S.sheetHandle} />
            {reportSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40 }}>✅</div>
                <p style={{ color: '#A29BFE', marginTop: 10 }}>Report submitted. Thank you.</p>
              </div>
            ) : (
              <>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                  🚩 Report {profile.displayName}
                </div>
                {['Spam or fake account', 'Harassment', 'Inappropriate content', 'Scamming', 'Other'].map(reason => (
                  <button key={reason} onClick={() => setReportReason(reason)} style={{
                    width: '100%', textAlign: 'left', padding: '12px 14px',
                    background: reportReason === reason ? 'rgba(108,92,231,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${reportReason === reason ? 'rgba(108,92,231,0.5)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 12, color: 'rgba(162,155,254,0.85)', fontSize: 13,
                    marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {reportReason === reason ? '● ' : '○ '}{reason}
                  </button>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button onClick={() => setShowReportSheet(false)} style={{ ...S.btnOutline, flex: 1 }}>Cancel</button>
                  <button
                    onClick={handleReport}
                    disabled={!reportReason}
                    style={{ ...S.dangerBtn, flex: 1, opacity: reportReason ? 1 : 0.4 }}
                  >
                    Submit Report
                  </button>
                </div>
                {!isOwnProfile && (
                  <button
                    onClick={() => { setShowReportSheet(false); setShowBlockConfirm(true); }}
                    style={{ ...S.settingRow, marginTop: 12, justifyContent: 'center', cursor: 'pointer', background: 'transparent', border: 'none', width: '100%' }}
                  >
                    <UserX size={14} color="#ff7675" />
                    <span style={{ color: '#ff7675', fontSize: 13, marginLeft: 6 }}>Block this user instead</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

const STAT_ICONS: Record<string, string> = {
  Followers: '👥', Following: '➕', Gifts: '🎁', Coins: '💰',
};

function StatBox({ value, label }: { value: string | number; label: string }) {
  const displayVal = (value === null || value === undefined || Number.isNaN(Number(value))) ? 0 : value;
  return (
    <div style={{ textAlign: 'center', flex: 1, padding: '4px 0' }}>
      <div style={{ fontSize: 13, marginBottom: 2, lineHeight: 1 }}>{STAT_ICONS[label] ?? '⚡'}</div>
      <div style={{
        color: 'white', fontWeight: 800, fontSize: 17, lineHeight: 1,
        textShadow: '0 0 10px rgba(162,155,254,0.5)',
      }}>{displayVal}</div>
      <div style={{ color: 'rgba(162,155,254,0.5)', fontSize: 9, marginTop: 3, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatLastSeen(ts?: number): string {
  if (!ts) return 'a while ago';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Styles ──────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: {
    width: '100%', maxWidth: 400, height: '100dvh', margin: '0 auto',
    background: 'linear-gradient(180deg, #050112 0%, #0e0520 40%, #1a0b2e 100%)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: 'white', position: 'relative',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '52px 20px 16px', flexShrink: 0,
  },
  headerTitle: {
    fontSize: 16, fontWeight: 700, color: 'white',
    flex: 1, textAlign: 'center',
  },
  iconBtn: {
    background: 'rgba(108,92,231,0.14)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(162,155,254,0.2)',
    borderRadius: 13, width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
    transition: 'transform 0.15s ease, background 0.15s ease',
    boxShadow: '0 2px 8px rgba(108,92,231,0.2)',
  },
  scroll: {
    flex: 1, overflowY: 'auto', paddingBottom: 24,
  },
  banner: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '24px 24px 20px', position: 'relative', overflow: 'visible',
  },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: '50%',
    background: '#6C5CE7', border: '2px solid #1A0F2E',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  displayName: {
    fontSize: 22, fontWeight: 800, color: 'white',
    textShadow: '0 0 20px rgba(162,155,254,0.4)',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    background: 'linear-gradient(135deg, #1da1f2, #0077cc)',
    color: 'white', fontSize: 10, fontWeight: 800,
    width: 20, height: 20, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 0 8px rgba(29,161,242,0.6)',
  },
  vipBadge: {
    fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 20,
    letterSpacing: 0.5, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  uidBadge: {
    background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.25)',
    borderRadius: 20, padding: '3px 10px', fontSize: 10, color: 'rgba(162,155,254,0.7)',
  },
  onlineBadge: {
    fontSize: 11, color: '#00e676',
  },
  bio: {
    color: 'rgba(162,155,254,0.7)', fontSize: 13, textAlign: 'center',
    marginTop: 8, lineHeight: 1.5, maxWidth: 280,
  },
  xpRow: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 14,
  },
  xpBar: {
    flex: 1, height: 7, borderRadius: 20,
    background: 'rgba(108,92,231,0.15)',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
  },
  xpFill: {
    height: '100%', borderRadius: 20, transition: 'width 0.6s ease',
    boxShadow: '0 0 8px currentColor',
  },
  xpLabel: {
    fontSize: 10, color: 'rgba(162,155,254,0.5)', fontWeight: 600, flexShrink: 0,
  },
  statsRow: {
    display: 'flex', alignItems: 'center',
    background: 'rgba(108,92,231,0.10)',
    backdropFilter: 'blur(16px)',
    borderRadius: 20,
    margin: '0 16px 16px', padding: '16px 12px',
    border: '1px solid rgba(162,155,254,0.18)',
    boxShadow: '0 4px 24px rgba(108,92,231,0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  statDivider: {
    width: 1, height: 32,
    background: 'linear-gradient(180deg, transparent, rgba(162,155,254,0.25), transparent)',
    flexShrink: 0,
  },
  actionRow: {
    display: 'flex', gap: 10, padding: '0 16px', marginBottom: 16,
  },
  tabBar: {
    display: 'flex', gap: 4, flexShrink: 0,
    background: 'rgba(108,92,231,0.07)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(162,155,254,0.1)',
    borderRadius: 16,
    margin: '0 16px 16px',
    padding: '4px',
  },
  tabBtn: {
    flex: 1, padding: '9px 4px', borderRadius: 13,
    background: 'transparent', border: '1px solid transparent',
    color: 'rgba(162,155,254,0.45)', fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: 'linear-gradient(135deg, rgba(108,92,231,0.35), rgba(162,155,254,0.15))',
    border: '1px solid rgba(162,155,254,0.3)',
    color: '#fff',
    boxShadow: '0 2px 12px rgba(108,92,231,0.3)',
  },
  tabContent: {
    padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14,
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(16px)',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.07)',
    padding: 18,
    boxShadow: '0 4px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
  },
  cardLabel: {
    color: 'rgba(162,155,254,0.6)', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  cpSlot: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  },
  cpEmpty: {
    width: 52, height: 52, borderRadius: '50%',
    border: '2px dashed rgba(108,92,231,0.3)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    color: 'rgba(162,155,254,0.4)', cursor: 'pointer',
    background: 'rgba(108,92,231,0.06)',
  },
  cpName: {
    color: 'rgba(162,155,254,0.6)', fontSize: 10,
  },
  settingRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 0', borderBottom: '1px solid rgba(108,92,231,0.08)',
    cursor: 'pointer',
  },
  editInput: {
    width: '100%', background: 'rgba(108,92,231,0.1)',
    border: '1px solid rgba(108,92,231,0.3)', borderRadius: 12,
    color: 'white', fontSize: 14, padding: '10px 14px',
    outline: 'none', fontFamily: 'inherit', marginBottom: 10,
    boxSizing: 'border-box',
  },
  btnPrimary: {
    padding: '13px 20px', borderRadius: 16,
    background: 'linear-gradient(135deg, #6C5CE7 0%, #8B5CF6 50%, #A29BFE 100%)',
    border: 'none', color: 'white', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 20px rgba(108,92,231,0.45), 0 1px 0 rgba(255,255,255,0.1) inset',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnOutline: {
    padding: '13px 20px', borderRadius: 16,
    background: 'rgba(108,92,231,0.1)',
    border: '1px solid rgba(162,155,254,0.3)',
    backdropFilter: 'blur(8px)',
    color: '#A29BFE', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'transform 0.15s ease, background 0.15s ease',
  },
  dangerBtn: {
    padding: '13px 20px', borderRadius: 16,
    background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)',
    backdropFilter: 'blur(8px)',
    color: '#ff7675', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'transform 0.15s ease',
  },
  overlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.8)', zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  },
  modal: {
    background: 'linear-gradient(160deg, rgba(30,16,64,0.95) 0%, rgba(21,11,42,0.98) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(162,155,254,0.2)',
    borderRadius: 26,
    padding: 28, width: '85%', maxWidth: 320,
    boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
  },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'linear-gradient(160deg, rgba(30,16,64,0.97) 0%, rgba(21,11,42,0.99) 100%)',
    backdropFilter: 'blur(20px)',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: '16px 20px 40px',
    border: '1px solid rgba(162,155,254,0.15)',
    boxShadow: '0 -8px 40px rgba(108,92,231,0.2)',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    background: 'rgba(162,155,254,0.2)', margin: '0 auto 20px',
  },
};
