"""The console's Home, for an admin and for a moderator, with the console shell.

Writes ../mockups/home-<role>.html. Content uses only what the API serves
today: account search (GET /v1/staff/accounts?q=), the audit log
(GET /v1/staff/actions, admins), members (GET /v1/staff/members, admins) and
the dashboard tickets. Reports have no endpoints yet.
"""
import sys
from pathlib import Path

from common import DASHBOARDS, LOGO, ROLE, head, icon, shape

OUT = Path(__file__).resolve().parent.parent / "mockups"

PEOPLE = {
    "admin": dict(name="Trần Minh Khoa", first="Khoa", initial="K", email="khoa.tran@shopnexus.id.vn"),
    "moderator": dict(name="Nguyễn Thị Lan", first="Lan", initial="L", email="lan.nguyen@shopnexus.id.vn"),
}

# The audit log's action kinds (internal/platform/audit) in the console's words.
KIND = {
    "account.suspend": ("Tạm khoá", "block", "error"),
    "account.unsuspend": ("Mở khoá", "lock-open-right-outline-rounded", "primary"),
    "staff.create": ("Tạo nhân viên", "person-add-outline-rounded", "secondary"),
    "staff.reset_totp": ("Đặt lại 2 bước", "phonelink-lock-outline-rounded", "secondary"),
    "staff.unlock": ("Mở đăng nhập", "key-outline-rounded", "secondary"),
    "staff.disable": ("Vô hiệu hoá", "person-off-outline-rounded", "error"),
}

ACTIONS = [
    ("14:32", "Nguyễn Thị Lan", "account.suspend", "Phạm Quốc Huy", "3f9a2c71", "Bán iPhone dựng, ảnh lấy từ tin khác; 4 người mua báo cáo"),
    ("13:58", "Trần Minh Khoa", "staff.unlock", "Lê Hoàng Nam", "b81e04d2", "Gõ sai mật khẩu sau khi đổi máy"),
    ("11:20", "Đỗ Thu Hà", "account.unsuspend", "Võ Thanh Tâm", "c27d9e18", "Đã xác minh giấy tờ, không phải chủ nhóm"),
    ("10:47", "Nguyễn Thị Lan", "account.suspend", "Shop Đồng Hồ Sài Gòn", "e05b3a66", "Đồng hồ giả thương hiệu; theo yêu cầu của Cục QLTT"),
    ("09:15", "Trần Minh Khoa", "staff.create", "Bùi Gia Bảo", "71c4fa09", "Kiểm duyệt viên ca tối"),
    ("Hôm qua", "Đỗ Thu Hà", "account.suspend", "Nhóm 6 tài khoản", "9d02e7b3", "Cùng thiết bị, cùng mẫu tin xe máy cọc trước"),
]

ATTENTION = [
    ("Lê Hoàng Nam", "Kiểm duyệt viên", "key-outline-rounded", "Khoá đăng nhập đến 15:02", "error"),
    ("Bùi Gia Bảo", "Kiểm duyệt viên", "phonelink-lock-outline-rounded", "Chưa bật 2 bước", "tertiary"),
    ("Hồ Mỹ Linh", "Quản trị viên", "schedule-outline-rounded", "Chưa đăng nhập lần nào", "neutral"),
]

RECENT = [
    ("Phạm Quốc Huy", "3f9a2c71", "suspended", "Tạm khoá đến 19/11 · Bán iPhone dựng", "10 phút trước"),
    ("Trương Bảo Ngọc", "a61f3b08", "active", "Hoạt động từ 03/2025 · 42 tin đã bán", "35 phút trước"),
    ("Shop Đồng Hồ Sài Gòn", "e05b3a66", "suspended", "Tạm khoá, không thời hạn · Đồng hồ giả", "2 giờ trước"),
    ("Nguyễn Văn Phúc", "5c90de21", "active", "Hoạt động từ 08/2026 · 3 tin đang đăng", "Hôm qua"),
]

SHORTCUTS = [("/", "Tìm tài khoản"), ("j k", "Lên, xuống trong danh sách"), ("Enter", "Mở bản ghi"), ("Esc", "Đóng panel bên cạnh")]


def kbd(keys):
    return "".join(f'<kbd class="inline-flex h-6 min-w-6 items-center justify-center rounded-xs border border-outline-variant bg-surface-container-lowest px-1.5 font-mono text-label-small text-on-surface-variant">{k}</kbd>'
                   for k in keys.split())


def drawer(role):
    me = PEOPLE[role]
    admin = role == "admin"
    items = [
        ("home", "Trang chủ", "home-rounded", True, True, ""),
        ("accounts", "Tài khoản", "group-outline-rounded", False, True, ""),
        ("actions", "Nhật ký thao tác", "history-rounded", False, admin, ""),
        ("members", "Nhân viên", "badge-outline-rounded", False, admin, "1" if admin else ""),
        ("reports", "Báo cáo", "flag-outline-rounded", False, False, "Sắp có"),
    ]
    rows = []
    for key, label, ic, on, enabled, badge in items:
        if not enabled and key != "reports":
            continue
        if on:
            cls = "bg-secondary-container text-on-secondary-container"
        elif enabled:
            cls = "text-on-surface-variant"
        else:
            cls = "text-on-surface-variant opacity-60"
        b = ""
        if badge == "Sắp có":
            b = '<span class="rounded-full border border-outline-variant px-2 py-0.5 text-label-small">Sắp có</span>'
        elif badge:
            b = f'<span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-label-small text-on-error">{badge}</span>'
        rows.append(f'<a id="nav-{key}" href="#{key}" class="state flex h-14 items-center gap-3 rounded-full px-4 {cls}">{icon(ic, 24)}'
                    f'<span class="flex-1 text-label-large">{label}</span>{b}</a>')
    tools = []
    for key, (name, host, ic, floor, _) in DASHBOARDS.items():
        ok = admin or floor == "moderator"
        right = icon("open-in-new-rounded", 16) if ok else icon("lock-outline-rounded", 16)
        tools.append(f'<a id="drawer-tool-{key}" href="#tool-{key}" class="state flex h-11 items-center gap-3 rounded-full px-4 text-on-surface-variant {"" if ok else "opacity-60"}">'
                     f'{icon(ic, 20)}<span class="flex-1 text-label-large">{name}</span><span class="text-outline">{right}</span></a>')
    return f"""<nav class="flex w-[360px] shrink-0 flex-col bg-surface-container-low px-3 py-4">
  <a id="brand" href="#home" class="flex items-center gap-3 px-4 pb-6 pt-1">
    <img src="{LOGO}" alt="ShopNexus" class="h-9 w-9 rounded-md">
    <span class="text-title-medium">ShopNexus</span>
    <span class="rounded-full bg-secondary-container px-2.5 py-0.5 text-label-medium text-on-secondary-container">Console</span>
  </a>
  <div class="space-y-1">{"".join(rows)}</div>
  <p class="mt-6 px-4 pb-2 text-title-small text-on-surface-variant">Công cụ</p>
  <div>{"".join(tools)}</div>
  <div class="mt-auto flex items-center gap-3 rounded-xl bg-surface-container px-3 py-3">
    <span class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-title-medium text-on-primary">{me['initial']}</span>
    <div class="min-w-0 flex-1"><p class="truncate text-label-large">{me['name']}</p><p class="text-body-small text-on-surface-variant">{ROLE[role]}</p></div>
    <a id="sign-out" href="#sign-out" title="Đăng xuất" class="state flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant">{icon("logout-rounded", 20)}</a>
  </div>
</nav>"""


def topbar(role):
    return f"""<header class="flex h-16 shrink-0 items-center gap-4 px-8">
  <h1 class="text-title-large">Trang chủ</h1>
  <span class="flex-1"></span>
  <span class="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 text-label-medium text-on-surface-variant">{icon("timer-outline-rounded", 16)}Phiên còn 6 giờ 12 phút</span>
  <a id="theme" href="#theme" title="Giao diện" class="state flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant">{icon("contrast-rounded", 22)}</a>
</header>"""


def search_hero(role):
    return f"""<section class="relative overflow-hidden rounded-xl-plus bg-primary-container px-10 py-8">
  {shape("Cookie9Sided", 360, "#85D5C9", "absolute -right-20 -top-28 opacity-[.18]")}
  {shape("Clover4Leaf", 96, "#97E7DB", "drift absolute right-56 bottom-2 opacity-25", "--r:14deg")}
  <a id="search" href="#search" class="state relative flex h-14 max-w-[680px] items-center gap-3 rounded-full bg-surface-container-lowest px-5 text-on-surface-variant">
    {icon("search-rounded", 24)}<span class="flex-1 text-body-large">Id, email hoặc số điện thoại</span>{kbd("/")}
  </a>
</section>"""


def card(title, body, action="", aid=""):
    act = f'<a id="{aid}" href="#{aid}" class="state rounded-full px-3 py-1.5 text-label-large text-primary">{action}</a>' if action else ""
    return f"""<section class="rounded-xl bg-surface-container-lowest p-6">
  <div class="mb-3 flex items-center justify-between"><h3 class="text-title-medium">{title}</h3>{act}</div>
  {body}
</section>"""


def actions_table():
    rows = []
    for when, actor, kind, target, tid, reason in ACTIONS:
        label, ic, tone = KIND[kind]
        chip = {"error": "bg-error-container text-error", "primary": "bg-secondary-container text-on-secondary-container",
                "secondary": "bg-surface-container-high text-on-surface-variant"}[tone]
        rows.append(f"""<a id="action-{tid}" href="#action-{tid}" class="state grid min-h-[52px] grid-cols-[64px_128px_136px_1fr] items-center gap-4 border-t border-outline-variant px-3 py-2.5 text-body-medium">
  <span class="text-on-surface-variant">{when}</span>
  <span class="truncate">{actor}</span>
  <span class="inline-flex w-fit items-center gap-1.5 rounded-sm px-2 py-1 text-label-medium {chip}">{icon(ic, 16)}{label}</span>
  <span class="min-w-0"><span class="block truncate">{target} <span class="font-mono text-body-small text-on-surface-variant">{tid}</span></span><span class="block text-body-small text-on-surface-variant">{reason}</span></span>
</a>""")
    head_row = ('<div class="grid grid-cols-[64px_128px_136px_1fr] gap-4 px-3 pb-2 text-label-large text-on-surface-variant">'
                '<span>Lúc</span><span>Người làm</span><span>Thao tác</span><span>Đối tượng và lý do</span></div>')
    return head_row + "".join(rows)


def attention_list():
    tones = {"error": "bg-error-container text-error", "tertiary": "bg-tertiary-fixed text-on-tertiary-fixed-variant",
             "neutral": "bg-surface-container-high text-on-surface-variant"}
    out = []
    for i, (name, role, ic, what, tone) in enumerate(ATTENTION):
        out.append(f"""<a id="attention-{i}" href="#members" class="state flex items-center gap-3 rounded-lg px-2 py-2.5">
  <span class="flex h-10 w-10 items-center justify-center rounded-full {tones[tone]}">{icon(ic, 20)}</span>
  <span class="min-w-0 flex-1"><span class="block truncate text-title-small">{name}</span><span class="block text-body-small text-on-surface-variant">{what}</span></span>
  {icon("chevron-right-rounded", 20, "text-outline")}
</a>""")
    return "".join(out)


def tools_grid(role):
    out = []
    for key, (name, host, ic, floor, what) in DASHBOARDS.items():
        ok = role == "admin" or floor == "moderator"
        tile = "bg-secondary-container text-on-secondary-container" if ok else "bg-surface-container-high text-outline"
        tail = (f'<span class="text-on-surface-variant">{icon("open-in-new-rounded", 16)}</span>' if ok
                else f'<span class="text-outline" title="Chỉ quản trị viên">{icon("lock-outline-rounded", 16)}</span>')
        out.append(f"""<a id="tool-{key}" href="#tool-{key}" class="state flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-3 {"" if ok else "opacity-70"}">
  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md {tile}">{icon(ic, 22)}</span>
  <span class="min-w-0 flex-1 text-title-small">{name}</span>{tail}
</a>""")
    return f'<div class="grid grid-cols-2 gap-2">{"".join(out)}</div>'


def recent_list():
    out = []
    for name, aid, status, line, when in RECENT:
        chip = ('<span class="rounded-sm bg-error-container px-2 py-0.5 text-label-medium text-error">Tạm khoá</span>' if status == "suspended"
                else '<span class="rounded-sm bg-secondary-container px-2 py-0.5 text-label-medium text-on-secondary-container">Hoạt động</span>')
        out.append(f"""<a id="recent-{aid}" href="#account-{aid}" class="state flex h-[64px] items-center gap-4 border-t border-outline-variant px-3">
  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-title-small text-on-surface-variant">{name[0]}</span>
  <span class="min-w-0 flex-1"><span class="flex items-center gap-2"><span class="truncate text-title-small">{name}</span><span class="font-mono text-body-small text-on-surface-variant">{aid}</span>{chip}</span>
  <span class="block truncate text-body-small text-on-surface-variant">{line}</span></span>
  <span class="text-body-small text-on-surface-variant">{when}</span>
</a>""")
    return "".join(out)


def shortcuts():
    return "".join(f'<div class="flex items-center justify-between py-2 text-body-medium"><span class="text-on-surface-variant">{t}</span><span class="flex gap-1">{kbd(k)}</span></div>'
                   for k, t in SHORTCUTS)


def page(role):
    if role == "admin":
        left = card("Nhật ký thao tác", actions_table(), "Xem tất cả", "all-actions")
        right = card("Nhân viên", attention_list(), "Xem tất cả", "all-members")
    else:
        left = card("Vừa mở", recent_list(), "Tài khoản", "all-accounts")
        right = card("Phím tắt", shortcuts())
    return f"""{head(f"Trang chủ · {ROLE[role]} · Console")}<body>
<div class="flex h-[900px] w-[1440px] bg-surface text-on-surface">
  {drawer(role)}
  <div class="flex min-w-0 flex-1 flex-col">
    {topbar(role)}
    <main class="flex-1 space-y-6 overflow-hidden px-8 pb-8">
      {search_hero(role)}
      <div class="grid grid-cols-[1fr_288px] items-start gap-6">
        <div>{left}</div>
        <div class="space-y-6">{right}</div>
      </div>
    </main>
  </div>
</div>
</body>
</html>
"""


SCREENS = {"home-admin": ("Trang chủ · Quản trị viên", lambda: page("admin")),
           "home-moderator": ("Trang chủ · Kiểm duyệt viên", lambda: page("moderator"))}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
