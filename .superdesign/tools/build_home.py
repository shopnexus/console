"""The console's Home, for an admin and for a moderator, with the console shell.

Writes ../mockups/home-<role>.html. Content uses only what the API serves
today: account search (GET /v1/console/accounts?q=), the audit log
(GET /v1/console/actions, admins), members (GET /v1/console/members, admins) and
the dashboard tickets. Reports have no endpoints yet.
"""
import sys
from pathlib import Path

from common import DASHBOARDS, LOGO, ROLE, head, icon, shape, theme_switch

OUT = Path(__file__).resolve().parent.parent / "mockups"

PEOPLE = {
    "admin": dict(name="Trần Minh Khoa", first="Khoa", initial="K", email="khoa.tran@shopnexus.id.vn"),
    "moderator": dict(name="Nguyễn Thị Lan", first="Lan", initial="L", email="lan.nguyen@shopnexus.id.vn"),
}

# The audit log's action kinds (internal/platform/audit) in the console's words.
KIND = {
    "account.suspend": ("Tạm khoá", "block", "error"),
    "account.unsuspend": ("Mở khoá", "lock-open-right-outline-rounded", "primary"),
    "member.create": ("Tạo nhân viên", "person-add-outline-rounded", "secondary"),
    "member.reset_totp": ("Đặt lại 2 bước", "phonelink-lock-outline-rounded", "secondary"),
    "member.unlock": ("Mở đăng nhập", "key-outline-rounded", "secondary"),
    "member.disable": ("Vô hiệu hoá", "person-off-outline-rounded", "error"),
}

ACTIONS = [
    ("14:32", "Nguyễn Thị Lan", "account.suspend", "Phạm Quốc Huy", "3f9a2c71", "Bán iPhone dựng, ảnh lấy từ tin khác; 4 người mua báo cáo"),
    ("13:58", "Trần Minh Khoa", "member.unlock", "Lê Hoàng Nam", "b81e04d2", "Gõ sai mật khẩu sau khi đổi máy"),
    ("11:20", "Đỗ Thu Hà", "account.unsuspend", "Võ Thanh Tâm", "c27d9e18", "Đã xác minh giấy tờ, không phải chủ nhóm"),
    ("10:47", "Nguyễn Thị Lan", "account.suspend", "Shop Đồng Hồ Sài Gòn", "e05b3a66", "Đồng hồ giả thương hiệu; theo yêu cầu của Cục QLTT"),
    ("09:15", "Trần Minh Khoa", "member.create", "Bùi Gia Bảo", "71c4fa09", "Kiểm duyệt viên ca tối"),
    ("15/11", "Đỗ Thu Hà", "account.suspend", "Nhóm 6 tài khoản", "9d02e7b3", "Cùng thiết bị, cùng mẫu tin xe máy cọc trước"),
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

SHORTCUTS = [("/", "Tìm tài khoản"), ("j k", "Lên, xuống trong danh sách"), ("Enter", "Mở bản ghi"), ("Esc", "Đóng panel bên cạnh"), ("[", "Thu gọn, mở rộng thanh bên")]


def kbd(keys):
    return "".join(f'<kbd class="inline-flex h-6 min-w-6 items-center justify-center rounded-xs border border-outline-variant bg-surface-container-lowest px-1.5 font-mono text-label-small text-on-surface-variant">{k}</kbd>'
                   for k in keys.split())


def drawer(role, active="home", open_tickets=7, open_reports=None, rail=False, agent=False):
    """open_reports: the count of reports waiting, or None while Báo cáo is not built.
    agent: show Agent, the member's own chats with the console agent.
    rail: the 64 px rail Hỗ trợ opens with; the drawer is 256 px."""
    me = PEOPLE[role]
    admin = role == "admin"
    items = [
        ("home", "Trang chủ", "home-rounded", True, ""),
        ("support", "Hỗ trợ", "support-agent-rounded", True, str(open_tickets)),
        ("reports", "Báo cáo", "flag-outline-rounded", True, str(open_reports)) if open_reports is not None else None,
        ("agent", "Agent", "auto-awesome-outline-rounded", True, "") if agent else None,
        ("accounts", "Tài khoản", "group-outline-rounded", False, "Sắp có"),
        ("actions", "Nhật ký thao tác", "history-rounded", False, "Sắp có") if admin else None,
        ("members", "Nhân viên", "badge-outline-rounded", False, "Sắp có") if admin else None,
        ("reports", "Báo cáo", "flag-outline-rounded", False, "Sắp có") if open_reports is None else None,
    ]
    shape_ = "w-10 justify-center" if rail else "px-3"
    rows = []
    for key, label, ic, enabled, badge in [i for i in items if i]:
        on = key == active
        if on:
            ic = ic.replace("-outline", "")
        soon = badge == "Sắp có"
        cls = ("bg-secondary-container text-on-secondary-container" if on
               else "text-on-surface-variant opacity-60" if soon else "text-on-surface-variant")
        b = ""
        if rail and badge and not soon:
            tone = "bg-error text-on-error" if key == "members" else "bg-primary text-on-primary"
            b = f'<span class="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-label-small {tone}">{badge}</span>'
        elif rail:
            b = ""
        elif soon:
            b = '<span class="shrink-0 rounded-full border border-outline-variant px-1.5 text-label-small">Sắp có</span>'
        elif key in ("support", "reports") and badge:
            # M3's drawer badge: the count of open tickets as a plain label at the end.
            b = f'<span class="text-label-large">{badge}</span>'
        elif badge:
            b = f'<span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-label-small text-on-error">{badge}</span>'
        text = "" if rail else f'<span class="flex-1 truncate text-label-large">{label}</span>'
        rows.append(f'<a id="nav-{key}{"-soon" if soon else ""}" href="#{key}" title="{label}" class="state relative flex h-10 items-center gap-2.5 rounded-full {shape_} {cls}">'
                    f'{icon(ic, 20)}{text}{b}</a>')
    tools = []
    for key, (name, host, ic, floor, _) in DASHBOARDS.items():
        ok = admin or floor == "moderator"
        right = "" if rail else f'<span class="text-outline">{icon("open-in-new-rounded" if ok else "lock-outline-rounded", 16)}</span>'
        text = "" if rail else f'<span class="flex-1 text-label-large">{name}</span>'
        tools.append(f'<a id="drawer-tool-{key}" href="#tool-{key}" title="{name}" class="state flex h-10 items-center gap-2.5 rounded-full {shape_} text-on-surface-variant {"" if ok else "opacity-60"}">'
                     f'{icon(ic, 20)}{text}{right}</a>')
    toggle = (f'<a id="nav-toggle" href="#nav-toggle" title="{"Mở rộng" if rail else "Thu gọn"} ([)" class="state flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant">'
              f'{icon("left-panel-open-outline-rounded" if rail else "left-panel-close-outline-rounded", 20)}</a>')
    out = f'<a id="sign-out" href="#sign-out" title="Đăng xuất" class="state flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant">{icon("logout-rounded", 20)}</a>'
    avatar = f'<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-title-small text-on-primary">{me["initial"]}</span>'
    if rail:
        return f"""<nav class="flex w-16 shrink-0 flex-col items-center bg-surface-container-low px-3 py-3">
  <div class="flex flex-col items-center gap-2 pb-3"><a id="brand" href="#home"><img src="{LOGO}" alt="ShopNexus" class="h-8 w-8 rounded-md"></a>{toggle}</div>
  <div class="space-y-0.5">{"".join(rows)}</div>
  <span class="my-3 h-px w-6 bg-outline-variant"></span>
  <div class="space-y-0.5">{"".join(tools)}</div>
  <div class="mt-auto flex flex-col items-center gap-1 pt-3">{avatar}{out}</div>
</nav>"""
    return f"""<nav class="flex w-64 shrink-0 flex-col bg-surface-container-low px-3 py-3">
  <div class="flex items-center gap-2 pb-3 pl-2">
    <a id="brand" href="#home" class="flex min-w-0 flex-1 items-center gap-2.5">
      <img src="{LOGO}" alt="ShopNexus" class="h-8 w-8 rounded-md">
      <span class="text-title-small">ShopNexus</span>
      <span class="rounded-full bg-secondary-container px-2 text-label-small text-on-secondary-container">Console</span>
    </a>{toggle}
  </div>
  <div class="space-y-0.5">{"".join(rows)}</div>
  <p class="mt-4 px-3 pb-1 text-label-medium text-on-surface-variant">Công cụ</p>
  <div class="space-y-0.5">{"".join(tools)}</div>
  <div class="mt-auto flex items-center gap-2 rounded-lg bg-surface-container py-1.5 pl-1.5 pr-1">
    {avatar}
    <div class="min-w-0 flex-1"><p class="truncate text-label-large">{me['name']}</p><p class="text-body-small text-on-surface-variant">{ROLE[role]}</p></div>
    {out}
  </div>
</nav>"""


def topbar(role, title="Trang chủ"):
    return f"""<header class="flex h-12 shrink-0 items-center gap-4 px-5">
  <h1 class="flex-1 text-title-large">{title}</h1>
  {theme_switch()}
</header>"""


def search_hero(role):
    return f"""<section class="relative overflow-hidden rounded-xl bg-primary-container px-6 py-4">
  {shape("Cookie9Sided", 240, "#85D5C9", "absolute -right-12 -top-20 opacity-[.18]")}
  {shape("Clover4Leaf", 64, "#97E7DB", "drift absolute right-48 -bottom-2 opacity-25", "--r:14deg")}
  <a id="search" href="#search" class="state relative flex h-12 max-w-[640px] items-center gap-3 rounded-full bg-surface-container-lowest px-4 text-on-surface-variant">
    {icon("search-rounded", 20)}<span class="flex-1 text-body-medium">Id, email hoặc số điện thoại</span>{kbd("/")}
  </a>
</section>"""


def card(title, body, action="", aid=""):
    act = f'<a id="{aid}" href="#{aid}" class="state rounded-full px-2.5 py-1 text-label-large text-primary">{action}</a>' if action else ""
    return f"""<section class="rounded-lg bg-surface-container-lowest px-4 pb-2 pt-3">
  <div class="mb-2 flex items-center justify-between"><h3 class="text-title-small">{title}</h3>{act}</div>
  {body}
</section>"""


def actions_table():
    rows = []
    for when, actor, kind, target, tid, reason in ACTIONS:
        label, ic, tone = KIND[kind]
        chip = {"error": "bg-error-container text-error", "primary": "bg-secondary-container text-on-secondary-container",
                "secondary": "bg-surface-container-high text-on-surface-variant"}[tone]
        rows.append(f"""<a id="action-{tid}" href="#action-{tid}" class="state grid min-h-10 grid-cols-[56px_128px_136px_1fr] items-center gap-3 border-t border-outline-variant px-2 py-1.5 text-body-medium">
  <span class="text-on-surface-variant">{when}</span>
  <span class="truncate">{actor}</span>
  <span class="inline-flex w-fit items-center gap-1 rounded-sm px-1.5 py-0.5 text-label-medium {chip}">{icon(ic, 16)}{label}</span>
  <span class="flex min-w-0 items-baseline gap-2"><span class="shrink-0">{target} <span class="font-mono text-body-small text-on-surface-variant">{tid}</span></span><span class="min-w-0 truncate text-body-small text-on-surface-variant">{reason}</span></span>
</a>""")
    head_row = ('<div class="grid grid-cols-[56px_128px_136px_1fr] gap-3 px-2 pb-1.5 text-label-medium text-on-surface-variant">'
                '<span>Lúc</span><span>Người làm</span><span>Thao tác</span><span>Đối tượng và lý do</span></div>')
    return head_row + "".join(rows)


def attention_list():
    tones = {"error": "bg-error-container text-error", "tertiary": "bg-tertiary-fixed text-on-tertiary-fixed-variant",
             "neutral": "bg-surface-container-high text-on-surface-variant"}
    out = []
    for i, (name, role, ic, what, tone) in enumerate(ATTENTION):
        out.append(f"""<a id="attention-{i}" href="#members" class="state flex items-center gap-3 rounded-md px-1 py-1.5">
  <span class="flex h-8 w-8 items-center justify-center rounded-full {tones[tone]}">{icon(ic, 18)}</span>
  <span class="min-w-0 flex-1"><span class="block truncate text-label-large">{name}</span><span class="block text-body-small text-on-surface-variant">{what}</span></span>
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
        out.append(f"""<a id="recent-{aid}" href="#account-{aid}" class="state flex min-h-12 items-center gap-3 border-t border-outline-variant px-2 py-1.5">
  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-large text-on-surface-variant">{name[0]}</span>
  <span class="min-w-0 flex-1"><span class="flex items-center gap-2"><span class="truncate text-label-large">{name}</span><span class="font-mono text-body-small text-on-surface-variant">{aid}</span>{chip}</span>
  <span class="block truncate text-body-small text-on-surface-variant">{line}</span></span>
  <span class="text-body-small text-on-surface-variant">{when}</span>
</a>""")
    return "".join(out)


def shortcuts():
    return "".join(f'<div class="flex items-center justify-between py-1.5 text-body-medium"><span class="text-on-surface-variant">{t}</span><span class="flex gap-1">{kbd(k)}</span></div>'
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
    <main class="flex-1 space-y-4 overflow-hidden px-5 pb-5">
      {search_hero(role)}
      <div class="grid grid-cols-[1fr_280px] items-start gap-4">
        <div>{left}</div>
        <div class="space-y-4">{right}</div>
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
