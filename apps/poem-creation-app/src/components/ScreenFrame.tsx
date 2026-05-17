import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";

import { appColors } from "../theme/colors";

export function ScreenFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: 18,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  header: {
    borderColor: appColors.line,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    backgroundColor: appColors.paperSoft,
  },
  title: {
    color: appColors.ink,
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 0,
  },
  subtitle: {
    color: appColors.muted,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
});
