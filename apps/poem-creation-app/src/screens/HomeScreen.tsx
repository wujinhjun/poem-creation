import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "../components/AppButton";
import { ScreenFrame } from "../components/ScreenFrame";
import { appColors } from "../theme/colors";

export function HomeScreen({
  draftCount,
  onCreate,
  onWorks,
  onSettings,
}: {
  draftCount: number;
  onCreate: () => void;
  onWorks: () => void;
  onSettings: () => void;
}) {
  return (
    <ScreenFrame
      title="诗词创作"
      subtitle="从格律进入创作，旧作、默认署名和后续同步能力都在本地工作流中管理。"
    >
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>创作入口</Text>
        <View style={styles.actions}>
          <AppButton label="开始新作" variant="primary" onPress={onCreate} />
          <AppButton label={`作品夹（${draftCount}）`} onPress={onWorks} />
          <AppButton label="设置" onPress={onSettings} />
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
    gap: 18,
    padding: 18,
  },
  panelTitle: {
    color: appColors.ink,
    fontSize: 24,
    fontWeight: "700",
  },
  actions: {
    gap: 12,
  },
});
