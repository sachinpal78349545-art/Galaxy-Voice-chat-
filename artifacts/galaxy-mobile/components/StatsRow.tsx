import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

interface Stat {
  label: string;
  value: number;
}

interface Props {
  following: number;
  followers: number;
  visitors: number;
  onFollowingPress?: () => void;
  onFollowersPress?: () => void;
  onVisitorsPress?: () => void;
}

function StatPill({ label, value, onPress }: Stat & { onPress?: () => void }) {
  const handlePress = () => {
    Haptics.selectionAsync();
    onPress?.();
  };
  return (
    <TouchableOpacity onPress={handlePress} style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value.toLocaleString()}</Text>
    </TouchableOpacity>
  );
}

export function StatsRow({
  following, followers, visitors,
  onFollowingPress, onFollowersPress, onVisitorsPress,
}: Props) {
  return (
    <View style={styles.row}>
      <StatPill label="Following" value={following} onPress={onFollowingPress} />
      <StatPill label="Followers" value={followers} onPress={onFollowersPress} />
      <StatPill label="Visitors"  value={visitors}  onPress={onVisitorsPress}  />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 22,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  label: {
    color: "rgba(162,155,254,0.65)",
    fontSize: 12,
    fontWeight: "500" as const,
  },
  value: {
    color: "#ffffff",
    fontWeight: "800" as const,
    fontSize: 13,
  },
});
