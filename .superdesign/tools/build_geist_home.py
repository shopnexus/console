"""Trang chủ and Đăng nhập in the Geist look of build_geist.py.

Writes ../mockups/<name>.html with the M3 builders' names (build_home.py,
build_signin.py), so each lands on its draft as a new version.

Home shows what is waiting and what the agent has ready, as counts and rows,
never as narration. A moderator sees the next records with the agent's
proposal or reply on each, and the background runs. An admin sees the audit
log, with a mark on actions taken from a proposal, the members to look at,
and how often members kept the agent's proposals in the last 7 days.

Sign-in is one centred card on a dotted surface: password, code, and the
first sign-in's new password and TOTP enrolment as two steps.
"""
# build_home first: common puts the app's tools on sys.path when it loads.
from build_home import ACTIONS, ATTENTION, KIND
import sys
from html import escape
from pathlib import Path

from build_geist import CSS, FONTS, avatar, dot, gi, kbd, nav, pill
from common import LOGO, MEMBER, head

OUT = Path(__file__).resolve().parent.parent / "mockups"
SECRET = "JBSW Y3DP EHPK 3PXP K4QF"  # build_signin.SECRET
# build_signin.qr_svg() renders it with segno; the saved copy keeps this builder free of that dependency.
QR = (Path(__file__).resolve().parent / "totp_qr.svg").read_text()
SPARK = "material-symbols:auto-awesome-rounded"
SPARK_O = "material-symbols:auto-awesome-outline-rounded"


def page(title, body):
    return f"""{head(title + " · Console", CSS).replace('<script src="https://cdn.tailwindcss.com">', FONTS + '\n<script src="https://cdn.tailwindcss.com">', 1)}<body>
{body}
</body>
</html>
"""


# --- Trang chủ ---

def tile(ic, label, n, sub, tone=""):
    return f"""<div class="rounded-[12px] border hair bg-surface-container-lowest px-4 py-3.5">
  <p class="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">{gi(ic, 16)}{label}</p>
  <p class="tnum tight mt-1.5 text-[28px] font-semibold leading-8">{n}</p>
  <p class="mt-0.5 flex items-center gap-1 text-[12px] {tone or "text-on-surface-variant"}">{sub}</p>
</div>"""


def panel(title, body, more="", count=""):
    return f"""<section class="overflow-hidden rounded-[12px] border hair bg-surface-container-lowest">
  <header class="flex h-11 items-center gap-2 border-b hair px-4"><h2 class="text-[13.5px] font-semibold">{title}</h2>
    {f'<span class="tnum text-[12px] text-on-surface-variant">{count}</span>' if count else ""}<span class="flex-1"></span>{more}</header>{body}</section>"""


def more(text, aid):
    return f'<a id="{aid}" href="#{aid}" class="hov inline-flex h-7 items-center gap-0.5 rounded-md px-2 text-[12.5px] text-on-surface-variant">{text}{gi("chevron-right-rounded", 16)}</a>'


NEXT = [  # icon, kind, title, sub, agent says, tone, when
    ("flag-outline-rounded", "Báo cáo", "Trần Đức Anh", "iPhone 14 Pro Max 256GB · Lừa đảo 4, Hàng giả", "Ẩn tin, khoá 7 ngày", "error", "09:48"),
    ("support-agent-outline", "Hỗ trợ", "Khánh Linh", "Báo chưa nhận hàng · GHTK", "Trả lời soạn sẵn", "primary", "09:41"),
    ("flag-outline-rounded", "Báo cáo", "Đồ Cũ Gò Vấp", "Nhóm 9 tài khoản · Lừa đảo 2", "Khoá 7 tài khoản", "error", "09:31"),
    ("support-agent-outline", "Hỗ trợ", "Võ Thanh Tâm", "Không đổi được số điện thoại", "Trả lời soạn sẵn", "primary", "09:20"),
    ("flag-outline-rounded", "Báo cáo", "Mỹ Phẩm Xách Tay Hà", "Son Dior 999 fullbox · Hàng giả 3", "Ẩn tin", "error", "09:02"),
    ("flag-outline-rounded", "Báo cáo", "Nguyễn Hữu Lộc", "Súng hơi PCP kèm ống ngắm · Hàng cấm 2", "", "", "08:57"),
    ("support-agent-outline", "Hỗ trợ", "Shop Cây Cảnh Thủ Đức", "Xin thêm hãng · Ahamove", "Trả lời soạn sẵn", "primary", "08:55"),
    ("flag-outline-rounded", "Báo cáo", "Lê Thị Hồng", "Tài khoản · Lừa đảo 1", "Không vi phạm", "neutral", "08:20"),
]


def next_list():
    rows = []
    for i, (ic, kind, t, sub, says, tone, when) in enumerate(NEXT):
        color = {"error": "text-error", "primary": "text-primary", "neutral": "text-on-surface-variant"}.get(tone, "")
        tag = (f'<span class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] border hair px-1.5 py-0.5 text-[12px] {color}">{gi(SPARK_O, 13)}{says}</span>' if says
               else '<span class="block h-1 w-14 overflow-hidden rounded-full bg-surface-container"><span class="block h-full w-1/3 animate-pulse rounded-full bg-primary"></span></span>')
        rows.append(f"""<a id="next-{i}" href="#next-{i}" class="{"bg-surface-container-low" if i == 0 else "hov"} flex h-[52px] items-center gap-3 border-b hair px-4 last:border-b-0">
  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-surface-container text-on-surface-variant">{gi(ic, 17)}</span>
  <span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[13.5px] font-medium">{escape(t)}</span><span class="block truncate text-[12px] text-on-surface-variant">{kind} · {escape(sub)}</span></span>
  {tag}<span class="tnum w-11 shrink-0 text-right text-[12px] text-on-surface-variant">{when}</span>
</a>""")
    return "".join(rows)


def runs():
    items = [("Nhóm Đồ Cũ Gò Vấp và Trần Đức Anh", "Xong 09:52 · 9 tài khoản", True),
             ("Tin súng hơi đăng tuần này", "Đang chạy · 14 tin đã đọc", False)]
    return "".join(f"""<a id="run-{i}" href="#run-{i}" class="hov flex items-center gap-3 border-b hair px-4 py-2.5 last:border-b-0">
  <span class="{"text-primary" if done else "animate-spin text-on-surface-variant"}">{gi("check-circle-outline-rounded" if done else "progress-activity", 18)}</span>
  <span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[13px]">{t}</span><span class="block text-[12px] text-on-surface-variant">{sub}</span></span>
  {gi("chevron-right-rounded", 16, "text-outline")}</a>""" for i, (t, sub, done) in enumerate(items))


def shortcuts():
    keys = [("/", "Tìm tài khoản"), ("j k", "Lên, xuống"), ("↵", "Mở bản ghi"), ("Ctrl ↵", "Làm theo đề xuất"), ("N", "Cuộc mới với agent"), ("esc", "Đóng panel")]
    return "".join(f'<div class="flex h-9 items-center border-b hair px-4 text-[13px] last:border-b-0"><span class="flex-1">{t}</span><span class="flex gap-1">{"".join(kbd(k) for k in ks.split())}</span></div>'
                   for ks, t in keys)


ACTION_TONE = {"error": "bg-error", "primary": "bg-primary", "secondary": "bg-outline"}
FROM_PROPOSAL = {0, 3, 5}


def actions_table():
    rows = "".join(f"""<tr class="h-10 border-t hair">
  <td class="tnum pl-4 text-[12.5px] text-on-surface-variant">{when}</td>
  <td class="text-[13px]"><span class="flex items-center gap-2">{avatar(who.split()[-1][0], 20)}{who}</span></td>
  <td>{pill(KIND[kind][0], ACTION_TONE[KIND[kind][2]])}</td>
  <td class="text-[13px]"><span class="font-medium">{escape(target)}</span> <span class="mono text-[11.5px] text-on-surface-variant">{tid[:6]}</span></td>
  <td class="max-w-[260px] truncate pr-2 text-[12.5px] text-on-surface-variant">{escape(why)}</td>
  <td class="pr-4 text-primary">{f'<span title="Từ đề xuất của agent">{gi(SPARK_O, 15)}</span>' if i in FROM_PROPOSAL else ""}</td>
</tr>""" for i, (when, who, kind, target, tid, why) in enumerate(ACTIONS))
    return f"""<table class="w-full text-left"><thead class="bg-surface-container-low"><tr class="h-9 text-[12px] text-on-surface-variant">
  <th class="pl-4 font-medium">Lúc</th><th class="font-medium">Người làm</th><th class="font-medium">Thao tác</th><th class="font-medium">Đối tượng</th><th class="font-medium">Lý do</th><th class="w-8"></th></tr></thead>
  <tbody>{rows}</tbody></table>"""


def attention():
    tone = {"error": "text-error", "tertiary": "text-tertiary", "neutral": "text-on-surface-variant"}
    return "".join(f"""<a id="member-{i}" href="#member-{i}" class="hov flex items-center gap-3 border-b hair px-4 py-2.5 last:border-b-0">{avatar(n.split()[-1][0], 28)}
  <span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[13px] font-medium">{n}</span><span class="flex items-center gap-1 text-[12px] {tone[t]}">{gi(ic.replace("-rounded", "") if "outline" in ic else ic, 13)}{what}</span></span>
  {gi("chevron-right-rounded", 16, "text-outline")}</a>""" for i, (n, role, ic, what, t) in enumerate(ATTENTION))


def agent_week():
    parts = [("Giữ nguyên", 41, "bg-primary"), ("Đã đổi", 9, "bg-secondary"), ("Bỏ", 3, "bg-outline-variant")]
    total = sum(n for _, n, _ in parts)
    bar = "".join(f'<span class="{c} h-full" style="width:{n / total * 100:.1f}%"></span>' for _, n, c in parts)
    legend = "".join(f'<div class="flex items-center gap-2 text-[13px]">{dot(c)}<span class="flex-1">{t}</span><span class="tnum text-on-surface-variant">{n}</span></div>' for t, n, c in parts)
    return f"""<div class="px-4 py-3.5"><p class="flex items-baseline gap-2"><span class="tnum tight text-[28px] font-semibold leading-8">77%</span><span class="text-[12.5px] text-on-surface-variant">đề xuất được giữ nguyên</span></p>
  <div class="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-container">{bar}</div>
  <div class="mt-3 space-y-1.5">{legend}</div>
  <p class="mt-3 border-t hair pt-2.5 text-[12px] text-on-surface-variant">{total} đề xuất · 7 ngày · trả lời soạn sẵn được gửi 64/80</p></div>"""


def home(role):
    admin = role == "admin"
    header = f"""<header class="flex h-[52px] shrink-0 items-center gap-3 border-b hair px-5">
  <h1 class="tight flex-1 text-[15px] font-semibold">Trang chủ</h1><span class="text-[12.5px] text-on-surface-variant">Thứ Hai, 16/11</span>
  <a id="theme" href="#theme" class="hov flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant">{gi("contrast", 18)}</a></header>"""
    if admin:
        tiles = (tile("support-agent-outline", "Ticket đang mở", "7", "5 có trả lời soạn sẵn")
                 + tile("flag-outline-rounded", "Báo cáo chờ xử lý", "12", "9 có đề xuất")
                 + tile("badge-outline", "Nhân viên cần xem", "3", "1 bị khoá đăng nhập", "text-error")
                 + tile("block", "Tài khoản đang khoá", "38", "4 khoá trong tuần này"))
        left = panel("Nhật ký thao tác", actions_table(), more("Xem tất cả", "all-actions"), "14 gần nhất")
        right = panel("Nhân viên cần xem", attention(), more("Nhân viên", "all-members"), "3") + panel("Agent · 7 ngày", agent_week())
    else:
        tiles = (tile("support-agent-outline", "Ticket đang mở", "7", f'{gi(SPARK_O, 13)}5 có trả lời soạn sẵn', "text-primary")
                 + tile("flag-outline-rounded", "Báo cáo chờ xử lý", "12", f'{gi(SPARK_O, 13)}9 có đề xuất', "text-primary")
                 + tile("task-alt", "Bạn đã xử lý hôm nay", "6", "4 theo đề xuất, 2 đã đổi")
                 + tile("block", "Tài khoản đang khoá", "38", "4 khoá trong tuần này"))
        left = panel("Việc tiếp theo", next_list(), more("Báo cáo", "all-reports"), "19")
        right = panel("Agent chạy nền", runs(), more("Agent", "agent"), "2") + panel("Phím tắt", shortcuts())
    body = f"""<div class="flex h-[900px] w-[1440px] bg-surface-container text-on-surface">
  {nav("home", role)}
  <div class="my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[12px] bg-surface-container-lowest lift">{header}
    <div class="min-h-0 flex-1 space-y-4 overflow-hidden bg-surface p-5">
      <div class="grid grid-cols-4 gap-3">{tiles}</div>
      <div class="flex items-start gap-4"><div class="min-w-0 flex-1">{left}</div><div class="w-[340px] shrink-0 space-y-4">{right}</div></div>
    </div>
  </div>
</div>"""
    return page("Trang chủ", body)


# --- Đăng nhập ---

def input_(label, value, *, focused=False, password=False, trailing=""):
    shown = "•" * len(value) if password else escape(value)
    ring = "border-primary ring-[3px] ring-primary/15" if focused else "hair"
    caret = '<span class="ml-px inline-block h-4 w-px animate-pulse bg-on-surface align-middle"></span>' if focused else ""
    return f"""<label class="block"><span class="text-[13px] font-medium">{label}</span>
  <span class="mt-1.5 flex h-10 items-center gap-2 rounded-md border {ring} bg-surface-container-lowest px-3 text-[14px]">
    <span class="min-w-0 flex-1 truncate {"tracking-[2px]" if password else ""}">{shown}{caret}</span>{trailing}</span></label>"""


def eye():
    return f'<a id="toggle-password" href="#toggle-password" title="Hiện mật khẩu" class="hov -mr-1.5 flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant">{gi("visibility-outline", 18)}</a>'


def submit(text, aid, ic=""):
    return f'<a id="{aid}" href="#{aid}" class="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-on-surface text-[14px] font-medium text-surface">{text}{gi(ic, 16) if ic else ""}</a>'


def code(digits, focus_at=None):
    boxes = []
    for i in range(6):
        d = digits[i] if i < len(digits) else ""
        on = i == focus_at
        boxes.append(f'<span class="mono flex h-12 w-11 items-center justify-center rounded-md border {"border-primary ring-[3px] ring-primary/15" if on else "hair"} bg-surface-container-lowest text-[20px]">'
                     f'{d or ("<span class=\'h-5 w-px animate-pulse bg-on-surface\'></span>" if on else "")}</span>')
        if i == 2:
            boxes.append('<span class="mx-0.5 h-px w-2.5 bg-outline-variant"></span>')
    return f'<div class="flex items-center gap-1.5">{"".join(boxes)}</div>'


def member():
    return f"""<div class="flex h-10 items-center gap-2.5 rounded-md border hair bg-surface-container-low pl-1.5 pr-1">{avatar("L", 26, "bg-primary text-on-primary")}
  <span class="min-w-0 flex-1 truncate text-[13px]">{MEMBER["email"]}</span>
  <a id="change-email" href="#change-email" class="hov rounded-md px-2 py-1 text-[12.5px] font-medium text-primary">Đổi</a></div>"""


def steps(active):
    out = []
    for n, t in [(1, "Mật khẩu mới"), (2, "Xác thực hai bước")]:
        done, on = n < active, n == active
        mark = (gi("check-rounded", 13) if done else str(n))
        out.append(f'<span class="flex items-center gap-1.5 text-[12.5px] {"text-on-surface font-medium" if on or done else "text-on-surface-variant"}">'
                   f'<span class="flex h-5 w-5 items-center justify-center rounded-full text-[11px] {"bg-on-surface text-surface" if on or done else "border hair"}">{mark}</span>{t}</span>')
    return f'<div class="mb-6 flex items-center gap-3">{out[0]}<span class="h-px flex-1 bg-outline-variant"></span>{out[1]}</div>'


def signin(title, inner, width=380):
    body = f"""<div class="relative flex h-[900px] w-[1440px] flex-col bg-surface text-on-surface bg-[radial-gradient(circle,rgba(16,24,22,.08)_1px,transparent_1px)] [background-size:20px_20px]">
  <header class="flex h-16 items-center px-8"><a id="brand" href="#console" class="flex items-center gap-2"><img src="{LOGO}" alt="ShopNexus" class="h-6 w-6 rounded-[6px]">
    <span class="tight text-[14px] font-semibold">ShopNexus</span><span class="text-[13px] text-on-surface-variant">Console</span></a><span class="flex-1"></span>
    <div class="flex h-8 rounded-md border hair bg-surface-container-lowest p-0.5">{"".join(f'<a id="theme-{i}" href="#theme-{i}" class="flex w-8 items-center justify-center rounded-[5px] {"bg-surface-container" if i == 0 else "text-on-surface-variant"}">{gi(ic, 16)}</a>' for i, ic in enumerate(["computer-outline", "light-mode-outline", "dark-mode-outline"]))}</div></header>
  <main class="flex flex-1 items-center justify-center pb-16">
    <section class="rounded-[14px] border hair bg-surface-container-lowest p-7 shadow-[0_1px_2px_rgba(16,24,22,.06),0_12px_32px_rgba(16,24,22,.06)]" style="width:{width}px">{inner}</section></main>
  <footer class="mono pb-6 text-center text-[11.5px] text-on-surface-variant">console.shopnexus.id.vn</footer>
</div>"""
    return page(title, body)


def signin_password():
    return signin("Đăng nhập", f"""<h1 class="tight text-[20px] font-semibold">Đăng nhập</h1>
<div class="mt-6 space-y-4">{input_("Email", MEMBER["email"])}{input_("Mật khẩu", "goi-cuon-ngon-2026", focused=True, password=True, trailing=eye())}</div>
<div class="mt-6">{submit("Tiếp tục", "continue", "arrow-forward-rounded")}</div>""")


def signin_code():
    return signin("Mã xác thực", f"""{member()}<h1 class="tight mt-6 text-[20px] font-semibold">Mã xác thực</h1>
<div class="mt-5">{code("482", 3)}</div>
<p class="mt-3 flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">{gi("timer-outline", 15)}Mã đổi sau <span class="tnum">18</span> giây</p>
<div class="mt-6">{submit("Đăng nhập", "sign-in")}</div>""")


def rule(text, ok):
    return (f'<li class="flex items-center gap-2 text-[13px] {"" if ok else "text-on-surface-variant"}">'
            f'{gi("check-circle-outline-rounded" if ok else "radio-button-unchecked", 16, "text-primary" if ok else "text-outline")}{text}</li>')


def first_password():
    return signin("Lần đầu · Mật khẩu mới", f"""{steps(1)}<h1 class="tight text-[20px] font-semibold">Mật khẩu mới</h1>
<div class="mt-5 space-y-4">{input_("Mật khẩu mới", "chieu-mua-o-thu-duc", password=True, trailing=eye())}{input_("Nhập lại", "chieu-mua-o-thu", focused=True, password=True)}</div>
<ul class="mt-4 space-y-1.5">{rule("12–128 ký tự", True)}{rule("Khác email", True)}{rule("Khác mật khẩu tạm", True)}{rule("Hai ô khớp nhau", False)}</ul>
<div class="mt-6">{submit("Tiếp tục", "continue", "arrow-forward-rounded")}</div>""", 400)


def first_totp():
    return signin("Lần đầu · Xác thực hai bước", f"""{steps(2)}<h1 class="tight text-[20px] font-semibold">Xác thực hai bước</h1>
<div class="mt-4 flex gap-4 rounded-[10px] border hair p-3">
  <div class="h-[132px] w-[132px] shrink-0 rounded-[8px] bg-white p-2 [&>svg]:h-full [&>svg]:w-full">{QR}</div>
  <div class="min-w-0 flex-1"><p class="text-[12px] text-on-surface-variant">Khoá</p>
    <div class="mt-1 flex items-center gap-1 rounded-md bg-surface-container py-1 pl-2 pr-0.5"><span class="mono min-w-0 flex-1 text-[12.5px] leading-5">{SECRET}</span>
      <a id="copy-secret" href="#copy-secret" title="Chép khoá" class="hov flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant">{gi("content-copy-outline-rounded", 15)}</a></div>
    <p class="mt-2 truncate text-[12px] text-on-surface-variant">{MEMBER["email"]}</p></div></div>
<p class="mt-5 text-[13px] font-medium">Mã từ ứng dụng</p>
<div class="mt-1.5">{code("", 0)}</div>
<div class="mt-6">{submit("Bật", "enable")}</div>""", 420)


SCREENS = {
    "home-moderator": lambda: home("moderator"),
    "home-admin": lambda: home("admin"),
    "signin-password": signin_password,
    "signin-code": signin_code,
    "first-password": first_password,
    "first-totp": first_totp,
}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name]())
        print("wrote", name)
