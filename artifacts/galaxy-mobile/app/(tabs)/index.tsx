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

const FEATURED_ROOMS = [
  { id: "r1", name: "Midnight Chill Lounge", host: "StarGazer_01", listeners: 142, tag: "Chill", tagColor: "#6C5CE7", live: true  },
  { id: "r2", name: "Nebula Beats Drop",     host: "CosmicDJ",     listeners: 88,  tag: "Music", tagColor: "#00CEC9", live: true  },
  { id: "r3", name: "Galaxy Talks — Tech",   host: "VoidWalker",   listeners: 56,  tag: "Talk",  tagColor: "#FFD700", live: true  },
];

const ACTIVE_ROOMS = [
  { id: "a1", name: "Space Karaoke Night",   host: "NightOwl_X",   listeners: 230, tag: "Karaoke", tagColor: "#ff6482" },
  { id: "a2", name: "Coding in the Cosmos",  host: "Dev_Nebula",   listeners: 44,  tag: "Tech",    tagColor: "#A29BFE" },
  { id: "a3", name: "Love & Stardust",       host: "LunaRose",     listeners: 118, tag: "Romance", tagColor: "#ff7675" },
  { id: "a4", name: "Zero Gravity Comedy",   host: "SpaceFool",    listeners: 77,  tag: "Comedy",  tagColor: "#00e676" },
  { id: "a5", name: "Midnight Prayers",      host: "SkyMystic",    listeners: 34,  tag: "Quiet",   tagColor: "#D4AC0D" },
  { id: "a6", name: "Interstellar Debates",  host: "ArgonKnight",  listeners: 63,  tag: "Debate",  tagColor: "#7df9ff" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = ["All", "Chill", "Music", "Talk", "Karaoke", "Tech"];

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Nebula bg */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.nebulaTop} />
        <View style={styles.nebulaBot} />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 72 : insets.top + 10 }]}>
        <View>
          <Text style={styles.greeting}>Good evening 🌌</Text>
          <Text style={styles.tagline}>Find your galaxy</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="search" size={18} color="rgba(162,155,254,0.8)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={18} color="rgba(162,155,254,0.8)" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: (isWeb ? 34 : insets.bottom) + 82 }]}>
        {/* Category filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => { Haptics.selectionAsync(); setActiveCategory(cat); }}
              style={[styles.catPill, activeCategory === cat && styles.catPillActive]}
            >
              <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured rooms */}
        <View>
          <Text style={styles.sectionTitle}>Featured Rooms</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
            {FEATURED_ROOMS.map((room) => (
              <TouchableOpacity key={room.id} onPress={() => Haptics.selectionAsync()}>
                <View style={styles.featuredCard}>
                  <View style={styles.featuredAvatarBg}>
                    <Ionicons name="radio" size={36} color={room.tagColor} />
                  </View>
                  <View style={styles.featuredLive}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                  <Text style={styles.featuredName}>{room.name}</Text>
                  <Text style={styles.featuredHost}>by {room.host}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                    <View style={[styles.tagPill, { backgroundColor: `${room.tagColor}22`, borderColor: `${room.tagColor}44` }]}>
                      <Text style={[styles.tagText, { color: room.tagColor }]}>{room.tag}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="headset" size={12} color="rgba(162,155,254,0.5)" />
                      <Text style={styles.listenerCount}>{room.listeners}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Active rooms grid */}
        <View>
          <Text style={styles.sectionTitle}>Active Rooms</Text>
          <View style={styles.grid}>
            {ACTIVE_ROOMS.map((room) => (
              <TouchableOpacity
                key={room.id}
                onPress={() => Haptics.selectionAsync()}
                style={{ width: "48%" }}
              >
                <GlassCard style={styles.roomCard}>
                  <View style={[styles.roomIcon, { backgroundColor: `${room.tagColor}18`, borderColor: `${room.tagColor}33` }]}>
                    <Ionicons name="volume-high" size={20} color={room.tagColor} />
                  </View>
                  <Text style={styles.roomName} numberOfLines={2}>{room.name}</Text>
                  <Text style={styles.roomHost} numberOfLines={1}>{room.host}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                    <View style={[styles.tagPill, { backgroundColor: `${room.tagColor}18`, borderColor: `${room.tagColor}30` }]}>
                      <Text style={[styles.tagText, { color: room.tagColor, fontSize: 9 }]}>{room.tag}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Ionicons name="person" size={10} color="rgba(162,155,254,0.45)" />
                      <Text style={{ color: "rgba(162,155,254,0.45)", fontSize: 10 }}>{room.listeners}</Text>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  nebulaTop: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(108,92,231,0.09)" },
  nebulaBot: { position: "absolute", bottom: 100, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(0,206,201,0.05)" },
  header: { paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  greeting: { color: "rgba(162,155,254,0.6)", fontSize: 12, fontWeight: "500" as const },
  tagline: { color: "#ffffff", fontSize: 22, fontWeight: "800" as const, marginTop: 2, letterSpacing: -0.5 },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  notifDot: { position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#ff6482", borderWidth: 1.5, borderColor: "#050112" },
  scroll: { paddingTop: 8, gap: 20 },
  catRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  catPill: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  catPillActive: { backgroundColor: "rgba(108,92,231,0.25)", borderColor: "rgba(108,92,231,0.5)" },
  catText: { color: "rgba(162,155,254,0.5)", fontSize: 12, fontWeight: "600" as const },
  catTextActive: { color: "#A29BFE" },
  sectionTitle: { color: "#ffffff", fontWeight: "800" as const, fontSize: 16, marginBottom: 12, paddingHorizontal: 16 },
  featuredCard: { width: 180, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", gap: 6 },
  featuredAvatarBg: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(108,92,231,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(108,92,231,0.2)" },
  featuredLive: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#0e2a18", borderRadius: 12, paddingVertical: 3, paddingHorizontal: 8, alignSelf: "flex-start" as const, borderWidth: 1, borderColor: "#00e676" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#00e676" },
  liveText: { color: "#00e676", fontSize: 9, fontWeight: "700" as const, letterSpacing: 1.5 },
  featuredName: { color: "#ffffff", fontWeight: "700" as const, fontSize: 13 },
  featuredHost: { color: "rgba(162,155,254,0.5)", fontSize: 11 },
  tagPill: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 10, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: "700" as const },
  listenerCount: { color: "rgba(162,155,254,0.5)", fontSize: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16 },
  roomCard: { gap: 8, paddingVertical: 14 },
  roomIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  roomName: { color: "#ffffff", fontWeight: "700" as const, fontSize: 12, lineHeight: 17 },
  roomHost: { color: "rgba(162,155,254,0.5)", fontSize: 10 },
});
