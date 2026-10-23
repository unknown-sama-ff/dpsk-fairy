"""用本地 GPT-SoVITS API 生成 FAIRY 的语音包。

用法（先启动 api_v2.py）：
    python tools/gen_voice.py --url http://127.0.0.1:9880/tts \
        --ref D:/Desktop/FairyTTS/ref/fairy_ref.wav \
        --prompt "了解我会如同主人使唤我一般使唤它，并且让它不敢有怨言。" \
        --out D:/Desktop/dpsk-fairy/fairy-mode/assets/voice

生成 hello / idle1-3 / boot 五个 wav，再用 ffmpeg 转 mp3（或直接用 wav，客户端按同名播放）。
"""
import argparse
import json
import os
import urllib.request

LINES = {
    'hello': '欢迎回来，主人。系统自检完成，我已经就位。今天想先处理哪一件事？',
    'idle1': '主人，我一直都在。',
    'idle2': '数据链路稳定，随时可以开始。',
    'idle3': '需要我先帮你理一下今天的任务吗？',
    'boot': '神经链接建立中，请稍候。',
}


def synth(url, ref, prompt, text, out):
    body = json.dumps({
        'text': text,
        'text_lang': 'zh',
        'ref_audio_path': ref,
        'prompt_text': prompt,
        'prompt_lang': 'zh',
        'text_split_method': 'cut5',
        'batch_size': 1,
        'media_type': 'wav',
        'streaming_mode': False,
    }).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = resp.read()
    with open(out, 'wb') as f:
        f.write(data)
    print(os.path.basename(out), len(data), 'bytes')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://127.0.0.1:9880/tts')
    ap.add_argument('--ref', required=True, help='参考音频 wav（5-10 秒）')
    ap.add_argument('--prompt', required=True, help='参考音频对应的文本')
    ap.add_argument('--out', required=True, help='输出目录')
    ap.add_argument('--only', nargs='*', help='只生成指定名字')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    for name in (args.only or list(LINES)):
        synth(args.url, args.ref, args.prompt, LINES[name], os.path.join(args.out, name + '.wav'))


if __name__ == '__main__':
    main()
