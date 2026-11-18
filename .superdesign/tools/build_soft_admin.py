"""The console's home for everyone and the admin's Cấu hình, in the soft look.

Writes ../mockups/soft-<name>.html. Uses build_soft_agent.py's shell in Be
Vietnam Pro. Home is the agent's new chat for every member; an admin's nav
adds Cấu hình above the member. Cấu hình swaps the nav for its own, with
"Console" to go back, the way AI Portal's admin console does.

The data is the stack's own: LiteLLM's aliases (infra/stack/litellm/
config.yaml), the MCP tools the agent reads with (server/internal/agent/mcp),
the agent's limits (infra/stack/env/agent.env) and its guardrails
(agent/src/guardrails).

  soft-home-member      home, Kiểm duyệt viên
  soft-home-admin       home, Quản trị viên, with Cấu hình
  soft-cfg-overview     Tổng quan: spend, questions, proposals kept
  soft-cfg-members      Nhân viên
  soft-cfg-models       Models
  soft-cfg-budget       Hạn mức
  soft-cfg-agent        Agent
  soft-cfg-tools        Tools
  soft-cfg-guardrails   An toàn
  soft-cfg-audit        Nhật ký thao tác
"""
import os
import sys
from html import escape

os.environ.setdefault("SOFT_FONT", "be-vietnam-pro")
from build_soft_agent import OUT, gi, avatar, new_chat, shell  # noqa: E402
from common import LOGO  # noqa: E402

GROUPS = [
    ("", [("overview", "Tổng quan", "space-dashboard-outline-rounded")]),
    ("Người và quyền", [("members", "Nhân viên", "group-outline-rounded"), ("roles", "Vai trò", "shield-person-outline-rounded")]),
    ("AI", [("agents", "Agents", "material-symbols:auto-awesome-outline-rounded"), ("models", "Models", "neurology-outline-rounded"),
            ("providers", "Providers", "cloud-outline"), ("budget", "Hạn mức", "speed-outline-rounded"), ("tools", "Tools", "build-outline-rounded")]),
    ("Giám sát", [("guardrails", "An toàn", "verified-user-outline-rounded"), ("audit", "Nhật ký thao tác", "history-rounded"),
                  ("feedback", "Phản hồi", "thumbs-up-down-outline-rounded")]),
]


def cfg_nav(active):
    groups = "".join(
        (f'<p class="px-2.5 pb-1 pt-4 text-[12px] text-on-surface-variant/80">{title}</p>' if title else "") + "".join(
            f'<a id="cfg-{k}" href="#cfg-{k}" class="{"bg-on-surface/[.06] font-medium text-on-surface" if k == active else "hov text-on-surface-variant"} flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[14px]">'
            f'{gi(ic, 19, "text-primary" if k == active else "")}{t}</a>' for k, t, ic in items) for title, items in GROUPS)
    return f"""<nav class="side flex w-[272px] shrink-0 flex-col border-r hair px-3 pb-3 pt-3">
  <div class="flex h-10 items-center gap-2 px-1.5"><img src="{LOGO}" alt="ShopNexus" class="h-7 w-7 rounded-[8px]">
    <span class="tight text-[15px] font-semibold">Cấu hình</span></div>
  <a id="back" href="#home" class="hov mt-3 flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[14px] text-on-surface-variant">{gi("arrow-back-rounded", 19)}Console</a>
  <div class="my-2 h-px bg-outline-variant/40"></div>
  <div class="min-h-0 flex-1">{groups}</div>
  <a id="me" href="#me" class="hov mt-1 flex h-12 items-center gap-2.5 rounded-[12px] px-2">{avatar("K", 30, "bg-primary text-on-primary")}
    <span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[14px] font-medium">Trần Minh Khoa</span>
    <span class="block text-[12px] text-on-surface-variant">Quản trị viên</span></span>{gi("unfold-more-rounded", 16, "text-on-surface-variant")}</a>
</nav>"""


# --- pieces ---

def btn(text, ic="", kind="plain", aid="b"):
    cls = {"primary": "bg-primary text-on-primary", "plain": "hov border hair bg-white", "ghost": "hov text-primary",
           "danger": "hov border border-error/30 text-error"}[kind]
    return (f'<a id="{aid}" href="#{aid}" class="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[14px] font-medium {cls}">'
            f'{gi(ic, 17) if ic else ""}{text}</a>')


def card(body, cls="p-5"):
    return f'<section class="soft rounded-[16px] border hair bg-white {cls}">{body}</section>'


def card_head(title, right="", sub=""):
    return (f'<div class="mb-4 flex items-start gap-3"><div class="min-w-0 flex-1"><h2 class="tight text-[16px] font-semibold">{title}</h2>'
            f'{f"<p class=\'mt-0.5 text-[13px] text-on-surface-variant\'>{sub}</p>" if sub else ""}</div>{right}</div>')


def toggle(on=True, aid="t"):
    return (f'<a id="{aid}" href="#{aid}" class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full {"bg-primary" if on else "bg-surface-container-highest"}">'
            f'<span class="absolute h-5 w-5 rounded-full bg-white shadow-sm {"left-[22px]" if on else "left-0.5"}"></span></a>')


def meter(pct, tone="bg-primary", h=8):
    return (f'<div class="w-full overflow-hidden rounded-full bg-surface-container" style="height:{h}px">'
            f'<div class="h-full rounded-full {tone}" style="width:{pct}%"></div></div>')


def tag(text, tone="bg-primary/[.08] text-primary"):
    return f'<span class="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-medium {tone}">{text}</span>'


def field(label, value, sub=""):
    return (f'<div class="flex items-center gap-6 border-t hair py-4 first:border-t-0 first:pt-0"><div class="min-w-0 flex-1"><p class="text-[14.5px] font-medium">{label}</p>'
            f'{f"<p class=\'mt-0.5 text-[13px] text-on-surface-variant\'>{sub}</p>" if sub else ""}</div>{value}</div>')


def select(text, aid="s", w="w-[180px]"):
    return (f'<a id="{aid}" href="#{aid}" class="hov flex h-10 {w} shrink-0 items-center gap-2 rounded-[12px] border hair bg-white px-3.5 text-[14px]">'
            f'<span class="min-w-0 flex-1 truncate">{text}</span>{gi("expand-more-rounded", 18, "text-on-surface-variant")}</a>')


def number(value, unit, aid="n"):
    return (f'<span id="{aid}" class="flex h-10 w-[180px] shrink-0 items-center rounded-[12px] border hair bg-white px-3.5 text-[14px]">'
            f'<span class="tnum flex-1">{value}</span><span class="text-on-surface-variant">{unit}</span></span>')


def page(key, title, body, actions="", sub=""):
    main = f"""<main class="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
  <header class="flex shrink-0 items-end gap-4 px-10 pb-6 pt-9">
    <div class="min-w-0 flex-1"><h1 class="tight text-[26px] font-semibold leading-[34px]">{title}</h1>
      {f'<p class="mt-1 text-[14px] text-on-surface-variant">{sub}</p>' if sub else ""}</div>{actions}</header>
  <div class="min-h-0 flex-1 overflow-hidden px-10 pb-8">{body}</div>
</main>"""
    return shell(title + " · Cấu hình", main, side=cfg_nav(key))


def bars(values, tone="bg-primary", h=120):
    top = max(values)
    cols = "".join(f'<div class="flex flex-1 flex-col items-center justify-end gap-1.5"><span class="w-full rounded-[4px] {tone if i < len(values) - 1 else "bg-primary/40"}" style="height:{max(4, round(v / top * h))}px"></span></div>'
                   for i, v in enumerate(values))
    return f'<div class="flex items-end gap-1.5" style="height:{h}px">{cols}</div>'


def tile(label, value, sub, ic, extra=""):
    return card(f"""<div class="flex items-center gap-2 text-[13.5px] text-on-surface-variant"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/[.08] text-primary">{gi(ic, 17)}</span>{label}</div>
  <p class="tnum tight mt-3 text-[30px] font-semibold leading-9">{value}</p><p class="mt-1 text-[13px] text-on-surface-variant">{sub}</p>{extra}""")


def table(heads, rows):
    th = "".join(f'<th class="px-5 py-3 text-left font-medium">{h}</th>' for h in heads)
    trs = "".join('<tr class="border-t hair hov">' + "".join(f'<td class="px-5 py-3 align-middle">{c}</td>' for c in r) + "</tr>" for r in rows)
    return (f'<div class="soft overflow-hidden rounded-[16px] border hair bg-white"><table class="w-full text-[14px]">'
            f'<thead class="bg-surface-container-low/60 text-[13px] text-on-surface-variant"><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')


def person(ch, name, sub):
    return (f'<span class="flex items-center gap-3">{avatar(ch, 34, "bg-primary text-on-primary")}<span class="leading-tight"><span class="block font-medium">{escape(name)}</span>'
            f'<span class="block text-[12.5px] text-on-surface-variant">{sub}</span></span></span>')


# --- screens ---

def overview():
    daily = [3.1, 4.2, 5.8, 4.9, 6.3, 2.1, 1.8, 7.2, 8.4, 6.9, 9.1, 8.2, 3.0, 2.4, 9.8, 10.6, 8.7, 4.1]
    by_model = [("console-agent", "Claude Sonnet 5.5", "128,40", 90), ("scam-check", "Claude Haiku 5.5", "8,10", 6),
                ("listing-read", "Claude Haiku 5.5", "3,90", 3), ("search", "Claude Haiku 5.5", "1,60", 1), ("embed-text", "bge-m3", "0,30", 0.5)]
    models = "".join(f"""<div class="py-1.5"><div class="flex items-baseline gap-2 text-[14px]"><span class="font-medium">{a}</span><span class="text-[12.5px] text-on-surface-variant">{m}</span>
  <span class="tnum ml-auto">${c}</span></div><div class="mt-1.5">{meter(p, "bg-primary/70", 6)}</div></div>""" for a, m, c, p in by_model)
    people = "".join(f"""<div class="flex items-center gap-3 py-1.5">{avatar(ch, 30, key=n)}<span class="min-w-0 flex-1 truncate text-[14px]">{n}</span>
  <span class="tnum text-[13px] text-on-surface-variant">{q} câu</span><span class="tnum w-14 text-right text-[14px]">${c}</span></div>"""
                     for ch, n, q, c in [("L", "Nguyễn Thị Lan", 312, "38,20"), ("M", "Phạm Văn Minh", 268, "31,60"), ("H", "Lê Thu Hà", 201, "22,90"),
                                         ("T", "Đỗ Quang Tú", 164, "17,30")])
    body = f"""<div class="grid grid-cols-4 gap-4">
  {tile("Chi phí tháng 11", "$142,30", "trên $300 của tháng", "payments-outline-rounded", f'<div class="mt-3">{meter(47)}</div>')}
  {tile("Câu hỏi cho agent", "1.284", "+18% so với tháng 10", "forum-outline-rounded")}
  {tile("Đề xuất được giữ", "78%", "12% sửa, 10% bỏ", "task-alt-rounded")}
  {tile("Nhân viên dùng agent", "7/9", "2 người chưa hỏi lần nào", "group-outline-rounded")}
</div>
<div class="mt-4 grid grid-cols-[1fr_380px] gap-4">
  {card(card_head("Chi phí mỗi ngày", select("Tháng 11", "month", "w-[140px]")) + bars(daily, h=150) +
        '<div class="mt-2 flex justify-between text-[12px] text-on-surface-variant"><span>1/11</span><span>Hôm nay</span></div>')}
  {card(card_head("Theo model") + models)}
</div>
<div class="mt-4 grid grid-cols-[1fr_380px] gap-4">
  {card(card_head("Theo nhân viên", btn("Xem tất cả", kind="ghost", aid="all-people")) + people)}
  {card(card_head("Cần xem") + "".join(f'<a id="todo-{i}" href="#todo-{i}" class="hov -mx-2 flex items-center gap-3 rounded-[12px] px-2 py-2.5 text-[14px]"><span class="flex h-8 w-8 items-center justify-center rounded-full {tone}">{gi(ic, 17)}</span><span class="min-w-0 flex-1">{t}</span>{gi("chevron-right-rounded", 18, "text-on-surface-variant")}</a>'
        for i, (ic, t, tone) in enumerate([("trending-up-rounded", "Minh xin tăng hạn mức ngày lên $8", "bg-tertiary-fixed text-on-tertiary-fixed-variant"),
                                           ("person-add-outline-rounded", "Lời mời Võ Ngọc Ánh chưa được nhận", "bg-primary/[.08] text-primary"),
                                           ("thumb-down-outline-rounded", "6 câu trả lời bị đánh giá chưa đúng", "bg-error-container text-error")])))}
</div>"""
    return page("overview", "Tổng quan", body, select("Tháng 11 · 2026", "range", "w-[170px]"))


MEMBERS = [("K", "Trần Minh Khoa", "khoa@shopnexus.vn", "Quản trị viên", "$10", "9,80", "Đang online", True),
           ("L", "Nguyễn Thị Lan", "lan@shopnexus.vn", "Kiểm duyệt viên", "$5", "38,20", "5 phút trước", True),
           ("M", "Phạm Văn Minh", "minh@shopnexus.vn", "Kiểm duyệt viên", "$5", "31,60", "1 giờ trước", True),
           ("H", "Lê Thu Hà", "ha@shopnexus.vn", "Kiểm duyệt viên", "$5", "22,90", "Hôm qua", True),
           ("T", "Đỗ Quang Tú", "tu@shopnexus.vn", "Kiểm duyệt viên", "$5", "17,30", "Hôm qua", True),
           ("B", "Hoàng Gia Bảo", "bao@shopnexus.vn", "Quản trị viên", "$10", "4,10", "3 ngày trước", True),
           ("N", "Vũ Thị Ngân", "ngan@shopnexus.vn", "Kiểm duyệt viên", "$5", "0,00", "12 ngày trước", False),
           ("A", "Võ Ngọc Ánh", "anh@shopnexus.vn", "Kiểm duyệt viên", "$5", "–", "Chưa nhận lời mời", None)]


def members():
    def role(r):
        return tag(r, "bg-primary/[.08] text-primary" if r == "Quản trị viên" else "bg-surface-container text-on-surface-variant")

    def state(on):
        if on is None:
            return tag(gi("schedule-outline-rounded", 14) + "Đã mời", "bg-tertiary-fixed/70 text-on-tertiary-fixed-variant")
        return tag("Hoạt động" if on else "Tạm khoá", "bg-primary/[.08] text-primary" if on else "bg-error-container text-error")
    rows = [[person(ch, n, e), role(r), state(on), f'<span class="tnum">{lim}/ngày</span>', f'<span class="tnum">${u}</span>' if u != "–" else u,
             f'<span class="text-on-surface-variant">{last}</span>', f'<a id="m-{ch}" href="#m-{ch}" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("more-horiz", 18)}</a>']
            for ch, n, e, r, lim, u, last, on in MEMBERS]
    seg = "".join(f'<a id="f-{k}" href="#f-{k}" class="flex h-8 items-center rounded-full px-3.5 {"bg-white soft font-medium" if k == "all" else "text-on-surface-variant"}">{t}</a>'
                  for k, t in [("all", "Tất cả · 8"), ("admin", "Quản trị viên · 2"), ("mod", "Kiểm duyệt viên · 6")])
    body = f"""<div class="mb-4 flex items-center gap-3"><div class="flex rounded-full bg-surface-container p-1 text-[13.5px]">{seg}</div><span class="flex-1"></span>
  <div class="flex h-10 w-[280px] items-center gap-2 rounded-full border hair bg-white px-4 text-[14px] text-on-surface-variant">{gi("search-rounded", 18)}Tên hoặc email</div></div>
{table(["Nhân viên", "Vai trò", "Trạng thái", "Hạn mức", "Tháng này", "Hoạt động", ""], rows)}"""
    return page("members", "Nhân viên", body, btn("Mời nhân viên", "person-add-outline-rounded", "primary", "invite"))


def models():
    def row(alias, model, used, cost, where, ok=True, embed=False):
        return f"""<div class="flex items-center gap-5 border-t hair px-5 py-4 first:border-t-0">
  <span class="flex h-10 w-10 items-center justify-center rounded-[12px] {"bg-primary/[.08] text-primary" if not embed else "bg-surface-container text-on-surface-variant"}">{gi("hub-outline-rounded" if embed else "neurology-outline-rounded", 20)}</span>
  <div class="w-[200px] leading-tight"><p class="text-[15px] font-semibold">{alias}</p><p class="mt-0.5 text-[13px] text-on-surface-variant">{used}</p></div>
  {select(model, "mdl-" + alias, "w-[220px]")}
  <p class="tnum w-[150px] text-[13.5px] text-on-surface-variant">{cost}</p>
  <p class="min-w-0 flex-1 text-[13.5px] text-on-surface-variant">{where}</p>
  {tag('<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>Chạy tốt' if ok else "Chậm", "bg-primary/[.08] text-primary" if ok else "bg-tertiary-fixed/70 text-on-tertiary-fixed-variant")}
</div>"""
    llm = card(card_head("Ngôn ngữ", btn("Thêm model", "add-rounded", aid="add-model"), "Mỗi tính năng gọi một tên riêng; đổi model ở đây, app và agent không cần sửa") +
               '<div class="-mx-5 -mb-5">' + row("console-agent", "Claude Sonnet 5.5", "Agent của console", "$2 · $10 / 1M token", "p50 2,1 s · 1.284 câu tháng này") +
               row("scam-check", "Claude Haiku 5.5", "Kiểm tra lừa đảo trong chat", "$1 · $1 / 1M token", "p50 0,6 s · 18.902 lượt") +
               row("listing-read", "Claude Haiku 5.5", "Đọc ảnh tin đăng", "$1 · $1 / 1M token", "p50 3,8 s · 6.410 lượt", ok=False) +
               row("search", "Claude Haiku 5.5", "Tìm kiếm trong app", "$1 · $1 / 1M token", "p50 0,4 s · 31.277 lượt") + "</div>", "p-5")
    emb = card(card_head("Vector") + f'''<div class="flex items-center gap-4"><span class="flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface-container text-on-surface-variant">{gi("hub-outline-rounded", 20)}</span>
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[15px] font-semibold">embed-text</p><p class="mt-0.5 text-[13px] text-on-surface-variant">Vector tìm kiếm · $1 / 1M token</p></div>{tag('<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>Chạy tốt')}</div>
  <div class="mt-4">{select("bge-m3 · DeepInfra", "mdl-embed", "w-full")}</div>
  <p class="mt-3 text-[13px] text-on-surface-variant">Cố định nhà cung cấp để vector cũ và mới cùng một không gian</p>''')
    up = card(card_head("Nhà cung cấp") + field("LLM upstream", tag("Đã kết nối"), "API tương thích OpenAI, phục vụ các model Claude") +
              field("OpenRouter", tag("Đã kết nối"), "Chỉ cho embed-text") +
              field("Lưu nội dung câu hỏi", toggle(False, "store-prompts"), "Nhật ký chi phí giữ 30 ngày, không giữ nội dung"))
    body = f'<div class="space-y-4">{llm}<div class="grid grid-cols-[420px_1fr] gap-4">{emb}{up}</div></div>'
    return page("models", "Models", body, btn("Mở LiteLLM", "north-east-rounded", aid="open-litellm"))


def budget():
    keys = "".join(f"""<div class="border-t hair py-2.5 first:border-t-0 first:pt-0"><div class="flex items-center gap-3 text-[14.5px]"><span class="font-medium">{a}</span>
  <span class="text-[13px] text-on-surface-variant">{who}</span><span class="tnum ml-auto">${u} <span class="text-on-surface-variant">/ ${cap}</span></span>
  <a id="edit-{a}" href="#edit-{a}" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("edit-outline-rounded", 16)}</a></div>
  <div class="mt-2">{meter(p, "bg-tertiary" if p >= 80 else "bg-primary")}</div></div>"""
                   for a, who, u, cap, p in [("console-agent", "Agent console", "128,40", "250", 51), ("scam-check", "App", "8,10", "20", 41),
                                             ("listing-read", "App", "3,90", "15", 26), ("search", "App", "1,60", "2", 80)])
    reqs = "".join(f"""<div class="flex items-center gap-3 border-t hair py-3.5 first:border-t-0 first:pt-0">{avatar(ch, 34, key=n)}
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[14.5px]"><span class="font-medium">{n}</span> xin <span class="tnum font-medium">{ask}</span></p>
  <p class="mt-0.5 truncate text-[13px] text-on-surface-variant">“{why}” · {when}</p></div>
  <a id="no-{ch}" href="#no-{ch}" title="Từ chối" class="hov flex h-9 w-9 items-center justify-center rounded-full border hair text-on-surface-variant">{gi("close-rounded", 18)}</a>
  <a id="ok-{ch}" href="#ok-{ch}" title="Duyệt" class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">{gi("check-rounded", 18)}</a></div>"""
                   for ch, n, ask, why, when in [("M", "Phạm Văn Minh", "$8/ngày hôm nay", "Đang rà nhóm lừa đảo Gò Vấp, nhiều câu hỏi", "10:24"),
                                                 ("H", "Lê Thu Hà", "$7/ngày tuần này", "Trực thay ca tối", "Hôm qua")])
    body = f"""<div class="grid grid-cols-[1fr_420px] gap-4">
  <div class="space-y-4">
    {card(card_head("Cả tháng", sub="Tổng chi phí AI của mọi model") + f'''<div class="flex items-end gap-3"><p class="tnum tight text-[34px] font-semibold leading-10">$142,30</p>
      <p class="pb-1 text-[14px] text-on-surface-variant">trên $300 · còn 12 ngày</p></div><div class="mt-3">{meter(47, h=10)}</div>
      <div class="mt-5">{field("Hạn mức tháng", number("300", "USD", "cap-month"))}{field("Báo khi chạm", number("80", "%", "alert"))}
      {field("Khi hết hạn mức", select("Dừng agent, app vẫn chạy", "on-cap", "w-[260px]"))}</div>''')}
    {card(card_head("Theo model", sub="Mỗi model một khoá LiteLLM, tính theo giá niêm yết") + keys)}
  </div>
  <div class="space-y-4">
    {card(card_head("Mỗi nhân viên") + field("Kiểm duyệt viên", number("5", "USD/ngày", "cap-mod")) + field("Quản trị viên", number("10", "USD/ngày", "cap-admin")) +
          field("Riêng từng người", btn("2 người", aid="overrides"), "Hà $7, Minh $6"))}
    {card(card_head("Yêu cầu tăng", tag("2", "bg-tertiary-fixed text-on-tertiary-fixed-variant")) + reqs)}
  </div>
</div>"""
    return page("budget", "Hạn mức", body)


def agent():
    prompt = ("Bạn là trợ lý của nhân viên ShopNexus. Bạn đọc ticket, báo cáo, tài khoản, đơn và tin đăng qua tools chỉ đọc, rồi đề xuất; "
              "nhân viên là người làm. Trả lời ngắn, tiếng Việt, nêu nguồn đã đọc. Không hứa với khách điều ShopNexus không làm: "
              "ShopNexus không giữ tiền, chỉ có COD đồng kiểm.")
    starters = "".join(f'<div class="flex items-center gap-3 rounded-[12px] border hair px-3.5 py-2.5 text-[14px]">{gi("drag-indicator", 18, "text-outline")}{gi(ic, 17, "text-primary")}<span class="flex-1">{t}</span>{gi("close-rounded", 16, "text-on-surface-variant")}</div>'
                       for ic, t in [("support-agent-outline", "Ticket nào chờ lâu nhất?"), ("flag-outline-rounded", "Báo cáo lừa đảo mới trong hôm nay"),
                                     ("local-shipping-outline-rounded", "Đơn GHTK báo giao mà khách chưa nhận"), ("group-outline-rounded", "Tài khoản sắp hết hạn khoá")])
    body = f"""<div class="grid grid-cols-[1fr_400px] gap-4">
  <div class="space-y-4">
    {card(card_head("Hướng dẫn", tag("Bản 4 · Khoa · 12/11", "bg-surface-container text-on-surface-variant")) +
          f'<div class="rounded-[14px] border hair bg-surface-container-low/50 p-4 text-[14.5px] leading-[24px]">{escape(prompt)}</div>' +
          f'<div class="mt-3 flex items-center gap-2">{btn("Sửa", "edit-outline-rounded", aid="edit-prompt")}{btn("Các bản trước", "history-rounded", "ghost", "versions")}<span class="flex-1"></span><span class="text-[13px] text-on-surface-variant">Áp dụng cho cuộc mới</span></div>')}
    {card(card_head("Giới hạn") + field("Model", select("console-agent", "agent-model")) +
          field("Thời gian mỗi câu", number("60", "giây", "deadline"), "Quá thời gian thì báo và cho chạy nền") +
          field("Độ dài trả lời", number("4.096", "token", "max-tokens")) +
          field("Nhớ trong cuộc", number("20", "lượt", "history")) +
          field("Ghi nhớ lâu dài", number("10", "mục", "memory"), "Mỗi nhân viên, tối đa 500 ký tự một mục"))}
  </div>
  <div class="space-y-4">
    {card(card_head("Câu hỏi gợi ý", btn("Thêm", "add-rounded", "ghost", "add-starter"), "Hiện ở màn cuộc mới") + f'<div class="space-y-2">{starters}</div>')}
    {card(card_head("Tính năng") + field("Chạy nền", toggle(True, "bg-run"), "Báo khi xong") + field("Soạn sẵn trả lời ticket", toggle(True, "drafts")) +
          field("Đề xuất xử lý báo cáo", toggle(True, "proposals")))}
  </div>
</div>"""
    return page("agent", "Agent", body, btn("Thử trong cuộc mới", "material-symbols:auto-awesome-outline-rounded", aid="try"))


def tools():
    mcp = [("ticket_get", "Ticket", "Một ticket với khách, đơn và vận đơn", "1.902"), ("tickets_of_account", "Ticket của tài khoản", "Các ticket khác của cùng người", "644"),
           ("account_get", "Tài khoản", "Hồ sơ, xác minh, số đơn, số báo cáo", "2.310"), ("account_actions", "Lịch sử xử lý", "Các lần khoá, mở khoá trên tài khoản", "512"),
           ("order_get", "Đơn hàng", "Đơn COD, hãng vận chuyển và các mốc giao", "1.188"), ("listing_get", "Tin đăng", "Tin ở mọi trạng thái trừ đã xoá", "1.476")]
    rows = "".join(f"""<div class="flex items-center gap-4 border-t hair px-5 py-3.5 first:border-t-0">
  <span class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/[.08] text-primary">{gi("visibility-outline", 18)}</span>
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[14.5px] font-medium">{t} <span class="tnum ml-1 text-[12.5px] font-normal text-on-surface-variant">{k}</span></p><p class="mt-0.5 text-[13px] text-on-surface-variant">{d}</p></div>
  <span class="tnum w-[120px] text-right text-[13px] text-on-surface-variant">{n} lần · 7 ngày</span>{toggle(True, "tool-" + k)}</div>""" for k, t, d, n in mcp)
    dash = [("Grafana", "monitoring", "Mọi người"), ("Restate", "account-tree-outline-rounded", "Quản trị viên"), ("LiteLLM", "neurology-outline-rounded", "Quản trị viên"),
            ("RustFS", "folder-open-outline-rounded", "Quản trị viên"), ("pgweb", "database-outline", "Quản trị viên"), ("Argo CD", "deployed-code-outline-rounded", "Quản trị viên")]
    drows = "".join(f"""<div class="flex items-center gap-3 border-t hair py-3 first:border-t-0 first:pt-0"><span class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-container text-on-surface-variant">{gi(ic, 18)}</span>
  <span class="flex-1 text-[14.5px] font-medium">{t}</span>{select(who, "who-" + t, "w-[170px]")}</div>""" for t, ic, who in dash)
    body = f"""<div class="grid grid-cols-[1fr_400px] gap-4">
  {card(card_head("Agent đọc được", tag(gi("lock-outline", 13) + "Chỉ đọc"), "Agent chỉ đọc và đề xuất; khoá, ẩn tin, trả lời khách đều do nhân viên bấm") + '<div class="-mx-5 -mb-5">' + rows + "</div>")}
  {card(card_head("Công cụ trong nav", sub="Ai thấy và mở được") + drows)}
</div>"""
    return page("tools", "Tools", body)


def guardrails():
    rules = [("Ẩn thông tin cá nhân", "Số điện thoại, email và số giấy tờ được che trong câu trả lời", True, "badge-outline"),
             ("Chặn câu hỏi ngoài phạm vi", "Agent từ chối việc không liên quan đến ticket, báo cáo, tài khoản", True, "do-not-disturb-on-outline-rounded"),
             ("Phát hiện vòng lặp", "Dừng khi agent gọi cùng một tool lặp lại", True, "all-inclusive-rounded"),
             ("Giới hạn tần suất", "Tối đa 20 câu mỗi phút cho một nhân viên", True, "speed-outline-rounded"),
             ("Nhật ký mỗi lần gọi tool", "Ai hỏi, tool nào, đọc bản ghi nào", True, "receipt-long-outline-rounded")]
    rows = "".join(f"""<div class="flex items-center gap-4 border-t hair px-5 py-4 first:border-t-0"><span class="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/[.08] text-primary">{gi(ic, 19)}</span>
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[15px] font-medium">{t}</p><p class="mt-0.5 text-[13.5px] text-on-surface-variant">{d}</p></div>{toggle(on, "g-" + str(i))}</div>"""
                   for i, (t, d, on, ic) in enumerate(rules))
    hits = "".join(f"""<div class="flex items-center gap-3 border-t hair py-3 first:border-t-0 first:pt-0"><span class="flex h-8 w-8 items-center justify-center rounded-full {tone}">{gi(ic, 16)}</span>
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[14px]">{t}</p><p class="mt-0.5 text-[12.5px] text-on-surface-variant">{w}</p></div></div>"""
                   for ic, t, w, tone in [("badge-outline", "Che 3 số điện thoại", "Lan · 10:12", "bg-primary/[.08] text-primary"),
                                          ("do-not-disturb-on-outline-rounded", "Từ chối “viết giúp bài đăng bán hàng”", "Tú · 09:40", "bg-tertiary-fixed text-on-tertiary-fixed-variant"),
                                          ("all-inclusive-rounded", "Dừng sau 6 lần gọi listing_get", "Minh · Hôm qua", "bg-error-container text-error")])
    body = f"""<div class="grid grid-cols-[1fr_380px] gap-4">
  {card('<div class="-m-5">' + rows + "</div>")}
  {card(card_head("Gần đây", btn("Nhật ký", kind="ghost", aid="to-audit")) + hits)}
</div>"""
    return page("guardrails", "An toàn", body)


def audit():
    rows = [("10:31", "K", "Trần Minh Khoa", "Đổi hạn mức ngày", "Phạm Văn Minh · $5 → $6", "", "tune-rounded"),
            ("10:05", "L", "Nguyễn Thị Lan", "Khoá 30 ngày", "Đồ Cũ Gò Vấp", "Lừa đảo đặt cọc qua chat", "lock-outline"),
            ("09:58", "L", "Nguyễn Thị Lan", "Ẩn 4 tin", "Trần Đức Anh", "Ảnh trùng tin của Gò Vấp", "visibility-off-outline"),
            ("09:12", "M", "Phạm Văn Minh", "Gửi trả lời", "Ticket · Khánh Linh", "", "reply-rounded"),
            ("08:40", "K", "Trần Minh Khoa", "Sửa hướng dẫn agent", "Bản 3 → bản 4", "", "material-symbols:auto-awesome-outline-rounded"),
            ("Hôm qua", "H", "Lê Thu Hà", "Mở khoá", "Nguyễn Hữu Lộc", "Hết hạn, đã xác minh lại", "lock-open-outline"),
            ("Hôm qua", "K", "Trần Minh Khoa", "Mời nhân viên", "Võ Ngọc Ánh · Kiểm duyệt viên", "", "person-add-outline-rounded"),
            ("Hôm qua", "B", "Hoàng Gia Bảo", "Đổi model", "search · Haiku 5.5", "", "neurology-outline-rounded")]
    trs = [[f'<span class="tnum text-on-surface-variant">{w}</span>', f'<span class="flex items-center gap-2.5">{avatar(ch, 28, "bg-primary text-on-primary")}{n}</span>',
            f'<span class="flex items-center gap-2 font-medium">{gi(ic, 17, "text-primary")}{a}</span>', escape(t),
            f'<span class="text-on-surface-variant">{r and "“" + r + "”"}</span>'] for w, ch, n, a, t, r, ic in rows]
    chips = "".join(f'<a id="af-{i}" href="#af-{i}" class="flex h-9 items-center gap-1.5 rounded-full border hair bg-white px-3.5 text-[13.5px] {"border-primary/40 bg-primary/[.06] text-primary" if i == 0 else "text-on-surface-variant"}">{t}{gi("expand-more-rounded", 16)}</a>'
                    for i, t in enumerate(["7 ngày", "Mọi người", "Mọi thao tác"]))
    body = f'<div class="mb-4 flex items-center gap-2">{chips}<span class="flex-1"></span>{btn("Xuất CSV", "download-rounded", aid="csv")}</div>' + table(["Lúc", "Ai", "Thao tác", "Trên", "Lý do"], trs)
    return page("audit", "Nhật ký thao tác", body)


SCREENS = {"soft-home-member": ("Trang chủ · Mềm · Kiểm duyệt viên", lambda: new_chat()),
           "soft-home-admin": ("Trang chủ · Mềm · Quản trị viên", lambda: new_chat("admin")),
           "soft-cfg-overview": ("Cấu hình · Tổng quan", overview), "soft-cfg-members": ("Cấu hình · Nhân viên", members),
           "soft-cfg-models": ("Cấu hình · Models", models), "soft-cfg-budget": ("Cấu hình · Hạn mức", budget),
           "soft-cfg-agent": ("Cấu hình · Agent", agent), "soft-cfg-tools": ("Cấu hình · Tools", tools),
           "soft-cfg-guardrails": ("Cấu hình · An toàn", guardrails), "soft-cfg-audit": ("Cấu hình · Nhật ký thao tác", audit)}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
