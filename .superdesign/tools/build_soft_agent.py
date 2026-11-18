"""Agent in a softer look, to compare with build_geist_agent.py.

Writes ../mockups/soft-agent-<name>.html. Same tokens and Geist type; what
changes is the weight of the frame:

- one sidebar: the agent's chats sit in the nav under Agent, so the page has
  no second column; the dashboards fold into one "Công cụ" row;
- no work card inside the page: the page is white, the nav a faint grey with
  no ring, so there is no box in a box;
- Cuộc mới is a quiet row, not a black button; send is primary, not black;
- the new chat opens on the mascot, a short greeting, a large ask box with
  20 px corners, four starting questions and the last chats as cards;
- answers start with the mascot's head, the member's message is a soft
  primary tint, line height 1.6.

  soft-agent-new   new chat
  soft-agent-chat  a chat with an answer and a table
"""
import sys
from html import escape
from pathlib import Path

import os

from en import en
from build_geist import FONTS as GEIST_FONTS, avatar, gi, kbd, pill
from common import ASSETS, LOGO, head

OUT = Path(__file__).resolve().parent.parent / "mockups"

# SOFT_FONT picks the face: Geist (default) or a Google font with a
# Vietnamese subset; output names get a suffix, as soft-agent-new-nunito.
FACES = {"geist": ("Geist", -0.011, -0.025), "inter": ("Inter", 0, -0.02), "be-vietnam-pro": ("Be Vietnam Pro", 0, -0.015),
         "nunito": ("Nunito", 0, -0.01), "lexend": ("Lexend", -0.008, -0.025), "plus-jakarta-sans": ("Plus Jakarta Sans", 0, -0.015)}
FACE = os.environ.get("SOFT_FONT", "geist")
FAMILY, TRACK, TITLE_TRACK = FACES[FACE]
# SOFT_WARM=1 swaps the teal-tinted neutrals for the warm greys of AI
# Portal's "Calm Enterprise" ramp; primary, tertiary and error stay.
WARM = os.environ.get("SOFT_WARM") == "1"
WARM_MAP = {"#F7FAF8": "#FAFAF8", "#F1F4F2": "#F5F5F2", "#EBEFED": "#EFEFEB", "#E6E9E7": "#E9E9E5", "#E0E3E1": "#E3E3DF",
            "#181C1C": "#1A1A19", "#3E4947": "#5E5E5A", "#6E7977": "#8A8A85", "#BEC9C6": "#D8D8D2", "#F7F9F8": "#F8F8F6"}
FONTS = GEIST_FONTS if FACE == "geist" else (
    f'<link href="https://fonts.googleapis.com/css2?family={FAMILY.replace(" ", "+")}:wght@400;500;600;700&display=swap" rel="stylesheet">')
ART = ASSETS + "/content-assets/art-ai-reading/art_ai_reading.webp"
SPARK = "material-symbols:auto-awesome-outline-rounded"

CSS = f"""
  html, body {{ background: #fff; }}
  body, body * {{ font-family: "{FAMILY}", system-ui, sans-serif; letter-spacing: {TRACK}em; }}
  .tnum {{ font-variant-numeric: tabular-nums; }}
  .tight {{ letter-spacing: {TITLE_TRACK}em !important; }}
  .hair {{ border-color: color-mix(in srgb, var(--md-outline-variant) 55%, white); }}
  .soft {{ box-shadow: 0 1px 2px rgba(16,24,22,.04), 0 6px 24px -8px rgba(16,24,22,.10); }}
  .hov:hover {{ background: color-mix(in srgb, var(--md-on-surface) 5%, transparent); }}
  .side {{ background: #F7F9F8; }}
  .glow {{ background: radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--md-primary) 7%, transparent), transparent 70%),
    radial-gradient(40% 35% at 75% 10%, color-mix(in srgb, var(--md-tertiary-fixed) 40%, transparent), transparent 70%); }}
  .ring-focus {{ box-shadow: 0 0 0 4px color-mix(in srgb, var(--md-primary) 9%, transparent), 0 6px 24px -8px rgba(16,24,22,.12); }}
"""

THREADS = [("Hôm nay", [("g1", "Nhóm Đồ Cũ Gò Vấp và Trần Đức Anh"), ("g2", "Ảnh ký nhận GHTK của Khánh Linh"),
                        ("g3", "Son Dior 999 có phải hàng giả")]),
           ("Hôm qua", [("g4", "Tin súng hơi đăng tuần này"), ("g5", "Lê Thị Hồng bị báo lừa đảo"),
                        ("g6", "Ninja Van được xin bao nhiêu lần")])]


CONFIG_ROW = (f'<a id="nav-config" href="#config" class="hov flex h-10 items-center gap-3 rounded-[10px] px-2.5 text-[14px] text-on-surface-variant">'
              f'{gi("tune-rounded", 19)}Cấu hình<span class="ml-auto">{gi("chevron-right-rounded", 16)}</span></a>')


def nav(active_thread=None, role="moderator", page=None):
    admin = role == "admin"
    # New chat is the home page, so the nav has no Home row.
    items = [("support", "Hỗ trợ", "support-agent-outline", "7"),
             ("reports", "Báo cáo", "flag-outline-rounded", "12"), ("accounts", "Tài khoản", "group-outline-rounded", "")]
    rows = "".join(
        f'<a id="nav-{k}" href="#{k}" class="{"bg-on-surface/[.06] font-medium text-on-surface" if k == page else "hov text-on-surface-variant"} flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[14px]">'
        f'{gi(ic, 19, "text-primary" if k == page else "")}<span>{t}</span>{f"<span class=\'tnum ml-auto rounded-full bg-primary/10 px-1.5 text-[12px] font-medium text-primary\'>{n}</span>" if n else ""}</a>'
        for k, t, ic, n in items)
    threads = "".join(
        f'<p class="px-2.5 pb-1 pt-4 text-[12px] text-on-surface-variant/80">{day}</p>' + "".join(
            f'<a id="thread-{tid}" href="#thread-{tid}" class="{"bg-on-surface/[.06] font-medium" if tid == active_thread else "hov"} block truncate rounded-[10px] px-2.5 py-2 text-[14px]">{escape(t)}</a>'
            for tid, t in rows) for day, rows in THREADS)
    new_on = active_thread is None and page is None
    return f"""<nav class="side flex w-[272px] shrink-0 flex-col border-r hair px-3 pb-3 pt-3">
  <div class="flex h-10 items-center gap-2 px-1.5"><img src="{LOGO}" alt="ShopNexus" class="h-7 w-7 rounded-[8px]">
    <span class="tight text-[15px] font-semibold">ShopNexus</span><span class="flex-1"></span>
    <a id="collapse" href="#collapse" class="hov flex h-8 w-8 items-center justify-center rounded-[8px] text-on-surface-variant">{gi("left-panel-close-outline-rounded", 18)}</a></div>
  <a id="thread-new" href="#thread-new" class="{"bg-on-surface/[.06]" if new_on else "hov"} mt-3 flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[14px] font-medium">
    {gi("edit-square-outline", 19)}Cuộc mới<span class="ml-auto opacity-70">{kbd("N")}</span></a>
  <a id="search" href="#search" class="hov flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[14px] text-on-surface-variant">{gi("search-rounded", 19)}Tìm<span class="ml-auto opacity-70">{kbd("/")}</span></a>
  <div class="my-2 h-px bg-outline-variant/40"></div>
  <div class="space-y-0.5">{rows}
    <a id="nav-tools" href="#tools" class="hov flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[14px] text-on-surface-variant">{gi("apps-rounded", 19)}Công cụ<span class="ml-auto">{gi("chevron-right-rounded", 16)}</span></a></div>
  <div class="mt-3 min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">{threads}</div>
  {CONFIG_ROW if admin else ""}
  <a id="me" href="#me" class="hov mt-1 flex h-12 items-center gap-2.5 rounded-[12px] px-2">{avatar("K" if admin else "L", 30, "bg-primary text-on-primary")}
    <span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[14px] font-medium">{"Trần Minh Khoa" if admin else "Nguyễn Thị Lan"}</span>
    <span class="block text-[12px] text-on-surface-variant">{"Quản trị viên" if admin else "Kiểm duyệt viên"}</span></span>{gi("unfold-more-rounded", 16, "text-on-surface-variant")}</a>
</nav>"""


def ask_box(placeholder, tall=False, ctx=""):
    chip = (f'<span class="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary/[.07] px-2.5 text-[13px] text-primary">{ctx}</span>' if ctx else "")
    return f"""<div class="ring-focus rounded-[20px] border border-primary/40 bg-white">
  <p class="{"min-h-[76px]" if tall else "min-h-[40px]"} px-5 pt-4 text-[15px] text-on-surface-variant/80">{placeholder}</p>
  <div class="flex items-center gap-2 px-3 pb-3">
    <a id="attach" href="#attach" title="Gắn ticket, báo cáo, tài khoản" class="hov flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{gi("add-rounded", 20)}</a>
    {chip}<span class="flex-1"></span>
    <a id="ask-send" href="#ask-send" title="Gửi" class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">{gi("arrow-upward-rounded", 19)}</a>
  </div>
</div>"""


def shell(title, inner, active_thread=None, role="moderator", side=None, page=None, bare=False):
    html = _shell(title, inner, active_thread, role, side, page, bare)
    for a, b in (WARM_MAP.items() if WARM else ()):
        html = html.replace(a, b)
    return en(html)


def _shell(title, inner, active_thread=None, role="moderator", side=None, page=None, bare=False):
    return f"""{head(title + " · Console", CSS).replace('<script src="https://cdn.tailwindcss.com">', FONTS + '\n<script src="https://cdn.tailwindcss.com">', 1)}<body>
<div class="flex h-[900px] w-[1440px] bg-white text-on-surface">
  {"" if bare else side or nav(active_thread, role, page)}
  {inner}
</div>
</body>
</html>
"""


STARTERS = [("support-agent-outline", "Ticket nào chờ lâu nhất?"), ("flag-outline-rounded", "Báo cáo lừa đảo mới trong hôm nay"),
            ("local-shipping-outline-rounded", "Đơn GHTK báo giao mà khách chưa nhận"), ("group-outline-rounded", "Tài khoản sắp hết hạn khoá")]
RECENT = [("flag-outline-rounded", "Báo cáo", "09:48", "Nhóm Đồ Cũ Gò Vấp và Trần Đức Anh"),
          ("package-2-outline", "Ticket", "09:12", "Ảnh ký nhận GHTK của Khánh Linh"),
          ("flag-outline-rounded", "Báo cáo", "08:30", "Son Dior 999 có phải hàng giả")]


def new_chat(role="moderator"):
    starters = "".join(f'<a id="starter-{i}" href="#starter-{i}" class="hov flex h-10 items-center gap-2 rounded-full border hair bg-white px-4 text-[14px] text-on-surface-variant">'
                       f'{gi(ic, 17, "text-primary")}<span class="truncate">{t}</span></a>' for i, (ic, t) in enumerate(STARTERS))
    recent = "".join(f"""<a id="recent-{i}" href="#recent-{i}" class="soft flex flex-col gap-2 rounded-[16px] border hair bg-white p-4 hover:border-primary/30">
  <span class="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/[.08] text-primary">{gi(ic, 14)}</span>{kind} · <span class="tnum">{when}</span></span>
  <span class="text-[15px] font-medium leading-[22px]">{escape(t)}</span></a>""" for i, (ic, kind, when, t) in enumerate(RECENT))
    main = f"""<main class="glow relative flex min-w-0 flex-1 flex-col items-center overflow-hidden px-8 pt-[120px]">
  <img src="{ART}" alt="" class="h-[112px] w-[112px] object-contain">
  <h1 class="tight mt-3 text-[34px] font-semibold leading-[42px]">Chào buổi chiều, {"Khoa" if role == "admin" else "Lan"}</h1>
  <div class="mt-8 w-full max-w-[720px]">{ask_box("Hỏi về ticket, báo cáo, tài khoản…", tall=True)}</div>
  <div class="mt-4 grid w-full max-w-[720px] grid-cols-2 gap-2">{starters}</div>
  <div class="mt-14 w-full max-w-[720px]">
    <div class="mb-3 flex items-center"><p class="flex-1 text-[14px] font-medium text-on-surface-variant">Tiếp tục</p>
      <a id="all-chats" href="#all-chats" class="text-[13px] text-on-surface-variant hover:text-primary">Xem tất cả</a></div>
    <div class="grid grid-cols-3 gap-3">{recent}</div>
  </div>
</main>"""
    return shell("Agent", main, role=role)


def head_icon():
    return f'<img src="{ART}" alt="" class="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-primary/[.07] object-contain p-0.5">'


def src(ic, t):
    return f'<a id="src-{abs(hash(t)) % 9999}" href="#src" class="hov inline-flex h-7 items-center gap-1.5 rounded-full border hair bg-white px-2.5 text-[12.5px] text-on-surface-variant">{gi(ic, 14)}{t}</a>'


def chat():
    rows = "".join(f"""<tr class="border-t hair"><td class="px-4 py-2.5"><span class="block text-[14px] font-medium text-primary">{n}</span><span class="tnum text-[12px] text-on-surface-variant">{aid}</span></td>
  <td class="px-4 py-2.5">{pill(st, "bg-error" if st.startswith("Đã") else "bg-primary")}</td><td class="px-4 py-2.5 text-[14px]">{why}</td></tr>"""
                   for n, aid, st, why in [("Đồ Cũ Gò Vấp", "a1f0c3", "Hoạt động", "Cùng địa chỉ lấy hàng với Trần Đức Anh"),
                                           ("Trần Đức Anh", "7d22e9", "Hoạt động", "Ảnh tin trùng 4 tin của Gò Vấp"),
                                           ("Phạm Quốc Bảo", "c90b14", "Đã khoá 30 ngày", "Nhắn đòi cọc cùng mẫu")])
    table = f"""<div class="overflow-hidden rounded-[16px] border hair bg-white"><table class="w-full text-left">
  <thead class="bg-surface-container-low/60"><tr class="text-[12.5px] text-on-surface-variant"><th class="px-4 py-2 font-medium">Tài khoản</th><th class="px-4 py-2 font-medium">Trạng thái</th><th class="px-4 py-2 font-medium">Liên quan vì</th></tr></thead>
  <tbody>{rows}</tbody></table></div>"""
    tools = "".join(f'<a id="tool-{ic.split("-")[0]}" href="#t" title="{t}" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi(ic, 16)}</a>'
                    for ic, t in [("content-copy-outline-rounded", "Chép"), ("refresh-rounded", "Hỏi lại"), ("thumb-up-outline-rounded", "Tốt"), ("thumb-down-outline-rounded", "Chưa đúng")])
    body = f"""
  <div class="flex justify-end"><p class="max-w-[75%] rounded-[20px] rounded-br-[6px] bg-primary/[.08] px-4 py-2.5 text-[15px] leading-[24px]">Đồ Cũ Gò Vấp có liên quan tài khoản nào khác không?</p></div>
  <div class="flex gap-3">{head_icon()}
    <div class="min-w-0 flex-1 space-y-3">
      <div class="flex flex-wrap gap-1.5">{src("flag-outline-rounded", "2 báo cáo")}{src("storefront-outline-rounded", "14 tin đăng")}{src("chat-outline-rounded", "Tin nhắn")}</div>
      <p class="text-[15px] leading-[25px]">Có 2 tài khoản dùng chung địa chỉ lấy hàng hoặc ảnh tin với Đồ Cũ Gò Vấp, và 1 tài khoản đã khoá nhắn đòi cọc cùng mẫu.</p>
      {table}
      <div class="-ml-1.5 flex items-center">{tools}</div>
    </div>
  </div>"""
    main = f"""<main class="flex min-w-0 flex-1 flex-col">
  <header class="flex h-14 shrink-0 items-center gap-3 px-6">
    <p class="tight min-w-0 flex-1 truncate text-[15px] font-medium">Nhóm Đồ Cũ Gò Vấp và Trần Đức Anh</p>
    <a id="about-case" href="#case" class="hov inline-flex h-8 items-center gap-1.5 rounded-full border hair px-3 text-[13px] text-on-surface-variant">{gi("flag-outline-rounded", 15)}Báo cáo · Đồ Cũ Gò Vấp{gi("north-east-rounded", 14)}</a>
    <a id="more" href="#more" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("more-horiz", 18)}</a>
  </header>
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden"><div class="mx-auto w-full max-w-[760px] space-y-7 px-8 py-6">{body}</div></div>
  <div class="mx-auto w-full max-w-[760px] px-8 pb-6">{ask_box("Hỏi tiếp…", ctx=gi("flag-outline-rounded", 14) + "Báo cáo · Đồ Cũ Gò Vấp")}</div>
</main>"""
    return shell("Agent", main, "g1")


SCREENS = {"soft-agent-new": ("Agent · Mềm · Cuộc mới", new_chat), "soft-agent-chat": ("Agent · Mềm · Cuộc trò chuyện", chat)}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}{'' if FACE == 'geist' else '-' + FACE}{'-warm' if WARM else ''}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
