"""The console agent: a member's own chats with it, beside a record or on a page of their own.

The agent answers a member, never a user. It reads through read-only tools
(tickets, reports, orders and the carrier's tracking, listings, photo-similar
search, accounts and their addresses) and answers with what it found, the
sources it read as chips under the answer. It changes nothing: an answer can
end on a proposal whose button opens the console's own confirmation, or on
"Chèn vào trả lời", which puts text in the ticket's composer for the member
to send. No narration of the agent's steps; while it works, a quiet loader.

agent_pane() is the 400 px column a ticket or a report opens with "Hỏi agent";
page() writes ../mockups/agent-chat.html, the page of the member's chats.
"""
import itertools
import sys
from html import escape
from pathlib import Path

from build_home import drawer, topbar
from common import head, icon

OUT = Path(__file__).resolve().parent.parent / "mockups"
_ids = itertools.count(1)


def ask_button(on):
    cls = "bg-secondary-container text-on-secondary-container" if on else "border border-outline text-primary"
    return (f'<a id="ask-agent" href="#ask-agent" title="Hỏi agent (A)" class="state inline-flex h-9 items-center gap-1.5 rounded-full px-4 '
            f'text-label-large {cls}">{icon("auto-awesome-rounded" if on else "auto-awesome-outline-rounded", 18)}Hỏi agent</a>')


def checkbox(state):
    if state is None:
        return f'<span class="flex h-[18px] w-[18px] items-center justify-center rounded-[2px] bg-on-surface/20 text-surface">{icon("check-rounded", 14)}</span>'
    if state:
        return f'<span class="flex h-[18px] w-[18px] items-center justify-center rounded-[2px] bg-primary text-on-primary">{icon("check-rounded", 14)}</span>'
    return '<span class="block h-[18px] w-[18px] rounded-[2px] border-2 border-on-surface-variant"></span>'


def mine(text):
    return f'<div class="flex justify-end"><p class="max-w-[85%] rounded-lg-plus bg-surface-container-high px-3 py-2 text-body-medium">{escape(text)}</p></div>'


def sources(items):
    return '<div class="flex flex-wrap gap-1">' + "".join(
        f'<a id="src-{next(_ids)}" href="#src" class="state inline-flex h-6 items-center gap-1 rounded-sm border border-outline-variant px-1.5 text-label-small text-on-surface-variant">'
        f'{icon(ic, 14)}{t}</a>' for ic, t in items) + "</div>"


def answer(srcs, body, tools=""):
    return f"""<div class="space-y-1.5">
  {sources(srcs)}
  <div class="space-y-1.5 text-body-medium">{body}</div>
  {tools}
</div>"""


def answer_tools(insert=False, aid="a"):
    ins = (f'<a id="insert-{aid}" href="#insert" class="state inline-flex h-8 items-center gap-1 rounded-full bg-secondary-container px-3 text-label-large text-on-secondary-container">'
           f'{icon("reply-rounded", 16)}Chèn vào trả lời</a>' if insert else "")
    return f"""<div class="flex items-center gap-1">{ins}
  <a id="copy-{aid}" href="#copy" title="Chép" class="state flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{icon("content-copy-outline-rounded", 16)}</a>
  <a id="retry-{aid}" href="#retry" title="Hỏi lại" class="state flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{icon("refresh-rounded", 16)}</a>
</div>"""


def ask_box(placeholder, context="", big=False, running=False):
    """running: the agent is answering; the send button becomes Dừng."""
    ctx = (f'<span class="inline-flex h-7 items-center gap-1 rounded-sm bg-surface-container-highest px-2 text-label-medium text-on-surface-variant">{context}</span>'
           if context else "")
    attach = f'<a id="attach" href="#attach" title="Gắn ticket, báo cáo, tài khoản" class="state flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{icon("add-rounded", 20)}</a>'
    return f"""<div class="rounded-xl border border-outline-variant bg-surface-container-lowest {"p-3" if big else "p-2"} shadow-[0_1px_2px_rgba(0,0,0,.06)]">
  <p class="min-h-{"12" if big else "8"} px-2 py-1 text-body-{"large" if big else "medium"} text-on-surface-variant">{placeholder}</p>
  <div class="flex items-center gap-1">{attach}{ctx}<span class="flex-1"></span>
    {f'<a id="ask-stop" href="#ask-stop" title="Dừng (Esc)" class="state flex h-9 w-9 items-center justify-center rounded-full bg-on-surface text-surface">{icon("stop-rounded", 20)}</a>' if running
     else f'<a id="ask-send" href="#ask-send" title="Gửi (Enter)" class="state flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">{icon("arrow-upward-rounded", 20)}</a>'}</div>
</div>"""


def reply_block(text, version, to="Khánh Linh", folded=False):
    """A reply the agent wrote for the person; the member sends it, edits it, or asks in chat for the next version."""
    if folded:
        return (f'<a id="reply-v{version}" href="#reply-v{version}" class="state flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-on-surface-variant">'
                f'{icon("reply-rounded", 18)}<span class="min-w-0 flex-1 truncate text-body-medium line-through decoration-1">{escape(text)}</span>'
                f'<span class="shrink-0 text-label-small">Bản {version} · đã thay</span>{icon("expand-more-rounded", 18)}</a>')
    return f"""<section id="reply-v{version}" class="overflow-hidden rounded-lg border border-primary/30 bg-surface-container-lowest">
  <div class="flex items-center gap-2 bg-secondary-container/60 px-4 py-2.5">
    <span class="text-primary">{icon("reply-rounded", 18)}</span><p class="min-w-0 flex-1 text-title-small">Trả lời {to}</p>
    <span class="rounded-full bg-surface-container-lowest px-2 py-0.5 text-label-small text-on-surface-variant">Bản {version}</span>
  </div>
  <p class="px-4 py-3 text-body-medium">{escape(text)}</p>
  <div class="flex items-center gap-2 border-t border-outline-variant px-4 py-3">
    <a id="reply-send-v{version}" href="#reply-send" class="state inline-flex h-10 shrink-0 whitespace-nowrap items-center gap-2 rounded-full bg-primary px-5 text-label-large text-on-primary">{icon("send-rounded", 18)}Gửi cho {to}</a>
    <a id="reply-edit-v{version}" href="#reply-edit" class="state inline-flex h-10 items-center rounded-full px-4 text-label-large text-primary">Sửa</a>
    <span class="flex-1"></span><span class="flex min-w-0 items-center gap-1 truncate text-body-small text-on-surface-variant">{icon("support-agent-rounded", 16)}Gửi tên ShopNexus</span>
  </div>
</section>"""


REPLY_1 = ("Mình vừa hỏi lại GHTK: bưu tá ghi đã giao cho lễ tân toà B lúc 14:20 và có ảnh ký nhận, người ký tên Hằng. "
           "Bạn hỏi giúp lễ tân toà B nhé. Nếu lễ tân không giữ, bạn báo mình, mình nhờ người bán khiếu nại với GHTK.")
REPLY_2 = "GHTK ghi đã giao cho lễ tân toà B lúc 14:20, người ký tên Hằng. Bạn hỏi giúp lễ tân toà B nhé."


def ticket_read_msgs():
    """The agent's read of a ticket when it opens, then a member's edit of the reply it wrote."""
    pod = f"""<div class="flex items-center gap-3 rounded-md bg-surface-container-low px-3 py-2">
  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-container-highest text-on-surface-variant">{icon("signature-rounded", 20)}</span>
  <span class="min-w-0 flex-1"><span class="block text-title-small">Ảnh ký nhận · Hằng</span><span class="block font-mono text-body-small text-on-surface-variant">S1.A1.17373471 · 14:21</span></span>
  <a id="open-pod" href="#pod" class="state rounded-full px-2 py-1 text-label-large text-primary">Xem</a>
</div>"""
    return "".join([
        answer([("chat-outline-rounded", "Ticket này"), ("local-shipping-outline-rounded", "Vận đơn GHTK"), ("receipt-long-outline-rounded", "Đơn iPhone X")],
               "<p>GHTK báo giao cho lễ tân toà B, có ảnh ký nhận. Khánh Linh mới hỏi bảo vệ, chưa hỏi lễ tân.</p>" + pod + reply_block(REPLY_1, 1, folded=True),
               answer_tools(aid="t1")),
        mine("Ngắn hơn, bỏ đoạn khiếu nại."),
        answer([], reply_block(REPLY_2, 2), answer_tools(aid="t2")),
    ])


def agent_pane(msgs=None, placeholder="Hỏi về ticket này", context=None, wide=False):
    """The record's chat with the agent, in place of the facts column; the ticket's by default."""
    context = context or icon("package-2-outline-rounded", 14) + "Ticket · Khánh Linh"
    msgs = msgs or "".join([
        mine("Khánh Linh nói bảo vệ không nhận. GHTK có ảnh ký nhận không, ai ký?"),
        answer([("local-shipping-outline-rounded", "Vận đơn GHTK"), ("chat-outline-rounded", "Ticket này")], """
<p>Có. Bưu tá ghi “Giao lễ tân toà B”, ảnh ký nhận lúc 14:21, người ký ghi <b class="font-medium">Hằng</b>.</p>
<p>Khánh Linh mới hỏi bảo vệ, chưa hỏi lễ tân.</p>
<div class="flex items-center gap-3 rounded-md bg-surface-container-low px-3 py-2">
  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-container-highest text-on-surface-variant">""" + icon("signature-rounded", 20) + """</span>
  <span class="min-w-0 flex-1"><span class="block text-title-small">Ảnh ký nhận</span><span class="block font-mono text-body-small text-on-surface-variant">S1.A1.17373471 · 14:21</span></span>
  <a id="open-pod" href="#pod" class="state rounded-full px-2 py-1 text-label-large text-primary">Xem</a>
</div>""", answer_tools(insert=True, aid="a1")),
        mine("Người bán này bị báo chưa nhận hàng lần nào chưa?"),
        answer([("support-agent-rounded", "Ticket của Hoàng Nam"), ("receipt-long-outline-rounded", "Đơn 90 ngày")], """
<p>2 lần trong 90 ngày, cả hai đều qua GHTK bưu cục Bình Thạnh. 38 đơn còn lại giao bình thường.</p>
<ul class="divide-y divide-outline-variant rounded-md bg-surface-container-low px-3">
  <li class="flex items-center gap-2 py-2"><span class="min-w-0 flex-1"><span class="block truncate">Tai nghe AirPods Pro</span><span class="block text-body-small text-on-surface-variant">Nhận được sau 2 ngày · 10/2026</span></span><a id="past-1" href="#ticket-p1" class="text-label-large text-primary">Mở</a></li>
  <li class="flex items-center gap-2 py-2"><span class="min-w-0 flex-1"><span class="block truncate">Apple Watch S7</span><span class="block text-body-small text-on-surface-variant">Hàng hoàn về người bán · 09/2026</span></span><a id="past-2" href="#ticket-p2" class="text-label-large text-primary">Mở</a></li>
</ul>""", answer_tools(aid="a2")),
    ])
    return f"""<aside class="flex {"min-w-0 flex-1" if wide else "w-[400px] shrink-0"} flex-col border-l border-outline-variant bg-surface">
  <div class="flex items-center gap-2 border-b border-outline-variant px-3 py-2">
    <span class="text-primary">{icon("auto-awesome-rounded", 20)}</span><h3 class="flex-1 text-title-small">Agent</h3>
    <a id="agent-new" href="#agent-new" title="Cuộc mới" class="state flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{icon("edit-square-outline-rounded", 18)}</a>
    <a id="agent-expand" href="#agent-page" title="Mở trang Agent" class="state flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{icon("open-in-full-rounded", 18)}</a>
    <a id="agent-close" href="#agent-close" title="Đóng" class="state flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{icon("close-rounded", 18)}</a>
  </div>
  <div class="flex min-h-0 flex-1 flex-col justify-end gap-4 overflow-hidden px-4 py-3 [mask-image:linear-gradient(to_bottom,transparent,black_48px)]">{msgs}</div>
  <div class="p-3 pt-0">{ask_box(placeholder, context)}</div>
</aside>"""


# The member's chats: title, what it is about (icon, label), when.
THREADS = [
    ("Hôm nay", [
        ("g1", "Nhóm Đồ Cũ Gò Vấp và Trần Đức Anh", "flag-outline-rounded", "Báo cáo"),
        ("g2", "Ảnh ký nhận GHTK của Khánh Linh", "package-2-outline-rounded", "Ticket"),
        ("g3", "Son Dior 999 có phải hàng giả", "flag-outline-rounded", "Báo cáo"),
    ]),
    ("Hôm qua", [
        ("g4", "Tin súng hơi đăng tuần này", "search-rounded", ""),
        ("g5", "Lê Thị Hồng bị báo lừa đảo", "flag-outline-rounded", "Báo cáo"),
        ("g6", "Ninja Van được xin bao nhiêu lần", "local-shipping-outline-rounded", "Ticket"),
    ]),
    ("7 ngày trước", [
        ("g7", "Mẫu tin nhắn đòi cọc mới", "search-rounded", ""),
        ("g8", "Võ Thanh Tâm không đổi được số", "package-2-outline-rounded", "Ticket"),
    ]),
]


def thread_list():
    groups = []
    for day, rows in THREADS:
        items = "".join(
            f'<a id="thread-{tid}" href="#thread-{tid}" class="state flex items-center gap-2 rounded-full px-3 py-2 {"bg-secondary-container text-on-secondary-container" if tid == "g1" else ""}">'
            f'<span class="shrink-0 text-on-surface-variant">{icon(ic, 18)}</span><span class="min-w-0 flex-1 truncate text-body-medium">{escape(t)}</span></a>'
            for tid, t, ic, _ in rows)
        groups.append(f'<p class="px-3 pb-1 pt-3 text-label-medium text-on-surface-variant">{day}</p>{items}')
    return f"""<section class="flex w-72 shrink-0 flex-col rounded-lg bg-surface-container-lowest p-2">
  <a id="thread-new" href="#thread-new" class="state flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-label-large text-on-primary">{icon("edit-square-outline-rounded", 18)}Cuộc mới</a>
  <div class="mt-2 flex h-10 items-center gap-2 rounded-full bg-surface-container-high px-3 text-body-medium text-on-surface-variant">{icon("search-rounded", 18)}Tìm cuộc trò chuyện</div>
  <div class="min-h-0 flex-1 overflow-hidden">{"".join(groups)}</div>
</section>"""


ACCOUNTS = [
    ("Trần Đức Anh", "8e2f41a9", "Đang hoạt động", "Chung địa chỉ lấy hàng với Đồ Cũ Gò Vấp"),
    ("Nguyễn Tấn Phát", "2f6c90b1", "Đã khoá 12/11", "Cùng ảnh xe Exciter trong 3 tin"),
    ("Bùi Văn Khang", "6a1d3e77", "Đã khoá 12/11", "Cùng mẫu tin nhắn đòi cọc"),
]


def chat(second=None, running=False):
    """second: what stands in for the second answer (still running, failed); running: the box shows Dừng."""
    rows = "".join(f"""<tr class="border-t border-outline-variant">
  <td class="py-2 pr-3"><a id="acc-{aid}" href="#account-{aid}" class="block text-title-small text-primary">{n}</a><span class="font-mono text-body-small text-on-surface-variant">{aid}</span></td>
  <td class="py-2 pr-3 text-body-small {"text-error" if st.startswith("Đã") else ""}">{st}</td>
  <td class="py-2 text-body-medium">{why}</td></tr>""" for n, aid, st, why in ACCOUNTS)
    first = answer([("flag-outline-rounded", "2 ca báo cáo"), ("home-pin-outline-rounded", "Địa chỉ lấy hàng"),
                    ("image-search-rounded", "Ảnh giống nhau"), ("forum-outline-rounded", "Tin nhắn có cảnh báo")], f"""
<p>Có. Trần Đức Anh nối với nhóm qua 3 tài khoản; 2 trong số đó đã bị khoá hôm 12/11.</p>
<table class="w-full text-left"><thead><tr class="text-label-medium text-on-surface-variant"><th class="pb-1 font-medium">Tài khoản</th><th class="pb-1 font-medium">Trạng thái</th><th class="pb-1 font-medium">Nối qua</th></tr></thead><tbody>{rows}</tbody></table>
<p>Cả nhóm giờ là 7 tài khoản đang hoạt động, 14 tin đang bán.</p>""", answer_tools(aid="b1"))
    done = answer([("receipt-long-outline-rounded", "Đơn đang giao")], """
<p>2 đơn đang giao, cả hai đều COD đồng kiểm nên người mua chưa trả tiền:</p>
<ul class="divide-y divide-outline-variant rounded-md bg-surface-container-low px-3">
  <li class="flex items-center gap-2 py-2"><span class="min-w-0 flex-1"><span class="block">Exciter 155 2023 · <span class="text-tertiary">31.500.000 ₫</span></span><span class="block text-body-small text-on-surface-variant">Người mua Hữu Phước · GHN đang giao</span></span><a id="order-1" href="#order-1" class="text-label-large text-primary">Mở</a></li>
  <li class="flex items-center gap-2 py-2"><span class="min-w-0 flex-1"><span class="block">iPhone 13 128GB · <span class="text-tertiary">5.900.000 ₫</span></span><span class="block text-body-small text-on-surface-variant">Người mua Gia Hân · GHTK đã lấy hàng</span></span><a id="order-2" href="#order-2" class="text-label-large text-primary">Mở</a></li>
</ul>
<section class="rounded-lg bg-error-container/60 px-4 py-3">
  <p class="flex items-center gap-1.5 text-label-large text-error">""" + icon("auto-awesome-rounded", 18) + """Đề xuất</p>
  <p class="mt-0.5 text-title-medium">Khoá 7 tài khoản, ẩn 14 tin, báo 2 người mua</p>
  <a id="review-proposal" href="#review" class="state mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-error px-4 text-label-large text-on-error">""" + icon("checklist-rounded", 18) + """Duyệt từng tài khoản</a>
</section>""", answer_tools(aid="b2"))
    second = done if second is None else second
    return f"""<section class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-container-lowest">
  <header class="flex items-center gap-2 border-b border-outline-variant px-4 py-2">
    <h2 class="min-w-0 flex-1 truncate text-title-small">Nhóm Đồ Cũ Gò Vấp và Trần Đức Anh</h2>
    <a id="about-case" href="#case-c2" class="state inline-flex h-8 items-center gap-1 rounded-sm bg-surface-container-high px-2 text-label-medium text-on-surface-variant">{icon("flag-outline-rounded", 16)}Báo cáo · Đồ Cũ Gò Vấp{icon("arrow-outward-rounded", 14)}</a>
  </header>
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_56px)]">
    <div class="mx-auto w-full max-w-[720px] space-y-5 px-6 py-4">
      {mine("6 tài khoản nhóm Đồ Cũ Gò Vấp có liên quan Trần Đức Anh không?")}
      {first}
      {mine("Trong nhóm có ai đang có đơn đang giao không?")}
      {second}
    </div>
  </div>
  <div class="mx-auto w-full max-w-[720px] px-6 pb-4">{ask_box("Hỏi tiếp", "", big=True, running=running)}</div>
</section>"""


def page(main=None):
    """main: the content beside the thread list, the open chat by default."""
    return f"""{head("Agent · Console")}<body>
<div class="flex h-[900px] w-[1440px] bg-surface text-on-surface">
  {drawer("moderator", active="agent", open_tickets=7, open_reports=12, agent=True)}
  <div class="flex min-w-0 flex-1 flex-col">
    {topbar("moderator", "Agent")}
    <main class="flex min-h-0 flex-1 gap-2 px-5 pb-5">
      {main or thread_list() + chat()}
    </main>
  </div>
</div>
</body>
</html>
"""


SCREENS = {"agent-chat": ("Agent · Cuộc trò chuyện", page)}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
