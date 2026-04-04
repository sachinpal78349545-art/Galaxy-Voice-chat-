import React, { useRef, useEffect } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  level: number;
  xp: number;
  xpTarget: number;
  vipBadge: string;
  rankBadge: string;
}

export function LevelBar({ level, xp, xpTarget, vipBadge, rankBadge }: Props) {
  const pct = Math.min(1, xp / xpTarget);
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: pct,
      duration: 900,
      useNativeDriver: false,
      delay: 200,
    }).start();
  }, [pct]);

  const barWidthPct = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={{ gap: 10 }}>
      {/* Level + XP row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={styles.levelBadge}>
          <Ionicons name="star" size={13} color="#FFD700" />
          <Text style={styles.levelText}>LVL {level}</Text>
        </View>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              { width: barWidthPct as any },
            ]}
          />
        </View>
        <Text style={styles.xpText}>
          {xp.toLocaleString()}/{xpTarget.toLocaleString()} XP
        </Text>
      </View>

      {/* VIP + Rank badges */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
        <View style={[styles.badge, { borderColor: "rgba(108,92,231,0.4)", backgroundColor: "rgba(108,92,231,0.12)" }]}>
          <Ionicons name="planet" size={11} color="#A29BFE" />
          <Text style={[styles.badgeText, { color: "#A29BFE" }]}>{vipBadge}</Text>
        </View>
        <View style={[styles.badge, { borderColor: "rgba(255,165,0,0.4)", backgroundColor: "rgba(255,165,0,0.1)" }]}>
          <Ionicons name="shield-half" size={11} color="#FFA500" />
          <Text style={[styles.badgeText, { color: "#FFA500" }]}>{rankBadge}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  levelText: {
    color: "#FFD700",
    fontWeight: "800" as const,
    fontSize: 13,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#6C5CE7",
    borderRadius: 4,
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  xpText: {
    color: "rgba(162,155,254,0.55)",
    fontSize: 10,
    fontWeight: "500" as const,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
});
