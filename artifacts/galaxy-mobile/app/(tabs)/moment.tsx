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

const MOMENTS = [
  {
    id: "m1",
    author: "StarGazer_01",
    avatar: "🌟",
    time: "3m ago",
    content: "Just hit 1000 followers! This galaxy is growing fast 🚀 Thank you all for the love and support. See you in my room tonight!",
    likes: 142, comments: 28, shares: 12,
    liked: false,
    tags: ["Milestone", "Grateful"],
  },
  {
    id: "m2",
    author: "CosmicDJ",
    avatar: "🎵",
    time: "1h ago",
    content: "New music drop coming this weekend 🎶 Been working on this track for 3 months. It's going to hit different in the voice room.",
    likes: 88, comments: 14, shares: 6,
    liked: true,
    tags: ["Music", "Announcement"],
  },
  {
    id: "m3",
    author: "LunaRose",
    avatar: "🌙",
    time: "2h ago",
    content: "Peaceful night in the galaxy tonight. Sometimes you just need silence and stars ✨",
    likes: 201, comments: 45, shares: 19,
    liked: false,
    tags: ["Vibe", "Night"],
  },
];

export default function MomentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [moments, setMoments] = useState(MOMENTS);

  const toggleLike = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoments(prev =>
      prev.map(m =>
        m.id === id
          ? { ...m, liked: !m.liked, likes: m.liked ? m.likes - 1 : m.likes + 1 }
          : m
      )
    );
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 72 : insets.top + 10 }]}>
        <Text style={styles.title}>Moment</Text>
        <TouchableOpacity style={styles.postBtn} onPress={() => Haptics.selectionAsync()}>
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text style={styles.postText}>Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: (isWeb ? 34 : insets.bottom) + 82 }]}
      >
        {moments.map((moment) => (
          <GlassCard key={moment.id} style={{ gap: 12 }}>
            {/* Author row */}
            <View style={styles.authorRow}>
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 20 }}>{moment.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.authorName}>{moment.author}</Text>
                <Text style={styles.timeText}>{moment.time}</Text>
              </View>
              <TouchableOpacity onPress={() => Haptics.selectionAsync()}>
                <Ionicons name="ellipsis-horizontal" size={18} color="rgba(162,155,254,0.4)" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <Text style={styles.content}>{moment.content}</Text>

            {/* Tags */}
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {moment.tags.map(t => (
                <View key={t} style={styles.tagPill}>
                  <Text style={styles.tagText}>#{t}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => toggleLike(moment.id)} style={styles.actionBtn}>
                <Ionicons
                  name={moment.liked ? "heart" : "heart-outline"}
                  size={18}
                  color={moment.liked ? "#ff6482" : "rgba(162,155,254,0.55)"}
                />
                <Text style={[styles.actionText, moment.liked && { color: "#ff6482" }]}>
                  {moment.likes}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Haptics.selectionAsync()} style={styles.actionBtn}>
                <Ionicons name="chatbubble-outline" size={18} color="rgba(162,155,254,0.55)" />
                <Text style={styles.actionText}>{moment.comments}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Haptics.selectionAsync()} style={styles.actionBtn}>
                <Ionicons name="arrow-redo-outline" size={18} color="rgba(162,155,254,0.55)" />
                <Text style={styles.actionText}>{moment.shares}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#ffffff", fontWeight: "800" as const, fontSize: 22, letterSpacing: -0.4 },
  postBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#6C5CE7", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  postText: { color: "#ffffff", fontSize: 13, fontWeight: "700" as const },
  scroll: { paddingHorizontal: 16, paddingTop: 6, gap: 14 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(108,92,231,0.14)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(108,92,231,0.25)" },
  authorName: { color: "#ffffff", fontWeight: "700" as const, fontSize: 14 },
  timeText: { color: "rgba(162,155,254,0.4)", fontSize: 11, marginTop: 1 },
  content: { color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 22 },
  tagPill: { backgroundColor: "rgba(108,92,231,0.15)", borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1, borderColor: "rgba(108,92,231,0.25)" },
  tagText: { color: "#A29BFE", fontSize: 11, fontWeight: "600" as const },
  actionsRow: { flexDirection: "row", gap: 20, paddingTop: 4, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { color: "rgba(162,155,254,0.55)", fontSize: 13, fontWeight: "600" as const },
});
