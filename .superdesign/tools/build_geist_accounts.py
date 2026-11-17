"""Tài khoản in the Geist look, in the console's current type scale.

Writes ../mockups/<name>.html. Two panes in the work card: the 340 px list
(Tất cả and Đang khoá, the search by id or phone number that "/" focuses on
this page, newest first) and the account beside it. The account opens on a
hero band with its tinted initial, status and actions, four figures with
their last 90 days, then Lịch sử (the console's actions, newest first) beside
Thông tin and the identities. Tạm khoá opens a popover under the button; a
suspended account's band turns `error` and a card counts down its term.

  accounts-active     an active seller with four reports, picked from Tất cả
  accounts-suspend    the same account with the Tạm khoá popover open
  accounts-suspended  Đang khoá, a suspended account with Mở khoá
"""
# build_home first: common puts the app's tools on sys.path when it loads.
import build_home  # noqa: F401
import sys
from html import escape
from pathlib import Path

from build_geist import CSS, FONTS, avatar, bigger, chip, figure as fig, gi, kbd, member_initial as member, nav, picked, picked_bar, status_pill
from common import head

OUT = Path(__file__).resolve().parent.parent / "mockups"



def initial(ch, sid, size=32, status=None):
    return avatar(ch, size, status=status, key=sid)


# id, initial, name, short id, line, when, suspended
ALL = [
    ("a1", "T", "Võ Thanh Tâm", "3f9a0c12", "Từ 17/11", "Hôm nay", False),
    ("a2", "B", "Phạm Quốc Bảo", "a91d3f07", "Người bán · 23 đơn", "02/09/25", False),
    ("a3", "Đ", "Đồ Hiệu Giá Sỉ HN", "c41e9b07", "Đến 03/12 · Bán túi giả thương hiệu", "28/07/25", True),
    ("a4", "N", "Trương Bảo Ngọc", "5d20e8aa", "Người mua · 2 đơn", "15/11", False),
    ("a5", "H", "Bùi Quang Huy", "e07b4c31", "Người mua · 1 đơn", "14/11", False),
    ("a6", "P", "Shop Phụ Kiện 247", "9b6f1d02", "Không thời hạn · Lừa đặt cọc ngoài app", "11/11", True),
    ("a7", "A", "Hồ Ngọc Ánh", "41c8a9e5", "Người bán · 7 đơn", "12/11", False),
    ("a8", "S", "Shop Cây Cảnh Thủ Đức", "7e3a5b90", "Người bán · 38 đơn", "10/11", False),
    ("a9", "L", "Khánh Linh", "7b1c22e0", "Người mua · 4 đơn", "03/2025", False),
    ("a10", "M", "Đặng Minh Mẫn", "2ac4f7d1", "Chưa có đơn", "08/11", False),
]
# Đang khoá: the term that ends first comes first, with the days left.
LOCKED = [("a11", "V", "Vũ Hải Đăng", "d8e21f6c", "Đến 20/11 · Đăng ảnh lấy từ tin người khác", "còn 3 ngày", True),
          ("a3", "Đ", "Đồ Hiệu Giá Sỉ HN", "c41e9b07", "Đến 03/12 · Bán túi giả thương hiệu", "còn 16 ngày", True),
          ("a6", "P", "Shop Phụ Kiện 247", "9b6f1d02", "Không thời hạn · Lừa đặt cọc ngoài app", "", True)]


def account_list(rows, pick, locked_tab=False):
    items = "".join(f"""<a id="acc-{aid}" href="#acc-{aid}" class="{picked(aid == pick)} flex items-center gap-3 rounded-[10px] px-3 py-2.5">
  {picked_bar(aid == pick)}
  {initial(ch, sid, 36, "suspended" if locked else "active")}
  <span class="min-w-0 flex-1 leading-tight">
    <span class="flex items-baseline gap-2"><span class="truncate text-[13.5px] font-medium">{escape(name)}</span><span class="tnum ml-auto shrink-0 text-[11.5px] text-on-surface-variant">{when}</span></span>
    <span class="mt-1 flex items-center gap-1.5 text-[12px] {"text-error" if locked else "text-on-surface-variant"}">
      {gi("lock-outline", 13) if locked else ""}<span class="truncate">{escape(line)}</span></span>
  </span>
</a>""" for aid, ch, name, sid, line, when, locked in rows)
    on = "rounded-[6px] bg-surface-container-lowest lift text-on-surface"
    return f"""<section class="flex w-[340px] shrink-0 flex-col border-r hair">
  <div class="space-y-2.5 p-3">
    <div class="flex h-8 rounded-md bg-surface-container p-0.5 text-[12.5px] font-medium text-on-surface-variant">
      <a id="tab-all" href="#tab-all" class="flex flex-1 items-center justify-center px-2 {"" if locked_tab else on}">Tất cả</a>
      <a id="tab-locked" href="#tab-locked" class="flex flex-1 items-center justify-center gap-1.5 px-2 {on if locked_tab else ""}">Đang khoá
        <span class="tnum flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[11px] text-on-error">{len(LOCKED)}</span></a></div>
    <label id="find" class="flex h-9 items-center gap-2 rounded-md border hair bg-surface-container-lowest px-2.5 text-on-surface-variant shadow-[0_1px_2px_rgba(16,24,22,.04)]">{gi("search-rounded", 17)}
      <span class="flex-1 text-[13px]">Id hoặc số điện thoại</span>{kbd("/")}</label>
  </div>
  <p class="px-5 pb-1.5 text-[11.5px] font-medium text-on-surface-variant">{"Hết hạn sớm nhất" if locked_tab else "Mới nhất"}</p>
  <div class="min-h-0 flex-1 space-y-0.5 overflow-hidden px-2">{items}</div>
  <p class="flex items-center gap-1.5 border-t hair px-4 py-2.5 text-[12px] text-on-surface-variant">{kbd("j")}{kbd("k")}Tài khoản trước, sau</p>
</section>"""






def figure(ic, n, label, values, tone="", bar="", tile=""):
    return fig(ic, n, label, values, error=tone == "text-error")


def card(title, body, aside=""):
    return f"""<section class="rounded-[12px] border hair bg-surface-container-lowest">
  <div class="flex items-center gap-2 border-b hair px-4 py-2.5"><h3 class="flex-1 text-[13px] font-semibold">{title}</h3>{aside}</div>
  <div class="px-4 py-3">{body}</div></section>"""


def fact(ic, label, value):
    return (f'<div class="flex items-center gap-2.5 py-1.5"><span class="text-on-surface-variant">{gi(ic, 16)}</span>'
            f'<div class="min-w-0 flex-1 leading-tight"><p class="text-[11.5px] text-on-surface-variant">{label}</p><p class="mt-0.5 truncate text-[13px]">{value}</p></div></div>')


KIND = {"suspend": ("lock-outline", "bg-error-container text-error"),
        "unsuspend": ("lock-open-outline-rounded", "bg-primary/10 text-primary"),
        "created": ("person-add-outline-rounded", "bg-surface-container text-on-surface-variant")}


def history(entries):
    """entries: (kind, member initial or "", what, reason, when); newest first."""
    items = "".join(f"""<li class="relative flex gap-3 pb-5 last:pb-0">
  <span class="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-container-lowest {KIND[k][1]}">{gi(KIND[k][0], 15)}</span>
  <div class="min-w-0 flex-1 pt-0.5 leading-tight">
    <div class="flex items-center gap-2">{member(m) if m else ""}<p class="flex-1 text-[13px] {"text-on-surface-variant" if k == "created" else "font-medium"}">{what}</p>
      <p class="tnum text-[11.5px] text-on-surface-variant">{when}</p></div>
    {f'<p class="mt-2 rounded-[8px] border-l-2 {"border-error/50" if k == "suspend" else "border-primary/50"} bg-surface-container-low px-3 py-2 text-[12.5px] leading-[18px]">{escape(reason)}</p>' if reason else ""}
  </div></li>""" for k, m, what, reason, when in entries)
    return f'<ul class="relative before:absolute before:bottom-4 before:left-[13px] before:top-4 before:w-px before:bg-outline-variant">{items}</ul>'




def ask_agent():
    return (f'<a id="ask-agent" href="#agent" class="hov inline-flex h-8 items-center gap-1.5 rounded-md border hair bg-surface-container-lowest px-3 text-[13px] font-medium">'
            f'<span class="text-primary">{gi("material-symbols:auto-awesome-outline-rounded", 16)}</span>Hỏi agent</a>')


def detail(acc, *, band, status, chips, actions, figures, under_hero="", past, facts, ids, popover=""):
    _, ch, name, sid, _, _, locked = acc
    return f"""<section class="relative flex min-w-0 flex-1 flex-col">
  <header class="flex h-[52px] shrink-0 items-center gap-2 border-b hair px-5 text-[13px]">
    <a id="crumb" href="#accounts" class="text-on-surface-variant">Tài khoản</a><span class="text-outline">{gi("chevron-right-rounded", 16)}</span>
    <p class="tight min-w-0 flex-1 truncate font-semibold">{escape(name)}</p>
    <a id="prev" href="#prev" title="Trước (k)" class="hov flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant">{gi("keyboard-arrow-up-rounded", 18)}</a>
    <a id="next" href="#next" title="Sau (j)" class="hov flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant">{gi("keyboard-arrow-down-rounded", 18)}</a>
  </header>
  <div class="relative min-h-0 flex-1 overflow-hidden">
    <div class="{band} relative px-8 pb-6 pt-7"><div class="dots pointer-events-none absolute inset-0"></div>
      <div class="relative flex items-start gap-5">
        {initial(ch, sid, 72, "suspended" if locked else "active")}
        <div class="min-w-0 flex-1 pt-1">
          <div class="flex items-center gap-2.5"><h2 class="tight text-[20px] font-semibold">{escape(name)}</h2>{status}</div>
          <p class="mt-1 flex items-center gap-1.5 text-[12.5px] text-on-surface-variant"><span class="tnum">{sid}</span>
            <a id="copy-id" href="#copy" title="Chép id" class="hov flex h-5 w-5 items-center justify-center rounded-[5px]">{gi("content-copy-outline-rounded", 13)}</a></p>
          <div class="mt-3 flex flex-wrap gap-1.5">{chips}</div>
        </div>
        <div class="flex items-center gap-2 pt-1">{actions}</div>
      </div>
      {under_hero}
    </div>
    <div class="space-y-4 px-8 pb-8">
      <div class="grid grid-cols-4 gap-3">{figures}</div>
      <div class="grid grid-cols-[1fr_272px] gap-4">
        {card("Lịch sử", history(past), f'<span class="tnum text-[12px] text-on-surface-variant">{sum(1 for e in past if e[0] != "created")} thao tác</span>')}
        <div class="space-y-4">{card("Thông tin", facts)}{card("Định danh", ids)}</div>
      </div>
    </div>
    {popover}
  </div>
</section>"""




def phone(n):
    return f'<span class="tnum inline-flex items-center gap-1">{n}<span class="text-primary">{gi("verified-rounded", 14)}</span></span>'


BAO = ALL[1]


def suspend_button(pressed=False):
    return (f'<a id="suspend" href="#suspend" class="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium text-error '
            f'{"border-error bg-error-container" if pressed else "border-error/40 bg-surface-container-lowest hov"}">{gi("block", 16)}Tạm khoá</a>')


def active(popover=""):
    figures = (figure("shopping-bag-outline-rounded", "6", "Đơn mua", [0, 1, 0, 0, 2, 0, 1, 0, 0, 1, 0, 1])
               + figure("storefront-outline-rounded", "23", "Đơn bán", [1, 2, 1, 3, 2, 2, 1, 3, 2, 2, 3, 1])
               + figure("undo-rounded", "0%", "Từ chối nhận", [0] * 12)
               + figure("flag-outline-rounded", "4", "Bị báo cáo", [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 2], "text-error", "bg-error/70", "bg-error-container"))
    past = [("unsuspend", "K", "Khoa mở khoá", "Người bán gửi ảnh chụp hàng thật, khớp với tin đăng.", "22/10 16:40"),
            ("suspend", "L", "Lan tạm khoá · 3 ngày", "Đăng ảnh lấy từ tin người khác.", "21/10 09:12"),
            ("created", "", "Tạo tài khoản", "", "02/09/2025")]
    facts = (fact("calendar-today-outline-rounded", "Tham gia", "02/09/2025")
             + fact("star-outline-rounded", "Đánh giá người bán", "4,8 · 19 lượt")
             + fact("location-on-outline-rounded", "Khu vực", "Quận 10, TP.HCM"))
    ids = (fact("call-outline-rounded", "Số điện thoại", phone("0903 456 812"))
           + fact("logos:google-icon", "Google", "bao.pham.store@gmail.com"))
    d = detail(BAO, band="band", status=status_pill(False),
               chips=chip("storefront-outline-rounded", "Người bán") + chip("verified-outline-rounded", "SĐT đã xác minh", "text-primary") + chip("history-rounded", "Từng bị khoá 1 lần"),
               actions=ask_agent() + suspend_button(bool(popover)), figures=figures, past=past, facts=facts, ids=ids, popover=popover)
    return page(account_list(ALL, "a2"), d)


def suspend_popover():
    terms = "".join(
        f'<a id="term-{i}" href="#term-{i}" class="flex flex-1 flex-col items-center justify-center rounded-[8px] border py-2 leading-tight '
        f'{"border-error bg-error-container/50 text-error ring-[3px] ring-error/10" if t == "7 ngày" else "hair hov"}">'
        f'<span class="text-[13px] font-medium">{t}</span><span class="tnum mt-0.5 text-[11.5px] {"" if t == "7 ngày" else "text-on-surface-variant"}">{end}</span></a>'
        for i, (t, end) in enumerate([("1 ngày", "18/11"), ("7 ngày", "24/11"), ("30 ngày", "17/12"), ("Không hạn", "—")]))
    return f"""<div id="suspend-pop" class="absolute right-8 top-[76px] z-30 w-[400px] overflow-hidden rounded-[14px] bg-surface-container-lowest shadow-[0_16px_40px_rgba(16,24,22,.16),0_0_0_1px_rgba(16,24,22,.06)]">
  <div class="flex items-center gap-3 px-4 pt-4">
    <span class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-error-container text-error">{gi("block", 18)}</span>
    <div class="min-w-0 flex-1 leading-tight"><p class="tight text-[14px] font-semibold">Tạm khoá Phạm Quốc Bảo</p><p class="tnum mt-0.5 text-[12px] text-on-surface-variant">a91d3f07</p></div></div>
  <div class="px-4 pt-4"><div class="flex gap-2">{terms}</div></div>
  <div class="px-4 pt-3">
    <div class="rounded-[8px] border border-outline ring-[3px] ring-primary/10">
      <p class="min-h-[76px] px-3 py-2.5 text-[13.5px] leading-[20px]">Bán tai nghe giả thương hiệu, 4 báo cáo có ảnh so với hàng thật.<span class="ml-px inline-block h-4 w-px animate-pulse bg-on-surface align-middle"></span></p>
    </div>
    <div class="mt-1.5 flex items-center gap-1 text-[12px] text-on-surface-variant">{gi("visibility-outline", 14)}<span class="flex-1">Bảo thấy lý do này</span><span class="tnum">62/280</span></div>
  </div>
  <div class="mt-4 flex items-center justify-end gap-2 border-t hair bg-surface-container-low px-4 py-2.5">
    <a id="suspend-cancel" href="#cancel" class="hov inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium text-on-surface-variant">Huỷ</a>
    <a id="suspend-confirm" href="#confirm" class="inline-flex h-8 items-center gap-1.5 rounded-md bg-error px-3 text-[13px] font-medium text-on-error">{gi("block", 16)}Tạm khoá 7 ngày</a>
  </div>
</div>"""


def suspended():
    acc = ALL[2]
    term = f"""<div class="relative mt-5 flex items-center gap-4 rounded-[12px] border border-error/20 bg-surface-container-lowest/90 px-4 py-3.5 lift">
  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-error-container text-error">{gi("lock-clock-outline-rounded", 20)}</span>
  <div class="min-w-0 flex-1 leading-tight">
    <div class="flex items-baseline gap-2"><p class="flex-1 text-[14px] font-semibold">Đến 03/12 10:05</p><p class="tnum text-[13px] font-medium text-error">còn 16 ngày</p></div>
    <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-error-container"><span class="block h-full w-[47%] rounded-full bg-error"></span></div>
    <div class="mt-2 flex items-center gap-2 text-[12px] text-on-surface-variant"><span class="tnum">03/11</span><span class="flex-1"></span>{member("L")}<span>Lan · 30 ngày</span></div>
  </div>
</div>"""
    figures = (figure("shopping-bag-outline-rounded", "0", "Đơn mua", [0] * 12)
               + figure("storefront-outline-rounded", "41", "Đơn bán", [3, 4, 5, 3, 6, 4, 5, 7, 4, 0, 0, 0])
               + figure("undo-rounded", "—", "Từ chối nhận", [0] * 12)
               + figure("flag-outline-rounded", "9", "Bị báo cáo", [0, 0, 1, 0, 1, 1, 0, 2, 4, 0, 0, 0], "text-error", "bg-error/70", "bg-error-container"))
    past = [("suspend", "L", "Lan tạm khoá · 30 ngày", "Bán túi giả thương hiệu, 6 báo cáo có ảnh.", "03/11 10:05"),
            ("suspend", "L", "Lan tạm khoá · 1 ngày", "Giá thấp bất thường so với hàng chính hãng.", "02/10 14:30"),
            ("created", "", "Tạo tài khoản", "", "28/07/2025")]
    facts = (fact("calendar-today-outline-rounded", "Tham gia", "28/07/2025")
             + fact("star-outline-rounded", "Đánh giá người bán", "3,9 · 33 lượt")
             + fact("location-on-outline-rounded", "Khu vực", "Hoàn Kiếm, Hà Nội"))
    ids = fact("call-outline-rounded", "Số điện thoại", phone("0987 120 554"))
    unlock = (f'<a id="unsuspend" href="#unsuspend" class="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-on-primary">'
              f'{gi("lock-open-outline-rounded", 16)}Mở khoá</a>')
    d = detail(acc, band="band-error", status=status_pill(True),
               chips=chip("storefront-outline-rounded", "Người bán") + chip("verified-outline-rounded", "SĐT đã xác minh", "text-primary") + chip("history-rounded", "Bị khoá 2 lần", "text-error"),
               actions=ask_agent() + unlock, figures=figures, under_hero=term, past=past, facts=facts, ids=ids)
    return page(account_list(LOCKED, "a3", locked_tab=True), d)


def page(left, right):
    return bigger(f"""{head("Tài khoản · Console", CSS).replace('<script src="https://cdn.tailwindcss.com">', FONTS + '\n<script src="https://cdn.tailwindcss.com">', 1)}<body>
<div class="flex h-[900px] w-[1440px] bg-surface-container text-on-surface">
  {nav("accounts", search_key=False)}
  <div class="my-2 mr-2 flex min-w-0 flex-1 overflow-hidden rounded-[12px] bg-surface-container-lowest lift">
    {left}
    {right}
  </div>
</div>
</body>
</html>
""")


SCREENS = {
    "accounts-active": ("Tài khoản · Đang hoạt động", active),
    "accounts-suspend": ("Tài khoản · Tạm khoá", lambda: active(suspend_popover())),
    "accounts-suspended": ("Tài khoản · Đang khoá", suspended),
}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
