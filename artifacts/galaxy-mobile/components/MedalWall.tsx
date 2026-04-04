import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Medal } from "@/lib/profileData";

const MEDAL_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  space_veteran: "rocket",
  explorer:      "compass",
  star_lord:     "star",
  voice_legend:  "mic",
  cosmic_host:   "planet",
  default:       "trophy",
};

function HexMedal({ medal }: { medal: Medal }) {
  const SIZE = 82;
  const iconName = MEDAL_ICONS[medal.id] ?? MEDAL_ICONS.default;

  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <View style={{ width: SIZE, height: SIZE, position: "relative", alignItems: "center", justifyContent: "center" }}>
        {/* Hexagonal shape: two overlapping rotated rounded squares */}
        <View
          style={{
            position: "absolute",
            width: SIZE * 0.72,
            height: SIZE * 0.9,
            borderRadius: 12,
            backgroundColor: medal.colorFrom,
            transform: [{ rotate: "0deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            width: SIZE * 0.72,
            height: SIZE * 0.9,
            borderRadius: 12,
            backgroundColor: medal.colorFrom,
            transform: [{ rotate: "60deg" }],
          }}
        />
        {/* Accent layer */}
        <View
          style={{
            position: "absolute",
            width: SIZE * 0.58,
            height: SIZE * 0.75,
            borderRadius: 10,
            backgroundColor: medal.colorTo,
            opacity: 0.6,
            transform: [{ rotate: "30deg" }],
          }}
        />
        {/* Glow rim */}
        <View
          style={{
            position: "absolute",
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: 1.5,
            borderColor: medal.borderColor,
            opacity: 0.35,
          }}
        />
        {/* Content */}
        <View style={{ position: "absolute", alignItems: "center", gap: 1, zIndex: 10 }}>
          <Text style={{ fontSize: 26, fontWeight: "900" as const, color: "#ffffff" }}>
            {medal.level}
          </Text>
          <Ionicons name={iconName} size={10} color="rgba(255,255,255,0.6)" />
        </View>
      </View>
      <Text
        style={{
          color: "rgba(162,155,254,0.75)",
          fontSize: 9,
          fontWeight: "700" as const,
          letterSpacing: 1,
          textAlign: "center" as const,
          textTransform: "uppercase" as const,
        }}
      >
        {medal.name}
      </Text>
    </View>
  );
}

interface Props {
  medals: Medal[];
}

export function MedalWall({ medals }: Props) {
  if (medals.length === 0) {
    return (
      <Text style={{ color: "rgba(162,155,254,0.4)", fontSize: 12, textAlign: "center" }}>
        No medals yet — keep rising!
      </Text>
    );
  }
  return (
    <View style={styles.row}>
      {medals.map((medal) => (
        <HexMedal key={medal.id} medal={medal} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 28,
    justifyContent: "center",
    paddingVertical: 4,
  },
});
