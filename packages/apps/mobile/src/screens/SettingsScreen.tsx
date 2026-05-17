import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton } from "../components/AppButton";
import { ScreenFrame } from "../components/ScreenFrame";
import { appColors } from "../theme/colors";
import type { UserSettings } from "../utils/settings";

export function SettingsScreen({
  settings,
  onSave,
  onBack,
}: {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onBack: () => void;
}) {
  const [defaultAuthor, setDefaultAuthor] = useState(settings.defaultAuthor);

  return (
    <ScreenFrame title="设置" subtitle="这里放用户级默认值，不反向修改已有作品。">
      <View style={styles.panel}>
        <Text style={styles.label}>默认署名</Text>
        <TextInput
          value={defaultAuthor}
          placeholder="新作默认署名"
          placeholderTextColor={appColors.muted}
          style={styles.input}
          onChangeText={setDefaultAuthor}
        />
        <View style={styles.footer}>
          <AppButton label="返回" onPress={onBack} />
          <AppButton
            label="保存"
            variant="primary"
            onPress={() => onSave({ defaultAuthor })}
          />
        </View>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: appColors.paperSoft,
    borderColor: appColors.line,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 18,
  },
  label: {
    color: appColors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  input: {
    borderColor: appColors.cellBorder,
    borderWidth: 1,
    color: appColors.ink,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
  },
});
