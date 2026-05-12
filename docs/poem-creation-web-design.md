# 诗词创作 Web 设计说明

## 目标

诗词创作页的核心目标是保留「一格一字」的格律感，同时让实际输入接近日常文本编辑：

- 字位级展示平仄、可平可仄、韵脚状态。
- 支持中文输入法的组词输入。
- 支持从任意格开始补位输入，前面空格不被压缩。
- 支持整句、整首粘贴。
- 视觉上保持古朴、克制、工具化，不做营销页。
- 支持草稿持久化，刷新后恢复正在创作的内容。
- 支持多作品草稿列表，可以切换旧作或新建另一首。
- 编辑器核心逻辑可被后续 React Native 版本复用。

## 页面结构

页面分为三层：

- 顶部题头：宣纸底、墨色标题、朱色点缀，建立古籍/诗笺气质。
- 入口页左侧：本次编辑，选择体裁、模板、变体、韵书，并开始新作。
- 入口页右侧：作品列表，选择旧作或删除旧作。
- 编辑页左侧：返回入口、导出操作、当前格律摘要、图例。
- 编辑页右侧：标题、题记、署名、格律字位矩阵与分析按钮。

控制区和创作区使用边框、浅纸色背景和低对比阴影，避免卡片堆叠过重。

作品列表只在入口页展示，用于查看历史草稿、切换旧作和删除作品。本次编辑和作品列表分为并列两块，避免用户在编辑正文时被旧作列表打断。

进入编辑页后再编辑标题、说明和署名。标题、说明、署名属于作品内容的一部分，放在正文纸面上方，不放在侧边功能栏；它们不参与格律分析，但会进入草稿持久化。当前不强制填写，默认可以保持空标题、空说明和空署名。编辑页提供返回按钮，返回前会先保存当前作品。

## 路由设计

当前使用轻量 hash 路由，不引入额外路由库。静态化部署时所有请求都落在同一个 `index.html`，所以不能依赖真实 pathname：

- `#/`：入口页，负责选择本次编辑参数和展示作品列表。
- `#/edit/:draftId`：编辑页，按草稿 id 直接加载旧作。
- `#/settings`：设置页，维护用户级默认值。

进入新作或打开旧作时都会推入 `#/edit/:draftId`，返回按钮推回 `#/`。浏览器前进后退通过 `popstate` 重新读取路由；用户手动改 hash 时通过 `hashchange` 重新读取路由。如果目标草稿不存在，则回到入口页。

加载策略：

- 首次打开 `#/edit/:draftId` 时优先读取该 id 的草稿。
- 首次打开 `#/` 时只恢复最近激活草稿到内存状态，不直接进入编辑页。
- 从入口页打开旧作时，不保存当前编辑态，避免入口页的空模板状态覆盖目标旧作。
- 只有已经在编辑页时，新建、切换旧作或返回入口前才保存当前作品。

## 模板与变体选择

模板和变体选择发生在入口页，使用自定义下拉，而不是浏览器原生 `select`：

- 原生菜单样式不可控，和页面气质冲突。
- 词牌数量很多，必须支持搜索。
- 变体文案可能较长，需要稳定的换行和悬浮层宽度。

下拉交互：

- 模板、变体开启搜索。
- 韵书只有三个选项，保持普通下拉列表。
- 下拉通过文档级 `pointerdown` 判断外部点击关闭，避免搜索框聚焦时触发 blur 导致闪关。
- 搜索匹配 `label` 和 `value`，便于搜词牌名、作者、平起仄起、押韵等信息。

诗体变体文案刻意压缩，例如：

- `首句押韵 · 平起`
- `首句不押韵 · 仄起`

七律、五绝等信息已经在模板名中，不在变体里重复。

默认选择规则：

- 诗的默认韵书是平水韵。
- 词的默认韵书是词林正韵。
- 切换体裁会清空模板和变体，并同步切换该体裁默认韵书。
- 选择模板后自动选中第一个变体，减少用户进入编辑前的重复点击。

## 用户设置

设置页当前保存用户级默认署名：

- 存储位置：`localStorage`。
- key：`poem-creation-web:settings`。
- 新建作品时读取默认署名写入作品草稿。

设置页只处理用户默认值，不修改已有作品。已有作品的标题、说明、署名仍在编辑页单独保存。

## 填词输入模型

早期每格一个 `input`，问题是中文输入法组合会被切碎，粘贴也不自然。

当前实现为「格子展示 + 激活格真实输入」：

- 每个字位显示为格子按钮。
- 点击某格后，该格上方挂载一个真实 `input`。
- 输入法候选框跟随当前格，不再按整行文本错位。
- 输入完成后，把组合出的多个汉字从当前格开始依次写入后续格。
- 前面空格保持空着，实现补位输入。

示例：点击第 5 格输入 `收蓟北`，只写入第 5、6、7 格，第 1-4 格保持空。

键盘行为：

- 左右方向键移动当前格；在行首按左键会回到上一行最后一个已填字，没有已填字时回到上一行末格。
- 上下方向键移动到上一行/下一行的最后一个已填字；目标行还没写字时，才尽量保持当前列。
- Backspace：当前格有字则清当前格；当前格空则按左键规则退格。
- Delete：清当前格。
- 粘贴单行：从当前格开始补位。
- 粘贴多行：第一行从当前格开始，后续行从行首开始。

输入归一化会过滤常见标点、空格和换行。

输入流转：

- 当前行最后一格写入完成后，自动跳到下一行第一格。
- 整篇最后一格写入完成后，使用最新 grid 直接触发分析。
- 手动点击分析按钮仍然可用，和自动分析共用同一套分析逻辑。

词牌排版：

- 诗体按两句一视觉行展示，形成逗号句 + 句号句的常见阅读节奏。
- 词牌保留模板中的 section 信息，在下阕等后续 section 前增加一行视觉留白。
- `utils/ciTemplate.ts` 是词牌数据进入 UI 的桥梁层，会把完整词谱映射为 `CiPatternForEditor`。
- `CiPatternForEditor.lines` 仍是逐句 pattern，供 editor-core、校验和 grid 操作使用。
- `CiPatternForEditor.rhymeGroups` 是视觉行分组，非押韵句会和后续押韵句放在同一视觉行，只有押韵句之后才换行。
- `CiPatternForEditor.sectionBreaks` 是视觉组断点，用于在上下阕之间加留白。
- Composer 同时持有逻辑行和视觉组：内部读写仍用 `grid[logicalLine][col]`，渲染时按 `rhymeGroups` 把多个逻辑行放进同一个 `.composer-line`。

## 平仄与韵脚校验

普通平仄校验依赖浏览器端韵书对象：

- `rhyme-char-index.json` 提供韵部。
- `tone-lookup.json` 提供平仄兜底。

这样可以避免某些字在韵部索引里 tone 为 `未知` 时被误判。例如「剑、外、蓟」在平水韵条目里可能有韵部但 tone 未知，仍可通过 tone lookup 判为仄声。

韵脚处理：

- 诗体格律默认按平韵处理。
- 词牌只有在变体说明明确只有 `平韵` 或只有 `仄韵` 时显示对应预期。
- 混合韵或无法判断时只显示 `韵`，不做错误推断。

韵脚校验需要真实韵部，不能只凭平仄通过。

## 持久化层

Web 端不直接把状态写死在组件里，而是通过 `PoemCreationDraftStore` 抽象保存草稿：

- `listDrafts()`：列出作品摘要。
- `loadActiveDraftId()` / `setActiveDraftId(id)`：读取和记录最近激活作品。
- `loadDraft(id)`：加载指定作品。
- `saveDraft(draft)`：保存当前草稿。
- `deleteDraft(id)`：删除指定作品。

当前实现是 `IndexedDbDraftStore`，数据保存在浏览器 IndexedDB，并支持多个作品草稿：

- 数据库：`poem-creation-web`
- store：`drafts`
- 作品 key：草稿 `id`
- meta store：`meta`
- 当前作品 key：`activeDraftId`

草稿内容包括：

- 标题、说明、署名。
- 体裁、模板、变体、韵书。
- 字位 grid。
- 更新时间和 schemaVersion。

保存策略：

- 页面加载后先读取作品列表，再恢复上次激活的作品。
- 恢复完成后才渲染编辑器，避免编辑器先用空 grid 初始化再覆盖草稿。
- 状态变化后使用短 debounce 自动保存，避免每次按键都同步写入。
- 在编辑页切换作品或新建作品前会先保存当前作品，避免自动保存 debounce 窗口内的内容丢失。
- 点击新作会立即创建并保存一个空作品，使它马上出现在作品列表。
- 返回入口前会先保存当前作品。
- 删除非当前作品只移除该作品。
- 删除当前编辑作品后自动切到最近更新的剩余作品；如果没有剩余作品，则回到入口页。

作品列表展示：

- 标题，未填时显示 `未题`。
- 署名，未填时显示 `佚名`。
- 当前模板名，未选时显示 `未选模板`。
- 最近更新时间。
- 删除按钮。
- 列表区域固定高度并内部滚动，避免历史作品过多时撑高入口页。
- 入口页左右两栏顶对齐，不让作品列表高度拉伸“本次编辑”面板。
- 搜索支持标题、署名、模板名和变体 id。

后续接入后端持久化时，保留 `PoemCreationDraftStore` 接口，新增后端实现即可。UI 层不应直接关心 IndexedDB 或 API 细节。

## 导出

当前导出能力先做文字导出：

- 导出内容包括标题、署名、格律/词牌、说明和正文。
- 正文按当前 grid 中已填写的行输出，空行不输出。
- 导出时自动补标点：押韵句用 `。`，非押韵句用 `，`。
- 导出文本只在 `。` 后换行，非押韵句和后续押韵句保持在同一视觉行。
- 点击“导出预览”会在编辑页展示最终文本。
- 点击“复制文字”或预览中的“复制”会复制到剪贴板。

导出图片入口已经占位但禁用。后续实现时应优先考虑独立导出工具函数，不把截图或 canvas 逻辑塞进 `EditorPage`。

## 同构编辑器策略

编辑器分为两层：

- 纯逻辑层：`packages/shared/src/editor/`
- 平台 UI 层：Web 的 `Composer.tsx`，后续 RN 可以实现自己的 Composer UI。

`editor-core` 不依赖 DOM、React 或浏览器 API，包含：

- 创建空 grid。
- 创建 pattern signature。
- 输入文本归一化。
- 从任意字位补位写入。
- 单行/多行粘贴分配。
- 写完行后计算下一个光标位置。
- 写完整篇后返回 completed 标记。

Web 端只负责：

- 渲染格子。
- 管理真实输入框和 IME 事件。
- 将用户事件转换成 `editor-core` 的写入调用。

RN 版本应复用 `editor-core`，只替换字位组件、TextInput、键盘事件和样式。

## React Native 初始化

RN 客户端包位于 `apps/poem-creation-app`，使用 Expo managed workflow 初始化，不在仓库里直接生成 `ios/` 和 `android/` 原生目录。这样当前阶段可以先验证同构编辑器、数据模型和交互方案，真正需要原生配置时再执行 prebuild。

包初始化策略：

- 包名：`poem-creation-app`，避免和旧占位 `apps/rn` 的 `@poem/rn` 重名。
- Expo SDK：使用 SDK 54 稳定组合，对应 React Native 0.81、React 19.1。
- 入口：`index.ts` 通过 `registerRootComponent` 注册 `src/App.tsx`。
- Metro：`metro.config.js` 增加 workspace root watch 和 node_modules 查找路径，让 pnpm workspace 中的 `@poem/*` 包可被 RN 解析。
- TypeScript：`tsconfig.json` 继承 `expo/tsconfig.base`，开启 strict，并保留 `@/*` 到 `src/*` 的路径别名。

RN 页面先保持轻量壳，不直接复制 Web 页面状态树。编辑器交互走 RN 专属的 `TextInput` 和触控字格，但底层写入逻辑继续复用共享编辑器核心。

RN 编辑器当前已经从占位演示推进为可输入组件：

- `components/RnComposer.tsx` 负责触控字格、当前格 `TextInput`、补位写入、删除、上一格/下一格和完成回调。
- 输入归一化放在 `utils/editorInput.ts`，RN 侧只把已确认的汉字写入格子，避免拼音组合串提前落格。
- iOS 拼音输入期间隐藏原生 `TextInput` caret，使用格子内固定视觉光标；汉字确认前光标不随拼音串移动，确认后才跳到下一字位。
- 写入、pattern signature、空 grid、多行粘贴仍复用 `@poem/shared`，RN UI 不重新实现编辑器核心算法。
- RN Composer 不在 mount 或父组件重渲染时主动把初始 grid 回写给父级，只在用户写入、粘贴或删除后触发 `onChange`。这样避免父级 `setDraft({ chars })` 造成编辑器反复重渲染并触发 maximum update depth。

RN 不追求和 Web 完全一致。移动端能力会更强，所以当前按原生工作流拆为：

- `HomeScreen`：创作首页，只放开始新作、作品夹和设置入口。
- `EntryScreen`：入口选择面板，选择体裁、模板、变体和韵书；诗默认平水，词默认词林，选中模板后自动选第一个变体。
- `WorksScreen`：作品夹，支持搜索、打开、删除本机草稿。
- `SettingsScreen`：用户设置，目前维护默认署名。
- `EditorScreen`：正文编辑器，标题、题记、署名和字格放在同一张纸面上，分析结果也在编辑页内显示。

RN 本地持久化通过 `PoemCreationDraftStore` 抽象，不让页面直接依赖 AsyncStorage。当前实现是 `AsyncStorageDraftStore`：

- 草稿索引：`poem-creation-app:draft-index`。
- 当前草稿：`poem-creation-app:active-draft-id`。
- 草稿实体：`poem-creation-app:draft:{id}`。

后续如果接 SQLite、文件存储或后端同步，只需要新增 store 实现。RN UI 层保持面对同一套草稿接口。

RN 侧已经接入正式模板、变体、韵书和分析：

- 模板目录来自 `@poem/parser/catalog`。
- 诗体 pattern 复用 `loadMeterTemplates()`。
- 词牌完整 pattern 静态打包 `packages/parser/data/ci-tunes-bundle.json`，不依赖 Web 的 `/data` 路径。
- 入口模板搜索展示完整候选数量，不默认截断词牌；搜索框采用非受控 `TextInput` 接收输入，避免中文 IME 组合过程中被 state 回写打断。
- 韵书静态打包 `rhyme-char-index.json` 和 `tone-lookup.json`，由 `createAppDict()` 构造 RN 端 `RhymeDict`。
- 分析调用 `@poem/parser/kernel` 的 `analyzeSync()`，和 Web 共用同一内核。

当前 RN Composer 覆盖手机触控主路径。外接键盘方向键暂不做，移动端优先用触格、上一格、下一格和删除按钮完成定位。

## 技术实现

主要文件：

- `apps/poem-creation-web/src/App.tsx`：应用状态、副作用、持久化调度、分析调度。
- `apps/poem-creation-web/src/components/EntryPage.tsx`：入口页，本次编辑选择和作品列表。
- `apps/poem-creation-web/src/components/EditorPage.tsx`：编辑页外壳，元数据表单、Composer 和分析结果。
- `apps/poem-creation-web/src/components/ExportPreviewModal.tsx`：导出预览弹窗。
- `apps/poem-creation-web/src/components/SettingsPage.tsx`：用户设置页。
- `apps/poem-creation-web/src/components/CustomSelect.tsx`：可搜索下拉控件。
- `apps/poem-creation-web/src/Composer.tsx`：字位矩阵、输入补位、粘贴、字位校验。
- `apps/poem-creation-web/src/constants/poem.ts`：体裁、韵书等稳定常量。
- `apps/poem-creation-web/src/utils/routing.ts`：hash route 读写。
- `apps/poem-creation-web/src/utils/draft.ts`：草稿创建、展示时间格式化、旧草稿归一化。
- `apps/poem-creation-web/src/utils/ciTemplate.ts`：词牌完整格律懒加载、section break、词牌韵型推断。
- `apps/poem-creation-web/src/utils/exportText.ts`：文字导出格式化和剪贴板写入。
- `apps/poem-creation-web/src/utils/settings.ts`：用户设置读取和保存。
- `apps/poem-creation-web/src/utils/rhymeDict.ts`：浏览器端韵书封装。
- `apps/poem-creation-web/src/persist/`：Web 草稿持久化接口与 IndexedDB 实现。
- `packages/shared/src/editor/`：Web/RN 可复用的编辑器纯逻辑。
- `apps/poem-creation-app/`：React Native/Expo 客户端初始化包。
- `apps/poem-creation-app/src/components/RnComposer.tsx`：RN 字格编辑器，复用共享编辑器核心。
- `apps/poem-creation-app/src/persist/`：RN 草稿持久化接口与 AsyncStorage 实现。
- `apps/poem-creation-app/src/utils/templates.ts`：RN 模板、词牌视觉分组和变体文案。
- `apps/poem-creation-app/src/utils/rhymeDict.ts`：RN 端韵书封装。
- `apps/poem-creation-web/src/style.css`：全局视觉和字位输入样式。

拆分原则：

- 页面组件只负责布局、表单和事件出口，不直接读写 IndexedDB。
- `App.tsx` 保留跨组件状态和副作用，避免持久化、路由、分析逻辑散在多个页面组件里。
- constants、utils 使用目录归类，避免后续继续把工具函数堆回页面文件。

样式策略：

- Tailwind utilities 用于页面布局和交互控件。
- 少量 CSS 保留给全局纸张纹理、字位矩阵、激活输入框等稳定结构样式。
