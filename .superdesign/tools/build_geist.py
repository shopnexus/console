"""Hỗ trợ in the modern Geist look, agent first.

Writes ../mockups/geist-ticket-<tab>.html. The look follows the canvas draft
"Hỗ trợ · Hiện đại · Geist" (8c4c574e): Geist and Geist Mono, hairline
borders, 6 to 14 px corners, a white work card on surfaceContainer, Material
Symbols Light. The M3 colour roles stay.

The ticket opens on the agent's chat in the middle: its read of the ticket,
then the reply it wrote as a block the member sends, edits, or asks again for.
The column on the end side has two tabs: the person's chat (the member still
answers there by hand) and Thông tin, the facts a member checks before
answering: the person, their record, the order with the carrier's events and
proof, the seller, and the person's other tickets.

  geist-ticket-info  Thông tin open
  geist-ticket-chat  Chat khách open, one new message
"""
import sys
from html import escape
from pathlib import Path

from common import LOGO, head

OUT = Path(__file__).resolve().parent.parent / "mockups"

CSS = """
  html, body { background: var(--md-surface-container); }
  body, body * { font-family: "Geist", system-ui, sans-serif; letter-spacing: -0.012em; }
  body .mono, body .mono * { font-family: "Geist Mono", ui-monospace, monospace; letter-spacing: 0; }
  .tnum { font-variant-numeric: tabular-nums; }
  .tight { letter-spacing: -0.022em !important; }
  .hair { border-color: color-mix(in srgb, var(--md-outline-variant) 70%, white); }
  .lift { box-shadow: 0 1px 2px rgba(16, 24, 22, .06), 0 0 0 1px rgba(16, 24, 22, .06); }
  .hov:hover { background: var(--md-surface-container-low); }
"""
FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">')


def gi(name, size=18, cls=""):
    """Material Symbols Light; a name with a set prefix ("material-symbols:...") picks that set, for the sparkle the light set lacks."""
    name = name if ":" in name else f"material-symbols-light:{name}"
    return f'<iconify-icon icon="{name}" width="{size}" height="{size}" class="block shrink-0 {cls}"></iconify-icon>'


def kbd(k):
    return f'<kbd class="mono inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border hair bg-surface-container-lowest px-1 text-[11px] text-on-surface-variant">{k}</kbd>'


def avatar(ch, size=32, tone="bg-surface-container-high text-on-surface-variant"):
    return (f'<span class="flex shrink-0 items-center justify-center rounded-full font-semibold {tone}" '
            f'style="width:{size}px;height:{size}px;font-size:{round(size * .44)}px">{ch}</span>')


def dot(tone="bg-primary"):
    return f'<span class="h-1.5 w-1.5 shrink-0 rounded-full {tone}"></span>'


def pill(text, tone="bg-primary"):
    return (f'<span class="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border hair bg-surface-container-lowest px-2 text-[12px] font-medium text-on-surface">'
            f'{dot(tone)}{text}</span>')


def nav(active="support", role="moderator"):
    """role: an admin also sees the audit log and the members, and opens every tool."""
    admin = role == "admin"
    items = [("home", "Trang chủ", "home-outline-rounded", ""), ("support", "Hỗ trợ", "support-agent-outline", "7"),
             ("reports", "Báo cáo", "flag-outline-rounded", "12"), ("agent", "Agent", "material-symbols:auto-awesome-outline-rounded", ""),
             ("accounts", "Tài khoản", "group-outline-rounded", "")]
    if admin:
        items += [("actions", "Nhật ký thao tác", "history-rounded", ""), ("members", "Nhân viên", "badge-outline", "3")]
    rows = "".join(
        f'<a id="nav-{k}" href="#{k}" class="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13.5px] font-medium '
        f'{"bg-surface-container-lowest lift text-on-surface" if k == active else "hov text-on-surface-variant"}">'
        f'{gi(ic, 18, "text-primary" if k == active else "")}<span>{t}</span>'
        f'{f"<span class=\'tnum ml-auto text-[12px] text-on-surface-variant\'>{n}</span>" if n else ""}</a>'
        for k, t, ic, n in items)
    tools = "".join(
        f'<a id="nav-tool-{k}" href="#tool-{k}" class="hov flex h-8 items-center gap-2.5 rounded-md px-2 text-[13.5px] {"text-on-surface-variant" if ok or admin else "text-outline"}">'
        f'{gi(ic)}<span>{t}</span><span class="ml-auto text-outline">{gi("north-east-rounded" if ok or admin else "lock-outline", 14)}</span></a>'
        for k, t, ic, ok in [("grafana", "Grafana", "monitoring", True), ("restate", "Restate", "account-tree-outline-rounded", False),
                             ("litellm", "LiteLLM", "neurology-outline-rounded", False), ("s3", "RustFS", "folder-open-outline-rounded", False),
                             ("argocd", "Argo CD", "deployed-code-outline-rounded", False)])
    return f"""<nav class="flex w-[232px] shrink-0 flex-col px-3 pb-3 pt-3">
  <a id="brand" href="#home" class="flex h-9 items-center gap-2 px-2"><img src="{LOGO}" alt="ShopNexus" class="h-6 w-6 rounded-[6px]">
    <span class="tight text-[14px] font-semibold">ShopNexus</span><span class="text-[13px] text-on-surface-variant">Console</span></a>
  <a id="search" href="#search" class="mt-3 flex h-8 items-center gap-2 rounded-md border hair bg-surface-container-lowest px-2 text-[13px] text-on-surface-variant">
    {gi("search-rounded", 16)}<span class="flex-1">Tìm tài khoản</span>{kbd("/")}</a>
  <div class="mt-4 space-y-0.5">{rows}</div>
  <p class="mb-1 mt-6 px-2 text-[12px] font-medium text-on-surface-variant">Công cụ</p>
  <div class="space-y-0.5">{tools}</div>
  <span class="flex-1"></span>
  <a id="me" href="#me" class="hov flex h-10 items-center gap-2.5 rounded-md px-2">{avatar("K" if admin else "L", 24, "bg-primary text-on-primary")}
    <span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[13px] font-medium">{"Trần Minh Khoa" if admin else "Nguyễn Thị Lan"}</span>
    <span class="block text-[11.5px] text-on-surface-variant">{"Quản trị viên" if admin else "Kiểm duyệt viên"}</span></span>{gi("unfold-more-rounded", 16, "text-on-surface-variant")}</a>
</nav>"""


QUEUE = [
    ("t1", "K", "Khánh Linh", "Mình hỏi bảo vệ rồi, không ai nhận giúp cả.", "09:41", "Chưa nhận hàng", True),
    ("t2", "T", "Võ Thanh Tâm", "Mình không đổi được số điện thoại, báo lỗi mã OTP hết hạn.", "09:20", "Khác", True),
    ("t3", "S", "Shop Cây Cảnh Thủ Đức", "Ahamove · Mình giao trong ngày, khách hay hỏi Ahamove.", "08:55", "Xin thêm hãng", False),
    ("t4", "N", "Trương Bảo Ngọc", "Bạn kiểm tra lại với bưu cục Cầu Giấy giúp mình nhé.", "08:30", "Chưa nhận hàng", True),
    ("t5", "P", "Nguyễn Văn Phúc", "App hay tự thoát khi mình quay video đăng tin.", "Hôm qua", "Khác", False),
    ("t6", "Đ", "Đồ Cũ Hải Châu", "Viettel Post nội tỉnh · Mình gửi nội tỉnh Đà Nẵng.", "Hôm qua", "Xin thêm hãng", True),
    ("t7", "T", "Lê Minh Tuấn", "GHN báo giao rồi mà mình chưa thấy.", "Thứ Hai", "Chưa nhận hàng", False),
]
KIND_TONE = {"Chưa nhận hàng": "bg-primary", "Xin thêm hãng": "bg-tertiary", "Khác": "bg-outline"}


def queue():
    rows = "".join(f"""<a id="q-{tid}" href="#q-{tid}" class="{"bg-surface-container" if tid == "t1" else "hov"} flex gap-3 rounded-[8px] px-3 py-2.5">
  {avatar(ch)}
  <span class="min-w-0 flex-1">
    <span class="flex items-center gap-2"><span class="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{escape(name)}</span><span class="tnum text-[12px] text-on-surface-variant">{when}</span></span>
    <span class="mt-0.5 block truncate text-[12.5px]">{escape(line)}</span>
    <span class="mt-1 flex items-center gap-1.5 text-[11.5px] text-on-surface-variant">{dot(KIND_TONE[kind])}{kind}
      {f'<span class="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-primary">{gi("material-symbols:auto-awesome-outline-rounded", 13)}Soạn sẵn</span>' if ready else ""}</span>
  </span>
</a>""" for tid, ch, name, line, when, kind, ready in QUEUE)
    return f"""<section class="flex w-[300px] shrink-0 flex-col border-r hair">
  <div class="flex items-center gap-2 p-3"><div class="flex h-8 flex-1 rounded-md bg-surface-container p-0.5 text-[12.5px] font-medium">
    <a id="tab-open" href="#tab-open" class="flex flex-1 items-center justify-center gap-1.5 rounded-[6px] bg-surface-container-lowest px-2 lift">Đang mở <span class="tnum text-on-surface-variant">7</span></a>
    <a id="tab-resolved" href="#tab-resolved" class="flex flex-1 items-center justify-center px-2 text-on-surface-variant">Đã xử lý</a></div>
    <a id="filter" href="#filter" class="hov flex h-8 items-center gap-1 rounded-md border hair px-2 text-[12.5px] text-on-surface-variant">{gi("filter-list-rounded", 16)}Mọi loại</a></div>
  <div class="min-h-0 flex-1 space-y-0.5 overflow-hidden px-2">{rows}</div>
  <p class="flex items-center gap-1.5 border-t hair px-4 py-2.5 text-[12px] text-on-surface-variant">{kbd("j")}{kbd("k")}Ticket trước, sau</p>
</section>"""


# --- the agent's chat ---

def src(ic, text):
    return f'<a href="#src" class="hov inline-flex h-6 items-center gap-1 rounded-[6px] border hair px-1.5 text-[12px] text-on-surface-variant">{gi(ic, 14)}{text}</a>'


def tools(aid):
    return (f'<div class="flex items-center gap-0.5 text-on-surface-variant">'
            f'<a id="copy-{aid}" href="#copy" title="Chép" class="hov flex h-7 w-7 items-center justify-center rounded-md">{gi("content-copy-outline-rounded", 15)}</a>'
            f'<a id="retry-{aid}" href="#retry" title="Hỏi lại" class="hov flex h-7 w-7 items-center justify-center rounded-md">{gi("refresh-rounded", 15)}</a></div>')


def mine(text):
    return f'<div class="flex justify-end"><p class="max-w-[80%] rounded-[14px] rounded-br-[4px] bg-surface-container px-3.5 py-2 text-[14px] leading-[21px]">{escape(text)}</p></div>'


REPLY_1 = ("Mình vừa hỏi lại GHTK: bưu tá ghi đã giao cho lễ tân toà B lúc 14:20 và có ảnh ký nhận, người ký tên Hằng. "
           "Bạn hỏi giúp lễ tân toà B nhé. Nếu lễ tân không giữ, bạn báo mình, mình nhờ người bán khiếu nại với GHTK.")
REPLY_2 = "GHTK ghi đã giao cho lễ tân toà B lúc 14:20, người ký tên Hằng. Bạn hỏi giúp lễ tân toà B nhé."


def reply(text, v, folded=False):
    if folded:
        return (f'<a id="reply-v{v}" href="#reply-v{v}" class="hov flex items-center gap-2 rounded-[10px] border hair px-3 py-2 text-on-surface-variant">'
                f'{gi("reply-rounded", 16)}<span class="min-w-0 flex-1 truncate text-[13px] line-through decoration-1">{escape(text)}</span>'
                f'<span class="shrink-0 text-[11.5px]">Bản {v} · đã thay</span>{gi("expand-more-rounded", 16)}</a>')
    return f"""<section id="reply-v{v}" class="overflow-hidden rounded-[12px] border hair bg-surface-container-lowest lift">
  <div class="flex items-center gap-2 border-b hair px-3.5 py-2.5">
    <span class="text-primary">{gi("reply-rounded", 16)}</span><p class="min-w-0 flex-1 text-[13.5px] font-semibold">Trả lời Khánh Linh</p>
    <span class="mono rounded-[5px] bg-surface-container px-1.5 text-[11px] text-on-surface-variant">v{v}</span></div>
  <p class="px-3.5 py-3 text-[14px] leading-[21px]">{escape(text)}</p>
  <div class="flex items-center gap-2 border-t hair bg-surface-container-low px-3 py-2">
    <a id="reply-send" href="#reply-send" class="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-on-primary">Gửi cho Khánh Linh{gi("send-outline-rounded", 16)}</a>
    <a id="reply-edit" href="#reply-edit" class="hov inline-flex h-8 items-center gap-1.5 rounded-md border hair bg-surface-container-lowest px-3 text-[13px] font-medium">{gi("edit-outline-rounded", 15)}Sửa</a>
    <span class="flex-1"></span><span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{kbd("Ctrl")}{kbd("↵")}</span>
  </div>
</section>"""


RESOLVE = (f'<a id="resolve" href="#resolve" class="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-on-primary">'
           f'{gi("check-rounded", 16)}Đã xử lý</a>')


def agent_chat(msgs=None, title="Báo chưa nhận hàng · Khánh Linh", meta="Mở 08:12 · iPhone X 64GB · GHTK", action=None, placeholder="Hỏi agent hoặc sửa câu trả lời…"):
    """The agent's chat for a ticket; the defaults are the open ticket after a member's edit."""
    pod = f"""<div class="flex items-center gap-3 rounded-[10px] border hair px-3 py-2">
  <span class="flex h-9 w-9 items-center justify-center rounded-[8px] bg-surface-container text-on-surface-variant">{gi("signature", 20)}</span>
  <span class="min-w-0 flex-1 leading-tight"><span class="block text-[13.5px] font-medium">Ảnh ký nhận · Hằng</span>
  <span class="mono block text-[11.5px] text-on-surface-variant">S1.A1.17373471 · 14:21</span></span>
  <a id="open-pod" href="#pod" class="hov rounded-md px-2 py-1 text-[13px] font-medium text-primary">Xem</a></div>"""
    msgs = msgs or f"""
  <div class="space-y-2">
    <div class="flex flex-wrap gap-1">{src("chat-outline-rounded", "Ticket này")}{src("local-shipping-outline-rounded", "Vận đơn GHTK")}{src("receipt-long-outline-rounded", "Đơn iPhone X")}</div>
    <p class="text-[14px] leading-[21px]">GHTK báo giao cho lễ tân toà B, có ảnh ký nhận. Khánh Linh mới hỏi bảo vệ, chưa hỏi lễ tân.</p>
    {pod}{reply(REPLY_1, 1, folded=True)}{tools("a1")}
  </div>
  {mine("Ngắn hơn, bỏ đoạn khiếu nại.")}
  <div class="space-y-2">{reply(REPLY_2, 2)}{tools("a2")}</div>"""
    return f"""<section class="flex min-w-0 flex-1 flex-col">
  <header class="flex h-[52px] shrink-0 items-center gap-3 border-b hair px-5">
    <span class="text-primary">{gi("material-symbols:auto-awesome-rounded", 20)}</span>
    <div class="min-w-0 flex-1 leading-tight"><p class="tight truncate text-[14px] font-semibold">{title}</p>
      <p class="text-[12px] text-on-surface-variant">{meta}</p></div>
    {action or RESOLVE}
    <a id="more" href="#more" class="hov flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant">{gi("more-horiz", 18)}</a>
  </header>
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_40px)]">
    <div class="mx-auto w-full max-w-[640px] space-y-4 px-6 py-5">{msgs}</div></div>
  <div class="mx-auto w-full max-w-[640px] px-6 pb-5">
    <div class="rounded-[12px] border hair bg-surface-container-lowest lift">
      <p class="min-h-[52px] px-3.5 pt-3 text-[14px] text-on-surface-variant">{placeholder}</p>
      <div class="flex items-center gap-2 px-2 pb-2">
        <a id="attach" href="#attach" class="hov flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant">{gi("add-rounded", 18)}</a>
        <span class="inline-flex h-6 items-center gap-1 rounded-[6px] bg-surface-container px-1.5 text-[12px] text-on-surface-variant">{gi("package-2-outline", 14)}Ticket · Khánh Linh</span>
        <span class="flex-1"></span>
        <a id="ask-send" href="#ask-send" class="flex h-8 w-8 items-center justify-center rounded-md bg-on-surface text-surface">{gi("arrow-upward-rounded", 18)}</a>
      </div>
    </div>
  </div>
</section>"""


# --- the end column ---

def tabs(active):
    t = [("chat", "Chat khách", '<span class="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10.5px] text-on-primary">1</span>'),
         ("info", "Thông tin", "")]
    return ('<div class="flex h-[52px] shrink-0 items-end gap-4 border-b hair px-4">' + "".join(
        f'<a id="tab-{k}" href="#tab-{k}" class="-mb-px flex h-10 items-center gap-1.5 border-b-2 text-[13px] font-medium '
        f'{"border-on-surface text-on-surface" if k == active else "border-transparent text-on-surface-variant"}">{label}{badge}</a>'
        for k, label, badge in t) + "</div>")


def row(label, value):
    return f'<div class="flex items-baseline justify-between gap-4 py-1 text-[13px]"><span class="shrink-0 text-on-surface-variant">{label}</span><span class="min-w-0 text-right">{value}</span></div>'


def block(title, body, action=""):
    return f"""<section class="border-b hair px-4 py-3.5">
  <div class="mb-2 flex items-center"><h3 class="flex-1 text-[12px] font-medium text-on-surface-variant">{title}</h3>{action}</div>{body}</section>"""


def stat(n, label):
    return f'<div class="rounded-[8px] border hair px-2.5 py-2"><p class="tnum text-[16px] font-semibold leading-5">{n}</p><p class="text-[11.5px] text-on-surface-variant">{label}</p></div>'


def info():
    person = f"""<section class="border-b hair px-4 py-4">
  <div class="flex items-center gap-3">{avatar("K", 40)}
    <div class="min-w-0 flex-1 leading-tight"><p class="tight text-[14px] font-semibold">Khánh Linh</p><p class="mono text-[11.5px] text-on-surface-variant">7b1c22e0</p></div>
    <a id="open-account" href="#account" class="hov flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant">{gi("open-in-new-rounded", 16)}</a></div>
  <div class="mt-3 flex flex-wrap gap-1.5">{pill("Hoạt động")}{pill("SĐT đã xác minh", "bg-secondary")}{pill("Từ 03/2025", "bg-outline")}</div>
  <div class="mt-3 grid grid-cols-3 gap-1.5">{stat("4", "đơn mua")}{stat("4/4", "giao xong")}{stat("0", "bị báo cáo")}</div>
</section>"""
    events = [("Đã giao hàng", "Hôm qua 14:20", "Giao lễ tân toà B · ký: Hằng", True),
              ("Đang giao hàng", "Hôm qua 08:05", "Bưu cục Bình Thạnh", False),
              ("Đã lấy hàng", "T2 16:40", "Từ Hoàng Nam, Quận 3", False)]
    tl = "".join(f"""<li class="relative flex gap-3 pb-3 last:pb-0">
  <span class="relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full {"bg-primary ring-4 ring-primary/15" if first else "bg-outline-variant"}"></span>
  <div class="min-w-0 flex-1 leading-tight"><div class="flex items-baseline gap-2"><p class="flex-1 text-[13px] {"font-medium" if first else ""}">{t}</p><p class="tnum text-[11.5px] text-on-surface-variant">{w}</p></div>
  <p class="mt-0.5 text-[12px] text-on-surface-variant">{d}</p>
  {f'<a id="tl-pod" href="#pod" class="mt-1.5 inline-flex items-center gap-1.5 rounded-[6px] border hair px-1.5 py-1 text-[12px] text-primary">{gi("image-outline-rounded", 14)}Ảnh ký nhận</a>' if first else ""}</div></li>"""
                 for t, w, d, first in events)
    order = block("Đơn", f"""<div class="flex items-center gap-3 rounded-[10px] border hair p-2.5">
  <span class="flex h-10 w-10 items-center justify-center rounded-[8px] bg-surface-container text-on-surface-variant">{gi("smartphone-outline", 22)}</span>
  <div class="min-w-0 flex-1 leading-tight"><p class="truncate text-[13.5px] font-medium">iPhone X 64GB, pin 86%</p>
    <p class="tnum text-[13px] text-tertiary">3.800.000 ₫ <span class="text-on-surface-variant">· COD đồng kiểm</span></p></div></div>
<div class="mt-2">{row("Hãng", '<span class="mono">GHTK · S1.A1.17373471</span>')}{row("Giao tới", "12 Nguyễn Gia Trí, Bình Thạnh")}</div>
<ul class="relative mt-2 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-outline-variant">{tl}</ul>""",
                  f'<a id="open-order" href="#order" class="hov rounded-md px-1.5 py-0.5 text-[12px] font-medium text-primary">Mở đơn</a>')
    seller = block("Người bán", f"""<div class="flex items-center gap-3">{avatar("H", 32)}
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[13.5px] font-medium">Hoàng Nam</p><p class="text-[12px] text-on-surface-variant"><span class="text-on-surface">4,8 ★</span> · 38 đơn · từ 2024</p></div>
  <a id="open-seller" href="#seller" class="hov flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant">{gi("open-in-new-rounded", 16)}</a></div>
<p class="mt-2 flex items-center gap-1.5 rounded-[8px] bg-surface-container-low px-2.5 py-1.5 text-[12px]">{dot("bg-tertiary")}2 lần bị báo chưa nhận hàng trong 90 ngày, cùng bưu cục</p>""")
    others = block("Ticket khác của Khánh Linh", "".join(
        f'<a id="other-{i}" href="#ticket-{i}" class="hov -mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]">{dot(tone)}<span class="min-w-0 flex-1 truncate">{t}</span>'
        f'<span class="text-[12px] text-on-surface-variant">{w}</span></a>'
        for i, (t, w, tone) in enumerate([("Lọc khu vực", "Thứ Hai", "bg-outline"), ("Xin thêm Ninja Van", "Tháng 10", "bg-tertiary")])))
    return person + order + seller + others


def customer_chat():
    def them(t, w):
        return f'<div class="max-w-[85%]"><p class="rounded-[14px] rounded-bl-[4px] bg-surface-container px-3 py-2 text-[13.5px] leading-[20px]">{escape(t)}</p><p class="tnum mt-1 px-1 text-[11px] text-on-surface-variant">{w}</p></div>'

    def us(t, w):
        return f'<div class="ml-auto max-w-[85%]"><p class="rounded-[14px] rounded-br-[4px] bg-secondary-container px-3 py-2 text-[13.5px] leading-[20px]">{escape(t)}</p><p class="tnum mt-1 px-1 text-right text-[11px] text-on-surface-variant">{w}</p></div>'
    thread = "".join([
        '<p class="text-center text-[11.5px] text-on-surface-variant">Hôm nay</p>',
        them("GHTK báo đã giao lúc 14:20 hôm qua nhưng mình chưa nhận được, nhà không ai ký nhận.", "08:12"),
        us("Chào bạn, mình đã xem lịch trình GHTK của đơn: bưu tá báo giao lúc 14:20 tại 12 Nguyễn Gia Trí, Bình Thạnh.", "Lan · 09:05"),
        us("Bạn chưa trả tiền nên không mất gì. Bạn kiểm tra giúp mình với bảo vệ toà nhà, mình cũng báo GHTK kiểm tra lại.", "Lan · 09:05"),
        '<p class="flex items-center gap-2 text-[11.5px] font-medium text-primary"><span class="h-px flex-1 bg-primary/30"></span>Mới<span class="h-px flex-1 bg-primary/30"></span></p>',
        them("Mình hỏi bảo vệ rồi, không ai nhận giúp cả.", "09:41"),
    ])
    return f"""<div class="flex min-h-0 flex-1 flex-col">
  <div class="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-hidden px-4 py-4">{thread}</div>
  <div class="px-3 pb-3"><div class="rounded-[12px] border hair bg-surface-container-lowest">
    <p class="min-h-[44px] px-3 pt-2.5 text-[13.5px] text-on-surface-variant">Trả lời Khánh Linh…</p>
    <div class="flex items-center gap-2 px-2 pb-2"><span class="flex items-center gap-1 px-1 text-[11.5px] text-on-surface-variant">{gi("visibility-outline", 14)}Tên ShopNexus</span><span class="flex-1"></span>
      <a id="send" href="#send" class="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[12.5px] font-medium text-on-primary">Gửi{gi("send-outline-rounded", 14)}</a></div>
  </div></div>
</div>"""


def page(tab, center=None, left=None, side=None):
    """tab: the end column's open tab; center, left and side replace the default panes."""
    side = side or (info() if tab == "info" else customer_chat())
    return f"""{head("Hỗ trợ · Console", CSS).replace('<script src="https://cdn.tailwindcss.com">', FONTS + '\n<script src="https://cdn.tailwindcss.com">', 1)}<body>
<div class="flex h-[900px] w-[1440px] bg-surface-container text-on-surface">
  {nav()}
  <div class="my-2 mr-2 flex min-w-0 flex-1 overflow-hidden rounded-[12px] bg-surface-container-lowest lift">
    {left or queue()}
    {center or agent_chat()}
    <aside class="flex w-[340px] shrink-0 flex-col overflow-hidden border-l hair bg-surface">{tabs(tab)}<div class="flex min-h-0 flex-1 flex-col overflow-hidden">{side}</div></aside>
  </div>
</div>
</body>
</html>
"""


SCREENS = {"geist-ticket-info": ("Hỗ trợ · Geist · Agent và Thông tin", lambda: page("info")),
           "geist-ticket-chat": ("Hỗ trợ · Geist · Agent và Chat khách", lambda: page("chat"))}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
