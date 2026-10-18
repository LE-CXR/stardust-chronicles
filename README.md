# 星尘编年史

一张可以核对的元素周期表。开场是一段星尘动画：太初的氢与氦、恒星里的碳和氧、人体里的主要元素，然后粒子落回 118 个格子。点开任何一格，读电子层、可见区强线、焰色和用途。没有文献的字段会留空，不编造。

界面是中文。开场是一支 1 分 52 秒的影片：星尘里氢和氦先出现，恒星把表格一格一格往后写，
超新星那一下把剩下的重元素砸进来，最后镜头推近、交还给可以点的周期表。影片自带旁白与原创配乐。

## 本地打开

直接用浏览器打开仓库根目录的 `index.html` 即可。页面使用普通脚本，不需要构建，也不需要网络（字体已放在 `fonts/`）。

也可以起一个本地静态服务：

```bash
python3 -m http.server 8741
```

然后访问 `http://127.0.0.1:8741/`。带锚点会跳过开场，例如 `http://127.0.0.1:8741/#Fe`。

手机宽度大约 390px 时，表格可以左右滑动；工具栏里的「星图」会把整张表缩进屏幕。

## 部署到 GitHub Pages

站点在仓库根目录，适合从 `main` 分支的根目录发布。

1. 把本仓库推到 GitHub。
2. 打开仓库 Settings → Pages。
3. Build and deployment 选 Deploy from a branch。
4. Branch 选 `main`，文件夹选 `/ (root)`，保存。
5. 等部署完成后访问 `https://<用户名>.github.io/<仓库名>/`。

根目录有 `.nojekyll`，避免 Jekyll 忽略下划线开头的文件。不需要 Node 构建。

## 数据从哪来

页面里的「数据从哪来」写的是同一份说明，这里再列一次：

- **原子量**：CIAAW 简约标准原子量（网站页面标明 2024，依据 Atomic Weights 2021，并含 2024 年对锆、钆、镥的修订）。有区间的元素同时给出标准原子量区间。CIAAW 标成「—」的，页面写「无标准原子量」，不用质量数冒充。
- **电子组态**：与 NIST 原子光谱数据和通行周期表一致的基态。脚本会把各亚层电子数加总，核对等于原子序数。壳层图只按主量子数计数，是玻尔式示意。原子序数大于 99 的组态标注为预测或计算。
- **可见谱线**：NIST *Handbook of Basic Atomic Spectroscopic Data* 的 Strong Lines 表，空气波长。每种元素最多 8 条，兼顾强度和在可见区里的分布。这不是完整光谱。砹、钫以及镄以后，该手册没有可用的可见强线，面板留空。
- **焰色**：只收录定性分析和经典光谱学里反复出现的颜色。色块是示意，不是测色值。钙、锶、钡、铜的肉眼颜色很大程度来自分子带，和原子强线不是同一件事。
- **用途**：本项目用中文写的共识性工业、医学和教材用途。没有稳定用途就写没有日用。
- **原子核**：核子按 NIST《Atomic Weights and Isotopic Compositions》里天然丰度最高的同位素配比着色，并在原子下方列出前三种天然同位素组成（`data/isotopes.json`，84 个元素有数据），质子数 = 原子序数；没有天然丰度的元素显示「无天然丰度数据」，不估算。
- **人体百分比**：只出现在故事第五章，是解剖学教材常见的按质量数量级，不是体检值。

组态原文在 `data/configs.json`，谱线节选在 `data/spectra.json`。页面实际读取的是生成后的 `data/elements.js`（这样用 `file://` 打开也不受 fetch 限制）。`data/elements.json` 是同一份数据，方便检查。

修改事实后运行：

```bash
python3 tools/build_elements.py
python3 tools/validate_elements.py
```

## 目录

```text
index.html
css/styles.css
js/intro.js          开场粒子
js/app.js            周期表、故事、档案面板
data/elements.js     页面使用的元素数据
data/elements.json   同上，JSON
data/story.js        七章叙事
data/configs.json    基态组态
data/spectra.json    可见强线节选
fonts/               Noto 字体子集（SIL OFL）
tools/build_elements.py
tools/validate_elements.py
prompts/复现与扩展.md
skills/chem-stardust-periodic/SKILL.md
```

## 声音

- **影片**：`assets/film/score.mp3` 是旁白与配乐的混音母版（112 秒，-16 LUFS），与影片时间轴逐句对齐。
- **元素的声音**：`js/stardust-audio.js` 用 WebAudio 实时合成。把可见光谱等比搬进听域
  （780 nm → 110 Hz，380 nm → 225.8 Hz），谱线之间的音程关系保持真实。悬浮或点按任意格子就会响。
- 诚实的边界：钠的 D 双线只差 0.15%，搬到耳朵里是 0.147 Hz 的拍音，人耳听不出来，所以它是纯音；
  21 个没有可见强线的元素（砹、钫以及镄之后）保持静音，不用假音补。
桌面版把周期表放进宇宙背景：三层星点 + 一层星云，随鼠标做很小的透视转向；影片结束直接溶进同一片星空，不再有换场硬切。
