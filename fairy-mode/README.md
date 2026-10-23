# FAIRY 模式（DSH 桌面端皮肤）

把 DeepSeek Harness 桌面端改成《绝区零》HDD 系统的样子：开机动画、Fairy 徽记、暗色 HUD 皮肤、语音问候与朗读。

## 装好之后

1. **重启一次 DeepSeek Harness**（桌面端启动时缓存了插件图，新插件只有在重启后才会挂载）。
2. 启动后会先播开屏动画（14.5s，可点击或按 ESC 跳过），随后问候并归位到左下角。
3. 左下角徽记：点击对话；气泡里有 语音 / 朗读开关 / 重播开屏 / 关闭皮肤。
4. 关闭皮肤后左下角（头像上方）会留一个小 `FAIRY` 胶囊，点它重新开启；关闭只对当前窗口生效，重启后会自动回到 FAIRY 模式。
5. 输入框下方统计行的最右侧显示「⚡ 电量 ¥x.xx」——即账户余额，挂在 `conversation.composer.dock` 的 order 2（紧随 `activity`、`usage`）；每 60 秒或窗口重新获得焦点时刷新，未登录或取不到时自动隐藏。

## 组成

| 部分 | 说明 |
|---|---|
| Host 半 | `/fairy/assets/*` 素材路由、`/fairy/tts` 语音合成（本地 GPT-SoVITS 优先，失败回退 edge-tts，磁盘缓存）、`/fairy/balance` 账户余额（`ctx.deepseekAccount.getBalance`）、Fairy 人设提示段 |
| Client 半 | 第三方主题 `fairy`（暗色 token）、`shell.overlay` 上的开屏/问候/徽记、侧栏品牌替换、新会话 Hero 标题替换（`conversation.hero.brand.mark` → 徽记 + 「欢迎回来，法厄同」，原「探索未至之境 / 预览版」由 CSS 让位）、消息朗读按钮、输入框下方余额用电量 |
| 素材 | `assets/boot.mp4`（1600×900，5.4MB，源 74MB）、`bloom.webp`、`mascot.svg`、`wallpaper.svg`、`poster.jpg`、`voice/*.mp3`（已换成 GPT-SoVITS 生成） |
| 语音运行时 | `D:\Desktop\FairyTTS`：GPT-SoVITS v2 + 隔离 venv（复用 DDSP 那套 torch 2.9/CUDA）+ `Fairy-e10.ckpt` / `Fairy_e10_s870.pth`；`vendor/` 内置 edge-tts 仅作回退 |

## 语音（GPT-SoVITS v2）

- 权重来自 `D:\Desktop\Fairy(1)`：`GPT_SoVITS/GPT_weights_v2/Fairy-e10.ckpt`、`SoVITS_weights_v2/Fairy_e10_s870.pth`，参考音色 `D:\Desktop\FairyTTS\ref\fairy_ref.wav`（5.6s）。
- DSH 启动时 Host 会在后台拉起 `api_v2.py`（127.0.0.1:9880，约 15–20s 加载完，常驻显存），首次唤醒后 `���fairy/tts` 直接返回 `audio/wav`；任何失败都会静默回退到 edge-tts（`audio/mpeg`），不会哑掉。
- 手动启停：`D:\Desktop\FairyTTS\start-tts.ps1` / `stop-tts.ps1`。
- 相关配置（`config.tts`）：`engine: auto|gpt-sovits|edge`、`url`、`gptDir`、`python`、`refAudio`、`promptText`、`promptLang`、`autoStart`。
- 兼容补丁：`TTS_infer_pack/TTS.py` 用 soundfile 读取参考音频（torch 2.9 的 torchaudio 依赖 torchcodec），`jieba_fast` 用纯 Python jieba 兜底（无 cp311 wheel）。

## 配置（profile 的 `cordis.patch.yml`）

```yaml
- id: fairy-mode
  name: '@local/dsh-fairy-mode'
  config:
    persona: true              # 注入 Fairy 人设提示
    voice: true                # 启用 /fairy/tts
    voiceName: zh-CN-XiaoyiNeural
    voiceRate: '-2%'
    personaText: '……'          # 覆盖默认人设
    pythonPath: 'C:\...\python.exe'  # 可选，默认用 DSH 自带运行时
```

## 预览页

`http://127.0.0.1:14664/fairy/assets/preview.html?scene=dock|greet|splash` 可以直接看设计稿（不需要登录）。

## 移除

`plugin_manager` 里停用或移除 `@local/dsh-fairy-mode` 即可；插件不改安装目录，卸载后完全恢复。若只是想去掉皮肤，用气泡里的「关闭」更快。

## 版权

- 代码、动画参数、皮肤：随意修改使用。
- FAIRY 徽记为照《绝区零》HDD 系统徽记重绘的同人矢量，角色与美术版权归 miHoYo / HoYoverse；请勿商用。
- 开机动画来自你提供的素材；语音由 edge-tts 合成。
