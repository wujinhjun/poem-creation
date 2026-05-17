import { Pressable, StyleSheet, Text } from "react-native";

import { appColors } from "../theme/colors";

export function AppButton({
  label,
  variant = "secondary",
  disabled = false,
  onPress,
}: {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      style={[
        styles.button,
        variant === "primary" ? styles.primary : null,
        variant === "danger" ? styles.danger : null,
        disabled ? styles.disabled : null,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.text,
          variant === "primary" ? styles.primaryText : null,
          variant === "danger" ? styles.dangerText : null,
          disabled ? styles.disabledText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: appColors.cellBorder,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: "#5f3928",
    borderColor: "#5f3928",
  },
  danger: {
    borderColor: appColors.cinnabar,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    color: appColors.ink,
    fontSize: 16,
    fontWeight: "600",
  },
  primaryText: {
    color: "#fffaf0",
  },
  dangerText: {
    color: appColors.cinnabar,
  },
  disabledText: {
    color: appColors.muted,
  },
});
