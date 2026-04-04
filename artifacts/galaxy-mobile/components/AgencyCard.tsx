import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface Props {
  agencyName: string;
  monthlyBeans: number;
  targetBeans: number;
  validDays: number;
  targetDays: number;
  liveHours: number;
  targetHours: number;
  onPress?: () => void;
}

export function AgencyCard({
  agencyName, monthlyBeans, targetBeans,
  validDays, targetDays, liveHours, targetHours,
  onPress,
}: Props) {
  const handlePress = () => {
    Haptics.selectionAsync();
    onPress?.();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.card} activeOpacity={0.85}>
      {/* Gold shimmer bar at top */}
      <View style={styles.shimmerBar} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={styles.iconWrap}>
          <Ionicons name="trophy" size={26} color="#D4AC0D" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Agency Dashboard</Text>
          <Text style={styles.subtitle}>
            Track your hosts, salary, and target progress.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(212,172,13,0.6)" />
      </View>

      {/* Mini progress pills */}
      <View style={styles.progressRow}>
        <MiniProgress
          label="Beans"
          value={monthlyBeans}
          max={targetBeans}
          color="#D4AC0D"
        />
        <MiniProgress
          label={`${validDays}/${targetDays}d`}
          value={validDays}
          max={targetDays}
          color="#00CEC9"
        />
        <MiniProgress
          label={`${liveHours}/${targetHours}h`}
          value={liveHours}
          max={targetHours}
          color="#A29BFE"
        />
      </View>
    </TouchableOpacity>
  );
}

function MiniProgress({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(1, max > 0 ? value / max : 0);
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <View style={[styles.miniTrack]}>
        <View style={[styles.miniFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={{ color: "rgba(212,172,13,0.55)", fontSize: 9, fontWeight: "600" as const }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f0c00",
    borderRadius: 20,
    padding: 16,
    paddingTop: 14,
    borderWidth: 1.5,
    borderColor: "rgba(212,172,13,0.3)",
    gap: 14,
    shadowColor: "#D4AC0D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
    overflow: "hidden",
  },
  shimmerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#D4AC0D",
    opacity: 0.6,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(212,172,13,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,172,13,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#D4AC0D",
    fontWeight: "800" as const,
    fontSize: 16,
  },
  subtitle: {
    color: "rgba(212,172,13,0.55)",
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  progressRow: {
    flexDirection: "row",
    gap: 10,
  },
  miniTrack: {
    width: "100%",
    height: 5,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 3,
    overflow: "hidden",
  },
  miniFill: {
    height: "100%",
    borderRadius: 3,
  },
});
