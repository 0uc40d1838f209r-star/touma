#!/usr/bin/env python3
"""
note 貼り付け用テキストの生成

    python3 note/make_note_text.py note/drafts/00-hajimeni.md

note のエディタは Markdown 記法をそのまま解釈しません。
`**太字**` や `## 見出し` を貼ると、記号がそのまま文字として残ります。

このスクリプトは原案から
  1. 記号を取り除いたプレーンテキスト（そのまま貼れる）
  2. 貼ったあとに手で整形する箇所のリスト
を作ります。出力先は note/note-paste/。
"""
import sys, os, re

OUT = os.path.join(os.path.dirname(__file__), "note-paste")


def convert(path):
    raw = open(path, encoding="utf-8").read()

    # 制作メモ（--- --- 以降）を落とす
    body = re.split(r"\n---\n---\n", raw)[0]

    lines = body.split("\n")

    # ファイル自身の見出しと説明ブロックを落とし、記事タイトル（最後の # 行）から始める
    heads = [i for i, l in enumerate(lines) if l.startswith("# ")]
    lines = lines[heads[-1]:] if heads else lines

    title = lines[0][2:].strip()
    lines = lines[1:]

    out, fmt = [], []
    n = 0  # 出力の行番号

    for l in lines:
        s = l.rstrip()

        if s.strip() == "---":
            out.append("")
            fmt.append(("区切り線", f"{n+1}行目のあたり", "ツールバーの「−」（区切り線）を入れる"))
            n += 1
            continue

        if s.startswith("## "):
            t = s[3:].strip()
            out.append(t)
            n += 1
            fmt.append(("大見出し", f"{n}行目", t))
            continue

        if s.startswith("### "):
            t = s[4:].strip()
            out.append(t)
            n += 1
            fmt.append(("小見出し", f"{n}行目", t))
            continue

        if s.startswith("> "):
            t = s[2:].strip()
            t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
            out.append(t)
            n += 1
            fmt.append(("引用", f"{n}行目", t[:30]))
            continue

        # 太字を拾う
        for m in re.finditer(r"\*\*(.+?)\*\*", s):
            fmt.append(("太字", f"{n+1}行目", m.group(1)))

        t = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
        t = re.sub(r"^\s*[-*]\s+", "・", t)
        out.append(t)
        n += 1

    # 連続する空行を1つに
    cleaned, prev_blank = [], False
    for l in out:
        blank = not l.strip()
        if blank and prev_blank:
            continue
        cleaned.append(l)
        prev_blank = blank

    return title, "\n".join(cleaned).strip(), fmt


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    src = sys.argv[1]
    name = os.path.splitext(os.path.basename(src))[0]
    os.makedirs(OUT, exist_ok=True)

    title, text, fmt = convert(src)

    body_path = os.path.join(OUT, f"{name}.txt")
    with open(body_path, "w", encoding="utf-8") as f:
        f.write(text + "\n")

    fmt_path = os.path.join(OUT, f"{name}-整形メモ.txt")
    with open(fmt_path, "w", encoding="utf-8") as f:
        f.write(f"■ タイトル欄に入れる\n{title}\n\n")
        f.write("■ 本文を貼ったあと、この順で整形してください\n")
        f.write("  （note のツールバー、または行頭で見出しボタンを押す）\n\n")
        order = {"大見出し": 1, "小見出し": 2, "引用": 3, "区切り線": 4, "太字": 5}
        for kind in sorted({k for k, _, _ in fmt}, key=lambda k: order.get(k, 9)):
            items = [(w, t) for k, w, t in fmt if k == kind]
            f.write(f"● {kind}（{len(items)}箇所）\n")
            for w, t in items:
                f.write(f"    {w}\t{t}\n")
            f.write("\n")

    print(f"  {body_path}")
    print(f"  {fmt_path}")
    print(f"\nタイトル: {title}")


if __name__ == "__main__":
    main()
