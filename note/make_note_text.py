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
            fmt.append(("区切り線", len(out) - 1, None))
            n += 1
            continue

        if s.startswith("## "):
            t = s[3:].strip()
            out.append(t)
            n += 1
            fmt.append(("大見出し", len(out) - 1, t))
            continue

        if s.startswith("### "):
            t = s[4:].strip()
            out.append(t)
            n += 1
            fmt.append(("小見出し", len(out) - 1, t))
            continue

        if s.startswith("> "):
            t = s[2:].strip()
            t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
            out.append(t)
            n += 1
            fmt.append(("引用", len(out) - 1, t[:30]))
            continue

        # 太字を拾う
        for m in re.finditer(r"\*\*(.+?)\*\*", s):
            fmt.append(("太字", len(out), m.group(1)))

        t = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
        t = re.sub(r"^\s*[-*]\s+", "・", t)
        out.append(t)
        n += 1

    # 連続する空行を1つにし、先頭の空行も落とす。
    # 整形メモの行番号は、この「貼り付けるテキスト」の行番号に合わせる
    cleaned, where, prev_blank = [], {}, True
    for i, l in enumerate(out):
        blank = not l.strip()
        where[i] = len(cleaned)  # 落とした行は、次に残る行の位置を指す
        if blank and prev_blank:
            continue
        cleaned.append(l)
        prev_blank = blank
    while cleaned and not cleaned[-1].strip():
        cleaned.pop()

    def last_text_before(j):
        for k in range(min(j, len(cleaned)) - 1, -1, -1):
            if cleaned[k].strip():
                return k
        return None

    located = []
    for kind, i, t in fmt:
        j = where.get(i, len(cleaned))
        if kind == "区切り線":
            k = last_text_before(j)
            if k is None or j >= len(cleaned):
                continue  # 本文の最初や最後の区切り線は note では不要
            located.append((kind, f"{k+1}行目のあと", f"「{cleaned[k][:20]}」の下に「−」（区切り線）を入れる"))
        else:
            located.append((kind, f"{j+1}行目", t))

    return title, "\n".join(cleaned), located


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

        f.write("■ 公開設定（毎回これ）\n")
        if name == "profile":
            f.write("  マガジン    追加しない（自己紹介は連載の記事ではないため）\n")
            f.write("  ハッシュタグ #自己紹介 #訪問看護 #看護師 #人事\n")
            f.write("  価格        無料\n")
            f.write("  固定表示    する（プロフィールの先頭に固定）\n\n")
        else:
            f.write("  マガジン    人事の失敗図鑑  ★忘れやすい\n")
            f.write("  ハッシュタグ #訪問看護 #看護師 #人事 #採用\n")
            f.write("              ＋その回の内容タグを1つ（例: #育成 #マネジメント #組織づくり）\n")
            f.write("  価格        無料\n")
            f.write("  固定表示    しない\n\n")

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
