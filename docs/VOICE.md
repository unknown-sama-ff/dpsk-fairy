# 语音：本地 GPT-SoVITS v2（可选增强）

> 仓库里已经带了 **edge-tts 兜底** 和 **预生成的语音包**（`fairy-mode/assets/voice/*.mp3`），
> 所以别人装上皮肤后开屏问候、点徽记闲聊都是有声的，只是音色是微软的。
> 想要「Fairy 本音」，需要自己在本机跑 GPT-SoVITS 推理。

## 需要什么

- Windows + NVIDIA 显卡（6GB 显存起，8GB 稳）
- Python 3.11（可复用现有环境，见下）
- 磁盘：运行时 + 底模约 5–8GB
- GPT-SoVITS v2 微调权重：`Fairy-e10.ckpt`（GPT）+ `Fairy_e10_s870.pth`（SoVITS），以及一段 5–10 秒参考音频与它的文本

权重体积约 240MB，不适合直接进 git（GitHub 单文件限制 100MB）。建议放进 **GitHub Release**（每个文件上限 2GB）或网盘，在仓库 README 里给出链接。

## 搭建步骤

1. 克隆 GPT-SoVITS（或用你已有的整合包）：
   ```powershell
   git clone --depth 1 https://github.com/RVC-Boss/GPT-SoVITS.git D:\Desktop\FairyTTS\GPT-SoVITS-main
   ```

2. 建隔离环境（复用已有的 torch 可以省 2.5GB 下载）：
   ```powershell
   python -m venv --system-site-packages D:\Desktop\FairyTTS\venv
   D:\Desktop\FairyTTS\venv\Scripts\python.exe -m pip install -r D:\Desktop\FairyTTS\GPT-SoVITS-main\requirements.txt `
     -i https://pypi.tuna.tsinghua.edu.cn/simple
   ```

3. 下载 v2 底模到 `GPT_SoVITS/pretrained_models/`（国内推荐 ModelScope）：
   - `chinese-hubert-base`、`chinese-roberta-wwm-ext-large`
   - `gsv-v2final-pretrained/s1bert25hz-5kh-longer-epoch=12-step=369668.ckpt`
   - `gsv-v2final-pretrained/s2G2333k.pth`

4. 放权重：
   ```
   GPT_SoVITS/GPT_weights_v2/Fairy-e10.ckpt
   GPT_SoVITS/SoVITS_weights_v2/Fairy_e10_s870.pth
   ```

5. 改 `GPT_SoVITS/configs/tts_infer.yaml` 的 `custom` 段（`device: cuda`、`is_half: true`，路径指向上面的文件）。

6. 三项兼容补丁（torch 2.6+/3.11 下必踩）：
   - `torchaudio.load` 走 torchcodec：把 `TTS_infer_pack/TTS.py` 里的两处 `torchaudio.load(...)` 换成 `soundfile.read`；
   - `jieba_fast` 没有 cp311 wheel：装 `jieba`，在 site-packages 里放一个 `jieba_fast` 包 shim（`from jieba import *`、`posseg` 同理）；
   - 中文分词/英文 G2P 依赖：把 nltk 的 `cmudict`、`averaged_perceptron_tagger` 下到 `%APPDATA%\nltk_data`；
   - 启动时设 `PYTHONUTF8=1`、`PYTHONIOENCODING=utf-8`，否则 emoji 会让服务按 GBK 写日志时报 400。

7. 启动服务：
   ```powershell
   D:\Desktop\FairyTTS\venv\Scripts\python.exe api_v2.py -a 127.0.0.1 -p 9880 -c GPT_SoVITS/configs/tts_infer.yaml
   ```
   约 15–20 秒加载完，监听 127.0.0.1:9880。

8. 在 profile 的 `cordis.patch.yml` 里让插件指向它：
   ```yaml
   - id: fairy-mode
     name: '@local/dsh-fairy-mode'
     config:
       tts:
         engine: gpt-sovits
         url: http://127.0.0.1:9880
         refAudio: D:/Desktop/FairyTTS/ref/fairy_ref.wav
         promptText: 了解我会如同主人使唤我一般使唤它，并且让它不敢有怨言。
         autoStart: true
   ```

## 重新生成语音包

仓库自带的是用这套模型生成的 mp3。换成你自己的参考音频后，用 `tools/gen_voice.py` 重生成：

```powershell
python tools/gen_voice.py --ref <参考.wav> --prompt "<参考音频文本>" --out fairy-mode/assets/voice
```

得到 wav 后用 ffmpeg 转 mp3（或直接改名替换 mp3，客户端按文件名播放）：

```powershell
ffmpeg -i fairy-mode/assets/voice/hello.wav -ac 1 -ar 24000 -b:a 64k fairy-mode/assets/voice/hello.mp3
```

## 授权提醒

- 权重来自社区分享，作者标注**严禁商用**；生成的语音同样只建议自用。
- 《绝区零》Fairy 形象与素材版权归米哈游所有。
