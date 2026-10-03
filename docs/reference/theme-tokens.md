# 内置主题与 token 目录

## Status and Sources

Current，2026-10-02。数据由当前编译 preset 与源码派生表达式核对；权威仍是 [presets.ts](../../src/client/presets.ts) 与 [chrome-tokens.ts](../../src/client/chrome-tokens.ts)，不是此文的快照。修改源码后应重新审阅表，不以历史颜色覆盖新源码。

## Palette model

每套 preset 有唯一 namespaced id、英文 name/description、light/dark token maps 与 light/dark 四色 preview。默认卡使用 DEFAULT_PREVIEW，仅供 UI 展示，不是 theme id 或官方 palette 的复制。

13 个基本字段分别为 bgBase/bgLayer1/bgLayer2/bgOverlay、borderL1/borderL2、brand、labelPrimary/labelSecondary、error/success/warn、sidebar。preview 从 bgBase、bgLayer1、labelPrimary、brand 派生。所有 theme factories 与 catalog snapshots 冻结。

## 显示顺序与身份

| 顺序 | id | 英文名称 | 元数据描述 |
| ---: | --- | --- | --- |
| 1 | `dsh-theme-studio.claude` | Claude | Anthropic Claude Desktop warm ivory / clay palette. |
| 2 | `dsh-theme-studio.codex` | Codex | OpenAI Codex Desktop default chrome (official Appearance docs). |
| 3 | `dsh-theme-studio.claude-cream` | Claude Cream | Community editorial warm ivory + amber. Distinct from official Clay #D97757. |
| 4 | `dsh-theme-studio.graphite` | Graphite | Low-saturation, mid-contrast palette for long coding sessions. |
| 5 | `dsh-theme-studio.oled` | OLED | Near-black backgrounds with high-legibility foregrounds. |
| 6 | `dsh-theme-studio.nordic` | Nordic | Cool blue-gray surfaces with a cyan-blue accent. |
| 7 | `dsh-theme-studio.paper` | Paper | Warm paper-like surfaces for light reading and writing. |
| 8 | `dsh-theme-studio.warm` | Warm | Warm neutrals that reduce blue light. |

描述是仓库的产品元数据，不是第三方品牌授权、性能、医学或 WCAG 认证。Claude/Codex/Claude Cream 的 brand/bgBase/sidebar 值由 must-add 测试锁定；其他主题名称也不能当作对比度通过保证。

## 基础 token 明暗快照

### Claude

| Token | Light | Dark |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `#FAF9F5` | `#1F1E1D` |
| `--dsw-alias-bg-layer-1` | `#FFFFFF` | `#262624` |
| `--dsw-alias-bg-layer-2` | `#F0EEE6` | `#30302E` |
| `--dsw-alias-bg-overlay` | `#F5F4ED` | `#30302E` |
| `--dsw-alias-border-l1` | `rgba(20, 20, 19, 0.08)` | `rgba(250, 249, 245, 0.08)` |
| `--dsw-alias-border-l2` | `rgba(20, 20, 19, 0.16)` | `rgba(250, 249, 245, 0.16)` |
| `--dsw-alias-brand-primary` | `#D97757` | `#D97757` |
| `--dsw-alias-label-primary` | `#141413` | `#FAF9F5` |
| `--dsw-alias-label-secondary` | `#73726C` | `#9C9A92` |
| `--dsw-alias-state-error-primary` | `#B53333` | `#DD5353` |
| `--dsw-alias-state-success-primary` | `#2F7613` | `#459315` |
| `--dsw-alias-state-warn-primary` | `#875A08` | `#B17506` |
| `--dsw-specific-sidebar-fill` | `#F0EEE6` | `#141413` |

### Codex

| Token | Light | Dark |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `#FFFFFF` | `#181818` |
| `--dsw-alias-bg-layer-1` | `#F5F6F7` | `#222222` |
| `--dsw-alias-bg-layer-2` | `#E8EAED` | `#2D2D2B` |
| `--dsw-alias-bg-overlay` | `#FFFFFF` | `#2D2D2B` |
| `--dsw-alias-border-l1` | `rgba(13, 13, 13, 0.08)` | `rgba(255, 255, 255, 0.08)` |
| `--dsw-alias-border-l2` | `rgba(13, 13, 13, 0.16)` | `rgba(255, 255, 255, 0.16)` |
| `--dsw-alias-brand-primary` | `#0285FF` | `#339CFF` |
| `--dsw-alias-label-primary` | `#0D0D0D` | `#FFFFFF` |
| `--dsw-alias-label-secondary` | `#5C6570` | `#9AA1A9` |
| `--dsw-alias-state-error-primary` | `#BA2623` | `#FA423E` |
| `--dsw-alias-state-success-primary` | `#00A240` | `#40C977` |
| `--dsw-alias-state-warn-primary` | `#B54708` | `#FDB022` |
| `--dsw-specific-sidebar-fill` | `#F5F6F7` | `#141414` |

### Claude Cream

| Token | Light | Dark |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `#F5F3E9` | `#2D2E2D` |
| `--dsw-alias-bg-layer-1` | `#FFFFFF` | `#303030` |
| `--dsw-alias-bg-layer-2` | `#F0EEE6` | `#343533` |
| `--dsw-alias-bg-overlay` | `#F8F7F2` | `#343533` |
| `--dsw-alias-border-l1` | `rgba(41, 39, 29, 0.08)` | `rgba(233, 230, 220, 0.08)` |
| `--dsw-alias-border-l2` | `rgba(41, 39, 29, 0.16)` | `rgba(233, 230, 220, 0.16)` |
| `--dsw-alias-brand-primary` | `#B7791F` | `#E6BF7A` |
| `--dsw-alias-label-primary` | `#29271D` | `#E9E6DC` |
| `--dsw-alias-label-secondary` | `#6D675B` | `#BBB6A8` |
| `--dsw-alias-state-error-primary` | `#7C1B13` | `#EA928A` |
| `--dsw-alias-state-success-primary` | `#4B6F3D` | `#9AB889` |
| `--dsw-alias-state-warn-primary` | `#8A5E16` | `#E6BF7A` |
| `--dsw-specific-sidebar-fill` | `#F0EEE6` | `#242524` |

### Graphite

| Token | Light | Dark |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `#e8eaed` | `#1c1e22` |
| `--dsw-alias-bg-layer-1` | `#f4f5f6` | `#25282c` |
| `--dsw-alias-bg-layer-2` | `#dde0e4` | `#2e3238` |
| `--dsw-alias-bg-overlay` | `#f7f8f9` | `#32363c` |
| `--dsw-alias-border-l1` | `rgba(44, 48, 54, 0.08)` | `rgba(213, 216, 220, 0.08)` |
| `--dsw-alias-border-l2` | `rgba(44, 48, 54, 0.16)` | `rgba(213, 216, 220, 0.16)` |
| `--dsw-alias-brand-primary` | `#5b6570` | `#8b949e` |
| `--dsw-alias-label-primary` | `#2c3036` | `#d5d8dc` |
| `--dsw-alias-label-secondary` | `#5c6570` | `#9aa1a9` |
| `--dsw-alias-state-error-primary` | `#b42318` | `#f97066` |
| `--dsw-alias-state-success-primary` | `#067647` | `#47cd89` |
| `--dsw-alias-state-warn-primary` | `#b54708` | `#fdb022` |
| `--dsw-specific-sidebar-fill` | `#dfe2e6` | `#16181b` |

### OLED

| Token | Light | Dark |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `#f7f7f7` | `#000000` |
| `--dsw-alias-bg-layer-1` | `#ffffff` | `#0a0a0a` |
| `--dsw-alias-bg-layer-2` | `#ececec` | `#141414` |
| `--dsw-alias-bg-overlay` | `#ffffff` | `#1a1a1a` |
| `--dsw-alias-border-l1` | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.08)` |
| `--dsw-alias-border-l2` | `rgba(0, 0, 0, 0.16)` | `rgba(255, 255, 255, 0.18)` |
| `--dsw-alias-brand-primary` | `#155eef` | `#84adff` |
| `--dsw-alias-label-primary` | `#111111` | `#f2f2f2` |
| `--dsw-alias-label-secondary` | `#4d4d4d` | `#b3b3b3` |
| `--dsw-alias-state-error-primary` | `#d92d20` | `#f97066` |
| `--dsw-alias-state-success-primary` | `#079455` | `#3ccb7f` |
| `--dsw-alias-state-warn-primary` | `#dc6803` | `#fdb022` |
| `--dsw-specific-sidebar-fill` | `#efefef` | `#000000` |

### Nordic

| Token | Light | Dark |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `#eceff4` | `#2e3440` |
| `--dsw-alias-bg-layer-1` | `#e5e9f0` | `#3b4252` |
| `--dsw-alias-bg-layer-2` | `#d8dee9` | `#434c5e` |
| `--dsw-alias-bg-overlay` | `#eceff4` | `#4c566a` |
| `--dsw-alias-border-l1` | `rgba(46, 52, 64, 0.08)` | `rgba(236, 239, 244, 0.08)` |
| `--dsw-alias-border-l2` | `rgba(46, 52, 64, 0.16)` | `rgba(236, 239, 244, 0.16)` |
| `--dsw-alias-brand-primary` | `#5e81ac` | `#88c0d0` |
| `--dsw-alias-label-primary` | `#2e3440` | `#eceff4` |
| `--dsw-alias-label-secondary` | `#4c566a` | `#d8dee9` |
| `--dsw-alias-state-error-primary` | `#bf616a` | `#bf616a` |
| `--dsw-alias-state-success-primary` | `#a3be8c` | `#a3be8c` |
| `--dsw-alias-state-warn-primary` | `#d08770` | `#ebcb8b` |
| `--dsw-specific-sidebar-fill` | `#e5e9f0` | `#2e3440` |

### Paper

| Token | Light | Dark |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `#f6f1e7` | `#1c1915` |
| `--dsw-alias-bg-layer-1` | `#efe8d8` | `#26221c` |
| `--dsw-alias-bg-layer-2` | `#e4d9c4` | `#322c24` |
| `--dsw-alias-bg-overlay` | `#fbf6ec` | `#3a332a` |
| `--dsw-alias-border-l1` | `rgba(63, 58, 50, 0.08)` | `rgba(237, 230, 216, 0.08)` |
| `--dsw-alias-border-l2` | `rgba(63, 58, 50, 0.16)` | `rgba(237, 230, 216, 0.16)` |
| `--dsw-alias-brand-primary` | `#8c5a3c` | `#d4a574` |
| `--dsw-alias-label-primary` | `#3f3a32` | `#ede6d8` |
| `--dsw-alias-label-secondary` | `#6b6256` | `#c4b8a4` |
| `--dsw-alias-state-error-primary` | `#b42318` | `#f97066` |
| `--dsw-alias-state-success-primary` | `#3b7d4a` | `#75b798` |
| `--dsw-alias-state-warn-primary` | `#b54708` | `#fdb022` |
| `--dsw-specific-sidebar-fill` | `#efe8d8` | `#17140f` |

### Warm

| Token | Light | Dark |
| --- | --- | --- |
| `--dsw-alias-bg-base` | `#f7f0e8` | `#1f1a16` |
| `--dsw-alias-bg-layer-1` | `#efe6da` | `#2a241f` |
| `--dsw-alias-bg-layer-2` | `#e4d6c6` | `#352d26` |
| `--dsw-alias-bg-overlay` | `#fbf4ec` | `#3d342c` |
| `--dsw-alias-border-l1` | `rgba(58, 50, 41, 0.08)` | `rgba(240, 230, 218, 0.08)` |
| `--dsw-alias-border-l2` | `rgba(58, 50, 41, 0.16)` | `rgba(240, 230, 218, 0.16)` |
| `--dsw-alias-brand-primary` | `#c4784a` | `#e0a070` |
| `--dsw-alias-label-primary` | `#3a3229` | `#f0e6da` |
| `--dsw-alias-label-secondary` | `#6b5d4e` | `#c9b7a4` |
| `--dsw-alias-state-error-primary` | `#b42318` | `#f97066` |
| `--dsw-alias-state-success-primary` | `#3b7d4a` | `#75b798` |
| `--dsw-alias-state-warn-primary` | `#b54708` | `#fdb022` |
| `--dsw-specific-sidebar-fill` | `#efe6da` | `#191511` |

## 完整派生 token 目录

以下表达式从 deriveChrome 的返回字面量提取，保持当前定义顺序。`mix(a,b,p)` 表示 a 占 p%、b 占余量的 sRGB 混合；`fade(a,p)` 表示 a 占 p%、余量透明。参数不是 luminance 插值，alpha 合成在对比度模块单独处理。

| 局部名称 | 当前配方 |
| --- | --- |
| dark | bgBase 的加权 RGB 亮度是否小于 128；是内部明暗 bubble 启发式，不是 WCAG relative luminance |
| hoverWash | fade(labelPrimary, 8) |
| quietSurface | mix(bgBase, labelPrimary, 94) |
| liftedLayer | mix(bgLayer2, labelPrimary, 92) |
| watermark | mix(bgBase, labelPrimary, 82) |
| bubble | dark 时 mix(bgBase, black, 70)，light 时 labelPrimary |
| toastBg | dark 时 mix(bgBase, black, 75)，light 时 labelPrimary |
| toastLabel | dark 时 labelPrimary，light 时 bgBase |

| 派生 token | 表达式 |
| --- | --- |
| `--dsw-alias-label-tertiary` | `mix(labelSecondary, bgBase, 72)` |
| `--dsw-alias-label-caption` | `mix(labelSecondary, bgBase, 55)` |
| `--dsw-alias-label-dimmed` | `mix(labelSecondary, bgBase, 40)` |
| `--dsw-alias-label-primary-dimmed` | `mix(labelPrimary, bgBase, 80)` |
| `--dsw-alias-label-primary-foreground` | `bgBase` |
| `--dsw-alias-label-primary-inverted` | `bgBase` |
| `--dsw-alias-label-primary-bluish` | `brand` |
| `--dsw-alias-label-document-preview` | `labelSecondary` |
| `--dsw-alias-label-deep-diving` | `mix(brand, labelPrimary, 70)` |
| `--dsw-alias-label-deep-diving-shimmer` | `mix(brand, labelPrimary, 30)` |
| `--dsw-alias-label-shimmer` | `fade(labelPrimary, dark ? 45 : 30)` |
| `--dsw-alias-menu-icon` | `labelSecondary` |
| `--dsw-alias-brand-text` | `brand` |
| `--dsw-alias-brand-primary-invert` | `brand` |
| `--dsw-alias-brand-primary-new-colorprimary-new-color` | `brand` |
| `--dsw-alias-bg-layer-3` | `liftedLayer` |
| `--dsw-alias-bg-module-platform` | `quietSurface` |
| `--dsw-alias-bg-multi-select` | `quietSurface` |
| `--dsw-alias-bg-skeleton` | `fade(labelPrimary, 6)` |
| `--dsw-alias-bg-document-preview` | `bgLayer2` |
| `--dsw-alias-bg-document-selection` | `fade(brand, 40)` |
| `--dsw-alias-bg-mask-1` | `fade('black', dark ? 50 : 24)` |
| `--dsw-alias-bg-mask-2` | `fade('black', dark ? 20 : 12)` |
| `--dsw-alias-bg-mask-3` | `fade('black', 48)` |
| `--dsw-alias-bg-mask-photo` | `fade('black', 88)` |
| `--dsw-alias-bg-mask-drop` | `dark ? fade(bgBase, 70) : fade('white', 70)` |
| `--dsw-alias-border-l3` | `fade(labelPrimary, 12)` |
| `--dsw-alias-border-l4` | `fade(labelPrimary, 16)` |
| `--dsw-alias-border-l2-darkmode-thin` | `fade(labelPrimary, 10)` |
| `--dsw-alias-border-inverted` | `fade(labelPrimary, 6)` |
| `--dsw-alias-border-inverted2` | `fade(labelPrimary, 8)` |
| `--dsw-alias-interactive-bg-hover` | `hoverWash` |
| `--dsw-alias-interactive-bg-hover-accent` | `fade(labelPrimary, 14)` |
| `--dsw-alias-interactive-bg-active` | `fade(labelPrimary, 10)` |
| `--dsw-alias-interactive-bg-hover-solid` | `bgLayer2` |
| `--dsw-alias-interactive-bg-hover-danger` | `fade(error, 8)` |
| `--dsw-alias-button-primary-hover` | `mix(brand, labelPrimary, 82)` |
| `--dsw-alias-button-primary-dimmed` | `mix(brand, bgBase, 18)` |
| `--dsw-alias-button-contrast-fill` | `labelPrimary` |
| `--dsw-alias-button-elevated-fill` | `bgLayer1` |
| `--dsw-alias-button-floating-fill` | `bgOverlay` |
| `--dsw-alias-button-floating-hover` | `mix(bgOverlay, labelPrimary, 90)` |
| `--dsw-alias-button-ghost-active-border` | `fade(labelPrimary, 40)` |
| `--dsw-alias-button-ghost-active-fill` | `bgLayer2` |
| `--dsw-alias-button-ghost-active-hover` | `mix(bgLayer2, labelPrimary, 88)` |
| `--dsw-alias-button-info-fill` | `brand` |
| `--dsw-alias-button-info-hover` | `mix(brand, labelPrimary, 82)` |
| `--dsw-alias-button-tool-bar-fill-invisible` | `fade(labelPrimary, 36)` |
| `--dsw-alias-button-tool-bar-fill` | `fade(labelPrimary, 50)` |
| `--dsw-alias-button-tool-bar-hover` | `fade(labelPrimary, 60)` |
| `--dsw-alias-state-business-primary` | `brand` |
| `--dsw-alias-state-business-tertiary` | `fade(brand, 16)` |
| `--dsw-alias-state-error-secondary` | `mix(error, bgBase, 70)` |
| `--dsw-alias-state-success-secondary` | `mix(success, bgBase, 70)` |
| `--dsw-alias-state-success-tertiary` | `fade(success, 16)` |
| `--dsw-alias-state-warn-label` | `warn` |
| `--dsw-alias-state-warn-secondary` | `mix(warn, bgBase, 70)` |
| `--dsw-alias-state-warn-tertiary` | `fade(warn, 16)` |
| `--dsw-alias-state-idle-primary` | `mix(labelSecondary, bgBase, 45)` |
| `--dsw-alias-link` | `brand` |
| `--dsw-focus-ring-color` | `brand` |
| `--dsw-alias-switch-thumb` | `dark ? labelSecondary : bgBase` |
| `--dsw-alias-turn-trigger-bg` | `dark ? hoverWash : bgLayer2` |
| `--dsw-alias-turn-trigger-bg-hover` | `dark ? fade(labelPrimary, 10) : hoverWash` |
| `--dsw-alias-menu-group-header-fill` | `fade(bgOverlay, 94)` |
| `--dsw-menu-surface-fill` | `fade(bgOverlay, 92)` |
| `--dsw-specific-menu` | `fade(bgOverlay, 92)` |
| `--dsw-alias-toast-bg` | `toastBg` |
| `--dsw-alias-toast-label` | `toastLabel` |
| `--dsw-alias-tooltip-bg` | `bubble` |
| `--dsw-specific-sidebar-nav-item-active` | `bgLayer2` |
| `--dsw-specific-sidebar-nav-item-hover` | `mix(sidebar, labelPrimary, 92)` |
| `--dsw-specific-sidebar-nav-item-active-accent` | `fade(brand, 18)` |
| `--dsw-specific-input-major` | `bgLayer1` |
| `--dsw-specific-login-input` | `bgLayer2` |
| `--dsw-specific-selector` | `quietSurface` |
| `--dsw-specific-tip` | `quietSurface` |
| `--dsw-specific-bubble` | `fade(brand, 12)` |
| `--dsw-specific-bubble-highlight` | `fade(brand, 22)` |
| `--dsw-alias-markdown-code-block` | `bgLayer2` |
| `--dsw-alias-markdown-code-block-banner` | `mix(bgLayer2, bgBase, 50)` |
| `--dsw-alias-markdown-inline-code` | `liftedLayer` |
| `--dsw-alias-markdown-citation` | `bgLayer2` |
| `--dsw-alias-markdown-tag` | `quietSurface` |
| `--dsw-alias-markdown-placeholder` | `bgLayer2` |
| `--dsw-alias-markdown-code-segment-selected` | `bgLayer1` |
| `--dsw-alias-markdown-code-segment-unselected` | `bgLayer2` |
| `--dsw-alias-scrollbar-bg-l1` | `fade(labelPrimary, 28)` |
| `--dsw-alias-scrollbar-bg-l2` | `fade(labelPrimary, 28)` |
| `--dsw-alias-scrollbar-hover-l1` | `fade(labelPrimary, 45)` |
| `--dsw-alias-scrollbar-hover-l2` | `fade(labelPrimary, 45)` |
| `--dsw-alias-code-diff-added` | `fade(success, 16)` |
| `--dsw-alias-code-diff-deleted` | `fade(error, 16)` |
| `--dsw-alias-file-diff-added-bg` | `fade(success, 16)` |
| `--dsw-alias-file-diff-added-gutter` | `fade(success, 10)` |
| `--dsw-alias-file-diff-added-marker` | `success` |
| `--dsw-alias-file-diff-deleted-bg` | `fade(error, 16)` |
| `--dsw-alias-file-diff-deleted-gutter` | `fade(error, 10)` |
| `--dsw-alias-file-diff-deleted-marker` | `error` |
| `--dsw-alias-onboarding-accent` | `brand` |
| `--dsw-alias-onboarding-card-fill` | `fade(bgBase, 80)` |
| `--dsw-alias-onboarding-secondary-fill` | `bgLayer1` |
| `--dsw-alias-onboarding-checkbox-border` | `fade(labelPrimary, 20)` |
| `--shiki-token-comment` | `labelSecondary` |
| `--shiki-token-punctuation` | `labelSecondary` |
| `--shiki-token-string` | `success` |
| `--shiki-token-string-expression` | `success` |
| `--shiki-token-keyword` | `error` |
| `--shiki-token-constant` | `brand` |
| `--shiki-token-function` | `brand` |
| `--shiki-token-link` | `brand` |
| `--shiki-token-parameter` | `warn` |
| `--dsw-static-deepseek-400` | `brand` |
| `--dsw-static-deepseek-450` | `brand` |
| `--dsw-static-deepseek-500` | `brand` |
| `--dsw-static-blue-400` | `brand` |
| `--dsw-static-blue-450` | `brand` |
| `--dsw-static-blue-500` | `brand` |
| `--dsw-static-blue-600` | `brand` |
| `--dsw-static-green-500` | `success` |
| `--dsw-static-amber-400` | `warn` |
| `--dsw-static-amber-500` | `warn` |
| `--dsw-static-red-600` | `error` |
| `--dsw-static-neutral-bluish-300` | `labelSecondary` |
| `--dsw-static-neutral-bluish-400` | `labelSecondary` |
| `--dsw-static-neutral-bluish-1000` | `labelPrimary` |
| `--dsw-static-neutral-50` | `bgLayer2` |
| `--dsw-static-neutral-850` | `bgLayer2` |
| `--dsw-static-neutral-100` | `liftedLayer` |
| `--dsw-static-neutral-800` | `liftedLayer` |
| `--dsw-static-neutral-200` | `watermark` |
| `--dsw-static-neutral-700` | `watermark` |

当前共 13 个基本 token、132 个派生 token，每种模式合计 145 个。CHROME_TOKEN_NAMES 从同一函数的 probe 返回值取得，不能单独手写第二份名称集合。

## 保留与新上游 token

不覆写 `--dsw-static-neutral-00` 与 `--dsw-static-neutral-bluish-00`；宿主 tooltip/file tile 等把它们视为白色。light bubble 使用深色 labelPrimary，dark bubble 向 black 混色，保留白色语义。不能将 darkSurface 的简单 RGB 启发式误用为 Stage 2 luminance 计算。

DSH 0.2 提升新增八项语义表达式：document-selection、label-deep-diving、label-deep-diving-shimmer、label-shimmer、switch-thumb、turn-trigger-bg、turn-trigger-bg-hover、menu-group-header-fill。源码与上游角色之间的证据见 [compatibility matrix](../development/dsh-compatibility.md)。旧 host 能接受 overlay-only token，但这不保证某个名字在旧版本已有可见消费者。

## 扩展约束

新增 builtin 时需要同步 Palette/BUILTIN_PRESETS、双语 locale、NAME_KEYS 与 card key 推导，保留 light/dark 键对称和 id 唯一。扩展派生 token 在唯一 deriveChrome 添加，不让每个主题独立写整套公式；同时审查 host 公开角色和 actual bundle 行为。

adapter 只检查 light/dark map shape 和 string，不做对比度或 CSS 语法校验。颜色配对的 passed/failed/unknown 范围由 [Stage 2 对比度参考](./theme-contrast.md)说明；现有低比值不能用“token 覆盖完整”掩盖。更改锁值、static 白色语义或派生 alpha 需独立决定和回归。

## 验证与历史

presets.spec 检查基本与派生全名称、must-add 值、brand/hover 配方与保留白色，contrast.spec 确保默认 pair 全部可计算，官方 ThemeRuntime integration 确认明暗解析。[ADR-0005](../decisions/ADR-0005-derived-chrome-and-static-white.md)保存选择原因，[builtin/chrome 计划](../plans/completed/2026-09-30-builtin-palettes-and-chrome.md)保存实施记录。
