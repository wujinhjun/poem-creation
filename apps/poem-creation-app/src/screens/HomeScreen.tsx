import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  createEmptyEditorGrid,
  lineEndsWithRhyme,
  type EditorConstraint,
} from "@poem/shared";

import { appColors } from "../theme/colors";

const demoPattern: EditorConstraint[][] = [
  [
    { type: "fixed", tone: "平" },
    { type: "fixed", tone: "仄" },
    { type: "fixed", tone: "平" },
    { type: "fixed", tone: "平" },
    { type: "rhyme" },
  ],
  [
    { type: "fixed", tone: "仄" },
    { type: "fixed", tone: "平" },
    { type: "fixed", tone: "平" },
    { type: "fixed", tone: "仄" },
    { type: "rhyme" },
  ],
];

const demoGrid = createEmptyEditorGrid(demoPattern);

export function HomeScreen() {
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>Poem Creation App</Text>
        <Text style={styles.title}>诗词创作</Text>
        <Text style={styles.subtitle}>
          RN 包已接入共享编辑器核心，后续可以把 Web Composer 的交互迁移到原生
          TextInput 与触控字格。
        </Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>同构编辑器占位</Text>
          <Text style={styles.panelNote}>@poem/shared</Text>
        </View>

        {demoPattern.map((line, lineIndex) => (
          <View key={lineIndex} style={styles.line}>
            {line.map((constraint, colIndex) => (
              <View key={`${lineIndex}-${colIndex}`} style={styles.slotWrap}>
                <Text
                  style={[
                    styles.tone,
                    lineEndsWithRhyme(line) && colIndex === line.length - 1
                      ? styles.rhymeTone
                      : null,
                  ]}
                >
                  {constraint.type === "fixed" ? constraint.tone : "韵"}
                </Text>
                <Pressable style={styles.slot}>
                  <Text style={styles.slotText}>
                    {demoGrid[lineIndex][colIndex]}
                  </Text>
                </Pressable>
              </View>
            ))}
            <Text style={styles.punctuation}>
              {lineEndsWithRhyme(line) ? "。" : "，"}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: 24,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  hero: {
    borderColor: appColors.line,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    backgroundColor: appColors.paperSoft,
  },
  kicker: {
    color: appColors.muted,
    fontSize: 13,
    marginBottom: 10,
  },
  title: {
    color: appColors.ink,
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: 0,
  },
  subtitle: {
    color: appColors.muted,
    fontSize: 16,
    lineHeight: 25,
    marginTop: 14,
  },
  panel: {
    borderColor: appColors.line,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    backgroundColor: appColors.paperSoft,
  },
  panelHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  panelTitle: {
    color: appColors.ink,
    fontSize: 22,
    fontWeight: "600",
  },
  panelNote: {
    color: appColors.muted,
    fontSize: 13,
  },
  line: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  slotWrap: {
    alignItems: "center",
    gap: 4,
  },
  tone: {
    color: appColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rhymeTone: {
    color: appColors.cinnabar,
  },
  slot: {
    alignItems: "center",
    borderColor: appColors.cellBorder,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  slotText: {
    color: appColors.ink,
    fontSize: 24,
  },
  punctuation: {
    color: appColors.cinnabar,
    fontSize: 18,
    lineHeight: 40,
    paddingLeft: 2,
  },
});
