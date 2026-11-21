"""Unfinished console paths, finished.

Writes ../mockups/soft-<name>.html:

  soft-ticket-thread   a ticket's chat: the customer's photos, a reply that
                       quotes the message it answers, a message that failed,
                       and the reply box replying to one message
  soft-me-password     Change password from the member menu; the change ends
                       the session, so the member signs in again
"""
import sys

from build_soft_admin import gi
from build_soft_agent import OUT, avatar, kbd
from build_soft_ticket import NAME, PHOTO, agent_box, facts, frame, panel, pod_answer
from build_soft_pages import support_queue


def quote(text, who):
    return (f'<span class="mb-1.5 flex gap-2 rounded-[10px] bg-white/60 px-2 py-1.5"><span class="w-[3px] shrink-0 rounded-full bg-primary"></span>'
            f'<span class="min-w-0 leading-tight"><span class="block text-[12px] font-medium text-primary">{who}</span>'
            f'<span class="line-clamp-1 text-[12.5px] text-on-surface-variant">{text}</span></span></span>')


def them(body, w, hover=False):
    tools = (f'<span class="float absolute left-[calc(100%+8px)] top-1 flex items-center gap-0.5 rounded-full border hair bg-white p-0.5">'
             f'<a id="reply-msg" href="#reply-msg" class="flex h-7 items-center gap-1 whitespace-nowrap rounded-full bg-primary/[.08] px-2.5 text-[12.5px] font-medium text-primary">{gi("reply-rounded", 15)}Reply</a></span>') if hover else ""
    return (f'<div class="flex max-w-[70%] gap-2.5">{avatar("K", 30, key=NAME)}<div class="relative">{tools}'
            f'<div class="rounded-[20px] rounded-tl-[6px] bg-surface-container-low px-4 py-2.5 text-[15px] leading-[23px]{" ring-2 ring-primary/20" if hover else ""}">{body}</div>'
            f'<p class="tnum mt-1 px-1 text-[12px] text-on-surface-variant">{w}</p></div></div>')


def us(body, w, failed=False):
    foot = (f'<p class="mt-1 flex items-center justify-end gap-1.5 px-1 text-[12px] text-error">{gi("error-outline-rounded", 14)}Not delivered ·'
            f'<a id="retry" href="#retry" class="font-medium text-primary">Try again</a></p>') if failed else f'<p class="tnum mt-1 px-1 text-right text-[12px] text-on-surface-variant">{w}</p>'
    return (f'<div class="ml-auto max-w-[72%]"><div class="rounded-[20px] rounded-tr-[6px] px-4 py-2.5 text-[15px] leading-[23px] '
            f'{"bg-primary/40 text-on-primary" if failed else "bg-primary text-on-primary"}">{body}</div>{foot}</div>')


def photos(n=2):
    imgs = "".join(f'<a id="ph-{i}" href="#ph-{i}" class="block overflow-hidden rounded-[14px]"><img src="{PHOTO}" alt="" class="h-[150px] w-[150px] object-cover"></a>' for i in range(n))
    return f'<div class="flex gap-1.5">{imgs}</div>'


def reply_box():
    replying = f"""<div class="flex items-center gap-2 border-b hair px-4 py-2.5">{gi("reply-rounded", 17, "text-primary")}
  <span class="min-w-0 flex-1 leading-tight"><span class="block text-[12.5px] font-medium text-primary">Replying to {NAME}</span>
  <span class="block truncate text-[13px] text-on-surface-variant">2 photos · Hộp còn nguyên tem, bên trong là cục gạch</span></span>
  <a id="unreply" href="#unreply" class="hov flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant">{gi("close-rounded", 16)}</a></div>"""
    return f"""<div class="rounded-[20px] border border-primary/40 bg-white ring-focus">{replying}
  <p class="min-h-[52px] px-4 pt-3 text-[15px] leading-[24px]">Bạn giữ nguyên hộp và tem giúp mình nhé, mình mở khiếu nại với GHTK ngay.<span class="caret"></span></p>
  <div class="flex items-center gap-2 px-3 py-2.5"><span class="flex-1"></span>
    <span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{kbd("Ctrl ↵")}Send</span>
    <a id="send" href="#send" class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">{gi("arrow-upward-rounded", 18)}</a></div></div>"""


def center():
    head = f"""<header class="flex h-16 shrink-0 items-center gap-3 px-6">{avatar("K", 38, status="active", key=NAME)}
  <div class="min-w-0 flex-1 leading-tight"><p class="tight truncate text-[16px] font-semibold">{NAME}</p>
    <p class="text-[12.5px] text-on-surface-variant">Not as described · waiting 22 min · 4 orders, 0 reports</p></div>
  <a id="resolve" href="#resolve" class="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-medium text-on-primary">{gi("check-rounded", 17)}Resolve</a></header>"""
    thread = "".join([
        '<p class="tnum text-center text-[12px] text-on-surface-variant">Today</p>',
        them(photos() + '<p class="mt-2">Hộp còn nguyên tem, bên trong là cục gạch</p>', "08:12", hover=True),
        us(quote("2 photos · Hộp còn nguyên tem, bên trong là cục gạch", NAME) + "Bạn đã trả tiền COD cho bưu tá chưa ạ?", "Lan · 08:20"),
        them("Mình trả rồi, lúc mở ra mới thấy", "08:31"),
        us("Mình đang kiểm tra với GHTK, bạn chờ chút nhé", "", failed=True)])
    return f"""<section class="flex min-w-0 flex-1 flex-col">{head}{facts()}
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden"><div class="space-y-5 px-6 py-5">{thread}</div></div>
  <div class="px-6 pb-5">{reply_box()}</div></section>"""


def ticket_thread():
    return frame("Support", support_queue(ready=False) + center() + panel(pod_answer(), agent_box()))


def password_field(label, value, ok=None):
    dots = "•" * len(value)
    return f"""<label class="block"><span class="mb-1.5 block text-[13.5px] font-medium">{label}</span>
  <span class="flex h-12 items-center gap-2.5 rounded-[16px] border hair bg-white px-4 text-on-surface-variant">{gi("lock-outline", 18)}
  <span class="flex-1 text-[15px] tracking-[.2em] text-on-surface">{dots}</span>{gi("visibility-outline", 18)}</span></label>"""


def me_password():
    base = (OUT / "soft-home-admin.html").read_text()
    rules = "".join(f'<li class="flex items-center gap-2 text-[13px] {"text-primary" if ok else "text-on-surface-variant"}">'
                    f'{gi("check-circle-outline-rounded" if ok else "radio-button-unchecked", 17)}{t}</li>'
                    for t, ok in [("12 characters or more", True), ("Not your email", True), ("Not the current password", True), ("Both fields match", False)])
    meter = "".join(f'<span class="h-1.5 flex-1 rounded-full {"bg-primary" if i < 3 else "bg-surface-container"}"></span>' for i in range(4))
    dialog = f"""<div class="fixed inset-0 z-40 bg-[rgba(16,24,22,.18)]"></div>
<div class="fixed left-1/2 top-1/2 z-50 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border hair bg-white p-7 shadow-[0_24px_60px_-20px_rgba(16,24,22,.35)]">
  <div class="flex items-center gap-3"><span class="flex h-11 w-11 items-center justify-center rounded-[16px] bg-primary/[.08] text-primary">{gi("key-outline-rounded", 22)}</span>
    <div class="flex-1"><p class="tight text-[20px] font-semibold">Change password</p><p class="text-[13px] text-on-surface-variant">You sign in again after saving</p></div>
    <a id="x" href="#x" class="hov flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{gi("close-rounded", 20)}</a></div>
  <div class="mt-6 space-y-4">{password_field("Current password", "hunter2hunter2")}
    {password_field("New password", "teal-river-lamp-42")}<div class="-mt-2 flex gap-1.5">{meter}</div>
    {password_field("Again", "teal-river-lamp")}</div>
  <ul class="mt-4 space-y-2 rounded-[20px] bg-surface-container-low p-4">{rules}</ul>
  <div class="mt-6 flex justify-end gap-2"><a id="cancel" href="#cancel" class="hov inline-flex h-10 items-center rounded-full border hair px-4 text-[14px] font-medium">Cancel</a>
    <a id="save" href="#save" class="inline-flex h-10 items-center rounded-full bg-primary/50 px-4 text-[14px] font-medium text-on-primary">Save and sign in again</a></div></div>"""
    return base.replace("</body>", dialog + "</body>", 1)


SCREENS = {"soft-ticket-thread": ("Ticket · Photos, replies, failed", ticket_thread), "soft-me-password": ("Me · Change password", me_password)}

if __name__ == "__main__":
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
