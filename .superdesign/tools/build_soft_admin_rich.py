"""Cấu hình with more depth: the second version of build_soft_admin.py's screens.

Writes the same ../mockups/soft-cfg-<name>.html, so each lands on its draft
as a new version. Every page opens on a hero band (two soft washes under a
dotted grid, the page's icon tile, a row of fact chips); figures carry a
sparkline and a coloured change; charts show the split by model in the
models' own colours; models and tools are cards; the audit log is a timeline
grouped by day.
"""
import sys
from html import escape

import build_soft_admin as base
from build_soft_admin import avatar, btn, card, card_head, cfg_nav, gi, meter, number, select, shell, tag, toggle
from build_soft_agent import ART, OUT

EXTRA = """
  .hero { background: radial-gradient(70% 140% at 0% 0%, color-mix(in srgb, var(--md-primary) 10%, transparent), transparent 60%),
    radial-gradient(50% 120% at 100% 0%, color-mix(in srgb, var(--md-tertiary-fixed) 55%, transparent), transparent 60%); }
  .hdots { background-image: radial-gradient(circle, rgba(16,24,22,.08) 1px, transparent 1px); background-size: 18px 18px;
    mask-image: linear-gradient(to bottom, black, transparent 90%); }
"""

# The models' colours, used in every chart and on their cards.
# The agents' colours, keyed by their display names.
MC = {"Trợ lý console": "#005049", "Kiểm tra lừa đảo": "#B3542E", "Đọc ảnh tin đăng": "#2E9C8E", "Tìm kiếm": "#85D5C9", "Vector tìm kiếm": "#E8B8A4"}


def spark(values, color="var(--md-primary)", w=120, h=36, fill=True):
    top, low = max(values), min(values)
    span = (top - low) or 1
    pts = [(round(i * w / (len(values) - 1), 1), round(h - 3 - (v - low) / span * (h - 6), 1)) for i, v in enumerate(values)]
    line = " ".join(f"{x},{y}" for x, y in pts)
    area = f'<polygon points="0,{h} {line} {w},{h}" fill="{color}" opacity=".10"/>' if fill else ""
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" class="block shrink-0">{area}'
            f'<polyline points="{line}" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="{pts[-1][0]}" cy="{pts[-1][1]}" r="3" fill="{color}"/></svg>')


def donut(parts, size=150, stroke=18, center=""):
    r = (size - stroke) / 2
    c = 2 * 3.14159 * r
    off, arcs = 0, []
    for pct, color in parts:
        arcs.append(f'<circle cx="{size / 2}" cy="{size / 2}" r="{r}" fill="none" stroke="{color}" stroke-width="{stroke}" '
                    f'stroke-dasharray="{c * pct / 100 - 3:.1f} {c:.1f}" stroke-dashoffset="{-off:.1f}" stroke-linecap="round"/>')
        off += c * pct / 100
    return (f'<div class="relative shrink-0" style="width:{size}px;height:{size}px"><svg width="{size}" height="{size}" class="-rotate-90">'
            f'<circle cx="{size / 2}" cy="{size / 2}" r="{r}" fill="none" stroke="var(--md-surface-container)" stroke-width="{stroke}"/>{"".join(arcs)}</svg>'
            f'<div class="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">{center}</div></div>')


def delta(text, up=True, good=True):
    tone = "bg-primary/[.08] text-primary" if good else "bg-error-container text-error"
    return tag(gi("trending-up-rounded" if up else "trending-down-rounded", 14) + text, tone)


def chip(ic, text):
    return (f'<span class="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border hair bg-white/80 px-3 text-[13px] text-on-surface-variant backdrop-blur">'
            f'{gi(ic, 16, "text-primary")}{text}</span>')


def legend(items):
    return '<div class="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-on-surface-variant">' + "".join(
        f'<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-[3px]" style="background:{c}"></span>{t}</span>' for t, c in items) + "</div>"


def page(key, title, ic, chips, body, actions="", art=False):
    hero = f"""<section class="hero relative shrink-0 overflow-hidden border-b hair px-10 pb-6 pt-8"><div class="hdots pointer-events-none absolute inset-0"></div>
  <div class="relative flex items-center gap-4">
    <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white text-primary soft">{gi(ic, 28)}</span>
    <div class="min-w-0 flex-1"><h1 class="tight text-[26px] font-semibold leading-[34px]">{title}</h1>
      <div class="mt-2 flex flex-wrap gap-2">{"".join(chip(i, t) for i, t in chips)}</div></div>
    {actions}{f'<img src="{ART}" alt="" class="-my-4 h-[104px] w-[104px] object-contain">' if art else ""}
  </div></section>"""
    main = f"""<main class="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">{hero}
  <div class="min-h-0 flex-1 overflow-hidden bg-surface-container-low/40 px-10 py-6">{body}</div></main>"""
    return shell(title + " · Cấu hình", main, side=cfg_nav(key)).replace("</style>", EXTRA + "</style>", 1)


def stat(label, value, ic, tint, foot, sp=None, color="var(--md-primary)"):
    return card(f"""<div class="flex items-center gap-2.5"><span class="flex h-9 w-9 items-center justify-center rounded-[12px] {tint}">{gi(ic, 18)}</span>
  <span class="text-[13.5px] text-on-surface-variant">{label}</span></div>
<div class="mt-3 flex items-end justify-between gap-3"><p class="tnum tight text-[30px] font-semibold leading-9">{value}</p>{spark(sp, color, 104, 34) if sp else ""}</div>
<div class="mt-2 flex items-center gap-2 text-[12.5px] text-on-surface-variant">{foot}</div>""", "p-4")


# --- Tổng quan ---

DAYS = [[2.4, .3, .2, .1], [3.4, .4, .2, .1], [4.9, .5, .3, .1], [4.1, .4, .2, .1], [5.4, .5, .3, .1], [1.6, .3, .1, .1], [1.3, .3, .1, .1],
        [6.2, .5, .3, .1], [7.3, .6, .3, .1], [5.9, .5, .3, .1], [8.0, .6, .3, .1], [7.1, .6, .3, .1], [2.4, .4, .1, .1], [1.9, .3, .1, .1],
        [8.6, .7, .3, .1], [9.4, .7, .3, .1], [7.6, .6, .3, .1], [3.4, .4, .2, .1]]


def stacked(days, h=170):
    top = max(sum(d) for d in days)
    cols = []
    for i, d in enumerate(days):
        segs = "".join(f'<span class="block w-full first:rounded-t-[5px]" style="height:{round(v / top * h)}px;background:{c}"></span>'
                       for v, c in zip(d, list(MC.values())[:4]))
        cols.append(f'<div class="flex flex-1 flex-col justify-end {"opacity-50" if i == len(days) - 1 else ""}">{segs}</div>')
    grid = "".join(f'<div class="absolute inset-x-0 border-t border-dashed hair" style="bottom:{p}%"><span class="tnum absolute -top-2.5 right-0 bg-white pl-1 text-[11px] text-on-surface-variant">${round(top * p / 100)}</span></div>' for p in (50, 100))
    return f'<div class="relative pr-8" style="height:{h}px">{grid}<div class="relative flex h-full items-end gap-1.5">{"".join(cols)}</div></div>'


def overview():
    people = "".join(f"""<div class="flex items-center gap-3 py-1.5">{avatar(ch, 30, "bg-primary text-on-primary")}<span class="w-[130px] truncate text-[14px]">{n}</span>
  <div class="flex-1">{meter(p, "bg-primary/70", 6)}</div><span class="tnum w-28 whitespace-nowrap text-right text-[13px] text-on-surface-variant">{q} câu</span><span class="tnum w-14 text-right text-[14px] font-medium">${c}</span></div>"""
                     for ch, n, q, c, p in [("L", "Nguyễn Thị Lan", 312, "38,20", 100), ("M", "Phạm Văn Minh", 268, "31,60", 83),
                                            ("H", "Lê Thu Hà", 201, "22,90", 60), ("T", "Đỗ Quang Tú", 164, "17,30", 45)])
    todo = "".join(f'<a id="todo-{i}" href="#todo-{i}" class="hov -mx-2 flex items-center gap-3 rounded-[12px] px-2 py-2 text-[14px]"><span class="flex h-8 w-8 items-center justify-center rounded-full {tone}">{gi(ic, 17)}</span><span class="min-w-0 flex-1">{t}</span>{gi("chevron-right-rounded", 18, "text-on-surface-variant")}</a>'
                   for i, (ic, t, tone) in enumerate([("trending-up-rounded", "Minh xin tăng hạn mức lên $8", "bg-tertiary-fixed text-on-tertiary-fixed-variant"),
                                                      ("person-add-outline-rounded", "Ánh chưa nhận lời mời", "bg-primary/[.08] text-primary"),
                                                      ("thumb-down-outline-rounded", "6 câu trả lời bị chê", "bg-error-container text-error")]))
    body = f"""<div class="grid grid-cols-4 gap-4">
  {stat("Chi phí tháng 11", "$142,30", "payments-outline-rounded", "bg-primary/[.08] text-primary", f'<div class="flex-1">{meter(47, h=6)}</div><span class="tnum">47% của $300</span>')}
  {stat("Câu hỏi cho agent", "1.284", "forum-outline-rounded", "bg-secondary-container text-on-secondary-container", delta("18%") + "so với tháng 10", [40, 52, 48, 61, 58, 70, 66, 79, 84, 90])}
  {stat("Đề xuất được giữ", "78%", "task-alt-rounded", "bg-tertiary-fixed text-on-tertiary-fixed-variant", delta("4 điểm") + "so với tháng 10", [70, 71, 69, 73, 74, 72, 76, 77, 78], "#B3542E")}
  {stat("Nhân viên dùng agent", "7/9", "group-outline-rounded", "bg-inverse-primary/40 text-primary-container",
        '<span class="flex -space-x-1.5">' + "".join(avatar(c, 22, "bg-primary text-on-primary ring-2 ring-white") for c in "LMHTK") + '</span>+2 chưa hỏi')}
</div>
<div class="mt-4 grid grid-cols-[1fr_360px] gap-4">
  {card(card_head("Chi phí mỗi ngày", legend([(k, MC[k]) for k in list(MC)[:4]])) + stacked(DAYS) +
        '<div class="mt-2 flex justify-between pr-8 text-[12px] text-on-surface-variant"><span>1/11</span><span>8/11</span><span>15/11</span><span>Hôm nay</span></div>')}
  {card(card_head("Đề xuất của agent", sub="412 đề xuất trong tháng") + f'''<div class="flex items-center gap-5">{donut([(78, "var(--md-primary)"), (12, "#B3542E"), (10, "var(--md-outline-variant)")], 132, 16,
        '<span class="tnum tight text-[26px] font-semibold">78%</span><span class="text-[12px] text-on-surface-variant">giữ nguyên</span>')}
        <div class="flex-1 space-y-2.5 text-[13.5px]">{"".join(f'<div class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-full" style="background:{c}"></span><span class="flex-1">{t}</span><span class="tnum font-medium">{n}</span></div>' for t, n, c in [("Giữ", 321, "var(--md-primary)"), ("Sửa đổi", 49, "#B3542E"), ("Bỏ", 42, "var(--md-outline-variant)")])}</div></div>''')}
</div>
<div class="mt-4 grid grid-cols-[1fr_360px] gap-4">
  {card(card_head("Theo nhân viên", btn("Xem tất cả", kind="ghost", aid="all-people")) + people, "p-5 pb-3")}
  {card(card_head("Cần xem", tag("3", "bg-error-container text-error")) + todo, "p-5 pb-3")}
</div>"""
    return page("overview", "Tổng quan", "space-dashboard-outline-rounded",
                [("calendar-month-outline-rounded", "Tháng 11 · còn 12 ngày"), ("group-outline-rounded", "9 nhân viên"), ("material-symbols:auto-awesome-outline-rounded", "5 agents")],
                body, select("Tháng 11 · 2026", "range", "w-[170px]"))


# --- Nhân viên ---

def members():
    online = {"Trần Minh Khoa", "Nguyễn Thị Lan", "Phạm Văn Minh"}
    rows = ""
    for ch, n, e, r, lim, u, last, on in base.MEMBERS:
        admin = r == "Quản trị viên"
        st = ("active" if on else "suspended") if on is not None else None
        av = avatar(ch, 38, "bg-primary text-on-primary" if on is not False else "bg-surface-container-high text-on-surface-variant", st)
        cap = float(lim.strip("$")) * 30
        used = 0 if u == "–" else float(u.replace(",", "."))
        role = tag(gi("shield-person-outline-rounded" if admin else "person-outline-rounded", 14) + r,
                   "bg-primary/[.08] text-primary" if admin else "bg-secondary-container/70 text-on-secondary-container")
        state = (tag(gi("schedule-outline-rounded", 14) + "Đã mời", "bg-tertiary-fixed/70 text-on-tertiary-fixed-variant") if on is None else
                 tag("Tạm khoá", "bg-error-container text-error") if not on else
                 tag('<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>' + ("Đang online" if n in online else "Hoạt động"), "bg-primary/[.08] text-primary"))
        use = (f'<div class="w-[150px]"><div class="flex justify-between text-[13px]"><span class="tnum font-medium">${u}</span><span class="tnum text-on-surface-variant">{lim}/ngày</span></div>'
               f'<div class="mt-1.5">{meter(min(100, round(used / cap * 100 * 4)), "bg-primary/70", 5)}</div></div>') if u != "–" else '<span class="text-on-surface-variant">–</span>'
        rows += f"""<div class="hov flex items-center gap-5 border-t hair px-5 py-2.5 first:border-t-0">
  <span class="flex w-[260px] items-center gap-3">{av}<span class="leading-tight"><span class="block text-[14.5px] font-medium">{escape(n)}</span><span class="block text-[12.5px] text-on-surface-variant">{e}</span></span></span>
  <span class="w-[160px]">{role}</span><span class="w-[130px]">{state}</span>{use}<span class="flex-1 text-right text-[13px] text-on-surface-variant">{last}</span>
  <a id="m-{ch}" href="#m-{ch}" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("more-horiz", 18)}</a></div>"""
    seg = "".join(f'<a id="f-{k}" href="#f-{k}" class="flex h-8 items-center rounded-full px-3.5 {"bg-white soft font-medium" if k == "all" else "text-on-surface-variant"}">{t}</a>'
                  for k, t in [("all", "Tất cả · 8"), ("admin", "Quản trị viên · 2"), ("mod", "Kiểm duyệt viên · 6")])
    body = f"""<div class="mb-4 flex items-center gap-3"><div class="flex rounded-full bg-surface-container p-1 text-[13.5px]">{seg}</div><span class="flex-1"></span>
  <div class="flex h-10 w-[280px] items-center gap-2 rounded-full border hair bg-white px-4 text-[14px] text-on-surface-variant">{gi("search-rounded", 18)}Tên hoặc email</div></div>
{card('<div class="flex items-center gap-5 border-b hair bg-surface-container-low/60 px-5 py-3 text-[13px] text-on-surface-variant"><span class="w-[260px]">Nhân viên</span><span class="w-[160px]">Vai trò</span><span class="w-[130px]">Trạng thái</span><span class="w-[150px]">Tháng này</span><span class="flex-1 text-right">Hoạt động</span><span class="w-8"></span></div>' + rows, "overflow-hidden p-0")}"""
    return page("members", "Nhân viên", "group-outline-rounded",
                [("group-outline-rounded", "8 người"), ("radio-button-checked", "3 đang online"), ("mail-outline-rounded", "1 lời mời chờ")],
                body, btn("Mời nhân viên", "person-add-outline-rounded", "primary", "invite"))


# --- Models ---

def model_card(alias, model, used, price, p50, calls, sp, budget, ok=True):
    color = MC[alias]
    letter = "S" if "Sonnet" in model else "H"
    return card(f"""<div class="flex items-center gap-3">
  <span class="flex h-11 w-11 items-center justify-center rounded-[14px] text-[18px] font-semibold text-white" style="background:{color}">{letter}</span>
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[16px] font-semibold">{alias}</p><p class="mt-0.5 text-[13px] text-on-surface-variant">{used}</p></div>
  {tag('<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>Chạy tốt') if ok else tag('<span class="h-1.5 w-1.5 rounded-full bg-tertiary"></span>Chậm', "bg-tertiary-fixed/70 text-on-tertiary-fixed-variant")}</div>
<div class="mt-4 flex items-end gap-4">{select(model, "mdl-" + alias, "w-[200px]")}<span class="flex-1"></span>{spark(sp, color, 140, 40)}</div>
<div class="mt-4 grid grid-cols-3 gap-2">{"".join(f'<div class="rounded-[12px] bg-surface-container-low px-3 py-2"><p class="text-[12px] text-on-surface-variant">{k}</p><p class="tnum mt-0.5 text-[14.5px] font-semibold">{v}</p></div>' for k, v in [("Giá 1M token", price), ("p50", p50), ("Lượt · 7 ngày", calls)])}</div>
<div class="mt-3 flex items-center gap-3 text-[12.5px] text-on-surface-variant"><span>Hạn mức</span><div class="flex-1 h-1.5 overflow-hidden rounded-full bg-surface-container"><div class="h-full rounded-full" style="width:{budget[0]}%;background:{"#B3542E" if budget[0] >= 80 else color}"></div></div><span class="tnum">{budget[1]}</span></div>""", "p-5")


def models():
    cards = (model_card("console-agent", "Claude Sonnet 5.5", "Agent của console", "$2 · $10", "2,1 s", "1.284", [30, 42, 38, 55, 61, 48, 70, 66, 74, 80], (51, "$128 / $250")) +
             model_card("scam-check", "Claude Haiku 5.5", "Kiểm tra lừa đảo trong chat", "$1 · $1", "0,6 s", "18.902", [60, 58, 64, 70, 66, 72, 75, 71, 78, 82], (41, "$8 / $20")) +
             model_card("listing-read", "Claude Haiku 5.5", "Đọc ảnh tin đăng", "$1 · $1", "3,8 s", "6.410", [40, 44, 39, 50, 47, 52, 49, 55, 51, 54], (26, "$4 / $15"), ok=False) +
             model_card("search", "Claude Haiku 5.5", "Tìm kiếm trong app", "$1 · $1", "0,4 s", "31.277", [70, 74, 80, 77, 85, 90, 88, 94, 97, 99], (80, "$1,6 / $2")))
    providers = "".join(f"""<div class="soft flex items-center gap-3 rounded-[14px] border hair bg-white px-4 py-3"><span class="flex h-9 w-9 items-center justify-center rounded-[10px] {tint}">{gi(ic, 18)}</span>
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[14.5px] font-medium">{t}</p><p class="mt-0.5 text-[12.5px] text-on-surface-variant">{d}</p></div>{right}</div>"""
                        for ic, t, d, right, tint in [("cloud-outline", "LLM upstream", "Các model Claude", tag("Đã kết nối"), "bg-primary/[.08] text-primary"),
                                                      ("hub-outline-rounded", "OpenRouter", "embed-text · bge-m3", tag("Đã kết nối"), "bg-tertiary-fixed text-on-tertiary-fixed-variant"),
                                                      ("history-rounded", "Lưu nội dung câu hỏi", "Đang tắt", toggle(False, "store-prompts"), "bg-surface-container text-on-surface-variant")])
    body = f"""<div class="grid grid-cols-2 gap-4">{cards}</div>
<div class="mt-4 grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3">{providers}{btn("Thêm model", "add-rounded", aid="add-model")}</div>"""
    return page("models", "Models", "neurology-outline-rounded",
                [("neurology-outline-rounded", "4 model ngôn ngữ"), ("hub-outline-rounded", "1 model vector"), ("bolt-outline-rounded", "p50 1,2 s")],
                body, btn("Mở LiteLLM", "north-east-rounded", aid="open-litellm"))


# --- Hạn mức ---

def forecast(w=520, h=150):
    actual = [0, 4, 9, 15, 20, 26, 28, 30, 37, 44, 50, 58, 65, 68, 70, 79, 89, 98, 102, 110, 118, 126, 134, 142]
    proj_end, cap, days = 251, 300, 30
    sx, sy = w / days, h / cap
    pts = " ".join(f"{round(i * sx, 1)},{round(h - v * sy, 1)}" for i, v in enumerate(actual))
    lx, ly = round((len(actual) - 1) * sx, 1), round(h - actual[-1] * sy, 1)
    return f"""<svg width="100%" height="{h + 18}" viewBox="0 0 {w} {h + 18}" preserveAspectRatio="none" class="block overflow-visible">
  <line x1="0" x2="{w}" y1="{round(h - cap * sy, 1)}" y2="{round(h - cap * sy, 1)}" stroke="var(--md-error)" stroke-dasharray="4 4" opacity=".6"/>
  <line x1="0" x2="{w}" y1="{round(h - 240 * sy, 1)}" y2="{round(h - 240 * sy, 1)}" stroke="#B3542E" stroke-dasharray="2 4" opacity=".6"/>
  <polygon points="0,{h} {pts} {lx},{h}" fill="var(--md-primary)" opacity=".10"/>
  <polyline points="{pts}" fill="none" stroke="var(--md-primary)" stroke-width="2.5" stroke-linejoin="round"/>
  <line x1="{lx}" y1="{ly}" x2="{w}" y2="{round(h - proj_end * sy, 1)}" stroke="var(--md-primary)" stroke-width="2" stroke-dasharray="5 5" opacity=".55"/>
  <circle cx="{lx}" cy="{ly}" r="4.5" fill="var(--md-primary)" stroke="white" stroke-width="2"/>
  <circle cx="{w}" cy="{round(h - proj_end * sy, 1)}" r="4" fill="white" stroke="var(--md-primary)" stroke-width="2"/>
</svg>"""


def budget():
    keys = "".join(f"""<div class="py-2"><div class="flex items-center gap-2 text-[14px]"><span class="h-2.5 w-2.5 rounded-[3px]" style="background:{MC[a]}"></span><span class="font-medium">{a}</span>
  <span class="tnum ml-auto">${u} <span class="text-on-surface-variant">/ ${cap}</span></span></div>
  <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-container"><div class="h-full rounded-full" style="width:{p}%;background:{"#B3542E" if p >= 80 else MC[a]}"></div></div></div>"""
                   for a, u, cap, p in [("Trợ lý console", "128,40", "250", 51), ("Kiểm tra lừa đảo", "8,10", "20", 41), ("Đọc ảnh tin đăng", "3,90", "15", 26), ("Tìm kiếm", "1,60", "2", 80)])
    reqs = "".join(f"""<div class="flex items-center gap-3 rounded-[14px] border hair bg-white p-3">{avatar(ch, 36, "bg-primary text-on-primary")}
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[14px]"><span class="font-medium">{n}</span> · <span class="tnum font-semibold text-primary">{ask}</span></p>
  <p class="mt-0.5 truncate text-[12.5px] text-on-surface-variant">“{why}” · {when}</p></div>
  <a id="no-{ch}" href="#no-{ch}" title="Từ chối" class="hov flex h-9 w-9 items-center justify-center rounded-full border hair text-on-surface-variant">{gi("close-rounded", 18)}</a>
  <a id="ok-{ch}" href="#ok-{ch}" title="Duyệt" class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">{gi("check-rounded", 18)}</a></div>"""
                   for ch, n, ask, why, when in [("M", "Minh", "$8/ngày", "Đang rà nhóm lừa đảo Gò Vấp", "10:24"), ("H", "Hà", "$7/ngày", "Trực thay ca tối tuần này", "Hôm qua")])
    month = card(f"""<div class="flex gap-6">
  {donut([(47, "var(--md-primary)")], 168, 18, '<span class="text-[12px] text-on-surface-variant">Đã dùng</span><span class="tnum tight text-[26px] font-semibold">$142</span><span class="tnum text-[12.5px] text-on-surface-variant">trên $300</span>')}
  <div class="min-w-0 flex-1"><h2 class="tight text-[16px] font-semibold">Cả tháng</h2>
    <div class="mt-3">{forecast()}</div>
    <div class="mt-1 flex justify-between text-[12px] text-on-surface-variant"><span>1/11</span><span>Hôm nay</span><span>30/11</span></div>
    <div class="mt-3">{legend([("Đã dùng", "var(--md-primary)"), ("Dự kiến $251", "#9FC9C2"), ("Báo 80%", "#B3542E"), ("Hạn mức", "var(--md-error)")])}</div></div>
</div>
<div class="mt-5 grid grid-cols-3 gap-3 border-t hair pt-4">
  <div><p class="mb-1.5 text-[13px] text-on-surface-variant">Hạn mức tháng</p>{number("300", "USD", "cap-month").replace("w-[180px]", "w-full")}</div>
  <div><p class="mb-1.5 text-[13px] text-on-surface-variant">Báo khi chạm</p>{number("80", "%", "alert").replace("w-[180px]", "w-full")}</div>
  <div><p class="mb-1.5 text-[13px] text-on-surface-variant">Khi hết hạn mức</p>{select("Dừng agent", "on-cap", "w-full")}</div>
</div>""")
    per = card(card_head("Mỗi nhân viên, mỗi ngày") + f"""<div class="grid grid-cols-2 gap-3">
  <div class="rounded-[14px] bg-surface-container-low p-3.5"><p class="flex items-center gap-1.5 text-[13px] text-on-surface-variant">{gi("person-outline-rounded", 15)}Kiểm duyệt viên</p><p class="tnum tight mt-1 text-[22px] font-semibold">$5</p></div>
  <div class="rounded-[14px] bg-surface-container-low p-3.5"><p class="flex items-center gap-1.5 text-[13px] text-on-surface-variant">{gi("shield-person-outline-rounded", 15)}Quản trị viên</p><p class="tnum tight mt-1 text-[22px] font-semibold">$10</p></div></div>
  <p class="mt-3 flex items-center gap-2 text-[13px] text-on-surface-variant">{gi("tune-rounded", 16)}Riêng: Hà $7, Minh $6</p>""")
    body = f"""<div class="grid grid-cols-[1fr_400px] gap-4">
  <div class="space-y-4">{month}{card(card_head("Theo agent") + '<div class="grid grid-cols-2 gap-x-8">' + keys + "</div>", "p-5 pb-3")}</div>
  <div class="space-y-4">{per}<div class="space-y-2.5"><p class="flex items-center gap-2 px-1 text-[14px] font-semibold">Yêu cầu tăng {tag("2", "bg-tertiary-fixed text-on-tertiary-fixed-variant")}</p>{reqs}</div></div>
</div>"""
    return page("budget", "Hạn mức", "speed-outline-rounded",
                [("payments-outline-rounded", "$142 / $300"), ("trending-up-rounded", "Dự kiến $251 cuối tháng"), ("notifications-outline-rounded", "Báo ở 80%")], body)


# --- Agent ---

def agent():
    lines = ["Bạn là trợ lý của nhân viên ShopNexus, đang hỗ trợ {{tên_nhân_viên}}.",
             "Đọc ticket, báo cáo, tài khoản, đơn và tin đăng qua tools chỉ đọc, rồi đề xuất.",
             "Nhân viên là người khoá, ẩn tin và trả lời khách.",
             "Trả lời ngắn, tiếng Việt, nêu nguồn đã đọc.",
             "ShopNexus không giữ tiền: chỉ có COD đồng kiểm, không hứa hoàn tiền."]
    code = "".join(f'<div class="flex gap-4"><span class="tnum w-5 shrink-0 select-none text-right text-on-surface-variant/60">{i + 1}</span><span>{escape(l).replace("{{tên_nhân_viên}}", "<span class=\'rounded-[6px] bg-primary/10 px-1.5 text-primary\'>tên nhân viên</span>")}</span></div>'
                   for i, l in enumerate(lines))
    versions = "".join(f'<div class="flex items-center gap-2.5 text-[13px]"><span class="h-2 w-2 rounded-full {"bg-primary" if i == 0 else "bg-outline-variant"}"></span><span class="font-medium">Bản {v}</span><span class="text-on-surface-variant">{who}</span><span class="tnum ml-auto text-on-surface-variant">{w}</span></div>'
                       for i, (v, who, w) in enumerate([(4, "Khoa", "12/11"), (3, "Bảo", "02/11"), (2, "Khoa", "20/10")]))
    limits = "".join(f'<div class="rounded-[14px] border hair bg-white p-3.5"><p class="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">{gi(ic, 15)}{k}</p><p class="tnum tight mt-1 text-[20px] font-semibold">{v} <span class="text-[13px] font-normal text-on-surface-variant">{u}</span></p></div>'
                     for ic, k, v, u in [("timer-outline", "Mỗi câu", "60", "giây"), ("notes-rounded", "Độ dài", "4.096", "token"), ("forum-outline-rounded", "Nhớ", "20", "lượt"), ("bookmark-outline-rounded", "Ghi nhớ", "10", "mục")])
    feats = "".join(f'<div class="flex items-center gap-3 py-2"><span class="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/[.08] text-primary">{gi(ic, 17)}</span><span class="flex-1 text-[14px]">{t}</span>{toggle(on, "ft-" + str(i))}</div>'
                    for i, (ic, t, on) in enumerate([("schedule-outline-rounded", "Chạy nền", True), ("reply-rounded", "Soạn sẵn trả lời", True), ("checklist-rounded", "Đề xuất báo cáo", True)]))
    preview = f"""<div class="rounded-[16px] bg-surface-container-low p-4">
  <div class="flex justify-end"><p class="rounded-[18px] rounded-br-[6px] bg-primary/[.10] px-3.5 py-2 text-[13.5px]">Khánh Linh báo chưa nhận hàng GHTK</p></div>
  <div class="mt-3 flex gap-2.5"><img src="{ART}" alt="" class="h-7 w-7 shrink-0 rounded-full bg-white object-contain p-0.5">
    <div class="space-y-2"><div class="flex flex-wrap gap-1">{"".join(f'<span class="inline-flex h-6 items-center gap-1 rounded-full border hair bg-white px-2 text-[11.5px] text-on-surface-variant">{gi(i, 13)}{t}</span>' for i, t in [("chat-outline-rounded", "Ticket"), ("local-shipping-outline-rounded", "Vận đơn")])}</div>
    <p class="text-[13.5px] leading-[21px]">GHTK báo giao cho lễ tân toà B lúc 14:20, có ảnh ký nhận. Khánh Linh mới hỏi bảo vệ.</p></div></div></div>"""
    body = f"""<div class="grid grid-cols-[1fr_380px] gap-4">
  <div class="space-y-4">
    {card(card_head("Hướng dẫn", f'<div class="flex items-center gap-2">{btn("Bản 4 · 3 bản trước", "history-rounded", "ghost", "versions")}{btn("Sửa", "edit-outline-rounded", aid="edit-prompt")}</div>') +
          f'<div class="space-y-1.5 rounded-[14px] border hair bg-surface-container-low/50 p-4 text-[14px] leading-[22px]">{code}</div>' +
          f'<div class="mt-4 grid grid-cols-4 gap-2.5">{limits}</div>')}
    {card(card_head("Tính năng") + '<div class="grid grid-cols-3 gap-x-6">' + feats + "</div>", "p-5 pb-3")}
  </div>
  {card(card_head("Xem trước", select("console-agent", "agent-model", "w-[160px]")) + preview +
        '<p class="mb-2 mt-4 text-[13px] font-medium text-on-surface-variant">Câu hỏi gợi ý</p>' +
        '<div class="flex flex-wrap gap-1.5">' + "".join(f'<span class="inline-flex h-8 items-center gap-1.5 rounded-full border hair bg-white px-3 text-[13px]">{gi(i, 15, "text-primary")}{t}</span>' for i, t in
        [("support-agent-outline", "Ticket chờ lâu nhất"), ("flag-outline-rounded", "Lừa đảo hôm nay"), ("local-shipping-outline-rounded", "GHTK chưa nhận"), ("group-outline-rounded", "Sắp hết hạn khoá")]) +
        f'<a id="add-starter" href="#add-starter" class="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-outline-variant px-3 text-[13px] text-on-surface-variant">{gi("add-rounded", 15)}Thêm</a></div>')}
</div>"""
    return page("agent", "Agent", "material-symbols:auto-awesome-outline-rounded",
                [("neurology-outline-rounded", "console-agent · Sonnet 5.5"), ("history-rounded", "Bản 4 · Khoa · 12/11"), ("build-outline-rounded", "6 tools")],
                body, btn("Thử trong cuộc mới", "material-symbols:auto-awesome-outline-rounded", aid="try"), art=True)


# --- Tools ---

def tools():
    mcp = [("ticket_get", "Ticket", "Ticket với khách, đơn và vận đơn", "support-agent-outline", "bg-primary/[.08] text-primary", "var(--md-primary)", [20, 26, 31, 28, 35, 33, 38]),
           ("tickets_of_account", "Ticket của tài khoản", "Ticket khác của cùng người", "forum-outline-rounded", "bg-primary/[.08] text-primary", "var(--md-primary)", [8, 9, 12, 10, 11, 9, 13]),
           ("account_get", "Tài khoản", "Hồ sơ, xác minh, số đơn, báo cáo", "person-outline-rounded", "bg-secondary-container text-on-secondary-container", "#47645F", [30, 34, 29, 38, 41, 37, 44]),
           ("account_actions", "Lịch sử xử lý", "Các lần khoá, mở khoá", "history-rounded", "bg-secondary-container text-on-secondary-container", "#47645F", [6, 8, 7, 9, 8, 10, 9]),
           ("order_get", "Đơn hàng", "Đơn COD và các mốc giao", "package-2-outline", "bg-tertiary-fixed text-on-tertiary-fixed-variant", "#B3542E", [14, 18, 16, 20, 17, 22, 21]),
           ("listing_get", "Tin đăng", "Mọi trạng thái trừ đã xoá", "storefront-outline-rounded", "bg-inverse-primary/40 text-primary-container", "#2E9C8E", [18, 21, 25, 22, 27, 24, 29])]
    calls = ["1.902", "644", "2.310", "512", "1.188", "1.476"]
    cards = "".join(card(f"""<div class="flex items-start gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-[12px] {tint}">{gi(ic, 20)}</span>
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[15px] font-semibold">{t}</p><p class="mt-0.5 text-[12px] text-on-surface-variant">{k}</p></div>{toggle(True, "tool-" + k)}</div>
<p class="mt-3 text-[13px] text-on-surface-variant">{d}</p>
<div class="mt-3 flex items-end justify-between"><div><p class="tnum tight text-[20px] font-semibold">{n}</p><p class="text-[12px] text-on-surface-variant">lần · 7 ngày</p></div>{spark(sp, color, 110, 34)}</div>""", "p-4")
                    for (k, t, d, ic, tint, color, sp), n in zip(mcp, calls))
    dash = [("Grafana", "monitoring", "Mọi người", "bg-tertiary-fixed text-on-tertiary-fixed-variant"), ("Restate", "account-tree-outline-rounded", "Quản trị viên", "bg-primary/[.08] text-primary"),
            ("LiteLLM", "neurology-outline-rounded", "Quản trị viên", "bg-secondary-container text-on-secondary-container"), ("RustFS", "folder-open-outline-rounded", "Quản trị viên", "bg-inverse-primary/40 text-primary-container"),
            ("pgweb", "database-outline", "Quản trị viên", "bg-surface-container text-on-surface-variant"), ("Argo CD", "deployed-code-outline-rounded", "Quản trị viên", "bg-tertiary-fixed text-on-tertiary-fixed-variant")]
    drows = "".join(f"""<div class="flex items-center gap-3 py-2"><span class="flex h-9 w-9 items-center justify-center rounded-[10px] {tint}">{gi(ic, 18)}</span>
  <span class="flex-1 text-[14.5px] font-medium">{t}</span>{tag(gi("public-rounded" if who == "Mọi người" else "shield-person-outline-rounded", 13) + who, "bg-primary/[.08] text-primary" if who == "Mọi người" else "bg-surface-container text-on-surface-variant")}
  {gi("expand-more-rounded", 18, "text-on-surface-variant")}</div>""" for t, ic, who, tint in dash)
    recent = "".join(f"""<div class="flex items-center gap-4 border-t hair px-4 py-2.5 text-[13.5px] first:border-t-0">{avatar(ch, 24, "bg-primary text-on-primary")}<span class="w-[60px]">{n}</span>
  <span class="inline-flex h-6 items-center rounded-full bg-surface-container px-2.5 text-[12.5px]">{tl}</span><span class="min-w-0 flex-1 truncate text-on-surface-variant">{rec}</span>
  <span class="tnum text-[12.5px] text-on-surface-variant">{ms} ms</span><span class="tnum w-12 text-right text-[12.5px] text-on-surface-variant">{w}</span></div>"""
                     for ch, n, tl, rec, ms, w in [("L", "Lan", "account_get", "Đồ Cũ Gò Vấp", 42, "10:04"), ("L", "Lan", "listing_get", "iPhone 13 Pro Max 256GB", 38, "10:03"),
                                                   ("M", "Minh", "ticket_get", "Khánh Linh · chưa nhận hàng", 51, "09:11"), ("M", "Minh", "order_get", "GHTK S1.A1.17373471", 47, "09:11")])
    body = f"""<div class="grid grid-cols-[1fr_340px] gap-4">
  <div><div class="mb-3 flex items-center gap-2 px-1"><p class="text-[14px] font-semibold">Agent đọc được</p>{tag(gi("lock-outline", 13) + "Chỉ đọc")}</div>
    <div class="grid grid-cols-3 gap-3">{cards}</div>
    <p class="mb-3 mt-5 px-1 text-[14px] font-semibold">Gọi gần đây</p>{card(recent, "p-0 overflow-hidden")}</div>
  <div><p class="mb-3 px-1 text-[14px] font-semibold">Công cụ trong nav</p>{card(drows, "p-4 py-2")}</div>
</div>"""
    return page("tools", "Tools", "build-outline-rounded",
                [("visibility-outline", "6 tools chỉ đọc"), ("bolt-outline-rounded", "8.032 lần gọi · 7 ngày"), ("apps-rounded", "6 công cụ ngoài")], body)


# --- An toàn ---

def guardrails():
    rules = [("Ẩn thông tin cá nhân", "SĐT, email, số giấy tờ được che", "badge-outline", 27, [2, 4, 3, 5, 4, 6, 3]),
             ("Chặn ngoài phạm vi", "Từ chối việc không liên quan", "do-not-disturb-on-outline-rounded", 9, [1, 2, 1, 0, 2, 1, 2]),
             ("Phát hiện vòng lặp", "Dừng khi gọi lặp một tool", "all-inclusive-rounded", 3, [0, 1, 0, 0, 1, 0, 1]),
             ("Giới hạn tần suất", "20 câu mỗi phút mỗi người", "speed-outline-rounded", 2, [0, 0, 1, 0, 0, 1, 0]),
             ("Nhật ký gọi tool", "Ai hỏi, tool nào, bản ghi nào", "receipt-long-outline-rounded", 8032, [1100, 1180, 1090, 1210, 1150, 1240, 1062])]
    cards = "".join(card(f"""<div class="flex items-start gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/[.08] text-primary">{gi(ic, 20)}</span>
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[15px] font-semibold">{t}</p><p class="mt-0.5 text-[12.5px] text-on-surface-variant">{d}</p></div>{toggle(True, "g-" + str(i))}</div>
<div class="mt-4 flex items-end justify-between"><div><p class="tnum tight text-[22px] font-semibold">{f"{n:,}".replace(",", ".")}</p><p class="text-[12px] text-on-surface-variant">{"lần ghi" if i == 4 else "lần chặn"} · 7 ngày</p></div>{spark(sp, "var(--md-primary)", 120, 34)}</div>""", "p-4")
                    for i, (t, d, ic, n, sp) in enumerate(rules))
    hits = "".join(f"""<div class="relative flex gap-3 pb-4 last:pb-0"><span class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full {tone}">{gi(ic, 16)}</span>
  <div class="min-w-0 flex-1 pt-1 leading-tight"><p class="text-[14px]">{t}</p><p class="mt-1 flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">{avatar(w[0], 16, "bg-primary text-on-primary")}{w}</p></div></div>"""
                   for ic, t, w, tone in [("badge-outline", "Che 3 số điện thoại", "Lan · 10:12", "bg-primary/[.08] text-primary"),
                                          ("do-not-disturb-on-outline-rounded", "Từ chối “viết giúp bài đăng bán hàng”", "Tú · 09:40", "bg-tertiary-fixed text-on-tertiary-fixed-variant"),
                                          ("all-inclusive-rounded", "Dừng sau 6 lần gọi listing_get", "Minh · Hôm qua", "bg-error-container text-error"),
                                          ("badge-outline", "Che 1 email", "Hà · Hôm qua", "bg-primary/[.08] text-primary")])
    wk = [(5, 2, 1), (7, 1, 0), (4, 2, 1), (6, 0, 0), (5, 2, 1), (8, 1, 0), (4, 2, 1)]
    week = ('<div class="flex h-[64px] items-end gap-2">' + "".join('<div class="flex flex-1 flex-col justify-end">' + "".join(
        f'<span class="block w-full first:rounded-t-[4px]" style="height:{v * 5}px;background:{c}"></span>' for v, c in zip(d, ["var(--md-primary)", "#B3542E", "#E8B8A4"]))
        + "</div>" for d in wk) + "</div>" + '<div class="mt-1.5 flex justify-between text-[11.5px] text-on-surface-variant"><span>T5</span><span>Hôm nay</span></div>')
    body = f"""<div class="grid grid-cols-[1fr_360px] gap-4">
  <div class="grid grid-cols-2 gap-3">{cards}
    <div class="col-span-1">{card(card_head("Lần chặn theo ngày") + week, "p-4")}</div></div>
  {card(card_head("Gần đây", btn("Nhật ký", kind="ghost", aid="to-audit")) + '<div class="relative before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-outline-variant/60">' + hits + "</div>")}
</div>"""
    return page("guardrails", "An toàn", "verified-user-outline-rounded",
                [("check-circle-outline-rounded", "5/5 đang bật"), ("shield-outline-rounded", "41 lần chặn · 7 ngày")], body)


# --- Nhật ký thao tác ---

def audit():
    days = [("Hôm nay", [("10:31", "K", "Khoa", "đổi hạn mức ngày của", "Phạm Văn Minh", "$5 → $6", "", "tune-rounded", "bg-secondary-container text-on-secondary-container"),
                         ("10:05", "L", "Lan", "khoá 30 ngày", "Đồ Cũ Gò Vấp", "", "Lừa đảo đặt cọc qua chat", "lock-outline", "bg-error-container text-error"),
                         ("09:58", "L", "Lan", "ẩn 4 tin của", "Trần Đức Anh", "", "Ảnh trùng tin của Gò Vấp", "visibility-off-outline", "bg-tertiary-fixed text-on-tertiary-fixed-variant"),
                         ("08:40", "K", "Khoa", "sửa hướng dẫn agent", "Bản 4", "Bản 3 → 4", "", "material-symbols:auto-awesome-outline-rounded", "bg-primary/[.08] text-primary")]),
            ("Hôm qua", [("17:20", "H", "Hà", "mở khoá", "Nguyễn Hữu Lộc", "", "Hết hạn, đã xác minh lại", "lock-open-outline", "bg-primary/[.08] text-primary"),
                         ("15:02", "K", "Khoa", "mời", "Võ Ngọc Ánh", "Kiểm duyệt viên", "", "person-add-outline-rounded", "bg-secondary-container text-on-secondary-container"),
                         ("11:47", "B", "Bảo", "đổi model của", "Tìm kiếm", "Haiku 5.5", "", "neurology-outline-rounded", "bg-inverse-primary/40 text-primary-container")])]
    out = ""
    for day, items in days:
        rows = "".join(f"""<div class="relative flex gap-4 pb-4 last:pb-0"><span class="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white {tone}">{gi(ic, 17)}</span>
  <div class="hov -mt-1 flex min-w-0 flex-1 items-start gap-3 rounded-[14px] px-3 py-2">
    <div class="min-w-0 flex-1"><p class="flex flex-wrap items-center gap-1.5 text-[14.5px]">{avatar(ch, 22, "bg-primary text-on-primary")}<span class="font-semibold">{n}</span>{a}
      <span class="inline-flex h-7 items-center rounded-full border hair bg-white px-2.5 text-[13px] font-medium text-primary">{escape(t)}</span>{f'<span class="tnum text-[13px] text-on-surface-variant">{extra}</span>' if extra else ""}</p>
      {f'<p class="mt-1.5 border-l-2 border-primary/40 pl-2.5 text-[13.5px] text-on-surface-variant">{escape(r)}</p>' if r else ""}</div>
    <span class="tnum pt-1 text-[13px] text-on-surface-variant">{w}</span></div></div>""" for w, ch, n, a, t, extra, r, ic, tone in items)
        out += f'<p class="mb-3 mt-1 text-[13px] font-semibold text-on-surface-variant">{day}</p><div class="relative mb-5 before:absolute before:bottom-4 before:left-[18px] before:top-4 before:w-px before:bg-outline-variant/60">{rows}</div>'
    chips = "".join(f'<a id="af-{i}" href="#af-{i}" class="flex h-9 items-center gap-1.5 rounded-full border hair bg-white px-3.5 text-[13.5px] {"border-primary/40 bg-primary/[.06] text-primary" if i == 0 else "text-on-surface-variant"}">{gi(ic, 16)}{t}{gi("expand-more-rounded", 16)}</a>'
                    for i, (ic, t) in enumerate([("calendar-month-outline-rounded", "7 ngày"), ("group-outline-rounded", "Mọi người"), ("category-outline-rounded", "Mọi thao tác")]))
    kinds = "".join(f'<div class="flex items-center gap-3 py-1.5"><span class="flex h-8 w-8 items-center justify-center rounded-full {tone}">{gi(ic, 16)}</span><span class="flex-1 text-[14px]">{t}</span><span class="tnum text-[14px] font-medium">{n}</span></div>'
                    for ic, t, n, tone in [("lock-outline", "Khoá, mở khoá", 23, "bg-error-container text-error"), ("visibility-off-outline", "Ẩn tin", 41, "bg-tertiary-fixed text-on-tertiary-fixed-variant"),
                                           ("reply-rounded", "Trả lời ticket", 186, "bg-primary/[.08] text-primary"), ("tune-rounded", "Cấu hình", 9, "bg-secondary-container text-on-secondary-container")])
    body = f"""<div class="grid grid-cols-[1fr_320px] gap-4">
  <div><div class="mb-4 flex items-center gap-2">{chips}</div>{card(out, "p-5 pb-1")}</div>
  <div class="space-y-4">{card(card_head("7 ngày") + kinds, "p-5 pb-3")}{btn("Xuất CSV", "download-rounded", aid="csv")}</div>
</div>"""
    return page("audit", "Nhật ký thao tác", "history-rounded",
                [("event-note-outline-rounded", "259 thao tác · 7 ngày"), ("material-symbols:auto-awesome-outline-rounded", "64% từ đề xuất của agent")], body)


# Models and Agent moved to build_soft_ai.py (providers, models with tags, agents).
SCREENS = {"soft-cfg-overview": overview, "soft-cfg-members": members, "soft-cfg-budget": budget, "soft-cfg-tools": tools, "soft-cfg-guardrails": guardrails, "soft-cfg-audit": audit}

if __name__ == "__main__":
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name]())
        print("wrote", name)
