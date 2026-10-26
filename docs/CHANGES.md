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
## 8. 主题稳定性与运行指示（补记）

- **设置页变白**：DSH 的 settings 卡片用 `--dsw-static-neutral-*` / `--dsw-alias-settings-card-fill`，皮肤原先未覆盖这些 token；已把整套调色板搬进样式表并加 `!important`（作者重要声明优先于主题 presenter 的内联普通声明，且不会被它的 `removeProperty` 清掉）。
- **切换模型时闪白**：presenter 重绘会逐个 `removeProperty` 内联 token，原先写在 `body` 内联上的值被一起删掉 → 一两帧没有 token。改为样式表声明后不再断档；守卫也改为同步重断言且**不重写全部 token**（否则展开的弹出面板会整体重算一次样式）。
- **窗口外框白一帧**：`html[data-ds-theme-source]` 会被同步给 Electron `nativeTheme`。皮肤开启时强制为 `dark`，并给根元素兜底背景色。
- **弹出层闪烁**：菜单/选择器改为实色表面并禁用 transition 与 backdrop-filter。
- **思考中文案**：皮肤开启时把 `深度求索中，用时 N 秒 ···` 换成 `HDD计算中，用时 N 秒 ···`，前面的鲸鱼尾换成 FAIRY 徽记。做法是隐藏原标签、由插件镜像一个自己的节点（不修改聊天插件拥有的文本节点，关闭皮肤即还原）；镜像节点使用独立类名与实色，避免继承闪烁文本的透明字色。
- **插话/排队文字过暗**：队列条目的正文用的是 `--dsw-alias-label-primary-dimmed`，已提升为 `#c4d8e9`；并对 `[data-queue-dock]` 的预览、以及 `data-pending-steering` / `data-submission-echo` 行强制正文亮色。

## 9. 工作区

- 插件实体与仓库合一：`D:\Desktop\dpsk-fairy`（profile 以 `link:` 指向其 `fairy-mode/`），不再在默认工作区保留副本。
