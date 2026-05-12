import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RhymeDictType } from "@poem/parser/kernel";

import { AppButton } from "../components/AppButton";
import { SearchOptionList } from "../components/SearchOptionList";
import type { OptionItem } from "../components/SearchOptionList";
import { ScreenFrame } from "../components/ScreenFrame";
import type { Genre } from "../constants/poem";
import { RHYME_OPTIONS } from "../constants/poem";
import { appColors } from "../theme/colors";

export function EntryScreen({
  genre,
  selectedTune,
  selectedVariant,
  rhymeType,
  templateOptions,
  variantOptions,
  onBack,
  onGenreChange,
  onTuneChange,
  onVariantChange,
  onRhymeTypeChange,
  onStart,
}: {
  genre: Genre;
  selectedTune: string;
  selectedVariant: string;
  rhymeType: RhymeDictType;
  templateOptions: OptionItem[];
  variantOptions: OptionItem[];
  onBack: () => void;
  onGenreChange: (genre: Genre) => void;
  onTuneChange: (tune: string) => void;
  onVariantChange: (variant: string) => void;
  onRhymeTypeChange: (rhymeType: RhymeDictType) => void;
  onStart: () => void;
}) {
  return (
    <ScreenFrame title="选择格律" subtitle="先定体裁、模板和韵书，进入后再写标题、题记和正文。">
      <View style={styles.panel}>
        <View style={styles.segment}>
          <Pressable
            style={[styles.segmentItem, genre === "meter" ? styles.active : null]}
            onPress={() => onGenreChange("meter")}
          >
            <Text style={[styles.segmentText, genre === "meter" ? styles.activeText : null]}>
              诗
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentItem, genre === "ci" ? styles.active : null]}
            onPress={() => onGenreChange("ci")}
          >
            <Text style={[styles.segmentText, genre === "ci" ? styles.activeText : null]}>
              词
            </Text>
          </Pressable>
        </View>

        <SearchOptionList
          label="模板"
          value={selectedTune}
          placeholder="搜索模板"
          options={templateOptions}
          onChange={onTuneChange}
        />

        {variantOptions.length > 0 ? (
          <SearchOptionList
            label="变体"
            value={selectedVariant}
            placeholder="搜索变体"
            options={variantOptions}
            onChange={onVariantChange}
          />
        ) : null}

        <View style={styles.rhymeBlock}>
          <Text style={styles.label}>韵书</Text>
          <View style={styles.rhymeOptions}>
            {RHYME_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.rhymeOption,
                  rhymeType === option.value ? styles.rhymeActive : null,
                ]}
                onPress={() => onRhymeTypeChange(option.value)}
              >
                <Text
                  style={[
                    styles.rhymeText,
                    rhymeType === option.value ? styles.activeText : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <AppButton label="返回" onPress={onBack} />
          <AppButton
            label="进入编辑器"
            variant="primary"
            disabled={!selectedVariant}
            onPress={onStart}
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
    gap: 18,
    padding: 18,
  },
  segment: {
    borderColor: appColors.cellBorder,
    borderWidth: 1,
    flexDirection: "row",
  },
  segmentItem: {
    alignItems: "center",
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  active: {
    backgroundColor: "#5f3928",
  },
  segmentText: {
    color: appColors.ink,
    fontSize: 22,
    fontWeight: "700",
  },
  activeText: {
    color: "#fffaf0",
  },
  rhymeBlock: {
    gap: 8,
  },
  label: {
    color: appColors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  rhymeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  rhymeOption: {
    borderColor: appColors.cellBorder,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rhymeActive: {
    backgroundColor: "#5f3928",
  },
  rhymeText: {
    color: appColors.ink,
    fontSize: 15,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
  },
});
