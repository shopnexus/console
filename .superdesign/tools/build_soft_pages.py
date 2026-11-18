"""The rest of the console in the soft look, in English.

Writes ../mockups/soft-<name>.html: sign-in, the tool handoff, the agent's
chat states, Support, Reports and Accounts. Same shell, tokens and Be Vietnam
Pro as build_soft_agent.py and build_soft_admin_rich.py. The copy is English;
what a customer wrote and the reply a member sends them stay Vietnamese,
since app users read them.

  soft-signin            sign-in
  soft-first-password    first sign-in, new password
  soft-tool-opening      opening Grafana
  soft-tool-forbidden    a moderator opening Argo CD
  soft-agent-chat        a chat with an answer and a table
  soft-agent-running     an answer in progress
  soft-agent-proposal    the agent proposes suspending a ring
  soft-support-chat      a ticket, the customer's chat open
  soft-support-details   a ticket, Details open
  soft-reports-case      a report case with the decision bar
  soft-accounts-active   an account
  soft-accounts-suspend  the Suspend popover
  soft-accounts-suspended a suspended account
"""
import sys
from html import escape

from build_soft_admin import btn, card, card_head, tag
from build_soft_admin_rich import EXTRA, spark
from build_soft_agent import OUT, ask_box, avatar, chat, gi, head_icon, kbd, shell, src
from common import ASSETS, LOGO, MASCOT

PHOTO = ASSETS + "/content-assets/reported-iphone-photo/iphone-listing-640.webp"


def frame(title, inner, page=None, thread=None, bare=False):
    return shell(title + " · Console", inner, thread, page=page, bare=bare).replace("</style>", EXTRA + "</style>", 1)


def pill(text, tone):
    return tag(f'<span class="h-1.5 w-1.5 rounded-full {tone}"></span>{text}', "bg-white border hair text-on-surface")


# --- sign-in and handoff ---

def centred(body, wide=False, chrome=True):
    top = f'''<div class="absolute left-8 top-7 flex items-center gap-2"><img src="{LOGO}" alt="ShopNexus" class="h-8 w-8 rounded-[9px]"><span class="tight text-[16px] font-semibold">ShopNexus Console</span></div>
  <div class="absolute right-8 top-7 flex rounded-full bg-white/80 p-1 soft">{"".join(f'<a id="theme-{k}" href="#theme-{k}" class="flex h-8 w-8 items-center justify-center rounded-full {"bg-surface-container" if k == "sys" else ""} text-on-surface-variant">{gi(ic, 17)}</a>' for k, ic in [("sys", "computer-outline-rounded"), ("light", "light-mode-outline-rounded"), ("dark", "dark-mode-outline-rounded")])}</div>'''
    return f"""<main class="hero relative flex flex-1 items-center justify-center overflow-hidden"><div class="hdots pointer-events-none absolute inset-0"></div>
  {top if chrome else ""}
  <div class="relative {"w-[560px]" if wide else "w-[440px]"}">{body}</div>
  {'<p class="absolute bottom-6 text-[13px] text-on-surface-variant">console.shopnexus.vn</p>' if chrome else ""}</main>"""


def field(label, value, ic="", focus=False, right=""):
    ring = "border-primary/60 ring-4 ring-primary/10" if focus else "hair"
    return f"""<div><p class="mb-1.5 text-[13.5px] font-medium">{label}</p>
  <p class="flex h-12 items-center gap-2.5 rounded-[14px] border bg-white px-4 text-[15px] {ring}">{gi(ic, 18, "text-on-surface-variant") if ic else ""}<span class="flex-1 {"text-on-surface-variant/70" if not value else ""}">{value or ""}</span>{right}</p></div>"""


def signin():
    body = f"""<div class="rounded-[24px] border hair bg-white p-9 soft">
  <img src="{MASCOT}" alt="" class="mx-auto -mt-20 h-[120px] w-[120px] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,.12)]">
  <h1 class="tight mt-2 text-center text-[28px] font-semibold">Sign in</h1>
  <div class="mt-7 space-y-4">{field("Email", "lan@shopnexus.vn", "mail-outline-rounded")}
    {field("Password", "••••••••••", "lock-outline", True, gi("visibility-outline", 18, "text-on-surface-variant"))}</div>
  <a id="continue" href="#continue" class="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-medium text-on-primary">Continue{gi("arrow-forward-rounded", 18)}</a>
  <p class="mt-4 text-center text-[13px] text-on-surface-variant">Forgot your password? Ask an admin.</p>
</div>"""
    return frame("Sign in", centred(body), bare=True)


def first_password():
    checks = "".join(f'<p class="flex items-center gap-2 text-[13.5px] {"text-primary" if ok else "text-on-surface-variant"}">{gi("check-circle-rounded" if ok else "radio-button-unchecked", 17)}{t}</p>'
                     for t, ok in [("12 characters or more", True), ("Not your email or name", True), ("Both fields match", False)])
    body = f"""<div class="rounded-[24px] border hair bg-white p-9 soft">
  <div class="flex items-center gap-3"><span class="flex h-12 w-12 items-center justify-center rounded-[16px] bg-primary/[.08] text-primary">{gi("key-outline-rounded", 24)}</span>
    <div><h1 class="tight text-[24px] font-semibold">Set a new password</h1><p class="text-[14px] text-on-surface-variant">lan@shopnexus.vn · <a id="change-email" href="#change" class="font-medium text-primary">Change</a></p></div></div>
  <div class="mt-7 space-y-4">{field("New password", "••••••••••••••", "lock-outline")}
    <div class="-mt-2 flex gap-1.5">{"".join(f'<span class="h-1.5 flex-1 rounded-full {c}"></span>' for c in ["bg-primary", "bg-primary", "bg-primary", "bg-surface-container"])}</div>
    {field("Again", "•••••••", "lock-outline", True)}</div>
  <div class="mt-5 space-y-2 rounded-[16px] bg-surface-container-low p-4">{checks}</div>
  <a id="save" href="#save" class="mt-6 flex h-12 items-center justify-center rounded-full bg-primary/40 text-[15px] font-medium text-on-primary">Save and continue</a>
</div>"""
    return frame("New password", centred(body), bare=True)


def tool(forbidden=False):
    name, ic, host = ("Argo CD", "deployed-code-outline-rounded", "argocd.shopnexus.vn") if forbidden else ("Grafana", "monitoring", "grafana.shopnexus.vn")
    path = "".join(f'<span class="h-1.5 w-1.5 rounded-full {"bg-primary" if not forbidden and i < 4 else "bg-outline-variant"}"></span>' for i in range(7))
    end = (f'<span class="flex h-16 w-16 items-center justify-center rounded-[20px] bg-error-container text-error">{gi("lock-outline", 30)}</span>' if forbidden else
           f'<span class="flex h-16 w-16 items-center justify-center rounded-[20px] bg-tertiary-fixed text-on-tertiary-fixed-variant">{gi(ic, 30)}</span>')
    others = "".join(f'<a id="other-{t}" href="#other-{t}" class="flex items-center gap-2.5 rounded-[14px] border hair bg-white px-3.5 py-2.5 text-[14px] soft">{gi(i, 18, "text-primary")}<span class="flex-1">{t}</span>{gi("north-east-rounded", 15, "text-on-surface-variant")}</a>'
                     for t, i in [("Grafana", "monitoring"), ("LiteLLM", "neurology-outline-rounded")]) if forbidden else ""
    body = f"""<div class="rounded-[24px] border hair bg-white p-9 text-center soft">
  <div class="flex items-center justify-center gap-4"><img src="{LOGO}" alt="ShopNexus" class="h-16 w-16 rounded-[20px]"><span class="flex gap-1.5">{path}</span>{end}</div>
  <h1 class="tight mt-6 text-[24px] font-semibold">{"Admins only" if forbidden else "Opening " + name}</h1>
  <p class="mt-1.5 text-[14px] text-on-surface-variant">{name} · {host}</p>
  {f'<p class="mt-5 rounded-[14px] bg-surface-container-low px-4 py-3 text-[14px] text-on-surface-variant">Ask an admin if you need {name}.</p>' if forbidden else
   f'<div class="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-surface-container"><div class="h-full w-2/3 rounded-full bg-primary"></div></div>'}
</div>{f'<p class="mb-2 mt-6 text-center text-[13px] text-on-surface-variant">You can open</p><div class="grid grid-cols-2 gap-2">{others}</div>' if forbidden else ""}"""
    return frame(name, centred(body, chrome=False), page="tools")


# --- agent ---

def chat_main(title, body, box, link=""):
    return f"""<main class="flex min-w-0 flex-1 flex-col">
  <header class="flex h-14 shrink-0 items-center gap-3 px-6"><p class="tight min-w-0 flex-1 truncate text-[15px] font-medium">{title}</p>{link}
    <a id="more" href="#more" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("more-horiz", 18)}</a></header>
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden"><div class="mx-auto w-full max-w-[760px] space-y-7 px-8 py-6">{body}</div></div>
  <div class="mx-auto w-full max-w-[760px] px-8 pb-6">{box}</div></main>"""


def mine(t):
    return f'<div class="flex justify-end"><p class="max-w-[75%] rounded-[20px] rounded-br-[6px] bg-primary/[.08] px-4 py-2.5 text-[15px] leading-[24px]">{t}</p></div>'


CASE = f'<a id="about-case" href="#case" class="hov inline-flex h-8 items-center gap-1.5 rounded-full border hair px-3 text-[13px] text-on-surface-variant">{gi("flag-outline-rounded", 15)}Report · Đồ Cũ Gò Vấp{gi("north-east-rounded", 14)}</a>'
CTX = gi("flag-outline-rounded", 14) + "Report · Đồ Cũ Gò Vấp"


def agent_running():
    stop = ask_box("Ask a follow-up…", ctx=CTX).replace('title="Send"', 'title="Stop"').replace("arrow-upward-rounded", "stop-rounded")
    body = f"""{mine("Do these accounts share a phone number or a bank account?")}
  <div class="flex gap-3">{head_icon()}<div class="min-w-0 flex-1 space-y-3">
    <div class="flex flex-wrap gap-1.5">{src("person-outline-rounded", "Đồ Cũ Gò Vấp")}{src("person-outline-rounded", "Trần Đức Anh")}
      <span class="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[.05] px-2.5 text-[12.5px] text-primary"><span class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>Phạm Quốc Bảo</span></div>
    <div class="space-y-2"><div class="h-3 w-[86%] animate-pulse rounded-full bg-surface-container"></div><div class="h-3 w-[60%] animate-pulse rounded-full bg-surface-container"></div></div>
  </div></div>"""
    return frame("Agent", chat_main("Đồ Cũ Gò Vấp and Trần Đức Anh ring", body, stop, CASE), thread="g1")


def check(on):
    return (f'<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-primary text-on-primary">{gi("check-rounded", 15)}</span>' if on else
            '<span class="block h-5 w-5 shrink-0 rounded-[6px] border-2 border-outline-variant"></span>')


def agent_proposal():
    rows = "".join(f"""<div class="flex items-center gap-3 border-t hair px-4 py-3 first:border-t-0">{check(on)}{avatar(n[0], 34, key=n)}
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[14.5px] font-medium">{n}</p><p class="mt-0.5 text-[12.5px] text-on-surface-variant">{why}</p></div>
  <span class="flex h-8 items-center gap-1 rounded-[10px] border {"border-error/40 bg-error/[.04] text-error" if on else "hair"} px-2.5 text-[13px]">{term}{gi("expand-more-rounded", 16)}</span></div>"""
                   for n, why, term, on in [("Đồ Cũ Gò Vấp", "2 reports · deposit scam · shares pickup address", "30 days", True),
                                            ("Trần Đức Anh", "4 listings reuse Gò Vấp's photos", "7 days", True),
                                            ("Phạm Quốc Bảo", "Already suspended · same deposit message", "No change", False)])
    block = f"""<section class="overflow-hidden rounded-[18px] border border-error/25 bg-white soft">
  <div class="flex items-center gap-2.5 border-b hair px-4 py-3"><span class="flex h-8 w-8 items-center justify-center rounded-[10px] bg-error-container text-error">{gi("gavel-rounded", 17)}</span>
    <p class="flex-1 text-[15px] font-semibold">Suspend 2 accounts</p>{tag("v2", "bg-surface-container text-on-surface-variant")}</div>
  {rows}
  <div class="border-t hair px-4 py-3"><p class="text-[12.5px] text-on-surface-variant">Reason the person sees</p><p class="mt-1 text-[14px]">Tài khoản liên quan đến lừa đảo đặt cọc qua chat.</p></div>
  <div class="flex items-center gap-2 border-t hair bg-surface-container-low/60 px-3 py-2.5">
    <a id="do" href="#do" class="inline-flex h-9 items-center gap-1.5 rounded-full bg-error px-4 text-[14px] font-medium text-on-error">{gi("lock-outline", 16)}Suspend 2 accounts</a>
    {btn("Drop proposal", aid="drop")}<span class="flex-1"></span><span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{kbd("Ctrl")}{kbd("↵")}</span></div></section>"""
    body = f"""{mine("Shorter terms for Trần Đức Anh, it's a first offence.")}
  <div class="flex gap-3">{head_icon()}<div class="min-w-0 flex-1 space-y-3">
    <a id="v1" href="#v1" class="hov flex items-center gap-2 rounded-[12px] border hair px-3 py-2 text-[13px] text-on-surface-variant">{gi("checklist-rounded", 16)}<span class="flex-1 line-through">Suspend 3 accounts for 30 days</span>Version 1 · replaced{gi("expand-more-rounded", 16)}</a>
    <p class="text-[15px] leading-[25px]">Trần Đức Anh drops to 7 days. Phạm Quốc Bảo is already suspended, so he stays out.</p>{block}</div></div>"""
    return frame("Agent", chat_main("Đồ Cũ Gò Vấp and Trần Đức Anh ring", body, ask_box("Ask a follow-up…", ctx=CTX), CASE), thread="g1")


# --- shared list column ---

def list_col(title_bar, rows, foot=""):
    return f"""<section class="flex w-[310px] shrink-0 flex-col border-r hair bg-[#FBFCFB]">
  <div class="p-3">{title_bar}</div><div class="min-h-0 flex-1 space-y-1 overflow-hidden px-2">{rows}</div>{foot}</section>"""


def seg(items):
    return ('<div class="flex rounded-full bg-surface-container p-1 text-[13.5px]">' + "".join(
        f'<a id="seg-{i}" href="#seg-{i}" class="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full px-3 {"bg-white soft font-medium" if i == 0 else "text-on-surface-variant"}">{t}</a>'
        for i, t in enumerate(items)) + "</div>")


def row(on, ch, name, line, when, foot, key=None, badge=""):
    return f"""<a id="row-{escape(name)[:8]}" href="#row" class="{"bg-white soft ring-1 ring-primary/20" if on else "hov"} relative flex gap-3 rounded-[16px] px-3 py-3">
  <span class="relative">{avatar(ch, 38, key=key or name)}{badge}</span>
  <span class="min-w-0 flex-1"><span class="flex items-center gap-2"><span class="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{escape(name)}</span><span class="tnum text-[12px] text-on-surface-variant">{when}</span></span>
    <span class="mt-0.5 block truncate text-[13.5px] text-on-surface-variant">{escape(line)}</span><span class="mt-1.5 flex items-center gap-1.5 text-[12px]">{foot}</span></span></a>"""


def kind(t, tone="bg-primary"):
    return f'<span class="flex items-center gap-1.5 text-on-surface-variant"><span class="h-1.5 w-1.5 rounded-full {tone}"></span>{t}</span>'


READY = f'<span class="ml-auto flex items-center gap-1 text-primary">{gi("material-symbols:auto-awesome-outline-rounded", 13)}Reply ready</span>'


# --- Support ---

def support_queue():
    q = [("K", "Khánh Linh", "Mình hỏi bảo vệ rồi, không ai nhận giúp cả.", "09:41", "Not received", "bg-primary", True, True),
         ("T", "Võ Thanh Tâm", "Mình không đổi được số điện thoại…", "09:20", "Other", "bg-outline", True, False),
         ("S", "Shop Cây Cảnh Thủ Đức", "Mình giao trong ngày, khách hay hỏi Ahamove.", "08:55", "Carrier request", "bg-tertiary", False, False),
         ("N", "Trương Bảo Ngọc", "Bạn kiểm tra lại với bưu cục Cầu Giấy giúp mình.", "08:30", "Not received", "bg-primary", True, False),
         ("P", "Nguyễn Văn Phúc", "App hay tự thoát khi mình quay video.", "Yesterday", "Other", "bg-outline", False, False),
         ("Đ", "Đồ Cũ Hải Châu", "Mình gửi nội tỉnh Đà Nẵng.", "Yesterday", "Carrier request", "bg-tertiary", True, False)]
    rows = "".join(row(on, ch, n, l, w, kind(k, t) + (READY if r else "")) for ch, n, l, w, k, t, r, on in q)
    bar = f'{seg(["Open · 7", "Resolved"])}<div class="mt-2 flex h-10 items-center gap-2 rounded-full border hair bg-white px-4 text-[14px] text-on-surface-variant">{gi("filter-list-rounded", 17)}All kinds{gi("expand-more-rounded", 16)}</div>'
    return list_col(bar, rows, f'<p class="flex items-center gap-1.5 border-t hair px-4 py-3 text-[12.5px] text-on-surface-variant">{kbd("j")}{kbd("k")}Next, previous</p>')


def support_center():
    pod = f"""<div class="flex items-center gap-3 rounded-[16px] border hair bg-white p-3 soft">
  <span class="flex h-12 w-12 items-center justify-center rounded-[12px] bg-tertiary-fixed text-on-tertiary-fixed-variant">{gi("signature", 24)}</span>
  <span class="min-w-0 flex-1 leading-tight"><span class="block text-[14.5px] font-semibold">Proof of delivery · signed “Hằng”</span><span class="tnum mt-0.5 block text-[12.5px] text-on-surface-variant">GHTK S1.A1.17373471 · yesterday 14:21</span></span>
  <a id="pod" href="#pod" class="hov rounded-full px-3 py-1.5 text-[13.5px] font-medium text-primary">View</a></div>"""
    reply = f"""<section class="overflow-hidden rounded-[18px] border hair bg-white soft">
  <div class="flex items-center gap-2.5 border-b hair px-4 py-3"><span class="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/[.08] text-primary">{gi("reply-rounded", 17)}</span>
    <p class="flex-1 text-[15px] font-semibold">Reply to Khánh Linh</p>{tag("v2", "bg-surface-container text-on-surface-variant")}</div>
  <p class="px-4 py-3.5 text-[15px] leading-[24px]">GHTK ghi đã giao cho lễ tân toà B lúc 14:20, người ký tên Hằng. Bạn hỏi giúp lễ tân toà B nhé.</p>
  <div class="flex items-center gap-2 border-t hair bg-surface-container-low/60 px-3 py-2.5">
    <a id="send" href="#send" class="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-medium text-on-primary">Send to Khánh Linh{gi("send-outline-rounded", 16)}</a>
    {btn("Edit", "edit-outline-rounded", aid="edit")}<span class="flex-1"></span><span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{kbd("Ctrl")}{kbd("↵")}</span></div></section>"""
    body = f"""<div class="flex gap-3">{head_icon()}<div class="min-w-0 flex-1 space-y-3">
    <div class="flex flex-wrap gap-1.5">{src("chat-outline-rounded", "This ticket")}{src("local-shipping-outline-rounded", "GHTK shipment")}{src("receipt-long-outline-rounded", "iPhone X order")}</div>
    <p class="text-[15px] leading-[25px]">GHTK says it was left with reception in building B, with a signed proof. Khánh Linh asked the guard, not reception.</p>{pod}</div></div>
  {mine("Shorter, drop the part about filing a claim.")}
  <div class="flex gap-3">{head_icon()}<div class="min-w-0 flex-1">{reply}</div></div>"""
    head = f"""<header class="flex h-16 shrink-0 items-center gap-3 border-b hair px-6">{avatar("K", 38, status="active", key="Khánh Linh")}
  <div class="min-w-0 flex-1 leading-tight"><p class="tight truncate text-[15.5px] font-semibold">Khánh Linh · not received</p><p class="text-[12.5px] text-on-surface-variant">Opened 08:12 · iPhone X 64GB · GHTK</p></div>
  <a id="resolve" href="#resolve" class="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-medium text-on-primary">{gi("check-rounded", 17)}Resolve</a>
  <a id="more" href="#more" class="hov flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{gi("more-horiz", 18)}</a></header>"""
    return f"""<section class="flex min-w-0 flex-1 flex-col">{head}
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden"><div class="space-y-6 px-6 py-5">{body}</div></div>
  <div class="px-6 pb-5">{ask_box("Ask the agent or change the reply…", ctx=gi("package-2-outline", 14) + "Ticket · Khánh Linh")}</div></section>"""


def side_tabs(on):
    return '<div class="flex gap-1 p-3">' + "".join(
        f'<a id="tab-{k}" href="#tab-{k}" class="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[14px] {"bg-white soft font-medium" if k == on else "text-on-surface-variant"}">{t}{b}</a>'
        for k, t, b in [("chat", "Customer chat", '<span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-on-primary">1</span>'), ("info", "Details", "")]) + "</div>"


def customer_chat():
    def them(t, w):
        return f'<div class="max-w-[85%]"><p class="rounded-[18px] rounded-bl-[6px] bg-white px-3.5 py-2.5 text-[14px] leading-[21px] soft">{t}</p><p class="tnum mt-1 px-1 text-[11.5px] text-on-surface-variant">{w}</p></div>'

    def us(t, w):
        return f'<div class="ml-auto max-w-[85%]"><p class="rounded-[18px] rounded-br-[6px] bg-primary/[.10] px-3.5 py-2.5 text-[14px] leading-[21px]">{t}</p><p class="tnum mt-1 px-1 text-right text-[11.5px] text-on-surface-variant">{w}</p></div>'
    thread = "".join([them("GHTK báo đã giao lúc 14:20 hôm qua nhưng mình chưa nhận được, nhà không ai ký nhận.", "08:12"),
                      us("Chào bạn, bưu tá báo giao lúc 14:20 tại 12 Nguyễn Gia Trí, Bình Thạnh. Bạn kiểm tra giúp mình với bảo vệ toà nhà nhé.", "Lan · 09:05"),
                      '<p class="flex items-center gap-2 text-[12px] font-medium text-primary"><span class="h-px flex-1 bg-primary/30"></span>New<span class="h-px flex-1 bg-primary/30"></span></p>',
                      them("Mình hỏi bảo vệ rồi, không ai nhận giúp cả.", "09:41")])
    return f"""<div class="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-4 py-4">{thread}</div>
<div class="px-3 pb-3"><div class="rounded-[18px] border hair bg-white soft"><p class="min-h-[44px] px-4 pt-3 text-[14px] text-on-surface-variant/80">Reply to Khánh Linh…</p>
  <div class="flex items-center gap-2 px-3 pb-2.5"><span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{gi("visibility-outline", 14)}Shown as ShopNexus</span><span class="flex-1"></span>
  <a id="send-hand" href="#send-hand" class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">{gi("arrow-upward-rounded", 17)}</a></div></div></div>"""


def details():
    figs = "".join(f'<div class="rounded-[12px] bg-white px-3 py-2 soft"><p class="tnum text-[16px] font-semibold">{n}</p><p class="text-[11.5px] text-on-surface-variant">{t}</p></div>' for n, t in [("4", "orders"), ("4/4", "delivered"), ("0", "reports")])
    ev = "".join(f"""<li class="relative flex gap-3 pb-3 last:pb-0"><span class="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full {"bg-primary ring-4 ring-primary/15" if i == 0 else "bg-outline-variant"}"></span>
  <div class="min-w-0 flex-1 leading-tight"><div class="flex gap-2"><p class="flex-1 text-[13.5px] {"font-medium" if i == 0 else ""}">{t}</p><p class="tnum text-[12px] text-on-surface-variant">{w}</p></div><p class="mt-0.5 text-[12.5px] text-on-surface-variant">{d}</p></div></li>"""
                 for i, (t, w, d) in enumerate([("Delivered", "Yest. 14:20", "Reception, building B · signed Hằng"), ("Out for delivery", "Yest. 08:05", "Bình Thạnh hub"), ("Picked up", "Mon 16:40", "From Hoàng Nam, District 3")]))
    return f"""<div class="min-h-0 flex-1 space-y-3 overflow-hidden px-3 pb-3">
  <div class="hero relative overflow-hidden rounded-[18px] border hair p-4"><div class="hdots pointer-events-none absolute inset-0"></div>
    <div class="relative flex items-center gap-3">{avatar("K", 44, status="active", key="Khánh Linh")}<div class="leading-tight"><p class="text-[15px] font-semibold">Khánh Linh</p><p class="tnum text-[12px] text-on-surface-variant">7b1c22e0 · since 03/2025</p></div></div>
    <div class="relative mt-3 grid grid-cols-3 gap-2">{figs}</div></div>
  {card(f'''<div class="flex items-center gap-3"><img src="{PHOTO}" alt="" class="h-12 w-12 rounded-[12px] object-cover"><div class="min-w-0 flex-1 leading-tight"><p class="truncate text-[14px] font-semibold">iPhone X 64GB, battery 86%</p>
    <p class="tnum text-[13px] text-tertiary">3.800.000 ₫ <span class="text-on-surface-variant">· COD with inspection</span></p></div></div>
    <ul class="relative mt-4 before:absolute before:bottom-2 before:left-[4.5px] before:top-2 before:w-px before:bg-outline-variant">{ev}</ul>''', "p-4")}
  {card(f'''<div class="flex items-center gap-3">{avatar("H", 34, key="Hoàng Nam")}<div class="min-w-0 flex-1 leading-tight"><p class="text-[14px] font-semibold">Hoàng Nam · seller</p><p class="text-[12.5px] text-on-surface-variant">4.8 ★ · 38 orders</p></div></div>
    <p class="mt-3 rounded-[12px] bg-tertiary-fixed/50 px-3 py-2 text-[12.5px] text-on-tertiary-fixed-variant">2 “not received” reports in 90 days, same hub</p>''', "p-4")}
</div>"""


def support(tab):
    side = f'<aside class="flex w-[340px] shrink-0 flex-col overflow-hidden border-l hair bg-surface-container-low/50">{side_tabs(tab)}<div class="flex min-h-0 flex-1 flex-col">{customer_chat() if tab == "chat" else details()}</div></aside>'
    return frame("Support", support_queue() + support_center() + side, page="support")


# --- Reports ---

def reports():
    q = [("Đ", "Đồ Cũ Gò Vấp", "iPhone 13 Pro Max 256GB", "26 h", 3, True), ("T", "Trần Đức Anh", "Tai nghe AirPods Pro 2", "9 h", 4, False),
         ("M", "Mỹ Phẩm Xách Tay Hà", "Son Dior 999 chính hãng", "3 h", 3, False), ("L", "Nguyễn Hữu Lộc", "Súng hơi PCP nội địa", "1 h", 2, False),
         ("H", "Lê Thị Hồng", "Máy ảnh Fujifilm X-T30", "40 min", 1, False)]
    rows = "".join(row(i == 0, ch, n, l, f'<span class="{"text-error" if w == "26 h" else ""}">{w}</span>',
                       kind("Scam", "bg-error") + (kind("Fake", "bg-tertiary") if n.startswith("Mỹ") else ""),
                       badge=f'<span class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full {"bg-error text-on-error" if c >= 3 else "bg-surface-container-high"} px-1 text-[11px] font-semibold ring-2 ring-white">{c}</span>')
                   for i, (ch, n, l, w, c, _) in enumerate(q))
    bar = seg(['Waiting <span class="rounded-full bg-error px-1.5 text-[11px] text-on-error">12</span>', "Resolved"])
    evid = [("Same pickup address", "Shares 41 Lê Văn Thọ with Trần Đức Anh", "home-pin-outline", "bg-primary/[.08] text-primary", "2 accounts"),
            ("Reused photos", "4 listings match Gò Vấp's photos at 97%", "photo-library-outline-rounded", "bg-tertiary-fixed text-on-tertiary-fixed-variant", "97% match"),
            ("Deposit message", "“Chuyển cọc 500k mình giữ hàng” to 6 buyers", "chat-outline-rounded", "bg-error-container text-error", "6 buyers"),
            ("Price vs guide", "8.9 M ₫ against a 21 M ₫ guide", "sell-outline-rounded", "bg-secondary-container text-on-secondary-container", "−58%")]
    grid = "".join(card(f"""<div class="flex items-start gap-2.5"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] {t}">{gi(ic, 18)}</span><div class="min-w-0 flex-1"><p class="text-[14.5px] font-semibold">{h}</p><p class="tnum text-[12.5px] font-medium text-primary">{n}</p></div></div>
<p class="mt-2.5 text-[13.5px] text-on-surface-variant">{d}</p>""", "p-4") for h, d, ic, t, n in evid)
    reporters = "".join(f'<div class="flex items-start gap-3 py-2">{avatar(c, 30, key=n)}<div class="min-w-0 flex-1 leading-tight"><p class="text-[14px] font-medium">{n} <span class="tnum font-normal text-on-surface-variant">· {w}</span></p><p class="mt-0.5 text-[13px] text-on-surface-variant">“{t}”</p></div></div>'
                        for c, n, w, t in [("Q", "Quang Huy", "Yesterday", "Bắt chuyển cọc trước rồi chặn mình"), ("M", "Minh Thư", "09:31", "Ảnh lấy trên mạng, hỏi video thì không gửi")])
    hero = f"""<section class="hero relative overflow-hidden rounded-[22px] border hair p-5"><div class="hdots pointer-events-none absolute inset-0"></div>
  <div class="relative flex gap-5">{avatar("Đ", 72, status="active", key="Đồ Cũ Gò Vấp")}
    <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><h1 class="tight text-[24px] font-semibold">Đồ Cũ Gò Vấp</h1>{pill("Active", "bg-primary")}</div>
      <p class="tnum mt-0.5 text-[13px] text-on-surface-variant">a1f0c3 · seller since 08/2026 · 14 listings</p>
      <div class="mt-3 flex flex-wrap gap-2">{tag("Scam · 2", "bg-error-container text-error")}{tag("Fake · 1", "bg-tertiary-fixed text-on-tertiary-fixed-variant")}{tag(gi("material-symbols:auto-awesome-outline-rounded", 13) + "Agent proposes 30 days", "bg-white text-primary border hair")}</div></div>
    <div class="flex w-[300px] items-center gap-3 rounded-[16px] bg-white p-3 soft"><img src="{PHOTO}" alt="" class="h-16 w-16 rounded-[12px] object-cover">
      <div class="min-w-0 flex-1 leading-tight"><p class="truncate text-[14px] font-semibold">iPhone 13 Pro Max 256GB</p><p class="tnum mt-0.5 text-[13px] text-tertiary">8.900.000 ₫</p><p class="mt-0.5 text-[12px] text-on-surface-variant">3 reports</p></div></div></div></section>"""
    decision = f"""<div class="flex items-center gap-3 rounded-[20px] border hair bg-white p-3 shadow-[0_10px_30px_rgba(16,24,22,.10)]">
  <span class="flex shrink-0 items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-[13.5px]">{check(True)}Hide listing</span>
  <span class="flex shrink-0 items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-[13.5px]">{check(True)}Suspend<span class="flex items-center gap-0.5 rounded-full border border-error/40 bg-white px-2 py-0.5 text-error">30 days{gi("expand-more-rounded", 15)}</span></span>
  <span class="min-w-[150px] flex-1 truncate rounded-full border hair px-3 py-2 text-[13.5px]">Lừa đảo đặt cọc qua chat.</span>
  {btn("Not a violation", aid="no-violation").replace("inline-flex", "inline-flex shrink-0", 1)}
  <a id="act" href="#act" class="inline-flex h-10 shrink-0 items-center whitespace-nowrap gap-1.5 rounded-full bg-error px-4 text-[14px] font-medium text-on-error">{gi("gavel-rounded", 17)}Hide and suspend</a></div>"""
    center = f"""<section class="relative flex min-w-0 flex-1 flex-col bg-surface-container-low/40">
  <header class="flex h-14 shrink-0 items-center gap-2 px-6 text-[13.5px] text-on-surface-variant">Reports {gi("chevron-right-rounded", 16)}<span class="text-on-surface">Đồ Cũ Gò Vấp</span><span class="flex-1"></span>
    {btn("Ask the agent", "material-symbols:auto-awesome-outline-rounded", aid="ask")}</header>
  <div class="min-h-0 flex-1 space-y-4 overflow-hidden px-6 pb-28">{hero}
    <div class="grid grid-cols-[1fr_320px] gap-4"><div class="grid grid-cols-2 gap-3">{grid}</div>{card(card_head("Reported by", tag("3", "bg-surface-container text-on-surface")) + reporters, "p-4")}</div></div>
  <div class="absolute inset-x-6 bottom-5">{decision}</div></section>"""
    return frame("Reports", list_col(bar, rows) + center, page="reports")


# --- Accounts ---

ACC = [("Đ", "Đồ Cũ Gò Vấp", "a1f0c3 · 0909 ••• 412", "Today", "active"), ("K", "Khánh Linh", "7b1c22e0 · 0938 ••• 115", "Today", "active"),
       ("T", "Trần Đức Anh", "7d22e9 · 0977 ••• 803", "Yesterday", "active"), ("P", "Phạm Quốc Bảo", "c90b14 · 0912 ••• 660", "Mon", "suspended"),
       ("H", "Hoàng Nam", "5e8a01 · 0903 ••• 271", "Mon", "active"), ("N", "Nguyễn Hữu Lộc", "b31f77 · 0966 ••• 042", "Oct 30", "active")]


def acc_list(active):
    rows = "".join(row(n == active, ch, n, l, w, kind("Suspended · 23 days left", "bg-error") if st == "suspended" else kind("Active"),
                       badge="") .replace(avatar(ch, 38, key=n), avatar(ch, 38, status=st, key=n)) for ch, n, l, w, st in ACC)
    bar = f'{seg(["All", "Suspended <span class=\'rounded-full bg-error px-1.5 text-[11px] text-on-error\'>4</span>"])}<div class="mt-2 flex h-10 items-center gap-2 rounded-full border hair bg-white px-4 text-[14px] text-on-surface-variant">{gi("search-rounded", 17)}<span class="flex-1">Id or phone</span>{kbd("/")}</div>'
    return list_col(bar, rows)


def figure(label, n, ic, values, bad=False):
    color = "var(--md-error)" if bad else "var(--md-primary)"
    tint = "bg-error-container text-error" if bad else "bg-primary/[.08] text-primary"
    return card(f"""<div class="flex items-center gap-2"><span class="flex h-8 w-8 items-center justify-center rounded-[10px] {tint}">{gi(ic, 17)}</span><span class="text-[13px] text-on-surface-variant">{label}</span></div>
<div class="mt-2.5 flex items-end justify-between"><p class="tnum tight text-[28px] font-semibold {"text-error" if bad else ""}">{n}</p>{spark(values, color, 90, 30)}</div>""", "p-4")


def account(state="active", popover=False):
    locked = state == "suspended"
    name = "Phạm Quốc Bảo" if locked else "Đồ Cũ Gò Vấp"
    ch = name[0]
    hero_bg = "background: radial-gradient(70% 140% at 0% 0%, color-mix(in srgb, var(--md-error) 12%, transparent), transparent 60%), radial-gradient(50% 120% at 100% 0%, color-mix(in srgb, var(--md-error-container) 80%, transparent), transparent 60%);" if locked else ""
    actions = (f'<a id="lift" href="#lift" class="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-medium text-on-primary">{gi("lock-open-outline", 17)}Lift suspension</a>' if locked else
               btn("Ask the agent", "material-symbols:auto-awesome-outline-rounded", aid="ask") +
               f'<a id="suspend" href="#suspend" class="inline-flex h-9 items-center gap-1.5 rounded-full border {"border-error bg-error/[.06] ring-4 ring-error/10" if popover else "border-error/40"} px-4 text-[14px] font-medium text-error">{gi("lock-outline", 16)}Suspend</a>')
    hero = f"""<section class="{"" if locked else "hero"} relative overflow-hidden rounded-[22px] border hair p-5" style="{hero_bg}"><div class="hdots pointer-events-none absolute inset-0"></div>
  <div class="relative flex items-center gap-5">{avatar(ch, 72, status=state, key=name)}
    <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><h1 class="tight text-[24px] font-semibold">{name}</h1>{pill("Suspended", "bg-error") if locked else pill("Active", "bg-primary")}</div>
      <p class="tnum mt-0.5 flex items-center gap-1.5 text-[13px] text-on-surface-variant">{"c90b14" if locked else "a1f0c3"}{gi("content-copy-outline-rounded", 14)}</p>
      <div class="mt-3 flex flex-wrap gap-2">{tag(gi("storefront-outline-rounded", 13) + "Seller", "bg-white border hair text-on-surface")}{tag(gi("verified-outline-rounded", 13) + "Phone verified", "bg-white border hair text-primary")}{tag("1 earlier suspension", "bg-white border hair text-on-surface") if locked else ""}</div></div>
    <div class="flex items-center gap-2">{actions}</div></div></section>"""
    figs = (figure("Orders bought", "6", "shopping-bag-outline-rounded", [1, 2, 1, 3, 2, 3, 4]) + figure("Orders sold", "31", "storefront-outline-rounded", [2, 4, 5, 4, 6, 7, 9]) +
            figure("Refused at door", "18%", "do-not-disturb-on-outline-rounded", [5, 8, 7, 12, 14, 16, 18], True) + figure("Reports", "3", "flag-outline-rounded", [0, 0, 1, 1, 2, 2, 3], True))
    hist = [("lock-outline", "bg-error-container text-error", "L", "Lan suspended for 30 days", "Today 10:05", "Lừa đảo đặt cọc qua chat"),
            ("flag-outline-rounded", "bg-tertiary-fixed text-on-tertiary-fixed-variant", "", "Reported for scam by Minh Thư", "Today 09:31", ""),
            ("lock-open-outline", "bg-primary/[.08] text-primary", "H", "Hà lifted a 7-day suspension", "Sep 12", "Hết hạn, đã xác minh lại"),
            ("person-add-outline-rounded", "bg-surface-container text-on-surface-variant", "", "Account created", "Aug 03", "")] if locked else \
           [("flag-outline-rounded", "bg-tertiary-fixed text-on-tertiary-fixed-variant", "", "Reported for scam by Minh Thư", "Today 09:31", ""),
            ("visibility-off-outline", "bg-surface-container text-on-surface-variant", "L", "Lan hid “AirPods Pro 2”", "Nov 02", "Ảnh lấy từ tin khác"),
            ("flag-outline-rounded", "bg-tertiary-fixed text-on-tertiary-fixed-variant", "", "Reported for scam by Quang Huy", "Yesterday", ""),
            ("person-add-outline-rounded", "bg-surface-container text-on-surface-variant", "", "Account created", "Aug 14", "")]
    tl = "".join(f"""<div class="relative flex gap-3 pb-4 last:pb-0"><span class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white {tone}">{gi(ic, 16)}</span>
  <div class="min-w-0 flex-1 pt-1 leading-tight"><div class="flex gap-2"><p class="flex flex-1 items-center gap-1.5 text-[14px]">{avatar(m, 18, "bg-primary text-on-primary") if m else ""}{t}</p><p class="tnum text-[12.5px] text-on-surface-variant">{w}</p></div>
  {f'<p class="mt-1.5 border-l-2 border-primary/40 pl-2.5 text-[13px] text-on-surface-variant">{r}</p>' if r else ""}</div></div>""" for ic, tone, m, t, w, r in hist)
    info = "".join(f'<div class="flex justify-between gap-4 py-1.5 text-[13.5px]"><span class="text-on-surface-variant">{k}</span><span class="text-right">{v}</span></div>'
                   for k, v in [("Phone", f'0909 ••• 412 {gi("verified-rounded", 14, "inline text-primary")}'), ("Email", "doCuGV@gmail.com"), ("Joined", "Aug 14, 2026"), ("Area", "Gò Vấp, HCMC")])
    term = card(f"""<div class="flex items-center gap-2.5"><span class="flex h-9 w-9 items-center justify-center rounded-[12px] bg-error-container text-error">{gi("lock-clock-outline", 18)}</span><p class="flex-1 text-[15px] font-semibold">Suspended for 30 days</p>
  <p class="tnum text-[14px] font-semibold text-error">23 days left</p></div>
<div class="mt-3 h-2 overflow-hidden rounded-full bg-surface-container"><div class="h-full w-[23%] rounded-full bg-error"></div></div>
<div class="mt-2 flex justify-between text-[12.5px] text-on-surface-variant"><span>Nov 11 · by Lan</span><span>Ends Dec 11</span></div>""", "p-4") if locked else ""
    pop = f"""<div class="absolute right-6 top-[140px] z-20 w-[400px] rounded-[22px] border hair bg-white shadow-[0_18px_44px_rgba(16,24,22,.18)]">
  <div class="flex items-center gap-3 p-4"><span class="flex h-10 w-10 items-center justify-center rounded-[12px] bg-error-container text-error">{gi("lock-outline", 20)}</span><p class="flex-1 text-[16px] font-semibold">Suspend Đồ Cũ Gò Vấp</p></div>
  <div class="grid grid-cols-2 gap-2 px-4">{"".join(f'<a id="term-{i}" href="#term-{i}" class="rounded-[14px] border p-3 {"border-error bg-error/[.04]" if i == 1 else "hair"}"><p class="text-[14.5px] font-semibold {"text-error" if i == 1 else ""}">{t}</p><p class="tnum mt-0.5 text-[12px] text-on-surface-variant">{e}</p></a>' for i, (t, e) in enumerate([("1 day", "until Nov 19"), ("7 days", "until Nov 25"), ("30 days", "until Dec 18"), ("No end", "until lifted")]))}</div>
  <div class="px-4 pt-3"><p class="mb-1.5 text-[13px] text-on-surface-variant">Reason Đồ Cũ Gò Vấp sees</p>
    <p class="min-h-[68px] rounded-[14px] border border-primary/50 px-3.5 py-2.5 text-[14px] ring-4 ring-primary/10">Lừa đảo đặt cọc qua chat.</p><p class="tnum mt-1 text-right text-[12px] text-on-surface-variant">24/280</p></div>
  <div class="mt-3 flex items-center justify-end gap-2 rounded-b-[22px] border-t hair bg-surface-container-low/60 p-3">{btn("Cancel", aid="cancel")}
    <a id="confirm" href="#confirm" class="inline-flex h-9 items-center gap-1.5 rounded-full bg-error px-4 text-[14px] font-medium text-on-error">Suspend 7 days</a></div></div>"""
    center = f"""<section class="relative flex min-w-0 flex-1 flex-col bg-surface-container-low/40">
  <header class="flex h-14 shrink-0 items-center gap-2 px-6 text-[13.5px] text-on-surface-variant">Accounts {gi("chevron-right-rounded", 16)}<span class="text-on-surface">{name}</span><span class="flex-1"></span>{kbd("k")}{kbd("j")}</header>
  <div class="min-h-0 flex-1 space-y-4 overflow-hidden px-6 pb-6">{hero}
    {term}<div class="grid grid-cols-4 gap-3">{figs}</div>
    <div class="grid grid-cols-[1fr_300px] gap-4">{card(card_head("History") + tl)}{card(card_head("Details") + info, "p-5 pb-3")}</div></div>
  {pop if popover else ""}</section>"""
    return frame("Accounts", acc_list(name) + center, page="accounts")


SCREENS = {
    "soft-signin": ("Sign in", signin), "soft-first-password": ("First sign-in · New password", first_password),
    "soft-tool-opening": ("Tools · Opening", lambda: tool()), "soft-tool-forbidden": ("Tools · Admins only", lambda: tool(True)),
    "soft-agent-chat": ("Agent · Chat", chat), "soft-agent-running": ("Agent · Answering", agent_running), "soft-agent-proposal": ("Agent · Proposal", agent_proposal),
    "soft-support-chat": ("Support · Customer chat", lambda: support("chat")), "soft-support-details": ("Support · Details", lambda: support("info")),
    "soft-reports-case": ("Reports · Case", reports),
    "soft-accounts-active": ("Accounts · Active", lambda: account()), "soft-accounts-suspend": ("Accounts · Suspend", lambda: account(popover=True)),
    "soft-accounts-suspended": ("Accounts · Suspended", lambda: account("suspended")),
}

if __name__ == "__main__":
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
