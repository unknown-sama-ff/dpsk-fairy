# 变更记录（2026-10-23 / 10-24）

本次改造把 DeepSeek Harness 桌面端从默认界面改造成《绝区零》「FAIRY Ⅲ / HDD」风格，并接通了本地 Fairy 语音。

## 1. 主题与视觉

- 新增第三方主题 `fairy`（`ctx.theme.register`，dark），并绕过主题水合后的浅色回绘：token 同时以 `!important` 写到 body、CSS 覆盖、1.4s 后再断言一次。
- 深色 HUD 调色板：`bg-base #03080f`、layer-1/2/3、边框、标签、气泡、菜单、按钮全部对齐暗夜蓝。
- 背景：HDD 壁纸（1920×1200 SVG）+ 扫描线 + 网格 + 暗角，`assets/fairy.css` 统管。
- 侧栏、输入框、消息气泡、菜单、设置页在暗色下的一致性走查。

## 2. 开屏、问候与徽记

- 启动先播 `assets/boot.mp4`（1600×900，5.4MB，源片 74MB），带 HUD 边角、进度条、跳过提示；点击或 ESC 跳过，6s 兜底、24s 看门狗。
- 开屏结束后进入问候场景：发光徽记 + 3 行台词 + 欢迎语音，8.6s 后自动归位到左下角。
- 左下角 84px 徽记常驻：点击弹出对话小窗（语音 / 朗读开关 / 重播开屏 / 关闭皮肤），再点收起；**点窗口其他位置自动收起**，Esc 也可关闭。
- 关闭皮肤后头像上方保留一个小 `FAIRY` 胶囊，点它重新开启；关闭只对当前窗口生效，重启默认回到 FAIRY 模式。

## 3. 品牌与标题

- 侧栏品牌（`sidebar.brand.mark` / `sidebar.brand.name`，priority -1 遮蔽原注册）替换为徽记 + `FAIRY`。
- 新会话 Hero 标题替换为「欢迎回来，法厄同」（原「探索未至之境 / 预览版」由 CSS 让位）。
- 按用户要求去掉「Ⅲ」：品牌、徽记标签、气泡标题、开屏右上角、问候页脚注、图标 aria-label、locale、README 全部统一为 `FAIRY`。

## 4. 语音链路

- 初版：Host 内置 `vendor/` edge-tts（6.1MB，cp312），`/fairy/tts` 合成并磁盘缓存。
- 改为本地 GPT-SoVITS v2（用户提供的 `Fairy-e10.ckpt` / `Fairy_e10_s870.pth`，参考音色 5.6s）：
  - 运行时放在 `D:\Desktop\FairyTTS`（GPT-SoVITS + 隔离 venv，复用 DDSP 环境的 torch 2.9/CUDA）；
  - Host 启动时自动拉起 `api_v2.py`（127.0.0.1:9880，约 15–20s 加载，常驻显存）；
  - `/fairy/tts` 返回 `audio/wav`，失败重试一次后回退 edge-tts（`audio/mpeg`）；
  - 兼容补丁：torchaudio 2.9 的 `torchaudio.load` 改 soundfile；`jieba_fast` 用纯 Python jieba 兜底；cmudict / averaged_perceptron_tagger 补齐；
  - 回退排障：GPT-SoVITS 在 Windows 下按 GBK 写文本，emoji（✅❌⚠️）导致 `'gbk' codec` 400 → 送本地引擎前过滤非 GBK 字符 + 服务端 `PYTHONUTF8=1`。
- 语音包（欢迎词、3 句闲聊、开机词）用本地模型重新生成并替换，URL 加 `?v=2` 防缓存。

## 5. 剩余电量（账户余额）

- 挂在 `conversation.composer.dock`，order 2（排在 `activity` 0、`usage` 1 之后），显示在最右侧。
- Host 新增 `GET /fairy/balance` → `ctx.deepseekAccount.getBalance`，客户端每 60s / 窗口聚焦刷新，显示 `⚡ 电量 ¥x.xx`；未登录或失败时整条隐藏。

## 6. 其他修复

- 重启后不自动进皮肤：关闭标记从 localStorage 改到 sessionStorage，默认开启。
- 关闭后的 `FAIRY` 胶囊与用户头像重叠 → 上移到 `bottom: 82px`。
- CSS 缓存导致换肤不生效 → 资源路由对 css/js/html 设 `no-store`，媒体 86400，CSS URL 按版本号递增。
- `remote.account` 注入热更新不生效 → 余额改走 Host 路由。

## 7. 分发

- 仓库整理为可直接安装的插件包 + 一键脚本（`install.ps1` / `uninstall.ps1`）+ `AGENTS.md`（给 AI agent 的安装说明）。
- 未入库：GPT-SoVITS 运行时、模型权重、生成的语音文件（体积/授权原因）。
