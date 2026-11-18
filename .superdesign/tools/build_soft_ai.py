"""Cấu hình's AI pages: providers, models with tags, agents.

Writes ../mockups/soft-cfg-<name>.html in build_soft_admin_rich.py's look.

- Providers: an admin adds as many providers as needed; the proxy rotates
  requests between the ones that serve a model (evenly, by weight, or in
  order as fallbacks), retries on another after an error and benches a
  failing one for a while.
- Models: every model the providers serve, synced from them, each with tags
  (Dùng tool, Đọc ảnh, Ngữ cảnh dài, Nhanh, Rẻ, Suy luận, Vector).
- Agents: each purpose is an agent with a readable name. An agent requires
  some tags; its model picker lists only the models that carry all of them.

  soft-cfg-providers  providers and the rotation
  soft-cfg-models     the model list with tags
  soft-cfg-agents     the agents
  soft-cfg-agent      one agent, the model picker open
"""
import sys
from html import escape

from build_soft_admin import btn, card, card_head, gi, tag, toggle
from build_soft_admin_rich import MC, page, spark
from build_soft_agent import OUT

PROVIDERS = {  # name: (letter, colour, kind)
    "LLM upstream": ("U", "#005049", "Tương thích OpenAI"),
    "Anthropic": ("A", "#B3542E", "Anthropic API"),
    "OpenRouter": ("O", "#47645F", "OpenRouter"),
    "AWS Bedrock": ("B", "#8A8A85", "AWS Bedrock"),
}

# Two kinds of tag: what the model is (Chat, Embedding) and what it can do.
KINDS = ["Chat", "Embedding"]
TAGS = {  # name: (icon, classes)
    "Chat": ("chat-outline-rounded", "bg-primary text-on-primary"),
    "Embedding": ("hub-outline-rounded", "bg-on-surface text-surface"),
    "Vision": ("visibility-outline", "bg-tertiary-fixed/80 text-on-tertiary-fixed-variant"),
    "Dùng tool": ("build-outline-rounded", "bg-primary/[.08] text-primary"),
    "Ngữ cảnh dài": ("notes-rounded", "bg-secondary-container/80 text-on-secondary-container"),
    "Suy luận": ("psychology-outline-rounded", "bg-inverse-primary/40 text-primary-container"),
    "Đầu ra có cấu trúc": ("data-object-rounded", "bg-surface-container text-on-surface"),
    "Đa ngôn ngữ": ("translate-rounded", "bg-surface-container text-on-surface"),
}

# name, family, tags, providers, price in/out per 1M, context, agents using it
MODELS = [
    ("Claude Opus 5.5", "Anthropic", ["Chat", "Vision", "Dùng tool", "Ngữ cảnh dài", "Suy luận", "Đầu ra có cấu trúc"], ["LLM upstream", "Anthropic", "AWS Bedrock"], "$5 · $25", "1M", []),
    ("Claude Sonnet 5.5", "Anthropic", ["Chat", "Vision", "Dùng tool", "Ngữ cảnh dài", "Suy luận", "Đầu ra có cấu trúc"], ["LLM upstream", "Anthropic", "OpenRouter", "AWS Bedrock"], "$2 · $10", "1M", ["Trợ lý console"]),
    ("Claude Fable 5.2", "Anthropic", ["Chat", "Dùng tool", "Ngữ cảnh dài", "Đầu ra có cấu trúc"], ["Anthropic"], "$1,5 · $7,5", "400K", []),
    ("Claude Haiku 5.5", "Anthropic", ["Chat", "Vision", "Dùng tool", "Đầu ra có cấu trúc"], ["LLM upstream", "Anthropic", "OpenRouter"], "$1 · $1", "200K", ["Kiểm tra lừa đảo", "Đọc ảnh tin đăng", "Tìm kiếm"]),
    ("bge-m3", "BAAI", ["Embedding", "Đa ngôn ngữ"], ["OpenRouter"], "$1", "8K", ["Vector tìm kiếm"]),
    ("multilingual-e5-large", "Microsoft", ["Embedding", "Đa ngôn ngữ"], ["OpenRouter"], "$0,5", "512", []),
]

# name, icon, purpose, required tags, model, calls 7 days, spend, sparkline
AGENTS = [
    ("Trợ lý console", "material-symbols:auto-awesome-outline-rounded", "Đọc ticket, báo cáo, tài khoản và đề xuất cho nhân viên", ["Chat", "Dùng tool", "Ngữ cảnh dài"], "Claude Sonnet 5.5", "1.284", "$128,40", [30, 42, 38, 55, 61, 48, 70, 66, 74, 80]),
    ("Kiểm tra lừa đảo", "gpp-maybe-outline-rounded", "Đọc tin nhắn trong chat của app và cảnh báo người mua", ["Chat", "Đầu ra có cấu trúc"], "Claude Haiku 5.5", "18.902", "$8,10", [60, 58, 64, 70, 66, 72, 75, 71, 78, 82]),
    ("Đọc ảnh tin đăng", "photo-camera-outline-rounded", "Điền tên, loại và tình trạng từ ảnh khi người bán đăng tin", ["Chat", "Vision"], "Claude Haiku 5.5", "6.410", "$3,90", [40, 44, 39, 50, 47, 52, 49, 55, 51, 54]),
    ("Tìm kiếm", "search-rounded", "Hiểu câu tìm kiếm tự nhiên trong app", ["Chat", "Đầu ra có cấu trúc"], "Claude Haiku 5.5", "31.277", "$1,60", [70, 74, 80, 77, 85, 90, 88, 94, 97, 99]),
    ("Vector tìm kiếm", "hub-outline-rounded", "Biến tin đăng và câu tìm kiếm thành vector", ["Embedding", "Đa ngôn ngữ"], "bge-m3", "52.118", "$0,30", [50, 52, 55, 53, 58, 60, 59, 63, 62, 66]),
]


def ptile(name, size=36):
    letter, color, _ = PROVIDERS[name]
    r = round(size * .3)
    return (f'<span title="{name}" class="flex shrink-0 items-center justify-center font-semibold text-white ring-2 ring-white" '
            f'style="width:{size}px;height:{size}px;border-radius:{r}px;background:{color};font-size:{round(size * .42)}px">{letter}</span>')


def mtag(name, small=False):
    ic, tone = TAGS[name]
    h = "h-6 text-[12px] px-2" if small else "h-7 text-[12.5px] px-2.5"
    return f'<span class="inline-flex {h} items-center gap-1 whitespace-nowrap rounded-full font-medium {tone}">{gi(ic, 13 if small else 14)}{name}</span>'


def segmented(items, on, aid):
    return ('<div class="flex rounded-full bg-surface-container p-1 text-[13.5px]">' + "".join(
        f'<a id="{aid}-{i}" href="#{aid}-{i}" class="flex h-8 items-center gap-1.5 rounded-full px-3.5 {"bg-white soft font-medium text-on-surface" if i == on else "text-on-surface-variant"}">{gi(ic, 16)}{t}</a>'
        for i, (ic, t) in enumerate(items)) + "</div>")


# --- Providers ---

def providers():
    rows = [("LLM upstream", "sk-…4f2a", 4, 50, 48, "99,9%", "1,1 s", "ok", [50, 52, 49, 51, 48, 50, 47, 49]),
            ("Anthropic", "sk-ant-…91cd", 4, 30, 33, "99,7%", "1,3 s", "ok", [28, 30, 31, 29, 33, 32, 34, 33]),
            ("OpenRouter", "sk-or-…7be0", 4, 20, 19, "99,2%", "1,6 s", "ok", [22, 20, 21, 19, 18, 20, 19, 19]),
            ("AWS Bedrock", "AKIA…Q3TZ", 2, 0, 0, "–", "–", "benched", [6, 5, 4, 2, 0, 0, 0, 0])]
    cards = ""
    for name, key, nm, weight, share, ok, p50, state, sp in rows:
        letter, color, kind = PROVIDERS[name]
        bad = state != "ok"
        status = (tag('<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>Chạy tốt') if not bad else
                  tag(gi("pause-circle-outline-rounded", 14) + "Tạm ngưng đến 10:45", "bg-error-container text-error"))
        cards += card(f"""<div class="flex items-center gap-4">
  <span class="text-outline">{gi("drag-indicator", 20)}</span>{ptile(name, 44)}
  <div class="w-[210px] leading-tight"><p class="text-[15.5px] font-semibold">{name}</p><p class="mt-0.5 text-[13px] text-on-surface-variant">{kind} · <span class="tnum">{key}</span></p></div>
  <div class="w-[96px] leading-tight"><p class="text-[12px] text-on-surface-variant">Model</p><a id="pm-{letter}" href="#provider-{letter}" class="tnum mt-0.5 flex items-center gap-0.5 text-[15px] font-semibold text-primary">{nm}{gi("chevron-right-rounded", 16)}</a></div>
  <div class="w-[110px] leading-tight"><p class="text-[12px] text-on-surface-variant">Trọng số</p>
    <p class="mt-1 flex h-8 w-[84px] items-center rounded-[10px] border hair bg-white px-2.5 text-[14px]"><span class="tnum flex-1">{weight}</span><span class="text-on-surface-variant">%</span></p></div>
  <div class="min-w-0 flex-1 leading-tight"><div class="flex justify-between text-[12px] text-on-surface-variant"><span>Lượt 24 giờ</span><span class="tnum">{share}%</span></div>
    <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-container"><div class="h-full rounded-full" style="width:{share}%;background:{color}"></div></div>
    <p class="tnum mt-1.5 text-[12.5px] text-on-surface-variant">{"Sai khoá API · 3 lần lỗi" if bad else f"{ok} · p50 {p50}"}</p></div>
  {spark(sp, "var(--md-error)" if bad else color, 96, 34)}
  <span class="w-[180px] text-right">{status}</span>{toggle(not bad, "p-" + letter)}
</div>""", "p-4" + (" opacity-90" if bad else ""))
    flow = f"""<div class="flex items-center gap-3">
  <span class="flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-white px-3.5 text-[13.5px] soft">{gi("material-symbols:auto-awesome-outline-rounded", 16, "text-primary")}Agent gọi</span>
  {gi("arrow-forward-rounded", 18, "text-outline")}
  <span class="flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-3.5 text-[13.5px] font-medium text-on-primary">{gi("swap-horiz-rounded", 18)}Proxy</span>
  {gi("arrow-forward-rounded", 18, "text-outline")}
  <span class="flex -space-x-2">{"".join(ptile(n, 34) for n in ["LLM upstream", "Anthropic", "OpenRouter"])}</span>
  <span class="whitespace-nowrap text-[13px] text-on-surface-variant">các provider có model</span></div>"""
    rot = card(f"""<div class="flex items-start gap-6"><div class="min-w-0 flex-1">
  <h2 class="tight text-[16px] font-semibold">Xoay vòng</h2>
  <div class="mt-3">{segmented([("balance-rounded", "Theo trọng số"), ("autorenew-rounded", "Đều nhau"), ("low-priority-rounded", "Dự phòng theo thứ tự")], 0, "rot")}</div>
  <div class="mt-4">{flow}</div></div>
  <div class="grid w-[440px] grid-cols-2 gap-3">
    <div class="rounded-[14px] bg-surface-container-low p-3.5"><p class="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">{gi("replay-rounded", 15)}Lỗi thì chuyển provider</p><p class="tnum tight mt-1 text-[20px] font-semibold">2 <span class="text-[13px] font-normal text-on-surface-variant">lần</span></p></div>
    <div class="rounded-[14px] bg-surface-container-low p-3.5"><p class="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">{gi("pause-circle-outline-rounded", 15)}Ngưng provider lỗi</p><p class="tnum tight mt-1 text-[20px] font-semibold">5 <span class="text-[13px] font-normal text-on-surface-variant">phút</span></p></div>
    <div class="rounded-[14px] bg-surface-container-low p-3.5"><p class="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">{gi("timer-outline", 15)}Chờ tối đa mỗi lần</p><p class="tnum tight mt-1 text-[20px] font-semibold">30 <span class="text-[13px] font-normal text-on-surface-variant">giây</span></p></div>
    <div class="rounded-[14px] bg-surface-container-low p-3.5"><p class="flex items-center gap-1.5 text-[12.5px] text-on-surface-variant">{gi("check-circle-outline-rounded", 15)}Thành công 24 giờ</p><p class="tnum tight mt-1 text-[20px] font-semibold">99,8%</p></div>
  </div></div>""")
    body = f"""{rot}
<div class="mb-3 mt-5 flex items-center gap-2 px-1"><p class="text-[14px] font-semibold">Provider</p><span class="text-[13px] text-on-surface-variant">Kéo để đổi thứ tự dự phòng</span></div>
<div class="space-y-3">{cards}</div>"""
    return page("providers", "Providers", "cloud-outline",
                [("cloud-outline", "4 provider · 3 đang chạy"), ("swap-horiz-rounded", "Xoay vòng theo trọng số"), ("check-circle-outline-rounded", "99,8% thành công")],
                body, btn("Thêm provider", "add-rounded", "primary", "add-provider"))


# --- Models ---

def models():
    kinds = segmented([("apps-rounded", "Tất cả · 6"), ("chat-outline-rounded", "Chat · 4"), ("hub-outline-rounded", "Embedding · 2")], 0, "kind")
    caps = "".join(f'<a id="tf-{i}" href="#tf-{i}" class="flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] hair bg-white text-on-surface-variant">'
                   f'{gi(TAGS[t][0], 15)}{t}<span class="tnum text-[12px] opacity-70">{n}</span></a>'
                   for i, (t, n) in enumerate([("Vision", 3), ("Dùng tool", 4), ("Ngữ cảnh dài", 3), ("Suy luận", 2), ("Đầu ra có cấu trúc", 4), ("Đa ngôn ngữ", 2)]))
    chips = kinds + '<span class="mx-1 h-6 w-px bg-outline-variant/60"></span>' + caps + f'<span class="flex-1"></span><div class="flex h-10 w-[240px] items-center gap-2 rounded-full border hair bg-white px-4 text-[14px] text-on-surface-variant">{gi("search-rounded", 18)}Tìm model</div>'
    rows = ""
    for name, fam, tags, provs, price, ctx, agents in MODELS:
        vec = "Embedding" in tags
        rows += f"""<div class="hov flex items-center gap-5 border-t hair px-5 py-3.5 first:border-t-0">
  <span class="flex w-[230px] items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-[12px] {"bg-surface-container text-on-surface-variant" if vec else "bg-primary/[.08] text-primary"}">{gi("hub-outline-rounded" if vec else "neurology-outline-rounded", 20)}</span>
    <span class="leading-tight"><span class="block text-[15px] font-semibold">{name}</span><span class="block text-[12.5px] text-on-surface-variant">{fam} · <span class="tnum">{ctx}</span> ngữ cảnh</span></span></span>
  <span class="flex w-[330px] flex-wrap gap-1.5">{"".join(mtag(t, True) for t in tags)}<a id="tag-{name[:6]}" href="#tag" class="hov inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-outline-variant text-on-surface-variant">{gi("add-rounded", 14)}</a></span>
  <span class="flex w-[120px] items-center"><span class="flex -space-x-1.5">{"".join(ptile(p, 26) for p in provs)}</span></span>
  <span class="tnum w-[100px] text-[13.5px]">{price}</span>
  <span class="flex min-w-0 flex-1 flex-wrap gap-1.5">{"".join(f'<span class="inline-flex h-6 items-center gap-1.5 rounded-full border hair bg-white px-2 text-[12px]"><span class="h-2 w-2 rounded-full" style="background:{MC[a]}"></span>{a}</span>' for a in agents) or '<span class="text-[13px] text-on-surface-variant">Chưa dùng</span>'}</span>
</div>"""
    head = ('<div class="flex items-center gap-5 border-b hair bg-surface-container-low/60 px-5 py-3 text-[13px] text-on-surface-variant">'
            '<span class="w-[230px]">Model</span><span class="w-[330px]">Tag</span><span class="w-[120px]">Provider</span><span class="w-[100px]">Giá 1M token</span><span class="flex-1">Agent đang dùng</span></div>')
    body = f"""<div class="mb-4 flex flex-wrap items-center gap-2">{chips}</div>
{card(head + rows, "overflow-hidden p-0")}"""
    return page("models", "Models", "neurology-outline-rounded",
                [("sync-rounded", "Đồng bộ từ 3 provider · 10:02"), ("neurology-outline-rounded", "6 model"), ("sell-outline-rounded", "2 loại · 6 khả năng")],
                body, btn("Quản lý tag", "sell-outline-rounded", aid="tags"))


# --- Agents ---

def agents():
    cards = ""
    for name, ic, purpose, tags, model, calls, spend, sp in AGENTS:
        color = MC[name]
        cards += card(f"""<div class="flex items-start gap-3">
  <span class="flex h-12 w-12 items-center justify-center rounded-[16px] text-white" style="background:{color}">{gi(ic, 24)}</span>
  <div class="min-w-0 flex-1 leading-tight"><p class="text-[16.5px] font-semibold">{name}</p><p class="mt-1 text-[13px] leading-[19px] text-on-surface-variant">{purpose}</p></div>
  {toggle(True, "a-" + name[:4])}</div>
<div class="mt-4 flex flex-wrap items-center gap-1.5">{"".join(mtag(t, True) for t in tags)}</div>
<div class="mt-4 flex items-center gap-2.5 rounded-[14px] bg-surface-container-low px-3 py-2.5">{gi("neurology-outline-rounded", 18, "text-primary")}<span class="flex-1 text-[14px] font-medium">{model}</span>{gi("chevron-right-rounded", 18, "text-on-surface-variant")}</div>
<div class="mt-4 flex items-end justify-between"><div class="flex gap-6"><div><p class="tnum tight text-[18px] font-semibold">{calls}</p><p class="text-[12px] text-on-surface-variant">lượt · 7 ngày</p></div>
  <div><p class="tnum tight text-[18px] font-semibold">{spend}</p><p class="text-[12px] text-on-surface-variant">tháng này</p></div></div>{spark(sp, color, 110, 34)}</div>""", "p-5")
    new = (f'<a id="new-agent" href="#new-agent" class="flex flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed border-outline-variant/70 text-on-surface-variant hover:border-primary/40">'
           f'<span class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/[.08] text-primary">{gi("add-rounded", 26)}</span><span class="text-[15px] font-medium">Tạo agent</span></a>')
    body = f'<div class="grid grid-cols-3 gap-4">{cards}{new}</div>'
    return page("agents", "Agents", "material-symbols:auto-awesome-outline-rounded",
                [("material-symbols:auto-awesome-outline-rounded", "5 agents đang chạy"), ("payments-outline-rounded", "$142,30 tháng này")],
                body, btn("Tạo agent", "add-rounded", "primary", "create-agent"), art=True)


# --- One agent ---

def agent():
    need = ["Chat", "Dùng tool", "Ngữ cảnh dài"]
    fit = [m for m in MODELS if all(t in m[2] for t in need)]
    hidden = len(MODELS) - len(fit)
    opts = "".join(f"""<a id="opt-{i}" href="#opt-{i}" class="{"bg-primary/[.06]" if m[0] == "Claude Sonnet 5.5" else "hov"} flex items-center gap-3 rounded-[12px] px-3 py-2.5">
  <span class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/[.08] text-primary">{gi("neurology-outline-rounded", 18)}</span>
  <span class="min-w-0 flex-1 leading-tight"><span class="flex items-center gap-2"><span class="text-[14.5px] font-semibold">{m[0]}</span><span class="tnum text-[12px] text-on-surface-variant">{m[4]}</span></span>
    <span class="mt-1 flex flex-wrap gap-1">{"".join(mtag(t, True) for t in m[2])}</span></span>
  <span class="flex -space-x-1.5">{"".join(ptile(p, 22) for p in m[3])}</span>
  <span class="w-5">{gi("check-rounded", 18, "text-primary") if m[0] == "Claude Sonnet 5.5" else ""}</span></a>""" for i, m in enumerate(fit))
    picker = f"""<div class="relative">
  <a id="model-select" href="#model-select" class="flex h-12 items-center gap-3 rounded-[14px] border-2 border-primary/50 bg-white px-3.5 ring-4 ring-primary/10">
    {gi("neurology-outline-rounded", 20, "text-primary")}<span class="flex-1 text-[15px] font-semibold">Claude Sonnet 5.5</span>
    <span class="flex -space-x-1.5">{"".join(ptile(p, 22) for p in MODELS[1][3])}</span>{gi("expand-less-rounded", 20, "text-on-surface-variant")}</a>
  <div class="absolute left-0 right-0 top-[56px] z-20 rounded-[18px] border hair bg-white p-2 shadow-[0_16px_40px_rgba(16,24,22,.16)]">
    <div class="flex h-10 items-center gap-2 rounded-[12px] bg-surface-container-low px-3 text-[14px]">{gi("search-rounded", 18, "text-on-surface-variant")}<span class="text-on-surface-variant">Tìm model</span></div>
    <div class="flex flex-wrap items-center gap-1 px-2.5 pb-2 pt-2.5 text-[12.5px] text-on-surface-variant">{gi("filter-alt-outline", 15)}Có đủ {" ".join(mtag(t, True) for t in need)}</div>
    {opts}
    <div class="mt-1 flex items-center gap-2 border-t hair px-3 pb-1 pt-2.5 text-[13px] text-on-surface-variant">{gi("visibility-off-outline", 15)}Ẩn {hidden} model thiếu tag<span class="flex-1"></span><a id="show-all" href="#show-all" class="font-medium text-primary">Hiện</a></div>
  </div></div>"""
    lines = ["Bạn là trợ lý của nhân viên ShopNexus, đang hỗ trợ {{tên}}.", "Đọc qua tools chỉ đọc rồi đề xuất; nhân viên là người làm.",
             "Trả lời ngắn, tiếng Việt, nêu nguồn đã đọc.", "ShopNexus không giữ tiền: chỉ có COD đồng kiểm."]
    code = "".join(f'<div class="flex gap-4"><span class="tnum w-4 shrink-0 text-right text-on-surface-variant/60">{i + 1}</span><span>{escape(l).replace("{{tên}}", "<span class=\'rounded-[6px] bg-primary/10 px-1.5 text-primary\'>tên nhân viên</span>")}</span></div>'
                   for i, l in enumerate(lines))
    tools = "".join(f'<div class="flex items-center gap-2.5 py-1.5"><span class="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary/[.08] text-primary">{gi(ic, 15)}</span><span class="flex-1 text-[14px]">{t}</span>{toggle(on, "tl-" + str(i))}</div>'
                    for i, (ic, t, on) in enumerate([("support-agent-outline", "Ticket", True), ("person-outline-rounded", "Tài khoản", True), ("history-rounded", "Lịch sử xử lý", True),
                                                     ("package-2-outline", "Đơn hàng", True), ("storefront-outline-rounded", "Tin đăng", True)]))
    limits = "".join(f'<div class="rounded-[14px] bg-surface-container-low p-3"><p class="text-[12px] text-on-surface-variant">{k}</p><p class="tnum tight mt-0.5 text-[18px] font-semibold">{v} <span class="text-[12.5px] font-normal text-on-surface-variant">{u}</span></p></div>'
                     for k, v, u in [("Mỗi câu", "60", "giây"), ("Độ dài", "4.096", "token"), ("Nhớ", "20", "lượt"), ("Ngân sách", "$250", "/tháng")])
    purpose = card(f"""<div class="grid grid-cols-[1fr_1fr] gap-4">
  <div><p class="mb-1.5 text-[13px] text-on-surface-variant">Tên</p><p class="flex h-11 items-center rounded-[12px] border hair bg-white px-3.5 text-[15px] font-medium">Trợ lý console</p></div>
  <div><p class="mb-1.5 text-[13px] text-on-surface-variant">Dùng ở</p><p class="flex h-11 items-center gap-2 rounded-[12px] border hair bg-white px-3.5 text-[14px]">{gi("desktop-windows-outline-rounded", 17, "text-on-surface-variant")}Console · trang Agent, Hỗ trợ, Báo cáo</p></div></div>
<p class="mb-1.5 mt-4 text-[13px] text-on-surface-variant">Model cần có</p>
<div class="flex flex-wrap items-center gap-1.5">{"".join(mtag(t) for t in need)}<a id="add-need" href="#add-need" class="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-outline-variant px-2.5 text-[12.5px] text-on-surface-variant">{gi("add-rounded", 14)}Tag</a></div>
<p class="mb-1.5 mt-4 text-[13px] text-on-surface-variant">Model</p>{picker}""")
    body = f"""<div class="grid grid-cols-[1fr_360px] gap-4">
  <div class="space-y-4">{purpose}
    {card(card_head("Hướng dẫn", btn("Bản 4 · 3 bản trước", "history-rounded", "ghost", "versions")) + f'<div class="space-y-1.5 rounded-[14px] border hair bg-surface-container-low/50 p-4 text-[14px] leading-[22px]">{code}</div>')}</div>
  <div class="space-y-4">{card(card_head("Tools", tag(gi("lock-outline", 13) + "Chỉ đọc")) + tools, "p-5 pb-3")}
    {card(card_head("Giới hạn") + f'<div class="grid grid-cols-2 gap-2.5">{limits}</div>')}</div>
</div>"""
    crumbs = f'<a id="back-agents" href="#cfg-agents" class="hov flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] text-on-surface-variant">{gi("arrow-back-rounded", 17)}Agents</a>'
    return page("agents", "Trợ lý console", "material-symbols:auto-awesome-outline-rounded",
                [("neurology-outline-rounded", "Claude Sonnet 5.5"), ("forum-outline-rounded", "1.284 lượt · 7 ngày"), ("payments-outline-rounded", "$128,40 / $250")],
                body, crumbs + btn("Thử trong cuộc mới", "material-symbols:auto-awesome-outline-rounded", aid="try") + btn("Lưu", "check-rounded", "primary", "save"))


# --- One provider ---

def provider():
    name = "Anthropic"
    added = [(m[0], m[2], ident, m[4]) for m, ident in zip([MODELS[0], MODELS[1], MODELS[2], MODELS[3]],
                                                             ["claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-haiku-5-5"])]
    rows = "".join(f"""<div class="hov flex items-center gap-4 border-t hair px-5 py-3 first:border-t-0">
  <span class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/[.08] text-primary">{gi("neurology-outline-rounded", 18)}</span>
  <span class="w-[200px] leading-tight"><span class="block text-[15px] font-semibold">{n}</span><span class="block text-[12.5px] text-on-surface-variant">{ident}</span></span>
  <span class="flex min-w-0 flex-1 flex-wrap gap-1">{"".join(mtag(t, True) for t in tags)}</span>
  <span class="tnum w-[90px] text-[13.5px]">{price}</span>
  <a id="rm-{i}" href="#rm-{i}" title="Bỏ khỏi {name}" class="hov flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-error">{gi("close-rounded", 18)}</a></div>"""
                   for i, (n, tags, ident, price) in enumerate(added))
    avail = [("Claude Opus 5", "claude-opus-5", ["Chat", "Vision", "Dùng tool", "Suy luận"]), ("Claude Sonnet 5", "claude-sonnet-5", ["Chat", "Vision", "Dùng tool"]),
             ("Claude Haiku 5", "claude-haiku-5", ["Chat", "Vision", "Dùng tool"])]
    opts = "".join(f"""<a id="add-{i}" href="#add-{i}" class="hov flex items-center gap-3 rounded-[12px] px-3 py-2">
  <span class="min-w-0 flex-1 leading-tight"><span class="block text-[14px] font-medium">{n}</span><span class="mt-1 flex flex-wrap gap-1">{"".join(mtag(t, True) for t in tags)}</span></span>
  <span class="flex h-8 items-center gap-1 rounded-full border hair px-3 text-[13px] font-medium text-primary">{gi("add-rounded", 15)}Thêm</span></a>""" for i, (n, ident, tags) in enumerate(avail))
    adder = f"""<div class="relative mt-3">
  <a id="add-model" href="#add-model" class="flex h-11 items-center gap-2 rounded-[14px] border-2 border-dashed border-primary/40 bg-primary/[.03] px-4 text-[14px] font-medium text-primary">{gi("add-rounded", 18)}Thêm model</a>
  <div class="absolute left-0 top-[52px] z-20 w-[460px] rounded-[18px] border hair bg-white p-2 shadow-[0_16px_40px_rgba(16,24,22,.16)]">
    <div class="flex h-10 items-center gap-2 rounded-[12px] bg-surface-container-low px-3 text-[14px] text-on-surface-variant">{gi("search-rounded", 18)}Tìm trong 7 model của {name}</div>
    <p class="px-3 pb-1 pt-2.5 text-[12px] text-on-surface-variant">Chưa thêm · 3</p>{opts}</div></div>"""
    conn = card(card_head("Kết nối") + f"""<div class="space-y-3">
  <div><p class="mb-1.5 text-[13px] text-on-surface-variant">Loại</p><p class="flex h-11 items-center gap-2 rounded-[12px] border hair bg-white px-3.5 text-[14px]">{ptile(name, 22)}Anthropic API</p></div>
  <div><p class="mb-1.5 text-[13px] text-on-surface-variant">Địa chỉ</p><p class="flex h-11 items-center rounded-[12px] border hair bg-white px-3.5 text-[14px]">https://api.anthropic.com</p></div>
  <div><p class="mb-1.5 text-[13px] text-on-surface-variant">Khoá API</p><p class="flex h-11 items-center gap-2 rounded-[12px] border hair bg-white px-3.5 text-[14px]"><span class="tnum flex-1">sk-ant-••••••••91cd</span><a id="key-change" href="#key-change" class="font-medium text-primary">Đổi</a></p></div>
  <div class="grid grid-cols-2 gap-3"><div><p class="mb-1.5 text-[13px] text-on-surface-variant">Trọng số</p><p class="flex h-11 items-center rounded-[12px] border hair bg-white px-3.5 text-[14px]"><span class="tnum flex-1">30</span>%</p></div>
    <div><p class="mb-1.5 text-[13px] text-on-surface-variant">Thứ tự dự phòng</p><p class="flex h-11 items-center rounded-[12px] border hair bg-white px-3.5 text-[14px]"><span class="tnum flex-1">2</span></p></div></div>
</div>
<div class="mt-4 flex items-center gap-2 rounded-[14px] bg-primary/[.06] px-3.5 py-3 text-[13.5px] text-primary">{gi("check-circle-outline-rounded", 18)}<span class="flex-1">Kết nối được · 7 model · 320 ms</span><a id="test" href="#test" class="font-medium">Thử lại</a></div>""")
    body = f"""<div class="grid grid-cols-[380px_1fr] gap-4">
  {conn}
  <div><div class="mb-3 flex items-center gap-3 px-1"><p class="text-[14px] font-semibold">Model của {name}</p>{tag("4/7", "bg-surface-container text-on-surface-variant")}<span class="flex-1"></span>
      {segmented([("checklist-rounded", "Chọn từng model"), ("sync-rounded", "Dùng tất cả, tự cập nhật")], 0, "pmode")}</div>
    {card(rows, "overflow-hidden p-0")}{adder}</div>
</div>"""
    crumbs = f'<a id="back-providers" href="#cfg-providers" class="hov flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] text-on-surface-variant">{gi("arrow-back-rounded", 17)}Providers</a>'
    return page("providers", name, "cloud-outline",
                [("swap-horiz-rounded", "33% lượt · 24 giờ"), ("check-circle-outline-rounded", "99,7% thành công"), ("bolt-outline-rounded", "p50 1,3 s")],
                body, crumbs + btn("Lưu", "check-rounded", "primary", "save"))


SCREENS = {"soft-cfg-providers": ("Cấu hình · Providers", providers), "soft-cfg-provider": ("Cấu hình · Provider · Anthropic", provider), "soft-cfg-models": ("Cấu hình · Models", models),
           "soft-cfg-agents": ("Cấu hình · Agents", agents), "soft-cfg-agent": ("Cấu hình · Agent · Trợ lý console", agent)}

if __name__ == "__main__":
    for name in sys.argv[1:] or SCREENS:
        (OUT / f"{name}.html").write_text(SCREENS[name][1]())
        print("wrote", name)
