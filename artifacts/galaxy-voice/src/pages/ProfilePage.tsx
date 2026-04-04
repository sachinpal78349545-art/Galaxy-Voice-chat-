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
    const ringSize = size + 18;
    return (
      <div style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0 }}>
        {/* Outer pulsing ring */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `2px solid ${vipColor}`,
          animation: 'avatar-ring-pulse 2.4s ease-in-out infinite',
          boxShadow: `0 0 18px ${vipColor}88, 0 0 36px ${vipColor}44`,
        }} />
        {/* Mid ring */}
        <div style={{
          position: 'absolute', inset: 6, borderRadius: '50%',
          border: `1.5px solid ${vipColor}55`,
        }} />
        {/* Avatar */}
        <div style={{
          position: 'absolute', inset: 9,
          borderRadius: '50%',
          border: `3px solid ${vipColor}`,
          boxShadow: vipGlow,
          background: 'linear-gradient(135deg, rgba(108,92,231,0.3), rgba(26,15,46,0.8))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {src && !isEmoji
            ? <img src={src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: (size - 18) * 0.5 }}>{src || '🌟'}</span>
          }
        </div>
        {/* Online dot */}
        {isOnline && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            width: 13, height: 13, borderRadius: '50%',
            background: '#00e676',
            border: '2.5px solid #0F0F1A',
            boxShadow: '0 0 6px #00e676',
            zIndex: 2,
          }} />
        )}
        {/* VIP crown badge */}
        {vipTier !== 'Bronze' && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            fontSize: 14, lineHeight: 1, zIndex: 2,
            filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.8))',
          }}>
            {vipTier === 'Galactic' ? '🔮' : vipTier === 'Platinum' ? '💎' : vipTier === 'Gold' ? '👑' : '⭐'}
          </div>
        )}
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
            {/* CP / Partner Slot */}
            <div style={S.card}>
              <div style={S.cardLabel}>💑 Couple Partner</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '12px 0' }}>
                <div style={S.cpSlot}>
                  <AvatarDisplay size={52} />
                  <span style={S.cpName}>{isOwnProfile ? 'You' : profile.displayName}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, animation: 'pulse 1.5s ease-in-out infinite' }}>❤️</div>
                  <span style={{ fontSize: 10, color: 'rgba(162,155,254,0.4)' }}>Intimacy 0</span>
                </div>
                <div style={S.cpSlot}>
                  {cpPartner
                    ? <span style={{ fontSize: 26 }}>👤</span>
                    : <div style={S.cpEmpty}>
                        <span style={{ fontSize: 20 }}>+</span>
                        <span style={{ fontSize: 10, color: 'rgba(162,155,254,0.4)', marginTop: 2 }}>Add Partner</span>
                      </div>
                  }
                  <span style={S.cpName}>Partner</span>
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

            {/* Achievements */}
            <div style={S.card}>
              <div style={S.cardLabel}>🏅 Achievements</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 10 }}>
                {achievements.map(a => (
                  <div key={a.id} style={{
                    textAlign: 'center', padding: '10px 4px', borderRadius: 12,
                    background: a.earned ? 'rgba(108,92,231,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${a.earned ? 'rgba(108,92,231,0.35)' : 'rgba(255,255,255,0.05)'}`,
                    opacity: a.earned ? 1 : 0.4,
                  }}>
                    <div style={{ fontSize: 22 }}>{a.icon}</div>
                    <div style={{ fontSize: 9, color: 'rgba(162,155,254,0.7)', marginTop: 4, lineHeight: 1.2 }}>{a.label}</div>
                  </div>
                ))}
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
            {/* Coin Balance */}
            <div style={{ ...S.card, textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(108,92,231,0.1))' }}>
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

        {/* ─────────── AGENCY TAB ─────────── */}
        {tab === 'agency' && agencyStats && (
          <div style={S.tabContent}>
            {/* Agency Badge */}
            <div style={{ ...S.card, textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>{agencyStats.agencyBadge}</div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 16, marginTop: 8 }}>{agencyStats.agencyName}</div>
              <div style={{
                display: 'inline-block', marginTop: 8, padding: '4px 14px',
                background: 'rgba(108,92,231,0.2)', borderRadius: 20,
                color: '#A29BFE', fontSize: 12, fontWeight: 600,
                border: '1px solid rgba(108,92,231,0.4)',
              }}>
                {agencyStats.rank}
              </div>
            </div>

            {/* Live Hours */}
            <div style={S.card}>
              <div style={S.cardLabel}>⏱️ Live Hours</div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#A29BFE', fontWeight: 700 }}>{agencyStats.liveHours}h</span>
                  <span style={{ color: 'rgba(162,155,254,0.5)', fontSize: 12 }}>Target: {agencyStats.targetHours}h</span>
                </div>
                <div style={{ background: 'rgba(108,92,231,0.15)', borderRadius: 20, height: 10, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 20,
                    background: 'linear-gradient(90deg, #6C5CE7, #00cec9)',
                    width: `${Math.min(100, (agencyStats.liveHours / agencyStats.targetHours) * 100)}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <p style={{ color: 'rgba(162,155,254,0.4)', fontSize: 11, marginTop: 8 }}>
                  {agencyStats.targetHours - agencyStats.liveHours}h remaining to reach target
                </p>
              </div>
            </div>

            {/* Salary */}
            <div style={S.card}>
              <div style={S.cardLabel}>💵 Salary Progress</div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#ffd700', fontWeight: 700 }}>{agencyStats.salary.toLocaleString()} 💰</span>
                  <span style={{ color: 'rgba(162,155,254,0.5)', fontSize: 12 }}>
                    Target: {agencyStats.targetSalary.toLocaleString()} 💰
                  </span>
                </div>
                <div style={{ background: 'rgba(255,215,0,0.1)', borderRadius: 20, height: 10, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 20,
                    background: 'linear-gradient(90deg, #ffd700, #ffb300)',
                    width: `${Math.min(100, (agencyStats.salary / agencyStats.targetSalary) * 100)}%`,
                  }} />
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div style={S.card}>
              <div style={S.cardLabel}>📊 Performance</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                {[
                  { icon: '🎤', label: 'Rooms Hosted', value: Math.floor(agencyStats.liveHours / 2) },
                  { icon: '💰', label: 'Total Earned', value: agencyStats.salary.toLocaleString() },
                  { icon: '⭐', label: 'Rating', value: '4.8' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', background: 'rgba(108,92,231,0.08)', borderRadius: 10 }}>
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{s.value}</div>
                    <div style={{ color: 'rgba(162,155,254,0.5)', fontSize: 10 }}>{s.label}</div>
                  </div>
                ))}
              </div>
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
    background: 'linear-gradient(180deg, #1A0F2E 0%, #0F0F1A 100%)',
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
    background: 'rgba(108,92,231,0.08)',
    backdropFilter: 'blur(12px)',
    borderRadius: 20,
    border: '1px solid rgba(162,155,254,0.12)',
    padding: 18,
    boxShadow: '0 2px 20px rgba(108,92,231,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
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
