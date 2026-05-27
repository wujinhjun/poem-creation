import { StyleSheet, Text, TextInput, View } from "react-native";
import type { RhymeDict, Tone, ToneConstraint } from "@poem/parser/kernel";

import { AppButton } from "../components/AppButton";
import { RnComposer } from "../components/RnComposer";
import { ScreenFrame } from "../components/ScreenFrame";
import type { Genre } from "../constants/poem";
import { appColors } from "../theme/colors";

export function EditorScreen({
  activeDraftId,
  genre,
  selectedTune,
  selectedVariantLabel,
  title,
  description,
  author,
  chars,
  pattern,
  dict,
  expectedRhymeTone,
  visualLineGroups,
  sectionBreakBeforeGroups,
  analyzeResult,
  templateMessage,
  onBack,
  onTitleChange,
  onDescriptionChange,
  onAuthorChange,
  onCharsChange,
  onAnalyze,
}: {
  activeDraftId: string;
  genre: Genre;
  selectedTune: string;
  selectedVariantLabel: string;
  title: string;
  description: string;
  author: string;
  chars: string[][];
  pattern: ToneConstraint[][];
  dict: RhymeDict | null;
  expectedRhymeTone: Tone | null;
  visualLineGroups: number[][];
  sectionBreakBeforeGroups: number[];
  analyzeResult: string;
  templateMessage: string;
  onBack: () => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onCharsChange: (chars: string[][]) => void;
  onAnalyze: (chars?: string[][]) => void;
}) {
  return (
    <ScreenFrame
      title="编辑"
      subtitle={`${genre === "meter" ? "诗" : "词"} · ${selectedTune || "未选模板"} · ${selectedVariantLabel || "未选变体"}`}
    >
      <View style={styles.paper}>
        <TextInput
          value={title}
          placeholder="未题"
          placeholderTextColor={appColors.muted}
          style={styles.titleInput}
          textAlign="center"
          onChangeText={onTitleChange}
        />
        <TextInput
          value={description}
          placeholder="题记、说明或备注"
          placeholderTextColor={appColors.muted}
          style={styles.descriptionInput}
          textAlign="center"
          onChangeText={onDescriptionChange}
        />
        <TextInput
          value={author}
          placeholder="佚名"
          placeholderTextColor={appColors.muted}
          style={styles.authorInput}
          textAlign="right"
          onChangeText={onAuthorChange}
        />

        {pattern.length === 0 ? (
          <Text style={styles.empty}>
            {templateMessage || "未找到格律，请返回重新选择。"}
          </Text>
        ) : (
          <RnComposer
            key={`${activeDraftId}:${selectedTune}:${selectedVariantLabel}`}
            pattern={pattern}
            dict={dict}
            expectedRhymeTone={expectedRhymeTone}
            visualLineGroups={visualLineGroups}
            sectionBreakBeforeGroups={sectionBreakBeforeGroups}
            initialChars={chars}
            onChange={onCharsChange}
            onComplete={onAnalyze}
          />
        )}

        <View style={styles.actions}>
          <AppButton label="返回" onPress={onBack} />
          <AppButton label="分析" variant="primary" onPress={() => onAnalyze()} />
        </View>
        {analyzeResult ? <Text style={styles.result}>{analyzeResult}</Text> : null}
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: appColors.paperSoft,
    borderColor: appColors.line,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
    padding: 16,
  },
  titleInput: {
    color: appColors.ink,
    fontSize: 28,
    fontWeight: "700",
    minHeight: 46,
  },
  descriptionInput: {
    color: appColors.muted,
    fontSize: 15,
    minHeight: 40,
  },
  authorInput: {
    color: appColors.ink,
    fontSize: 16,
    minHeight: 38,
  },
  empty: {
    color: appColors.muted,
    fontSize: 15,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingTop: 8,
  },
  result: {
    color: appColors.ink,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
