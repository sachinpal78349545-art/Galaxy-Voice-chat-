import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "@/components/GlassCard";

const isWeb = Platform.OS === "web";

const CHATS = [
  { id: "c1", name: "StarGazer_01",  avatar: "🌟", lastMsg: "You're amazing in that room last night!", time: "2m",  unread: 3,  online: true  },
  { id: "c2", name: "CosmicDJ",      avatar: "🎵", lastMsg: "Send me that track 🔥",                 time: "15m", unread: 1,  online: true  },
  { id: "c3", name: "LunaRose",      avatar: "🌙", lastMsg: "Good night, space traveler ✨",          time: "1h",  unread: 0,  online: false },
  { id: "c4", name: "VoidWalker",    avatar: "🌌", lastMsg: "The debate was intense today!",          time: "2h",  unread: 0,  online: true  },
  { id: "c5", name: "NightOwl_X",    avatar: "🦉", lastMsg: "Join my room tonight?",                 time: "5h",  unread: 2,  online: false },
  { id: "c6", name: "Dev_Nebula",    avatar: "💻", lastMsg: "Check out this new Agora feature",       time: "1d",  unread: 0,  online: false },
  { id: "c7", name: "SpaceFool",     avatar: "🤡", lastMsg: "Haha you missed it bro 😂",             time: "1d",  unread: 0,  online: true  },
];

export default function ChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 72 : insets.top + 10 }]}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => Haptics.selectionAsync()}>
          <Ionicons name="create-outline" size={20} color="rgba(162,155,254,0.8)" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <TouchableOpacity style={styles.searchBar} onPress={() => Haptics.selectionAsync()}>
        <Ionicons name="search" size={16} color="rgba(162,155,254,0.4)" />
        <Text style={styles.searchText}>Search conversations...</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: (isWeb ? 34 : insets.bottom) + 82 }]}
      >
        {CHATS.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            onPress={() => Haptics.selectionAsync()}
            style={styles.chatRow}
          >
            <View style={{ position: "relative" }}>
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 22 }}>{chat.avatar}</Text>
              </View>
              {chat.online && <View style={styles.onlineDot} />}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.chatName}>{chat.name}</Text>
              <Text style={styles.lastMsg} numberOfLines={1}>{chat.lastMsg}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 5 }}>
              <Text style={styles.timeText}>{chat.time}</Text>
              {chat.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{chat.unread}</Text>
                </View>
              )}
            </View>
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
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  searchBar: { marginHorizontal: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  searchText: { color: "rgba(162,155,254,0.35)", fontSize: 13 },
  scroll: { paddingHorizontal: 16, gap: 2 },
  chatRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(108,92,231,0.14)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(108,92,231,0.25)" },
  onlineDot: { position: "absolute", bottom: 2, right: 2, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#00e676", borderWidth: 2, borderColor: "#050112" },
  chatName: { color: "#ffffff", fontWeight: "700" as const, fontSize: 14 },
  lastMsg: { color: "rgba(162,155,254,0.5)", fontSize: 12 },
  timeText: { color: "rgba(162,155,254,0.35)", fontSize: 11 },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#6C5CE7", alignItems: "center", justifyContent: "center" },
  unreadText: { color: "#ffffff", fontSize: 10, fontWeight: "700" as const },
});
