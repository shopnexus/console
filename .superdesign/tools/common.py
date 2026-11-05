"""Shared pieces for the console mockups on the Superdesign canvas.

Tokens copy src/styles/tokens.css, which copies the Android app's design
system. The M3 Expressive shapes come from app/.superdesign/tools/shapes.py.
See ../design-system.md.
"""
import math
import sys
from html import escape
from pathlib import Path

sys.path.insert(0, str(Path.home() / "shopnexus/app/.superdesign/tools"))
from shapes import SHAPES  # noqa: E402

PROJECT = "d0e7dcea-fa3d-477d-9b2a-e072f17a3ee7"
MODEL = "claude-opus-5-5"
ASSETS = "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/projects/" + PROJECT
LOGO = ASSETS + "/brand-assets/console-logo/favicon.svg"
MASCOT = ASSETS + "/content-assets/art-verified/art_verified.webp"

# Published drafts on the Superdesign canvas.
DRAFTS = {
    "signin-password": "6533bc45-4871-421b-922e-0ebf2daa736b",
    "signin-code": "873eb270-e3e2-43ac-92d4-a30f1bedae38",
    "first-password": "93f45899-37da-42cc-becd-99cf69e34452",
    "first-totp": "73441be4-5773-4c5d-a31f-e282e15801c7",
    "dashboard-opening": "6ee970d2-cbd6-4259-949f-cb2d897394f7",
    "dashboard-forbidden": "ab2622a8-f6ba-4bfd-81d5-cb0bc37ac4bb",
    "home-admin": "153193af-37f9-48d3-90a6-7ca9a6cb6fab",
    "home-moderator": "3cfdd3b6-1824-4d7b-95f6-433b9c88bf46"
}

LIGHT = {
    "primary": "#005049", "on-primary": "#FFFFFF", "primary-container": "#066A61", "on-primary-container": "#97E7DB",
    "secondary": "#47645F", "on-secondary": "#FFFFFF", "secondary-container": "#C7E6E0", "on-secondary-container": "#4B6863",
    "tertiary": "#773115", "on-tertiary": "#FFFFFF", "tertiary-container": "#95482A", "on-tertiary-container": "#FFCDBC",
    "tertiary-fixed": "#FFDBCF", "on-tertiary-fixed-variant": "#773215",
    "error": "#BA1A1A", "on-error": "#FFFFFF", "error-container": "#FFDAD6",
    "surface": "#F7FAF8", "surface-container-lowest": "#FFFFFF", "surface-container-low": "#F1F4F2",
    "surface-container": "#EBEFED", "surface-container-high": "#E6E9E7", "surface-container-highest": "#E0E3E1",
    "on-surface": "#181C1C", "on-surface-variant": "#3E4947", "outline": "#6E7977", "outline-variant": "#BEC9C6",
    "inverse-surface": "#2D3130", "inverse-on-surface": "#EEF1EF", "inverse-primary": "#85D5C9",
}

TYPE = {
    "display-large": ("57px", "64px", "400", "-0.25px"),
    "display-medium": ("45px", "52px", "400", "0"),
    "display-small": ("36px", "44px", "400", "0"),
    "headline-medium": ("28px", "36px", "400", "0"),
    "headline-small": ("24px", "32px", "400", "0"),
    "title-large": ("22px", "28px", "400", "0"),
    "title-medium": ("16px", "24px", "500", "0.15px"),
    "title-small": ("14px", "20px", "500", "0.1px"),
    "body-large": ("16px", "24px", "400", "0.5px"),
    "body-medium": ("14px", "20px", "400", "0.25px"),
    "body-small": ("12px", "16px", "400", "0.4px"),
    "label-large": ("14px", "20px", "500", "0.1px"),
    "label-medium": ("12px", "16px", "500", "0.5px"),
    "label-small": ("11px", "16px", "500", "0.5px"),
}
RADII = {"xs": "4px", "sm": "8px", "md": "12px", "lg": "16px", "lg-plus": "20px", "xl": "28px", "xl-plus": "32px"}

# The member the mockups sign in as.
MEMBER = dict(name="Nguyễn Thị Lan", email="lan.nguyen@shopnexus.id.vn", initial="L")
ROLE = {"moderator": "Kiểm duyệt viên", "admin": "Quản trị viên"}

# The ops dashboards: name, host, icon, who may open it.
DASHBOARDS = {
    "grafana": ("Grafana", "grafana.shopnexus.id.vn", "monitoring", "moderator", "Theo dõi lỗi, độ trễ và log của server"),
    "restate": ("Restate", "restate.shopnexus.id.vn", "account-tree-outline-rounded", "admin", "Xem, huỷ và chạy lại các quy trình"),
    "litellm": ("LiteLLM", "litellm.shopnexus.id.vn", "neurology-outline-rounded", "admin", "Token đã dùng và ngân sách theo ngày"),
    "s3": ("RustFS", "s3.shopnexus.id.vn", "folder-open-outline-rounded", "admin", "Duyệt ảnh và video của tin đăng"),
    "argocd": ("Argo CD", "argocd.shopnexus.id.vn", "deployed-code-outline-rounded", "admin", "Bản đang chạy của hai stack"),
}


def icon(name, size=24, cls=""):
    if not name.endswith("-rounded") and "-outline" not in name:
        name = f"{name}-rounded"
    return f'<iconify-icon icon="material-symbols:{name}" width="{size}" height="{size}" class="block shrink-0 {cls}"></iconify-icon>'


def shape(name, size, fill, cls="", style=""):
    d = SHAPES[name]
    return (f'<svg viewBox="0 0 64 64" width="{size}" height="{size}" class="{cls}" style="{style}" aria-hidden="true">'
            f'<path d="{d}" fill="{fill}"/></svg>')


def head(title, extra_css=""):
    colors = ",".join(f"'{k}':'{v}'" for k, v in LIGHT.items())
    sizes = ",".join(
        f"'{k}':['{s}',{{lineHeight:'{lh}',fontWeight:'{fw}',letterSpacing:'{ls}'}}]" for k, (s, lh, fw, ls) in TYPE.items()
    )
    radii = ",".join(f"'{k}':'{v}'" for k, v in RADII.items())
    css_vars = " ".join(f"--md-{k}: {v};" for k, v in LIGHT.items())
    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {{ theme: {{ extend: {{
  colors: {{{colors}}},
  fontSize: {{{sizes}}},
  borderRadius: {{{radii}}},
  fontFamily: {{ sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] }},
  boxShadow: {{ float: '0 1px 3px 0 rgba(0,0,0,.30), 0 4px 8px 3px rgba(0,0,0,.15)' }},
}} }} }};
</script>
<script src="https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js"></script>
<style>
  :root {{ {css_vars}
    --spatial: linear(0, 0.107, 0.321, 0.539, 0.719, 0.848, 0.931, 0.979, 1.004, 1.014, 1.015, 1.011, 1.006, 1.003, 1);
    --effects: linear(0, 0.286, 0.625, 0.826, 0.924, 0.968, 0.987, 0.995, 1); }}
  html, body {{ background: var(--md-surface); font-family: "Be Vietnam Pro", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }}
  .state {{ position: relative; isolation: isolate; }}
  .state::after {{ content: ""; position: absolute; inset: 0; border-radius: inherit; background: currentColor; opacity: 0;
    pointer-events: none; transition: opacity 140ms var(--effects); }}
  .state:hover::after {{ opacity: .08; }}
  .state:active::after {{ opacity: .1; }}
  @keyframes caret {{ 0%, 49% {{ opacity: 1 }} 50%, 100% {{ opacity: 0 }} }}
  .caret {{ width: 2px; height: 28px; background: var(--md-primary); animation: caret 1.06s steps(1) infinite; }}
  @keyframes drift {{ 0%, 100% {{ transform: translateY(0) rotate(var(--r, 0deg)) }} 50% {{ transform: translateY(-10px) rotate(calc(var(--r, 0deg) + 8deg)) }} }}
  .drift {{ animation: drift 9s var(--effects) infinite; }}
{extra_css}
</style>
</head>
"""


def field(label, value="", *, focused=False, password=False, trailing="", supporting="", error=False, placeholder=""):
    """M3 outlined text field, 56 px, label on the border when it has a value."""
    border = "border-2 border-primary" if focused else ("border-2 border-error" if error else "border border-outline")
    label_color = "text-primary" if focused else ("text-error" if error else "text-on-surface-variant")
    shown = "•" * len(value) if password else escape(value)
    caret = '<span class="caret ml-px inline-block h-6 w-0.5 align-middle"></span>' if focused else ""
    body = (f'<span class="truncate {"tracking-[3px]" if password else ""}">{shown}</span>{caret}' if value
            else f'<span class="text-on-surface-variant">{escape(placeholder)}</span>{caret}')
    lbl = (f'<span class="absolute -top-2.5 left-3 bg-surface px-1 text-body-small {label_color}">{escape(label)}</span>'
           if value or focused else "")
    sup = (f'<p class="mt-1 px-4 text-body-small {"text-error" if error else "text-on-surface-variant"}">{supporting}</p>'
           if supporting else "")
    return f"""<div>
  <div class="relative flex h-14 items-center gap-3 rounded-xs {border} pl-4 pr-3 text-body-large text-on-surface">
    {lbl}<div class="flex min-w-0 flex-1 items-center">{body}</div>{trailing}
  </div>{sup}
</div>"""


def code_boxes(digits, focus_at=None, error=False):
    """Six code boxes in two groups of three."""
    out = []
    for i in range(6):
        d = digits[i] if i < len(digits) else ""
        focused = i == focus_at
        border = ("border-2 border-primary bg-surface-container-lowest" if focused
                  else "border-2 border-error" if error
                  else "border border-outline bg-surface-container-lowest" if d
                  else "border border-outline-variant bg-surface-container-low")
        inner = (f'<span class="font-mono text-title-large text-on-surface">{d}</span>' if d
                 else '<span class="caret"></span>' if focused else "")
        out.append(f'<div class="flex h-16 w-14 items-center justify-center rounded-md {border}">{inner}</div>')
        if i == 2:
            out.append('<span class="mx-1 h-0.5 w-3 rounded-full bg-outline-variant"></span>')
    return f'<div class="flex items-center gap-2">{"".join(out)}</div>'


def button(text, *, icon_name="", kind="filled", full=True, href="#continue", aid="btn"):
    cls = {
        "filled": "bg-primary text-on-primary",
        "tonal": "bg-secondary-container text-on-secondary-container",
        "text": "text-primary",
        "outlined": "border border-outline text-primary",
    }[kind]
    ic = icon(icon_name, 20) if icon_name else ""
    return (f'<a id="{aid}" href="{href}" class="state inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 '
            f'text-label-large {cls} {"w-full" if full else ""}">{escape(text)}{ic}</a>')


def member_chip(change=True):
    change_link = ('<a id="change-email" href="#change-email" class="state rounded-full px-2 py-1 text-label-large text-primary">Đổi</a>'
                   if change else "")
    return f"""<div class="inline-flex h-10 items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest pl-1 pr-1">
  <span class="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-title-small text-on-secondary-container">{MEMBER['initial']}</span>
  <span class="text-body-medium text-on-surface">{MEMBER['email']}</span>{change_link}
</div>"""


def steps(active):
    """The first sign-in's two steps."""
    items = [("Đặt mật khẩu mới", 1), ("Bật xác thực hai bước", 2)]
    out = []
    for text, n in items:
        if n < active:
            dot = f'<span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary">{icon("check", 16)}</span>'
            tcls = "text-on-surface"
        elif n == active:
            dot = f'<span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-label-medium text-on-primary">{n}</span>'
            tcls = "text-on-surface"
        else:
            dot = f'<span class="flex h-6 w-6 items-center justify-center rounded-full border border-outline text-label-medium text-on-surface-variant">{n}</span>'
            tcls = "text-on-surface-variant"
        out.append(f'<div class="flex items-center gap-2">{dot}<span class="text-label-large {tcls}">{text}</span></div>')
    bar = '<span class="h-px flex-1 bg-outline-variant"></span>'
    return f'<div class="flex items-center gap-3">{out[0]}{bar}{out[1]}</div>'


def theme_switch():
    opts = [("computer-outline-rounded", "Theo hệ thống", True), ("light-mode-outline-rounded", "Sáng", False), ("dark-mode-outline-rounded", "Tối", False)]
    out = []
    for i, (ic, label, on) in enumerate(opts):
        cls = "bg-secondary-container text-on-secondary-container" if on else "text-on-surface-variant"
        out.append(f'<a id="theme-{i}" href="#theme-{i}" title="{label}" class="state flex h-8 w-10 items-center justify-center rounded-full {cls}">{icon(ic, 18)}</a>')
    return f'<div class="flex items-center gap-1 rounded-full border border-outline-variant p-1">{"".join(out)}</div>'


DUTIES = [
    ("report-outline-rounded", "Báo cáo hàng cấm và hàng giả"),
    ("group-off-outline-rounded", "Gian lận có tổ chức"),
    ("gavel-rounded", "Yêu cầu từ cơ quan chức năng"),
]


def brand_panel():
    """The start half of the sign-in screens: the mark, the mascot, the name."""
    return f"""<aside class="relative flex w-[576px] shrink-0 flex-col overflow-hidden rounded-r-xl-plus bg-primary-container px-14 py-12">
  {shape("Cookie9Sided", 520, "#85D5C9", "absolute -right-40 top-28 opacity-[.16]")}
  {shape("Clover4Leaf", 120, "#97E7DB", "drift absolute right-16 top-12 opacity-30", "--r:12deg")}
  {shape("Sunny", 76, "#FFDBCF", "drift absolute left-[300px] top-[300px] opacity-50", "--r:-8deg;animation-delay:-3s")}
  {shape("Flower", 150, "#005049", "absolute -left-12 bottom-24 opacity-60")}
  <img src="{LOGO}" alt="ShopNexus" class="relative h-10 w-10 rounded-md ring-2 ring-on-primary-container/40">
  <div class="relative mt-auto mb-10">
    <img src="{MASCOT}" alt="" class="-ml-4 mb-4 h-72 w-72 drop-shadow-[0_12px_24px_rgba(0,0,0,.18)]">
    <h2 class="text-display-medium text-on-primary">ShopNexus Console</h2>
  </div>
</aside>"""


def signin_page(title, form, top_extra=""):
    return f"""{head(title)}<body>
<div class="flex h-[900px] w-[1440px] bg-surface text-on-surface">
  {brand_panel()}
  <main class="relative flex flex-1 flex-col px-16 py-10">
    <div class="flex items-center justify-end">{theme_switch()}</div>
    <div class="flex flex-1 items-center justify-center">
      <div class="w-[400px]">{top_extra}{form}</div>
    </div>
  </main>
</div>
</body>
</html>
"""


def ring(seconds_left, period=30, size=20):
    r = 8
    c = 2 * math.pi * r
    off = c * (1 - seconds_left / period)
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 20 20" class="-rotate-90" aria-hidden="true">'
            f'<circle cx="10" cy="10" r="{r}" fill="none" stroke="#BEC9C6" stroke-width="2.5"/>'
            f'<circle cx="10" cy="10" r="{r}" fill="none" stroke="#005049" stroke-width="2.5" stroke-linecap="round" '
            f'stroke-dasharray="{c:.2f}" stroke-dashoffset="{off:.2f}"/></svg>')
