import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const isWeb = Platform.OS === "web";

const LIVE_ROOMS = [
  {
    id: "r1", name: "Chill Vibes Only", host: "SkyDancer",
    speakers: 6, totalSeats: 9, listeners: 12,
    tag: "Chill", tagColor: "#6C5CE7",
    speakerEmojis: ["🌟","🎵","🌙","🦉","🌌","💫"],
  },
  {
    id: "r2", name: "Late Night Thoughts", host: "MoonWalker",
    speakers: 4, totalSeats: 9, listeners: 5,
    tag: "Talk", tagColor: "#A29BFE",
    speakerEmojis: ["🌙","✨","🌌","🎤"],
  },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState("Hot");
  const filters = ["Hot", "New", "Follow"];

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Nebula bg orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.orbTop} />
        <View style={styles.orbBot} />
      </View>

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: isWeb ? 56 : insets.top + 10 }]}>
        {/* Left: coins + level */}
        <View style={styles.leftBadges}>
          <View style={styles.coinBadge}>
            <Ionicons name="diamond" size={12} color="#7df9ff" />
            <Text style={styles.coinText}>59</Text>
            <Ionicons name="add" size={11} color="rgba(162,155,254,0.5)" />
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LVL 12</Text>
          </View>
        </View>

        {/* Center title */}
        <Text style={styles.appTitle}>Galaxy Voice ✨</Text>

        {/* Right: trophy + bell */}
        <View style={styles.rightBtns}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Haptics.selectionAsync()}>
            <Ionicons name="trophy-outline" size={18} color="rgba(255,215,0,0.85)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Haptics.selectionAsync()}>
            <Ionicons name="notifications-outline" size={18} color="rgba(162,155,254,0.85)" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <TouchableOpacity style={styles.searchBar} onPress={() => Haptics.selectionAsync()}>
        <Ionicons name="search" size={15} color="rgba(162,155,254,0.38)" />
        <Text style={styles.searchPlaceholder}>Search rooms, users...</Text>
      </TouchableOpacity>

      {/* Hot / New / Follow filters */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => { Haptics.selectionAsync(); setActiveFilter(f); }}
            style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            {activeFilter === f && <View style={styles.filterUnderline} />}
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        {/* Live count badge */}
        <View style={styles.liveBadge}>
          <View style={styles.livePulseDot} />
          <Text style={styles.liveBadgeText}>4 Rooms Live</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: (isWeb ? 34 : insets.bottom) + 90 }]}
      >
        {LIVE_ROOMS.map(room => (
          <TouchableOpacity
            key={room.id}
            activeOpacity={0.88}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/room/${room.id}`); }}
          >
            <View style={styles.roomCard}>
              {/* Card top row */}
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={styles.livePill}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                    <View style={[styles.tagPill, { borderColor: `${room.tagColor}44`, backgroundColor: `${room.tagColor}18` }]}>
                      <Text style={[styles.tagText, { color: room.tagColor }]}>{room.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.hostName}>hosted by {room.host}</Text>
                </View>
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/room/${room.id}`); }}
                >
                  <Text style={styles.joinText}>Join</Text>
                  <Ionicons name="chevron-forward" size={13} color="#A29BFE" />
                </TouchableOpacity>
              </View>

              {/* Speaker emoji row */}
              <View style={styles.speakersRow}>
                {room.speakerEmojis.map((emoji, i) => (
                  <View key={i} style={styles.speakerBubble}>
                    <Text style={{ fontSize: 16 }}>{emoji}</Text>
                  </View>
                ))}
                {/* Empty seats */}
                {Array.from({ length: room.totalSeats - room.speakers }).map((_, i) => (
                  <View key={`empty-${i}`} style={[styles.speakerBubble, styles.speakerEmpty]}>
                    <Ionicons name="add" size={12} color="rgba(255,255,255,0.18)" />
                  </View>
                ))}
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name="mic" size={12} color="rgba(162,155,254,0.5)" />
                  <Text style={styles.statText}>{room.speakers}/{room.totalSeats} speakers</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name="headset" size={12} color="rgba(162,155,254,0.5)" />
                  <Text style={styles.statText}>{room.listeners} listening</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  orbTop: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(108,92,231,0.09)" },
  orbBot: { position: "absolute", bottom: 100, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(0,206,201,0.05)" },

  header: {
    paddingHorizontal: 14, paddingBottom: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  leftBadges: { flexDirection: "row", alignItems: "center", gap: 6 },
  coinBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(108,92,231,0.14)", borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 9,
    borderWidth: 1, borderColor: "rgba(108,92,231,0.3)",
  },
  coinText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  levelBadge: {
    backgroundColor: "rgba(255,215,0,0.12)", borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 9,
    borderWidth: 1, borderColor: "rgba(255,215,0,0.3)",
  },
  levelText: { color: "#FFD700", fontWeight: "800", fontSize: 11 },
  appTitle: { color: "#ffffff", fontWeight: "800", fontSize: 17, letterSpacing: -0.3 },
  rightBtns: { flexDirection: "row", gap: 6 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center", justifyContent: "center",
  },
  notifDot: { position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#ff6482", borderWidth: 1.5, borderColor: "#050112" },

  searchBar: {
    marginHorizontal: 14, marginBottom: 4,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 13,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  searchPlaceholder: { color: "rgba(162,155,254,0.35)", fontSize: 13 },

  filterRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  filterTab: { paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", position: "relative" },
  filterTabActive: {},
  filterText: { color: "rgba(162,155,254,0.4)", fontSize: 14, fontWeight: "600" },
  filterTextActive: { color: "#A29BFE" },
  filterUnderline: { position: "absolute", bottom: 0, left: 14, right: 14, height: 2, backgroundColor: "#6C5CE7", borderRadius: 1 },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,230,118,0.1)", borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: "rgba(0,230,118,0.22)",
  },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#00e676" },
  liveBadgeText: { color: "#00e676", fontSize: 11, fontWeight: "700" },

  scroll: { paddingHorizontal: 14, paddingTop: 14, gap: 14 },

  roomCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  livePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#0e2a18", borderRadius: 10,
    paddingVertical: 2, paddingHorizontal: 7,
    borderWidth: 1, borderColor: "#00e676",
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#00e676" },
  liveText: { color: "#00e676", fontSize: 8, fontWeight: "700", letterSpacing: 1.5 },
  tagPill: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 10, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: "700" },
  roomName: { color: "#ffffff", fontWeight: "800", fontSize: 16, marginTop: 6, letterSpacing: -0.3 },
  hostName: { color: "rgba(162,155,254,0.45)", fontSize: 12, marginTop: 2 },
  joinBtn: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: "rgba(108,92,231,0.18)",
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "rgba(108,92,231,0.4)",
    alignSelf: "flex-start",
  },
  joinText: { color: "#A29BFE", fontSize: 13, fontWeight: "700" },

  speakersRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  speakerBubble: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(108,92,231,0.15)",
    borderWidth: 1.5, borderColor: "rgba(108,92,231,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  speakerEmpty: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
  },

  statsRow: { flexDirection: "row", gap: 18 },
  statText: { color: "rgba(162,155,254,0.5)", fontSize: 12 },
});
