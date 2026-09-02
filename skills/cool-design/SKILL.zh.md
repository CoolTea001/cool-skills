---
name: cool-design
description: Nuxt 设计系统，基于 Nuxt UI 与 Tailwind CSS v4，暗色模式为默认主题。用于所有 UI 实现和页面设计任务。
version: alpha
brand:
  green: "#00DC82"
  navy: "#020420"
  white: "#FFFFFF"
theme:
  font-sans: "'Public Sans', sans-serif"
  color-green-50: "#EFFDF5"
  color-green-100: "#D9FBE8"
  color-green-200: "#B3F5D1"
  color-green-300: "#75EDAE"
  color-green-400: "#00DC82"
  color-green-500: "#00C16A"
  color-green-600: "#00A155"
  color-green-700: "#007F45"
  color-green-800: "#016538"
  color-green-900: "#0A5331"
  color-green-950: "#052E16"
semantic-colors:
  primary: green
  neutral: slate
  important: violet
  secondary: blue
  success: green
  info: blue
  warning: yellow
  error: red
css-variables:
  ui-container: 90rem
  ui-header-height: 112px
  ui-bg-dark: "var(--ui-color-neutral-950)"
  ui-bg-muted-dark: "var(--ui-color-neutral-900)"
  ui-bg-elevated-dark: "var(--ui-color-neutral-900)"
  ui-bg-accented-dark: "var(--ui-color-neutral-800)"
text:
  dimmed: "text-dimmed"
  muted: "text-muted"
  toned: "text-toned"
  default: "text-default"
  highlighted: "text-highlighted"
  inverted: "text-inverted"
background:
  default: "bg-default"
  muted: "bg-muted"
  elevated: "bg-elevated"
  accented: "bg-accented"
  inverted: "bg-inverted"
border:
  default: "border-default"
  muted: "border-muted"
  accented: "border-accented"
  inverted: "border-inverted"
radius:
  base: "var(--ui-radius)"
  utilities: [xs, sm, md, lg, xl, 2xl, 3xl]
components:
  button-primary: 'UButton color="primary"'
  button-secondary: 'UButton color="neutral" variant="subtle"'
  button-ghost: 'UButton variant="ghost"'
  button-error: 'UButton color="error"'
  input: 'UInput'
  container: 'UContainer'
  page-hero: 'UPageHero'
  prose: 'prose prose-primary dark:prose-invert'
---

# Nuxt

## 概述

Nuxt 是面向 Nuxt 产品与对外传播的设计语言。美学取向偏开发者、自信有力：深蓝海军色表面、Nuxt 绿作为唯一强调色，并留出充足留白。优先可读性、可访问性与清晰度，而非装饰。用颜色表达状态或层级，而非填满空间。

该体系由 [Nuxt UI](https://ui.nuxt.com) 与 **Tailwind CSS v4** 驱动，以 **CSS 变量** 作为设计令牌。颜色使用语义名（`primary`、`neutral`、`error`…），而非在组件中硬编码 hex。暗色模式为默认主题。

Logo 资源与可下载品牌文件见 [/design-kit](/design-kit)。

## Tailwind CSS

主题令牌通过 `@theme` 指令定义：

```css
@import "tailwindcss";
@import "@nuxt/ui";

@theme static {
  --font-sans: 'Public Sans', sans-serif;
  --color-green-50: #EFFDF5;
  /* … green-100 through green-950 … */
  --color-green-400: #00DC82;
}

:root {
  --ui-container: 90rem;
}

.dark {
  --ui-bg: var(--ui-color-neutral-950);
  --ui-bg-muted: var(--ui-color-neutral-900);
  --ui-bg-elevated: var(--ui-color-neutral-900);
  --ui-bg-accented: var(--ui-color-neutral-800);
}
```

完整 `@theme` 定制选项见 [Nuxt UI 设计系统文档](https://ui.nuxt.com/docs/getting-started/theme/design-system)。

## 品牌色

以下为 Nuxt 营销品牌色，与 Nuxt UI 语义令牌相互独立：

| 名称 | Hex | 用途 |
|------|-----|------|
| Green | `#00DC82` | Logo、品牌强调色。对应 `@theme` 中的 `green-400`。 |
| Navy | `#020420` | 暗色背景、OG 图片、`theme-color` meta。 |
| White | `#FFFFFF` | 深色表面上的文字、浅色 Logo 变体。 |

完整绿色阶（`green-50`–`green-950`）定义在 `@theme static` 中，并驱动 `primary` 语义色。

## 语义色

Nuxt UI 通过运行时配置将语义别名映射到 Tailwind 色阶：

| 语义 | 映射 | 用途 |
|------|------|------|
| `primary` | `green` | CTA、链接、活跃导航、品牌元素 |
| `neutral` | `slate` | 文字、边框、背景、禁用状态 |
| `important` | `violet` | 高亮徽章与强调 |
| `secondary` | `blue`（默认） | 次要操作 |
| `success` | `green`（默认） | 成功状态 |
| `info` | `blue`（默认） | 信息提示、工具提示 |
| `warning` | `yellow`（默认） | 警告、待定状态 |
| `error` | `red`（默认） | 错误、destructive 操作 |

在 Nuxt UI 组件上使用 `color` prop：

```vue
<UButton color="primary">Get Started</UButton>
<UButton color="neutral" variant="subtle">Learn More</UButton>
<UButton color="error">Delete</UButton>
```

已注册主题色：`primary`、`secondary`、`info`、`success`、`warning`、`error`、`important`。

## CSS 变量

Nuxt UI 提供由 `--ui-*` CSS 变量支撑的语义工具类。详见 [CSS 变量文档](https://ui.nuxt.com/docs/getting-started/theme/css-variables)。

### 颜色工具类

`text-primary`、`bg-success`、`border-error` 等——各自解析为所映射色阶中的某个色值。亮色模式使用 `-500` 色阶；暗色模式使用 `-400`。

### 文字层级

| Class | 角色 |
|-------|------|
| `text-dimmed` | 禁用、占位符 |
| `text-muted` | 次要文字、说明 |
| `text-toned` | 三级文字 |
| `text-default` | 正文 |
| `text-highlighted` | 标题、强调 |
| `text-inverted` | 反色背景上的文字 |

### 背景层级

| Class | 角色 |
|-------|------|
| `bg-default` | 页面表面 |
| `bg-muted` | 微妙填充、分组内容 |
| `bg-elevated` | 卡片、弹出层 |
| `bg-accented` | 悬停状态、活跃面板 |
| `bg-inverted` | 反色表面 |

暗色主题将 `--ui-bg` 覆盖为 `neutral-950`（比 Nuxt UI 默认的 `neutral-900` 更深），营造海军蓝邻近色感。

### 边框层级

| Class | 角色 |
|-------|------|
| `border-default` | 标准边框 |
| `border-muted` | 微妙分割线 |
| `border-accented` | 强调边框 |
| `border-inverted` | 反色表面上的边框 |

卡片与模块通常在 `bg-elevated` 或 `bg-muted` 上使用 `border border-default`。

## 排版

**字体：** Public Sans（`--font-sans`），通过 `@nuxt/fonts` 加载。

Nuxt UI 不像独立设计系统那样提供固定字号比例尺。使用 Tailwind 工具类：

| 场景 | 典型类名 |
|------|----------|
| Page hero | `text-5xl sm:text-7xl font-semibold` |
| Section hero | `sm:text-5xl font-semibold` |
| Section headings | `text-2xl`–`text-4xl font-semibold` |
| Body / prose | `prose prose-primary dark:prose-invert` |
| UI labels | `text-sm`、`text-xs` |
| Code | `font-mono`，Shiki 高亮代码块 |

优先使用语义文字类（`text-highlighted`、`text-muted`），而非原始 slate 颜色。

## 布局

### 容器

`--ui-container: 90rem` — 由 `UContainer` 使用。

### 页头

大屏文档与营销布局使用 `--ui-header-height: 112px`。

### 间距

Tailwind 默认基于 4px 的间距比例尺。常用节奏：

- `gap-2` / `p-2`（8px）— 组内
- `gap-4` / `p-4`（16px）— 相关项之间
- `py-10 sm:py-20` — 区块内边距
- `py-24 sm:py-32 lg:py-40` — hero 区域

### 断点

Tailwind 默认：`sm` 640px、`md` 768px、`lg` 1024px、`xl` 1280px、`2xl` 1536px。

## 圆角

Nuxt UI 的全部 `rounded-*` 工具类派生自单一 `--ui-radius` 基准（默认 `0.25rem`）。可用：`rounded-xs`、`rounded-sm`、`rounded-md`、`rounded-lg`、`rounded-xl`、`rounded-2xl`、`rounded-3xl`。

卡片与控件通常使用 `rounded-lg` 或 `rounded-md`。Hero 面板可用 `rounded-2xl`。

## 组件

使用 Nuxt UI 原语——不要重复造轮子：

| 模式 | 组件 | 示例 |
|------|------|------|
| 主要操作 | `UButton` | `<UButton color="primary">Deploy</UButton>` |
| 次要操作 | `UButton` | `<UButton color="neutral" variant="subtle">Cancel</UButton>` |
| 三级 / 链接 | `UButton` | `<UButton variant="ghost">Docs</UButton>` |
| 危险操作 | `UButton` | `<UButton color="error">Delete</UButton>` |
| 表单输入 | `UInput` | `<UInput placeholder="Search modules" />` |
| 页面布局 | `UPage`、`UPageHero`、`UPageBody` | 营销页与文档页 |
| 内容 | `ContentRenderer` + prose | Markdown/MDC 内容 |
| 导航 | `UHeader`、`UNavigationMenu` | 应用页头 |

聚焦环由 Nuxt UI 处理（`:focus-visible` 时的 `outline-primary/25`）。没有可见替代时不要移除 outline。

## 动效

谨慎使用动效。尊重 `prefers-reduced-motion`。Nuxt UI 组件为模态框、弹出层与菜单提供了合理的默认过渡。

## 文案与语气

- 标签、按钮、标题、Tab 使用 Title Case；正文与辅助文案使用 sentence case。
- 用「动词 + 名词」命名操作（`Deploy Project`、`Install Module`）。
- 错误文案写明发生了什么，以及下一步该做什么。
- Toast 指明具体变更对象——不加句号，不加 "successfully"。
- 空状态指向第一个可操作项。
- 进行中状态使用现在分词 + 省略号：`Deploying…`。

## 宜与忌

- 使用语义色 props（`color="primary"`）与工具类（`text-muted`、`bg-elevated`）——不要在组件中写原始 hex。
- 使用绿色 `primary` 作为视图上的主要 CTA。
- 按 `text-highlighted` > `text-default` > `text-muted` > `text-dimmed` 排布文字层级。
- 保持 WCAG AA 对比度（正文 4.5:1）。
- 不要仅用颜色传达状态；搭配图标或标签。
- 不要在 UI 代码中硬编码 `#00DC82`——使用 `text-primary` 或 `color="primary"`。
- 不要单独使用文字商标而不带山峰符号——见 [/design-kit](/design-kit)。

## 资源

- 品牌资源（Logo、图标）：[/design-kit](/design-kit)
- Figma 品牌套件：[Nuxt Brand Kit](https://www.figma.com/community/file/1296154408275753939/nuxt-brand-kit)
- Nuxt UI 设计系统：[ui.nuxt.com/docs/getting-started/theme/design-system](https://ui.nuxt.com/docs/getting-started/theme/design-system)
- Nuxt UI CSS 变量：[ui.nuxt.com/docs/getting-started/theme/css-variables](https://ui.nuxt.com/docs/getting-started/theme/css-variables)
