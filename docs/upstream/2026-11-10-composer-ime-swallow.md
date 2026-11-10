# [Composer] IME commit after a selection deletes an extra run of characters

> Posted upstream: <https://github.com/deepseek-ai/deepseek-harness/discussions/12826>
> (General, 2026-11-10). This file is the local copy of that report.

**Environment**

- DeepSeek Harness desktop `0.2.2-rc.1` (Electron 44.7.0 / Chromium, Windows 11 24H2)
- Draft composer: `@deepseek-ai/dsh-client-ui-conversation@0.2.2-rc.1`
- IME: Microsoft Pinyin — any IME that fires `compositionstart` should do

**Repro**

1. In the composer, put a line of text, e.g. `GITHUB：https://github.com/Tranquillitatis-Lab/dsh-live-compact`
2. With the mouse, select the leading `GITHUB：` (7 characters) and leave the selection in place.
3. With the Chinese IME, type one character and commit it.

**Expected**: the character replaces the selection → `是https://github.com/Tranquillitatis-Lab/dsh-live-compact`

**Actual**: `是//github.com/Tranquillitatis-Lab/dsh-live-compact` —
`https:` is gone. The committed character replaces *selection-length* characters of the **new** text, not just the selection.

Pasting is incidental; the condition is "non-collapsed selection + IME composition start".

**Trace** (capture-phase, passive listeners inside the page; nothing is prevented)

```
compositionstart          selection T7>T0 (7 chars)  text "GITHUB：https://…"
                          +5 ms: text becomes "https://…"   ← no beforeinput, no input event
compositionupdate  data="https:"                     (browser reads its composing text out of the new DOM text)
beforeinput  insertCompositionText data="看"  selection T0>T7
input        insertCompositionText data="看"  text "看//github.com/…"   ← 7 chars of the new text replaced
compositionend     data="看"
```

**Diagnosis**

`compositionstart` over a non-collapsed selection makes the draft editor delete the selection through a
controlled command (an empty text insertion) inside the same dispatch, while the DOM selection / the browser's
composition range keeps its original width. The IME's commit then replaces that width in the already-updated
text — the selection is effectively deleted twice.

In the shipped bundle this is Lexical's composition-start handler (`$onCompositionStart`, `lib/client.js:7052`
in 0.2.2-rc.1): when `!selection.isCollapsed()` it dispatches `CONTROLLED_TEXT_INSERTION_COMMAND` with empty
text and does not collapse the DOM selection. It reads as stock Lexical 0.49 behaviour, so this may not be
DSH-specific.

**Workaround verified on the same build** (applied from a third-party theme, outside the composer)

On `compositionstart` in the capture phase, before the editor's handler runs, collapse the DOM selection to its
start if `[data-composer-input]` holds a non-collapsed selection. No text is touched: the editor still performs
its own deletion, but the browser's composition range no longer spans the new text, so the commit lands as a
caret insertion. Same gesture now yields `是https://github.com/Tranquillitatis-Lab/dsh-live-compact`.

**Suggested upstream fix**

Collapse the DOM selection along with the controlled deletion in `$onCompositionStart` (or run it through a
native editing path) so the composition range starts caret-width. On Chromium a re-collapse right after the
deletion is enough.

**Note**

Not related to any plugin: the theme involved only sets CSS variables and never writes composer text; we hit
this while building it and confirmed the composer is untouched.