import React from "react";
import { View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  style?: ViewStyle;
  children: React.ReactNode;
  noPadding?: boolean;
}

export function GlassCard({ style, children, noPadding }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderWidth: 1,
          borderColor: colors.border,
          padding: noPadding ? 0 : 16,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
