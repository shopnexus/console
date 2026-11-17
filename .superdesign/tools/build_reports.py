"""Báo cáo: reports grouped by the reported account, with the agent's case file.

Writes ../mockups/reports-<state>.html. Users report a listing or an account
(reason banned, fake, scam or other; trust's `reports` table). The console
gathers the open reports about one account into a case. An agent reads the
case through read-only tools (the listing, photo-similar search, the price
guide, the reported chats' scam warnings, the account's history and
addresses) and leaves a proposal with its evidence. The member decides; the
agent takes no action. The screen shows the result only: no narration of what
the agent did, a quiet loader while a case is still being read.

  reports-open  a scam case: reused photos, price far under the guide,
                deposit asked in chat, a new account sharing a pickup address.
"""
import sys
from html import escape
from pathlib import Path

from build_home import drawer, topbar
from agent import answer, answer_tools, ask_box, checkbox, mine
from common import ASSETS, head, icon

OUT = Path(__file__).resolve().parent.parent / "mockups"
PHOTO = ASSETS + "/content-assets/reported-iphone-photo/iphone-listing-640.webp"

REASONS = {
    "scam": ("Lừa đảo", "gpp-maybe-outline-rounded"),
    "fake": ("Hàng giả", "verified-off-outline-rounded"),
    "banned": ("Hàng cấm", "block-rounded"),
    "other": ("Khác", "flag-outline-rounded"),
}

# id, account, account id, what (listing title or "Tài khoản"), reasons {kind: n}, proposal or None, tone, when
CASES = [
    ("c1", "Trần Đức Anh", "8e2f41a9", "iPhone 14 Pro Max 256GB", {"scam": 4, "fake": 1}, "Ẩn tin, khoá 7 ngày", "error", "09:48"),
    ("c2", "Đồ Cũ Gò Vấp", "41b7c0de", "Exciter 155 2023 chính chủ", {"scam": 2}, "Xem nhóm 6 tài khoản", "error", "09:31"),
    ("c3", "Mỹ Phẩm Xách Tay Hà", "d93a6e10", "Son Dior 999 fullbox", {"fake": 3}, "Ẩn tin", "error", "09:02"),
    ("c4", "Nguyễn Hữu Lộc", "07c5b2f4", "Súng hơi PCP kèm ống ngắm", {"banned": 2}, None, "", "08:57"),
    ("c5", "Lê Thị Hồng", "b62d9f37", "Tài khoản", {"scam": 1}, "Không vi phạm", "neutral", "08:20"),
    ("c6", "Phan Minh Trí", "f3a80c52", "MacBook Air M2 13 inch", {"other": 1}, "Không vi phạm", "neutral", "Hôm qua"),
]


def reason_chips(reasons, small=False):
    size = "text-label-small px-1.5" if small else "text-label-medium px-2 py-0.5"
    return "".join(
        f'<span class="inline-flex items-center gap-1 rounded-sm bg-surface-container-high {size} text-on-surface-variant">'
        f'{REASONS[k][0]}{f" · {n}" if n > 1 else ""}</span>'
        for k, n in reasons.items())


def queue(active):
    seg = "".join(
        f'<a id="status-{k}" href="#status-{k}" class="state flex h-10 flex-1 items-center justify-center gap-2 text-label-large '
        f'{"bg-secondary-container text-on-secondary-container" if k == "open" else "text-on-surface"} '
        f'{"rounded-l-full" if i == 0 else "rounded-r-full border-l border-outline"}">'
        f'{icon("check", 18) if k == "open" else ""}{label}</a>'
        for i, (k, label) in enumerate([("open", "Chờ xử lý · 12"), ("done", "Đã xử lý")]))
    chips = "".join(
        f'<a id="reason-{k}" href="#reason-{k}" class="state inline-flex h-8 items-center gap-1 rounded-sm px-3 text-label-large '
        f'{"bg-secondary-container text-on-secondary-container" if k == "all" else "border border-outline-variant text-on-surface-variant"}">'
        f'{icon("check", 18) if k == "all" else ""}{label}</a>'
        for k, label in [("all", "Tất cả"), ("scam", "Lừa đảo"), ("fake", "Hàng giả"), ("banned", "Hàng cấm")])
    rows = []
    for cid, name, aid, what, reasons, proposal, tone, when in CASES:
        on = cid == active
        total = sum(reasons.values())
        if proposal:
            color = "text-error" if tone == "error" else "text-on-surface-variant"
            prop = f'<span class="inline-flex items-center gap-1 text-label-medium {color}">{icon("auto-awesome-outline-rounded", 14)}{proposal}</span>'
        else:
            prop = '<span class="inline-block h-1 w-16 overflow-hidden rounded-full bg-surface-container-highest"><span class="block h-full w-1/3 animate-pulse rounded-full bg-primary"></span></span>'
        rows.append(f"""<a id="case-{cid}" href="#case-{cid}" class="state flex gap-3 rounded-lg px-3 py-3 {"bg-secondary-container" if on else ""}">
  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-title-small text-on-surface-variant">{total}</span>
  <span class="min-w-0 flex-1">
    <span class="flex items-baseline gap-2"><span class="min-w-0 flex-1 truncate text-title-small">{escape(name)}</span><span class="shrink-0 text-body-small text-on-surface-variant">{when}</span></span>
    <span class="block truncate text-body-medium">{escape(what)}</span>
    <span class="mt-1 flex flex-wrap items-center gap-1">{reason_chips(reasons, small=True)}</span>
    <span class="mt-1.5 block">{prop}</span>
  </span>
</a>""")
    return f"""<section class="flex w-[360px] shrink-0 flex-col rounded-xl bg-surface-container-lowest">
  <div class="space-y-3 p-4 pb-2">
    <div class="flex rounded-full border border-outline">{seg}</div>
    <div class="flex flex-wrap gap-2">{chips}</div>
  </div>
  <div class="min-h-0 flex-1 space-y-1 overflow-hidden px-2 pb-2">{"".join(rows)}</div>
  <p class="flex items-center gap-2 border-t border-outline-variant px-4 py-3 text-body-small text-on-surface-variant">
    <kbd class="rounded-xs border border-outline-variant px-1.5 font-mono text-label-small">j</kbd><kbd class="rounded-xs border border-outline-variant px-1.5 font-mono text-label-small">k</kbd>Báo cáo trước, sau</p>
</section>"""


def proposal():
    """The agent's proposal for one case, the same ticked checklist as a ring's; a chat message changes it."""
    row = lambda aid, title, extra="": (f'<li class="flex h-11 items-center gap-3"><a id="{aid}" href="#{aid}">{checkbox(True)}</a>'
                                       f'<span class="min-w-0 flex-1 truncate text-body-medium">{title}</span>{extra}</li>')
    term = f'<span class="inline-flex h-7 items-center gap-0.5 whitespace-nowrap rounded-xs border border-outline pl-2 text-body-small">7 ngày{icon("arrow-drop-down-rounded", 18)}</span>'
    return f"""<section id="proposal" class="overflow-hidden rounded-lg border border-error/30 bg-surface-container-lowest">
  <div class="flex items-center gap-2 bg-error-container/60 px-4 py-2.5">
    <span class="text-error">{icon("auto-awesome-rounded", 18)}</span><p class="min-w-0 flex-1 text-title-small">Ẩn tin, tạm khoá 7 ngày</p></div>
  <ul class="divide-y divide-outline-variant px-4">
    {row("pick-hide", 'Ẩn tin <span class="text-on-surface-variant">iPhone 14 Pro Max 256GB</span>')}
    {row("pick-suspend", 'Tạm khoá <span class="text-on-surface-variant">Trần Đức Anh</span>', term)}
  </ul>
  <div class="flex items-center gap-2 border-t border-outline-variant px-4 py-3">
    <a id="apply" href="#apply" class="state inline-flex h-10 items-center gap-2 rounded-full bg-error px-5 text-label-large text-on-error">{icon("block-rounded", 18)}Ẩn tin và khoá</a>
    <a id="dismiss" href="#dismiss" class="state inline-flex h-10 items-center gap-2 rounded-full border border-outline px-5 text-label-large text-primary">{icon("check-rounded", 18)}Không vi phạm</a>
  </div>
</section>"""


def evidence(ic, title, body, link):
    return f"""<article class="flex gap-3 rounded-lg bg-surface-container-low px-3 py-2.5">
  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">{icon(ic, 20)}</span>
  <div class="min-w-0 flex-1">
    <div class="flex items-start gap-2"><h3 class="min-w-0 flex-1 text-title-small">{title}</h3>
      <a id="open-{link}" href="#{link}" class="state -my-1 flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-label-medium text-primary">Mở{icon("arrow-outward-rounded", 14)}</a></div>
    {body}
  </div>
</article>"""


def thumb(caption, sub):
    return f"""<figure class="flex min-w-0 flex-1 items-center gap-2"><img src="{PHOTO}" alt="" class="h-16 w-16 shrink-0 rounded-md object-cover">
<figcaption class="min-w-0"><span class="block truncate text-body-small">{caption}</span><span class="block truncate text-body-small text-on-surface-variant">{sub}</span></figcaption></figure>"""


def evidences():
    photos = evidence("image-search-rounded", "3/5 ảnh trùng tin khác", f"""
    <div class="mt-2 flex items-center gap-2">
      {thumb("Tin này", "14/11")}
      {thumb("Minh Khôi", "Đã bán 09/2026")}
    </div>
    <p class="mt-1 text-body-small text-on-surface-variant">Độ giống <span class="font-mono">0,98</span></p>""", "similar")
    price = evidence("sell-outline-rounded", "Thấp hơn giá tham khảo 64%", """
    <p class="mt-1 text-body-medium"><span class="text-tertiary">6.500.000 ₫</span>
    <span class="text-on-surface-variant"> · tham khảo 17–19 triệu, 214 tin đã bán</span></p>""", "price-guide")
    chats = evidence("forum-outline-rounded", "Đòi chuyển cọc ở 5 cuộc chat", """
    <blockquote class="mt-1 rounded-md border-l-2 border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-medium">“anh ck cọc 1tr qua MoMo em giữ máy, mai em gửi”</blockquote>
    <p class="mt-1 text-body-small text-on-surface-variant">Cảnh báo lừa đảo đã hiện 5 lần</p>""", "chats")
    account = evidence("person-alert-outline-rounded", "Chung địa chỉ với 2 tài khoản bị khoá", """
    <p class="mt-1 text-body-medium">Tạo 3 ngày trước · 0 đơn</p>""", "account")
    return photos + price + chats + account


def fact(label, value, mono=False):
    return (f'<div class="py-1"><p class="text-body-small text-on-surface-variant">{label}</p>'
            f'<p class="text-body-medium {"font-mono" if mono else ""}">{value}</p></div>')


def side_card(title, body):
    return f'<section class="rounded-lg bg-surface-container-low p-4"><h3 class="mb-2 text-title-small text-on-surface-variant">{title}</h3>{body}</section>'


def aside():
    listing = side_card("Tin bị báo", f"""<a id="listing" href="#listing" class="state -mx-1 flex gap-3 rounded-md p-1">
  <img src="{PHOTO}" alt="" class="h-14 w-14 shrink-0 rounded-md object-cover">
  <span class="min-w-0"><span class="block text-title-small leading-5">iPhone 14 Pro Max 256GB tím</span>
  <span class="block text-body-medium text-tertiary">6.500.000 ₫</span></span></a>
{fact("Trạng thái", '<span class="rounded-sm bg-secondary-container px-2 py-0.5 text-label-medium text-on-secondary-container">Đang bán</span>')}
{fact("Đăng", "14/11 · Quận 7")}""")
    seller = side_card("Người đăng", f"""<a id="person" href="#account-8e2f41a9" class="state -mx-2 mb-1 flex items-center gap-3 rounded-md px-2 py-1.5">
  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-title-small text-on-surface-variant">T</span>
  <span class="min-w-0 flex-1"><span class="block truncate text-title-small">Trần Đức Anh</span><span class="block font-mono text-body-small text-on-surface-variant">8e2f41a9</span></span>
  {icon("chevron-right-rounded", 20, "text-outline")}
</a>
{fact("Tham gia", "13/11/2026")}
{fact("Tin", "3 đang bán · 0 đã bán")}""")
    reporters = [
        ("Quang Vinh", "scam", "Bảo chuyển cọc mới giữ máy", "09:48"),
        ("Thảo My", "scam", "Không cho xem máy, đòi cọc", "09:10"),
        ("Hữu Phước", "fake", "Ảnh giống tin mình xem tháng trước", "08:44"),
        ("Gia Hân", "scam", "", "08:02"),
        ("Đình Toàn", "scam", "", "Hôm qua"),
    ]
    rows = "".join(f"""<li class="py-1.5"><div class="flex items-baseline gap-2"><span class="min-w-0 flex-1 truncate text-body-medium">{n}</span>
  <span class="text-body-small text-on-surface-variant">{w}</span></div>
  <p class="text-body-small text-on-surface-variant">{REASONS[k][0]}{f" · {escape(note)}" if note else ""}</p></li>"""
                   for n, k, note, w in reporters)
    return side_card("5 người báo", f'<ul class="-my-1 divide-y divide-outline-variant">{rows}</ul>') + listing + seller


def case_read(replaced=False):
    """replaced: a later message holds the next version, so this one folds to a line."""
    """The agent's first message in a case: what it read, the evidence, then its proposal."""
    return answer([("image-search-rounded", "Ảnh giống nhau"), ("sell-outline-rounded", "Giá tham khảo"),
                   ("forum-outline-rounded", "5 cuộc chat"), ("person-outline-rounded", "Tài khoản")],
                  '<p>Nhiều khả năng lừa đảo: ảnh lấy từ tin đã bán, giá thấp 64%, đòi cọc trong chat.</p>'
                  f'<div class="space-y-2">{evidences()}</div>' + (OLD if replaced else proposal()), answer_tools(aid="case"))



OLD = f"""<a id="proposal-v1" href="#proposal-v1" class="state flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-on-surface-variant">
  {icon("auto-awesome-outline-rounded", 18)}<span class="min-w-0 flex-1 truncate text-body-medium line-through decoration-1">Ẩn tin, tạm khoá 7 ngày</span>
  <span class="text-label-small">Bản 1 · đã thay</span>{icon("expand-more-rounded", 18)}</a>"""


FOLLOW_UPS = [
    ("Ảnh trùng có phải do Minh Khôi bán lại máy cho Đức Anh không?",
     [("receipt-long-outline-rounded", "Đơn của Minh Khôi"), ("image-search-rounded", "Ảnh giống nhau")],
     "<p>Không. Minh Khôi bán chiếc máy đó cho <b class=\"font-medium\">Thu Hà</b> ngày 21/09, đơn đã giao. Giữa Minh Khôi và Đức Anh không có đơn hay cuộc chat nào.</p>"
     "<p>Ảnh của Minh Khôi đăng 09/2026, gần 2 tháng trước khi tài khoản Đức Anh được tạo.</p>"),
    ("Vậy khoá 30 ngày thay vì 7 ngày.",
     [],
     "<p>Đã sửa: tạm khoá 30 ngày.</p>"),
]


def panel(follow=False):
    """The case is a chat with the agent: its case read first, the member's questions after."""
    msgs = case_read(replaced=follow)
    if follow:
        q1, s1, a1 = FOLLOW_UPS[0]
        q2, _, a2 = FOLLOW_UPS[1]
        card = proposal().replace("Ẩn tin, tạm khoá 7 ngày", "Ẩn tin, tạm khoá 30 ngày").replace(">7 ngày<", ">30 ngày<").replace(
            'id="proposal"', 'id="proposal-v2"').replace(
            '<p class="min-w-0 flex-1 text-title-small">Ẩn tin, tạm khoá 30 ngày</p>',
            '<p class="min-w-0 flex-1 text-title-small">Ẩn tin, tạm khoá 30 ngày</p><span class="rounded-full bg-surface-container-lowest px-2 py-0.5 text-label-small text-on-surface-variant">Bản 2</span>')
        msgs += mine(q1) + answer(s1, a1, answer_tools(aid="f1")) + mine(q2) + answer([], a2 + card, answer_tools(aid="f2"))
    return f"""<section class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-container-lowest">
  <header class="flex items-center gap-2.5 border-b border-outline-variant px-3 py-2">
    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error-container text-error">{icon("flag-rounded", 18)}</span>
    <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><h2 class="truncate text-title-small">Trần Đức Anh</h2>{reason_chips({"scam": 4, "fake": 1}, small=True)}</div>
    <p class="text-body-small text-on-surface-variant">iPhone 14 Pro Max 256GB · từ hôm qua 21:15</p></div>
    <a id="close-panel" href="#close-panel" title="Đóng (Esc)" class="state flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{icon("close-rounded", 20)}</a>
  </header>
  <div class="flex min-h-0 flex-1">
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_48px)]">
        <div class="mx-auto w-full max-w-[680px] space-y-4 px-5 py-3">{msgs}</div>
      </div>
      <div class="mx-auto w-full max-w-[680px] px-5 pb-4">{ask_box("Hỏi hoặc sửa đề xuất", icon("flag-outline-rounded", 14) + "Báo cáo · Trần Đức Anh")}</div>
    </div>
    <aside class="w-[272px] shrink-0 space-y-3 overflow-hidden border-l border-outline-variant p-3">{aside()}</aside>
  </div>
</section>"""


def page(follow=False):
    return f"""{head("Báo cáo · Console")}<body>
<div class="flex h-[900px] w-[1440px] bg-surface text-on-surface">
  {drawer("moderator", active="reports", open_tickets=7, open_reports=12, agent=True, rail=True)}
  <div class="flex min-w-0 flex-1 flex-col">
    {topbar("moderator", "Báo cáo")}
    <main class="flex min-h-0 flex-1 gap-2 px-5 pb-5">
      {queue("c1")}
      {panel(follow)}
    </main>
  </div>
</div>
</body>
</html>
"""


SCREENS = {"reports-open": ("Báo cáo · Đề xuất của agent", page),
           "reports-ask": ("Báo cáo · Hỏi agent về báo cáo", lambda: page(follow=True))}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
