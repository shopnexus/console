"""The rest of Hỗ trợ and the dashboard handoff in the Geist look.

Writes ../mockups/<name>.html with the M3 builders' names (build_support.py,
build_signin.py), so each lands on its draft as a new version:

  support-open      a ticket as it opens: the agent's read and the reply it wrote
  support-draft     the member editing that reply in place
  support-ask       the member asking the agent about the seller
  support-agent     the reply after a chat edit (build_geist.page's default)
  support-resolved  a resolved carrier request: the reply sent, the closing note
  dashboard-opening, dashboard-forbidden  the handoff to an ops dashboard
"""
# build_home first: common puts the app's tools on sys.path when it loads.
from build_home import ROLE  # noqa: F401
import sys
from html import escape
from pathlib import Path

from build_geist import CSS, FONTS, REPLY_1, agent_chat, avatar, block, dot, gi, kbd, mine, page, pill, reply, row, src, tools
from common import DASHBOARDS, LOGO, MEMBER, head

OUT = Path(__file__).resolve().parent.parent / "mockups"


def pod():
    return f"""<div class="flex items-center gap-3 rounded-[10px] border hair px-3 py-2">
  <span class="flex h-9 w-9 items-center justify-center rounded-[8px] bg-surface-container text-on-surface-variant">{gi("signature", 20)}</span>
  <span class="min-w-0 flex-1 leading-tight"><span class="block text-[13.5px] font-medium">Ảnh ký nhận · Hằng</span>
  <span class="mono block text-[11.5px] text-on-surface-variant">S1.A1.17373471 · 14:21</span></span>
  <a id="open-pod" href="#pod" class="hov rounded-md px-2 py-1 text-[13px] font-medium text-primary">Xem</a></div>"""


def read(tail):
    return f"""<div class="space-y-2">
  <div class="flex flex-wrap gap-1">{src("chat-outline-rounded", "Ticket này")}{src("local-shipping-outline-rounded", "Vận đơn GHTK")}{src("receipt-long-outline-rounded", "Đơn iPhone X")}</div>
  <p class="text-[14px] leading-[21px]">GHTK báo giao cho lễ tân toà B, có ảnh ký nhận. Khánh Linh mới hỏi bảo vệ, chưa hỏi lễ tân.</p>
  {pod()}{tail}{tools("a1")}
</div>"""


def editing():
    text = escape(REPLY_1)
    return f"""<section id="reply-v1" class="overflow-hidden rounded-[12px] border border-primary bg-surface-container-lowest ring-[3px] ring-primary/15">
  <div class="flex items-center gap-2 border-b hair px-3.5 py-2.5">
    <span class="text-primary">{gi("edit-outline-rounded", 16)}</span><p class="min-w-0 flex-1 text-[13.5px] font-semibold">Trả lời Khánh Linh</p>
    <span class="text-[11.5px] text-on-surface-variant">Đang sửa v1</span></div>
  <p class="px-3.5 py-3 text-[14px] leading-[21px]">{text[:-55]}<span class="bg-primary/15">{text[-55:]}</span><span class="ml-px inline-block h-4 w-px animate-pulse bg-on-surface align-middle"></span></p>
  <div class="flex items-center gap-2 border-t hair bg-surface-container-low px-3 py-2">
    <a id="save-send" href="#save-send" class="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-on-primary">Gửi cho Khánh Linh{gi("send-outline-rounded", 16)}</a>
    <a id="cancel-edit" href="#cancel-edit" class="hov inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium text-primary">Huỷ</a>
    <span class="flex-1"></span><span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{kbd("Ctrl")}{kbd("↵")}<span class="ml-1">{kbd("esc")}</span></span>
  </div>
</section>"""


def seller_answer():
    rows = "".join(f"""<li class="flex items-center gap-3 py-2"><span class="min-w-0 flex-1 leading-tight"><span class="block text-[13.5px]">{t}</span><span class="block text-[12px] text-on-surface-variant">{d}</span></span>
  <a id="past-{i}" href="#ticket-p{i}" class="hov rounded-md px-2 py-1 text-[13px] font-medium text-primary">Mở</a></li>"""
                   for i, (t, d) in enumerate([("Tai nghe AirPods Pro", "Nhận được sau 2 ngày · 10/2026"), ("Apple Watch S7", "Hàng hoàn về người bán · 09/2026")]))
    return f"""<div class="space-y-2">
  <div class="flex flex-wrap gap-1">{src("support-agent-outline", "Ticket của Hoàng Nam")}{src("receipt-long-outline-rounded", "Đơn 90 ngày")}</div>
  <p class="text-[14px] leading-[21px]">2 lần trong 90 ngày, cả hai đều qua GHTK bưu cục Bình Thạnh. 38 đơn còn lại giao bình thường.</p>
  <ul class="divide-y hair rounded-[10px] border hair px-3">{rows}</ul>{tools("a3")}
</div>"""


def open_():
    return page("info", center=agent_chat(read(reply(REPLY_1, 1)), placeholder="Hỏi agent hoặc sửa câu trả lời…"))


def draft():
    return page("info", center=agent_chat(read(editing())))


def ask():
    msgs = read(reply(REPLY_1, 1)) + mine("Người bán này bị báo chưa nhận hàng lần nào chưa?") + seller_answer()
    return page("info", center=agent_chat(msgs))


RESOLVED = [
    ("r1", "K", "Khánh Linh", "Ninja Van · Mình gửi Ninja Van vì gần nhà, phí rẻ hơn GHTK.", "10:12", "Xin thêm hãng"),
    ("r2", "H", "Bùi Quang Huy", "Cảm ơn bạn, mình đăng được rồi.", "09:02", "Khác"),
    ("r3", "T", "Phạm Thu Trang", "Mình nhận được rồi, shipper giao nhầm nhà bên.", "Hôm qua", "Chưa nhận hàng"),
    ("r4", "A", "Hồ Ngọc Ánh", "Đã sửa, bạn cập nhật bản 2.4 nhé.", "Thứ Hai", "Khác"),
]
TONE = {"Chưa nhận hàng": "bg-primary", "Xin thêm hãng": "bg-tertiary", "Khác": "bg-outline"}


def resolved_queue():
    rows = "".join(f"""<a id="q-{tid}" href="#q-{tid}" class="{"bg-surface-container" if tid == "r1" else "hov"} flex gap-3 rounded-[8px] px-3 py-2.5">{avatar(ch)}
  <span class="min-w-0 flex-1"><span class="flex items-center gap-2"><span class="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{escape(n)}</span><span class="tnum text-[12px] text-on-surface-variant">{w}</span></span>
  <span class="mt-0.5 block truncate text-[12.5px] text-on-surface-variant">{escape(line)}</span>
  <span class="mt-1 flex items-center gap-1.5 text-[11.5px] text-on-surface-variant">{dot(TONE[k])}{k}</span></span></a>""" for tid, ch, n, line, w, k in RESOLVED)
    return f"""<section class="flex w-[300px] shrink-0 flex-col border-r hair">
  <div class="flex items-center gap-2 p-3"><div class="flex h-8 flex-1 rounded-md bg-surface-container p-0.5 text-[12.5px] font-medium">
    <a id="tab-open" href="#tab-open" class="flex flex-1 items-center justify-center gap-1.5 px-2 text-on-surface-variant">Đang mở <span class="tnum">7</span></a>
    <a id="tab-resolved" href="#tab-resolved" class="flex flex-1 items-center justify-center rounded-[6px] bg-surface-container-lowest px-2 lift">Đã xử lý</a></div>
    <a id="filter" href="#filter" class="hov flex h-8 items-center gap-1 rounded-md border hair px-2 text-[12.5px] text-on-surface-variant">{gi("filter-list-rounded", 16)}Mọi loại</a></div>
  <div class="min-h-0 flex-1 space-y-0.5 overflow-hidden px-2">{rows}</div>
  <p class="flex items-center gap-1.5 border-t hair px-4 py-2.5 text-[12px] text-on-surface-variant">{kbd("j")}{kbd("k")}Ticket trước, sau</p>
</section>"""


def resolved():
    sent = f"""<section class="overflow-hidden rounded-[12px] border hair bg-surface-container-lowest">
  <div class="flex items-center gap-2 border-b hair bg-surface-container-low px-3.5 py-2.5">
    <span class="text-primary">{gi("check-circle-outline-rounded", 16)}</span><p class="min-w-0 flex-1 text-[13.5px] font-semibold">Đã gửi cho Khánh Linh</p>
    <span class="text-[12px] text-on-surface-variant">Lan · 10:10</span></div>
  <p class="px-3.5 py-3 text-[14px] leading-[21px] text-on-surface-variant">Cảm ơn bạn. Ninja Van chưa có API cho tài khoản người bán, nên ShopNexus chưa đọc được vận đơn. Khi có, bạn sẽ thấy Ninja Van trong Đơn vị giao.</p>
</section>"""
    msgs = f"""<div class="space-y-2">
  <div class="flex flex-wrap gap-1">{src("chat-outline-rounded", "Ticket này")}{src("local-shipping-outline-rounded", "Hãng được xin")}</div>
  <p class="text-[14px] leading-[21px]">Ninja Van được 12 người bán xin trong 30 ngày. Hãng chưa có API cho tài khoản người bán.</p>
  {sent}{tools("r1")}
</div>
<p class="flex items-center justify-center gap-1.5 text-[12px] text-on-surface-variant">{gi("check-circle-outline-rounded", 14)}Lan đánh dấu đã xử lý · 10:12</p>"""
    reopen = f'<a id="reopen" href="#reopen" class="hov inline-flex h-8 items-center gap-1.5 rounded-md border hair px-3 text-[13px] font-medium">{gi("undo-rounded", 16)}Mở lại</a>'
    center = agent_chat(msgs, "Xin thêm hãng · Khánh Linh", "Đã xử lý 10:12 · Lan", reopen, "Hỏi agent…")

    def them(t, w):
        return f'<div class="max-w-[85%]"><p class="rounded-[14px] rounded-bl-[4px] bg-surface-container px-3 py-2 text-[13.5px] leading-[20px]">{escape(t)}</p><p class="tnum mt-1 px-1 text-[11px] text-on-surface-variant">{w}</p></div>'

    def us(t, w):
        return f'<div class="ml-auto max-w-[85%]"><p class="rounded-[14px] rounded-br-[4px] bg-secondary-container px-3 py-2 text-[13.5px] leading-[20px]">{escape(t)}</p><p class="tnum mt-1 flex items-center justify-end gap-1 px-1 text-[11px] text-on-surface-variant">{w}</p></div>'
    thread = "".join([
        '<p class="text-center text-[11.5px] text-on-surface-variant">Hôm nay</p>',
        them("Mình gửi Ninja Van vì gần nhà, phí rẻ hơn GHTK. Mong ShopNexus thêm Ninja Van.", "09:30"),
        us("Cảm ơn bạn. Ninja Van chưa có API cho tài khoản người bán, nên ShopNexus chưa đọc được vận đơn. Khi có, bạn sẽ thấy Ninja Van trong Đơn vị giao.", "Lan · 10:10"),
        us("Đã ghi nhận hãng Ninja Van.", f'{gi("bolt-outline", 12)}Tự gửi khi đóng · 10:12'),
    ])
    side = f"""<div class="flex min-h-0 flex-1 flex-col">
  <div class="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-hidden px-4 py-4">{thread}</div>
  <div class="px-3 pb-3"><div class="rounded-[12px] border hair bg-surface-container-lowest"><p class="min-h-[44px] px-3 pt-2.5 text-[13.5px] text-on-surface-variant">Nhắn tiếp, không mở lại ticket…</p>
    <div class="flex items-center gap-2 px-2 pb-2"><span class="flex-1"></span><a id="send" href="#send" class="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[12.5px] font-medium text-on-primary">Gửi{gi("send-outline-rounded", 14)}</a></div></div></div>
</div>"""
    out = page("chat", center=center, left=resolved_queue(), side=side)
    return out.replace('<span class="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10.5px] text-on-primary">1</span>', "", 1)


# --- the dashboard handoff ---

def tool_tile(key, size=56, on=True):
    ic = DASHBOARDS[key][2]
    return (f'<span class="flex shrink-0 items-center justify-center rounded-[12px] border hair {"bg-surface-container-lowest text-on-surface lift" if on else "bg-surface-container text-outline"}" '
            f'style="width:{size}px;height:{size}px">{gi(ic.replace("-rounded", "") if "outline" in ic else ic, size // 2)}</span>')


def handoff(title, current, body, role="moderator"):
    others = "".join(
        f'<a id="tool-{k}" href="#tool-{k}" class="hov flex items-center gap-3 rounded-md px-2 py-1.5 {"" if role == "admin" or floor == "moderator" else "text-outline"}">{tool_tile(k, 32, role == "admin" or floor == "moderator")}'
        f'<span class="min-w-0 flex-1 text-[13px] font-medium">{name}</span>{gi("north-east-rounded" if role == "admin" or floor == "moderator" else "lock-outline", 14, "text-outline")}</a>'
        for k, (name, host, ic, floor, _) in DASHBOARDS.items() if k != current)
    html = f"""<div class="flex h-[900px] w-[1440px] flex-col bg-surface text-on-surface bg-[radial-gradient(circle,rgba(16,24,22,.08)_1px,transparent_1px)] [background-size:20px_20px]">
  <header class="flex h-16 items-center px-8"><a id="console-home" href="#console" class="flex items-center gap-2"><img src="{LOGO}" alt="ShopNexus" class="h-6 w-6 rounded-[6px]">
    <span class="tight text-[14px] font-semibold">ShopNexus</span><span class="text-[13px] text-on-surface-variant">Console</span></a><span class="flex-1"></span>
    <span class="flex items-center gap-2.5"><span class="text-right leading-tight"><span class="block text-[13px] font-medium">{MEMBER["name"]}</span><span class="block text-[11.5px] text-on-surface-variant">{ROLE[role]}</span></span>{avatar(MEMBER["initial"], 28, "bg-primary text-on-primary")}</span></header>
  <main class="flex flex-1 items-center justify-center gap-4 pb-16">
    <section class="w-[520px] rounded-[14px] border hair bg-surface-container-lowest p-8 shadow-[0_1px_2px_rgba(16,24,22,.06),0_12px_32px_rgba(16,24,22,.06)]">{body}</section>
    <aside class="w-[240px] rounded-[14px] border hair bg-surface-container-lowest p-2"><p class="px-2 pb-1 pt-1.5 text-[12px] font-medium text-on-surface-variant">Công cụ</p>{others}</aside>
  </main>
</div>"""
    return f"""{head(title + " · Console", CSS + HANDOFF_CSS).replace('<script src="https://cdn.tailwindcss.com">', FONTS + '\n<script src="https://cdn.tailwindcss.com">', 1)}<body>
{html}
</body>
</html>
"""


HANDOFF_CSS = """
  @keyframes travel { 0% { left: 0; opacity: 0 } 15% { opacity: 1 } 85% { opacity: 1 } 100% { left: calc(100% - 8px); opacity: 0 } }
  .traveller { animation: travel 1.6s var(--spatial) infinite; }
  @keyframes bar { 0% { left: -40%; width: 40% } 60% { left: 60%; width: 50% } 100% { left: 100%; width: 10% } }
  .bar { animation: bar 1.8s var(--effects) infinite; }
"""


def path(middle=""):
    return (f'<div class="relative flex h-8 flex-1 items-center"><span class="h-0 flex-1 border-t border-dashed border-outline-variant"></span>{middle}'
            f'{"" if middle else "<span class=\'traveller absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary\'></span>"}'
            f'{"<span class=\'h-0 flex-1 border-t border-dashed border-outline-variant\'></span>" if middle else ""}</div>')


def opening():
    name, host = DASHBOARDS["grafana"][:2]
    body = f"""<div class="flex items-center gap-4"><img src="{LOGO}" alt="ShopNexus" class="h-14 w-14 rounded-[12px]">{path()}{tool_tile("grafana")}</div>
<p class="mt-8 text-[12.5px] font-medium text-primary">Đang mở</p>
<h1 class="tight mt-1 text-[28px] font-semibold">{name}</h1><p class="mono mt-1 text-[13px] text-on-surface-variant">{host}</p>
<div class="relative mt-6 h-1 overflow-hidden rounded-full bg-surface-container"><span class="bar absolute inset-y-0 rounded-full bg-primary"></span></div>
<div class="mt-8 flex items-center gap-2"><a id="open-now" href="#open" class="inline-flex h-8 items-center gap-1.5 rounded-md bg-on-surface px-3 text-[13px] font-medium text-surface">Mở ngay{gi("north-east-rounded", 15)}</a>
  <a id="back" href="#console" class="hov inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium text-primary">Về console</a></div>"""
    return handoff("Đang mở Grafana", "grafana", body)


def forbidden():
    name, host = DASHBOARDS["restate"][:2]
    lock = f'<span class="mx-2 flex h-8 w-8 items-center justify-center rounded-full bg-error-container text-error">{gi("lock-outline", 16)}</span>'
    body = f"""<div class="flex items-center gap-4"><img src="{LOGO}" alt="ShopNexus" class="h-14 w-14 rounded-[12px]">{path(lock)}{tool_tile("restate", on=False)}</div>
<h1 class="tight mt-8 text-[28px] font-semibold">{name}</h1><p class="mono mt-1 text-[13px] text-on-surface-variant">{host}</p>
<p class="mt-5 inline-flex items-center gap-1.5 rounded-md bg-error-container/70 px-2.5 py-1 text-[13px] font-medium text-error">{gi("lock-outline", 15)}Cần quyền {ROLE["admin"]}</p>
<div class="mt-8"><a id="back" href="#console" class="inline-flex h-8 items-center rounded-md bg-on-surface px-3 text-[13px] font-medium text-surface">Về console</a></div>"""
    return handoff("Không mở được Restate", "restate", body)


SCREENS = {
    "support-open": open_,
    "support-draft": draft,
    "support-ask": ask,
    "support-agent": lambda: page("info"),
    "support-resolved": resolved,
    "dashboard-opening": opening,
    "dashboard-forbidden": forbidden,
}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name]())
        print("wrote", name)
