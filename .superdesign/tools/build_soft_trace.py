"""The agent's run, shown step by step, in the soft look, in English.

Writes ../mockups/soft-chat-<name>.html. Since 2026-11-18 the console's chat
shows how the agent works (the user asked for it): a run card with the
elapsed time and live counts, a timeline of steps with a one-line summary
each, tool calls as chips (expandable to their input and result), a
sub-agent's own steps, the reasoning summary, and a steer box to add to the
request while it runs. A finished turn folds the run into one summary line.

  soft-chat-run    a turn in progress
  soft-chat-done   a finished turn, the run unfolded, one tool call open,
                   the turn details popover open
"""
import sys

from build_soft_admin import tag
from build_soft_agent import OUT, avatar, gi, kbd
from build_soft_chat import Q, chat_col, cite, figure, mascot, mine
from build_soft_pages import frame

SPARK = "material-symbols:auto-awesome-outline-rounded"


def tool_chip(name, arg, result="", state="done", count=""):
    icon = {"done": gi("check-rounded", 13, "text-primary"), "run": '<span class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>',
            "wait": gi("schedule-outline-rounded", 13, "text-outline")}[state]
    return (f'<a id="tc-{name}-{arg[:5]}" href="#tool" class="hov inline-flex h-7 items-center gap-1.5 rounded-[9px] border hair bg-white px-2 text-[12.5px]">{icon}'
            f'<span class="font-medium">{name}</span>{f"<span class=\'text-on-surface-variant\'>{arg}</span>" if arg else ""}'
            f'{f"<span class=\'rounded-[5px] bg-surface-container px-1 text-[11px] font-semibold\'>{count}</span>" if count else ""}'
            f'{f"<span class=\'text-on-surface-variant\'>→ {result}</span>" if result else ""}</a>')


def step(i, title, summary, chips="", state="done", secs="", extra="", last=False):
    dot = {"done": f'<span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/[.10] text-primary">{gi("check-rounded", 16)}</span>',
           "run": '<span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/[.10]"><span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent"></span></span>',
           "wait": f'<span class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-outline-variant text-[11px] font-semibold text-outline">{i}</span>'}[state]
    line = "" if last else '<span class="absolute bottom-0 left-[13px] top-8 w-px bg-outline-variant/60"></span>'
    return f"""<div class="relative flex gap-3 pb-4">{line}<span class="relative z-10">{dot}</span>
  <div class="min-w-0 flex-1 pt-0.5"><div class="flex items-center gap-2"><p class="flex-1 text-[14px] font-semibold {"text-on-surface-variant" if state == "wait" else ""}">{title}</p>
    {f'<span class="tnum text-[12px] text-on-surface-variant">{secs}</span>' if secs else ""}</div>
    {f'<p class="mt-0.5 text-[13.5px] leading-[20px] text-on-surface-variant">{summary}</p>' if summary else ""}
    {f'<div class="mt-2 flex flex-wrap gap-1.5">{chips}</div>' if chips else ""}{extra}</div></div>"""


def run_head(live=True):
    stats = "".join(f'<span class="tnum inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-2.5 text-[12.5px] soft">{gi(ic, 14, "text-primary")}{t}</span>'
                    for ic, t in ([("timer-outline", "0:18"), ("description-outline-rounded", "12 sources"), ("build-outline-rounded", "9 tool calls"), ("token-outline", "18.4K tokens")] if live else []))
    return f"""<div class="flex items-center gap-2.5 border-b hair px-4 py-3">
  <span class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">{gi(SPARK, 17)}<span class="absolute -inset-1 animate-ping rounded-full border-2 border-primary/30"></span></span>
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[14.5px] font-semibold">Working on the weekly brief</p><p class="text-[12.5px] text-on-surface-variant">Step 4 of 5 · Console assistant · Claude Sonnet 5.5</p></div>
  </div>{f'<div class="flex gap-1.5 border-b hair bg-surface-container-low/50 px-4 py-2">{stats}</div>' if stats else ""}"""


def subagent():
    return f"""<div class="mt-2.5 rounded-[14px] border border-dashed border-primary/30 bg-primary/[.03] p-3">
  <div class="flex items-center gap-2"><span class="flex h-6 w-6 items-center justify-center rounded-[8px] bg-error-container text-error">{gi("hub-outline-rounded", 14)}</span>
    <p class="flex-1 text-[13.5px] font-semibold">Ring check <span class="font-normal text-on-surface-variant">· sub-agent</span></p><span class="tnum text-[12px] text-on-surface-variant">0:07</span></div>
  <div class="mt-2 space-y-1.5 pl-8 text-[13px]">
    <p class="flex items-center gap-2">{gi("check-rounded", 14, "text-primary")}Matched pickup addresses <span class="text-on-surface-variant">· 2 accounts share 41 Lê Văn Thọ</span></p>
    <p class="flex items-center gap-2">{gi("check-rounded", 14, "text-primary")}Matched deposit messages <span class="text-on-surface-variant">· same text in 6 chats</span></p>
    <p class="flex items-center gap-2"><span class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>Comparing photo hashes <span class="text-on-surface-variant">· 4 of 9 listings</span></p></div></div>"""


def progress(now, total, label):
    return f"""<div class="mt-2.5 rounded-[12px] bg-surface-container-low px-3 py-2.5"><div class="flex items-center gap-2 text-[13px]"><span class="flex-1 truncate">{label}</span><span class="tnum text-on-surface-variant">{now}/{total}</span></div>
  <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><div class="h-full rounded-full bg-primary" style="width:{round(now / total * 100)}%"></div></div></div>"""


def run_live():
    steps = (step(1, "Plan", "Split into this week's reports, links between accounts, and the change against last week.", secs="0.8 s") +
             step(2, "Read reports", "86 reports this week, 66 the week before. 66 are scams.",
                  tool_chip("reports_search", "last 7 days", "86") + tool_chip("reports_search", "7 days before", "66"), secs="2.1 s") +
             step(3, "Look up the reported accounts", "5 accounts behind the 3 biggest cases; 2 suspended before.",
                  tool_chip("account_get", "", "", count="×5") + tool_chip("account_actions", "", "", count="×2") +
                  '<span class="flex -space-x-1.5">' + "".join(avatar(c, 24, key=c + "x").replace("rounded-full", "rounded-full ring-2 ring-white") for c in "ĐTPMH") + "</span>", secs="3.4 s") +
             step(4, "Check the rings", "", tool_chip("listing_get", "", "", "run", "4/9") + tool_chip("tickets_of_account", "Đồ Cũ Gò Vấp", "", "wait"), "run", "0:07",
                  subagent()) +
             step(5, "Write the brief", "", state="wait", last=True))
    card = f"""<section class="overflow-hidden rounded-[20px] border hair bg-white soft">{run_head()}<div class="px-4 pt-4">{steps}</div></section>"""
    draft = f"""<div class="rounded-[16px] border border-dashed hair px-4 py-3"><p class="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-on-surface-variant">{gi("edit-note-outline-rounded", 14)}Draft so far</p>
  <p class="text-[14.5px] leading-[24px] text-on-surface-variant">Scam reports rose to 86 this week, up 31%. Most of the rise comes from<span class="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-primary"></span></p></div>"""
    body = mine(Q) + f'<div class="flex gap-3">{mascot()}<div class="min-w-0 flex-1 space-y-3">{card}{draft}</div></div>'
    box = f"""<div class="rounded-[22px] border hair bg-white soft"><div class="flex items-center gap-2 px-4 pt-3"><span class="inline-flex h-6 items-center gap-1 rounded-full bg-primary/[.08] px-2 text-[12px] font-medium text-primary">{gi("alt-route-rounded", 13)}Steer</span>
  <span class="text-[12.5px] text-on-surface-variant">The agent reads this before its next step</span></div>
  <p class="min-h-[40px] px-5 pt-2 text-[15px] text-on-surface-variant/80">Also count fake cosmetics…</p>
  <div class="flex items-center gap-1.5 px-3 pb-3"><a id="plus" href="#plus" class="hov flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant">{gi("add-rounded", 20)}</a><span class="flex-1"></span>
    <span class="flex items-center gap-1 text-[12px] text-on-surface-variant">{kbd("Esc")}to stop</span>
    <a id="stop" href="#stop" class="flex h-9 items-center gap-1.5 rounded-full bg-on-surface px-3.5 text-[13.5px] font-medium text-surface">{gi("stop-rounded", 17)}Stop</a>
    <a id="send" href="#send" class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary">{gi("arrow-upward-rounded", 19)}</a></div></div>"""
    col = chat_col("Weekly scam brief", body, box, "max-w-[800px]").replace("flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_48px)]", "flex-col justify-start overflow-hidden pt-2", 1)
    return frame("Agent", col, thread="g1")


def tool_open():
    rows = "".join(f'<div class="flex gap-3 border-t hair py-1.5 first:border-t-0"><span class="w-[120px] shrink-0 text-on-surface-variant">{k}</span><span class="min-w-0 flex-1">{v}</span></div>'
                   for k, v in [("Name", "Trần Đức Anh"), ("Listings", "14 · 4 reuse Gò Vấp's photos"), ("Reports", "4 · scam"), ("Pickup address", '41 Lê Văn Thọ <span class="rounded-[5px] bg-error-container px-1 text-[11.5px] text-error">same as Đồ Cũ Gò Vấp</span>'), ("Suspended before", "No")])
    return f"""<div class="mt-2 overflow-hidden rounded-[14px] border hair bg-white">
  <div class="flex items-center gap-2 border-b hair bg-surface-container-low/60 px-3 py-2 text-[12.5px]">{gi("check-rounded", 14, "text-primary")}<span class="font-semibold">account_get</span>
    <span class="rounded-[6px] bg-white px-1.5 text-on-surface-variant">id: 7d22e9</span><span class="flex-1"></span><span class="tnum text-on-surface-variant">38 ms</span>
    <a id="raw" href="#raw" class="font-medium text-primary">Raw</a>{gi("expand-less-rounded", 16, "text-on-surface-variant")}</div>
  <div class="px-3 py-2 text-[13px]">{rows}</div></div>"""


def run_done():
    steps = (step(2, "Read reports", "86 reports this week, 66 the week before.", tool_chip("reports_search", "last 7 days", "86") + tool_chip("reports_search", "7 days before", "66"), secs="2.1 s") +
             step(3, "Look up the reported accounts", "5 accounts behind the 3 biggest cases.", tool_chip("account_get", "", "", count="×5") + tool_chip("account_actions", "", "", count="×2"), secs="3.4 s") +
             step(4, "Check the rings", "Gò Vấp grew to 5 accounts; a new AirPods group in Thủ Đức.", tool_chip("listing_get", "", "", count="×9") + tag(gi("hub-outline-rounded", 13) + "Ring check · 3 steps", "bg-error-container/70 text-error"), secs="21 s") +
             step(5, "Write the brief", "4 sections, 9 sources cited.", tag(gi("article-outline-rounded", 13) + "Weekly scam brief", "bg-primary/[.08] text-primary"), secs="14 s", last=True))
    summary = f"""<section class="overflow-hidden rounded-[18px] border hair bg-white">
  <a id="run-toggle" href="#run" class="flex items-center gap-2.5 border-b hair px-4 py-2.5"><span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/[.10] text-primary">{gi("check-rounded", 16)}</span>
    <span class="flex-1 text-[14px] font-semibold">Worked for 42 s</span><span class="tnum text-[12.5px] text-on-surface-variant">Plan and 4 steps · 11 tool calls · 14 sources</span>{gi("expand-less-rounded", 18, "text-on-surface-variant")}</a>
  <a id="thought" href="#thought" class="flex items-start gap-2.5 border-b hair bg-surface-container-low/40 px-4 py-2.5"><span class="mt-0.5 text-on-surface-variant">{gi("psychology-outline-rounded", 18)}</span>
    <span class="min-w-0 flex-1 text-[13.5px] leading-[20px]"><span class="font-medium">Thought for 6 s</span><span class="text-on-surface-variant"> · Weighted rings by new accounts rather than raw report counts, since one buyer filed 5 reports against Hải Châu.</span></span>{gi("expand-more-rounded", 18, "text-on-surface-variant")}</a>
  <div class="px-4 pt-4">{steps}</div></section>"""
    figs = "".join([figure("86", "reports", "+31% vs last week", "text-error"), figure("2", "rings growing", "+3 accounts"),
                    figure("41%", "ask for a deposit", "+12 pts", "text-error"), figure("6.2 h", "median to resolve", "−1.4 h")])
    details = f"""<div class="absolute bottom-9 right-0 z-20 w-[280px] rounded-[16px] border hair bg-white p-3 text-[13px] shadow-[0_14px_36px_rgba(16,24,22,.16)]">
  <p class="mb-2 text-[13.5px] font-semibold">Turn details</p>{"".join(f'<div class="flex justify-between py-1"><span class="text-on-surface-variant">{k}</span><span class="tnum font-medium">{v}</span></div>' for k, v in [("Model", "Claude Sonnet 5.5"), ("Provider", "LLM upstream"), ("Input", "18,402 tokens"), ("Output", "1,214 tokens"), ("Cost", "$0.049"), ("Time", "42 s · first token 1.1 s")])}</div>"""
    foot = (f'<div class="relative -ml-1.5 flex items-center gap-0.5">' + "".join(f'<a id="a-{ic[:5]}" href="#a" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi(ic, 16)}</a>'
            for ic in ["content-copy-outline-rounded", "refresh-rounded", "thumb-up-outline-rounded", "thumb-down-outline-rounded"]) +
            f'<span class="flex-1"></span><a id="details" href="#details" class="tnum inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-container px-3 text-[12.5px]">{gi("info-outline-rounded", 14)}42 s · 19.6K tokens · $0.049</a>{details}</div>')
    body = mine(Q) + f"""<div class="flex gap-3">{mascot()}<div class="min-w-0 flex-1 space-y-4">{summary}
  <p class="text-[15px] leading-[26px]">Scam reports rose to <b class="font-semibold">86</b> this week, up 31%{cite(1)}. The Gò Vấp deposit ring added 3 accounts{cite(2)}{cite(3)}, and a new AirPods reseller group appeared in Thủ Đức{cite(4)}.</p>
  {foot}</div></div>"""
    from build_soft_chat import ask_box
    return frame("Agent", chat_col("Weekly scam brief", body, ask_box(), "max-w-[800px]"), thread="g1")


# --- one tool call, opened ---

def json_block():
    k = lambda t: f'<span class="text-[#7A3E9D]">"{t}"</span>'  # noqa: E731
    v = lambda t: f'<span class="text-[#1E7145]">"{t}"</span>'  # noqa: E731
    n = lambda t: f'<span class="text-[#B3542E]">{t}</span>'  # noqa: E731
    lines = ["{", f'  {k("id")}: {v("7d22e9")},', f'  {k("name")}: {v("Trần Đức Anh")},', f'  {k("status")}: {v("active")},',
             f'  {k("listings")}: {n(14)},', f'  {k("reports")}: {{ {k("total")}: {n(4)}, {k("scam")}: {n(4)} }},',
             f'  {k("pickup_address")}: {v("41 Lê Văn Thọ, Gò Vấp")},', f'  {k("photo_matches")}: [', f'    {{ {k("listing")}: {v("l_88a1")}, {k("of")}: {v("l_51c0")}, {k("score")}: {n(0.97)} }},',
             f'    {{ {k("listing")}: {v("l_88b4")}, {k("of")}: {v("l_51c2")}, {k("score")}: {n(0.96)} }}', "  ],", f'  {k("suspended_before")}: {n("false")}', "}"]
    return ('<div class="overflow-hidden rounded-[14px] bg-[#F6F8F7] p-3.5 font-mono text-[12.5px] leading-[20px]">' +
            "".join(f'<div class="flex gap-3"><span class="w-5 shrink-0 select-none text-right text-on-surface-variant/50">{i + 1}</span><span class="whitespace-pre">{l}</span></div>' for i, l in enumerate(lines)) + "</div>")


def tool_drawer(raw=False):
    inp = "".join(f'<div class="flex gap-3 py-1.5"><span class="w-[90px] shrink-0 text-on-surface-variant">{a}</span><span class="font-medium">{b}</span></div>'
                  for a, b in [("id", "7d22e9"), ("include", "profile, listings, reports, photo matches")])
    res = "".join(f'<tr class="border-t hair"><td class="px-3 py-2 text-on-surface-variant">{a}</td><td class="px-3 py-2">{b}</td></tr>'
                  for a, b in [("Name", "Trần Đức Anh"), ("Status", "Active"), ("Listings", "14"), ("Reports", "4 · all scam"),
                               ("Pickup address", '41 Lê Văn Thọ <span class="ml-1 rounded-[5px] bg-error-container px-1 text-[11.5px] text-error">same as Đồ Cũ Gò Vấp</span>'), ("Suspended before", "No")])
    matches = "".join(f'<div class="flex items-center gap-3 rounded-[12px] border hair px-3 py-2"><span class="h-9 w-9 rounded-[8px] bg-surface-container"></span>{gi("arrow-forward-rounded", 15, "text-outline")}<span class="h-9 w-9 rounded-[8px] bg-surface-container"></span>'
                      f'<span class="min-w-0 flex-1 leading-tight"><span class="block truncate text-[13px] font-medium">{t}</span><span class="text-[12px] text-on-surface-variant">matches a Gò Vấp listing</span></span><span class="tnum text-[13px] font-semibold text-error">{sc}</span></div>'
                      for t, sc in [("iPhone 13 Pro Max 256GB", "97%"), ("AirPods Pro 2", "96%")])
    timing = "".join(f'<div class="flex items-center gap-3 text-[12.5px]"><span class="w-[92px] text-on-surface-variant">{a}</span><div class="relative h-2 flex-1 rounded-full bg-surface-container"><span class="absolute h-full rounded-full {c}" style="left:{l}%;width:{w}%"></span></div><span class="tnum w-12 text-right">{t}</span></div>'
                     for a, l, w, c, t in [("Queued", 0, 6, "bg-outline-variant", "2 ms"), ("MCP server", 6, 82, "bg-primary", "31 ms"), ("Database", 18, 58, "bg-primary/50", "22 ms"), ("Return", 88, 12, "bg-outline-variant", "5 ms")])
    raw_body = f'''<div class="rounded-[16px] border hair bg-white p-3.5"><div class="mb-2 flex items-center gap-2"><p class="flex-1 text-[12.5px] font-medium text-on-surface-variant">Request</p><a id="copy-req" href="#copy" class="text-[12.5px] font-medium text-primary">Copy</a></div>
  <div class="rounded-[12px] bg-[#F6F8F7] p-3 font-mono text-[12.5px] leading-[20px]"><span class="text-[#7A3E9D]">"id"</span>: <span class="text-[#1E7145]">"7d22e9"</span>, <span class="text-[#7A3E9D]">"include"</span>: [<span class="text-[#1E7145]">"profile"</span>, <span class="text-[#1E7145]">"listings"</span>, <span class="text-[#1E7145]">"reports"</span>, <span class="text-[#1E7145]">"photo_matches"</span>]</div></div>
<div class="rounded-[16px] border hair bg-white p-3.5"><div class="mb-2 flex items-center gap-2"><p class="flex-1 text-[12.5px] font-medium text-on-surface-variant">Response · 200 · 1.2 KB</p><a id="copy-res" href="#copy" class="text-[12.5px] font-medium text-primary">Copy</a></div>{json_block()}</div>'''
    tabs = "".join(f'<a id="tt-{k}" href="#tt-{k}" class="flex h-8 items-center rounded-full px-3.5 text-[13.5px] {"bg-white soft font-medium" if k == ("raw" if raw else "res") else "text-on-surface-variant"}">{t}</a>' for k, t in [("res", "Result"), ("input", "Input"), ("raw", "Raw JSON"), ("time", "Timing")])
    return f"""<aside class="flex w-[480px] shrink-0 flex-col border-l hair bg-surface-container-low/50">
  <div class="flex items-center gap-3 border-b hair bg-white px-4 py-3"><span class="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/[.08] text-primary">{gi("person-outline-rounded", 20)}</span>
    <div class="min-w-0 flex-1 leading-tight"><p class="flex items-center gap-2 text-[15px] font-semibold">account_get {tag(gi("check-rounded", 13) + "38 ms")}</p><p class="tnum mt-0.5 text-[12.5px] text-on-surface-variant">Step 3 · 10:04:12 · read-only</p></div>
    <a id="open-acc" href="#open" title="Open account" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("north-east-rounded", 17)}</a>
    <a id="copy-json" href="#copy" title="Copy JSON" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("data-object-rounded", 17)}</a>
    <a id="close-tool" href="#close" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant">{gi("close-rounded", 18)}</a></div>
  <div class="px-4 py-2.5"><div class="flex rounded-full bg-surface-container p-1">{tabs}</div></div>
  <div class="min-h-0 flex-1 space-y-3 overflow-hidden px-4 pb-4">{raw_body if raw else ""}
    <div class="{"hidden" if raw else ""} rounded-[16px] border hair bg-white p-3.5"><p class="mb-1 text-[12.5px] font-medium text-on-surface-variant">Input</p><div class="text-[13.5px]">{inp}</div></div>
    <div class="{"hidden" if raw else ""} overflow-hidden rounded-[16px] border hair bg-white"><p class="px-3.5 pb-1 pt-3 text-[12.5px] font-medium text-on-surface-variant">Result</p><table class="w-full text-[13.5px]">{res}</table></div>
    <div class="{"hidden" if raw else ""} rounded-[16px] border hair bg-white p-3.5"><p class="mb-2 text-[12.5px] font-medium text-on-surface-variant">Photo matches · 2 of 4</p><div class="space-y-1.5">{matches}</div></div>
    <div class="rounded-[16px] border hair bg-white p-3.5"><p class="mb-2.5 flex text-[12.5px] font-medium text-on-surface-variant"><span class="flex-1">Timing</span><span class="tnum">38 ms</span></p><div class="space-y-2">{timing}</div></div>
  </div></aside>"""


def tool_detail(raw=False):
    chips = (tool_chip("account_get", "Đồ Cũ Gò Vấp") + tool_chip("account_get", "7d22e9 · Trần Đức Anh").replace("hov inline-flex", "inline-flex ring-2 ring-primary/40 bg-primary/[.04]", 1) +
             tool_chip("account_get", "Phạm Quốc Bảo") + tool_chip("account_get", "Mỹ Phẩm Hà") + tool_chip("account_get", "Hoàng Nam") + tool_chip("account_actions", "", "", count="×2"))
    steps = (step(2, "Read reports", "86 reports this week, 66 the week before.", tool_chip("reports_search", "last 7 days", "86") + tool_chip("reports_search", "7 days before", "66"), secs="2.1 s") +
             step(3, "Look up the reported accounts", "5 accounts behind the 3 biggest cases.", chips, secs="3.4 s") +
             step(4, "Check the rings", "Gò Vấp grew to 5 accounts; a new AirPods group in Thủ Đức.", tool_chip("listing_get", "", "", count="×9"), secs="21 s", last=True))
    card = f"""<section class="overflow-hidden rounded-[18px] border hair bg-white"><div class="flex items-center gap-2.5 border-b hair px-4 py-2.5"><span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/[.10] text-primary">{gi("check-rounded", 16)}</span>
  <span class="flex-1 text-[14px] font-semibold">Worked for 42 s</span><span class="tnum text-[12.5px] text-on-surface-variant">11 tool calls</span>{gi("expand-less-rounded", 18, "text-on-surface-variant")}</div><div class="px-4 pt-4">{steps}</div></section>"""
    body = mine(Q) + f'<div class="flex gap-3">{mascot()}<div class="min-w-0 flex-1 space-y-4">{card}<p class="text-[15px] leading-[26px]">Scam reports rose to <b class="font-semibold">86</b> this week, up 31%{cite(1)}. The Gò Vấp deposit ring added 3 accounts{cite(2)}{cite(3)}.</p></div></div>'
    from build_soft_chat import ask_box
    return frame("Agent", chat_col("Weekly scam brief", body, ask_box(), "max-w-[720px]") + tool_drawer(raw), thread="g1")


# --- errors in a run ---

def notice(ic, tone, title, sub, right=""):
    return (f'<div class="mt-2.5 flex items-start gap-2.5 rounded-[12px] px-3 py-2.5 {tone}">{gi(ic, 17, "mt-0.5")}<div class="min-w-0 flex-1 leading-tight">'
            f'<p class="text-[13.5px] font-medium">{title}</p><p class="mt-0.5 text-[12.5px] opacity-80">{sub}</p></div>{right}</div>')


def err_chip(name, arg, why):
    return (f'<a id="ec-{name}" href="#tool" class="inline-flex h-7 items-center gap-1.5 rounded-[9px] border border-error/30 bg-error/[.04] px-2 text-[12.5px] text-error">{gi("error-outline-rounded", 13)}'
            f'<span class="font-medium">{name}</span><span>{arg}</span><span class="opacity-80">→ {why}</span></a>')


def run_retry():
    tries = f"""<div class="mt-2.5 space-y-1.5 rounded-[12px] bg-surface-container-low px-3 py-2.5 text-[13px]">
  <p class="flex items-center gap-2">{gi("close-rounded", 15, "text-error")}<span class="w-[70px] text-on-surface-variant">Attempt 1</span>Timed out after 10 s<span class="tnum ml-auto text-on-surface-variant">10:04:31</span></p>
  <p class="flex items-center gap-2">{gi("close-rounded", 15, "text-error")}<span class="w-[70px] text-on-surface-variant">Attempt 2</span>Timed out after 10 s<span class="tnum ml-auto text-on-surface-variant">10:04:43</span></p>
  <p class="flex items-center gap-2"><span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent"></span><span class="w-[70px] text-on-surface-variant">Attempt 3</span>in 4 s, with a 20 s limit<span class="tnum ml-auto text-on-surface-variant">of 3</span></p></div>"""
    steps = (step(2, "Read reports", "", tool_chip("reports_search", "last 7 days", "86") + tool_chip("reports_search", "7 days before", "66"), secs="2.1 s",
                  extra=notice("swap-horiz-rounded", "bg-tertiary-fixed/50 text-on-tertiary-fixed-variant", "LLM upstream returned 529 overloaded", "Switched to Anthropic for this step; same model, Claude Sonnet 5.5")) +
             step(3, "Look up the reported accounts", "5 accounts behind the 3 biggest cases.", tool_chip("account_get", "", "", count="×5") + tool_chip("account_actions", "", "", count="×2"), secs="3.4 s") +
             step(4, "Check the rings", "8 of 9 listings read; one keeps timing out.",
                  tool_chip("listing_get", "", "", count="×8") + err_chip("listing_get", "l_88b4", "timeout"), "run", "0:31", tries, last=True))
    card = f"""<section class="overflow-hidden rounded-[20px] border hair bg-white soft">{run_head().replace("Step 4 of 5", "Step 4 of 5 · retrying").replace("0:18", "0:44")}<div class="px-4 pt-4">{steps}</div>
  <div class="flex items-center gap-2 border-t hair bg-surface-container-low/60 px-4 py-2.5 text-[13px]"><span class="flex-1 text-on-surface-variant">If attempt 3 fails, the brief goes on without this listing.</span>
    <a id="skip" href="#skip" class="hov rounded-full border hair bg-white px-3 py-1.5 font-medium">Skip it now</a></div></section>"""
    body = mine(Q) + f'<div class="flex gap-3">{mascot()}<div class="min-w-0 flex-1">{card}</div></div>'
    from build_soft_chat import ask_box
    col = chat_col("Weekly scam brief", body, ask_box(), "max-w-[800px]").replace("flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_48px)]", "flex-col justify-start overflow-hidden pt-2", 1)
    return frame("Agent", col, thread="g1")


def run_budget():
    steps = (step(2, "Read reports", "86 reports this week, 66 the week before.", tool_chip("reports_search", "", "", count="×2"), secs="2.1 s") +
             step(3, "Look up the reported accounts", "5 accounts behind the 3 biggest cases.", tool_chip("account_get", "", "", count="×5"), secs="3.4 s") +
             step(4, "Check the rings", "Stopped at 6 of 9 listings.", tool_chip("listing_get", "", "", count="×6"), "wait", "", last=True).replace("border-dashed border-outline-variant text-[11px] font-semibold text-outline\">4", "border-dashed border-error/50 text-[11px] font-semibold text-error\">4"))
    stop = f"""<section class="overflow-hidden rounded-[20px] border border-error/25 bg-white soft">
  <div class="flex items-start gap-3 p-4"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-error-container text-error">{gi("pause-circle-outline-rounded", 22)}</span>
    <div class="min-w-0 flex-1"><p class="text-[15.5px] font-semibold">Stopped: your daily budget is used up</p><p class="mt-0.5 text-[13.5px] text-on-surface-variant">3 of 5 steps done. What it found so far is kept and the run picks up from step 4.</p>
      <div class="mt-3 flex items-center gap-3"><div class="h-2 flex-1 overflow-hidden rounded-full bg-surface-container"><div class="h-full w-full rounded-full bg-error"></div></div><span class="tnum text-[13px] font-semibold">$5.00 / $5.00</span></div>
      <p class="tnum mt-1.5 text-[12.5px] text-on-surface-variant">Resets at 00:00 · in 9 h 12 min</p></div></div>
  <div class="border-t hair bg-surface-container-low/50 p-4">
    <p class="mb-2.5 text-[14px] font-semibold">Ask an admin for more</p>
    <div class="flex gap-2">{"".join(f'<a id="amt-{i}" href="#amt" class="flex-1 rounded-[14px] border p-2.5 text-center {"border-primary/50 bg-primary/[.05]" if i == 1 else "hair bg-white"}"><p class="tnum text-[15px] font-semibold {"text-primary" if i == 1 else ""}">{a}</p><p class="text-[12px] text-on-surface-variant">{b}</p></a>' for i, (a, b) in enumerate([("+$2", "today"), ("+$3", "today"), ("$8/day", "this week")]))}</div>
    <p class="mt-2.5 min-h-[44px] rounded-[14px] border border-primary/50 bg-white px-3.5 py-2.5 text-[14px] ring-4 ring-primary/10">Finishing the weekly brief for Friday's meeting.</p>
    <div class="mt-3 flex items-center gap-2"><a id="request" href="#request" class="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-medium text-on-primary">{gi("send-outline-rounded", 16)}Send request</a>
      {btn_plain("Resume at 00:00", "schedule-outline-rounded")}<span class="flex-1"></span><span class="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">{avatar("K", 20, "bg-primary text-on-primary")}Goes to Khoa and Bảo</span></div></div></section>"""
    card = f"""<section class="overflow-hidden rounded-[18px] border hair bg-white"><div class="flex items-center gap-2.5 border-b hair px-4 py-2.5"><span class="flex h-7 w-7 items-center justify-center rounded-full bg-error-container text-error">{gi("pause-rounded", 16)}</span>
  <span class="flex-1 text-[14px] font-semibold">Paused after 31 s</span><span class="tnum text-[12.5px] text-on-surface-variant">3 of 5 steps · 9 sources</span>{gi("expand-more-rounded", 18, "text-on-surface-variant")}</div>
  <div class="flex flex-wrap gap-1.5 px-4 py-2.5">{tool_chip("reports_search", "", "", count="×2")}{tool_chip("account_get", "", "", count="×5")}{tool_chip("listing_get", "", "", count="6/9")}</div></section>"""
    body = mine(Q) + f'<div class="flex gap-3">{mascot()}<div class="min-w-0 flex-1 space-y-3">{card}{stop}</div></div>'
    box = f"""<div class="flex items-center gap-3 rounded-[22px] border hair bg-surface-container-low px-5 py-4 text-[14px] text-on-surface-variant">{gi("lock-clock-outline", 19)}<span class="flex-1">Asking is paused until 00:00 or until an admin adds budget.</span></div>"""
    col = chat_col("Weekly scam brief", body, box, "max-w-[800px]").replace("flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_48px)]", "flex-col justify-start overflow-hidden pt-2", 1)
    return frame("Agent", col, thread="g1")


def btn_plain(t, ic):
    return f'<a id="p-{ic[:5]}" href="#p" class="hov inline-flex h-10 items-center gap-1.5 rounded-full border hair bg-white px-4 text-[14px] font-medium">{gi(ic, 16)}{t}</a>'


SCREENS = {"soft-chat-run": ("Agent · Run in progress", run_live), "soft-chat-done": ("Agent · Run summary", run_done),
           "soft-chat-tool": ("Agent · Tool call", tool_detail), "soft-chat-tool-raw": ("Agent · Tool call · Raw JSON", lambda: tool_detail(True)), "soft-chat-retry": ("Agent · Tool error and retry", run_retry), "soft-chat-budget": ("Agent · Budget reached", run_budget)}

if __name__ == "__main__":
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
