"""More of the console agent: an answer still running or failed, a new chat with
a record attached, a report's chat, the review of a proposal and the graph of
a fraud ring.

Writes ../mockups/<name>.html for each screen in SCREENS. See agent.py for the
rules: the agent reads and proposes, the member acts; sources are chips;
nothing narrates the agent's steps.

The states map to the agent loop in ~/shopnexus/agent: a turn is RUNNING,
then SUCCEEDED, FAILED, CANCELLED or TIMED_OUT (60 s). A source chip is a
finished tool call; the chip still spinning is the call in progress. "Chạy
nền" hands a turn that ran out of time to a background run, which the agent
loop does not have yet.
"""
import sys
from html import escape
from pathlib import Path

from build_home import drawer, topbar
from agent import agent_pane, checkbox, answer, answer_tools, ask_box, chat, mine, page as agent_page, sources, thread_list
from build_reports import queue as report_queue
from common import head, icon

OUT = Path(__file__).resolve().parent.parent / "mockups"


def shell(title, active, main, rail=False):
    return f"""{head(title + " · Console")}<body>
<div class="flex h-[900px] w-[1440px] bg-surface text-on-surface">
  {drawer("moderator", active=active, open_tickets=7, open_reports=12, agent=True, rail=rail)}
  <div class="flex min-w-0 flex-1 flex-col">
    {topbar("moderator", title)}
    <main class="flex min-h-0 flex-1 gap-2 px-5 pb-5">{main}</main>
  </div>
</div>
</body>
</html>
"""


# --- an answer in progress, and one that ran out of time ---

def pending_chip(text):
    return (f'<span class="inline-flex h-6 items-center gap-1 rounded-sm border border-primary/40 bg-primary/5 px-1.5 text-label-small text-primary">'
            f'<span class="animate-spin">{icon("progress-activity", 14)}</span>{text}</span>')


def running():
    return f"""<div class="space-y-2">
  <div class="flex flex-wrap gap-1">{sources([("receipt-long-outline-rounded", "Đơn đang giao")])[len('<div class="flex flex-wrap gap-1">'):-len("</div>")]}{pending_chip("Vận đơn GHN")}</div>
  <div class="space-y-2 pt-1">
    <span class="block h-3 w-[88%] animate-pulse rounded-full bg-surface-container-high"></span>
    <span class="block h-3 w-[64%] animate-pulse rounded-full bg-surface-container-high"></span>
  </div>
</div>"""


def failed():
    return f"""<div class="space-y-2">
  {sources([("receipt-long-outline-rounded", "Đơn đang giao"), ("local-shipping-outline-rounded", "Vận đơn GHN")])}
  <div class="flex flex-wrap items-center gap-2 rounded-md bg-surface-container-low px-3 py-2">
    <span class="text-error">{icon("timer-off-outline-rounded", 20)}</span>
    <p class="min-w-0 flex-1 text-body-medium">Quá 60 giây, chưa có câu trả lời.</p>
    <a id="retry-turn" href="#retry" class="state inline-flex h-8 items-center gap-1 rounded-full px-3 text-label-large text-primary">{icon("refresh-rounded", 16)}Hỏi lại</a>
    <a id="run-background" href="#background" class="state inline-flex h-8 items-center gap-1 rounded-full bg-secondary-container px-3 text-label-large text-on-secondary-container">{icon("notifications-outline-rounded", 16)}Chạy nền, báo khi xong</a>
  </div>
</div>"""


# --- a new chat, with the attach menu open ---

RECENT = {
    "Báo cáo": [("flag-outline-rounded", "Đồ Cũ Gò Vấp", "Lừa đảo · 2 · 09:31", True),
                ("flag-outline-rounded", "Trần Đức Anh", "Lừa đảo · 4, Hàng giả · 09:48", False),
                ("flag-outline-rounded", "Mỹ Phẩm Xách Tay Hà", "Hàng giả · 3 · 09:02", False),
                ("flag-outline-rounded", "Nguyễn Hữu Lộc", "Hàng cấm · 2 · 08:57", False)],
}


CHECK = f'<span class="text-primary">{icon("check-rounded", 20)}</span>'


def attach_menu():
    tabs = "".join(
        f'<a id="attach-{k}" href="#attach-{k}" class="state flex h-8 flex-1 items-center justify-center rounded-full text-label-large '
        f'{"bg-secondary-container text-on-secondary-container" if k == "reports" else "text-on-surface-variant"}">{label}</a>'
        for k, label in [("tickets", "Ticket"), ("reports", "Báo cáo"), ("accounts", "Tài khoản")])
    rows = "".join(
        f'<a id="attach-row-{i}" href="#attach-row-{i}" class="state flex items-center gap-3 rounded-md px-2 py-2 {"bg-secondary-container/60" if on else ""}">'
        f'<span class="text-on-surface-variant">{icon(ic, 20)}</span>'
        f'<span class="min-w-0 flex-1"><span class="block truncate text-body-medium">{escape(t)}</span><span class="block truncate text-body-small text-on-surface-variant">{sub}</span></span>'
        f'{CHECK if on else ""}</a>'
        for i, (ic, t, sub, on) in enumerate(RECENT["Báo cáo"]))
    return f"""<div class="absolute left-0 top-full z-10 mt-2 w-[360px] rounded-lg bg-surface-container-lowest p-2 shadow-float">
  <div class="flex gap-1 rounded-full bg-surface-container-low p-1">{tabs}</div>
  <div class="mx-1 mt-2 flex h-10 items-center gap-2 rounded-xs border border-outline px-3 text-body-medium text-on-surface-variant">{icon("search-rounded", 18)}Tên hoặc id</div>
  <p class="px-2 pb-1 pt-3 text-label-medium text-on-surface-variant">Mở gần đây</p>
  {rows}
</div>"""


def new_chat():
    box = ask_box("Hỏi agent", icon("flag-outline-rounded", 14) + "Báo cáo · Đồ Cũ Gò Vấp"
                  + f'<a id="detach" href="#detach" title="Bỏ" class="ml-0.5 text-on-surface-variant">{icon("close-rounded", 14)}</a>', big=True)
    center = f"""<section class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-container-lowest">
  <div class="flex flex-1 justify-center px-6 pt-[220px]">
    <div class="relative h-fit w-full max-w-[720px]">{box}{attach_menu()}</div>
  </div>
</section>"""
    return agent_page(thread_list_none() + center)


def thread_list_none():
    return thread_list().replace("bg-secondary-container text-on-secondary-container", "", 1).replace(
        '<a id="thread-new" href="#thread-new" class="state flex h-10 items-center gap-2 rounded-full bg-primary',
        '<a id="thread-new" href="#thread-new" class="state flex h-10 items-center gap-2 rounded-full bg-primary ring-4 ring-primary/20', 1)


# --- the review of a proposal ---

RING = [
    # name, id, status, joined by, listings, orders in transit, keep, note
    ("Đồ Cũ Gò Vấp", "41b7c0de", "active", ["home-pin-outline-rounded", "forum-outline-rounded"], 5, 1, True, ""),
    ("Trần Đức Anh", "8e2f41a9", "active", ["home-pin-outline-rounded"], 3, 0, True, ""),
    ("Xe Máy Cũ 247", "9c13a5e2", "active", ["image-search-rounded", "forum-outline-rounded"], 2, 1, True, ""),
    ("Lâm Quốc Bảo", "d0e44b19", "active", ["forum-outline-rounded"], 2, 0, True, ""),
    ("Thanh Xe Cũ", "57ab08c3", "active", ["home-pin-outline-rounded", "image-search-rounded"], 1, 0, True, ""),
    ("Mai Anh Tuấn", "e8f2d671", "active", ["forum-outline-rounded"], 1, 0, True, ""),
    ("Phạm Hùng", "3b6e0f94", "active", ["image-search-rounded"], 0, 0, False, "Chỉ chung 1 ảnh, 12 đơn giao tốt"),
    ("Nguyễn Tấn Phát", "2f6c90b1", "suspended", ["image-search-rounded"], 0, 0, None, ""),
    ("Bùi Văn Khang", "6a1d3e77", "suspended", ["forum-outline-rounded"], 0, 0, None, ""),
]
JOIN = {"home-pin-outline-rounded": "Chung địa chỉ", "image-search-rounded": "Ảnh trùng", "forum-outline-rounded": "Mẫu tin nhắn"}


def proposal_card(rows):
    """The agent's proposal as a checklist the member ticks; a chat message changes it and the agent answers with the next version."""
    out = []
    for name, aid, status, joins, listings, transit, keep, change in rows:
        if status == "suspended":
            continue
        chips = "".join(f'<span class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm bg-surface-container-high px-1.5 py-0.5 text-label-small text-on-surface-variant">{icon(j, 12)}{JOIN[j]}</span>' for j in joins)
        term = ("30 ngày" if change == "30d" else "Vô thời hạn")
        sel = (f'<span class="inline-flex h-7 items-center gap-0.5 whitespace-nowrap rounded-xs border {"border-primary bg-primary/5" if change == "30d" else "border-outline"} pl-2 text-body-small">{term}{icon("arrow-drop-down-rounded", 18)}</span>'
               if keep else '<span class="text-body-small text-on-surface-variant">Giữ nguyên</span>')
        tag = ('<span class="rounded-sm bg-primary/10 px-1.5 text-label-small text-primary">Đổi</span>' if change == "30d"
               else '<span class="rounded-sm bg-surface-container-highest px-1.5 text-label-small text-on-surface-variant">Bỏ</span>' if change == "drop" else "")
        out.append(f"""<li id="row-{aid}" class="flex h-10 items-center gap-3 {"opacity-70" if keep is False else ""}">
  <a id="pick-{aid}" href="#pick-{aid}">{checkbox(keep)}</a>
  <span class="flex w-40 shrink-0 items-center gap-1.5"><a id="acc-{aid}" href="#account-{aid}" class="truncate text-title-small {"line-through decoration-1" if keep is False else ""}">{escape(name)}</a>{tag}</span>
  <span class="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">{chips}</span>
  <span class="shrink-0 text-body-small text-on-surface-variant">{listings} tin{f" · {transit} giao" if transit else ""}</span>
  <span class="flex w-28 shrink-0 justify-end">{sel}</span>
</li>""")
    act = lambda on, aid, title, extra="": (f'<li class="flex items-center gap-3 py-1.5"><a id="{aid}" href="#{aid}">{checkbox(on)}</a>'
                                           f'<span class="min-w-0 flex-1 text-body-medium">{title}</span>{extra}</li>')
    return f"""<section id="proposal-v2" class="overflow-hidden rounded-lg border border-error/30 bg-surface-container-lowest">
  <div class="flex items-center gap-2 bg-error-container/60 px-4 py-2.5">
    <span class="text-error">{icon("auto-awesome-rounded", 18)}</span>
    <p class="min-w-0 flex-1 text-title-small">Khoá 6 tài khoản, ẩn 13 tin, nhắn 2 người mua</p>
    <span class="rounded-full bg-surface-container-lowest px-2 py-0.5 text-label-small text-on-surface-variant">Bản 2</span>
  </div>
  <ul class="divide-y divide-outline-variant px-4">{"".join(out)}</ul>
  <div class="flex items-center gap-5 border-t border-outline-variant px-4 py-2 text-body-medium">
    <span class="flex items-center gap-3"><a id="pick-hide" href="#pick-hide">{checkbox(True)}</a>Ẩn 13 tin</span>
    <span class="flex items-center gap-3"><a id="pick-notify" href="#pick-notify">{checkbox(True)}</a>Nhắn 2 người mua</span>
    <a id="see-message" href="#see-message" class="text-label-large text-primary">Xem tin nhắn</a>
  </div>
  <div class="border-t border-outline-variant px-4 pb-3 pt-3.5">
    <div class="relative"><span class="absolute -top-2 left-3 bg-surface-container-lowest px-1 text-body-small text-on-surface-variant">Lý do khoá, người bị khoá thấy</span>
      <div class="rounded-xs border border-outline px-4 py-2.5 text-body-medium">Nhóm tài khoản đòi chuyển cọc, chung địa chỉ lấy hàng và ảnh</div></div>
    <div class="mt-3 flex items-center gap-2">
      <a id="confirm" href="#confirm" class="state inline-flex h-10 items-center gap-2 rounded-full bg-error px-5 text-label-large text-on-error">{icon("block-rounded", 18)}Khoá 6 tài khoản</a>
      <a id="discard" href="#discard" class="state inline-flex h-10 items-center rounded-full px-4 text-label-large text-primary">Bỏ đề xuất</a>
    </div>
  </div>
</section>"""


def done_card(rows):
    """The proposal after Khoá: what was done, by whom and when, and Hoàn tác."""
    out = []
    for name, aid, status, joins, listings, transit, keep, change in rows:
        if status == "suspended":
            continue
        mark = (f'<span class="text-primary">{icon("check-rounded", 18)}</span>' if keep
                else f'<span class="text-outline">{icon("remove-rounded", 18)}</span>')
        what = ("Khoá 30 ngày" if change == "30d" else "Khoá vô thời hạn") if keep else "Giữ nguyên"
        out.append(f"""<li id="done-{aid}" class="flex h-9 items-center gap-3 {"text-on-surface-variant" if not keep else ""}">{mark}
  <a id="done-acc-{aid}" href="#account-{aid}" class="min-w-0 flex-1 truncate text-body-medium">{escape(name)}</a>
  <span class="shrink-0 text-body-small text-on-surface-variant">{what}</span></li>""")
    return f"""<section id="proposal-done" class="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
  <div class="flex items-center gap-2 bg-surface-container-high px-4 py-2.5">
    <span class="text-primary">{icon("check-circle-rounded", 18)}</span>
    <p class="min-w-0 flex-1 text-title-small">Đã khoá 6 tài khoản, ẩn 13 tin, nhắn 2 người mua</p>
    <span class="text-body-small text-on-surface-variant">Lan · 10:05</span>
  </div>
  <ul class="divide-y divide-outline-variant px-4">{"".join(out)}</ul>
  <div class="flex items-center gap-2 border-t border-outline-variant px-4 py-3">
    <p class="min-w-0 flex-1 truncate text-body-small text-on-surface-variant">Lý do: Nhóm tài khoản đòi chuyển cọc, chung địa chỉ lấy hàng và ảnh</p>
    <a id="audit" href="#audit" class="state inline-flex h-9 items-center rounded-full px-3 text-label-large text-primary">Nhật ký</a>
    <a id="undo" href="#undo" class="state inline-flex h-9 items-center gap-1.5 rounded-full border border-outline px-4 text-label-large text-primary">{icon("undo-rounded", 18)}Hoàn tác</a>
  </div>
</section>"""


def proposal_chat(done=False):
    rows = [(n, a, st, j, l, t, k, "") for n, a, st, j, l, t, k, _ in RING]
    rows = [(n, a, st, j, l, t, False, "drop") if n == "Phạm Hùng" else
            (n, a, st, j, l, t, k, "30d") if n == "Lâm Quốc Bảo" else (n, a, st, j, l, t, k, c)
            for n, a, st, j, l, t, k, c in rows]
    old = f"""<a id="proposal-v1" href="#proposal-v1" class="state flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-on-surface-variant">
  {icon("auto-awesome-outline-rounded", 18)}<span class="min-w-0 flex-1 truncate text-body-medium line-through decoration-1">Khoá 7 tài khoản, ẩn 14 tin, nhắn 2 người mua</span>
  <span class="text-label-small">Bản 1 · đã thay</span>{icon("expand-more-rounded", 18)}</a>"""
    body = "".join([
        old,
        mine("Bỏ Phạm Hùng, chỉ chung 1 ảnh mà 12 đơn giao tốt. Lâm Quốc Bảo khoá 30 ngày thôi."),
        answer([("receipt-long-outline-rounded", "Đơn của Phạm Hùng")],
               '<p>Đã sửa: bỏ Phạm Hùng, Lâm Quốc Bảo khoá 30 ngày.</p>' + (done_card(rows) if done else proposal_card(rows)),
               answer_tools(aid="p2")),
    ])
    center = f"""<section class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-container-lowest">
  <header class="flex items-center gap-2 border-b border-outline-variant px-4 py-2">
    <h2 class="min-w-0 flex-1 truncate text-title-small">Nhóm Đồ Cũ Gò Vấp và Trần Đức Anh</h2>
    <a id="about-case" href="#case-c2" class="state inline-flex h-8 items-center gap-1 rounded-sm bg-surface-container-high px-2 text-label-medium text-on-surface-variant">{icon("flag-outline-rounded", 16)}Báo cáo · Đồ Cũ Gò Vấp{icon("arrow-outward-rounded", 14)}</a>
  </header>
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_56px)]">
    <div class="mx-auto w-full max-w-[720px] space-y-4 px-6 py-4">{body}</div>
  </div>
  <div class="mx-auto w-full max-w-[720px] px-6 pb-4">{ask_box("Hỏi tiếp" if done else "Sửa đề xuất hoặc hỏi tiếp", "", big=False)}</div>
</section>"""
    return agent_page(thread_list() + center)


# --- the graph of a ring ---

NODES = {  # key: (label, x, y, suspended, in the report)
    "gv": ("Đồ Cũ Gò Vấp", 300, 250, False, True),
    "da": ("Trần Đức Anh", 120, 130, False, False),
    "xm": ("Xe Máy Cũ 247", 500, 150, False, False),
    "qb": ("Lâm Quốc Bảo", 520, 360, False, False),
    "tx": ("Thanh Xe Cũ", 110, 360, False, False),
    "at": ("Mai Anh Tuấn", 330, 450, False, False),
    "ph": ("Phạm Hùng", 640, 250, False, False),
    "tp": ("Nguyễn Tấn Phát", 330, 70, True, False),
    "vk": ("Bùi Văn Khang", 640, 440, True, False),
}
EDGES = [  # a, b, kind, selected
    ("gv", "da", "address", True), ("gv", "tx", "address", False), ("da", "tx", "address", False),
    ("gv", "xm", "message", False), ("gv", "qb", "message", False), ("xm", "qb", "message", False), ("qb", "vk", "message", False),
    ("gv", "at", "message", False), ("xm", "tp", "photo", False), ("gv", "tp", "photo", False), ("xm", "ph", "photo", False), ("tx", "at", "photo", False),
]
KIND = {"address": ("#005049", "", "Chung địa chỉ lấy hàng", "home-pin-outline-rounded"),
        "photo": ("#6E7977", "6 5", "Ảnh trùng", "image-search-rounded"),
        "message": ("#47645F", "2 4", "Mẫu tin nhắn đòi cọc", "forum-outline-rounded")}


def graph_svg(ys=1.0, box="40 20 680 500", cls="h-full w-full"):
    """ys: squeeze the layout vertically to fit a chat message."""
    Y = lambda y: round(20 + (y - 20) * ys)
    lines = []
    for a, b, kind, sel in EDGES:
        (_, x1, y1, _, _), (_, x2, y2, _, _) = NODES[a], NODES[b]
        y1, y2 = Y(y1), Y(y2)
        color, dash, _, _ = KIND[kind]
        lines.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{5 if sel else 2}" '
                     f'stroke-dasharray="{dash}" stroke-linecap="round" opacity="{1 if sel else .7}"/>')
    nodes = []
    for key, (label, x, y, susp, here) in NODES.items():
        y = Y(y)
        fill = "#E6E9E7" if not susp else "#FFDAD6"
        ring = (f'<circle cx="{x}" cy="{y}" r="33" fill="none" stroke="#005049" stroke-width="3"/>' if here else
                f'<circle cx="{x}" cy="{y}" r="30" fill="none" stroke="#BA1A1A" stroke-width="2"/>' if susp else "")
        initial = label[0]
        lock = (f'<circle cx="{x + 20}" cy="{y - 20}" r="10" fill="#BA1A1A"/><text x="{x + 20}" y="{y - 16}" text-anchor="middle" font-size="11" fill="#fff" font-family="Be Vietnam Pro">✕</text>'
                if susp else "")
        nodes.append(f'<g id="node-{key}">{ring}<circle cx="{x}" cy="{y}" r="27" fill="{fill}"/>'
                     f'<text x="{x}" y="{y + 6}" text-anchor="middle" font-size="16" font-weight="500" fill="#3E4947" font-family="Be Vietnam Pro">{initial}</text>{lock}'
                     f'<text x="{x}" y="{y + 50}" text-anchor="middle" font-size="12" fill="#181C1C" font-family="Be Vietnam Pro">{escape(label)}</text></g>')
    return f'<svg viewBox="{box}" class="{cls}">{"".join(lines)}{"".join(nodes)}</svg>'


def graph():
    legend = "".join(
        f'<span class="inline-flex items-center gap-1.5 text-body-small text-on-surface-variant"><svg width="28" height="6"><line x1="2" y1="3" x2="26" y2="3" stroke="{c}" stroke-width="2.5" stroke-dasharray="{d}" stroke-linecap="round"/></svg>{t}</span>'
        for c, d, t, _ in KIND.values())
    evidence = f"""<div class="rounded-lg bg-surface-container-low p-4">
  <div class="flex items-center gap-2"><span class="text-primary">{icon("home-pin-outline-rounded", 20)}</span><p class="min-w-0 flex-1 text-title-small">Chung địa chỉ lấy hàng</p>
    <a id="edge-close" href="#edge-close" class="text-on-surface-variant">{icon("close-rounded", 18)}</a></div>
  <p class="mt-1 text-body-medium">Trần Đức Anh · Đồ Cũ Gò Vấp</p>
  <p class="mt-2 rounded-md bg-surface-container-low px-3 py-2 text-body-medium">45 Lê Đức Thọ, Phường 6, Gò Vấp</p>
  <p class="mt-2 text-body-small text-on-surface-variant">Đồ Cũ Gò Vấp dùng từ 08/2026, Trần Đức Anh từ 13/11</p>
  <a id="edge-ask" href="#ask" class="state mt-3 inline-flex h-8 items-center gap-1 rounded-full border border-outline px-3 text-label-large text-primary">{icon("auto-awesome-outline-rounded", 16)}Hỏi agent</a>
</div>"""
    panel = f"""<section class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-container-lowest">
  <header class="flex items-center gap-2.5 border-b border-outline-variant px-3 py-2">
    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error-container text-error">{icon("hub-rounded", 18)}</span>
    <div class="min-w-0 flex-1"><h2 class="truncate text-title-small">Nhóm Đồ Cũ Gò Vấp</h2>
      <p class="text-body-small text-on-surface-variant">9 tài khoản · 14 tin đang bán · 2 đơn đang giao</p></div>
    <a id="ask-agent" href="#ask-agent" class="state inline-flex h-9 items-center gap-1.5 rounded-full border border-outline px-4 text-label-large text-primary">{icon("auto-awesome-outline-rounded", 18)}Hỏi agent</a>
    <a id="review" href="#proposal" class="state inline-flex h-9 items-center gap-1.5 rounded-full bg-error px-4 text-label-large text-on-error">{icon("auto-awesome-rounded", 18)}Xem đề xuất</a>
    <a id="close-panel" href="#close-panel" title="Đóng (Esc)" class="state flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{icon("close-rounded", 20)}</a>
  </header>
  <div class="flex items-center gap-4 px-4 py-2">{legend}<span class="flex-1"></span>
    <span class="text-body-small text-on-surface-variant">Cập nhật 09:52</span></div>
  <div class="flex min-h-0 flex-1">
    <div class="min-w-0 flex-1 px-2">{graph_svg()}</div>
    <aside class="w-[300px] shrink-0 space-y-3 border-l border-outline-variant p-3">{evidence}
      <p class="px-1 text-body-small text-on-surface-variant">Chọn một đường nối để xem bằng chứng</p></aside>
  </div>
</section>"""
    return shell("Báo cáo", "reports", report_queue("c2") + panel, rail=True)


def graph_chat():
    legend = "".join(
        f'<span class="inline-flex items-center gap-1.5 text-body-small text-on-surface-variant"><svg width="24" height="6"><line x1="2" y1="3" x2="22" y2="3" stroke="{c}" stroke-width="2.5" stroke-dasharray="{d}" stroke-linecap="round"/></svg>{t}</span>'
        for c, d, t, _ in KIND.values())
    block = f"""<section id="ring-graph" class="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
  <div class="flex items-center gap-3 px-3 py-2">{legend}<span class="flex-1"></span>
    <a id="graph-full" href="#graph-full" title="Toàn màn hình" class="state flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{icon("open-in-full-rounded", 18)}</a></div>
  <div class="h-[330px] px-2">{graph_svg(ys=0.66, box="40 30 680 330")}</div>
  <div class="flex items-start gap-3 border-t border-outline-variant bg-surface-container-low px-4 py-3">
    <span class="mt-0.5 text-primary">{icon("home-pin-outline-rounded", 20)}</span>
    <div class="min-w-0 flex-1"><p class="text-title-small">Chung địa chỉ lấy hàng · Trần Đức Anh, Đồ Cũ Gò Vấp</p>
      <p class="text-body-medium">45 Lê Đức Thọ, Phường 6, Gò Vấp</p>
      <p class="text-body-small text-on-surface-variant">Đồ Cũ Gò Vấp dùng từ 08/2026, Trần Đức Anh từ 13/11</p></div>
    <a id="edge-close" href="#edge-close" title="Bỏ chọn" class="state flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{icon("close-rounded", 18)}</a>
  </div>
</section>"""
    v1 = f"""<a id="proposal-v1" href="#proposal" class="state flex items-center gap-2 rounded-lg bg-error-container/60 px-4 py-2.5">
  <span class="text-error">{icon("auto-awesome-rounded", 18)}</span><span class="min-w-0 flex-1 truncate text-title-small">Khoá 7 tài khoản, ẩn 14 tin, nhắn 2 người mua</span>
  <span class="inline-flex h-8 items-center gap-1 rounded-full bg-error px-3 text-label-large text-on-error">{icon("checklist-rounded", 16)}Duyệt</span></a>"""
    body = "".join([
        mine("Nhóm Đồ Cũ Gò Vấp gồm những ai, nối với nhau thế nào?"),
        answer([("home-pin-outline-rounded", "Địa chỉ lấy hàng"), ("image-search-rounded", "Ảnh giống nhau"), ("forum-outline-rounded", "Tin nhắn có cảnh báo")],
               "<p>9 tài khoản, 2 đã khoá hôm 12/11. Trần Đức Anh nối vào nhóm qua địa chỉ lấy hàng của Đồ Cũ Gò Vấp và Thanh Xe Cũ.</p>" + block + v1,
               answer_tools(aid="g1")),
    ])
    center = f"""<section class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-container-lowest">
  <header class="flex items-center gap-2 border-b border-outline-variant px-4 py-2">
    <h2 class="min-w-0 flex-1 truncate text-title-small">Nhóm Đồ Cũ Gò Vấp và Trần Đức Anh</h2>
    <a id="about-case" href="#case-c2" class="state inline-flex h-8 items-center gap-1 rounded-sm bg-surface-container-high px-2 text-label-medium text-on-surface-variant">{icon("flag-outline-rounded", 16)}Báo cáo · Đồ Cũ Gò Vấp{icon("arrow-outward-rounded", 14)}</a>
  </header>
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_48px)]">
    <div class="mx-auto w-full max-w-[720px] space-y-4 px-6 py-4">{body}</div>
  </div>
  <div class="mx-auto w-full max-w-[720px] px-6 pb-4">{ask_box("Hỏi về đường nối này", icon("home-pin-outline-rounded", 14) + "Trần Đức Anh – Đồ Cũ Gò Vấp" + f'<a id="detach-edge" href="#detach" title="Bỏ" class="ml-0.5 text-on-surface-variant">{icon("close-rounded", 14)}</a>')}</div>
</section>"""
    return agent_page(thread_list() + center)


def answer_page(second, running_=False):
    return agent_page(thread_list() + chat(second=second, running=running_))


SCREENS = {
    "proposal-done": ("Agent · Đã khoá nhóm", lambda: proposal_chat(done=True)),
    "agent-running": ("Agent · Đang trả lời", lambda: answer_page(running(), True)),
    "agent-failed": ("Agent · Quá thời gian", lambda: answer_page(failed())),
    "agent-new": ("Agent · Cuộc mới, gắn báo cáo", new_chat),
    "proposal-review": ("Agent · Duyệt đề xuất trong chat", proposal_chat),
    "ring-graph": ("Agent · Đồ thị nhóm trong chat", graph_chat),
}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
