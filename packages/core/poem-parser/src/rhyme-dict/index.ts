/**
 * 韵书接口 —— 由 @poem/shared 拥有，本模块 re-export 保持调用方接口稳定。
 *
 * 调用方实现 RhymeDict 接口；@poem/rhyme-book 提供 Node JSON 实现。
 *
 * @module rhyme-dict
 */

export type { RhymeDict, RhymeEntry } from "@poem/shared";
