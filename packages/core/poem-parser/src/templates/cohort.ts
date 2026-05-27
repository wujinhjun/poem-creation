/**
 * 韵组 cohort 构建。
 *
 * compact loader 与 analyzer pipeline 共用同一套规则，避免叶韵分组逻辑漂移。
 */

export interface RhymeCohortToken {
  tone: "ping" | "ze";
  xieyun: boolean;
}

export interface RhymeCohortSourceSlot {
  /** 行定位：[sectionIdx, lineIdx] */
  pos: [number, number];
  /** 韵脚 token 信息 */
  token: RhymeCohortToken;
}

export interface CohortedRhymeSlot extends RhymeCohortSourceSlot {
  /** 所属韵组 ID（同组韵脚必须互押） */
  cohortId: number;
}

/**
 * 从韵脚 token 序列构建 cohort 索引。
 *
 * 扫描规则（§1.5）：
 * 1. 首个韵脚 token 起第 1 组
 * 2. 带 + 修饰的 token 永远续上一组（叶韵）
 * 3. 裸 token 声调与上一 token 相同 → 续组
 * 4. 裸 token 声调与上一 token 相反 → 起新组
 */
export function buildCohortFromSlots(
  sourceSlots: RhymeCohortSourceSlot[],
): CohortedRhymeSlot[] {
  const slots: CohortedRhymeSlot[] = [];
  let cohortId = 0;
  let cohortTone: "ping" | "ze" | null = null;

  for (const slot of sourceSlots) {
    const { tone, xieyun } = slot.token;

    if (slots.length === 0) {
      cohortId = 1;
      cohortTone = tone;
    } else if (xieyun) {
      // + 修饰 → 永远续上一组，不改变 cohort 确立的声调
    } else if (tone === cohortTone) {
      // 裸 token 与 cohort 确立声调相同 → 续组
    } else {
      // 裸 token 与 cohort 确立声调不同 → 起新组
      cohortId += 1;
      cohortTone = tone;
    }

    slots.push({ ...slot, cohortId });
  }

  return slots;
}
