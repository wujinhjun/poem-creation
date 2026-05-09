/**
 * @poem/parser/loader —— Node 环境数据加载器
 *
 * 从 JSON 文件构造 RhymeDict。
 * 仅依赖 fs/path，浏览器/Worker 不可用。
 */

export { createRhymeDict, clearRhymeCache } from "./rhyme-dict/loader.js";
