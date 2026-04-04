import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, Animated, Dimensions, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { getMockSeats, LISTENER_EMOJIS, ROOMS, type RoomSeat } from "@/lib/roomData";
import { voiceService } from "@/services/agoraService";

const { width: SCREEN_W } = Dimensions.get("window");
const SEAT_AREA = Math.min(SCREEN_W - 40, 300);
const CENTER = SEAT_AREA / 2;
const RING_RADIUS = SEAT_AREA * 0.365;
const SEAT_SIZE = 60;
const HOST_SIZE = 78;
const isWeb = Platform.OS === "web";

function getSeatPos(i: number) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 8;
  return {
    x: CENTER + RING_RADIUS * Math.cos(angle) - SEAT_SIZE / 2,
    y: CENTER + RING_RADIUS * Math.sin(angle) - SEAT_SIZE / 2,
  };
}

// ── Pulsing speaking-ring animation ──────────────────────────────────────────
function PulsingRing({ color, size }: { color: string; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.25, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.12, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [opacity, scale]);

  const D = size + 16;
  return (
    <Animated.View
      style={{
        position: "absolute",
        width: D, height: D, borderRadius: D / 2,
        borderWidth: 2.5, borderColor: color,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// ── Second outer ring (slower) ───────────────────────────────────────────────
function OuterRing({ color, size }: { color: string; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.45, duration: 1100, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0,  duration: 1100, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.0, duration: 1100, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.45,duration: 1100, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [opacity, scale]);

  const D = size + 16;
  return (
    <Animated.View
      style={{
        position: "absolute",
        width: D, height: D, borderRadius: D / 2,
        borderWidth: 1.5, borderColor: color,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// ── Single seat ───────────────────────────────────────────────────────────────
function SeatView({ seat, onPress }: { seat: RoomSeat; onPress: (s: RoomSeat) => void }) {
  const size = seat.isHost ? HOST_SIZE : SEAT_SIZE;
  const glowColor = seat.isHost ? "#FFD700" : "#6C5CE7";
  const speakColor = seat.isHost ? "#FFD700" : "#00e676";
  const borderColor = seat.isHost
    ? "#FFD700"
    : seat.userId ? "#6C5CE7" : "rgba(255,255,255,0.13)";

  return (
    <TouchableOpacity
      onPress={() => onPress(seat)}
      style={{ alignItems: "center", justifyContent: "center" }}
      activeOpacity={0.75}
    >
      {seat.isSpeaking && !seat.isMuted && (
        <>
          <PulsingRing color={speakColor} size={size} />
          <OuterRing  color={speakColor} size={size} />
        </>
      )}

      <View
        style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: seat.userId
            ? "rgba(108,92,231,0.14)"
            : "rgba(255,255,255,0.03)",
          borderWidth: seat.userId ? 2.5 : 1.5,
          borderColor,
          borderStyle: seat.userId ? "solid" : "dashed",
          alignItems: "center", justifyContent: "center",
          shadowColor: seat.userId ? glowColor : "transparent",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.55, shadowRadius: 10,
        }}
      >
        {seat.userId ? (
          <Text style={{ fontSize: seat.isHost ? 32 : 24 }}>{seat.emoji}</Text>
        ) : (
          <Ionicons name="add" size={18} color="rgba(255,255,255,0.18)" />
        )}

        {/* Muted badge */}
        {seat.userId && seat.isMuted && (
          <View style={S.mutedBadge}>
            <Ionicons name="mic-off" size={8} color="#fff" />
          </View>
        )}

        {/* Host crown */}
        {seat.isHost && (
          <View style={{ position: "absolute", top: -14, alignItems: "center" }}>
            <Text style={{ fontSize: 14 }}>👑</Text>
          </View>
        )}
      </View>

      {seat.userId && (
        <Text
          style={{
            color: seat.isHost ? "#FFD700" : "rgba(255,255,255,0.75)",
            fontSize: 9, fontWeight: "700", marginTop: 5,
            maxWidth: size + 14, textAlign: "center",
          }}
          numberOfLines={1}
        >
          {seat.displayName}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function VoiceRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const room = ROOMS.find(r => r.id === id) ?? ROOMS[0];
  const [seats, setSeats] = useState<RoomSeat[]>(() => getMockSeats(room.id, room.host));
  const [isMuted, setIsMuted] = useState(true);
  const [listenerCount, setListenerCount] = useState(room.listeners);
  const micScale = useRef(new Animated.Value(1)).current;

  const hostSeat     = seats[0];
  const speakerSeats = seats.slice(1);

  // Agora init + listener ticker
  useEffect(() => {
    voiceService.initialize().then(ok => {
      if (ok) voiceService.joinChannel(room.channel, Math.floor(Math.random() * 99999));
    });
    const t = setInterval(() => {
      setListenerCount(n => Math.max(0, n + Math.floor(Math.random() * 3 - 1)));
    }, 4000);
    return () => { clearInterval(t); voiceService.leaveChannel(); };
  }, [room.channel]);

  const animateMic = () => {
    Animated.sequence([
      Animated.timing(micScale, { toValue: 0.88, duration: 90, useNativeDriver: true }),
      Animated.timing(micScale, { toValue: 1.0,  duration: 90, useNativeDriver: true }),
    ]).start();
  };

  const toggleMic = () => {
    animateMic();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = !isMuted;
    setIsMuted(next);
    voiceService.toggleMute(next);
  };

  const handleLeave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    voiceService.leaveChannel();
    router.back();
  };

  const handleSeatPress = useCallback((seat: RoomSeat) => {
    Haptics.selectionAsync();
    if (seat.isHost) return;
    if (seat.userId) {
      Alert.alert(seat.displayName!, "What would you like to do?", [
        { text: "Cancel", style: "cancel" },
        { text: "Follow ✨",           onPress: () => {} },
        { text: "Invite to Collab 🎙", onPress: () => {} },
        { text: "Gift 🎁",             onPress: () => {} },
      ]);
    } else {
      Alert.alert("🎙 Request Seat", "Join the room as a speaker?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request to Speak",
          onPress: () => {
            setSeats(prev =>
              prev.map(s =>
                s.id === seat.id
                  ? { ...s, userId: "me", displayName: "You", emoji: "👤", isMuted: true, isSpeaking: false }
                  : s
              )
            );
          },
        },
      ]);
    }
  }, []);

  return (
    <View style={S.page}>
      <LinearGradient colors={["#050112", "#0d0420", "#1a0b2e"]} style={StyleSheet.absoluteFill} />

      {/* Nebula orbs */}
      <View style={[S.orb, { top: 50,  right: -70, width: 240, height: 240, backgroundColor: "rgba(108,92,231,0.11)" }]} />
      <View style={[S.orb, { top: 330, left: -90,  width: 210, height: 210, backgroundColor: "rgba(162,155,254,0.06)" }]} />
      <View style={[S.orb, { bottom: 120, right: -50, width: 190, height: 190, backgroundColor: "rgba(108,92,231,0.09)" }]} />

      {/* ── HEADER ── */}
      <View style={[S.header, { paddingTop: isWeb ? 56 : insets.top + 6 }]}>
        <TouchableOpacity onPress={handleLeave} style={S.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={S.roomTitle} numberOfLines={1}>{room.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
            <View style={S.livePill}>
              <View style={S.liveDot} />
              <Text style={S.liveLabel}>LIVE</Text>
            </View>
            <Ionicons name="headset" size={11} color="rgba(162,155,254,0.55)" />
            <Text style={S.listenerText}>{listenerCount.toLocaleString()} listening</Text>
          </View>
        </View>

        <TouchableOpacity style={S.iconBtn} onPress={() => Haptics.selectionAsync()}>
          <Ionicons name="share-social-outline" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <TouchableOpacity style={S.iconBtn} onPress={() => Haptics.selectionAsync()}>
          <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>

        {/* ── SEAT ARENA ── */}
        <View style={S.arenaWrapper}>
          {/* Arena background glow */}
          <View style={S.arenaBg} />
          {/* Subtle dashed ring guide */}
          <View style={[S.ringGuide, {
            left: CENTER - RING_RADIUS - 6,
            top:  CENTER - RING_RADIUS - 6,
            width: (RING_RADIUS + 6) * 2,
            height:(RING_RADIUS + 6) * 2,
            borderRadius: RING_RADIUS + 6,
          }]} />

          {/* Seat container */}
          <View style={{ width: SEAT_AREA, height: SEAT_AREA, position: "relative" }}>
            {/* Host — center */}
            <View style={{
              position: "absolute",
              left: CENTER - HOST_SIZE / 2,
              top:  CENTER - HOST_SIZE / 2,
            }}>
              <SeatView seat={hostSeat} onPress={handleSeatPress} />
            </View>

            {/* 8 Speaker seats */}
            {speakerSeats.map((seat, i) => {
              const pos = getSeatPos(i);
              return (
                <View key={seat.id} style={{ position: "absolute", left: pos.x, top: pos.y }}>
                  <SeatView seat={seat} onPress={handleSeatPress} />
                </View>
              );
            })}
          </View>
        </View>

        {/* Tags + description */}
        <View style={S.metaRow}>
          <View style={[S.tagPill, { borderColor: `${room.tagColor}55`, backgroundColor: `${room.tagColor}18` }]}>
            <Text style={[S.tagText, { color: room.tagColor }]}>{room.tag}</Text>
          </View>
          <Text style={S.descText} numberOfLines={2}>{room.description}</Text>
        </View>

        <View style={S.divider} />

        {/* Listeners */}
        <View style={S.listenersSection}>
          <Text style={S.listenersSectionTitle}>
            👥  {listenerCount.toLocaleString()} Listeners
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {LISTENER_EMOJIS.map((emoji, i) => (
              <TouchableOpacity key={i} onPress={() => Haptics.selectionAsync()} style={S.listenerBubble}>
                <Text style={{ fontSize: 18 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            <View style={[S.listenerBubble, { backgroundColor: "rgba(255,255,255,0.04)" }]}>
              <Text style={{ color: "rgba(162,155,254,0.5)", fontSize: 9, fontWeight: "700" }}>
                +{Math.max(0, listenerCount - LISTENER_EMOJIS.length)}
              </Text>
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── BOTTOM CONTROLS ── */}
      <View style={[S.bottomBar, { paddingBottom: isWeb ? 18 : insets.bottom + 10 }]}>
        {/* Settings */}
        <TouchableOpacity style={S.sideControl} onPress={() => Haptics.selectionAsync()}>
          <View style={S.sideIconBg}>
            <Ionicons name="settings-outline" size={19} color="rgba(162,155,254,0.7)" />
          </View>
          <Text style={S.sideLabel}>Settings</Text>
        </TouchableOpacity>

        {/* MIC — centre */}
        <TouchableOpacity onPress={toggleMic} activeOpacity={0.82}>
          <Animated.View style={{ transform: [{ scale: micScale }] }}>
            <LinearGradient
              colors={isMuted ? ["#1c0d40", "#120829"] : ["#7b6cf6", "#5a4fd4"]}
              style={S.micBtn}
            >
              <Ionicons
                name={isMuted ? "mic-off" : "mic"}
                size={28}
                color={isMuted ? "rgba(255,255,255,0.32)" : "#fff"}
              />
            </LinearGradient>
            <Text style={[S.micLabel, { color: isMuted ? "rgba(255,255,255,0.28)" : "#A29BFE" }]}>
              {isMuted ? "Muted" : "Speaking"}
            </Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Leave */}
        <TouchableOpacity style={S.sideControl} onPress={handleLeave}>
          <View style={[S.sideIconBg, { backgroundColor: "rgba(255,100,130,0.1)", borderColor: "rgba(255,100,130,0.2)" }]}>
            <Ionicons name="exit-outline" size={19} color="#ff6482" />
          </View>
          <Text style={[S.sideLabel, { color: "#ff6482" }]}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  page:       { flex: 1, backgroundColor: "#050112" },
  orb:        { position: "absolute", borderRadius: 999 },
  header:     {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  iconBtn:    {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  roomTitle:  { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: -0.3 },
  livePill:   {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#0d2318", borderRadius: 10,
    paddingVertical: 2, paddingHorizontal: 7,
    borderWidth: 1, borderColor: "#00e676",
  },
  liveDot:    { width: 5, height: 5, borderRadius: 3, backgroundColor: "#00e676" },
  liveLabel:  { color: "#00e676", fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  listenerText: { color: "rgba(162,155,254,0.55)", fontSize: 11 },

  arenaWrapper: { alignItems: "center", paddingTop: 26, paddingBottom: 6, position: "relative" },
  arenaBg:    {
    position: "absolute", width: SEAT_AREA + 40, height: SEAT_AREA + 40,
    borderRadius: (SEAT_AREA + 40) / 2,
    backgroundColor: "rgba(108,92,231,0.05)",
    borderWidth: 1, borderColor: "rgba(108,92,231,0.1)",
    top: 6,
  },
  ringGuide:  {
    position: "absolute",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.045)",
    borderStyle: "dashed",
  },

  metaRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, marginBottom: 14 },
  tagPill:   { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
  tagText:   { fontSize: 11, fontWeight: "700" },
  descText:  { color: "rgba(255,255,255,0.32)", fontSize: 12, flex: 1, lineHeight: 17 },
  divider:   { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 20 },

  listenersSection:     { paddingHorizontal: 20, paddingTop: 18 },
  listenersSectionTitle:{ color: "rgba(162,155,254,0.55)", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  listenerBubble:       {
    width: 40, height: 40, borderRadius: 20, marginRight: 8,
    backgroundColor: "rgba(108,92,231,0.1)",
    borderWidth: 1, borderColor: "rgba(108,92,231,0.18)",
    alignItems: "center", justifyContent: "center",
  },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-around",
    paddingTop: 14, paddingHorizontal: 20,
    backgroundColor: "rgba(5,1,18,0.94)",
    borderTopWidth: 1, borderTopColor: "rgba(108,92,231,0.14)",
  },
  sideControl: { alignItems: "center", gap: 5, minWidth: 64 },
  sideIconBg:  {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center", justifyContent: "center",
  },
  sideLabel:  { color: "rgba(255,255,255,0.38)", fontSize: 10, fontWeight: "600" },
  micBtn:     {
    width: 66, height: 66, borderRadius: 33,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#6C5CE7", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 14,
  },
  micLabel:   { textAlign: "center", fontSize: 10, fontWeight: "600", marginTop: 6 },
  mutedBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#050112",
  },
});
