"""Hỗ trợ: the queue of support tickets and one ticket open beside it.

Writes ../mockups/support-<state>.html. Each ticket is its own chat between the
person and ShopNexus; members answer in it as ShopNexus, and the
person sees only "ShopNexus". The member who wrote each reply shows under it
here and in the audit log. Content follows the planned endpoints:
GET /v1/console/support/tickets (status, kind), GET .../tickets/{id} with the
person, the order and their other tickets, POST .../replies, .../resolve and
.../reopen.

  support-open      Báo chưa nhận hàng, open, answered once.
  support-resolved  Xin thêm hãng, resolved: the automatic note, "Mở lại".
"""
import sys
from html import escape
from pathlib import Path

from build_home import drawer, topbar
from common import head, icon

OUT = Path(__file__).resolve().parent.parent / "mockups"

KINDS = {
    "not_received": ("package-2-outline-rounded", "Báo chưa nhận hàng"),
    "carrier_request": ("local-shipping-outline-rounded", "Xin thêm hãng"),
    "other": ("chat-outline-rounded", "Yêu cầu khác"),
}

# The open queue, newest activity first: id, kind, person, account id, last line, when, whose turn.
QUEUE = [
    ("t1", "not_received", "Khánh Linh", "7b1c22e0", "Mình hỏi bảo vệ rồi, không ai nhận giúp cả.", "09:41", "them"),
    ("t2", "other", "Võ Thanh Tâm", "c27d9e18", "Mình không đổi được số điện thoại, báo lỗi mã OTP hết hạn.", "09:20", "them"),
    ("t3", "carrier_request", "Shop Cây Cảnh Thủ Đức", "a90f51c4", "Ahamove · Mình giao trong ngày, khách hay hỏi Ahamove.", "08:55", "them"),
    ("t4", "not_received", "Trương Bảo Ngọc", "a61f3b08", "Bạn kiểm tra lại với bưu cục Cầu Giấy giúp mình nhé.", "08:30", "us"),
    ("t5", "other", "Nguyễn Văn Phúc", "5c90de21", "App hay tự thoát khi mình quay video đăng tin.", "Hôm qua", "them"),
    ("t6", "carrier_request", "Đồ Cũ Hải Châu", "3d72b8e5", "Viettel Post nội tỉnh · Mình gửi nội tỉnh Đà Nẵng.", "Hôm qua", "us"),
    ("t7", "not_received", "Lê Minh Tuấn", "e19a0c37", "GHN báo giao rồi mà mình chưa thấy.", "Thứ Hai", "them"),
]
RESOLVED = [
    ("r1", "carrier_request", "Khánh Linh", "7b1c22e0", "Ninja Van · Mình gửi Ninja Van vì gần nhà, phí rẻ hơn GHTK.", "10:12", "us"),
    ("r2", "other", "Bùi Quang Huy", "0f6e2d91", "Cảm ơn bạn, mình đăng được rồi.", "09:02", "them"),
    ("r3", "not_received", "Phạm Thu Trang", "6c3e7a10", "Mình nhận được rồi, shipper giao nhầm nhà bên.", "Hôm qua", "them"),
    ("r4", "other", "Hồ Ngọc Ánh", "b47d09e2", "Đã sửa, bạn cập nhật bản 2.4 nhé.", "Thứ Hai", "us"),
]

ME = "Lan"


def kind_badge(kind, size=40):
    ic, _ = KINDS[kind]
    tone = {"not_received": "bg-secondary-container text-on-secondary-container",
            "carrier_request": "bg-surface-container-highest text-on-surface-variant",
            "other": "bg-surface-container-high text-on-surface-variant"}[kind]
    return f'<span class="flex h-[{size}px] w-[{size}px] shrink-0 items-center justify-center rounded-full {tone}">{icon(ic, size // 2)}</span>'


def queue(rows, active, status):
    tabs = [("open", "Đang mở", len(QUEUE)), ("resolved", "Đã xử lý", None)]
    seg = "".join(
        f'<a id="status-{k}" href="#status-{k}" class="state flex h-10 flex-1 items-center justify-center gap-2 text-label-large '
        f'{"bg-secondary-container text-on-secondary-container" if k == status else "text-on-surface"} '
        f'{"rounded-l-full" if i == 0 else "rounded-r-full border-l border-outline"}">'
        f'{icon("check", 18) if k == status else ""}{label}{f" · {n}" if n else ""}</a>'
        for i, (k, label, n) in enumerate(tabs))
    chips = "".join(
        f'<a id="kind-{k}" href="#kind-{k}" class="state inline-flex h-8 items-center gap-1 rounded-sm px-3 text-label-large '
        f'{"bg-secondary-container text-on-secondary-container" if k == "all" else "border border-outline-variant text-on-surface-variant"}">'
        f'{icon("check", 18) if k == "all" else ""}{label}</a>'
        for k, label in [("all", "Tất cả"), ("not_received", "Chưa nhận hàng"), ("carrier_request", "Xin thêm hãng"), ("other", "Khác")])
    items = []
    for tid, kind, name, aid, line, when, turn in rows:
        on = tid == active
        wait = (f'<span class="inline-flex items-center gap-1 text-label-medium text-primary">{icon("reply-rounded", 16)}Chờ trả lời</span>'
                if turn == "them" and status == "open" else "")
        items.append(f"""<a id="ticket-{tid}" href="#ticket-{tid}" class="state flex gap-3 rounded-lg px-3 py-3 {"bg-secondary-container" if on else ""}">
  {kind_badge(kind)}
  <span class="min-w-0 flex-1">
    <span class="flex items-baseline gap-2"><span class="min-w-0 flex-1 truncate text-title-small">{escape(name)}</span><span class="shrink-0 text-body-small text-on-surface-variant">{when}</span></span>
    <span class="block text-body-small text-on-surface-variant">{KINDS[kind][1]} · <span class="font-mono">{aid}</span></span>
    <span class="mt-0.5 block truncate text-body-medium {"text-on-surface" if turn == "them" else "text-on-surface-variant"}">{escape(line)}</span>
    {f'<span class="mt-1 block">{wait}</span>' if wait else ""}
  </span>
</a>""")
    return f"""<section class="flex w-[360px] shrink-0 flex-col rounded-xl bg-surface-container-lowest">
  <div class="space-y-3 p-4 pb-2">
    <div class="flex rounded-full border border-outline">{seg}</div>
    <div class="flex flex-wrap gap-2">{chips}</div>
  </div>
  <div class="min-h-0 flex-1 space-y-1 overflow-hidden px-2 pb-2">{"".join(items)}</div>
  <p class="flex items-center gap-2 border-t border-outline-variant px-4 py-3 text-body-small text-on-surface-variant">
    <kbd class="rounded-xs border border-outline-variant px-1.5 font-mono text-label-small">j</kbd><kbd class="rounded-xs border border-outline-variant px-1.5 font-mono text-label-small">k</kbd>Ticket trước, sau</p>
</section>"""


def bubble(side, text, foot):
    if side == "them":
        return f"""<div class="flex flex-col items-start gap-1"><p class="max-w-[80%] rounded-lg-plus bg-surface-container-high px-3 py-2 text-body-medium">{escape(text)}</p>
<p class="px-2 text-body-small text-on-surface-variant">{foot}</p></div>"""
    return f"""<div class="flex flex-col items-end gap-1"><p class="max-w-[80%] rounded-lg-plus bg-secondary-container px-3 py-2 text-body-medium text-on-surface">{escape(text)}</p>
<p class="flex items-center gap-1 px-2 text-body-small text-on-surface-variant">{foot}</p></div>"""


def card(kind, status, body, foot, about=""):
    ic, name = KINDS[kind]
    chip = (f'<span class="inline-flex items-center gap-1 rounded-sm bg-surface-container-lowest px-2 py-0.5 text-label-medium text-on-surface-variant">{icon("schedule-outline-rounded", 14)}Đang mở</span>'
            if status == "open" else
            f'<span class="inline-flex items-center gap-1 rounded-sm bg-surface-container-lowest px-2 py-0.5 text-label-medium text-primary">{icon("check-circle-outline-rounded", 14)}Đã xử lý</span>')
    return f"""<div class="flex flex-col items-start gap-1"><article class="w-[90%] rounded-lg-plus rounded-bl-xs bg-surface-container p-4">
  <div class="flex items-center gap-2"><span class="text-primary">{icon(ic, 20)}</span><span class="min-w-0 flex-1 truncate text-title-small">{name}</span></div>
  {about}
  <p class="mt-2 text-body-medium">{escape(body)}</p>
</article><p class="px-2 text-body-small text-on-surface-variant">{foot}</p></div>"""


def event(ic, text):
    return f'<p class="flex items-center justify-center gap-1.5 py-1 text-label-medium text-on-surface-variant">{icon(ic, 16)}{text}</p>'


def day(label):
    return f'<p class="py-1 text-center text-label-medium text-on-surface-variant">{label}</p>'


ORDER_ABOUT = """<div class="mt-3 flex items-center gap-3 rounded-md bg-surface-container-lowest px-3 py-2">
  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-on-surface-variant">{phone}</span>
  <span class="min-w-0"><span class="block truncate text-title-small">iPhone X 64GB, pin 86%</span>
  <span class="block font-mono text-body-small text-on-surface-variant">GHTK · S1.A1.17373471</span></span>
</div>"""


def composer(placeholder):
    return f"""<div class="border-t border-outline-variant p-3">
  <div class="flex items-end gap-2 rounded-xl bg-surface-container-high py-2 pl-4 pr-2">
    <span class="min-h-10 flex-1 py-2 text-body-medium text-on-surface-variant">{placeholder}</span>
    <a id="reply-send" href="#reply-send" title="Gửi (Ctrl+Enter)" class="state flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary">{icon("send-rounded", 20)}</a>
  </div>
  <p class="mt-2 flex items-center gap-1.5 px-1 text-body-small text-on-surface-variant">{icon("support-agent-rounded", 16)}Người dùng thấy tên ShopNexus</p>
</div>"""


def fact(label, value, mono=False):
    """A label over its value, so a long value keeps its line in the 272 px column."""
    return (f'<div class="py-1"><p class="text-body-small text-on-surface-variant">{label}</p>'
            f'<p class="text-body-medium {"font-mono" if mono else ""}">{value}</p></div>')


def side_card(title, body):
    return f'<section class="rounded-lg bg-surface-container-low p-4"><h3 class="mb-1 text-title-small text-on-surface-variant">{title}</h3>{body}</section>'


def person():
    return side_card("Người gửi", f"""<a id="person" href="#account-7b1c22e0" class="state -mx-2 mb-1 flex items-center gap-3 rounded-md px-2 py-1.5">
  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-title-small text-on-surface-variant">K</span>
  <span class="min-w-0 flex-1"><span class="block truncate text-title-small">Khánh Linh</span><span class="block font-mono text-body-small text-on-surface-variant">7b1c22e0</span></span>
  {icon("chevron-right-rounded", 20, "text-outline")}
</a>
{fact("Trạng thái", '<span class="rounded-sm bg-secondary-container px-2 py-0.5 text-label-medium text-on-secondary-container">Hoạt động</span>')}
{fact("Tham gia", "03/2025")}
{fact("90 ngày", "4 đơn · 0 giao không thành")}""")


def order():
    events = "".join(
        f'<li class="flex items-start gap-2 py-1 text-body-small"><span class="mt-1.5 h-2 w-2 shrink-0 rounded-full {"bg-primary" if i == 0 else "bg-outline-variant"}"></span>'
        f'<span class="flex-1">{t}</span><span class="text-body-small text-on-surface-variant">{w}</span></li>'
        for i, (t, w) in enumerate([("Đã giao hàng", "Hôm qua 14:20"), ("Đang giao hàng", "Hôm qua 08:05"), ("Đã lấy hàng", "T2 16:40")]))
    return side_card("Đơn liên quan", f"""<p class="text-title-small">iPhone X 64GB, pin 86%</p>
{fact("Giá chốt", '<span class="text-tertiary">3.800.000 ₫</span>')}
{fact("Người bán", 'Hoàng Nam <span class="font-mono text-body-small text-on-surface-variant">d4a81f63</span>')}
{fact("Đơn", '<span class="rounded-sm bg-surface-container-high px-2 py-0.5 text-label-medium text-on-surface-variant">Đã gửi</span>')}
{fact("GHTK", "S1.A1.17373471", mono=True)}
<p class="mt-2 text-label-medium text-primary">GHTK báo</p>
<ul>{events}</ul>""")


def others(rows):
    out = "".join(f"""<a id="other-{tid}" href="#ticket-{tid}" class="state -mx-2 flex items-center gap-3 rounded-md px-2 py-2">
  {kind_badge(kind, 32)}<span class="min-w-0 flex-1"><span class="block truncate text-body-medium">{label}</span><span class="block text-body-small text-on-surface-variant">{when}</span></span>
  <span class="text-label-medium {"text-primary" if st == "Đã xử lý" else "text-on-surface-variant"}">{st}</span></a>"""
                  for tid, kind, label, when, st in rows)
    return side_card("Ticket khác của người này", out)


def panel(state):
    phone = icon("smartphone-outline", 22)
    if state == "open":
        kind, title, opened = "not_received", "Báo chưa nhận hàng", "Mở 08:12 hôm nay"
        actions = f"""<a id="resolve" href="#resolve" class="state inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-label-large text-on-primary">{icon("check-rounded", 20)}Đã xử lý</a>"""
        chip = f'<span class="inline-flex items-center gap-1 rounded-sm bg-secondary-container px-2 py-0.5 text-label-medium text-on-secondary-container">{icon("schedule-outline-rounded", 14)}Đang mở</span>'
        thread = "".join([
            day("Hôm nay"),
            card("not_received", "open", "GHTK báo đã giao lúc 14:20 hôm qua nhưng mình chưa nhận được, nhà không ai ký nhận.",
                 "08:12", ORDER_ABOUT.format(phone=phone)),
            bubble("us", "Chào bạn, mình đã xem lịch trình GHTK của đơn: bưu tá báo giao lúc 14:20 tại 12 Nguyễn Gia Trí, Bình Thạnh.", f"{ME} · 09:05"),
            bubble("us", "Bạn chưa trả tiền nên không mất gì. Bạn kiểm tra giúp mình với bảo vệ toà nhà, mình cũng báo GHTK kiểm tra lại.", f"{ME} · 09:05"),
            bubble("them", "Mình hỏi bảo vệ rồi, không ai nhận giúp cả.", "09:41"),
        ])
        side = person() + order() + others([("o1", "other", "Yêu cầu khác · Lọc khu vực", "Thứ Hai", "Đã xử lý"), ("o2", "carrier_request", "Xin thêm hãng · Ninja Van", "Tháng 10", "Đã xử lý")])
        place = "Trả lời Khánh Linh"
    else:
        kind, title, opened = "carrier_request", "Xin thêm hãng", "Đã xử lý 10:12 hôm nay · Lan"
        actions = f"""<a id="reopen" href="#reopen" class="state inline-flex h-10 items-center gap-2 rounded-full border border-outline px-5 text-label-large text-primary">{icon("undo-rounded", 20)}Mở lại</a>"""
        chip = f'<span class="inline-flex items-center gap-1 rounded-sm bg-surface-container-high px-2 py-0.5 text-label-medium text-primary">{icon("check-circle-outline-rounded", 14)}Đã xử lý</span>'
        thread = "".join([
            day("Hôm nay"),
            card("carrier_request", "resolved", "Mình gửi Ninja Van vì gần nhà, phí rẻ hơn GHTK.", "09:30",
                 '<p class="mt-3 text-title-medium">Ninja Van</p>'),
            bubble("us", "Cảm ơn bạn. Ninja Van chưa có API cho tài khoản người bán, nên ShopNexus chưa đọc được vận đơn. Khi có, bạn sẽ thấy Ninja Van trong Đơn vị giao.", f"{ME} · 10:10"),
            bubble("us", "Đã ghi nhận hãng Ninja Van.", f'{icon("bolt-rounded", 14)}Tự gửi khi đóng · 10:12'),
            event("check-circle-outline-rounded", "Lan đánh dấu đã xử lý · Xin thêm hãng"),
        ])
        side = person() + side_card("Yêu cầu", f"""{fact("Hãng", "Ninja Van")}
{fact("Cùng xin hãng này", "12 người bán trong 30 ngày")}""") + others([("o1", "other", "Yêu cầu khác · Lọc khu vực", "Thứ Hai", "Đã xử lý"), ("o3", "not_received", "Báo chưa nhận hàng · iPhone X", "Hôm nay", "Đang mở")])
        place = "Nhắn tiếp không mở lại ticket"
    ic, _ = KINDS[kind]
    return f"""<section class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-surface-container-lowest">
  <header class="flex items-center gap-3 border-b border-outline-variant px-5 py-3">
    {kind_badge(kind)}
    <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><h2 class="truncate text-title-medium">{title}</h2>{chip}</div>
    <p class="text-body-small text-on-surface-variant">Khánh Linh · {opened}</p></div>
    {actions}
    <a id="close-panel" href="#close-panel" title="Đóng (Esc)" class="state flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant">{icon("close-rounded", 20)}</a>
  </header>
  <div class="flex min-h-0 flex-1">
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden px-5 py-4 [mask-image:linear-gradient(to_bottom,transparent,black_56px)]">{thread}</div>
      {composer(place)}
    </div>
    <aside class="w-[272px] shrink-0 space-y-3 overflow-hidden border-l border-outline-variant p-3">{side}</aside>
  </div>
</section>"""


def page(state):
    rows, active, status = (QUEUE, "t1", "open") if state == "open" else (RESOLVED, "r1", "resolved")
    return f"""{head("Hỗ trợ · Console")}<body>
<div class="flex h-[900px] w-[1440px] bg-surface text-on-surface">
  {drawer("moderator", active="support", open_tickets=len(QUEUE))}
  <div class="flex min-w-0 flex-1 flex-col">
    {topbar("moderator", "Hỗ trợ")}
    <main class="flex min-h-0 flex-1 gap-4 px-6 pb-6">
      {queue(rows, active, status)}
      {panel(state)}
    </main>
  </div>
</div>
</body>
</html>
"""


SCREENS = {"support-open": ("Hỗ trợ · Ticket đang mở", lambda: page("open")),
           "support-resolved": ("Hỗ trợ · Ticket đã xử lý", lambda: page("resolved"))}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
