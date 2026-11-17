"""The console agent's screens in the Geist look of build_geist.py.

Writes ../mockups/<name>.html for each screen in SCREENS, the same names as
the M3 builders (agent.py, agent_more.py, build_reports.py) so each lands on
its draft as a new version. The data and the rules stay theirs: the agent
reads and proposes in blocks, the member ticks or chats for the next version,
a done block says who and when and offers Hoàn tác.
"""
# agent_more first: it imports build_home before common puts the app's tools on sys.path.
from agent_more import EDGES, JOIN, KIND, NODES, RING, graph_svg  # noqa: F401
import sys
from html import escape
from pathlib import Path

from agent import ACCOUNTS, THREADS
from build_geist import CSS, FONTS, avatar, dot, gi, kbd, mine, nav, pill, src, tools
from build_reports import CASES, PHOTO, REASONS
from common import head

OUT = Path(__file__).resolve().parent.parent / "mockups"
SPARK = "material-symbols:auto-awesome-rounded"
SPARK_O = "material-symbols:auto-awesome-outline-rounded"


def shell(title, active, inner):
    return f"""{head(title + " · Console", CSS).replace('<script src="https://cdn.tailwindcss.com">', FONTS + '\n<script src="https://cdn.tailwindcss.com">', 1)}<body>
<div class="flex h-[900px] w-[1440px] bg-surface-container text-on-surface">
  {nav(active)}
  <div class="my-2 mr-2 flex min-w-0 flex-1 overflow-hidden rounded-[12px] bg-surface-container-lowest lift">{inner}</div>
</div>
</body>
</html>
"""


def check(state, size=16):
    """True ticked, False empty, None ticked and locked."""
    if state is None:
        return f'<span class="flex shrink-0 items-center justify-center rounded-[4px] bg-outline-variant text-surface" style="width:{size}px;height:{size}px">{gi("check-rounded", size - 4)}</span>'
    if state:
        return f'<span class="flex shrink-0 items-center justify-center rounded-[4px] bg-primary text-on-primary" style="width:{size}px;height:{size}px">{gi("check-rounded", size - 4)}</span>'
    return f'<span class="block shrink-0 rounded-[4px] border-[1.5px] border-outline" style="width:{size}px;height:{size}px"></span>'


def answer(srcs, body, aid):
    chips = "".join(src(ic, t) for ic, t in srcs)
    return f"""<div class="space-y-2">
  {f'<div class="flex flex-wrap gap-1">{chips}</div>' if chips else ""}
  <div class="space-y-2 text-[14px] leading-[21px]">{body}</div>
  {tools(aid)}
</div>"""


def folded(text, v, ic="material-symbols-light:checklist-rounded"):
    return (f'<a id="v{v}-{abs(len(text))}" href="#v{v}" class="hov flex items-center gap-2 rounded-[10px] border hair px-3 py-2 text-on-surface-variant">'
            f'{gi(ic, 16)}<span class="min-w-0 flex-1 truncate text-[13px] line-through decoration-1">{escape(text)}</span>'
            f'<span class="shrink-0 text-[11.5px]">Bản {v} · đã thay</span>{gi("expand-more-rounded", 16)}</a>')


def card(head_html, body, foot, tone="error"):
    ring = "ring-1 ring-error/25" if tone == "error" else ""
    return f"""<section class="overflow-hidden rounded-[12px] border hair bg-surface-container-lowest lift {ring}">
  <div class="flex items-center gap-2 border-b hair px-3.5 py-2.5">{head_html}</div>
  {body}
  <div class="flex items-center gap-2 border-t hair bg-surface-container-low px-3 py-2">{foot}</div>
</section>"""


def version(v):
    return f'<span class="mono rounded-[5px] bg-surface-container px-1.5 text-[11px] text-on-surface-variant">v{v}</span>'


def btn(text, ic="", kind="primary", aid="b"):
    cls = {"primary": "bg-primary text-on-primary", "danger": "bg-error text-on-error",
           "plain": "hov border hair bg-surface-container-lowest text-on-surface", "ghost": "hov text-primary"}[kind]
    return f'<a id="{aid}" href="#{aid}" class="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium {cls}">{gi(ic, 16) if ic else ""}{text}</a>'


def select(text, on=False):
    return (f'<span class="inline-flex h-7 items-center gap-0.5 whitespace-nowrap rounded-md border {"border-primary bg-primary/5 text-primary" if on else "hair"} pl-2 pr-1 text-[12.5px]">'
            f'{text}{gi("expand-more-rounded", 16)}</span>')


def join_chip(j):
    return f'<span class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] bg-surface-container px-1.5 py-0.5 text-[11.5px] text-on-surface-variant">{gi(j.replace("-rounded", ""), 13)}{JOIN[j]}</span>'


def ask_box(placeholder, ctx="", running=False):
    chip = (f'<span class="inline-flex h-6 items-center gap-1 rounded-[6px] bg-surface-container px-1.5 text-[12px] text-on-surface-variant">{ctx}</span>' if ctx else "")
    send = (f'<a id="ask-stop" href="#ask-stop" title="Dừng (Esc)" class="flex h-8 w-8 items-center justify-center rounded-md bg-on-surface text-surface">{gi("stop-rounded", 18)}</a>' if running
            else f'<a id="ask-send" href="#ask-send" title="Gửi (Enter)" class="flex h-8 w-8 items-center justify-center rounded-md bg-on-surface text-surface">{gi("arrow-upward-rounded", 18)}</a>')
    return f"""<div class="rounded-[12px] border hair bg-surface-container-lowest lift">
  <p class="min-h-[52px] px-3.5 pt-3 text-[14px] text-on-surface-variant">{placeholder}</p>
  <div class="flex items-center gap-2 px-2 pb-2">
    <a id="attach" href="#attach" title="Gắn ticket, báo cáo, tài khoản" class="hov flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant">{gi("add-rounded", 18)}</a>
    {chip}<span class="flex-1"></span>{send}</div>
</div>"""


def chat_col(title, meta, body, box, link=""):
    return f"""<section class="flex min-w-0 flex-1 flex-col">
  <header class="flex h-[52px] shrink-0 items-center gap-3 border-b hair px-5">
    <span class="text-primary">{gi(SPARK, 18)}</span>
    <div class="min-w-0 flex-1 leading-tight"><p class="tight truncate text-[14px] font-semibold">{title}</p>{f'<p class="text-[12px] text-on-surface-variant">{meta}</p>' if meta else ""}</div>
    {link}
    <a id="more" href="#more" class="hov flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant">{gi("more-horiz", 18)}</a>
  </header>
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_40px)]">
    <div class="mx-auto w-full max-w-[680px] space-y-4 px-6 py-5">{body}</div></div>
  <div class="mx-auto w-full max-w-[680px] px-6 pb-5">{box}</div>
</section>"""


CASE_LINK = (f'<a id="about-case" href="#case-c2" class="hov inline-flex h-7 items-center gap-1 rounded-md border hair px-2 text-[12px] text-on-surface-variant">'
             f'{gi("flag-outline-rounded", 14)}Báo cáo · Đồ Cũ Gò Vấp{gi("north-east-rounded", 13)}</a>')


# --- the Agent page ---

def threads(active="g1"):
    groups = []
    for day, rows in THREADS:
        items = "".join(
            f'<a id="thread-{tid}" href="#thread-{tid}" class="{"bg-surface-container" if tid == active else "hov"} flex h-8 items-center gap-2 rounded-md px-2 text-[13px]">'
            f'<span class="text-on-surface-variant">{gi(ic.replace("-rounded", "") if "outline" in ic else ic, 16)}</span><span class="min-w-0 flex-1 truncate">{escape(t)}</span></a>'
            for tid, t, ic, _ in rows)
        groups.append(f'<p class="px-2 pb-1 pt-4 text-[11.5px] font-medium text-on-surface-variant">{day}</p>{items}')
    return f"""<section class="flex w-[264px] shrink-0 flex-col border-r hair p-2">
  <a id="thread-new" href="#thread-new" class="flex h-8 items-center gap-2 rounded-md bg-on-surface px-3 text-[13px] font-medium text-surface {"ring-4 ring-on-surface/10" if active is None else ""}">{gi("edit-square-outline", 16)}Cuộc mới<span class="ml-auto">{kbd("N")}</span></a>
  <div class="mt-2 flex h-8 items-center gap-2 rounded-md border hair px-2 text-[13px] text-on-surface-variant">{gi("search-rounded", 16)}Tìm cuộc trò chuyện</div>
  <div class="min-h-0 flex-1 overflow-hidden">{"".join(groups)}</div>
</section>"""


def ring_table():
    rows = "".join(f"""<tr class="border-t hair">
  <td class="py-2 pr-3"><a id="acc-{aid}" href="#account-{aid}" class="block text-[13.5px] font-medium text-primary">{n}</a><span class="mono text-[11.5px] text-on-surface-variant">{aid}</span></td>
  <td class="py-2 pr-3">{pill(st, "bg-error" if st.startswith("Đã") else "bg-primary")}</td>
  <td class="py-2 text-[13px]">{why}</td></tr>""" for n, aid, st, why in ACCOUNTS)
    return f"""<table class="w-full overflow-hidden rounded-[10px] border hair text-left"><thead class="bg-surface-container-low"><tr class="text-[12px] text-on-surface-variant">
  <th class="py-1.5 pl-3 font-medium">Tài khoản</th><th class="py-1.5 font-medium">Trạng thái</th><th class="py-1.5 font-medium">Nối qua</th></tr></thead>
  <tbody class="[&_td:first-child]:pl-3">{rows}</tbody></table>"""


def first_answer():
    return answer([("flag-outline-rounded", "2 ca báo cáo"), ("home-pin-outline", "Địa chỉ lấy hàng"), ("image-search-rounded", "Ảnh giống nhau"), ("forum-outline-rounded", "Tin nhắn có cảnh báo")],
                  "<p>Có. Trần Đức Anh nối với nhóm qua 3 tài khoản; 2 trong số đó đã bị khoá hôm 12/11.</p>" + ring_table()
                  + "<p>Cả nhóm giờ là 7 tài khoản đang hoạt động, 14 tin đang bán.</p>", "b1")


def transit_answer():
    orders = "".join(f"""<li class="flex items-center gap-3 py-2"><span class="flex h-8 w-8 items-center justify-center rounded-[8px] bg-surface-container text-on-surface-variant">{gi(ic, 18)}</span>
  <span class="min-w-0 flex-1 leading-tight"><span class="block text-[13.5px]">{t} · <span class="tnum text-tertiary">{p}</span></span><span class="block text-[12px] text-on-surface-variant">{d}</span></span>
  <a id="order-{i}" href="#order-{i}" class="hov rounded-md px-2 py-1 text-[13px] font-medium text-primary">Mở</a></li>"""
                     for i, (ic, t, p, d) in enumerate([("two-wheeler", "Exciter 155 2023", "31.500.000 ₫", "Hữu Phước · GHN đang giao"),
                                                        ("smartphone-outline", "iPhone 13 128GB", "5.900.000 ₫", "Gia Hân · GHTK đã lấy hàng")]))
    prop = card(f'<span class="text-error">{gi(SPARK, 16)}</span><p class="min-w-0 flex-1 text-[13.5px] font-semibold">Khoá 7 tài khoản, ẩn 14 tin, nhắn 2 người mua</p>{version(1)}',
                '<p class="px-3.5 py-2.5 text-[13px] text-on-surface-variant">7 tài khoản · 14 tin · 2 người mua đang có đơn</p>',
                btn("Duyệt từng tài khoản", "checklist-rounded", "danger", "review-proposal"))
    return answer([("receipt-long-outline-rounded", "Đơn đang giao")],
                  f'<p>2 đơn đang giao, cả hai đều COD đồng kiểm nên người mua chưa trả tiền:</p><ul class="divide-y hair rounded-[10px] border hair px-3">{orders}</ul>{prop}', "b2")


def agent_page(body, box, title="Nhóm Đồ Cũ Gò Vấp và Trần Đức Anh", active="g1", link=CASE_LINK):
    return shell("Agent", "agent", threads(active) + chat_col(title, "", body, box, link))


def chat_done():
    body = mine("6 tài khoản nhóm Đồ Cũ Gò Vấp có liên quan Trần Đức Anh không?") + first_answer() + mine("Trong nhóm có ai đang có đơn đang giao không?") + transit_answer()
    return agent_page(body, ask_box("Hỏi tiếp"))


def running():
    chips = (src("receipt-long-outline-rounded", "Đơn đang giao")
             + f'<span class="inline-flex h-6 items-center gap-1 rounded-[6px] border border-primary/40 bg-primary/5 px-1.5 text-[12px] text-primary"><span class="animate-spin">{gi("progress-activity", 14)}</span>Vận đơn GHN</span>')
    wait = f"""<div class="space-y-2"><div class="flex flex-wrap gap-1">{chips}</div>
  <span class="block h-2.5 w-[86%] animate-pulse rounded-full bg-surface-container"></span><span class="block h-2.5 w-[58%] animate-pulse rounded-full bg-surface-container"></span></div>"""
    body = mine("6 tài khoản nhóm Đồ Cũ Gò Vấp có liên quan Trần Đức Anh không?") + first_answer() + mine("Trong nhóm có ai đang có đơn đang giao không?") + wait
    return agent_page(body, ask_box("Hỏi tiếp", running=True))


def failed():
    fail = f"""<div class="space-y-2"><div class="flex flex-wrap gap-1">{src("receipt-long-outline-rounded", "Đơn đang giao")}{src("local-shipping-outline-rounded", "Vận đơn GHN")}</div>
  <div class="flex items-center gap-2 rounded-[10px] border hair px-3 py-2"><span class="text-error">{gi("timer-off-outline-rounded", 18)}</span>
    <p class="min-w-0 flex-1 text-[13.5px]">Quá 60 giây, chưa có câu trả lời.</p>{btn("Hỏi lại", "refresh-rounded", "ghost", "retry-turn")}{btn("Chạy nền, báo khi xong", "notifications-outline-rounded", "plain", "run-background")}</div></div>"""
    body = mine("6 tài khoản nhóm Đồ Cũ Gò Vấp có liên quan Trần Đức Anh không?") + first_answer() + mine("Trong nhóm có ai đang có đơn đang giao không?") + fail
    return agent_page(body, ask_box("Hỏi tiếp"))


def new_chat():
    tabs = "".join(f'<a id="attach-{k}" href="#attach-{k}" class="flex flex-1 items-center justify-center rounded-[6px] px-2 {"bg-surface-container-lowest lift" if k == "reports" else "text-on-surface-variant"}">{t}</a>'
                   for k, t in [("tickets", "Ticket"), ("reports", "Báo cáo"), ("accounts", "Tài khoản")])
    recent = "".join(f'<a id="attach-row-{i}" href="#attach-row-{i}" class="{"bg-surface-container" if on else "hov"} flex items-center gap-2.5 rounded-md px-2 py-1.5">{gi("flag-outline-rounded", 16, "text-on-surface-variant")}'
                     f'<span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[13px]">{t}</span><span class="block text-[11.5px] text-on-surface-variant">{sub}</span></span>{gi("check-rounded", 16, "text-primary") if on else ""}</a>'
                     for i, (t, sub, on) in enumerate([("Đồ Cũ Gò Vấp", "Lừa đảo · 2 · 09:31", True), ("Trần Đức Anh", "Lừa đảo · 4, Hàng giả · 09:48", False),
                                                       ("Mỹ Phẩm Xách Tay Hà", "Hàng giả · 3 · 09:02", False), ("Nguyễn Hữu Lộc", "Hàng cấm · 2 · 08:57", False)]))
    menu = f"""<div class="absolute left-0 top-full z-10 mt-2 w-[340px] rounded-[12px] border hair bg-surface-container-lowest p-1.5 shadow-[0_12px_32px_rgba(16,24,22,.14)]">
  <div class="flex h-8 rounded-md bg-surface-container p-0.5 text-[12.5px] font-medium">{tabs}</div>
  <div class="mx-0.5 mt-1.5 flex h-8 items-center gap-2 rounded-md border hair px-2 text-[13px] text-on-surface-variant">{gi("search-rounded", 16)}Tên hoặc id</div>
  <p class="px-2 pb-1 pt-2.5 text-[11.5px] font-medium text-on-surface-variant">Mở gần đây</p>{recent}</div>"""
    box = ask_box("Hỏi agent…", gi("flag-outline-rounded", 14) + "Báo cáo · Đồ Cũ Gò Vấp" + gi("close-rounded", 13))
    col = f"""<section class="flex min-w-0 flex-1 flex-col"><div class="flex flex-1 justify-center px-6 pt-[240px]">
  <div class="relative h-fit w-full max-w-[680px]">{box}{menu}</div></div></section>"""
    return shell("Agent", "agent", threads(None) + col)


def ring_rows(done=False, edited=True):
    rows = []
    for name, aid, status, joins, listings, transit, keep, _ in RING:
        if status == "suspended":
            continue
        change = ""
        if edited and name == "Phạm Hùng":
            keep, change = False, "drop"
        elif edited and name == "Lâm Quốc Bảo":
            change = "30d"
        term = "30 ngày" if change == "30d" else "Vô thời hạn"
        tag = ('<span class="rounded-[5px] bg-primary/10 px-1.5 text-[11px] font-medium text-primary">Đổi</span>' if change == "30d"
               else '<span class="rounded-[5px] bg-surface-container px-1.5 text-[11px] text-on-surface-variant">Bỏ</span>' if change == "drop" else "")
        if done:
            mark = gi("check-rounded", 16, "text-primary") if keep else gi("remove-rounded", 16, "text-outline")
            rows.append(f'<li class="flex h-9 items-center gap-3 px-3.5 {"text-on-surface-variant" if not keep else ""}">{mark}<a id="done-{aid}" href="#account-{aid}" class="min-w-0 flex-1 truncate text-[13.5px]">{escape(name)}</a>'
                        f'<span class="text-[12.5px] text-on-surface-variant">{("Khoá " + term.lower()) if keep else "Giữ nguyên"}</span></li>')
            continue
        rows.append(f"""<li class="flex h-10 items-center gap-3 px-3.5 {"opacity-60" if keep is False else ""}">
  <a id="pick-{aid}" href="#pick-{aid}">{check(keep)}</a>
  <span class="flex w-40 shrink-0 items-center gap-1.5"><a id="acc-{aid}" href="#account-{aid}" class="truncate text-[13.5px] font-medium {"line-through decoration-1" if keep is False else ""}">{escape(name)}</a>{tag}</span>
  <span class="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">{"".join(join_chip(j) for j in joins)}</span>
  <span class="tnum shrink-0 text-[12px] text-on-surface-variant">{listings} tin{f" · {transit} giao" if transit else ""}</span>
  <span class="flex w-28 shrink-0 justify-end">{select(term, change == "30d") if keep else '<span class="text-[12px] text-on-surface-variant">Giữ nguyên</span>'}</span>
</li>""")
    return "".join(rows)


def ring_proposal(done=False):
    if done:
        return card(f'<span class="text-primary">{gi("check-circle-outline-rounded", 16)}</span><p class="min-w-0 flex-1 text-[13.5px] font-semibold">Đã khoá 6 tài khoản, ẩn 13 tin, nhắn 2 người mua</p>'
                    f'<span class="text-[12px] text-on-surface-variant">Lan · 10:05</span>',
                    f'<ul class="divide-y hair">{ring_rows(done=True)}</ul>',
                    '<p class="min-w-0 flex-1 truncate text-[12px] text-on-surface-variant">Lý do: Nhóm tài khoản đòi chuyển cọc, chung địa chỉ lấy hàng và ảnh</p>'
                    + btn("Nhật ký", "", "ghost", "audit") + btn("Hoàn tác", "undo-rounded", "plain", "undo"), tone="plain")
    extra = f"""<div class="flex items-center gap-5 border-t hair px-3.5 py-2 text-[13px]">
  <span class="flex items-center gap-2"><a id="pick-hide" href="#pick-hide">{check(True)}</a>Ẩn 13 tin</span>
  <span class="flex items-center gap-2"><a id="pick-notify" href="#pick-notify">{check(True)}</a>Nhắn 2 người mua</span>
  <a id="see-message" href="#see-message" class="text-[13px] font-medium text-primary">Xem tin nhắn</a></div>
<div class="border-t hair px-3.5 py-2.5"><label class="text-[12px] text-on-surface-variant">Lý do khoá · người bị khoá thấy</label>
  <div class="mt-1 rounded-md border hair px-2.5 py-1.5 text-[13.5px]">Nhóm tài khoản đòi chuyển cọc, chung địa chỉ lấy hàng và ảnh</div></div>"""
    return card(f'<span class="text-error">{gi(SPARK, 16)}</span><p class="min-w-0 flex-1 text-[13.5px] font-semibold">Khoá 6 tài khoản, ẩn 13 tin, nhắn 2 người mua</p>{version(2)}',
                f'<ul class="divide-y hair">{ring_rows()}</ul>{extra}',
                btn("Khoá 6 tài khoản", "block", "danger", "confirm") + btn("Bỏ đề xuất", "", "ghost", "discard")
                + f'<span class="flex-1"></span><span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{kbd("Ctrl")}{kbd("↵")}</span>')


def proposal_page(done=False):
    body = (folded("Khoá 7 tài khoản, ẩn 14 tin, nhắn 2 người mua", 1)
            + mine("Bỏ Phạm Hùng, chỉ chung 1 ảnh mà 12 đơn giao tốt. Lâm Quốc Bảo khoá 30 ngày thôi.")
            + answer([("receipt-long-outline-rounded", "Đơn của Phạm Hùng")], "<p>Đã sửa: bỏ Phạm Hùng, Lâm Quốc Bảo khoá 30 ngày.</p>" + ring_proposal(done), "p2"))
    return agent_page(body, ask_box("Hỏi tiếp" if done else "Sửa đề xuất hoặc hỏi tiếp…"))


def graph_page():
    legend = "".join(
        f'<span class="inline-flex items-center gap-1.5 text-[12px] text-on-surface-variant"><svg width="22" height="6"><line x1="2" y1="3" x2="20" y2="3" stroke="{c}" stroke-width="2.5" stroke-dasharray="{d}" stroke-linecap="round"/></svg>{t}</span>'
        for c, d, t, _ in KIND.values())
    block = f"""<section id="ring-graph" class="overflow-hidden rounded-[12px] border hair bg-surface-container-lowest lift">
  <div class="flex items-center gap-3 border-b hair px-3.5 py-2">{legend}<span class="flex-1"></span>
    <a id="graph-full" href="#graph-full" title="Toàn màn hình" class="hov flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant">{gi("open-in-full-rounded", 16)}</a></div>
  <div class="h-[320px] bg-[radial-gradient(circle,rgba(16,24,22,.07)_1px,transparent_1px)] [background-size:16px_16px] px-2">{graph_svg(ys=0.66, box="40 30 680 330")}</div>
  <div class="flex items-start gap-3 border-t hair bg-surface-container-low px-3.5 py-2.5">
    <span class="mt-0.5 text-primary">{gi("home-pin-outline", 18)}</span>
    <div class="min-w-0 flex-1 leading-snug"><p class="text-[13.5px] font-medium">Chung địa chỉ lấy hàng · Trần Đức Anh, Đồ Cũ Gò Vấp</p>
      <p class="text-[13px]">45 Lê Đức Thọ, Phường 6, Gò Vấp</p><p class="text-[12px] text-on-surface-variant">Đồ Cũ Gò Vấp dùng từ 08/2026, Trần Đức Anh từ 13/11</p></div>
    <a id="edge-close" href="#edge-close" class="hov flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant">{gi("close-rounded", 16)}</a></div>
</section>"""
    v1 = card(f'<span class="text-error">{gi(SPARK, 16)}</span><p class="min-w-0 flex-1 text-[13.5px] font-semibold">Khoá 7 tài khoản, ẩn 14 tin, nhắn 2 người mua</p>{version(1)}',
              "", btn("Duyệt từng tài khoản", "checklist-rounded", "danger", "review"))
    body = mine("Nhóm Đồ Cũ Gò Vấp gồm những ai, nối với nhau thế nào?") + answer(
        [("home-pin-outline", "Địa chỉ lấy hàng"), ("image-search-rounded", "Ảnh giống nhau"), ("forum-outline-rounded", "Tin nhắn có cảnh báo")],
        "<p>9 tài khoản, 2 đã khoá hôm 12/11. Trần Đức Anh nối vào nhóm qua địa chỉ lấy hàng của Đồ Cũ Gò Vấp và Thanh Xe Cũ.</p>" + block + v1, "g1")
    return agent_page(body, ask_box("Hỏi về đường nối này…", gi("home-pin-outline", 14) + "Trần Đức Anh – Đồ Cũ Gò Vấp" + gi("close-rounded", 13)))


# --- Báo cáo ---

def report_queue(active="c1"):
    rows = []
    for cid, name, aid, what, reasons, proposal, tone, when in CASES:
        chips = " · ".join(f'{REASONS[k][0]}{f" {n}" if n > 1 else ""}' for k, n in reasons.items())
        prop = (f'<span class="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap {"text-error" if tone == "error" else "text-on-surface-variant"}">{gi(SPARK_O, 13)}{proposal}</span>'
                if proposal else '<span class="ml-auto block h-1 w-14 overflow-hidden rounded-full bg-surface-container"><span class="block h-full w-1/3 animate-pulse rounded-full bg-primary"></span></span>')
        rows.append(f"""<a id="case-{cid}" href="#case-{cid}" class="{"bg-surface-container" if cid == active else "hov"} flex gap-3 rounded-[8px] px-3 py-2.5">
  <span class="tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[13px] font-semibold text-on-surface-variant">{sum(reasons.values())}</span>
  <span class="min-w-0 flex-1">
    <span class="flex items-center gap-2"><span class="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{escape(name)}</span><span class="tnum text-[12px] text-on-surface-variant">{when}</span></span>
    <span class="mt-0.5 block truncate text-[12.5px]">{escape(what)}</span>
    <span class="mt-1 flex items-center gap-1.5 text-[11.5px] text-on-surface-variant">{dot("bg-error" if "scam" in reasons else "bg-tertiary")}<span class="min-w-0 truncate">{chips}</span>{prop}</span>
  </span></a>""")
    return f"""<section class="flex w-[300px] shrink-0 flex-col border-r hair">
  <div class="flex items-center gap-2 p-3"><div class="flex h-8 flex-1 rounded-md bg-surface-container p-0.5 text-[12.5px] font-medium">
    <a id="tab-open" href="#tab-open" class="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] bg-surface-container-lowest px-2 lift">Chờ xử lý <span class="tnum text-on-surface-variant">12</span></a>
    <a id="tab-done" href="#tab-done" class="flex flex-1 items-center justify-center px-2 text-on-surface-variant">Đã xử lý</a></div>
    <a id="filter" href="#filter" class="hov flex h-8 items-center gap-1 rounded-md border hair px-2 text-[12.5px] text-on-surface-variant">{gi("filter-list-rounded", 16)}Lý do</a></div>
  <div class="min-h-0 flex-1 space-y-0.5 overflow-hidden px-2">{"".join(rows)}</div>
  <p class="flex items-center gap-1.5 border-t hair px-4 py-2.5 text-[12px] text-on-surface-variant">{kbd("j")}{kbd("k")}Báo cáo trước, sau</p>
</section>"""


def evidence(ic, title, body, link):
    return f"""<article class="flex gap-3 rounded-[10px] border hair px-3 py-2.5">
  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-surface-container text-on-surface-variant">{gi(ic, 18)}</span>
  <div class="min-w-0 flex-1"><div class="flex items-start gap-2"><h3 class="min-w-0 flex-1 text-[13.5px] font-medium">{title}</h3>
    <a id="open-{link}" href="#{link}" class="hov -my-0.5 inline-flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[12px] font-medium text-primary">Mở{gi("north-east-rounded", 13)}</a></div>{body}</div>
</article>"""


def evidences():
    thumb = lambda cap, sub: (f'<figure class="flex min-w-0 flex-1 items-center gap-2"><img src="{PHOTO}" alt="" class="h-14 w-14 shrink-0 rounded-[8px] object-cover">'
                              f'<figcaption class="min-w-0 leading-tight"><span class="block text-[12.5px]">{cap}</span><span class="block text-[11.5px] text-on-surface-variant">{sub}</span></figcaption></figure>')
    return "".join([
        evidence("image-search-rounded", "3/5 ảnh trùng tin khác",
                 f'<div class="mt-1.5 flex items-center gap-2">{thumb("Tin này", "14/11")}{thumb("Minh Khôi", "Đã bán 09/2026")}'
                 f'<span class="mono shrink-0 rounded-[5px] bg-surface-container px-1.5 text-[11px] text-on-surface-variant">0,98</span></div>', "similar"),
        evidence("sell-outline", "Thấp hơn giá tham khảo 64%",
                 '<p class="mt-0.5 text-[13px]"><span class="tnum text-tertiary">6.500.000 ₫</span><span class="text-on-surface-variant"> · tham khảo 17–19 triệu, 214 tin đã bán</span></p>', "price-guide"),
        evidence("forum-outline-rounded", "Đòi chuyển cọc ở 5 cuộc chat",
                 '<blockquote class="mt-1 border-l-2 border-outline-variant pl-2.5 text-[13px]">“anh ck cọc 1tr qua MoMo em giữ máy, mai em gửi”</blockquote>'
                 '<p class="mt-0.5 text-[12px] text-on-surface-variant">Cảnh báo lừa đảo đã hiện 5 lần</p>', "chats"),
        evidence("person-alert-outline", "Chung địa chỉ với 2 tài khoản bị khoá", '<p class="mt-0.5 text-[13px]">Tạo 3 ngày trước · 0 đơn</p>', "account"),
    ])


def case_proposal(term, v):
    li = lambda aid, t, extra="": f'<li class="flex h-10 items-center gap-3 px-3.5"><a id="{aid}" href="#{aid}">{check(True)}</a><span class="min-w-0 flex-1 truncate text-[13.5px]">{t}</span>{extra}</li>'
    return card(f'<span class="text-error">{gi(SPARK, 16)}</span><p class="min-w-0 flex-1 text-[13.5px] font-semibold">Ẩn tin, tạm khoá {term}</p>{version(v)}',
                f'<ul class="divide-y hair">{li("pick-hide", "Ẩn tin <span class=text-on-surface-variant>iPhone 14 Pro Max 256GB</span>")}'
                f'{li("pick-suspend", "Tạm khoá <span class=text-on-surface-variant>Trần Đức Anh</span>", select(term, v > 1))}</ul>',
                btn("Ẩn tin và khoá", "block", "danger", "apply") + btn("Không vi phạm", "check-rounded", "plain", "dismiss"))


def report_info():
    reporters = [("Quang Vinh", "scam", "Bảo chuyển cọc mới giữ máy", "09:48"), ("Thảo My", "scam", "Không cho xem máy, đòi cọc", "09:10"),
                 ("Hữu Phước", "fake", "Ảnh giống tin mình xem tháng trước", "08:44"), ("Gia Hân", "scam", "", "08:02"), ("Đình Toàn", "scam", "", "Hôm qua")]
    rs = "".join(f'<li class="py-1.5"><div class="flex items-baseline gap-2"><span class="min-w-0 flex-1 truncate text-[13px] font-medium">{n}</span><span class="tnum text-[11.5px] text-on-surface-variant">{w}</span></div>'
                 f'<p class="text-[12px] text-on-surface-variant">{REASONS[k][0]}{f" · {escape(note)}" if note else ""}</p></li>' for n, k, note, w in reporters)
    sec = lambda t, b: f'<section class="border-b hair px-4 py-3.5"><h3 class="mb-2 text-[12px] font-medium text-on-surface-variant">{t}</h3>{b}</section>'
    row = lambda l, v: f'<div class="flex items-baseline justify-between gap-4 py-1 text-[13px]"><span class="text-on-surface-variant">{l}</span><span class="text-right">{v}</span></div>'
    seller = f"""<section class="border-b hair px-4 py-4"><div class="flex items-center gap-3">{avatar("T", 40)}
  <div class="min-w-0 flex-1 leading-tight"><p class="tight text-[14px] font-semibold">Trần Đức Anh</p><p class="mono text-[11.5px] text-on-surface-variant">8e2f41a9</p></div>
  <a id="open-account" href="#account" class="hov flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant">{gi("open-in-new-rounded", 16)}</a></div>
  <div class="mt-3 flex flex-wrap gap-1.5">{pill("Hoạt động")}{pill("Tạo 13/11", "bg-tertiary")}{pill("SĐT mới", "bg-outline")}</div>
  <div class="mt-3 grid grid-cols-3 gap-1.5">{"".join(f'<div class="rounded-[8px] border hair px-2.5 py-2"><p class="tnum text-[16px] font-semibold leading-5">{n}</p><p class="text-[11.5px] text-on-surface-variant">{l}</p></div>' for n, l in [("3", "tin bán"), ("0", "đơn"), ("5", "bị báo cáo")])}</div></section>"""
    listing = sec("Tin bị báo", f"""<div class="flex items-center gap-3 rounded-[10px] border hair p-2"><img src="{PHOTO}" alt="" class="h-12 w-12 rounded-[8px] object-cover">
  <div class="min-w-0 flex-1 leading-tight"><p class="truncate text-[13.5px] font-medium">iPhone 14 Pro Max 256GB tím</p><p class="tnum text-[13px] text-tertiary">6.500.000 ₫</p></div></div>
  <div class="mt-2">{row("Trạng thái", pill("Đang bán"))}{row("Đăng", "14/11 · Quận 7")}{row("Lượt xem", "312 · 9 cuộc chat")}</div>""")
    return seller + sec("5 người báo", f'<ul class="-my-1 divide-y hair">{rs}</ul>') + listing


def report_page(follow=False):
    case = answer([("image-search-rounded", "Ảnh giống nhau"), ("sell-outline", "Giá tham khảo"), ("forum-outline-rounded", "5 cuộc chat"), ("person-outline", "Tài khoản")],
                  f'<p>Nhiều khả năng lừa đảo: ảnh lấy từ tin đã bán, giá thấp 64%, đòi cọc trong chat.</p><div class="space-y-2">{evidences()}</div>'
                  + (folded("Ẩn tin, tạm khoá 7 ngày", 1) if follow else case_proposal("7 ngày", 1)), "case")
    body = case
    if follow:
        body += (mine("Ảnh trùng có phải do Minh Khôi bán lại máy cho Đức Anh không?")
                 + answer([("receipt-long-outline-rounded", "Đơn của Minh Khôi"), ("image-search-rounded", "Ảnh giống nhau")],
                          '<p>Không. Minh Khôi bán chiếc máy đó cho <b class="font-medium">Thu Hà</b> ngày 21/09, đơn đã giao. Giữa Minh Khôi và Đức Anh không có đơn hay cuộc chat nào.</p>'
                          '<p>Ảnh của Minh Khôi đăng 09/2026, gần 2 tháng trước khi tài khoản Đức Anh được tạo.</p>', "f1")
                 + mine("Vậy khoá 30 ngày thay vì 7 ngày.")
                 + answer([], "<p>Đã sửa: tạm khoá 30 ngày.</p>" + case_proposal("30 ngày", 2), "f2"))
    reasons = '<span class="ml-2 inline-flex gap-1 align-middle">' + "".join(f'<span class="rounded-[5px] bg-surface-container px-1.5 text-[11px] font-medium text-on-surface-variant">{t}</span>' for t in ["Lừa đảo · 4", "Hàng giả"]) + "</span>"
    col = chat_col("Trần Đức Anh" + reasons, "iPhone 14 Pro Max 256GB · từ hôm qua 21:15", body,
                   ask_box("Hỏi hoặc sửa đề xuất…", gi("flag-outline-rounded", 14) + "Báo cáo · Trần Đức Anh"))
    return shell("Báo cáo", "reports", report_queue() + col + f'<aside class="w-[300px] shrink-0 overflow-hidden border-l hair bg-surface">{report_info()}</aside>')


SCREENS = {
    "reports-open": lambda: report_page(),
    "reports-ask": lambda: report_page(follow=True),
    "agent-chat": chat_done,
    "agent-running": running,
    "agent-failed": failed,
    "agent-new": new_chat,
    "proposal-review": lambda: proposal_page(),
    "proposal-done": lambda: proposal_page(done=True),
    "ring-graph": graph_page,
}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name]())
        print("wrote", name)
