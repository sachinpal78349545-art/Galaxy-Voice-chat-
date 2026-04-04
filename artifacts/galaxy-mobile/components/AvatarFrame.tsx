import React, { useEffect, useRef } from "react";
import { View, Text, Image, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  photoURL: string | null;
  frameTitle: string;
  isLive: boolean;
  size?: number;
}

export function AvatarFrame({ photoURL, frameTitle, isLive, size = 120 }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.55)).current;
  const liveOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.07, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    if (isLive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(liveOpacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
          Animated.timing(liveOpacity, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  const OUTER = size + 44;
  const MID = size + 24;
  const INNER = size + 10;

  const ornaments = [
    { top: -5, left: OUTER / 2 - 5 },
    { bottom: -5, left: OUTER / 2 - 5 },
    { left: -5, top: OUTER / 2 - 5 },
    { right: -5, top: OUTER / 2 - 5 },
  ];

  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      {/* Arc-style frame title */}
      <Text
        style={{
          fontSize: 8,
          fontWeight: "700" as const,
          letterSpacing: 6,
          color: "rgba(162,155,254,0.65)",
          textTransform: "uppercase",
          marginBottom: -4,
        }}
      >
        {frameTitle}
      </Text>

      <View style={{ width: OUTER, height: OUTER, alignItems: "center", justifyContent: "center" }}>
        {/* Outer ambient glow ring — animated */}
        <Animated.View
          style={{
            position: "absolute",
            width: OUTER,
            height: OUTER,
            borderRadius: OUTER / 2,
            borderWidth: 1.5,
            borderColor: "#6C5CE7",
            opacity: glowOpacity,
            transform: [{ scale: pulse }],
            ...styles.glow,
          }}
        />

        {/* Diamond ornaments at cardinal points */}
        {ornaments.map((pos, i) => (
          <View
            key={i}
            style={[
              {
                position: "absolute",
                width: 9,
                height: 9,
                borderRadius: 1.5,
                backgroundColor: "#A29BFE",
                transform: [{ rotate: "45deg" }],
                zIndex: 5,
              },
              pos,
            ]}
          />
        ))}

        {/* Middle dashed ring */}
        <View
          style={{
            position: "absolute",
            width: MID,
            height: MID,
            borderRadius: MID / 2,
            borderWidth: 1,
            borderColor: "rgba(108,92,231,0.4)",
            borderStyle: "dashed",
          }}
        />

        {/* Inner glowing ring */}
        <View
          style={{
            position: "absolute",
            width: INNER,
            height: INNER,
            borderRadius: INNER / 2,
            borderWidth: 2.5,
            borderColor: "#6C5CE7",
            ...styles.innerGlow,
          }}
        />

        {/* Avatar circle */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: "#1a0b2e",
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {photoURL ? (
            <Image
              source={{ uri: photoURL }}
              style={{ width: size, height: size }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="person"
              size={size * 0.5}
              color="rgba(162,155,254,0.4)"
            />
          )}
        </View>
      </View>

      {/* LIVE badge */}
      {isLive ? (
        <View style={styles.liveBadge}>
          <Animated.View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: "#00e676",
              opacity: liveOpacity,
            }}
          />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 6,
  },
  innerGlow: {
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0e2a18",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#00e676",
    marginTop: 2,
    shadowColor: "#00e676",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 4,
  },
  liveText: {
    color: "#00e676",
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 2.5,
  },
});
