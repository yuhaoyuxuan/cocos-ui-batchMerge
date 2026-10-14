# cocos-ui-batchMerge

基于 Cocos Creator 3.5.2 自定义引擎实现的 UI 合批方案，网页端（ts）可使用。

原文：https://forum.cocos.org/t/topic/158390

## 背景

Cocos 渲染 UI 时按节点树**深度优先**顺序提交渲染数据，界面中图片、文字穿插时，两种组件材质不同，会不断打断合批，产生大量 drawcall：

```
Sprite → Label → Sprite → Label → ...   （每个都可能是一个 drawcall）
```

本方案的做法是：对需要合批的界面，**不按节点树顺序提交，而是按组件上设置的 `depth` 从小到大提交**。相同纹理/材质的组件 depth 相同，即可在同一批次内提交，大幅降低 drawcall。

## 使用方法（项目侧）

### 1. 平台开关

在游戏入口 `Main.onLoad`（最早时机）设置：

```ts
cclegacy.openMergeBatch = sys.isBrowser;
```

- Web 端：启用合批，走引擎改造后的 `walkNew` 渲染遍历
- 原生端：不开启，保持引擎原渲染逻辑（原生端如需启用，改为 `true` 并同步修改原生 cpp 侧）

引擎内部通过 `legacyCC.openMergeBatch` 判断是否走合批逻辑（见 `batcher-2d.ts`、`pointer-event-dispatcher.ts`）。

### 2. 标记合批根节点

两种方式等价：

- **组件方式**：新建 `c_batchRoot` 组件，挂在界面根节点上；
- **代码方式**：直接设置 `node.isBatchRoot = true`，无需挂组件。

只有合批根节点下的 UI 元素才会按 `depth` 排序渲染。

> Mask 节点会打断合批，引擎已默认将挂有 `Mask` 组件的节点自动设为 `isBatchRoot`（见 `mask.ts`），无需手动处理。

### 3. 用 depth 控制提交顺序

合批根节点下的每个渲染组件（Sprite、Label、RichText、UIMeshRenderer 等）都有 `depth` 属性（默认 0），可在编辑器面板设置，也可代码设置：

```ts
sprite.depth = 1;
label.depth = 2;
```

渲染时按 `depth` 从小到大提交数据，**相同 depth 的组件在同一批次提交**。

### 典型用法

把界面内同一图集的元素设为相同 depth，不同图集/文字分别归组：

```
界面根节点 (c_batchRoot)
├─ 背景图集 Sprite × N     depth = 0   → 1 个批次
├─ 通用文字 Label × N      depth = 1   → 1 个批次
└─ 图标图集 Sprite × N     depth = 2   → 1 个批次
```

## 引擎修改清单（3.5.2-engine）

均位于 `3.5.2-engine/engine/cocos/`：

| 文件 | 修改内容 |
| --- | --- |
| `core/scene-graph/node.ts` | `Node` 新增 `isBatchRoot` 属性，标记合批根节点 |
| `2d/renderer/batcher-2d.ts` | 核心改造。`walk` 入口按 `openMergeBatch` 分发到新增的 `walkNew`；新增 `_batchRootDepth` 记录合批根嵌套层级、`_delayFillRenderers` 收集延迟提交的组件、`customFillBuffers()` 按 `depth` 排序后统一 `updateAssembler` 提交；透明度级联改为遍历时用 `_pOpacity` 逐级下传（自身 `color.a × 各级 UIOpacity`），逐帧写入 `uiProps._opacity` |
| `2d/framework/renderable-2d.ts` | 渲染组件基类新增 `depth` 属性（可序列化，编辑器可见） |
| `2d/components/rich-text.ts` | `RichText` 新增 `depth`，设置时同步下发到内部所有文本/图片 segment |
| `2d/components/ui-mesh-renderer.ts` | `UIMeshRenderer` 新增 `depth` 属性 |
| `2d/components/mask.ts` | `Mask` onEnable/onDisable 时自动设置/清除 `node.isBatchRoot`，使 Mask 子树独立合批 |
| `core/scene-graph/node-ui-properties.ts` | `NodeUIProperties` 新增 `uiOpacityComp` 懒获取，供透明度级联使用 |
| `2d/event/pointer-event-dispatcher.ts` | `openMergeBatch` 时触摸/鼠标事件分发改走 `dispatchEventTouchNew` / `dispatchEventMouseNew`，增加 try/catch 容错，防止合批下事件报错中断分发 |

## 渲染流程

`walkNew` 遍历节点树：

1. 进入 `isBatchRoot` 节点：先把上一组收集的组件按 depth 排序提交（`customFillBuffers`），`_batchRootDepth++`，开始新的一组；
2. 合批根内的普通渲染组件**不立即提交**，压入 `_delayFillRenderers` 收集；
3. 遇到 Mask（嵌套的合批根）或遍历到根节点结束时：排序并批量提交收集到的组件，`_batchRootDepth--`；
4. 透明度不再由 `UIOpacity` 组件逐级修改顶点色，而是在遍历时通过 `_pOpacity` 从父到子级联计算，逐帧写入 `_opacity`。

同一合批根内所有组件因此被打散重排，相同材质/纹理的 depth 组各合并为一次提交。

## 注意事项

- 深度优先的**遮挡关系会被 depth 重排**：depth 只决定提交顺序，同 depth 内按原节点顺序。若界面元素间有重叠遮挡，需保证 depth 顺序与遮挡关系一致，否则可能穿帮。
- 原生端默认关闭（`openMergeBatch = false`），走引擎原逻辑；如需原生合批需另行验证原生渲染管线。
- Mask 子树自动成为独立合批组，Mask 与其外部元素不参与同一组排序。
- 事件分发在合批模式下有额外容错（try/catch），报错会打印但不会中断整个分发。
