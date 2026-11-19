"""Records named in an agent answer, drawn as chips and cards, not raw ids.

Writes ../mockups/soft-mention-<name>.html. The answer from the screenshot of
2026-11-20 ("hiện tại có ai cần hỗ trợ ko"), redrawn:

- a record the agent names (ticket, account, listing, order, report case)
  is an inline chip: the kind's glyph or the person's initial or the
  listing's photo, then the name; never the UUID;
- an account with no display name shows "No name" and the id's tail, since
  UUIDv7 ids all start with the same time digits;
- resting on a chip opens a peek card; a click opens the record beside the chat;
- a list of records the answer is about is a records block: one card per row.

  soft-mention-chips   the answer with chips, the peek open on an account
  soft-mention-cards   the same answer with the two tickets as a records block
  soft-mention-panel   a ticket chip clicked: the ticket beside the chat
  soft-mention-kit     every chip state on one sheet
"""
import re
import sys
from pathlib import Path

from common import LOGO, head

OUT = Path(__file__).resolve().parent.parent / "mockups"

CSS = """
  html, body { background: #fff; }
  body { font-family: "Be Vietnam Pro", system-ui, sans-serif; letter-spacing: -0.006em; color: var(--md-on-surface); }
  .tnum { font-variant-numeric: tabular-nums; }
  .hair { border-color: color-mix(in srgb, var(--md-outline-variant) 70%, white); }
  .ringh { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-outline-variant) 70%, white); }
  .side { background: #F7F9F8; }
  .hov:hover { background: color-mix(in srgb, var(--md-on-surface) 5%, transparent); }
  /* A popover over text: a clear outline and a lifted shadow, so it never reads as part of the answer. */
  .float { box-shadow: 0 0 0 1px color-mix(in srgb, var(--md-outline-variant) 85%, white), 0 2px 6px rgba(16,24,22,.08), 0 18px 44px -12px rgba(16,24,22,.30); }
  .ans { font-size: 15px; line-height: 26px; }
  .chip { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 7px 0 4px; border-radius: 7px;
    vertical-align: middle; font-size: 13.5px; font-weight: 500; line-height: 1; white-space: nowrap;
    background: var(--md-surface-container-low); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-outline-variant) 60%, white); }
  .chip:hover, .chip.on { background: var(--md-surface-container); }
  .chip.on { box-shadow: inset 0 0 0 1.5px var(--md-primary); }
  .glyph { width: 17px; height: 17px; border-radius: 5px; display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--md-primary) 9%, white); color: var(--md-primary); }
  .ini { width: 17px; height: 17px; border-radius: 99px; display: inline-flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 600; color: #fff; }
  .tail { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 11.5px; font-weight: 400; color: var(--md-outline); }
  .cite { display: inline-flex; height: 18px; min-width: 18px; align-items: center; justify-content: center; border-radius: 99px;
    padding: 0 5px; vertical-align: 2px; font-size: 11px; font-weight: 500; line-height: 1;
    background: var(--md-surface-container-high); color: var(--md-on-surface-variant); margin: 0 1px; }
  /* Chip looks, picked on the root div: s-soft, s-text, s-tint. */
  .s-soft .chip { background: var(--md-surface-container-low); box-shadow: none; height: 23px; border-radius: 6px; padding: 0 7px 0 5px; }
  .s-soft .chip:hover, .s-soft .chip.on { background: var(--md-surface-container-high); }
  .s-soft .chip.on { box-shadow: inset 0 0 0 1.5px var(--md-primary); }
  .s-soft .glyph, .s-text .glyph { background: transparent; width: 15px; }
  .s-text .chip { background: transparent; box-shadow: none; padding: 0 3px 0 2px; height: 23px; border-radius: 5px; gap: 4px; font-weight: 500;
    text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--md-outline-variant) 80%, white); text-underline-offset: 4px; text-decoration-thickness: 1px; }
  .s-text .chip > span:not(.tail):not(.ini):not(.glyph):not(.relative) { text-decoration: inherit; }
  .s-text .chip:hover, .s-text .chip.on { background: var(--md-surface-container); text-decoration-color: var(--md-primary); }
  .s-tint .chip { background: color-mix(in srgb, var(--md-primary) 7%, white); box-shadow: none; color: var(--md-primary); height: 23px; border-radius: 99px; padding: 0 9px 0 4px; }
  .s-tint .chip:hover, .s-tint .chip.on { background: color-mix(in srgb, var(--md-primary) 13%, white); }
  .s-tint .chip.on { box-shadow: inset 0 0 0 1.5px var(--md-primary); }
  .s-tint .glyph { background: #fff; border-radius: 99px; }
  .s-tint .tail { color: color-mix(in srgb, var(--md-primary) 55%, white); }
  /* A claim with a source and no record: a dotted line, the source on rest. */
  .claim { text-decoration: underline dotted; text-decoration-color: var(--md-outline); text-underline-offset: 5px; text-decoration-thickness: 1.5px; cursor: default; }
  .claim:hover, .claim.on { text-decoration-color: var(--md-primary); background: color-mix(in srgb, var(--md-primary) 6%, transparent); border-radius: 4px; }
  .skel { background: linear-gradient(90deg, var(--md-surface-container-highest) 0%, var(--md-surface-container) 50%, var(--md-surface-container-highest) 100%); }
"""


def ic(name, size=16, cls=""):
    return f'<iconify-icon icon="material-symbols:{name}" width="{size}" height="{size}" class="inline-block shrink-0 {cls}"></iconify-icon>'


GLYPH = {"ticket": "support-agent", "listing": "sell-outline-rounded", "order": "receipt-long-outline-rounded",
         "report": "flag-outline-rounded", "account": "person-outline-rounded", "member": "badge-outline-rounded"}
TINT = ["#4D8A83", "#47645F", "#066A61", "#6E7977"]


def chip(kind, label, aid, tail="", initial="", tint=0, photo="", on=False, dot="", muted=False):
    if photo:
        lead = f'<img src="{photo}" alt="" class="h-[17px] w-[17px] rounded-[5px] object-cover">'
    elif initial:
        lead = f'<span class="ini" style="background:{TINT[tint % 4]}">{initial}</span>'
    else:
        lead = f'<span class="glyph">{ic(GLYPH[kind], 14)}</span>'
    if dot:
        lead = f'<span class="relative inline-flex">{lead}<span class="absolute -bottom-px -right-px h-[7px] w-[7px] rounded-full ring-[1.5px] ring-white" style="background:{dot}"></span></span>'
    name = f'<span class="{"text-on-surface-variant" if muted else ""}">{label}</span>'
    t = f'<span class="tail">{tail}</span>' if tail else ""
    return f'<a id="{aid}" href="#{aid}" class="chip {"on" if on else ""}">{lead}{name}{t}</a>'


def cite(n):
    return f'<span class="cite">{n}</span>'


def claim(html, pop=""):
    if not pop:
        return f'<span class="claim">{html}</span>'
    return f'<span class="relative inline-block"><span class="claim on">{html}</span>{pop}</span>'


def nav():
    rows = [("support", "Support", "support-agent", "2"), ("reports", "Reports", "flag-outline-rounded", ""),
            ("accounts", "Accounts", "group-outline-rounded", "")]
    r = "".join(f'<a id="nav-{k}" href="#{k}" class="hov flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[14px] text-on-surface-variant">'
                f'{ic(i, 19)}<span>{t}</span>{f"<span class=tnum style=margin-left:auto;font-size:12px>{n}</span>" if n else ""}</a>' for k, t, i, n in rows)
    chats = "".join(f'<a id="c{i}" href="#c{i}" class="{"bg-on-surface/[.06] font-medium" if i == 0 else "hov"} block truncate rounded-[10px] px-2.5 py-2 text-[14px]">{t}</a>'
                    for i, t in enumerate(["Ai đang cần hỗ trợ", "Tin súng hơi đăng tuần này", "Nhóm Đồ Cũ Gò Vấp", "Son Dior 999 có phải hàng giả"]))
    return f"""<nav class="side flex w-[260px] shrink-0 flex-col border-r hair px-3 pb-3 pt-3">
  <div class="flex h-10 items-center gap-2 px-1.5"><img src="{LOGO}" alt="ShopNexus" class="h-7 w-7 rounded-[8px]"><span class="text-[15px] font-semibold">ShopNexus</span></div>
  <a id="new" href="#new" class="hov mt-3 flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[14px] font-medium">{ic("edit-square-outline", 19)}New chat</a>
  <a id="search" href="#search" class="hov flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[14px] text-on-surface-variant">{ic("search-rounded", 19)}Search</a>
  <div class="my-2 h-px bg-outline-variant/40"></div>{r}
  <p class="px-2.5 pb-1 pt-5 text-[12px] text-outline">Today</p>{chats}
  <span class="flex-1"></span>
  <a id="me" href="#me" class="hov flex h-12 items-center gap-2.5 rounded-[12px] px-2"><span class="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-white">L</span>
    <span class="leading-tight"><span class="block text-[14px] font-medium">Nguyễn Thị Lan</span><span class="block text-[12px] text-outline">Moderator</span></span></a>
</nav>"""


def steps():
    return f"""<div class="flex items-center gap-2 text-[13.5px] text-on-surface-variant">{ic("neurology-outline-rounded", 16)}Worked for 15 s <span class="text-outline">· 2 steps</span>{ic("expand-more-rounded", 16, "text-outline")}</div>"""


def ask():
    return f"""<div class="mx-auto w-full max-w-[760px] px-8 pb-6">
  <div class="rounded-[20px] border hair bg-white px-5 pb-3 pt-4 shadow-[0_6px_24px_-10px_rgba(16,24,22,.12)]">
    <p class="min-h-[28px] text-[15px] text-outline">Ask about a ticket, a report or an account</p>
    <div class="flex items-center"><a id="att" href="#att" class="hov -ml-2 flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{ic("add-rounded", 20)}</a>
      <span class="flex-1"></span><a id="send" href="#send" class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">{ic("arrow-upward-rounded", 19)}</a></div>
  </div></div>"""


def footer():
    return f"""<div class="mt-4 flex items-center gap-4 text-[13px] text-outline">{ic("content-copy-outline-rounded", 16)}{ic("refresh-rounded", 16)}<span>15 s · 1.9K tokens</span><span class="text-on-surface-variant">5 sources</span></div>"""


# The people and records of the answer.
TK1 = chip("ticket", "Mermaid và link tin đăng", "tk1")
TK2 = chip("ticket", "“ib”", "tk2")


def u1(on=False):
    return chip("account", "No name", "u1", "…f9e8", initial="?", tint=3, muted=True, on=on)


def u2(on=False):
    return chip("account", "Tục tĩu…", "u2", "…324f", initial="T", tint=0, dot="#6E7977", on=on)


LST = chip("listing", "iPhone 13 Pro 256GB", "lst", photo="https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=64&h=64&fit=crop")


def answer(cards=False, on_tk1=False, claim_on=""):
    tk1 = chip("ticket", "Mermaid và link tin đăng", "tk1", on=on_tk1)
    lead = f'<p>Hiện có {claim("<b class=font-semibold>2 ticket đang mở</b> và <b class=font-semibold>0 ca báo cáo đang mở</b>", claim_on)}.</p>'
    if cards:
        return lead + cards_block() + f"""
<p>Cả hai chưa nêu vấn đề cụ thể và không thuộc nhóm hàng cấm, hàng giả hay lừa đảo, nên tôi chưa đề xuất khoá tài khoản hay gỡ tin nào. Ticket đầu đang chờ mình trả lời, có link tới {LST} mà tôi chưa mở.</p>"""
    one = f"""<li class="flex gap-2.5"><span class="w-4 shrink-0 text-on-surface-variant">1.</span><span>{tk1} của {u1()}, mở 15:18.
 Tin cuối là của người dùng lúc 16:43, nên ticket <b class="font-semibold">đang chờ mình trả lời</b>. Nội dung chỉ có định dạng markdown, một đoạn mermaid và link tới {LST}, không nói rõ cần gì. Tôi chưa mở tin đăng đó; bạn nên xem tin và hỏi lại họ cần hỗ trợ gì.</span></li>"""
    two = f"""<li class="flex gap-2.5"><span class="w-4 shrink-0 text-on-surface-variant">2.</span><span>{TK2} của {u2()}, mở 15:02.
 Tin cuối là của ShopNexus lúc 15:47, nhờ họ nói rõ vấn đề (tin gốc chỉ có “ib”) và đổi tên hiển thị. Ticket <b class="font-semibold">đang chờ người dùng</b>, chưa cần làm gì thêm.</span></li>"""
    return lead + f'<ol class="space-y-3">{one}{two}</ol>' + """
<p>Cả hai ticket đều chưa nêu vấn đề cụ thể và chưa thuộc nhóm hàng cấm, hàng giả hay lừa đảo, nên tôi chưa đề xuất xử lý tài khoản hay tin đăng nào.</p>"""


PEEK_U1 = f"""<span id="peek" class="float absolute left-0 top-[30px] z-20 block w-[372px] rounded-2xl bg-white p-3.5 text-left" style="line-height:normal">
  <span class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-full bg-outline text-[15px] font-semibold text-white">?</span>
    <span class="min-w-0 flex-1"><span class="block text-[14.5px] font-medium">No display name</span>
      <span class="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-outline">Account · <span class="tail">01a1f462…d6e7d2a2f9e8</span>{ic("content-copy-outline-rounded", 13)}</span></span></span>
  <span class="mt-3 flex flex-wrap gap-1.5 text-[12px]"><span class="rounded-full bg-primary/[.08] px-2 py-0.5 font-medium text-primary">Active</span>
    <span class="rounded-full bg-surface-container px-2 py-0.5 text-on-surface-variant">Buyer</span><span class="rounded-full bg-surface-container px-2 py-0.5 text-on-surface-variant">Joined today</span></span>
  <span class="mt-3 grid grid-cols-3 gap-2 rounded-[12px] bg-surface-container-low p-2.5 text-center">
    <span><span class="tnum block text-[15px] font-semibold">1</span><span class="block text-[11.5px] text-outline">ticket</span></span>
    <span><span class="tnum block text-[15px] font-semibold">0</span><span class="block text-[11.5px] text-outline">reports</span></span>
    <span><span class="tnum block text-[15px] font-semibold">0</span><span class="block text-[11.5px] text-outline">listings</span></span></span>
  <span class="mt-3 flex items-center gap-2 border-t hair pt-2.5 text-[12.5px] text-outline">{ic("format-list-bulleted-rounded", 14)}Read in <span class="text-on-surface-variant">Support tickets open</span><span>· step 2</span></span>
  <span class="mt-2 flex items-center gap-1 whitespace-nowrap text-[13px] font-medium">
    <a id="peek-side" href="#peek-side" class="hov -ml-1.5 flex h-8 items-center gap-1.5 rounded-lg px-2">{ic("right-panel-open-outline-rounded", 16)}Expand beside chat</a>
    <a id="peek-ask" href="#peek-ask" class="hov flex h-8 items-center gap-1.5 rounded-lg px-2 font-normal text-on-surface-variant">{ic("auto-awesome-outline-rounded", 15)}Ask about it</a>
    <span class="flex-1"></span>
    <a id="peek-open" href="#peek-open" title="Open account page" class="hov flex h-8 w-8 items-center justify-center rounded-lg text-outline">{ic("north-east-rounded", 16)}</a>
</span>"""


def mini(text, mine, at):
    if mine:
        return (f'<span class="flex justify-end"><span class="max-w-[82%]"><span class="block rounded-[14px] rounded-br-[5px] bg-primary px-3 py-1.5 text-[13px] leading-[19px] text-white">{text}</span>'
                f'<span class="mt-0.5 block text-right text-[11px] text-outline">{at}</span></span></span>')
    return (f'<span class="block max-w-[82%]"><span class="block rounded-[14px] rounded-bl-[5px] bg-surface-container px-3 py-1.5 text-[13px] leading-[19px]">{text}</span>'
            f'<span class="mt-0.5 block text-[11px] text-outline">{at}</span></span>')


def peek_ticket():
    head_ = f"""<span class="flex items-start gap-2.5"><span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-primary/[.08] text-primary">{ic("support-agent", 17)}</span>
    <span class="min-w-0 flex-1"><span class="block truncate text-[14.5px] font-medium">Mermaid và link tin đăng</span>
      <span class="mt-0.5 block text-[12.5px] text-outline">Ticket · Other · opened 15:18</span></span>
    <a id="tp-side" href="#tp-side" title="Expand beside chat" class="hov flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant">{ic("right-panel-open-outline-rounded", 17)}</a>
    <a id="tp-open" href="#tp-open" title="Open in Support" class="hov -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-outline">{ic("north-east-rounded", 16)}</a></span>"""
    meta = f"""<span class="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12.5px]"><span class="flex items-center gap-1.5 rounded-full bg-primary/[.08] px-2.5 py-1 font-medium text-primary"><span class="h-1.5 w-1.5 rounded-full bg-primary"></span>Waiting on us · 1 h 25 min</span>
    <span class="text-outline">from</span>{u1()}</span>"""
    msgs = (mini("Xin chào, tôi cần hỗ trợ", False, "15:18")
            + mini("Chào bạn, bạn cần ShopNexus hỗ trợ việc gì ạ?", True, "15:31 · Lan")
            + mini('<span class="font-mono text-[12px]">```mermaid graph TD; A--&gt;B ```</span><br>' + LST, False, "16:43"))
    reply = f"""<span class="mt-3 flex items-center gap-2 rounded-[14px] border hair bg-white py-1.5 pl-3.5 pr-1.5"><span class="flex-1 text-[13.5px] text-outline">Reply to this customer…</span>
    <a id="tp-send" href="#tp-send" class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-outline">{ic("arrow-upward-rounded", 17)}</a></span>"""
    return f"""<span id="peek-ticket" class="float absolute left-0 top-[30px] z-20 block w-[420px] rounded-2xl bg-white p-3.5 text-left font-normal" style="line-height:normal">
  {head_}{meta}
  <span class="mt-3 block space-y-2 rounded-[14px] bg-surface-container-low/70 p-2.5">{msgs}</span>
  {reply}
  <span class="mt-2.5 flex items-center gap-2 text-[12px] text-outline">{ic("format-list-bulleted-rounded", 14)}Read in <span class="text-on-surface-variant">Support tickets open</span>· step 2</span>
</span>"""


def turn(body):
    return f"""<div class="flex justify-end"><p class="rounded-[18px] bg-surface-container px-4 py-2.5 text-[15px]">hiện tại có ai cần hỗ trợ ko</p></div>
<div class="mt-6 flex gap-4"><img src="https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/projects/d0e7dcea-fa3d-477d-9b2a-e072f17a3ee7/content-assets/art-ai-reading/art_ai_reading.webp" alt="" class="h-8 w-8 shrink-0 rounded-full bg-primary/[.07] object-contain p-0.5">
  <div class="min-w-0 flex-1">{steps()}<div class="ans mt-4 space-y-4">{body}</div>{footer()}</div></div>"""


def page(title, body, side="", look="s-tint"):
    main = f"""<main class="flex min-w-0 flex-1 flex-col"><div class="min-h-0 flex-1 overflow-hidden"><div class="mx-auto max-w-[760px] px-8 pt-10">{turn(body)}</div></div>{ask()}</main>"""
    return f"""{head(title + " · Console", CSS)}<body>
<div class="{look} flex h-[900px] w-[1440px] overflow-hidden bg-white">{nav()}{main}{side}</div>
</body></html>"""


def chips(look="s-tint", title="Mentions · Inline chips", on="ticket"):
    body = answer()
    if on == "ticket":
        # Clicking the ticket chip previews it in place: messages and a quick reply.
        tk = chip("ticket", "Mermaid và link tin đăng", "tk1")
        body = body.replace(tk, f'<span class="relative inline-block">{chip("ticket", "Mermaid và link tin đăng", "tk1", on=True)}{peek_ticket()}</span>', 1)
    else:
        # The peek hangs under the first account chip.
        body = body.replace(u1(), f'<span class="relative inline-block">{u1(True)}{PEEK_U1}</span>', 1)
    return page(title, body, look=look)


CLAIM_POP = f"""<span id="claim-pop" class="float absolute left-0 top-[30px] z-20 block w-[340px] rounded-2xl bg-white p-3.5 text-left font-normal" style="line-height:normal">
  <span class="flex items-center gap-2.5"><span class="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary/[.08] text-primary">{ic("format-list-bulleted-rounded", 17)}</span>
    <span class="min-w-0 flex-1"><span class="block text-[14px] font-medium">2 lookups</span><span class="block text-[12.5px] text-outline">What this sentence is read from</span></span></span>
  <span class="mt-3 block space-y-1">
    <a id="src-tickets" href="#src-tickets" class="hov -mx-1.5 flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[13.5px]">{ic("support-agent", 16, "text-primary")}<span class="flex-1">Support tickets open</span><span class="tnum text-[12.5px] text-outline">4 records</span></a>
    <a id="src-reports" href="#src-reports" class="hov -mx-1.5 flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[13.5px]">{ic("flag-outline-rounded", 16, "text-primary")}<span class="flex-1">Report cases open</span><span class="tnum text-[12.5px] text-outline">1 record</span></a></span>
  <span class="mt-2 block border-l-2 border-primary pl-3 text-[12.5px] leading-5 text-on-surface-variant">status = open · 2 of 4 tickets still open; 1 case, closed 14:20</span>
  <a id="claim-all" href="#claim-all" class="hov -ml-1.5 mt-2 flex h-8 w-fit items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium">Show in sources{ic("chevron-right-rounded", 15)}</a>
</span>"""


def claim_hover():
    return page("Mentions · Claim source", answer(claim_on=CLAIM_POP))


def status(text, wait):
    tone = "bg-primary/[.08] text-primary" if wait else "bg-surface-container text-on-surface-variant"
    return f'<span class="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium {tone}">{text}</span>'


def card_row(i, title, quote, who, opened, last, wait, n):
    return f"""<div id="rec-{i}" class="hov flex gap-3 px-4 py-3.5 {"border-t hair" if i else ""}">
  <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/[.08] text-primary">{ic("support-agent", 19)}</span>
  <span class="min-w-0 flex-1" style="line-height:normal">
    <span class="flex items-center gap-2"><span class="truncate text-[14.5px] font-medium">{title}</span><span class="flex-1"></span>{status(*wait)}</span>
    <span class="mt-1 block truncate text-[13px] text-on-surface-variant">“{quote}”</span>
    <span class="mt-2 flex items-center gap-2 text-[12.5px] text-outline">{who}<span>·</span><span class="tnum">Opened {opened}</span><span>·</span><span class="tnum">{last}</span></span></span>
</div>"""


def cards_block():
    rows = (card_row(0, "Mermaid và link tin đăng", "```mermaid graph TD; A--&gt;B …  shopnexus.id.vn/l/01a1f350…", u1(), "15:18", "Customer wrote 16:43", ("Waiting on us", True), 2)
            + card_row(1, "“ib”", "ib", u2(), "15:02", "We wrote 15:47", ("Waiting on customer", False), 4))
    return f"""<div class="overflow-hidden rounded-2xl border hair bg-white">
  <div class="flex items-center gap-2 border-b hair bg-surface-container-low/60 px-4 py-2 text-[12.5px] text-on-surface-variant" style="line-height:normal">{ic("support-agent", 15)}Open tickets<span class="tnum text-outline">2</span><span class="flex-1"></span><a id="all" href="#all" class="font-medium text-primary">Open in Support</a></div>
  {rows}</div>"""


def cards():
    return page("Mentions · Record cards", answer(cards=True))


def bubble(text, mine, at):
    if mine:
        return f'<div class="flex justify-end"><div class="max-w-[85%]"><p class="rounded-[16px] rounded-br-[6px] bg-primary px-3.5 py-2 text-[13.5px] leading-5 text-white">{text}</p><p class="mt-1 text-right text-[11.5px] text-outline">{at}</p></div></div>'
    return f'<div class="max-w-[85%]"><p class="rounded-[16px] rounded-bl-[6px] bg-surface-container px-3.5 py-2 text-[13.5px] leading-5">{text}</p><p class="mt-1 text-[11.5px] text-outline">{at}</p></div>'


def side_ticket():
    return f"""<aside class="flex w-[420px] shrink-0 flex-col border-l hair bg-white">
  <div class="flex h-14 items-center gap-2 border-b hair px-4"><span class="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary/[.08] text-primary">{ic("support-agent", 16)}</span>
    <span class="text-[14.5px] font-medium">Ticket</span><span class="tail">…6169157</span><span class="flex-1"></span>
    <a id="side-open" href="#side-open" class="hov flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant">{ic("open-in-new-rounded", 17)}</a>
    <a id="side-close" href="#side-close" class="hov flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant">{ic("close-rounded", 18)}</a></div>
  <div class="flex-1 space-y-5 overflow-hidden px-5 py-5">
    <div><p class="text-[17px] font-semibold leading-6">Mermaid và link tin đăng</p>
      <div class="mt-2 flex flex-wrap items-center gap-1.5">{status("Waiting on us", True)}<span class="rounded-full bg-surface-container px-2.5 py-1 text-[12px] text-on-surface-variant">Other</span><span class="tnum text-[12.5px] text-outline">Opened 15:18 · 1 h 25 min</span></div></div>
    <div class="grid grid-cols-[88px_1fr] gap-y-2.5 rounded-2xl bg-surface-container-low p-3.5 text-[13.5px]">
      <span class="text-outline">From</span><span>{u1()}</span>
      <span class="text-outline">Links to</span><span>{LST}</span>
      <span class="text-outline">Reports</span><span class="text-on-surface-variant">None on this account</span></div>
    <div><p class="mb-3 text-[12.5px] font-medium text-outline">Last messages</p><div class="space-y-3">
      {bubble("Xin chào, tôi cần hỗ trợ", False, "15:18")}
      {bubble("Chào bạn, bạn cần ShopNexus hỗ trợ việc gì ạ?", True, "15:31 · Lan")}
      {bubble('<span class="font-mono text-[12.5px]">```mermaid<br>graph TD; A--&gt;B<br>```</span><br><span class="underline">shopnexus.id.vn/l/01a1f350…</span>', False, "16:43")}</div></div>
  </div>
  <div class="flex gap-2 border-t hair p-4"><a id="reply" href="#reply" class="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-[14px] font-medium text-white">{ic("reply-rounded", 18)}Reply in Support</a>
    <a id="ask-tk" href="#ask-tk" class="flex h-10 items-center gap-2 rounded-full border hair px-4 text-[14px] font-medium">{ic("auto-awesome-outline-rounded", 17)}Ask about it</a></div>
</aside>"""


def panel():
    return page("Mentions · Beside the chat", answer(on_tk1=True), side_ticket())


def kit():
    def row(label, c, note):
        return f'<div class="grid grid-cols-[180px_300px_1fr] items-center gap-6 border-t hair py-2.5"><span class="text-[13px] text-outline">{label}</span><span>{c}</span><span class="text-[13px] leading-5 text-on-surface-variant">{note}</span></div>'
    loading = '<span class="chip"><span class="skel h-[17px] w-[17px] rounded-[5px]"></span><span class="skel h-2.5 w-24 rounded-full"></span></span>'
    gone = '<span class="chip" style="background:transparent"><span class="glyph" style="background:var(--md-surface-container);color:var(--md-outline)">' + ic("link-off-rounded", 13) + '</span><span class="text-outline line-through decoration-outline/50">Listing</span><span class="tail">…6e7d</span></span>'
    raw = '<span class="chip" style="background:transparent"><span class="tail" style="font-size:12px;color:var(--md-on-surface-variant)">01a1f350…6e7d</span>' + ic("content-copy-outline-rounded", 13, "text-outline") + '</span>'
    rows = "".join([
        row("Account", chip("account", "Trần Đức Anh", "k1", initial="T", tint=2), "Initial in a tint from the name, display name. No tail when the name is enough."),
        row("Account · suspended", chip("account", "Lê Thị Hồng", "k2", initial="L", tint=1, dot="#3E4947"), "A grey dot on the initial; the peek says why and since when."),
        row("Account · no name", u1(), "“No name” in soft ink and the id's tail. UUIDv7 ids share their first digits, so the tail tells them apart."),
        row("Ticket", TK1, "Its first line or subject; the tail when two could read alike."),
        row("Listing", LST, "The cover photo and the title."),
        row("Order", chip("order", "Đơn SN-48213", "k3"), "Its order code."),
        row("Report case", chip("report", "Ca · Bán hàng giả", "k4"), "The case's reason."),
        row("Staff member", chip("member", "Nguyễn Thị Lan", "k5"), "A member of staff, from the audit log."),
        row("Opening", chip("account", "Trần Đức Anh", "k6", initial="T", tint=2, on=True), "Hovered or shown beside the chat: a teal ring."),
        row("Loading", loading, "The agent named it but did not read it; the chip fills in from the record."),
        row("Deleted", gone, "The record is gone: struck through, no peek."),
        row("Bare id", raw, "An id the console cannot place: mono, shortened in the middle, copies on click."),
    ])
    body = f"""<main class="flex-1 overflow-hidden px-16 py-12">
  <p class="text-[13px] font-medium text-primary">Agent answers</p>
  <h1 class="mt-1 text-[28px] font-semibold leading-9">Records in the text</h1>
  <p class="mt-2 max-w-[720px] text-[14.5px] leading-6 text-on-surface-variant">The agent names a record, the console draws it. One chip for every kind, the same in answers, step summaries and documents.</p>
  <div class="mt-8 max-w-[1080px] border-b hair">{rows}</div>
</main>"""
    return f"""{head("Mentions · Chip kit · Console", CSS)}<body><div class="s-tint flex h-[900px] w-[1440px] overflow-hidden bg-white">{body}</div></body></html>"""


SCREENS = {"soft-mention-chips": chips,
           "soft-mention-peek-account": lambda: chips(title="Mentions · Account preview", on="account"),
           "soft-mention-chips-text": lambda: chips("s-text", "Mentions · Inline · Text mentions"),
           "soft-mention-chips-tint": lambda: chips("s-tint", "Mentions · Inline · Teal pills"),
           "soft-mention-chips-soft": lambda: chips("s-soft", "Mentions · Inline · Soft"),
           "soft-mention-claim": claim_hover, "soft-mention-cards": cards, "soft-mention-panel": panel, "soft-mention-kit": kit}

def unique_ids(html):
    """A chip drawn twice gets a second id, as the draft contract asks."""
    seen = {}

    def one(m):
        k = m.group(1)
        seen[k] = seen.get(k, 0) + 1
        n = seen[k]
        return f'id="{k}"' if n == 1 else f'id="{k}-{n}"'
    return re.sub(r'id="([^"]+)"', one, html)


if __name__ == "__main__":
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(unique_ids(SCREENS[name]()))
        print(OUT / f"{name}.html")
