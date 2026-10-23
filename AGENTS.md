# AGENTS.md —— 给 AI agent 的安装指令

本仓库是一个 **DeepSeek Harness（DSH）桌面端** 的 Cordis 插件包（Host + Client 双半），
用于把 DSH 界面改成《绝区零》Fairy / HDD 风格。下面的步骤面向“根据仓库帮我改主题”的 agent。

## 前置检查

1. 目标是 **Windows** 上的 DSH 桌面端。
2. profile 目录存在：`%USERPROFILE%\.dsh\profiles\desktop\package.json`。
   - 不存在 → 用户还没启动过 DSH，请让用户先启动一次。
3. 插件包位于仓库的 `fairy-mode/`。

## 安装（三选一）

### 方案 A：一键脚本（推荐）

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

脚本会：复制 `fairy-mode/` 到 `%USERPROFILE%\.dsh\bundles\dsh-fairy-mode`，
在 profile 的 `package.json` 里登记 `link:` 依赖与 `dsh.profile.bundles` 条目，
并在 `node_modules/@local/` 建目录联接。

### 方案 B：远程一行

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/unknown-sama-ff/dpsk-fairy/main/install.ps1 | iex"
```

### 方案 C：手工

1. `fairy-mode/` 复制到 `%USERPROFILE%\.dsh\bundles\dsh-fairy-mode`。
2. 编辑 `%USERPROFILE%\.dsh\profiles\desktop\package.json`：
   - `dependencies` 增加 `"@local/dsh-fairy-mode": "link:<绝对路径，正斜杠>"`；
   - `dsh.profile.bundles` 数组追加 `"@local/dsh-fairy-mode"`。
3. `node_modules/@local/dsh-fairy-mode` 创建 Junction 指向该目录。
4. 备份 `package.json` 后再写入。

## 必须让用户重启

DSH 桌面端在启动时缓存客户端模块图。**安装完文件后必须完全退出 DSH 再启动**（含托盘），
否则页面会卡在 “Loading plugins...” 或保持旧主题。Agent 不要尝试自己重启 DSH 进程。

## 验收

重启后应观察：

- 启动时播放 HDD 开机动画，随后左下角出现 Fairy 徽记；
- 左上角品牌变为 `FAIRY`；
- 界面为深色 HUD（不是普通浅色）；
- 点徽记弹出小窗，点窗口其他位置会收起。

## 语音权重（可选）

仓库自带语音包，装完就有声；要 Fairy 本音需自备 GPT-SoVITS v2 权重：

- 获取渠道：https://github.com/Michae1o/fairy-stackchan/tree/main/voice-package
- 完整步骤：`docs/VOICE.md`
- 权重与参考音频**不要**再分发到公开仓库。

## 卸载

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

## 常见问题

| 现象 | 处理 |
|---|---|
| 卡在 “Loading plugins...” | 没重启或重启不彻底；完全退出进程后重开 |
| 皮肤是浅色 | 检查 `dsh.profile.bundles` 是否包含 `@local/dsh-fairy-mode`，以及 Junction 是否指向正确目录 |
| 没有语音 | 默认 edge-tts 需要网络；本地 GPT-SoVITS 需自行配置 `tts`（见 README） |
| 想改配置 | 在 profile 的 `cordis.patch.yml` 增加 `- id: fairy-mode` 条目覆盖 `config` |
