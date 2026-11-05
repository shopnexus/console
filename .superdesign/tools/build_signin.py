"""Sign-in and dashboard handoff screens for the console.

Writes ../mockups/<name>.html. See ../design-system.md, "Sign-in and
dashboard handoff".
"""
import sys
from html import escape
from pathlib import Path

import segno

from common import (DASHBOARDS, LOGO, MEMBER, ROLE, button, code_boxes, field, head, icon, member_chip, ring, shape,
                    signin_page, steps)

OUT = Path(__file__).resolve().parent.parent / "mockups"
SECRET = "JBSW Y3DP EHPK 3PXP K4QF"


def eye():
    return f'<a id="toggle-password" href="#toggle-password" title="Hiện mật khẩu" class="state flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant">{icon("visibility-outline-rounded", 22)}</a>'


def note(icon_name, text):
    return (f'<div class="mt-6 flex gap-3 rounded-lg bg-surface-container-low p-4">'
            f'<span class="mt-0.5 text-primary">{icon(icon_name, 20)}</span>'
            f'<p class="text-body-medium text-on-surface-variant">{text}</p></div>')


def password_screen():
    form = f"""
<h1 class="text-headline-medium">Đăng nhập</h1>
<div class="mt-8 space-y-6">
  {field("Email", MEMBER["email"])}
  {field("Mật khẩu", "goi-cuon-ngon-2026", focused=True, password=True, trailing=eye())}
</div>
<div class="mt-8">{button("Tiếp tục", icon_name="arrow-forward-rounded", aid="continue")}</div>
"""
    return signin_page("Đăng nhập · Console", form)


def code_screen():
    form = f"""
{member_chip()}
<h1 class="mt-6 text-headline-medium">Mã xác thực</h1>
<div class="mt-8">{code_boxes("482", focus_at=3)}</div>
<div class="mt-4 flex items-center gap-2 text-body-small text-on-surface-variant">{ring(18)}<span>18 giây</span></div>
<div class="mt-8">{button("Đăng nhập", aid="sign-in")}</div>
"""
    return signin_page("Mã xác thực · Console", form)


def rule(text, ok):
    mark = (f'<span class="text-primary">{icon("check-circle-rounded", 20)}</span>' if ok
            else f'<span class="text-outline">{icon("radio-button-unchecked", 20)}</span>')
    return f'<li class="flex items-center gap-2 text-body-medium {"text-on-surface" if ok else "text-on-surface-variant"}">{mark}{text}</li>'


def new_password_screen():
    top = f'<div class="mb-8">{steps(1)}</div>'
    form = f"""
<h1 class="text-headline-medium">Mật khẩu mới</h1>
<div class="mt-8 space-y-6">
  {field("Mật khẩu mới", "chieu-mua-o-thu-duc", password=True, trailing=eye())}
  {field("Nhập lại mật khẩu mới", "chieu-mua-o-thu", focused=True, password=True)}
</div>
<ul class="mt-6 space-y-2">
  {rule("12–128 ký tự", True)}
  {rule("Khác email", True)}
  {rule("Khác mật khẩu tạm", True)}
  {rule("Hai ô khớp nhau", False)}
</ul>
<div class="mt-8">{button("Tiếp tục", icon_name="arrow-forward-rounded", aid="continue")}</div>
"""
    return signin_page("Lần đầu · Mật khẩu mới · Console", form, top)


def qr_svg():
    uri = ("otpauth://totp/ShopNexus%20Console:" + MEMBER["email"] + "?secret=" + SECRET.replace(" ", "")
           + "&issuer=ShopNexus%20Console")
    q = segno.make(uri, error="m")
    return q.svg_inline(scale=4, border=0, dark="#181C1C", light=None)


def enroll_screen():
    top = f'<div class="mb-6">{steps(2)}</div>'
    form = f"""
<h1 class="text-headline-medium">Xác thực hai bước</h1>
<div class="mt-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
  <div class="flex justify-center">
    <div class="h-[176px] w-[176px] rounded-lg bg-white p-2.5 [&>svg]:h-full [&>svg]:w-full">{qr_svg()}</div>
  </div>
  <div class="mt-4 border-t border-outline-variant pt-3">
    <div class="flex items-center gap-2 rounded-sm bg-surface-container py-1.5 pl-3 pr-1">
      <span class="flex-1 font-mono text-body-large tracking-wide">{SECRET}</span>
      <a id="copy-secret" href="#copy-secret" title="Chép khoá" class="state flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{icon("content-copy-outline-rounded", 18)}</a>
    </div>
    <p class="mt-2 text-body-small text-on-surface-variant">{MEMBER["email"]}</p>
  </div>
</div>
<p class="mt-5 text-title-small">Mã từ ứng dụng</p>
<div class="mt-3">{code_boxes("", focus_at=0)}</div>
<div class="mt-6">{button("Bật", aid="enable")}</div>
"""
    return signin_page("Lần đầu · Xác thực hai bước · Console", form, top)


HANDOFF_CSS = """
  @keyframes travel { 0% { left: 0; opacity: 0 } 15% { opacity: 1 } 85% { opacity: 1 } 100% { left: calc(100% - 10px); opacity: 0 } }
  .traveller { animation: travel 1.6s var(--spatial) infinite; }
  @keyframes bar { 0% { left: -40%; width: 40% } 60% { left: 60%; width: 50% } 100% { left: 100%; width: 10% } }
  .bar { animation: bar 1.8s var(--effects) infinite; }
"""


def tool_tile(key, size=64, state="on"):
    name, host, ic, floor, _ = DASHBOARDS[key]
    cls = {"on": "bg-secondary-container text-on-secondary-container",
           "off": "bg-surface-container-high text-outline"}[state]
    return f'<div class="flex shrink-0 items-center justify-center rounded-lg-plus {cls}" style="width:{size}px;height:{size}px">{icon(ic, size // 2)}</div>'


def other_tools(current, role):
    rows = []
    for key, (name, host, ic, floor, what) in DASHBOARDS.items():
        if key == current:
            continue
        allowed = role == "admin" or floor == "moderator"
        right = (f'<span class="text-on-surface-variant">{icon("open-in-new-rounded", 18)}</span>' if allowed
                 else f'<span class="text-outline" title="Chỉ {ROLE["admin"].lower()}">{icon("lock-outline-rounded", 18)}</span>')

        rows.append(f"""<a id="tool-{key}" href="#tool-{key}" class="state flex items-center gap-3 rounded-lg px-3 py-2.5 {"" if allowed else "opacity-70"}">
  {tool_tile(key, 40, "on" if allowed else "off")}
  <span class="min-w-0 flex-1 text-title-small">{name}</span>{right}
</a>""")
    return "".join(rows)


def handoff_page(title, card, current, role):
    return f"""{head(title, HANDOFF_CSS)}<body>
<div class="relative flex h-[900px] w-[1440px] flex-col overflow-hidden bg-surface text-on-surface">
  {shape("Cookie9Sided", 640, "#C7E6E0", "absolute -left-56 -top-64 opacity-60")}
  {shape("Clover4Leaf", 220, "#E6E9E7", "drift absolute right-24 top-20", "--r:10deg")}
  {shape("Sunny", 120, "#FFDBCF", "drift absolute bottom-24 left-32 opacity-70", "--r:-6deg;animation-delay:-4s")}
  <header class="relative flex h-16 items-center justify-between px-8">
    <a id="console-home" href="#console" class="flex items-center gap-3">
      <img src="{LOGO}" alt="ShopNexus" class="h-8 w-8 rounded-sm">
      <span class="text-title-medium">ShopNexus</span>
      <span class="rounded-full bg-secondary-container px-3 py-1 text-label-medium text-on-secondary-container">Console</span>
    </a>
    <div class="flex items-center gap-3">
      <span class="text-right"><span class="block text-label-large">{MEMBER["name"]}</span><span class="block text-body-small text-on-surface-variant">{ROLE[role]}</span></span>
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-title-medium text-on-secondary-container">{MEMBER["initial"]}</span>
    </div>
  </header>
  <main class="relative flex flex-1 items-center justify-center gap-6 px-8 pb-10">
    {card}
    <aside class="w-[280px] self-center rounded-xl bg-surface-container-low p-3">
      <p class="px-3 pb-2 pt-2 text-title-small text-on-surface-variant">Công cụ</p>
      {other_tools(current, role)}
    </aside>
  </main>
</div>
</body>
</html>
"""


def opening_screen():
    name, host, ic, floor, _ = DASHBOARDS["grafana"]
    card = f"""<section class="w-[600px] rounded-xl-plus bg-surface-container-lowest px-12 py-12">
  <div class="flex items-center gap-4">
    <img src="{LOGO}" alt="ShopNexus" class="h-16 w-16 rounded-lg-plus">
    <div class="relative h-2.5 flex-1">
      <div class="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-outline-variant"></div>
      <span class="traveller absolute top-0 h-2.5 w-2.5 rounded-full bg-primary"></span>
    </div>
    {tool_tile("grafana")}
  </div>
  <p class="mt-10 text-label-large text-primary">Đang mở</p>
  <h1 class="mt-2 text-display-small">{name}</h1>
  <p class="mt-2 font-mono text-body-medium text-on-surface-variant">{host}</p>
  <div class="relative mt-8 h-1 overflow-hidden rounded-full bg-secondary-container"><span class="bar absolute inset-y-0 rounded-full bg-primary"></span></div>
  <div class="mt-10 flex items-center gap-2">
    {button("Mở ngay", icon_name="open-in-new-rounded", full=False, href="#open", aid="open-now")}
    {button("Về console", kind="text", full=False, href="#console", aid="back")}
  </div>
</section>"""
    return handoff_page("Đang mở Grafana · Console", card, "grafana", "moderator")


def forbidden_screen():
    name, host, ic, floor, what = DASHBOARDS["restate"]
    card = f"""<section class="w-[600px] rounded-xl-plus bg-surface-container-lowest px-12 py-12">
  <div class="flex items-center gap-4">
    <img src="{LOGO}" alt="ShopNexus" class="h-16 w-16 rounded-lg-plus">
    <div class="relative flex h-10 flex-1 items-center">
      <div class="h-0 flex-1 border-t-2 border-dashed border-outline-variant"></div>
      <span class="mx-2 flex h-10 w-10 items-center justify-center rounded-full bg-error-container text-error">{icon("lock-outline-rounded", 20)}</span>
      <div class="h-0 flex-1 border-t-2 border-dashed border-outline-variant"></div>
    </div>
    {tool_tile("restate", state="off")}
  </div>
  <h1 class="mt-10 text-display-small">{name}</h1>
  <p class="mt-2 font-mono text-body-medium text-on-surface-variant">{host}</p>
  <p class="mt-6 inline-flex items-center gap-2 rounded-sm bg-error-container px-3 py-1.5 text-label-large text-error">{icon("lock-outline-rounded", 18)}Cần quyền {ROLE["admin"]}</p>
  <div class="mt-10 flex items-center gap-2">
    {button("Về console", full=False, href="#console", aid="back")}
  </div>
</section>"""
    return handoff_page("Không mở được Restate · Console", card, "restate", "moderator")


SCREENS = {
    "signin-password": ("Đăng nhập · Mật khẩu", password_screen),
    "signin-code": ("Đăng nhập · Mã xác thực", code_screen),
    "first-password": ("Lần đầu · Đặt mật khẩu mới", new_password_screen),
    "first-totp": ("Lần đầu · Bật xác thực hai bước", enroll_screen),
    "dashboard-opening": ("Mở công cụ · Đang mở", opening_screen),
    "dashboard-forbidden": ("Mở công cụ · Không đủ quyền", forbidden_screen),
}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
