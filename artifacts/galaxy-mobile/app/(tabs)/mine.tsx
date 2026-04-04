import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { AvatarFrame } from "@/components/AvatarFrame";
import { LevelBar } from "@/components/LevelBar";
import { MedalWall } from "@/components/MedalWall";
import { StatsRow } from "@/components/StatsRow";
import { AgencyCard } from "@/components/AgencyCard";
import { GlassCard } from "@/components/GlassCard";
import { MOCK_PROFILE, VIP_LEVELS } from "@/lib/profileData";

const isWeb = Platform.OS === "web";

export default function MineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [profile] = useState(MOCK_PROFILE);
  const [activeTab, setActiveTab] = useState<"profile" | "vip" | "agency">("profile");

  const copyId = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "User ID",
      `ID: ${profile.userId}\n\nLong-press to copy.`,
      [{ text: "OK" }]
    );
  };

  const rarityColor: Record<string, string> = {
    common: "#A29BFE",
    rare: "#00CEC9",
    epic: "#6C5CE7",
    legendary: "#FFD700",
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Cosmic bg decorations */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.nebulaTop} />
        <View style={styles.nebulaRight} />
        {[
          { top: 60, left: 18, s: 2.5 },
          { top: 100, left: "72%", s: 1.5 },
          { top: 180, left: 52, s: 1 },
          { top: 260, right: 28, s: 2 },
          { top: 380, left: "45%", s: 1.5 },
          { top: 480, right: 50, s: 1 },
          { top: 590, left: 70, s: 2 },
          { top: 680, left: "62%", s: 1.5 },
          { top: 800, right: 90, s: 1 },
        ].map((star, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              top: star.top,
              left: (star as any).left,
              right: (star as any).right,
              width: star.s,
              height: star.s,
              borderRadius: star.s / 2,
              backgroundColor: "rgba(255,255,255,0.65)",
            }}
          />
        ))}
      </View>

      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: isWeb ? 72 : insets.top + 8 },
        ]}
      >
        {/* Diamond coin balance */}
        <TouchableOpacity style={styles.coinBadge}>
          <Ionicons name="diamond" size={13} color="#7df9ff" />
          <Text style={styles.coinText}>{profile.coins}</Text>
          <Ionicons name="add" size={13} color="rgba(162,155,254,0.6)" />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="pencil" size={13} color="rgba(162,155,254,0.8)" />
            <Text style={styles.actionBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { paddingHorizontal: 10 }]}>
            <Ionicons name="settings-outline" size={15} color="rgba(162,155,254,0.8)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Inner tab strip ── */}
      <View style={styles.innerTabStrip}>
        {(["profile", "vip", "agency"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab(t);
            }}
            style={[styles.innerTab, activeTab === t && styles.innerTabActive]}
          >
            <Text
              style={[
                styles.innerTabText,
                activeTab === t && styles.innerTabTextActive,
              ]}
            >
              {t === "profile" ? "Profile" : t === "vip" ? "VIP Center" : "Agency"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: (isWeb ? 34 : insets.bottom) + 82 },
        ]}
      >
        {/* ════════════════ PROFILE TAB ════════════════ */}
        {activeTab === "profile" && (
          <>
            {/* Avatar hero section */}
            <View style={styles.heroSection}>
              <AvatarFrame
                photoURL={profile.photoURL}
                frameTitle={profile.frameTitle}
                isLive={profile.isLive}
                size={120}
              />

              {/* Name + identity */}
              <View style={styles.nameBlock}>
                <Text style={styles.displayName}>{profile.displayName}</Text>

                <TouchableOpacity onPress={copyId} style={styles.idRow}>
                  <Ionicons name="shield-checkmark" size={13} color="#A29BFE" />
                  <Text style={styles.idText}>ID: {profile.userId}</Text>
                  <Ionicons name="copy-outline" size={12} color="rgba(162,155,254,0.4)" />
                </TouchableOpacity>

                <Text style={styles.countryText}>
                  {profile.countryFlag} {profile.country}{"  "}|{"  "}{profile.gender}, {profile.age}
                </Text>
              </View>
            </View>

            {/* Level XP Bar */}
            <GlassCard>
              <LevelBar
                level={profile.level}
                xp={profile.xp}
                xpTarget={profile.xpTarget}
                vipBadge={profile.vipBadge}
                rankBadge={profile.rankBadge}
              />
            </GlassCard>

            {/* Bio */}
            {profile.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}

            {/* Medal Wall */}
            <GlassCard style={{ alignItems: "center" }}>
              <Text style={styles.sectionLabel}>Medal Wall</Text>
              <MedalWall medals={profile.medals} />
            </GlassCard>

            {/* Stats Row */}
            <StatsRow
              following={profile.following}
              followers={profile.followers}
              visitors={profile.visitors}
            />

            {/* Agency banner */}
            <AgencyCard
              agencyName={profile.agencyName}
              monthlyBeans={profile.agencyMonthlyBeans}
              targetBeans={profile.agencyTargetBeans}
              validDays={profile.agencyValidDays}
              targetDays={profile.agencyTargetDays}
              liveHours={profile.agencyLiveHours}
              targetHours={profile.agencyTargetHours}
              onPress={() => setActiveTab("agency")}
            />

            {/* CP Partner slot */}
            <GlassCard
              style={{
                backgroundColor: "rgba(255,100,130,0.04)",
                borderColor: "rgba(255,100,130,0.14)",
              }}
            >
              <View style={styles.cpHeader}>
                <Text style={styles.cpLabel}>Partner Link</Text>
                <View style={styles.cpModePill}>
                  <Text style={styles.cpModeText}>CP MODE</Text>
                </View>
              </View>
              <View style={styles.cpRow}>
                {/* Left — you */}
                <View style={styles.cpSlot}>
                  <View style={[styles.cpAvatar, { borderColor: "rgba(255,100,130,0.5)" }]}>
                    <Ionicons name="person" size={26} color="rgba(255,150,170,0.45)" />
                  </View>
                  <Text style={styles.cpName}>You</Text>
                </View>
                {/* Heart */}
                <View style={styles.cpHeart}>
                  <Ionicons name="heart" size={34} color="#ff6482" />
                  <Text style={styles.cpIntimacy}>Intimacy · 0</Text>
                </View>
                {/* Right — invite */}
                <View style={styles.cpSlot}>
                  <TouchableOpacity
                    style={[styles.cpAvatar, { borderColor: "rgba(255,100,130,0.28)", borderStyle: "dashed" }]}
                    onPress={() => Haptics.selectionAsync()}
                  >
                    <Ionicons name="add" size={24} color="rgba(255,100,130,0.4)" />
                  </TouchableOpacity>
                  <Text style={[styles.cpName, { color: "rgba(162,155,254,0.45)" }]}>
                    Partner
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Backpack + Store row */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <GlassCard style={styles.miniCard}>
                <View style={[styles.miniIcon, { backgroundColor: "rgba(108,92,231,0.14)", borderColor: "rgba(108,92,231,0.3)" }]}>
                  <Ionicons name="bag" size={22} color="#A29BFE" />
                </View>
                <Text style={[styles.miniTitle, { color: "#A29BFE" }]}>Backpack</Text>
                <Text style={styles.miniSub}>{profile.backpack.length} items</Text>
              </GlassCard>
              <GlassCard style={styles.miniCard}>
                <View style={[styles.miniIcon, { backgroundColor: "rgba(0,206,201,0.12)", borderColor: "rgba(0,206,201,0.3)" }]}>
                  <Ionicons name="storefront" size={22} color="#00CEC9" />
                </View>
                <Text style={[styles.miniTitle, { color: "#00CEC9" }]}>Galaxy Store</Text>
                <Text style={styles.miniSub}>Premium items</Text>
              </GlassCard>
            </View>

            {/* Security section */}
            <GlassCard>
              <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Privacy & Security</Text>
              {[
                { icon: "camera-off-outline" as const, label: "Screenshot Protection", sub: "Screen locked in sensitive areas", color: "#6C5CE7" },
                { icon: "phone-portrait-outline" as const, label: "Device Binding", sub: "Account secured to this device", color: "#00CEC9" },
                { icon: "trash-outline" as const, label: "Delete Account", sub: "Permanently remove all data", color: "#ef4444" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (item.label === "Delete Account") {
                      Alert.alert(
                        "Delete Account",
                        "This will permanently delete all your data from our servers.\n\nStep 1: Firestore data will be erased.\nStep 2: Firebase Auth account will be removed.\n\nThis cannot be undone.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => {} },
                        ]
                      );
                    }
                  }}
                  style={styles.secItem}
                >
                  <View style={[styles.secIcon, { backgroundColor: `${item.color}18`, borderColor: `${item.color}33` }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.secLabel, item.label === "Delete Account" && { color: "#ef4444" }]}>
                      {item.label}
                    </Text>
                    <Text style={styles.secSub}>{item.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(162,155,254,0.3)" />
                </TouchableOpacity>
              ))}
            </GlassCard>
          </>
        )}

        {/* ════════════════ VIP TAB ════════════════ */}
        {activeTab === "vip" && (
          <>
            <GlassCard
              style={{
                alignItems: "center",
                backgroundColor: "rgba(255,215,0,0.04)",
                borderColor: "rgba(255,215,0,0.15)",
              }}
            >
              <Ionicons name="crown" size={42} color="#FFD700" />
              <Text style={[styles.sectionLabel, { fontSize: 18, marginTop: 8 }]}>VIP Center</Text>
              <Text style={{ color: "rgba(255,215,0,0.55)", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                Reach higher VIP tiers to unlock exclusive benefits
              </Text>
            </GlassCard>

            {VIP_LEVELS.map((vip, i) => {
              const isCurrent = profile.level >= i * 3 && profile.level < (i + 1) * 3;
              return (
                <GlassCard
                  key={vip.level}
                  style={{
                    borderColor: isCurrent ? `${vip.color}55` : "rgba(255,255,255,0.07)",
                    backgroundColor: isCurrent ? `${vip.bg}88` : "rgba(255,255,255,0.03)",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        backgroundColor: `${vip.bg}dd`,
                        borderWidth: 1.5,
                        borderColor: `${vip.color}66`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>
                        {["🥉","🥈","🥇","💎","🔷","🌌","✨"][i]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: vip.color, fontWeight: "800" as const, fontSize: 15 }}>
                          VIP {vip.level} — {vip.name}
                        </Text>
                        {isCurrent && (
                          <View style={{ backgroundColor: `${vip.color}22`, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 7, borderWidth: 1, borderColor: `${vip.color}44` }}>
                            <Text style={{ color: vip.color, fontSize: 8, fontWeight: "700" as const }}>ACTIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: "rgba(162,155,254,0.55)", fontSize: 12, marginTop: 3 }}>
                        {vip.benefit}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={`${vip.color}66`} />
                  </View>
                </GlassCard>
              );
            })}
          </>
        )}

        {/* ════════════════ AGENCY TAB ════════════════ */}
        {activeTab === "agency" && (
          <>
            <GlassCard>
              {/* Dashboard imported inline for now */}
              {/* Identity card */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <Text style={{ fontSize: 40 }}>🏢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontWeight: "800" as const, fontSize: 16 }}>
                    {profile.agencyName}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                    <View style={{ backgroundColor: "rgba(108,92,231,0.15)", borderRadius: 12, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1, borderColor: "rgba(108,92,231,0.3)" }}>
                      <Text style={{ color: "#A29BFE", fontSize: 10, fontWeight: "700" as const }}>Gold Agency</Text>
                    </View>
                    <View style={{ backgroundColor: "rgba(0,200,200,0.1)", borderRadius: 12, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1, borderColor: "rgba(0,200,200,0.25)" }}>
                      <Text style={{ color: "#00CEC9", fontSize: 10, fontWeight: "700" as const }}>⭐ Host 4.8</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Circle progress rings */}
              <Text style={[styles.sectionLabel, { marginBottom: 16 }]}>Monthly Dashboard</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                {[
                  { v: profile.agencyMonthlyBeans, max: profile.agencyTargetBeans, color: "#FFD700", label: "Monthly Beans", sub: "beans" },
                  { v: profile.agencyValidDays, max: profile.agencyTargetDays, color: "#00e676", label: "Valid Days", sub: "days" },
                  { v: profile.agencyLiveHours, max: profile.agencyTargetHours, color: "#7df9ff", label: "Live Hours", sub: "hours" },
                ].map((c) => (
                  <View key={c.label} style={{ alignItems: "center", gap: 8 }}>
                    <View style={{ width: 84, height: 84, alignItems: "center", justifyContent: "center" }}>
                      <View style={{ position: "absolute", width: 72, height: 72, borderRadius: 36, borderWidth: 7, borderColor: "rgba(255,255,255,0.06)" }} />
                      <View
                        style={{
                          position: "absolute",
                          width: 72,
                          height: 72,
                          borderRadius: 36,
                          borderWidth: 7,
                          borderColor: c.color,
                          borderTopColor: c.v / c.max < 0.25 ? "transparent" : c.color,
                          borderRightColor: c.v / c.max < 0.5 ? "transparent" : c.color,
                          borderBottomColor: c.v / c.max < 0.75 ? "transparent" : c.color,
                          transform: [{ rotate: "-90deg" }],
                          shadowColor: c.color,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.7,
                          shadowRadius: 6,
                        }}
                      />
                      <View style={{ position: "absolute", alignItems: "center" }}>
                        <Text style={{ color: "#fff", fontWeight: "800" as const, fontSize: 16 }}>{c.v}</Text>
                        <Text style={{ color: "rgba(162,155,254,0.45)", fontSize: 8 }}>{c.sub}</Text>
                      </View>
                    </View>
                    <Text style={{ color: "rgba(162,155,254,0.7)", fontSize: 10, textAlign: "center" as const, fontWeight: "600" as const }}>
                      {c.label}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* Performance grid */}
            <GlassCard>
              <Text style={[styles.sectionLabel, { marginBottom: 14 }]}>Performance</Text>
              <View style={styles.perfGrid}>
                {[
                  { icon: "mic" as const, label: "Rooms Hosted", value: Math.floor(profile.agencyLiveHours / 2), color: "#A29BFE" },
                  { icon: "cash" as const, label: "Total Earned", value: `${profile.agencyMonthlyBeans.toLocaleString()}`, color: "#FFD700" },
                  { icon: "star" as const, label: "Host Rating", value: "4.8", color: "#00e676" },
                  { icon: "people" as const, label: "Peak Listeners", value: profile.followers + 12, color: "#7df9ff" },
                  { icon: "flame" as const, label: "Streak Days", value: profile.agencyValidDays, color: "#ff7675" },
                  { icon: "trophy" as const, label: "Agency Rank", value: `#${Math.max(1, 50 - profile.agencyLiveHours)}`, color: "#da77ff" },
                ].map((s) => (
                  <View key={s.label} style={styles.perfCell}>
                    <Ionicons name={s.icon} size={20} color={s.color} />
                    <Text style={[styles.perfValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={styles.perfLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* Salary linear bar */}
            <GlassCard>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={styles.sectionLabel}>Salary Progress</Text>
                <Text style={{ color: "#FFD700", fontWeight: "700" as const, fontSize: 13 }}>
                  {profile.agencyMonthlyBeans.toLocaleString()} / {profile.agencyTargetBeans.toLocaleString()}
                </Text>
              </View>
              <View style={{ height: 10, backgroundColor: "rgba(255,215,0,0.07)", borderRadius: 5, overflow: "hidden" }}>
                <View
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (profile.agencyMonthlyBeans / profile.agencyTargetBeans) * 100)}%` as any,
                    backgroundColor: "#FFD700",
                    borderRadius: 5,
                    shadowColor: "#FFD700",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 6,
                  }}
                />
              </View>
              <Text style={{ color: "rgba(162,155,254,0.35)", fontSize: 11, marginTop: 10 }}>
                Complete {Math.max(0, profile.agencyTargetHours - profile.agencyLiveHours)}h more to unlock full payout.
              </Text>
            </GlassCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  nebulaTop: {
    position: "absolute",
    top: -80,
    left: "15%",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(108,92,231,0.11)",
  },
  nebulaRight: {
    position: "absolute",
    top: 50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(0,206,201,0.055)",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(108,92,231,0.14)",
    borderRadius: 22,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.3)",
  },
  coinText: { color: "#ffffff", fontWeight: "700" as const, fontSize: 13 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 22,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  actionBtnText: { color: "rgba(162,155,254,0.85)", fontSize: 12, fontWeight: "600" as const },
  innerTabStrip: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 22,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  innerTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 18,
  },
  innerTabActive: { backgroundColor: "rgba(108,92,231,0.25)" },
  innerTabText: { color: "rgba(162,155,254,0.5)", fontSize: 12, fontWeight: "600" as const },
  innerTabTextActive: { color: "#A29BFE", fontSize: 12, fontWeight: "700" as const },
  scroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  heroSection: { alignItems: "center", paddingTop: 6, gap: 16 },
  nameBlock: { alignItems: "center", gap: 7 },
  displayName: {
    color: "#ffffff",
    fontWeight: "800" as const,
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: "center" as const,
  },
  idRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  idText: { color: "#A29BFE", fontSize: 12, fontWeight: "500" as const },
  countryText: { color: "rgba(162,155,254,0.65)", fontSize: 13 },
  bio: {
    color: "rgba(162,155,254,0.65)",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center" as const,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    color: "rgba(162,155,254,0.5)",
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginBottom: 4,
    textAlign: "center" as const,
  },
  cpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cpLabel: {
    color: "rgba(255,150,170,0.8)",
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  cpModePill: {
    backgroundColor: "rgba(255,100,130,0.1)",
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255,100,130,0.2)",
  },
  cpModeText: { color: "rgba(255,100,130,0.8)", fontSize: 9, fontWeight: "700" as const },
  cpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  cpSlot: { alignItems: "center", gap: 6 },
  cpAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: "rgba(255,100,130,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cpName: { color: "#ffffff", fontSize: 11, fontWeight: "600" as const },
  cpHeart: { alignItems: "center", gap: 4 },
  cpIntimacy: { color: "rgba(255,150,170,0.5)", fontSize: 9 },
  miniCard: { flex: 1, alignItems: "center", gap: 8, paddingVertical: 20 },
  miniIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  miniTitle: { fontSize: 12, fontWeight: "700" as const },
  miniSub: { color: "rgba(162,155,254,0.4)", fontSize: 10 },
  secItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  secIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secLabel: { color: "#ffffff", fontSize: 13, fontWeight: "600" as const },
  secSub: { color: "rgba(162,155,254,0.45)", fontSize: 11, marginTop: 2 },
  perfGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  perfCell: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  perfValue: { fontWeight: "800" as const, fontSize: 14 },
  perfLabel: { color: "rgba(162,155,254,0.45)", fontSize: 9, textAlign: "center" as const },
});
