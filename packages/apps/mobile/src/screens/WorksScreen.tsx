import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton } from "../components/AppButton";
import { ScreenFrame } from "../components/ScreenFrame";
import type { PoemCreationDraftSummary } from "../persist";
import { appColors } from "../theme/colors";
import { formatDraftTime } from "../utils/draft";

export function WorksScreen({
  drafts,
  onBack,
  onOpenDraft,
  onDeleteDraft,
}: {
  drafts: PoemCreationDraftSummary[];
  onBack: () => void;
  onOpenDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return drafts;
    return drafts.filter((draft) =>
      [draft.title, draft.author, draft.selectedTune, draft.selectedVariant]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [drafts, query]);

  return (
    <ScreenFrame title="作品夹" subtitle="本机草稿都在这里，后续可以把这个 store 接到同步服务。">
      <View style={styles.panel}>
        <TextInput
          placeholder="搜索标题、署名或模板"
          placeholderTextColor={appColors.muted}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          onChangeText={setQuery}
        />
        {drafts.length === 0 ? <Text style={styles.empty}>暂无旧作</Text> : null}
        {drafts.length > 0 && filtered.length === 0 ? (
          <Text style={styles.empty}>无匹配作品</Text>
        ) : null}
        {filtered.map((draft) => (
          <View key={draft.id} style={styles.item}>
            <Pressable style={styles.itemMain} onPress={() => onOpenDraft(draft.id)}>
              <Text style={styles.itemTitle}>{draft.title || "未题"}</Text>
              <Text style={styles.itemMeta}>
                {draft.author || "佚名"} · {draft.selectedTune || "未选模板"}
              </Text>
              <Text style={styles.itemTime}>{formatDraftTime(draft.updatedAt)}</Text>
            </Pressable>
            <AppButton
              label="删除"
              variant="danger"
              onPress={() => onDeleteDraft(draft.id)}
            />
          </View>
        ))}
        <AppButton label="返回" onPress={onBack} />
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
    padding: 16,
  },
  input: {
    borderColor: appColors.cellBorder,
    borderWidth: 1,
    color: appColors.ink,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  empty: {
    color: appColors.muted,
    fontSize: 15,
    paddingVertical: 12,
  },
  item: {
    borderColor: appColors.line,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 12,
  },
  itemMain: {
    gap: 4,
  },
  itemTitle: {
    color: appColors.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  itemMeta: {
    color: appColors.muted,
    fontSize: 14,
  },
  itemTime: {
    color: appColors.muted,
    fontSize: 12,
  },
});
