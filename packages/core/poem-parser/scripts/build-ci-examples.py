#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""钦定词谱 qdcp-canonical.json → ci-examples-bundle.json（例词数据）

精简产物：仅「变体 id → 分句例词文字列表」。作者/sketch/平仄/分阕/韵脚
等既有数据已存于 ci-catalog.json / ci-tunes-bundle-compact.json，不重复。

  { "定风波-欧阳炯体1": ["暖日闲窗映碧纱","小池春水浸明霞", ... ,"教人羞道未还家"] }

- 句边界 = 韵family + 句 标记；「读」= 句内逗，直接内嵌为「，」（如「绣帘开，一点明月窥人」）
- 数组元素按序对齐格律行；分阕靠格律 sectionBreaks
- 自校验：字数、句数须与 sketch 一致，不符者不产出、进 todo 清单
- 换韵组等"格律信息"不放这里（另议）

按 (词牌名 + 归一作者 + 归一sketch) 匹配到 poem-creation 变体 id。
未匹配 / 校验不过的 → todo 清单（默认写到 qdcp 输入目录，仓库外，不入库）。

用法:
  python3 build-ci-examples.py \
      --qdcp /home/terrence/workspace/open-source/Reading/poem/qdcp/qdcp-canonical.json
"""
import json, re, csv, argparse
from pathlib import Path

HERE = Path(__file__).resolve().parent
CATALOG = HERE.parent / "data" / "ci-catalog.json"

BREAK = re.compile(r'(换[平仄]韵|平韵|仄韵|韵|句|叠|重|首|再|读)')
CN = {'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10}


def cnum(s):
    if s in CN: return CN[s]
    if len(s) == 2 and s[0] == '十': return 10 + CN.get(s[1], 0)
    if len(s) == 2 and s[1] == '十': return CN.get(s[0], 0) * 10
    if len(s) == 3 and s[1] == '十': return CN.get(s[0], 0) * 10 + CN.get(s[2], 0)
    return None


def norm_author(a):
    a = re.sub(r'[\s　]', '', a or '')
    a = re.sub(r'^（[^）]*）', '', a)
    return re.sub(r'^\([^)]*\)', '', a)


def norm_sketch(s):
    return re.sub(r'[\s　、，。,\.]', '', s or '')


def want_chars(sk):
    m = re.search(r'([一二两三四五六七八九十百]+)字', sk or '')
    if not m: return None
    s = m.group(1)
    if '百' in s:
        mm = re.match(r'([一二两三四五六七八九])?百([一二三四五六七八九十]+)?', s)
        if not mm: return None
        h = CN.get(mm.group(1), 1) if mm.group(1) else 1
        return h * 100 + ((cnum(mm.group(2)) or 0) if mm.group(2) else 0)
    return cnum(s)


def want_ju(sk):
    pm = {}
    for mm in re.finditer(r'(前段|后段|前后段各)([一二两三四五六七八九十]+)句', sk or ''):
        pm[mm.group(1)] = cnum(mm.group(2))
    if '前后段各' in pm: return [pm['前后段各']] * 2
    if '前段' in pm and '后段' in pm: return [pm['前段'], pm['后段']]
    return None


def build_ju(raw_text):
    text = raw_text.replace('　', '')
    ju, cur, reads, pos = [], '', [], 0
    for m in BREAK.finditer(text):
        cur += text[pos:m.start()]
        mk = m.group(1); pos = m.end()
        if mk == '读':
            if cur: reads.append(len(cur))
            continue
        ju.append({'t': cur, 'reads': reads[:], 'mk': mk})
        cur, reads = '', []
    if cur.strip():
        ju.append({'t': cur, 'reads': reads[:], 'mk': None})
    return [j for j in ju if j['t']]


def ju_text(j):
    """一句的展示文字：把句内「读（逗）」内嵌为「，」。"""
    t = j['t']
    for pos in sorted(j['reads'], reverse=True):
        t = t[:pos] + '，' + t[pos:]
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--qdcp', required=True)
    ap.add_argument('--out', default=str(HERE.parent / 'data' / 'ci-examples-bundle.json'))
    # todo 清单是中间过程产物，默认写到 qdcp 输入所在目录（仓库外），不入库
    ap.add_argument('--todo', default=None)
    args = ap.parse_args()
    todo_path = args.todo or str(Path(args.qdcp).resolve().parent / 'ci-examples-todo.csv')

    q = json.load(open(args.qdcp, encoding='utf-8'))
    cat = json.load(open(CATALOG, encoding='utf-8'))

    qexact, qauthor = {}, {}
    for name, t in q.items():
        for v in t['variants']:
            qexact.setdefault((name, norm_author(v['author']), norm_sketch(v['sketch'])), v)
            qauthor.setdefault((name, norm_author(v['author'])), []).append(v)

    bundle, unmatched, fails = {}, [], []
    for tune, t in cat.items():
        for vv in t['variants']:
            vid = vv['id']; a = norm_author(vv['author']); s = norm_sketch(vv['sketch'])
            if (tune, a, s) in qexact:
                match, how = qexact[(tune, a, s)], 'exact'
            elif (tune, a) in qauthor:
                match, how = qauthor[(tune, a)][0], 'author'
            else:
                unmatched.append({'id': vid, 'tune': tune, 'author': vv['author'],
                                  'sketch': vv['sketch'], 'tuneInQdcp': tune in q})
                continue
            ju = build_ju(match['rawText'])
            exp = want_ju(vv['sketch'])
            secs_ju = [ju[:exp[0]], ju[exp[0]:]] if (exp and sum(exp) == len(ju)) else [ju]
            chars = sum(len(j['t']) for j in ju)
            wc = want_chars(vv['sketch']); got = [len(x) for x in secs_ju]
            ok_c = wc is None or chars == wc
            ok_j = exp is None or got == exp
            if ok_c and ok_j:
                # 精简 bundle：id → 分句文字列表（句内逗内嵌）；作者/sketch/平仄/分阕从既有数据查
                bundle[vid] = [ju_text(j) for j in ju]
            else:
                cat_r = ('字数+句数' if (wc and chars != wc and exp and got != exp)
                         else '字数不符' if (wc and chars != wc) else '句数不符')
                fails.append({'id': vid, 'tune': tune, 'author': vv['author'], 'sketch': vv['sketch'],
                              'reason': f"{cat_r}(字{chars}/{wc} 句{got}/{exp})"})

    json.dump(bundle, open(args.out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    with open(todo_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['kind', 'id', 'tune', 'author', 'sketch', 'detail'])
        for u in unmatched:
            w.writerow(['未匹配', u['id'], u['tune'], u['author'], u['sketch'],
                        '词牌在qdcp(作者/异体待对)' if u['tuneInQdcp'] else '词牌整个缺失'])
        for x in fails:
            w.writerow(['待复核', x['id'], x['tune'], x['author'], x['sketch'], x['reason']])

    print(f'built(valid)={len(bundle)} unmatched={len(unmatched)} needReview={len(fails)}')
    print(f'bundle -> {args.out}')
    print(f'todo(仓库外) -> {todo_path}')


if __name__ == '__main__':
    main()
