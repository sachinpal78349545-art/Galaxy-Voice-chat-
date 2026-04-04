import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const isWeb = Platform.OS === "web";

const CHATS = [
  {
    id: "c1", name: "StarGazer",   avatar: "🌟",
    lastMsg: "You were amazing in that room last night!",
    time: "1h",  unread: 2, online: true,
  },
  {
    id: "c2", name: "MoonDancer",  avatar: "🌙",
    lastMsg: "That collab was so good, let's do it again",
    time: "2h",  unread: 1, online: true,
  },
  {
    id: "c3", name: "CosmoKid",    avatar: "✨",
    lastMsg: "Good morning space traveler ✌️",
    time: "1d",  unread: 0, online: false,
  },
  {
    id: "c4", name: "VoidWalker",  avatar: "🌌",
    lastMsg: "The debate room was intense today!",
    time: "1d",  unread: 0, online: true,
  },
  {
    id: "c5", name: "NightOwl_X",  avatar: "🦉",
    lastMsg: "Join my room tonight? 🦉",
    time: "2d",  unread: 0, online: false,
  },
  {
    id: "c6", name: "Dev_Nebula",  avatar: "💻",
    lastMsg: "Check this new voice feature 🚀",
    time: "3d",  unread: 0, online: false,
  },
];

export default function ChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Nebula orb */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: "absolute", top: -40, right: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(108,92,231,0.07)" }} />
      </View>

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: isWeb ? 56 : insets.top + 10 }]}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => Haptics.selectionAsync()}>
            <Ionicons name="search" size={18} color="rgba(162,155,254,0.75)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => Haptics.selectionAsync()}>
            <Ionicons name="add" size={20} color="rgba(162,155,254,0.75)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => Haptics.selectionAsync()}>
            <Ionicons name="notifications-outline" size={18} color="rgba(162,155,254,0.75)" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <TouchableOpacity style={styles.searchBar} onPress={() => Haptics.selectionAsync()}>
        <Ionicons name="search" size={15} color="rgba(162,155,254,0.35)" />
        <Text style={styles.searchText}>Search conversations...</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: (isWeb ? 34 : insets.bottom) + 90 }]}
      >
        {CHATS.map(chat => (
          <TouchableOpacity
            key={chat.id}
            onPress={() => Haptics.selectionAsync()}
            style={styles.chatRow}
          >
            {/* Avatar */}
            <View style={{ position: "relative" }}>
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 22 }}>{chat.avatar}</Text>
              </View>
              {chat.online && <View style={styles.onlineDot} />}
            </View>

            {/* Name + message */}
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.chatName}>{chat.name}</Text>
              <Text style={styles.lastMsg} numberOfLines={1}>{chat.lastMsg}</Text>
            </View>

            {/* Time + unread */}
            <View style={{ alignItems: "flex-end", gap: 5 }}>
              <Text style={styles.timeText}>{chat.time}</Text>
              {chat.unread > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{chat.unread}</Text>
                </View>
              ) : (
                <View style={{ width: 20, height: 20 }} />
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
  header: {
    paddingHorizontal: 16, paddingBottom: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  title: { color: "#ffffff", fontWeight: "800", fontSize: 22, letterSpacing: -0.4 },
  headerActions: { flexDirection: "row", gap: 6 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center", justifyContent: "center",
  },
  notifDot: { position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#ff6482", borderWidth: 1.5, borderColor: "#050112" },
  searchBar: {
    marginHorizontal: 16, marginBottom: 10,
    flexDirection: "row", alignItems: "center", gap: 9,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 13,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  searchText: { color: "rgba(162,155,254,0.35)", fontSize: 13 },
  scroll: { paddingHorizontal: 16, gap: 0 },
  chatRow: {
    flexDirection: "row", alignItems: "center", gap: 13,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  avatarCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "rgba(108,92,231,0.14)",
    borderWidth: 1, borderColor: "rgba(108,92,231,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  onlineDot: {
    position: "absolute", bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: "#00e676", borderWidth: 2, borderColor: "#050112",
  },
  chatName: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  lastMsg: { color: "rgba(162,155,254,0.5)", fontSize: 12 },
  timeText: { color: "rgba(162,155,254,0.35)", fontSize: 11 },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: "#6C5CE7", paddingHorizontal: 5,
    alignItems: "center", justifyContent: "center",
  },
  unreadText: { color: "#ffffff", fontSize: 10, fontWeight: "700" },
});
