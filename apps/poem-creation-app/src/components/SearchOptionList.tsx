import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { appColors } from "../theme/colors";

export type OptionItem = {
  value: string;
  label: string;
};

export function SearchOptionList({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: OptionItem[];
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(keyword),
    );
  }, [options, query]);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={appColors.muted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        onChangeText={setQuery}
      />
      <Text style={styles.count}>
        {query.trim()
          ? `匹配 ${filtered.length} 项 / 共 ${options.length} 项`
          : `共 ${options.length} 项`}
      </Text>
      {selectedLabel ? (
        <Text style={styles.selected}>已选：{selectedLabel}</Text>
      ) : null}
      <ScrollView style={styles.list} nestedScrollEnabled>
        {filtered.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.option, value === option.value ? styles.active : null]}
            onPress={() => onChange(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                value === option.value ? styles.activeText : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 8,
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
    minHeight: 44,
    paddingHorizontal: 12,
  },
  selected: {
    color: appColors.muted,
    fontSize: 13,
  },
  count: {
    color: appColors.muted,
    fontSize: 12,
  },
  list: {
    maxHeight: 260,
  },
  option: {
    borderColor: appColors.line,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  active: {
    backgroundColor: "#5f3928",
    borderColor: "#5f3928",
  },
  optionText: {
    color: appColors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  activeText: {
    color: "#fffaf0",
  },
});
