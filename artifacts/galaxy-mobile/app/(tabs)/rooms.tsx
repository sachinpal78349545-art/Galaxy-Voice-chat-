import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/components/GlassCard";

const isWeb = Platform.OS === "web";

const ROOMS = [
  { id: "r1", name: "Midnight Chill Lounge",  host: "StarGazer_01", listeners: 142, seats: 10, seats_taken: 8,  tag: "Chill",    tagColor: "#6C5CE7", isLive: true  },
  { id: "r2", name: "Nebula Beats Drop",       host: "CosmicDJ",     listeners: 88,  seats: 6,  seats_taken: 5,  tag: "Music",    tagColor: "#00CEC9", isLive: true  },
  { id: "r3", name: "Galaxy Talks — Tech",     host: "VoidWalker",   listeners: 56,  seats: 8,  seats_taken: 3,  tag: "Talk",     tagColor: "#FFD700", isLive: true  },
  { id: "r4", name: "Space Karaoke Night",     host: "NightOwl_X",   listeners: 230, seats: 12, seats_taken: 12, tag: "Karaoke",  tagColor: "#ff6482", isLive: true  },
  { id: "r5", name: "Coding in the Cosmos",    host: "Dev_Nebula",   listeners: 44,  seats: 6,  seats_taken: 2,  tag: "Tech",     tagColor: "#A29BFE", isLive: true  },
  { id: "r6", name: "Love & Stardust",         host: "LunaRose",     listeners: 118, seats: 8,  seats_taken: 7,  tag: "Romance",  tagColor: "#ff7675", isLive: true  },
  { id: "r7", name: "Zero Gravity Comedy",     host: "SpaceFool",    listeners: 77,  seats: 6,  seats_taken: 6,  tag: "Comedy",   tagColor: "#00e676", isLive: false },
  { id: "r8", name: "Interstellar Debates",    host: "ArgonKnight",  listeners: 63,  seats: 10, seats_taken: 5,  tag: "Debate",   tagColor: "#7df9ff", isLive: true  },
];

export default function RoomsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Live", "Music", "Talk", "Chill"];

  const filtered = ROOMS.filter(r => {
    if (filter === "All") return true;
    if (filter === "Live") return r.isLive;
    return r.tag === filter;
  });

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: "absolute", top: -40, right: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(108,92,231,0.08)" }} />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 72 : insets.top + 10 }]}>
        <Text style={styles.title}>Voice Rooms</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => Haptics.selectionAsync()}>
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text style={styles.createText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: (isWeb ? 34 : insets.bottom) + 82 }]}
      >
        {filtered.map(room => (
          <TouchableOpacity key={room.id} onPress={() => Haptics.selectionAsync()}>
            <GlassCard style={styles.roomCard}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                <View style={[styles.roomIcon, { backgroundColor: `${room.tagColor}18`, borderColor: `${room.tagColor}33` }]}>
                  <Ionicons name="radio" size={24} color={room.tagColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                    {room.isLive && (
                      <View style={styles.livePill}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.hostText}>by {room.host}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <View style={[styles.tagPill, { backgroundColor: `${room.tagColor}18`, borderColor: `${room.tagColor}33` }]}>
                      <Text style={[styles.tagText, { color: room.tagColor }]}>{room.tag}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="headset" size={12} color="rgba(162,155,254,0.5)" />
                      <Text style={styles.statText}>{room.listeners} listening</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="mic" size={12} color="rgba(162,155,254,0.5)" />
                      <Text style={styles.statText}>{room.seats_taken}/{room.seats} seats</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.joinBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                  <Text style={styles.joinText}>Join</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#ffffff", fontWeight: "800" as const, fontSize: 22, letterSpacing: -0.4 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#6C5CE7", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  createText: { color: "#ffffff", fontSize: 13, fontWeight: "700" as const },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  filterPillActive: { backgroundColor: "rgba(108,92,231,0.22)", borderColor: "rgba(108,92,231,0.5)" },
  filterText: { color: "rgba(162,155,254,0.5)", fontSize: 12, fontWeight: "600" as const },
  filterTextActive: { color: "#A29BFE" },
  scroll: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  roomCard: { paddingVertical: 14 },
  roomIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  roomName: { color: "#ffffff", fontWeight: "700" as const, fontSize: 14, flex: 1 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0e2a18", borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7, borderWidth: 1, borderColor: "#00e676" },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#00e676" },
  liveText: { color: "#00e676", fontSize: 8, fontWeight: "700" as const, letterSpacing: 1 },
  hostText: { color: "rgba(162,155,254,0.5)", fontSize: 11, marginTop: 3 },
  tagPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: "700" as const },
  statText: { color: "rgba(162,155,254,0.5)", fontSize: 11 },
  joinBtn: { backgroundColor: "rgba(108,92,231,0.2)", borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(108,92,231,0.4)" },
  joinText: { color: "#A29BFE", fontSize: 12, fontWeight: "700" as const },
});
