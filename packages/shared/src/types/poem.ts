import type { PoemGenre, RhymeDictType } from "../constants/index.js";

/** 诗词作品元数据（数据库、API 传输） */
export interface PoemMeta {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  genre: PoemGenre;
  rhymeDictType: RhymeDictType;
  templateId: string;
  variantId?: string;
  text: string;
  complianceRate: number;
  isCompliant: boolean;
  createdAt: string;
}

/** 分析请求参数 */
export interface AnalyzeRequest {
  text: string;
  templateId: string;
  rhymeDictType: RhymeDictType;
  variantId?: string;
  genre?: PoemGenre;
}
