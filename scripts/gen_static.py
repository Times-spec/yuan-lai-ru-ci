#!/usr/bin/env python3
"""Generate one static HTML page per article (p/<id>.html) + sitemap.xml.
Purpose: every article gets a real URL with its own title/description so
shared links show the right preview and search engines can index articles.
Run from the site root:  python3 scripts/gen_static.py
Re-run after any content change; output is fully regenerated.
"""
import json, glob, os, html, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://www.aha.voyager06.tech"
CATS = {
    "security": "验证与安全", "navigation": "跳转与导航", "features": "小功能大智慧",
    "backend": "后端基建", "network": "网络与协议", "engineering": "工程与协作",
    "ai": "AI 与大模型", "media": "影音媒体",
}
CONFUSE = {
    "security-totp": ["security-sms-otp"],
    "security-sms-otp": ["security-totp", "security-email-otp-magic-link"],
    "security-email-otp-magic-link": ["security-sms-otp"],
    "nav-http-301": ["nav-http-302"],
    "nav-http-302": ["nav-http-301"],
    "backend-cookie": ["backend-jwt-session"],
    "backend-jwt-session": ["backend-cookie"],
    "network-dns-records": ["network-doh"],
    "network-doh": ["network-dns-records"],
}
FILES = ['security','security-extra','navigation','features','backend','backend-extra',
         'network','network-extra','network-clash','network-ip','engineering',
         'engineering-extra','engineering-qa','multimodal','ai','ai-extra','media']

def esc(s): return html.escape(str(s or ""), quote=True)

def grams(s):
    s = str(s or "")
    return {s[i:i+2] for i in range(len(s)-1)}

def main():
    by_id, by_cat = {}, {}
    for f in FILES:
        p = os.path.join(ROOT, "content", f + ".json")
        if not os.path.exists(p): continue
        for a in json.load(open(p)):
            by_id[a["id"]] = a
            by_cat.setdefault(a["category"], []).append(a)

    def related(it, n=3):
        mine = grams(it["name"] + " " + " ".join(it.get("alias") or []) + " " + (it.get("tagline") or ""))
        conf = set(CONFUSE.get(it["id"], []))
        scored = []
        for oid, o in by_id.items():
            if oid == it["id"] or oid in conf: continue
            g = grams(o["name"] + " " + " ".join(o.get("alias") or []) + " " + (o.get("tagline") or ""))
            shared = len(mine & g)
            if shared < 2: continue
            scored.append((shared + (2 if o["category"] == it["category"] else 0), o))
        scored.sort(key=lambda x: -x[0])
        return [o for _, o in scored[:n]]

    outdir = os.path.join(ROOT, "p")
    os.makedirs(outdir, exist_ok=True)
    urls = [BASE + "/"]
    for aid, it in by_id.items():
        cat = it["category"]; cname = CATS.get(cat, cat)
        pr = it.get("principle") or {}
        desc = ((it.get("tagline") or "") + "。" + (pr.get("summary") or ""))[:150]
        steps = pr.get("steps") or []
        steps_html = ""
        if steps:
            steps_html = ('<h2>先看全过程</h2><ol class="steps">' +
                          "".join(f"<li>{esc(s)}</li>" for s in steps) + "</ol>")
        paras = [p.strip() for p in (pr.get("detail") or "").split("\n") if p.strip()]
        detail_html = "".join(f"<p>{esc(p)}</p>" for p in paras)
        cf = (f'<div class="cf"><h3>🌀 如果没有它会怎样</h3><p>{esc(it["counterfactual"])}</p></div>'
              if it.get("counterfactual") else "")
        mis = (f'<div class="mis"><h3>🚫 常见误解</h3><p>{esc(it["misconception"])}</p></div>'
               if it.get("misconception") else "")
        cap = (f'<p class="cap">📍 <b>捕获现场</b> —— {esc(it["capture"])}</p>' if it.get("capture") else "")
        gd = it.get("guide") or {}
        gopts = "".join(f"<li><b>{esc(o.get('name',''))}</b>：{esc(o.get('desc',''))}</li>" for o in (gd.get("options") or []))
        gsteps = "".join(f"<li>{esc(s)}</li>" for s in (gd.get("steps") or []))
        guide_html = ""
        if gopts or gsteps:
            guide_html = f'<h2>{esc((gd.get("heading") or "深入").split(" ",1)[-1])}</h2>'
            if gopts: guide_html += f"<ul>{gopts}</ul>"
            if gsteps: guide_html += f"<ol>{gsteps}</ol>"
        def src_pair(s):
            if isinstance(s, str): return s, s
            return (s.get("title") or s.get("url") or ""), (s.get("url") or "")
        srcs = "".join(f'<li><a href="{esc(u)}" rel="noopener">{esc(t)}</a></li>'
                       for t, u in (src_pair(s) for s in (it.get("sources") or [])))
        src_html = f'<h2>延伸阅读</h2><ul>{srcs}</ul>' if srcs else ""
        rel = related(it)
        rel_html = ""
        if rel:
            rel_html = ('<h2>相关条目</h2><ul class="rel">' + "".join(
                f'<li><a href="{BASE}/p/{r["id"]}.html">{esc(r["name"])}</a> <span>{esc(r.get("tagline") or "")}</span></li>'
                for r in rel) + "</ul>")
        conf = [by_id[x] for x in CONFUSE.get(aid, []) if x in by_id]
        conf_html = ""
        if conf:
            conf_html = ('<div class="conf"><h3>🤔 容易混淆，去分清</h3>' + "".join(
                f'<p><a href="{BASE}/p/{o["id"]}.html">《{esc(o["name"])}》</a> <span>{esc(o.get("tagline") or "")}</span></p>'
                for o in conf) + "</div>")
        sibs = by_cat[cat]
        idx = next(i for i, x in enumerate(sibs) if x["id"] == aid)
        prev, nxt = sibs[idx-1], sibs[(idx+1) % len(sibs)]
        page = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(it['name'])} · 原来如此</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{BASE}/p/{aid}.html">
<meta property="og:type" content="article">
<meta property="og:title" content="{esc(it['name'])} · 原来如此">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{BASE}/p/{aid}.html">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔍</text></svg>">
<style>
body{{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:760px;margin:0 auto;padding:24px 20px 60px;color:#1c2b3a;line-height:1.8;background:#FDFCF9}}
a{{color:#2563EB;text-decoration:none}} a:hover{{text-decoration:underline}}
.crumb{{font-size:13px;color:#8A8A93;margin-bottom:18px}}
h1{{font-size:30px;line-height:1.35;margin:6px 0 8px}}
.tagline{{color:#5B6470;font-size:16px;margin-bottom:20px}}
.kick{{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.1em;background:#EEF3F8;color:#31597F;border-radius:999px;padding:4px 12px}}
.scene{{background:#FFF8EC;border:1px solid #F0E2C4;border-radius:12px;padding:16px 20px}}
.sum{{background:#EEF4FF;border:1px solid #C9DBF5;border-radius:12px;padding:16px 20px;font-weight:600}}
h2{{font-size:20px;margin:34px 0 12px}}
.steps li,.rel li{{margin:6px 0}}
.cf{{background:#F5F3FF;border:1px dashed #C4B5FD;border-radius:12px;padding:14px 20px;margin-top:22px}}
.mis{{background:#FFF5F5;border:1px solid #F3C2C2;border-radius:12px;padding:14px 20px;margin-top:14px}}
.cf h3,.mis h3,.conf h3{{margin:0 0 6px;font-size:16px}}
.cf p,.mis p{{margin:0}}
.conf{{border:1px solid #E3E0D8;border-radius:12px;padding:14px 20px;margin-top:22px}}
.conf p{{margin:6px 0}} .conf span,.rel span{{color:#8A8A93;font-size:13.5px}}
.cap{{color:#8A8A93;font-size:14px}}
.pn{{display:flex;justify-content:space-between;gap:16px;margin-top:40px;border-top:1px solid #E3E0D8;padding-top:18px;font-size:14.5px}}
.spa{{display:block;text-align:center;margin-top:28px;background:#1c2b3a;color:#fff;border-radius:12px;padding:12px}}
footer{{margin-top:34px;color:#8A8A93;font-size:13px;text-align:center}}
</style>
</head>
<body>
<div class="crumb"><a href="{BASE}/">原来如此</a> / {esc(cname)} / {esc(it['name'])}</div>
<span class="kick">{esc(cname)}</span>
<h1>{esc(it['name'])}</h1>
<div class="tagline">{esc(it.get('tagline') or '')}</div>
<div class="scene"><b>👀 日常场景</b><p>{esc(it.get('scene') or '')}</p></div>
{cap}
<h2>原理：它是怎么运作的</h2>
<div class="sum">💡 {esc(pr.get('summary') or '')}</div>
{steps_html}
{detail_html}
{cf}{mis}
{guide_html}
{src_html}
{rel_html}
{conf_html}
<a class="spa" href="{BASE}/#/p/{aid}">在站内打开本篇（完整交互版）→</a>
<div class="pn"><a href="{BASE}/p/{prev['id']}.html">← 上一个：{esc(prev['name'])}</a><a href="{BASE}/p/{nxt['id']}.html">下一个：{esc(nxt['name'])} →</a></div>
<footer>原来如此 · 把听说过的技术讲透 · 内容为科普解读，具体接入请以各服务官方文档为准</footer>
</body>
</html>
"""
        open(os.path.join(outdir, aid + ".html"), "w").write(page)
        urls.append(f"{BASE}/p/{aid}.html")

    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f"<url><loc>{u}</loc></url>" for u in urls]
    sm.append("</urlset>")
    open(os.path.join(ROOT, "sitemap.xml"), "w").write("\n".join(sm) + "\n")
    open(os.path.join(ROOT, "robots.txt"), "w").write(
        f"User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n")
    print(f"generated {len(by_id)} static pages + sitemap ({len(urls)} urls)")

if __name__ == "__main__":
    main()
