"""Báo cáo, direction B: the case as a file, decision first.

Writes ../mockups/reports-b-<name>.html, new drafts to compare with the
agent-chat direction (build_geist_agent.py, reports-open and reports-ask).

The case opens on the reported account's hero band with the reported
listing beside it, then the evidence as a 2 × 2 grid of cards that show
their proof (two photos with the match score, the price on the guide's
range, the quoted chat, the linked accounts), then the people who reported.
The agent's proposal is a decision bar pinned to the bottom: ticked rows,
the term, the reason the person sees, and the action. The agent's chat is
a drawer on the end side; opening it folds the queue to a strip of
initials.

  reports-b-open      a case waiting, the queue beside it
  reports-b-ask       the agent's drawer open: a question, then the term
                      changed to 30 ngày, the bar on v2
  reports-b-done      Đã xử lý: the case after Ẩn tin và khoá, with Hoàn tác
"""
# build_home first: common puts the app's tools on sys.path when it loads.
import build_home  # noqa: F401
import sys
from html import escape
from pathlib import Path

from build_geist import CSS, FONTS, avatar, bigger, chip, gi, kbd, member_initial, nav, picked, picked_bar, src
from build_reports import PHOTO, REASONS
from common import head

OUT = Path(__file__).resolve().parent.parent / "mockups"
SPARK = "material-symbols:auto-awesome-rounded"
SPARK_O = "material-symbols:auto-awesome-outline-rounded"

REASON_TONE = {"scam": "bg-error", "fake": "bg-tertiary", "banned": "bg-on-surface", "other": "bg-outline"}

# id, name, listing, reasons, proposal or None (agent still reading), age, overdue
OPEN = [
    ("c1", "Trần Đức Anh", "iPhone 14 Pro Max 256GB", {"scam": 4, "fake": 1}, "Ẩn tin, khoá 7 ngày", "2 giờ", False),
    ("c2", "Đồ Cũ Gò Vấp", "Nhóm 6 tài khoản", {"scam": 2}, "Khoá 6 tài khoản", "3 giờ", False),
    ("c3", "Mỹ Phẩm Xách Tay Hà", "Son Dior 999 fullbox", {"fake": 3}, "Ẩn tin", "5 giờ", False),
    ("c4", "Nguyễn Hữu Lộc", "Súng hơi PCP kèm ống ngắm", {"banned": 2}, None, "6 giờ", False),
    ("c5", "Lê Thị Hồng", "Tài khoản", {"scam": 1}, "Không vi phạm", "1 ngày", True),
    ("c6", "Phan Minh Trí", "MacBook Air M2 13 inch", {"other": 1}, "Không vi phạm", "2 ngày", True),
]
DONE = [
    ("d1", "Trần Đức Anh", "iPhone 14 Pro Max 256GB", {"scam": 4, "fake": 1}, "Đã khoá 30 ngày", "Lan · 10:05", False),
    ("d2", "Bếp Nhà Mây", "Nồi chiên không dầu 6L", {"other": 1}, "Không vi phạm", "Lan · 09:40", False),
    ("d3", "Hoàng Khải Shop", "AirPods Pro 2 rep 1:1", {"fake": 2}, "Đã ẩn tin", "Khoa · 09:12", False),
    ("d4", "Vũ Hải Đăng", "Honda Vision 2022", {"scam": 3}, "Đã khoá 7 ngày", "Lan · Hôm qua", False),
]


def reason_line(reasons, short=False):
    if short:
        reasons = dict(list(reasons.items())[:1])
    return '<span class="flex min-w-0 items-center gap-2">' + "".join(
        f'<span class="inline-flex items-center gap-1 whitespace-nowrap"><span class="h-1.5 w-1.5 rounded-full {REASON_TONE[k]}"></span>{REASONS[k][0]}{f" {n}" if n > 1 else ""}</span>'
        for k, n in reasons.items()) + "</span>"


def case_initial(name, n, size=36):
    return (f'<span class="relative inline-flex shrink-0">{avatar(name.strip()[0], size, key=name)}'
            f'<span class="tnum absolute -bottom-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10.5px] font-semibold ring-2 ring-surface-container-lowest '
            f'{"bg-error text-on-error" if n > 2 else "bg-surface-container-highest text-on-surface"}">{n}</span></span>')


def queue(rows, pick, done=False):
    items = []
    for cid, name, what, reasons, prop, age, overdue in rows:
        n = sum(reasons.values())
        if done:
            tag = f'<span class="shrink-0 whitespace-nowrap {"text-error" if "khoá" in prop else "text-on-surface-variant"}">{prop}</span>'
        elif prop:
            tag = f'<span class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap {"text-on-surface-variant" if prop == "Không vi phạm" else "text-error"}">{gi(SPARK_O, 13)}{prop}</span>'
        else:
            tag = '<span class="block h-1 w-12 shrink-0 overflow-hidden rounded-full bg-surface-container"><span class="block h-full w-1/3 animate-pulse rounded-full bg-primary"></span></span>'
        items.append(f"""<a id="case-{cid}" href="#case-{cid}" class="{picked(cid == pick)} flex gap-3 rounded-[10px] px-3 py-2.5">{picked_bar(cid == pick)}
  {case_initial(name, n)}
  <span class="min-w-0 flex-1 leading-tight">
    <span class="flex items-baseline gap-2"><span class="min-w-0 flex-1 truncate text-[13.5px] font-medium">{escape(name)}</span>
      <span class="tnum shrink-0 text-[11.5px] {"font-medium text-error" if overdue else "text-on-surface-variant"}">{age}</span></span>
    <span class="mt-0.5 flex items-center gap-2 text-[12.5px] text-on-surface-variant"><span class="min-w-0 flex-1 truncate">{escape(what)}</span></span>
    <span class="mt-1 flex items-center gap-2 text-[11.5px] text-on-surface-variant">{reason_line(reasons, short=True)}<span class="min-w-0 flex-1"></span>{tag}</span>
  </span></a>""")
    on = "rounded-[6px] bg-surface-container-lowest lift text-on-surface"
    filters = "".join(f'<a id="f-{k}" href="#f-{k}" class="hov inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full border hair px-2 text-[11.5px] text-on-surface-variant">'
                      f'<span class="h-1.5 w-1.5 rounded-full {REASON_TONE[k]}"></span>{REASONS[k][0]}<span class="tnum">{c}</span></a>'
                      for k, c in [("scam", 7), ("fake", 4), ("banned", 1)])
    return f"""<section class="flex w-[320px] shrink-0 flex-col border-r hair">
  <div class="space-y-2.5 p-3">
    <div class="flex h-8 rounded-md bg-surface-container p-0.5 text-[12.5px] font-medium text-on-surface-variant">
      <a id="tab-open" href="#tab-open" class="flex flex-1 items-center justify-center gap-1.5 px-2 {"" if done else on}">Chờ xử lý
        <span class="tnum flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[11px] text-on-error">12</span></a>
      <a id="tab-done" href="#tab-done" class="flex flex-1 items-center justify-center px-2 {on if done else ""}">Đã xử lý</a></div>
    <div class="flex gap-1">{filters}</div>
  </div>
  <p class="px-5 pb-1.5 text-[11.5px] font-medium text-on-surface-variant">{"Hôm nay" if done else "Lâu nhất ở cuối · quá 24 giờ màu đỏ"}</p>
  <div class="min-h-0 flex-1 space-y-0.5 overflow-hidden px-2">{"".join(items)}</div>
  <p class="flex items-center gap-1.5 border-t hair px-4 py-2.5 text-[12px] text-on-surface-variant">{kbd("j")}{kbd("k")}Vụ trước, sau</p>
</section>"""


def strip(rows, pick):
    """The queue folded to initials while the agent's drawer is open."""
    items = "".join(f'<a id="strip-{cid}" href="#case-{cid}" title="{escape(name)}" class="relative flex h-12 w-12 items-center justify-center rounded-[10px] {"bg-primary/[.06]" if cid == pick else "hov"}">'
                    f'{picked_bar(cid == pick).replace("inset-y-2.5", "inset-y-3")}{case_initial(name, sum(reasons.values()), 32)}</a>'
                    for cid, name, _, reasons, *_ in rows)
    return f"""<section class="flex w-[64px] shrink-0 flex-col items-center gap-1 border-r hair py-3">
  <a id="unfold" href="#unfold" title="Mở danh sách" class="hov mb-1 flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant">{gi("left-panel-open-outline-rounded", 18)}</a>{items}</section>"""


# --- the case file ---

def ev(ic, title, body, link, tone="bg-primary/10 text-primary"):
    return f"""<article class="flex flex-col rounded-[12px] border hair bg-surface-container-lowest p-3.5 lift">
  <div class="flex items-center gap-2"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] {tone}">{gi(ic, 16)}</span>
    <h3 class="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{title}</h3>
    <a id="open-{link}" href="#{link}" class="hov inline-flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[12px] font-medium text-primary">Mở{gi("north-east-rounded", 13)}</a></div>
  <div class="mt-3 flex-1">{body}</div></article>"""


def evidence():
    photos = f"""<div class="flex items-center gap-2">
  <figure class="relative flex-1"><img src="{PHOTO}" alt="" class="h-[76px] w-full rounded-[8px] object-cover"><figcaption class="absolute bottom-1 left-1 rounded-[5px] bg-on-surface/70 px-1.5 text-[11px] text-surface">Tin này · 14/11</figcaption></figure>
  <span class="tnum flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full bg-error-container text-[11px] font-semibold leading-none text-error">0,98</span>
  <figure class="relative flex-1"><img src="{PHOTO}" alt="" class="h-[76px] w-full rounded-[8px] object-cover"><figcaption class="absolute bottom-1 left-1 rounded-[5px] bg-on-surface/70 px-1.5 text-[11px] text-surface">Minh Khôi · 09/2026</figcaption></figure>
</div>"""
    price = """<div class="pt-1">
  <div class="flex items-baseline justify-between"><span class="tnum text-[20px] font-semibold text-tertiary">6.500.000 ₫</span><span class="tnum text-[12px] font-medium text-error">−64%</span></div>
  <div class="relative mt-3 h-2 rounded-full bg-surface-container">
    <span class="absolute inset-y-0 left-[62%] right-[22%] rounded-full bg-primary/30"></span>
    <span class="absolute -top-1 left-[16%] h-4 w-1 -translate-x-1/2 rounded-full bg-tertiary ring-2 ring-surface-container-lowest"></span></div>
  <div class="tnum mt-1.5 flex justify-between text-[11.5px] text-on-surface-variant"><span>0</span><span class="pl-16">17–19 tr · 214 tin đã bán</span><span>25 tr</span></div>
</div>"""
    chat = """<blockquote class="rounded-[8px] border-l-2 border-error/50 bg-surface-container-low px-3 py-2 text-[13px] leading-[19px]">“anh ck cọc 1tr qua MoMo em giữ máy, mai em gửi”</blockquote>
<p class="mt-2 text-[12px] text-on-surface-variant"><span class="tnum">5</span> cuộc chat · cảnh báo lừa đảo hiện <span class="tnum">5</span> lần</p>"""
    node = lambda ch, name, x, y, bad: (f'<span class="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style="left:{x}%;top:{y}%">'
                                        f'<span class="rounded-full {"ring-2 ring-error ring-offset-2 ring-offset-surface-container-lowest" if bad else ""}">{avatar(ch, 28, key=name)}</span>'
                                        f'<span class="mt-1 whitespace-nowrap text-[11px] {"text-error" if bad else ""}">{name}</span></span>')
    graph = f"""<div class="relative h-[86px] rounded-[8px] bg-[radial-gradient(circle,rgba(16,24,22,.08)_1px,transparent_1px)] [background-size:12px_12px]">
  <svg class="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100"><line x1="50" y1="34" x2="18" y2="40" stroke="var(--md-primary)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
    <line x1="50" y1="34" x2="82" y2="40" stroke="var(--md-primary)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>
  {node("T", "Đức Anh", 50, 34, False)}{node("N", "Tấn Phát", 18, 40, True)}{node("B", "Văn Khang", 82, 40, True)}
</div>
<p class="mt-2 flex items-center gap-1.5 text-[12px] text-on-surface-variant"><span class="h-px w-4 bg-primary"></span>Chung địa chỉ lấy hàng</p>"""
    return (ev("image-search-rounded", "3/5 ảnh trùng tin đã bán", photos, "similar", "bg-error-container text-error")
            + ev("sell-outline", "Thấp hơn giá tham khảo", price, "price-guide", "bg-tertiary-fixed text-on-tertiary-fixed-variant")
            + ev("forum-outline-rounded", "Đòi chuyển cọc ngoài app", chat, "chats", "bg-error-container text-error")
            + ev("hub-outline", "Liên quan 2 tài khoản bị khoá", graph, "graph"))


REPORTERS = [("Quang Vinh", "scam", "Bảo chuyển cọc mới giữ máy", "09:48"), ("Thảo My", "scam", "Không cho xem máy, đòi cọc", "09:10"),
             ("Hữu Phước", "fake", "Ảnh giống tin mình xem tháng trước", "08:44"), ("Gia Hân", "scam", "", "08:02"), ("Đình Toàn", "scam", "", "Hôm qua")]


def reporters():
    rows = "".join(f"""<li class="flex items-center gap-3 py-2">{avatar(n[0], 28, key=n)}
  <span class="min-w-0 flex-1 leading-tight"><span class="flex items-center gap-2"><span class="text-[13px] font-medium">{n}</span>
    <span class="inline-flex items-center gap-1 text-[12px] text-on-surface-variant"><span class="h-1.5 w-1.5 rounded-full {REASON_TONE[k]}"></span>{REASONS[k][0]}</span></span>
    {f'<span class="mt-0.5 block truncate text-[12.5px] text-on-surface-variant">“{escape(note)}”</span>' if note else ""}</span>
  <span class="tnum text-[11.5px] text-on-surface-variant">{w}</span></li>""" for n, k, note, w in REPORTERS)
    return f'<ul class="divide-y hair rounded-[12px] border hair bg-surface-container-lowest px-3.5">{rows}</ul>'


def hero(locked=False):
    listing = f"""<a id="listing" href="#listing" class="hov flex w-[300px] shrink-0 items-center gap-3 rounded-[12px] border hair bg-surface-container-lowest/90 p-2.5 lift">
  <img src="{PHOTO}" alt="" class="h-14 w-14 shrink-0 rounded-[8px] object-cover">
  <span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[13.5px] font-medium">iPhone 14 Pro Max 256GB tím</span>
    <span class="tnum mt-0.5 block text-[13px] text-tertiary">6.500.000 ₫</span>
    <span class="mt-1 block text-[11.5px] text-on-surface-variant">{"Đã ẩn · Lan 10:05" if locked else "Đang bán · 312 lượt xem · Quận 7"}</span></span></a>"""
    pills = "".join(f'<span class="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium {t}">{gi(REASONS[k][1], 15)}{REASONS[k][0]}<span class="tnum">{n}</span></span>'
                    for k, n, t in [("scam", 4, "bg-error-container text-error"), ("fake", 1, "bg-tertiary-fixed text-on-tertiary-fixed-variant")])
    status = (f'<span class="inline-flex h-6 items-center gap-1 rounded-full bg-error px-2 text-[12px] font-medium text-on-error">{gi("lock-outline", 13)}Khoá đến 17/12</span>' if locked
              else '<span class="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary/10 px-2 text-[12px] font-medium text-primary"><span class="h-1.5 w-1.5 rounded-full bg-primary"></span>Hoạt động</span>')
    return f"""<div class="{"band-error" if locked else "band"} relative px-8 pb-5 pt-6"><div class="dots pointer-events-none absolute inset-0"></div>
  <div class="relative flex items-start gap-4">
    {avatar("T", 60, status="suspended" if locked else "active", key="Trần Đức Anh")}
    <div class="min-w-0 flex-1 pt-0.5">
      <div class="flex items-center gap-2.5"><h2 class="tight text-[20px] font-semibold">Trần Đức Anh</h2>{status}</div>
      <p class="tnum mt-0.5 text-[12.5px] text-on-surface-variant">8e2f41a9</p>
      <div class="mt-2.5 flex flex-wrap gap-1.5">{pills}{chip("calendar-today-outline-rounded", "Tạo 13/11", "text-tertiary")}{chip("receipt-long-outline-rounded", "0 đơn")}</div>
    </div>
    {listing}
  </div>
</div>"""


def check(on=True):
    return (f'<span class="flex h-4 w-4 items-center justify-center rounded-[4px] {"bg-primary text-on-primary" if on else "border border-outline"}">{gi("check-rounded", 12) if on else ""}</span>')


def decision(term="7 ngày", v=1, changed=False, compact=False):
    tag = '<span class="rounded-[5px] bg-primary/10 px-1.5 text-[11px] font-medium text-primary">Đổi</span>' if changed else ""
    return f"""<div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-container-lowest from-60% to-transparent px-6 pb-5 pt-10">
  <section id="decision" class="pointer-events-auto overflow-hidden rounded-[14px] bg-surface-container-lowest shadow-[0_12px_32px_rgba(16,24,22,.14),0_0_0_1px_rgba(186,26,26,.22)]">
    <div class="flex items-center {"gap-3" if compact else "gap-4"} px-4 py-3">
      <span class="flex items-center gap-2 whitespace-nowrap text-error">{gi(SPARK, 16)}{"" if compact else '<span class="text-[13px] font-semibold text-on-surface">Đề xuất</span>'}
        <span class="tnum rounded-[5px] bg-surface-container px-1.5 text-[11px] text-on-surface-variant">v{v}</span></span>
      {"" if compact else '<span class="h-5 w-px bg-outline-variant"></span>'}
      <label class="flex items-center gap-2 whitespace-nowrap text-[13px]">{check()}Ẩn tin</label>
      <label class="flex items-center gap-2 whitespace-nowrap text-[13px]">{check()}Tạm khoá
        <a id="term" href="#term" class="inline-flex h-7 items-center gap-1 rounded-md border {"border-primary ring-[3px] ring-primary/10" if changed else "hair"} px-2 text-[12.5px] whitespace-nowrap">{term}{gi("expand-more-rounded", 15)}</a>{tag}</label>
      <span class="flex-1"></span>
      <a id="dismiss" href="#dismiss" title="Không vi phạm" class="hov inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border hair px-3 text-[13px] font-medium">{gi("check-rounded", 16)}Không vi phạm</a>
      <a id="apply" href="#apply" class="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-error px-3 text-[13px] font-medium text-on-error">{gi("block", 16)}{"Áp dụng" if compact else f"Ẩn tin và khoá {term}"}</a>
    </div>
    <div class="flex items-center gap-2 border-t hair bg-surface-container-low px-4 py-2 text-[12.5px]">
      <span class="text-on-surface-variant">{gi("visibility-outline", 15)}</span><span class="text-on-surface-variant">Đức Anh thấy:</span>
      <span class="min-w-0 flex-1 truncate">Đòi chuyển cọc ngoài app, ảnh lấy từ tin đã bán của người khác.</span>
      <a id="edit-reason" href="#edit-reason" class="hov rounded-md px-1.5 py-0.5 text-[12px] font-medium text-primary">Sửa</a>
      <span class="flex items-center gap-1 text-on-surface-variant">{kbd("Ctrl")}{kbd("↵")}</span>
    </div>
  </section>
</div>"""


def done_bar():
    rows = "".join(f'<span class="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]"><span class="text-primary">{gi("check-circle-outline-rounded", 16)}</span>{t}</span>'
                   for t in ["Đã ẩn tin", "Đã khoá 30 ngày"])
    return f"""<div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-container-lowest from-60% to-transparent px-6 pb-5 pt-10">
  <section id="done" class="pointer-events-auto flex items-center gap-4 rounded-[14px] border hair bg-surface-container-low px-4 py-3">
    {rows}<span class="flex-1"></span>
    <span class="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-on-surface-variant">{member_initial("L")}Lan · 10:05 · theo đề xuất v2</span>
    <a id="log" href="#log" class="hov inline-flex h-8 items-center whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium text-primary">Nhật ký</a>
    <a id="undo" href="#undo" class="hov inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border hair bg-surface-container-lowest px-3 text-[13px] font-medium">{gi("undo-rounded", 16)}Hoàn tác</a>
  </section>
</div>"""


def case(bar, locked=False, ask_open=False):
    agent_btn = (f'<a id="ask" href="#ask" class="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium '
                 f'{"border-primary bg-primary/[.06] text-primary" if ask_open else "hair hov"}"><span class="text-primary">{gi(SPARK_O, 16)}</span>Hỏi agent{kbd("A")}</a>')
    return f"""<section class="relative flex min-w-0 flex-1 flex-col">
  <header class="flex h-[52px] shrink-0 items-center gap-2 border-b hair px-5 text-[13px]">
    <a id="crumb" href="#reports" class="text-on-surface-variant">Báo cáo</a><span class="text-outline">{gi("chevron-right-rounded", 16)}</span>
    <p class="tight font-semibold">Trần Đức Anh</p><span class="text-[12px] text-on-surface-variant">· 5 báo cáo · từ hôm qua 21:15</span>
    <span class="flex-1"></span>{agent_btn}
    <a id="prev" href="#prev" class="hov flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant">{gi("keyboard-arrow-up-rounded", 18)}</a>
    <a id="next" href="#next" class="hov flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant">{gi("keyboard-arrow-down-rounded", 18)}</a>
  </header>
  <div class="relative min-h-0 flex-1 overflow-hidden">
    {hero(locked)}
    <div class="space-y-5 px-8 pb-40">
      <section><h3 class="mb-2.5 flex items-center gap-1.5 text-[12px] font-medium text-on-surface-variant"><span class="text-primary">{gi(SPARK_O, 14)}</span>Bằng chứng
        <span class="ml-1 flex gap-1">{src("image-search-rounded", "Ảnh")}{src("sell-outline", "Giá")}{src("forum-outline-rounded", "5 chat")}{src("person-outline", "Tài khoản")}</span></h3>
        <div class="grid grid-cols-2 gap-3">{evidence()}</div></section>
      <section><h3 class="mb-2.5 text-[12px] font-medium text-on-surface-variant">5 người báo</h3>{reporters()}</section>
    </div>
    {bar}
  </div>
</section>"""


def drawer():
    mine = lambda t: f'<div class="flex justify-end"><p class="max-w-[85%] rounded-[14px] rounded-br-[4px] bg-surface-container px-3 py-2 text-[13.5px] leading-[20px]">{escape(t)}</p></div>'
    return f"""<aside class="flex w-[400px] shrink-0 flex-col border-l hair bg-surface">
  <header class="flex h-[52px] shrink-0 items-center gap-2 border-b hair px-4"><span class="text-primary">{gi(SPARK, 18)}</span>
    <p class="flex-1 text-[13.5px] font-semibold">Agent</p>
    <a id="open-chat" href="#agent" title="Mở trong Agent" class="hov flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant">{gi("open-in-new-rounded", 16)}</a>
    <a id="close-drawer" href="#close" title="Đóng (esc)" class="hov flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant">{gi("close-rounded", 18)}</a></header>
  <div class="flex min-h-0 flex-1 flex-col justify-end gap-4 overflow-hidden px-4 py-4 text-[13.5px] leading-[20px]">
    {mine("Ảnh trùng có phải do Minh Khôi bán lại máy cho Đức Anh không?")}
    <div class="space-y-2"><div class="flex flex-wrap gap-1">{src("receipt-long-outline-rounded", "Đơn của Minh Khôi")}{src("image-search-rounded", "Ảnh giống nhau")}</div>
      <p>Không. Minh Khôi bán chiếc máy đó cho Thu Hà ngày 21/09, đơn đã giao. Giữa Minh Khôi và Đức Anh không có đơn hay cuộc chat nào.</p></div>
    {mine("Vậy khoá 30 ngày.")}
    <div class="space-y-2"><p>Đã đổi đề xuất: tạm khoá <b class="font-semibold">30 ngày</b>.</p>
      <a id="see-v2" href="#decision" class="hov inline-flex items-center gap-1.5 rounded-[8px] border hair px-2.5 py-1.5 text-[12.5px]">{gi("arrow-downward-rounded", 14)}Đề xuất v2 ở thanh dưới</a></div>
  </div>
  <div class="px-3 pb-3"><div class="rounded-[12px] border hair bg-surface-container-lowest lift">
    <p class="min-h-[44px] px-3 pt-2.5 text-[13.5px] text-on-surface-variant">Hỏi hoặc sửa đề xuất…</p>
    <div class="flex items-center gap-2 px-2 pb-2"><span class="inline-flex h-6 items-center gap-1 rounded-[6px] bg-surface-container px-1.5 text-[12px] text-on-surface-variant">{gi("flag-outline-rounded", 14)}Báo cáo · Trần Đức Anh</span>
      <span class="flex-1"></span><a id="ask-send" href="#send" class="flex h-8 w-8 items-center justify-center rounded-md bg-on-surface text-surface">{gi("arrow-upward-rounded", 18)}</a></div></div></div>
</aside>"""


def page(inner):
    return bigger(f"""{head("Báo cáo · Console", CSS).replace('<script src="https://cdn.tailwindcss.com">', FONTS + '\n<script src="https://cdn.tailwindcss.com">', 1)}<body>
<div class="flex h-[900px] w-[1440px] bg-surface-container text-on-surface">
  {nav("reports")}
  <div class="my-2 mr-2 flex min-w-0 flex-1 overflow-hidden rounded-[12px] bg-surface-container-lowest lift">{inner}</div>
</div>
</body>
</html>
""")


SCREENS = {
    "reports-b-open": ("Báo cáo · B · Hồ sơ vụ", lambda: page(queue(OPEN, "c1") + case(decision()))),
    "reports-b-ask": ("Báo cáo · B · Hỏi agent", lambda: page(strip(OPEN, "c1") + case(decision("30 ngày", 2, True, compact=True), ask_open=True) + drawer())),
    "reports-b-done": ("Báo cáo · B · Đã xử lý", lambda: page(queue(DONE, "d1", done=True) + case(done_bar(), locked=True))),
}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
