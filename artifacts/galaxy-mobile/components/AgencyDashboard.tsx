import React, { useRef, useEffect } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CircleProps {
  value: number;
  max: number;
  color: string;
  label: string;
  sublabel: string;
  size?: number;
}

export function CircleProgress({ value, max, color, label, sublabel, size = 88 }: CircleProps) {
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;

  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        {/* Background track */}
        <View
          style={{
            position: "absolute",
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
            borderWidth: 7,
            borderColor: "rgba(255,255,255,0.06)",
          }}
        />
        {/* Progress arc using a rotated clipped view */}
        <View
          style={{
            position: "absolute",
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
            borderWidth: 7,
            borderColor: color,
            borderRightColor: pct < 0.75 ? "transparent" : color,
            borderBottomColor: pct < 0.5 ? "transparent" : color,
            borderLeftColor: pct < 0.25 ? "transparent" : color,
            transform: [{ rotate: "-90deg" }],
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 6,
          }}
        />
        {/* Center text */}
        <View style={{ position: "absolute", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "800" as const, fontSize: 17, lineHeight: 20 }}>
            {value}
          </Text>
          <Text style={{ color: "rgba(162,155,254,0.45)", fontSize: 8, marginTop: 1 }}>
            {sublabel}
          </Text>
        </View>
      </View>
      <Text style={{ color: "rgba(162,155,254,0.7)", fontSize: 10, textAlign: "center" as const, fontWeight: "600" as const }}>
        {label}
      </Text>
    </View>
  );
}

interface DashboardProps {
  agencyName: string;
  agencyBadge?: string;
  rank?: string;
  monthlyBeans: number;
  targetBeans: number;
  validDays: number;
  targetDays: number;
  liveHours: number;
  targetHours: number;
}

export function AgencyDashboard({
  agencyName, agencyBadge = "🏢", rank = "Gold Agency",
  monthlyBeans, targetBeans, validDays, targetDays, liveHours, targetHours,
}: DashboardProps) {
  return (
    <View style={{ gap: 16 }}>
      {/* Identity */}
      <View style={styles.identityCard}>
        <Text style={styles.badge}>{agencyBadge}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.agencyName}>{agencyName}</Text>
          <View style={styles.rankRow}>
            <View style={styles.rankPill}>
              <Text style={styles.rankText}>{rank}</Text>
            </View>
            <View style={[styles.rankPill, { borderColor: "rgba(0,200,200,0.3)", backgroundColor: "rgba(0,200,200,0.08)" }]}>
              <Ionicons name="star" size={10} color="#00CEC9" />
              <Text style={[styles.rankText, { color: "#00CEC9" }]}>Host 4.8</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Circles row */}
      <View style={styles.circlesRow}>
        <CircleProgress
          value={monthlyBeans}
          max={targetBeans}
          color="#FFD700"
          label="Monthly Beans"
          sublabel="beans"
          size={90}
        />
        <CircleProgress
          value={validDays}
          max={targetDays}
          color="#00e676"
          label="Valid Days"
          sublabel="days"
          size={90}
        />
        <CircleProgress
          value={liveHours}
          max={targetHours}
          color="#7df9ff"
          label="Live Hours"
          sublabel="hours"
          size={90}
        />
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryLabel}>Beans remaining</Text>
          <Text style={[styles.summaryVal, { color: "#FFD700" }]}>
            {Math.max(0, targetBeans - monthlyBeans).toLocaleString()}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" as const }}>
          <Text style={styles.summaryLabel}>Hours remaining</Text>
          <Text style={[styles.summaryVal, { color: "#7df9ff" }]}>
            {Math.max(0, targetHours - liveHours)}h
          </Text>
        </View>
      </View>

      {/* Salary bar */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.summaryLabel}>Salary Progress</Text>
          <Text style={[styles.summaryLabel, { color: "#FFD700" }]}>
            {monthlyBeans.toLocaleString()} / {targetBeans.toLocaleString()}
          </Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(100, (monthlyBeans / targetBeans) * 100)}%` as any },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(108,92,231,0.08)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.2)",
  },
  badge: { fontSize: 36 },
  agencyName: {
    color: "#fff",
    fontWeight: "800" as const,
    fontSize: 16,
    marginBottom: 6,
  },
  rankRow: { flexDirection: "row", gap: 8 },
  rankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "rgba(108,92,231,0.15)",
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.3)",
  },
  rankText: { color: "#A29BFE", fontSize: 10, fontWeight: "700" as const },
  circlesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  summaryLabel: { color: "rgba(162,155,254,0.5)", fontSize: 11 },
  summaryVal: { fontWeight: "800" as const, fontSize: 16, marginTop: 2 },
  barTrack: {
    height: 8,
    backgroundColor: "rgba(255,215,0,0.07)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 4,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
});
