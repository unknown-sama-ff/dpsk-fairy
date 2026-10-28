# 参与编辑

这个仓库接受外部改动。按你对仓库的权限，选下面任一条路。

## A. 我没有写权限（推荐所有人用这条）

1. 在 GitHub 上点 **Fork**，得到你自己的副本。
2. 克隆下来，在**自己的分支**上改：

   ```powershell
   git clone https://github.com/<你的用户名>/dpsk-fairy.git
   cd dpsk-fairy
   git switch -c fix/short-topic
   ```

3. 本地装一次看效果（会写进你自己的 DSH profile）：

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install.ps1
   ```

   改完 `fairy-mode/` 里的文件后，**完全退出并重启 DeepSeek Harness** 才会生效（客户端模块只在启动时加载）。
   只改 `fairy-mode/assets/fairy.css` 的话，重启插件即可，不必重启整个应用。

4. 提交、推送、开 Pull Request：

   ```powershell
   git add -A
   git commit -m "fix: 一句话说明改了什么"
   git push -u origin fix/short-topic
   ```

   PR 里写清：改了什么、为什么、怎么验证（截图或现象对比）。

## B. 我有写权限（被加为 collaborator 或组织成员）

别直接往 `main` 上推，按分支 + PR 走，理由见下节。流程同 A 的第 2～4 步，只是不用 fork。

## 两个必须知道的约定

- **`main` 会被改写历史**（维护者偶尔 squash/force-push 清理提交）。如果你本地留了旧的 `main`，拉取时用：

  ```powershell
  git fetch origin
  git reset --hard origin/main
  ```

  不要 `git pull` 后手动合并，容易把已清理的提交再带回来。

- **PR 请只改自己关心的部分**。样式改动集中在 `fairy-mode/assets/fairy.css`，行为改动在 `fairy-mode/client.js`（客户端，需重启）和 `fairy-mode/index.js`（Host，重载插件即生效）。同时改多处时，说明各自的验证方式。

## 提交信息风格

```
fix: 修掉了什么
feat: 加了什么
style: 只改样式/排版
docs: 只改文档
```

一行说清即可；正文按需要补「为什么」和「怎么验」。

## 不要提交的东西

- GPT-SoVITS 权重、参考音频、生成的语音文件（体积与授权原因，见 `docs/VOICE.md`）。
- 本机路径、个人 `~/.dsh` 配置、日志。
- `fairy-mode/vendor/` 下的 `__pycache__`、`.pyc`。
