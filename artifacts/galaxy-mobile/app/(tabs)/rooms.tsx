import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/components/GlassCard";
import { ROOMS } from "@/lib/roomData";

const isWeb = Platform.OS === "web";

export default function RoomsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Hot", "New"];

  const filtered = ROOMS.filter(r => {
    if (filter === "All") return true;
    if (filter === "Hot") return r.listeners > 80;
    if (filter === "New") return r.listeners < 60;
    return true;
  });

  const handleJoin = (roomId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/room/${roomId}`);
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Nebula bg */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: "absolute", top: -40, right: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(108,92,231,0.08)" }} />
      </View>

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: isWeb ? 56 : insets.top + 10 }]}>
        <Text style={styles.title}>Voice Rooms 🎤</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => Haptics.selectionAsync()}>
          <Ionicons name="add" size={15} color="#ffffff" />
          <Text style={styles.createText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* ── FILTER TABS ── */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            {filter === f && <View style={styles.filterUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: (isWeb ? 34 : insets.bottom) + 90 }]}
      >
        {filtered.map(room => (
          <TouchableOpacity key={room.id} onPress={() => handleJoin(room.id)} activeOpacity={0.88}>
            <GlassCard style={styles.roomCard}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                {/* Icon */}
                <View style={[styles.roomIcon, { backgroundColor: `${room.tagColor}18`, borderColor: `${room.tagColor}33` }]}>
                  <Ionicons name="radio" size={24} color={room.tagColor} />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                    {room.isLive && (
                      <View style={styles.livePill}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.hostText}>by {room.host}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                    <View style={[styles.tagPill, { backgroundColor: `${room.tagColor}18`, borderColor: `${room.tagColor}33` }]}>
                      <Text style={[styles.tagText, { color: room.tagColor }]}>{room.tag}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="headset" size={11} color="rgba(162,155,254,0.45)" />
                      <Text style={styles.statText}>{room.listeners} listening</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="mic" size={11} color="rgba(162,155,254,0.45)" />
                      <Text style={styles.statText}>{room.seats_taken}/{room.seats} seats</Text>
                    </View>
                  </View>
                </View>

                {/* Join > */}
                <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(room.id)}>
                  <Text style={styles.joinText}>Join</Text>
                  <Ionicons name="chevron-forward" size={12} color="#A29BFE" />
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
  page:            { flex: 1 },
  header:          { paddingHorizontal: 16, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title:           { color: "#ffffff", fontWeight: "800", fontSize: 20, letterSpacing: -0.4 },
  createBtn:       { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#6C5CE7", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  createText:      { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  filterRow:       { flexDirection: "row", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  filterTab:       { paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", position: "relative" },
  filterTabActive: {},
  filterText:      { color: "rgba(162,155,254,0.4)", fontSize: 14, fontWeight: "600" },
  filterTextActive:{ color: "#A29BFE" },
  filterUnderline: { position: "absolute", bottom: 0, left: 16, right: 16, height: 2, backgroundColor: "#6C5CE7", borderRadius: 1 },
  scroll:          { paddingHorizontal: 14, paddingTop: 12, gap: 10 },
  roomCard:        { paddingVertical: 14 },
  roomIcon:        { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  roomName:        { color: "#ffffff", fontWeight: "700", fontSize: 14, flex: 1 },
  livePill:        { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0e2a18", borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7, borderWidth: 1, borderColor: "#00e676" },
  liveDot:         { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#00e676" },
  liveText:        { color: "#00e676", fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  hostText:        { color: "rgba(162,155,254,0.5)", fontSize: 11, marginTop: 3 },
  tagPill:         { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1 },
  tagText:         { fontSize: 10, fontWeight: "700" },
  statText:        { color: "rgba(162,155,254,0.5)", fontSize: 11 },
  joinBtn:         { flexDirection: "row", alignItems: "center", gap: 1, backgroundColor: "rgba(108,92,231,0.18)", borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(108,92,231,0.38)" },
  joinText:        { color: "#A29BFE", fontSize: 12, fontWeight: "700" },
});
