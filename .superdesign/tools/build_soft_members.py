"""Settings › Members with a member panel.

Writes ../mockups/soft-members-<name>.html. Changes from soft-cfg-members:

- the table shows how each member signs in (two-step on, locked, first
  sign-in pending, disabled) and when they last signed in;
- a "Needs attention" filter keeps the locked and the never-signed-in;
- a row opens a panel on the right: rename, sign-in (reset password, reset
  two-step, unlock), the daily agent budget (role default or custom), the
  30 days' spend, the member's recent actions, and Disable at the foot;
- admins are managed from the server CLI, so their panel has no access
  actions, only the budget and the actions.

  soft-members-panel      a moderator's panel
  soft-members-admin      an admin's panel: managed from the CLI
  soft-members-reset      Needs attention; a locked member, password reset
  soft-members-disable    Disable asks first
"""
import sys
from html import escape

from build_soft_admin import avatar, btn, card, gi, meter, tag
from build_soft_admin_rich import page
from build_soft_agent import OUT

CSS = """
  .scrim { background: rgba(16,24,22,.14); }
  .sheet { box-shadow: -1px 0 0 rgba(16,24,22,.06), -24px 0 60px -20px rgba(16,24,22,.25); }
  .sel { background: color-mix(in srgb, var(--md-primary) 7%, white); }
  .mono { font-family: ui-monospace, "JetBrains Mono", monospace !important; letter-spacing: 0 !important; }
"""

# ch, name, email, admin, sign-in state, last sign-in, 30-day spend, daily budget, custom
PEOPLE = [
    ("K", "Trần Minh Khoa", "khoa@shopnexus.vn", True, "on", "Now", 9.8, 10, False),
    ("L", "Nguyễn Thị Lan", "lan@shopnexus.vn", False, "on", "5 min ago", 38.2, 5, False),
    ("M", "Phạm Văn Minh", "minh@shopnexus.vn", False, "locked", "1 hour ago", 31.6, 6, True),
    ("H", "Lê Thu Hà", "ha@shopnexus.vn", False, "on", "Yesterday", 22.9, 7, True),
    ("T", "Đỗ Quang Tú", "tu@shopnexus.vn", False, "on", "Yesterday", 17.3, 5, False),
    ("B", "Hoàng Gia Bảo", "bao@shopnexus.vn", True, "on", "3 days ago", 4.1, 10, False),
    ("N", "Vũ Thị Ngân", "ngan@shopnexus.vn", False, "disabled", "12 days ago", 0.0, 5, False),
    ("A", "Võ Ngọc Ánh", "anh@shopnexus.vn", False, "pending", "Never", None, 5, False),
]
BY = {p[0]: p for p in PEOPLE}


def role_tag(admin):
    return tag(gi("shield-person-outline-rounded" if admin else "person-outline-rounded", 14) + ("Admin" if admin else "Moderator"),
               "bg-primary/[.08] text-primary" if admin else "bg-secondary-container/70 text-on-secondary-container")


def state_tag(s):
    return {
        "on": f'<span class="flex items-center gap-1.5 text-[13.5px] text-on-surface-variant">{gi("verified-user-outline-rounded", 16, "text-primary")}Two-step on</span>',
        "locked": tag(gi("lock-clock-outline-rounded", 14) + "Locked until 14:20", "bg-primary/[.08] text-primary"),
        "pending": tag(gi("schedule-outline-rounded", 14) + "First sign-in pending", "bg-surface-container text-on-surface-variant"),
        "disabled": tag(gi("block-rounded", 14) + "Disabled", "bg-surface-container-high text-on-surface-variant"),
    }[s]


def spend(usd, daily, w=150):
    if usd is None:
        return f'<span class="w-[{w}px] text-on-surface-variant">–</span>'
    return (f'<div class="w-[{w}px]"><div class="flex justify-between text-[13px]"><span class="tnum font-medium">${usd:.2f}</span>'
            f'<span class="tnum text-on-surface-variant">${daily}/day</span></div>'
            f'<div class="mt-1.5">{meter(min(100, round(usd / (daily * 30) * 100)), "bg-primary/70", 5)}</div></div>')


def rows(only=None, picked=None):
    out = ""
    for ch, n, e, admin, s, last, usd, daily, _ in PEOPLE:
        if only and s not in only:
            continue
        on = s != "disabled"
        av = avatar(ch, 38, "bg-primary text-on-primary" if on else "bg-surface-container-high text-on-surface-variant")
        you = '<span class="ml-1.5 text-[12px] font-normal text-on-surface-variant">You</span>' if ch == "K" else ""
        out += f"""<a id="m-{ch}" href="#m-{ch}" class="{"sel" if ch == picked else "hov"} flex items-center gap-5 border-t hair px-5 py-2.5 first:border-t-0">
  <span class="flex w-[250px] min-w-0 items-center gap-3">{av}<span class="min-w-0 leading-tight"><span class="block truncate text-[14.5px] font-medium">{escape(n)}{you}</span>
    <span class="block truncate text-[12.5px] text-on-surface-variant">{e}</span></span></span>
  <span class="w-[120px]">{role_tag(admin)}</span><span class="w-[190px]">{state_tag(s)}</span>
  <span class="w-[110px] text-[13.5px] {"text-on-surface-variant" if last == "Never" else ""}">{last}</span>{spend(usd, daily)}
  <span class="flex-1"></span>{gi("chevron-right-rounded", 18, "text-on-surface-variant")}</a>"""
    return out


def toolbar(attention=False):
    seg = "".join(f'<a id="f-{k}" href="#f-{k}" class="flex h-8 items-center rounded-full px-3.5 {"bg-white soft font-medium" if k == "all" and not attention else "text-on-surface-variant"}">{t}</a>'
                  for k, t in [("all", "All · 8"), ("admin", "Admins · 2"), ("mod", "Moderators · 6")])
    need = (f'<a id="f-need" href="#f-need" class="flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] '
            f'{"border-primary/40 bg-primary/[.08] font-medium text-primary" if attention else "hair bg-white text-on-surface-variant"}">'
            f'{gi("error-outline-rounded", 17)}Needs attention<span class="tnum rounded-full bg-primary px-1.5 text-[12px] text-on-primary">2</span></a>')
    return f"""<div class="mb-4 flex items-center gap-3"><div class="flex rounded-full bg-surface-container p-1 text-[13.5px]">{seg}</div>{need}<span class="flex-1"></span>
  <div class="flex h-10 w-[260px] items-center gap-2 rounded-full border hair bg-white px-4 text-[14px] text-on-surface-variant">{gi("search-rounded", 18)}Name or email</div></div>"""


def table(only=None, picked=None):
    head = ('<div class="flex items-center gap-5 border-b hair bg-surface-container-low/60 px-5 py-3 text-[13px] text-on-surface-variant">'
            '<span class="w-[250px]">Member</span><span class="w-[120px]">Role</span><span class="w-[190px]">Sign-in</span>'
            '<span class="w-[110px]">Last sign-in</span><span class="w-[150px]">30 days</span><span class="flex-1"></span><span class="w-[18px]"></span></div>')
    return card(head + rows(only, picked), "overflow-hidden p-0")


# --- the panel ---

def section(title, body, right=""):
    return (f'<section class="border-t hair px-6 py-5"><div class="mb-3 flex items-center gap-2"><h3 class="flex-1 text-[13px] font-medium text-on-surface-variant">{title}</h3>{right}</div>'
            f'{body}</section>')


def line(ic, label, value, action=""):
    return (f'<div class="flex min-h-11 items-center gap-3 py-1.5">{gi(ic, 19, "text-on-surface-variant")}<span class="flex-1 text-[14px]">{label}</span>'
            f'<span class="text-[13.5px] text-on-surface-variant">{value}</span>{action}</div>')


def small(text, aid, kind="plain"):
    cls = {"plain": "hov border hair bg-white", "primary": "bg-primary text-on-primary"}[kind]
    return f'<a id="{aid}" href="#{aid}" class="inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium {cls}">{text}</a>'


def budget(ch):
    _, _, _, admin, _, _, usd, daily, custom = BY[ch]
    default = 10 if admin else 5
    seg = "".join(f'<a id="b-{k}" href="#b-{k}" class="flex h-8 flex-1 items-center justify-center rounded-full {"bg-white soft font-medium" if on else "text-on-surface-variant"}">{t}</a>'
                  for k, t, on in [("role", f"Role default · ${default}", not custom), ("custom", "Custom", custom)])
    amount = (f'<div class="mt-3 flex items-center gap-2"><span class="flex h-10 flex-1 items-center rounded-[12px] border border-primary/50 bg-white px-3.5 text-[14px] ring-4 ring-primary/10">'
              f'<span class="text-on-surface-variant">$</span><span class="tnum ml-1 flex-1">{daily}</span><span class="text-on-surface-variant">a day</span></span>{small("Save", "b-save", "primary")}</div>') if custom else ""
    used = "" if usd is None else (f'<div class="mt-4 flex justify-between text-[13px]"><span><span class="tnum font-medium">${usd:.2f}</span> '
                                   f'<span class="text-on-surface-variant">in 30 days</span></span><span class="tnum text-on-surface-variant">of ${daily * 30}</span></div>'
                                   f'<div class="mt-1.5">{meter(min(100, round(usd / (daily * 30) * 100)), "bg-primary/70", 6)}</div>')
    return section("Agent budget", f'<div class="flex rounded-full bg-surface-container p-1 text-[13px]">{seg}</div>{amount}{used}')


ACTS = {
    "L": [("lock-outline", "Suspended Đồ Cũ Gò Vấp", "30 days · deposit scam in chat", "10:05"),
          ("visibility-off-outline", "Hid a listing", "iPhone 13 Pro Max 256GB", "09:58"),
          ("task-alt-rounded", "Resolved a report case", "Trần Đức Anh", "Yesterday"),
          ("lock-open-outline", "Unsuspended Mỹ Phẩm Hằng", "", "20 Nov")],
    "B": [("person-add-outline-rounded", "Added a member", "Võ Ngọc Ánh", "3 days ago"),
          ("tune-rounded", "Changed a daily budget", "Lê Thu Hà · $5 → $7", "3 days ago")],
    "M": [("visibility-off-outline", "Hid 4 listings", "Trần Đức Anh", "1 hour ago"),
          ("lock-outline", "Suspended Bán Lẻ 247", "7 days", "Yesterday")],
}


def actions(ch):
    items = "".join(f"""<div class="relative flex gap-3 pb-4 last:pb-0"><span class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">{gi(ic, 16)}</span>
  <div class="min-w-0 flex-1 pt-1 leading-tight"><p class="text-[14px]">{escape(t)}</p>{f'<p class="mt-0.5 truncate text-[12.5px] text-on-surface-variant">{escape(d)}</p>' if d else ""}</div>
  <span class="pt-1 text-[12.5px] text-on-surface-variant">{w}</span></div>""" for ic, t, d, w in ACTS[ch])
    return section("Recent actions", f'<div class="relative"><span class="absolute bottom-4 left-4 top-4 w-px bg-outline-variant/50"></span>{items}</div>',
                   '<a id="audit" href="#audit" class="text-[13px] font-medium text-primary">Audit log</a>')


def panel(ch, signin, foot=""):
    _, n, e, admin, s, *_ = BY[ch]
    head = f"""<div class="flex items-start gap-4 px-6 pb-5 pt-6">{avatar(ch, 56, "bg-primary text-on-primary")}
  <div class="min-w-0 flex-1 pt-0.5"><p class="flex items-center gap-1.5"><span class="tight truncate text-[19px] font-semibold">{escape(n)}</span>
    {"" if admin else f'<a id="rename" href="#rename" class="hov flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant">{gi("edit-outline-rounded", 16)}</a>'}</p>
    <p class="truncate text-[13.5px] text-on-surface-variant">{e}</p>
    <div class="mt-2.5 flex flex-wrap gap-1.5">{role_tag(admin)}{state_tag(s)}</div></div>
  <a id="close" href="#close" class="hov -mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{gi("close-rounded", 20)}</a></div>"""
    body = head + signin + budget(ch) + actions(ch)
    return f"""<div class="scrim absolute inset-0 z-20"></div>
<aside class="sheet absolute inset-y-0 right-0 z-30 flex w-[440px] flex-col bg-white"><div class="min-h-0 flex-1 overflow-hidden">{body}</div>{foot}</aside>"""


def disable_foot(ch, asking=False):
    first = BY[ch][1].split()[-1]
    if not asking:
        return f'<div class="border-t hair px-6 py-4">{btn("Disable member", "block-rounded", "plain", "disable")}</div>'
    return f"""<div class="border-t hair bg-surface-container-low/60 px-6 py-5"><p class="text-[15px] font-semibold">Disable {first}?</p>
  <p class="mt-1 text-[13.5px] leading-5 text-on-surface-variant">{first} is signed out everywhere now and can't sign in. Enable brings the same password back.</p>
  <div class="mt-4 flex justify-end gap-2">{btn("Cancel", aid="cancel")}<a id="yes" href="#yes" class="inline-flex h-9 items-center gap-1.5 rounded-full bg-error px-4 text-[14px] font-medium text-on-error">Disable</a></div></div>"""


def mod_signin(ch, reset=False):
    s = BY[ch][4]
    temp = f"""<div class="mb-2 rounded-[14px] bg-surface-container px-4 py-3"><p class="text-[12.5px] text-on-surface-variant">Temporary password, shown once</p>
  <p class="mt-1 flex items-center gap-2"><span class="mono tnum flex-1 text-[15px] font-medium">Q7mx-2Lpa-9hTw</span>
  <a id="copy" href="#copy" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("content-copy-outline-rounded", 16)}</a></p>
  <p class="mt-1 text-[12.5px] text-on-surface-variant">They set their own at the next sign-in.</p></div>""" if reset else ""
    lock = line("lock-clock-outline-rounded", "Locked after 5 wrong tries", "until 14:20", small("Unlock", "unlock")) if s == "locked" else ""
    return section("Sign-in", temp + lock +
                   line("password-rounded", "Password", "Temporary" if reset else "Their own", "" if reset else small("Reset", "reset-pw")) +
                   line("verified-user-outline-rounded", "Two-step sign-in", "On", small("Reset", "reset-totp")) +
                   line("login-rounded", "Last sign-in", BY[ch][5]))


def admin_signin(ch):
    note = f"""<div class="rounded-[14px] bg-surface-container-low px-4 py-3.5"><p class="flex items-center gap-2 text-[14px] font-medium">{gi("terminal-rounded", 18, "text-primary")}Managed from the server</p>
  <p class="mt-1 text-[13px] leading-5 text-on-surface-variant">Admins change their password, two-step and access with the console CLI on the server.</p>
  <p class="mono mt-2.5 truncate rounded-[10px] bg-white px-3 py-2 text-[12.5px]">console reset-password --email {BY[ch][2]}</p></div>"""
    return section("Sign-in", line("verified-user-outline-rounded", "Two-step sign-in", "On") + line("login-rounded", "Last sign-in", BY[ch][5]) + f'<div class="mt-2">{note}</div>')


def screen(picked, inner_panel, attention=False):
    body = toolbar(attention) + table(("locked", "pending") if attention else None, picked)
    html = page("members", "Members", "group-outline-rounded",
                [("group-outline-rounded", "8 people"), ("shield-person-outline-rounded", "2 admins"), ("error-outline-rounded", "2 need attention")],
                body, btn("Add member", "person-add-outline-rounded", "primary", "add"))
    # the panel covers the page beside the settings nav
    html = html.replace('<main class="flex min-w-0 flex-1', '<main class="relative flex min-w-0 flex-1', 1)
    html = html.replace("</main>", inner_panel + "</main>", 1)
    return html.replace("</style>", CSS + "</style>", 1)


SCREENS = {
    "soft-members-panel": ("Members · Moderator panel", lambda: screen("L", panel("L", mod_signin("L"), disable_foot("L")))),
    "soft-members-admin": ("Members · Admin panel", lambda: screen("B", panel("B", admin_signin("B")))),
    "soft-members-reset": ("Members · Needs attention, password reset", lambda: screen("M", panel("M", mod_signin("M", reset=True), disable_foot("M")), attention=True)),
    "soft-members-disable": ("Members · Disable asks first", lambda: screen("L", panel("L", mod_signin("L"), disable_foot("L", asking=True)))),
}

if __name__ == "__main__":
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
