"""The console's agent chat for synthesis, in the soft look, in English.

Writes ../mockups/soft-chat-<name>.html. The agent pulls reports, tickets,
accounts and the audit log together; the chat shows what it found, never
what it is doing:

- answers cite their sources inline as numbered chips; the sources panel
  lists them by kind with the quoted line;
- key numbers, tables and charts sit inside the answer; a longer result is a
  document in the side panel, with versions and export;
- when a question leaves a real choice open, the agent asks with options;
- follow-up chips under an answer, and a footer with time, sources and model;
- the ask box takes / for skills and @ for records, files, and the agent.

  soft-chat-brief    a weekly brief, the document panel open (nav as a rail)
  soft-chat-sources  the same answer, the sources panel open on [3]
  soft-chat-clarify  the agent asks which period, sellers and format
  soft-chat-compose  a new chat, the / menu open with records attached
"""
import sys

from build_soft_admin import btn, tag
from build_soft_agent import OUT, avatar, gi, kbd
from build_soft_pages import frame
from common import LOGO

SPARK = "material-symbols:auto-awesome-outline-rounded"


POP = ""  # set by sources(): the popover shown under the cited chip


def cite(n, on=False):
    if on and POP:
        return f'<span class="relative inline-block">{cite(n, True) if False else _chip(n, True)}{POP}</span>'
    return _chip(n, on)


def _chip(n, on):
    tone = "bg-primary text-on-primary" if on else "bg-primary/10 text-primary"
    return f'<a id="cite-{n}-{int(on)}" href="#source-{n}" class="mx-0.5 inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-[6px] px-1 align-[2px] text-[11px] font-semibold {tone}">{n}</a>'


def mascot():
    from build_soft_agent import ART
    return f'<img src="{ART}" alt="" class="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-primary/[.07] object-contain p-0.5">'


def mine(t, attach=""):
    return f'<div class="flex flex-col items-end gap-1.5">{attach}<p class="max-w-[80%] rounded-[20px] rounded-br-[6px] bg-primary/[.08] px-4 py-2.5 text-[15px] leading-[24px]">{t}</p></div>'


def figure(n, label, sub, tone="text-primary"):
    return (f'<div class="rounded-[14px] border hair bg-white px-3.5 py-3"><p class="tnum tight text-[22px] font-semibold leading-7">{n}</p>'
            f'<p class="text-[12.5px] text-on-surface-variant">{label}</p><p class="tnum mt-1 text-[12px] font-medium {tone}">{sub}</p></div>')


DAYS = [("Thu", 9, 3, 1), ("Fri", 11, 2, 1), ("Sat", 8, 4, 0), ("Sun", 7, 2, 1), ("Mon", 14, 3, 2), ("Tue", 16, 5, 1), ("Wed", 21, 4, 2)]
KINDS = [("Scam", "var(--md-error)"), ("Fake", "#B3542E"), ("Banned", "#E8B8A4")]


def chart(h=96):
    top = max(a + b + c for _, a, b, c in DAYS)
    cols = "".join(f"""<div class="flex flex-1 flex-col items-center gap-1.5"><div class="flex w-full flex-1 flex-col justify-end">{"".join(
        f'<span class="block w-full first:rounded-t-[5px]" style="height:{round(v / top * h)}px;background:{c}"></span>' for v, (_, c) in zip((a, b, cc), KINDS))}</div>
  <span class="text-[11px] text-on-surface-variant">{d}</span></div>""" for d, a, b, cc in DAYS)
    return f'<div class="flex items-end gap-2" style="height:{h + 20}px">{cols}</div>'


def legend():
    return '<div class="flex gap-3 text-[12px] text-on-surface-variant">' + "".join(
        f'<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-[3px]" style="background:{c}"></span>{t}</span>' for t, c in KINDS) + "</div>"


RINGS = [("Gò Vấp deposit ring", "5", "23", "+9", "2 suspended", True), ("Thủ Đức AirPods resellers", "3", "14", "New", "None yet", True),
         ("Hải Châu cosmetics", "4", "9", "−2", "1 suspended", False)]


def rings_table():
    rows = "".join(f"""<tr class="border-t hair"><td class="px-3.5 py-2.5 font-medium">{n}</td><td class="tnum px-3.5 py-2.5">{a}</td><td class="tnum px-3.5 py-2.5">{r}</td>
  <td class="px-3.5 py-2.5">{tag(ch, "bg-error-container text-error" if up else "bg-primary/[.08] text-primary")}</td><td class="px-3.5 py-2.5 text-on-surface-variant">{st}</td></tr>"""
                   for n, a, r, ch, st, up in RINGS)
    return (f'<div class="overflow-hidden rounded-[16px] border hair bg-white"><table class="w-full text-left text-[13.5px]"><thead class="bg-surface-container-low/60 text-[12.5px] text-on-surface-variant">'
            f'<tr><th class="px-3.5 py-2 font-medium">Ring</th><th class="px-3.5 py-2 font-medium">Accounts</th><th class="px-3.5 py-2 font-medium">Reports</th><th class="px-3.5 py-2 font-medium">vs last week</th><th class="px-3.5 py-2 font-medium">Status</th></tr></thead><tbody>{rows}</tbody></table></div>')


def follow_ups():
    return '<div class="flex flex-wrap gap-2">' + "".join(
        f'<a id="next-{i}" href="#next-{i}" class="hov inline-flex h-9 items-center gap-1.5 rounded-full border hair bg-white px-3.5 text-[13.5px]">{gi(ic, 16, "text-primary")}{t}</a>'
        for i, (ic, t) in enumerate([("gavel-rounded", "Draft suspensions for Thủ Đức"), ("compare-arrows-rounded", "Compare with October"), ("hub-outline-rounded", "Sellers that appear in two rings")])) + "</div>"


def footer(srcs="9 sources"):
    acts = "".join(f'<a id="act-{ic[:6]}" href="#act" title="{t}" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi(ic, 16)}</a>'
                   for ic, t in [("content-copy-outline-rounded", "Copy"), ("refresh-rounded", "Retry"), ("thumb-up-outline-rounded", "Good"), ("thumb-down-outline-rounded", "Not right"), ("ios-share-rounded", "Share")])
    return (f'<div class="-ml-1.5 flex items-center gap-0.5">{acts}<span class="flex-1"></span>'
            f'<span class="tnum flex items-center gap-2 text-[12.5px] text-on-surface-variant">14 s<span class="h-1 w-1 rounded-full bg-outline-variant"></span>{srcs}<span class="h-1 w-1 rounded-full bg-outline-variant"></span>Claude Sonnet 5.5</span></div>')


SRC_KIND = {"report": ("flag-outline-rounded", "bg-error-container text-error"), "account": ("person-outline-rounded", "bg-primary/[.08] text-primary"),
            "ticket": ("support-agent-outline", "bg-secondary-container text-on-secondary-container"), "data": ("monitoring", "bg-tertiary-fixed text-on-tertiary-fixed-variant"),
            "log": ("history-rounded", "bg-surface-container text-on-surface-variant")}
SOURCES = [(1, "data", "Reports · last 7 days", "86 reports, 66 scam, 23 fake, 8 banned", "Dashboard"),
           (2, "report", "Đồ Cũ Gò Vấp", "3 reports · deposit scam · shares pickup address", "Report case"),
           (3, "account", "Trần Đức Anh", "4 listings reuse Gò Vấp's photos at 97%", "Account"),
           (4, "report", "Thủ Đức AirPods resellers", "14 reports since Monday, same AirPods photo set", "Report case"),
           (5, "data", "Report reasons", "“Chuyển cọc trước” in 35 of 86 reports", "Dashboard"),
           (6, "account", "Phạm Quốc Bảo", "Suspended 30 days · same deposit message", "Account"),
           (7, "ticket", "Quang Huy · scam", "“Bắt chuyển cọc trước rồi chặn mình”", "Ticket"),
           (8, "log", "Audit log", "2 suspensions in the Gò Vấp ring this week", "Audit log"),
           (9, "account", "Mỹ Phẩm Xách Tay Hà", "Hải Châu cosmetics · 1 suspended", "Account")]


def src_chips(n=4):
    chips = "".join(f'<a id="sc-{i}" href="#source-{i}" class="hov inline-flex h-7 items-center gap-1.5 rounded-full border hair bg-white pl-1 pr-2.5 text-[12.5px]">'
                    f'<span class="flex h-5 w-5 items-center justify-center rounded-full {SRC_KIND[k][1]}">{gi(SRC_KIND[k][0], 12)}</span>{t}</a>' for i, k, t, _, _ in SOURCES[:n])
    return f'<div class="flex flex-wrap items-center gap-1.5">{chips}<a id="all-sources" href="#sources" class="hov inline-flex h-7 items-center rounded-full px-2.5 text-[12.5px] font-medium text-primary">+5 more</a></div>'


def doc_card(on=False):
    return f"""<a id="doc" href="#doc" class="flex items-center gap-3 rounded-[16px] border {"border-primary/40 bg-primary/[.04] ring-4 ring-primary/10" if on else "hair bg-white"} p-3 soft">
  <span class="flex h-11 w-11 items-center justify-center rounded-[12px] bg-primary text-on-primary">{gi("article-outline-rounded", 22)}</span>
  <span class="min-w-0 flex-1 leading-tight"><span class="block text-[14.5px] font-semibold">Weekly scam brief · Nov 12–18</span><span class="mt-0.5 block text-[12.5px] text-on-surface-variant">Document · 4 sections · version 2</span></span>
  <span class="flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-primary">{"Open" if not on else "Open"}{gi("open-in-full-rounded", 15)}</span></a>"""


def answer(cited=None, doc_on=False, compact=False):
    c = lambda n: cite(n, n == cited)  # noqa: E731
    figs = "".join([figure("86", "reports", "+31% vs last week", "text-error"), figure("2", "rings growing", "+3 accounts"),
                    figure("41%", "ask for a deposit", "+12 pts", "text-error"), figure("6.2 h", "median to resolve", "−1.4 h")])
    chart_card = f"""<div class="rounded-[16px] border hair bg-white p-4"><div class="mb-3 flex items-center"><p class="flex-1 text-[14px] font-semibold">Reports per day</p>{legend()}</div>{chart()}</div>"""
    return f"""<div class="flex gap-3">{mascot()}<div class="min-w-0 flex-1 space-y-4">
  {src_chips()}
  <p class="text-[15px] leading-[26px]">Scam reports rose to <b class="font-semibold">86</b> this week, up 31%{c(1)}. Most of the rise comes from two rings: the Gò Vấp deposit ring, which added 3 accounts{c(2)}{c(3)}, and a new AirPods reseller group in Thủ Đức{c(4)}. Asking for a deposit first now shows up in 41% of reports{c(5)}.</p>
  <div class="grid grid-cols-4 gap-2">{figs}</div>
  {"" if compact else chart_card}
  {rings_table()}
  {doc_card(doc_on)}
  {follow_ups()}
  {footer()}
</div></div>"""


def ask_box(placeholder="Ask a follow-up…", chips="", menu=""):
    return f"""<div class="relative">{menu}<div class="rounded-[22px] border hair bg-white soft focus-within:ring-4">
  {f'<div class="flex flex-wrap gap-1.5 px-4 pt-3">{chips}</div>' if chips else ""}
  <p class="min-h-[44px] px-5 pt-3 text-[15px] text-on-surface-variant/80">{placeholder}</p>
  <div class="flex items-center gap-1.5 px-3 pb-3">
    <a id="plus" href="#plus" title="Attach" class="hov flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{gi("add-rounded", 20)}</a>
    <a id="skills" href="#skills" class="hov inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] text-on-surface-variant">{gi("bolt-outline-rounded", 17)}Skills</a>
    <span class="flex-1"></span>
    <a id="agent-pick" href="#agent-pick" class="hov inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px]"><span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary">{gi(SPARK, 12)}</span>Console assistant{gi("expand-more-rounded", 16, "text-on-surface-variant")}</a>
    <a id="send" href="#send" class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">{gi("arrow-upward-rounded", 19)}</a>
  </div></div></div>"""


def chat_header(title, extra=""):
    return f"""<header class="flex h-14 shrink-0 items-center gap-2 px-6"><p class="tight min-w-0 flex-1 truncate text-[15px] font-medium">{title}</p>{extra}
  <a id="share" href="#share" class="hov inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] text-on-surface-variant">{gi("ios-share-rounded", 16)}Share</a>
  <a id="more" href="#more" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("more-horiz", 18)}</a></header>"""


def chat_col(title, body, box, w="max-w-[780px]"):
    return f"""<main class="flex min-w-0 flex-1 flex-col">{chat_header(title)}
  <div class="flex min-h-0 flex-1 flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_48px)]"><div class="mx-auto w-full {w} space-y-7 px-8 pb-6">{body}</div></div>
  <div class="mx-auto w-full {w} px-8 pb-5">{box}</div></main>"""


Q = "Summarize this week's scam reports. Which rings are growing?"


def rail():
    items = [("edit-square-outline", "New chat", False), ("search-rounded", "Search", False), ("support-agent-outline", "Support", False),
             ("flag-outline-rounded", "Reports", False), ("group-outline-rounded", "Accounts", False), ("forum-outline-rounded", "Chats", True)]
    return f"""<nav class="side flex w-[64px] shrink-0 flex-col items-center gap-1 border-r hair py-3"><img src="{LOGO}" alt="ShopNexus" class="mb-3 h-8 w-8 rounded-[9px]">
  {"".join(f'<a id="rail-{t[:4]}" href="#{t}" title="{t}" class="flex h-10 w-10 items-center justify-center rounded-[12px] {"bg-on-surface/[.06] text-primary" if on else "hov text-on-surface-variant"}">{gi(ic, 20)}</a>' for ic, t, on in items)}
  <span class="flex-1"></span>{avatar("L", 32, "bg-primary text-on-primary")}</nav>"""


def doc_panel():
    summary = "".join(f'<li class="flex gap-2.5"><span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span><span>{t}</span></li>' for t in [
        f"86 reports, up 31%; scam is 77% of them{cite(1)}.", f"The Gò Vấp deposit ring grew to 5 accounts{cite(2)}{cite(3)}.",
        f"A new AirPods reseller group in Thủ Đức filed 14 reports since Monday{cite(4)}.", f"Median time to resolve fell to 6.2 hours{cite(8)}."])
    actions = "".join(f'<div class="flex items-center gap-3 rounded-[14px] border hair px-3.5 py-2.5"><span class="flex h-8 w-8 items-center justify-center rounded-[10px] {tone}">{gi(ic, 16)}</span><span class="flex-1 text-[14px]">{t}</span><a id="go-{i}" href="#go" class="text-[13px] font-medium text-primary">{lnk}</a></div>'
                      for i, (ic, t, lnk, tone) in enumerate([("gavel-rounded", "Review suspensions for 3 Thủ Đức accounts", "Open in Reports", "bg-error-container text-error"),
                                                             ("photo-library-outline-rounded", "Block the AirPods photo set in new listings", "Open in Settings", "bg-tertiary-fixed text-on-tertiary-fixed-variant"),
                                                             ("campaign-outline-rounded", "Warn buyers in chat about deposits", "Open Scam check", "bg-primary/[.08] text-primary")]))
    tabs = "".join(f'<a id="dt-{k}" href="#dt-{k}" class="flex h-8 items-center rounded-full px-3.5 text-[13.5px] {"bg-white soft font-medium" if k == "doc" else "text-on-surface-variant"}">{t}</a>' for k, t in [("doc", "Document"), ("data", "Data"), ("sources", "Sources · 9")])
    return f"""<aside class="flex w-[640px] shrink-0 flex-col border-l hair bg-surface-container-low/50">
  <div class="flex h-14 shrink-0 items-center gap-2 border-b hair bg-white px-4">
    <span class="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-on-primary">{gi("article-outline-rounded", 17)}</span>
    <p class="min-w-0 flex-1 truncate text-[15px] font-semibold">Weekly scam brief</p>
    <a id="ver" href="#ver" class="hov inline-flex h-8 items-center gap-1 rounded-full border hair px-2.5 text-[13px]">{gi("chevron-left-rounded", 16)}<span class="tnum">v2 of 2</span>{gi("chevron-right-rounded", 16, "text-outline")}</a>
    <a id="copy-doc" href="#copy" title="Copy" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("content-copy-outline-rounded", 16)}</a>
    <a id="export" href="#export" class="hov inline-flex h-8 items-center gap-1 rounded-full border hair px-3 text-[13px] font-medium">{gi("download-rounded", 16)}Export{gi("expand-more-rounded", 15)}</a>
    <a id="close-doc" href="#close" title="Close" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("close-rounded", 18)}</a></div>
  <div class="flex items-center gap-1 px-4 py-2.5"><div class="flex rounded-full bg-surface-container p-1">{tabs}</div><span class="flex-1"></span><span class="text-[12.5px] text-on-surface-variant">Edited 2 min ago</span></div>
  <div class="mx-4 mb-4 min-h-0 flex-1 overflow-hidden rounded-[20px] border hair bg-white px-8 py-7 soft">
    <p class="text-[12.5px] font-medium uppercase tracking-[.08em] text-primary">Trust and safety · weekly</p>
    <h1 class="tight mt-1.5 text-[26px] font-semibold leading-[34px]">Scam reports, Nov 12–18</h1>
    <p class="mt-1 flex items-center gap-2 text-[13px] text-on-surface-variant">{avatar("L", 18, "bg-primary text-on-primary")}For Nguyễn Thị Lan · 9 sources · Claude Sonnet 5.5</p>
    <h2 class="mt-6 text-[16px] font-semibold">Summary</h2><ul class="mt-2 space-y-1.5 text-[14.5px] leading-[23px]">{summary}</ul>
    <h2 class="mt-6 text-[16px] font-semibold">Reports per day</h2><div class="mt-3 rounded-[16px] bg-surface-container-low/60 p-4"><div class="mb-2 flex justify-end">{legend()}</div>{chart(86)}</div>
    <h2 class="mt-6 text-[16px] font-semibold">Next steps</h2><div class="mt-3 space-y-2">{actions}</div>
  </div></aside>"""


def brief():
    body = mine(Q) + answer(doc_on=True, compact=True)
    inner = rail() + chat_col("Weekly scam brief", body, ask_box(), "max-w-[720px]") + doc_panel()
    return frame("Agent", f'<div class="flex min-w-0 flex-1">{inner}</div>', bare=True)


def sources_panel(on=3):
    filt = "".join(f'<a id="sf-{i}" href="#sf-{i}" class="flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] {"border-primary/40 bg-primary/[.06] font-medium text-primary" if i == 0 else "hair bg-white text-on-surface-variant"}">{t}</a>'
                   for i, t in enumerate(["All · 9", "Reports · 2", "Accounts · 3", "Data · 2", "Tickets · 1"]))
    items = ""
    for n, k, t, q, kind in SOURCES:
        ic, tone = SRC_KIND[k]
        hot = n == on
        items += f"""<a id="source-{n}" href="#source-{n}" class="{"bg-white ring-2 ring-primary/40 soft" if hot else "hov"} flex gap-3 rounded-[16px] p-3">
  <span class="flex h-6 min-w-6 items-center justify-center rounded-[7px] px-1 text-[12px] font-semibold {"bg-primary text-on-primary" if hot else "bg-surface-container text-on-surface-variant"}">{n}</span>
  <span class="min-w-0 flex-1 leading-tight"><span class="flex items-center gap-2"><span class="flex h-5 w-5 items-center justify-center rounded-full {tone}">{gi(ic, 12)}</span><span class="truncate text-[14px] font-semibold">{t}</span></span>
    <span class="mt-1 block text-[12px] text-on-surface-variant">{kind}</span>
    <span class="mt-1.5 block {"rounded-[10px] border-l-2 border-primary bg-primary/[.05] px-2.5 py-1.5" if hot else ""} text-[13px] text-on-surface">{q}</span></span>
  {gi("north-east-rounded", 15, "mt-1 text-on-surface-variant")}</a>"""
    return f"""<aside class="flex w-[400px] shrink-0 flex-col border-l hair bg-surface-container-low/50">
  <div class="flex h-14 shrink-0 items-center gap-2 px-4"><p class="flex-1 text-[15px] font-semibold">Sources</p>
    <a id="close-src" href="#close" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("close-rounded", 18)}</a></div>
  <div class="flex flex-wrap gap-1.5 px-4 pb-3">{filt}</div>
  <div class="min-h-0 flex-1 space-y-1 overflow-hidden px-2">{items}</div></aside>"""


def sources():
    pop = f"""<span class="absolute left-[-12px] top-[26px] z-20 block w-[300px] rounded-[16px] border hair bg-white p-3 text-left text-[14px] leading-normal shadow-[0_14px_36px_rgba(16,24,22,.16)]">
  <span class="flex items-center gap-2"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/[.08] text-primary">{gi("person-outline-rounded", 14)}</span><span class="flex-1 font-semibold">Trần Đức Anh</span>{tag("Account", "bg-surface-container text-on-surface-variant")}</span>
  <span class="mt-2 block rounded-[10px] border-l-2 border-primary bg-primary/[.05] px-2.5 py-1.5 text-[13px]">4 listings reuse Gò Vấp's photos at 97%</span>
  <span class="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-primary">Open account{gi("north-east-rounded", 14)}</span></span>"""
    global POP
    POP = pop
    body = mine(Q) + answer(cited=3, compact=True)
    POP = ""
    col = chat_col("Weekly scam brief", body, ask_box(), "max-w-[740px]")
    return frame("Agent", col + sources_panel(), thread="g1")


def option(t, sub, on, multi=False):
    mark = (f'<span class="flex h-5 w-5 items-center justify-center rounded-[6px] {"bg-primary text-on-primary" if on else "border-2 border-outline-variant"}">{gi("check-rounded", 14) if on else ""}</span>' if multi else
            f'<span class="flex h-5 w-5 items-center justify-center rounded-full border-2 {"border-primary" if on else "border-outline-variant"}">{"<span class=\'h-2.5 w-2.5 rounded-full bg-primary\'></span>" if on else ""}</span>')
    return (f'<a id="opt-{t[:6]}" href="#opt" class="flex items-start gap-3 rounded-[14px] border p-3 {"border-primary/50 bg-primary/[.04]" if on else "hair bg-white"}">{mark}'
            f'<span class="leading-tight"><span class="block text-[14px] font-medium">{t}</span><span class="mt-0.5 block text-[12.5px] text-on-surface-variant">{sub}</span></span></a>')


def clarify():
    q = f"""<section class="overflow-hidden rounded-[20px] border hair bg-white soft">
  <div class="space-y-5 p-5">
    <div><p class="mb-2.5 flex items-center gap-2 text-[14.5px] font-semibold"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] text-on-primary">1</span>Which period?</p>
      <div class="grid grid-cols-3 gap-2">{option("Last 7 days", "Nov 12–18", True)}{option("This month", "Nov 1–18", False)}{option("Last 30 days", "Oct 20–Nov 18", False)}</div></div>
    <div><p class="mb-2.5 flex items-center gap-2 text-[14.5px] font-semibold"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] text-on-primary">2</span>Which sellers? <span class="text-[12.5px] font-normal text-on-surface-variant">Pick any</span></p>
      <div class="grid grid-cols-3 gap-2">{option("Reported this week", "38 sellers", True, True)}{option("Suspended before", "12 sellers", True, True)}{option("Top 20 by orders", "20 sellers", False, True)}</div></div>
    <div><p class="mb-2.5 flex items-center gap-2 text-[14.5px] font-semibold"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-surface-container text-[12px] text-on-surface-variant">3</span>Format</p>
      <div class="flex gap-2">{"".join(f'<a id="fmt-{i}" href="#fmt" class="flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] {"border-primary/50 bg-primary/[.06] font-medium text-primary" if i == 0 else "hair bg-white"}">{gi(ic, 17)}{t}</a>' for i, (ic, t) in enumerate([("article-outline-rounded", "Document"), ("table-chart-outline-rounded", "Table"), ("slideshow-outline-rounded", "Slides")]))}</div></div>
  </div>
  <div class="flex items-center gap-2 border-t hair bg-surface-container-low/60 px-4 py-3">
    <a id="go" href="#go" class="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-on-primary">Continue{gi("arrow-forward-rounded", 17)}</a>
    {btn("Use defaults", aid="defaults")}<span class="flex-1"></span><span class="text-[12.5px] text-on-surface-variant">50 sellers in scope</span></div></section>"""
    body = mine("Prepare a seller risk brief for Friday's team meeting.") + f"""<div class="flex gap-3">{mascot()}<div class="min-w-0 flex-1 space-y-3">
  <p class="text-[15px] leading-[26px]">Three choices change what goes in the brief.</p>{q}</div></div>"""
    return frame("Agent", chat_col("Seller risk brief", body, ask_box("Or type your own answer…")), thread="g2")


def compose():
    skills = [("article-outline-rounded", "Weekly brief", "Reports, rings and actions for a period", "bg-primary text-on-primary"),
              ("hub-outline-rounded", "Ring check", "Accounts linked by address, photos or messages", "bg-error-container text-error"),
              ("storefront-outline-rounded", "Seller profile", "Orders, refusals, reports and history", "bg-secondary-container text-on-secondary-container"),
              ("support-agent-outline", "Ticket digest", "Open tickets grouped by cause", "bg-tertiary-fixed text-on-tertiary-fixed-variant"),
              ("local-shipping-outline-rounded", "Carrier report", "Delivery disputes by carrier and hub", "bg-inverse-primary/40 text-primary-container")]
    menu = f"""<div class="absolute bottom-[calc(100%+10px)] left-0 z-20 w-[460px] rounded-[20px] border hair bg-white p-2 shadow-[0_16px_40px_rgba(16,24,22,.16)]">
  <div class="flex items-center gap-2 px-3 pb-2 pt-1.5 text-[12.5px] text-on-surface-variant">{gi("bolt-outline-rounded", 15)}Skills<span class="flex-1"></span>{kbd("↑")}{kbd("↓")}{kbd("↵")}</div>
  {"".join(f'<a id="sk-{i}" href="#sk-{i}" class="{"bg-primary/[.06]" if i == 0 else "hov"} flex items-center gap-3 rounded-[14px] px-3 py-2.5"><span class="flex h-9 w-9 items-center justify-center rounded-[11px] {tone}">{gi(ic, 18)}</span><span class="min-w-0 flex-1 leading-tight"><span class="block text-[14.5px] font-semibold">/{t.lower().replace(" ", "-")} <span class="font-normal text-on-surface-variant">· {t}</span></span><span class="mt-0.5 block text-[12.5px] text-on-surface-variant">{d}</span></span></a>' for i, (ic, t, d, tone) in enumerate(skills))}
  <div class="mt-1 flex items-center gap-2 border-t hair px-3 pb-1 pt-2.5 text-[13px] text-on-surface-variant">{gi("add-rounded", 16)}<a id="new-skill" href="#new-skill">Make a skill from this chat</a></div></div>"""
    chips = (f'<span class="inline-flex h-8 items-center gap-1.5 rounded-full bg-error-container/60 pl-1.5 pr-2.5 text-[13px]"><span class="flex h-5 w-5 items-center justify-center rounded-full bg-error-container text-error">{gi("flag-outline-rounded", 12)}</span>Report · Đồ Cũ Gò Vấp{gi("close-rounded", 14, "text-on-surface-variant")}</span>'
             f'<span class="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary/[.07] pl-1.5 pr-2.5 text-[13px]"><span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">{gi("person-outline-rounded", 12)}</span>Account · Trần Đức Anh{gi("close-rounded", 14, "text-on-surface-variant")}</span>'
             f'<span class="inline-flex h-8 items-center gap-2 rounded-full border hair bg-white pl-1.5 pr-2.5 text-[13px]"><span class="flex h-5 w-5 items-center justify-center rounded-[6px] bg-[#1E7145] text-[9px] font-bold text-white">CSV</span>ghtk-claims-nov.csv<span class="tnum text-on-surface-variant">24 KB</span>{gi("close-rounded", 14, "text-on-surface-variant")}</span>')
    box = ask_box('<span class="text-on-surface">/w</span><span class="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-primary"></span>', chips, menu).replace("focus-within:ring-4", "border-primary/40 ring-4 ring-primary/10")
    from build_soft_agent import ART
    recent = "".join(f'<a id="rc-{i}" href="#rc-{i}" class="soft flex flex-col gap-2 rounded-[16px] border hair bg-white p-4"><span class="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/[.08] text-primary">{gi(ic, 14)}</span>{k}</span><span class="text-[14.5px] font-medium leading-[21px]">{t}</span></a>'
                     for i, (ic, k, t) in enumerate([("article-outline-rounded", "Document · 09:48", "Weekly scam brief · Nov 12–18"), ("hub-outline-rounded", "Ring check · Yesterday", "Gò Vấp deposit ring"), ("table-chart-outline-rounded", "Table · Mon", "GHTK disputes by hub")]))
    main = f"""<main class="hero relative flex min-w-0 flex-1 flex-col items-center overflow-hidden px-8 pt-[52px]"><div class="hdots pointer-events-none absolute inset-0"></div>
  <img src="{ART}" alt="" class="relative h-[96px] w-[96px] object-contain"><h1 class="tight relative mt-2 text-[32px] font-semibold">Good afternoon, Lan</h1>
  <div class="relative mt-[392px] w-full max-w-[740px]">{box}</div>
  <div class="relative mt-6 w-full max-w-[740px]"><p class="mb-3 text-[14px] font-medium text-on-surface-variant">Recent results</p><div class="grid grid-cols-3 gap-3">{recent}</div></div></main>"""
    return frame("Agent", main)


SCREENS = {"soft-chat-brief": ("Agent · Brief with document", brief), "soft-chat-sources": ("Agent · Sources", sources),
           "soft-chat-clarify": ("Agent · Clarifying question", clarify), "soft-chat-compose": ("Agent · Skills and attachments", compose)}

if __name__ == "__main__":
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
