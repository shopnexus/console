"""A ticket opens on the customer's chat; the agent sits beside it in tabs.

Writes ../mockups/soft-ticket-<name>.html. Changes from soft-support-chat:

- the customer's chat is the middle pane, with the order, the shipment and
  the person as a strip above it; the reply box carries the agent's draft;
- the nav folds to a rail of icons on Support, so the queue keeps its rows;
- the agent is a 420 px panel of tabs. A ticket has no chat of its own:
  each tab is an ordinary chat that mentions the ticket (@), so it is in
  the history like any other; /new opens a tab with the ticket mentioned;
- the queue has no "Reply ready": a draft comes only from a tab the member asks;
- keys: Ctrl+[ and Ctrl+] move between tabs, Ctrl+K opens the switcher
  (1-9 jump), Ctrl+/ moves between the reply and the agent's box, N is a
  new tab outside a text box;
- / lists commands first (/new, /clear, /reply, /summary, /close), then
  skills; @ lists the ticket's own records first, then recent ones.

  soft-ticket-chat      the ticket, a draft in the reply box
  soft-ticket-slash     the / menu in the agent's box
  soft-ticket-mention   the @ menu in the agent's box
  soft-ticket-switch    Ctrl+K, the tab switcher with the keys
  soft-ticket-new       a new tab from /new: the ticket mentioned, starters
"""
import sys

import build_soft_admin  # noqa: F401  (sets the Be Vietnam Pro face first)
from build_soft_admin import tag
from build_soft_admin_rich import EXTRA
from build_soft_agent import ART, OUT, SPARK, avatar, gi, head_icon, kbd, shell, src
from build_soft_pages import support_queue
from common import ASSETS, LOGO

PHOTO = ASSETS + "/content-assets/reported-iphone-photo/iphone-listing-640.webp"

CSS = EXTRA + """
  .chip { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 8px 0 4px; border-radius: 7px;
    vertical-align: -6px; font-size: 13.5px; font-weight: 500; line-height: 1; white-space: nowrap;
    background: var(--md-surface-container-low); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-outline-variant) 60%, white); }
  .glyph { width: 17px; height: 17px; border-radius: 5px; display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--md-primary) 9%, white); color: var(--md-primary); }
  .float { box-shadow: 0 1px 2px rgba(16,24,22,.06), 0 16px 40px -10px rgba(16,24,22,.22); }
  .sel { background: color-mix(in srgb, var(--md-primary) 7%, white); }
  .dim { background: rgba(16,24,22,.18); }
  .caret { display: inline-block; width: 1.5px; height: 18px; background: var(--md-primary); vertical-align: -3px; margin-left: 1px; }
  .sugg { background: linear-gradient(180deg, color-mix(in srgb, var(--md-primary) 5%, white), white); }
"""

NAME = "Khánh Linh"


def chip(kind_ic, label, x=False):
    close = gi("close-rounded", 13, "text-on-surface-variant") if x else ""
    return f'<span class="chip"><span class="glyph">{gi(kind_ic, 13)}</span>{label}{close}</span>'


TICKET = chip("support-agent", f"Ticket · {NAME}")


# --- the nav as a rail; the queue keeps its rows ---

def rail():
    items = [("thread-new", "edit-square-outline", "New chat", ""), ("search", "search-rounded", "Search", ""), None,
             ("nav-support", "support-agent-outline", "Support", "7"), ("nav-reports", "flag-outline-rounded", "Reports", "12"),
             ("nav-accounts", "group-outline-rounded", "Accounts", ""), ("nav-tools", "apps-rounded", "Tools", "")]
    cells = "".join('<div class="my-1.5 h-px w-8 bg-outline-variant/40"></div>' if it is None else
                    f'<a id="{a}" href="#{a}" title="{t}" class="relative flex h-10 w-10 items-center justify-center rounded-[12px] {"bg-on-surface/[.06] text-primary" if a == "nav-support" else "hov text-on-surface-variant"}">{gi(ic, 20)}'
                    f'{f"<span class=\'tnum absolute -right-1 -top-1 rounded-full bg-primary px-1 text-[10px] font-medium leading-4 text-on-primary\'>{n}</span>" if n else ""}</a>'
                    for it in items for a, ic, t, n in [it or (None,) * 4])
    return f"""<nav class="side flex w-[64px] shrink-0 flex-col items-center gap-1 border-r hair py-3">
  <img src="{LOGO}" alt="ShopNexus" class="mb-2 h-8 w-8 rounded-[9px]">{cells}<span class="flex-1"></span>
  <a id="expand" href="#expand" title="Show the nav" class="hov flex h-10 w-10 items-center justify-center rounded-[12px] text-on-surface-variant">{gi("left-panel-open-outline-rounded", 19)}</a>
  <a id="me" href="#me" class="mt-1">{avatar("L", 32, "bg-primary text-on-primary")}</a></nav>"""


# --- the customer's chat in the middle ---

def facts():
    def cell(icon_html, top, sub, aid):
        return (f'<a id="{aid}" href="#{aid}" class="hov flex min-w-0 flex-1 items-center gap-2.5 rounded-[14px] border hair bg-white px-3 py-2">{icon_html}'
                f'<span class="min-w-0 leading-tight"><span class="block truncate text-[13.5px] font-medium">{top}</span><span class="tnum block truncate text-[12px] text-on-surface-variant">{sub}</span></span></a>')
    order = cell(f'<img src="{PHOTO}" alt="" class="h-9 w-9 shrink-0 rounded-[10px] object-cover">', "iPhone X 64GB", "3.800.000 ₫ · COD", "f-order")
    ship = cell(f'<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/[.08] text-primary">{gi("local-shipping-outline-rounded", 19)}</span>',
                "Delivered · signed “Hằng”", "GHTK · yest. 14:20", "f-ship")
    return f'<div class="flex gap-2 border-b hair px-6 py-3">{order}{ship}</div>'


def them(t, w, hover=False):
    tools = (f'<span class="float absolute left-[calc(100%+8px)] top-1 flex items-center gap-0.5 rounded-full border hair bg-white p-0.5">'
             f'<a id="ask-msg" href="#ask-msg" class="flex h-7 items-center gap-1 whitespace-nowrap rounded-full bg-primary/[.08] px-2.5 text-[12.5px] font-medium text-primary">{gi(SPARK, 14)}Ask agent</a>'
             f'<a id="quote-msg" href="#quote-msg" class="hov flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant">{gi("format-quote-outline-rounded", 15)}</a></span>') if hover else ""
    ring = " ring-2 ring-primary/20" if hover else ""
    return (f'<div class="flex max-w-[70%] gap-2.5">{avatar("K", 30, key=NAME)}<div class="relative">{tools}'
            f'<p class="rounded-[20px] rounded-tl-[6px] bg-surface-container-low px-4 py-2.5 text-[15px] leading-[23px]{ring}">{t}</p>'
            f'<p class="tnum mt-1 px-1 text-[12px] text-on-surface-variant">{w}</p></div></div>')


def us(t, w, auto=""):
    return (f'<div class="ml-auto max-w-[72%]"><p class="rounded-[20px] rounded-tr-[6px] bg-primary px-4 py-2.5 text-[15px] leading-[23px] text-on-primary">{t}</p>'
            f'<p class="tnum mt-1 px-1 text-right text-[12px] text-on-surface-variant">{auto}{w}</p></div>')


def reply_box(draft=True, focus=True):
    ring = "ring-focus border-primary/40" if focus else "hair soft"
    if draft:
        body = f"""<div class="sugg rounded-t-[20px] border-b hair px-4 pb-3 pt-3">
    <p class="flex items-center gap-1.5 text-[12.5px] font-medium text-primary">{gi(SPARK, 14)}From “Proof of delivery”<span class="flex-1"></span>
      <a id="sugg-tab" href="#sugg-tab" class="hov rounded-full px-2 py-0.5 font-normal text-on-surface-variant">Open chat</a></p>
    <p class="mt-1.5 text-[15px] leading-[24px]">GHTK ghi đã giao cho lễ tân toà B lúc 14:20, người ký tên Hằng. Bạn hỏi giúp lễ tân toà B nhé, nếu vẫn chưa thấy mình sẽ mở khiếu nại với GHTK cho bạn.<span class="caret"></span></p></div>"""
    else:
        body = f'<p class="min-h-[52px] px-4 pt-3.5 text-[15px] text-on-surface-variant/80">Reply to {NAME}…</p>'
    hint = (f'<span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{kbd("Ctrl ↵")}Send</span>'
            f'<span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{kbd("Esc")}Discard</span>') if draft else \
        f'<span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{kbd("Ctrl /")}Ask the agent</span>'
    return f"""<div class="rounded-[20px] border bg-white {ring}">{body}
  <div class="flex items-center gap-2 px-3 py-2.5">
    <a id="reply-attach" href="#reply-attach" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("attach-file-rounded", 18)}</a>
    <span class="flex items-center gap-1 text-[12.5px] text-on-surface-variant">{gi("visibility-outline", 15)}Shown as ShopNexus</span>
    <span class="flex-1"></span>{hint}
    <a id="reply-send" href="#reply-send" class="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-medium text-on-primary">Send{gi("arrow-upward-rounded", 17)}</a></div></div>"""


def center(draft=True, hover=False, reply_focus=True):
    head = f"""<header class="flex h-16 shrink-0 items-center gap-3 px-6">{avatar("K", 38, status="active", key=NAME)}
  <div class="min-w-0 flex-1 leading-tight"><p class="tight truncate text-[16px] font-semibold">{NAME}</p>
    <p class="text-[12.5px] text-on-surface-variant">Not received · waiting 1 h 29 min · 4 orders, 0 reports</p></div>
  <a id="resolve" href="#resolve" class="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-medium text-on-primary">{gi("check-rounded", 17)}Resolve</a>
  <a id="more" href="#more" class="hov flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{gi("more-horiz", 18)}</a></header>"""
    thread = "".join([
        '<p class="tnum text-center text-[12px] text-on-surface-variant">Today</p>',
        them("Chào shop, GHTK báo đã giao lúc 14:20 hôm qua nhưng mình chưa nhận được, nhà không ai ký nhận.", "08:12"),
        us("Chào bạn, bưu tá báo giao lúc 14:20 tại 12 Nguyễn Gia Trí, Bình Thạnh. Bạn kiểm tra giúp mình với bảo vệ toà nhà nhé.", "Lan · 09:05"),
        '<p class="flex items-center gap-3 text-[12px] font-medium text-primary"><span class="h-px flex-1 bg-primary/25"></span>New<span class="h-px flex-1 bg-primary/25"></span></p>',
        them("Mình hỏi bảo vệ rồi, không ai nhận giúp cả. Đơn này COD mình chưa trả tiền mà sao lại báo giao rồi?", "09:41", hover)])
    return f"""<section class="flex min-w-0 flex-1 flex-col">{head}{facts()}
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden"><div class="space-y-5 px-6 py-5">{thread}</div></div>
  <div class="px-6 pb-5">{reply_box(draft, reply_focus)}</div></section>"""


# --- the agent's panel: tabs, each one an ordinary chat ---

TABS = [("Proof of delivery", "done"), ("Seller's orders", "run"), ("COD at reception", "")]


def tabs(on=0, extra=None):
    items = TABS + ([extra] if extra else [])
    cells = []
    for i, (t, st) in enumerate(items):
        dot = ('<span class="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-primary/25 border-t-primary"></span>' if st == "run" else
               '<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>' if st == "done" and i != on else "")
        cls = "bg-white soft font-medium text-on-surface" if i == on else "hov text-on-surface-variant"
        cells.append(f'<a id="tab-{i}" href="#tab-{i}" class="flex h-9 {"shrink-0" if i == on else "min-w-0 flex-1 basis-0"} items-center gap-1.5 rounded-[12px] px-2.5 text-[13.5px] {cls}">'
                     f'<span class="tnum text-[11px] text-on-surface-variant/70">{i + 1}</span><span class="truncate">{t}</span>{dot}</a>')
    return f"""<div class="flex items-center gap-1 border-b hair px-2.5 py-2.5">
  <div class="flex min-w-0 flex-1 gap-1">{"".join(cells)}</div>
  <a id="tab-new" href="#tab-new" title="New chat (N)" class="hov flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-on-surface-variant">{gi("add-rounded", 19)}</a>
  <a id="tab-list" href="#tab-list" title="All chats (Ctrl K)" class="hov flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-on-surface-variant">{gi("keyboard-arrow-down-rounded", 19)}</a></div>"""


def mine(t):
    return f'<div class="flex justify-end"><p class="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-primary/[.08] px-3.5 py-2 text-[14.5px] leading-[23px]">{t}</p></div>'


def pod_answer():
    pod = f"""<div class="flex items-center gap-3 rounded-[14px] border hair bg-white p-2.5">
  <span class="flex h-11 w-11 items-center justify-center rounded-[11px] bg-tertiary-fixed text-on-tertiary-fixed-variant">{gi("signature", 22)}</span>
  <span class="min-w-0 flex-1 leading-tight"><span class="block text-[14px] font-semibold">Signed “Hằng” · reception B</span><span class="tnum mt-0.5 block text-[12px] text-on-surface-variant">GHTK S1.A1.17373471 · 14:21</span></span>
  <a id="pod" href="#pod" class="hov rounded-full px-2.5 py-1 text-[13px] font-medium text-primary">View</a></div>"""
    reply = f"""<section class="overflow-hidden rounded-[16px] border border-primary/25 bg-white">
  <div class="flex items-center gap-2 px-3.5 pt-3"><span class="flex h-7 w-7 items-center justify-center rounded-[9px] bg-primary/[.08] text-primary">{gi("reply-rounded", 16)}</span>
    <p class="flex-1 text-[14px] font-semibold">Reply to {NAME}</p>{tag("In the reply box", "bg-primary/[.08] text-primary")}</div>
  <p class="px-3.5 py-2.5 text-[14.5px] leading-[23px]">GHTK ghi đã giao cho lễ tân toà B lúc 14:20, người ký tên Hằng. Bạn hỏi giúp lễ tân toà B nhé…</p></section>"""
    return f"""{mine(f"Did GHTK really deliver? {TICKET}")}
  <div class="flex gap-2.5">{head_icon()}<div class="min-w-0 flex-1 space-y-2.5">
    <div class="flex flex-wrap gap-1.5">{src("local-shipping-outline-rounded", "GHTK events")}{src("receipt-long-outline-rounded", "Order")}</div>
    <p class="text-[14.5px] leading-[24px]">Yes. GHTK left it with reception in building B and has a signature. She asked the guard, not reception. COD was collected by reception.</p>{pod}</div></div>
  {mine("Draft a reply, offer a claim if reception doesn't have it.")}
  <div class="flex gap-2.5">{head_icon()}<div class="min-w-0 flex-1">{reply}</div></div>"""


def agent_box(text="", menu="", chips=TICKET, focus=False):
    ring = "ring-focus border-primary/40" if focus else "hair"
    shown = text or '<span class="text-on-surface-variant/80">Ask, / for commands, @ to mention</span>'
    return f"""<div class="relative">{menu}<div class="rounded-[18px] border bg-white {ring}">
  <div class="flex flex-wrap gap-1.5 px-3 pt-3">{chips}</div>
  <p class="min-h-[30px] px-3.5 pt-2 text-[14.5px]">{shown}</p>
  <div class="flex items-center gap-1.5 px-2.5 pb-2.5">
    <a id="ag-attach" href="#ag-attach" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("add-rounded", 19)}</a>
    <a id="ag-model" href="#ag-model" class="hov flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] text-on-surface-variant">{gi(SPARK, 14, "text-primary")}Support agent{gi("expand-more-rounded", 14)}</a>
    <span class="flex-1"></span>
    <a id="ag-send" href="#ag-send" class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">{gi("arrow-upward-rounded", 17)}</a></div></div></div>"""


def panel(body, box, on=0, extra=None):
    return f"""<aside class="flex w-[420px] shrink-0 flex-col border-l hair bg-[#FBFCFB]">{tabs(on, extra)}
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden"><div class="space-y-4 px-4 py-4">{body}</div></div>
  <div class="px-3 pb-2">{box}</div>
  <p class="flex items-center gap-1 whitespace-nowrap px-4 pb-3 text-[12px] text-on-surface-variant">{kbd("Ctrl [ ]")}Tabs<span class="mx-1.5 text-outline-variant">·</span>{kbd("Ctrl K")}Chats<span class="mx-1.5 text-outline-variant">·</span>{kbd("Ctrl /")}Reply box</p></aside>"""


def menu_shell(head, rows, foot=""):
    return f"""<div class="float absolute bottom-[calc(100%+8px)] left-0 right-0 z-20 overflow-hidden rounded-[18px] border hair bg-white">
  <div class="flex items-center gap-2 px-3.5 pb-1.5 pt-3 text-[12.5px] text-on-surface-variant">{head}<span class="flex-1"></span>{kbd("↑")}{kbd("↓")}{kbd("↵")}</div>
  <div class="px-1.5 pb-1.5">{rows}</div>{foot}</div>"""


def mrow(i, icon_html, title, sub, on=False, key=""):
    return (f'<a id="m-{i}" href="#m-{i}" class="{"sel" if on else "hov"} flex items-center gap-3 rounded-[12px] px-2.5 py-2">{icon_html}'
            f'<span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[14px]">{title}</span><span class="block truncate text-[12.5px] text-on-surface-variant">{sub}</span></span>'
            f'{f"<span class=\'flex gap-1\'>{key}</span>" if key else ""}</a>')


def sq(ic, tone="bg-primary/[.08] text-primary"):
    return f'<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] {tone}">{gi(ic, 17)}</span>'


def group(t):
    return f'<p class="px-2.5 pb-1 pt-2.5 text-[12px] font-medium text-on-surface-variant/80">{t}</p>'


def slash_menu():
    cmds = [("add-comment-outline-rounded", "<b class='font-semibold'>/new</b> <span class='text-on-surface-variant'>question</span>", f"New tab about this ticket, asks right away", "N"),
            ("restart-alt-rounded", "<b class='font-semibold'>/clear</b>", "Start this tab over; the old chat stays in history", ""),
            ("reply-rounded", "<b class='font-semibold'>/reply</b> <span class='text-on-surface-variant'>how</span>", f"Draft a reply to {NAME} into the reply box", ""),
            ("summarize-outline-rounded", "<b class='font-semibold'>/summary</b>", "The ticket so far, for a note or a handoff", ""),
            ("tab-close-outline-rounded", "<b class='font-semibold'>/close</b>", "Close this tab", "")]
    rows = group("Commands") + "".join(mrow(i, sq(ic), t, s, on=i == 0, key=kbd(k) if k else "") for i, (ic, t, s, k) in enumerate(cmds))
    skills = [("local-shipping-outline-rounded", "/carrier-report", "Disputes for GHTK, by hub"), ("storefront-outline-rounded", "/seller-profile", "Hoàng Nam's orders, refusals, reports")]
    rows += group("Skills · for this ticket") + "".join(mrow(9 + i, sq(ic, "bg-surface-container text-on-surface-variant"), f"<b class='font-semibold'>{t}</b>", s) for i, (ic, t, s) in enumerate(skills))
    return menu_shell(gi("bolt-outline-rounded", 15) + "Commands and skills", rows)


def mention_menu():
    here = [(f'{avatar("K", 32, key=NAME)}', f"{NAME}", "Customer · 4 orders", False),
            (f'<img src="{PHOTO}" alt="" class="h-8 w-8 shrink-0 rounded-[10px] object-cover">', "iPhone X 64GB", "Order · 3.800.000 ₫ · COD", False),
            (sq("local-shipping-outline-rounded"), "GHTK S1.A1.17373471", "Shipment · delivered yest. 14:20", False),
            (f'{avatar("H", 32, key="Hoàng Nam")}', "Hoàng Nam", "Seller · 4.8 ★ · 38 orders", True)]
    rows = group("In this ticket") + "".join(mrow(i, a, t, s, on) for i, (a, t, s, on) in enumerate(here))
    recent = [(sq("support-agent", "bg-surface-container text-on-surface-variant"), "Ticket · Trương Bảo Ngọc", "Not received · GHTK Cầu Giấy"),
              (sq("flag-outline-rounded", "bg-surface-container text-on-surface-variant"), "Report · Đồ Cũ Gò Vấp", "3 reports · scam")]
    rows += group("Recent") + "".join(mrow(5 + i, a, t, s) for i, (a, t, s) in enumerate(recent))
    return menu_shell(gi("alternate-email-rounded", 15) + "Mention", rows)


# --- screens ---

def frame(title, inner):
    return shell(title + " · Console", inner, side=rail(), page="support").replace("</style>", CSS + "</style>", 1)


def screen_chat():
    return frame("Support", support_queue(ready=False) + center(hover=True) + panel(pod_answer(), agent_box()))


def screen_slash():
    box = agent_box('<span class="font-medium text-primary">/</span><span class="caret"></span>', slash_menu(), focus=True)
    return frame("Support", support_queue(ready=False) + center(reply_focus=False) + panel(pod_answer(), box))


def screen_mention():
    box = agent_box(f'Other “not received” tickets for <span class="font-medium text-primary">@</span><span class="caret"></span>', mention_menu(), focus=True)
    return frame("Support", support_queue(ready=False) + center(reply_focus=False) + panel(pod_answer(), box))


def screen_switch():
    rows = [("Proof of delivery", f"Ticket · {NAME}", "10:02", "done", True),
            ("Seller's orders", f"Ticket · {NAME} · Hoàng Nam", "10:04", "run", False),
            ("COD at reception", f"Ticket · {NAME}", "09:58", "", False),
            ("GHTK Cầu Giấy hub delays", "Ticket · Trương Bảo Ngọc", "09:31", "", False),
            ("Đồ Cũ Gò Vấp and Trần Đức Anh", "Report · Đồ Cũ Gò Vấp", "Yesterday", "", False)]
    items = ""
    for i, (t, about, w, st, on) in enumerate(rows):
        if i == 3:
            items += group("Other chats")
        state = ('<span class="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-primary/25 border-t-primary"></span>' if st == "run" else "")
        num = kbd(str(i + 1)) if i < 3 else ""
        items += (f'<a id="sw-{i}" href="#sw-{i}" class="{"sel" if on else "hov"} flex items-center gap-3 rounded-[12px] px-3 py-2.5">{sq(SPARK if i < 3 else "chat-outline-rounded", "bg-primary/[.08] text-primary" if i < 3 else "bg-surface-container text-on-surface-variant")}'
                  f'<span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[14.5px] {"font-medium" if on else ""}">{t}</span><span class="block truncate text-[12.5px] text-on-surface-variant">{about}</span></span>'
                  f'{state}<span class="tnum text-[12px] text-on-surface-variant">{w}</span>{num}</a>')
    pal = f"""<div class="dim absolute inset-0 z-30 flex justify-center pt-[150px]"><div class="float h-fit w-[560px] overflow-hidden rounded-[22px] border hair bg-white">
  <div class="flex items-center gap-2.5 border-b hair px-4 py-3.5">{gi("search-rounded", 19, "text-on-surface-variant")}<p class="flex-1 text-[15px] text-on-surface-variant/80">Find a chat or type a command…<span class="caret"></span></p>{kbd("Esc")}</div>
  <div class="p-1.5">{group("Open on this ticket")}{items}</div>
  <div class="flex items-center gap-4 border-t hair bg-surface-container-low/60 px-4 py-2.5 text-[12px] text-on-surface-variant">
    <span class="flex items-center gap-1">{kbd("1")}–{kbd("3")}Jump</span><span class="flex items-center gap-1">{kbd("N")}New tab</span><span class="flex items-center gap-1">{kbd("Ctrl W")}Close tab</span>
    <span class="flex-1"></span><span class="flex items-center gap-1">{kbd("?")}All keys</span></div></div></div>"""
    inner = f'<div class="relative flex min-w-0 flex-1">{support_queue(ready=False)}{center(draft=True, reply_focus=False)}{panel(pod_answer(), agent_box())}{pal}</div>'
    return frame("Support", inner)


def screen_new():
    starters = [("signature", "Check the proof of delivery against her address"), ("reply-rounded", f"Draft a reply to {NAME}"),
                ("storefront-outline-rounded", "Hoàng Nam's other “not received” tickets"), ("payments-outline-rounded", "Who paid the COD at reception?")]
    rows = "".join(f'<a id="st-{i}" href="#st-{i}" class="hov flex items-center gap-2.5 rounded-[14px] border hair bg-white px-3 py-2.5 text-[14px]">{gi(ic, 17, "text-primary")}<span class="flex-1">{t}</span></a>'
                   for i, (ic, t) in enumerate(starters))
    body = f"""<div class="flex flex-col items-center pb-4 text-center"><img src="{ART}" alt="" class="h-[76px] w-[76px] object-contain">
    <p class="tight mt-2 text-[17px] font-semibold">New chat</p><p class="mt-1 flex items-center gap-1.5 text-[13px] text-on-surface-variant">About {TICKET}</p></div>
  <div class="space-y-1.5">{rows}</div>"""
    return frame("Support", support_queue(ready=False) + center(reply_focus=False) + panel(body, agent_box(chips=chip("support-agent", f"Ticket · {NAME}", x=True), focus=True), on=3, extra=("New chat", "")))


SCREENS = {"soft-ticket-chat": ("Ticket · Customer chat first", screen_chat), "soft-ticket-slash": ("Ticket · / commands", screen_slash),
           "soft-ticket-mention": ("Ticket · @ mention", screen_mention), "soft-ticket-switch": ("Ticket · Ctrl K switcher", screen_switch),
           "soft-ticket-new": ("Ticket · New tab from /new", screen_new)}

if __name__ == "__main__":
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
