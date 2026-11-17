# ShopNexus Console design system

The console at `console.<domain>`. People at ShopNexus handle reported
banned goods and fakes, organised fraud, and lawful requests from the
authorities, answer support tickets, and manage console members. It is a desk tool used for hours on a
large screen. Members are moderators ("Kiểm duyệt viên") or admins ("Quản trị
viên").

The colour roles come from the Android app's system,
`app/.superdesign/design-system.md`. The look is the console's own: Geist
since 2026-11-16, replacing the M3 look the earlier drafts used (their
versions stay on the canvas). `console/DESIGN.md` and `src/styles/tokens.css`
still describe the M3 look and change when the Geist screens are built.
`tools/build_geist.py` holds the Geist pieces for the mockups.

## Tokens

- Colour: the app's M3 roles (seed #066A61, tertiary from #924628).
  `primary` is the one main action per view; `error` marks actions that take
  a right away from someone; `tertiary` appears only for a listing's price.
  The page is `surfaceContainer`; the work area is one `surfaceContainerLowest`
  card with 12 px corners and a hairline ring.
- Type: Geist, Geist Mono for ids, codes, keys and version tags, tabular
  figures for times and counts. Letter spacing −0.012em, −0.022em on titles.
  Body 13–14 px, secondary lines 12 px, page and card titles 14–15 px
  semibold, sign-in titles 20 px, figures on tiles 28 px.
- Borders: hairlines in `outlineVariant` mixed 70 % with white. Depth is a
  1 px ring and a 1–2 px shadow (`lift`); a menu adds a soft 12/32 px shadow.
- Corners: 5–6 px for controls, chips and keys, 8 px for tiles and avatars of
  records, 10–12 px for cards and blocks, 14 px for the sign-in card.
- Controls: buttons 32 px high, 6 px corners; the primary action is filled
  `primary`, a submit on sign-in and the agent's send are `onSurface`.
  Checkboxes 16 px with 4 px corners. Inputs 40 px with a 3 px focus ring.
- Icons: Material Symbols Light; the agent's sparkle is Material Symbols
  Rounded, which the light set lacks.
- Motion: springs (spatial and effects); hover is a `surfaceContainerLow` fill.

## Shell

Desktop 1440 × 900. A 232 px nav on the page colour: the mark, "ShopNexus
Console", account search with `/`, then Trang chủ, Hỗ trợ and Báo cáo with
their counts, Agent, Tài khoản, and for admins Nhật ký thao tác and Nhân
viên. Công cụ lists the dashboards with ↗, or a lock for a moderator. The
member sits at the bottom. Each page's header is 52 px inside the work card.

## Sign-in and dashboard handoff

- One centred card on `surface` with a dotted grid, the mark at the top start,
  the theme switch at the top end, the host in mono at the bottom. No app
  shell.
- Steps: password, code; the first sign-in adds a new password and TOTP
  enrolment, shown as a two-step indicator. The member's email stays visible
  as a row with "Đổi" once typed.
- The TOTP code is six 44 × 48 boxes in Geist Mono, in two groups of three.
  Enrolment shows the QR and the key with a copy button side by side.
- Refusals say only that the sign-in was refused, with no detail about which
  part was wrong; a lock says when to try again.
- The dashboard handoff is a centred card on the same dotted surface with the
  console mark, a moving path and the dashboard's icon, its name and its
  host in monospace. A refusal for role adds "Cần quyền Quản trị viên".

## Trang chủ

Four tiles, then a list and a column. No greeting.

- Moderator: tiles for open tickets (with how many have a reply ready),
  reports waiting (with how many have a proposal), what the member handled
  today (how many followed a proposal, how many changed it) and suspended
  accounts. "Việc tiếp theo" lists tickets and reports newest first, each
  with what the agent has ready, or a quiet bar while it reads. The column
  holds the agent's background runs and the shortcuts.
- Admin: the same tiles with members to look at; the audit log, where an
  action taken from a proposal carries the sparkle; members to look at; and
  "Agent · 7 ngày": the share of proposals kept as proposed, changed or
  dropped, and how many ready replies were sent.

## The agent

The agent works for the member, never for a user. It reads through read-only
tools and proposes; the member acts. Most work happens in a chat with it.

- A record opens on the agent's chat: a ticket on its read and the reply it
  wrote, a report on its case read. Each answer starts with the sources it
  read as 24 px chips, then one or two plain sentences, then blocks.
- Blocks are 12 px cards with a header (icon, title, `v1` in mono), a body
  and a footer of actions on `surfaceContainerLow`:
  - evidence: an icon tile, the finding as title, the proof (photos with the
    match score, the price against the guide, a quoted message), "Mở ↗";
  - a proposal: a ticked checklist, one row per account or action with its
    term as a small select, the reason the suspended person sees, then the
    action in `error` and "Bỏ đề xuất" or "Không vi phạm". It carries a faint
    `error` ring;
  - a reply to a person: the text, "Gửi cho <name>" and "Sửa";
  - a graph of linked accounts on a dotted ground: nodes with initials,
    suspended ones ringed in `error`, edges drawn by kind (shared pickup
    address solid `primary`, reused photos dashed, deposit messages dotted).
    The chosen edge's proof shows under the graph and is attached to the ask
    box.
- The member ticks to decide quickly or writes to have the agent change a
  block. The agent answers with the next version: rows it changed carry
  "Đổi" or "Bỏ", and the earlier version folds to a struck-through line,
  "Bản 1 · đã thay".
- A block that was carried out turns neutral: what was done row by row, who
  and when ("Lan · 10:05"), "Nhật ký" and "Hoàn tác".
- While it answers, finished sources stay as chips, the one in progress
  spins, two grey lines wait for the text and send becomes Dừng. After 60 s:
  "Quá 60 giây, chưa có câu trả lời." with "Hỏi lại" and "Chạy nền, báo khi
  xong".
- The ask box holds the record it is about as a chip; + attaches a ticket, a
  report or an account from recent ones or by name or id.
- Agent in the nav is the member's own chats, grouped by day with the kind of
  record each is about; "Cuộc mới" (`N`) is filled `onSurface`.
- No narration: the screens never say what the agent is doing or can do.

## Hỗ trợ

- Every ticket is its own chat between a person and ShopNexus. Members
  answer in it as ShopNexus; the person sees only "ShopNexus", and the
  member's name shows here under each reply ("Lan · 09:05") and in the
  audit log.
- Three panes in the work card: the 300 px queue (Đang mở and Đã xử lý as a
  segmented control, a kind filter, rows with the person, the last line, the
  kind and "Soạn sẵn" when a reply is ready; `j` and `k` move), the agent's
  chat in the middle, and a 340 px column with two tabs.
- Chat khách is the person's chat, with a "Mới" divider and its own box for a
  reply written by hand. Thông tin holds the person (status, verified phone,
  since, orders, delivered, reports), the order (price, COD đồng kiểm, the
  carrier and code, the address, the carrier's events with the proof of
  delivery), the seller (rating, orders, any pattern the agent found) and the
  person's other tickets. Facts there put the label at the start and the
  value at the end.
- Closing a carrier request sends "Đã ghi nhận hãng <name>." in the chat,
  marked "Tự gửi khi đóng".

## Báo cáo

Reports are grouped by the reported account into cases. The queue's rows
carry the count of reports, the reasons and the agent's proposal. The middle
pane is the case's chat: the agent's case read (evidence, then the
proposal), then the member's questions. A 300 px column holds the account,
the people who reported with their notes, and the reported listing.

## Copy

Minimal, as in the app: few elements per block, and icons and layout in
place of explanatory copy. Before a line of text goes in, it must say
something the icon, the position or the number cannot. No taglines, no
headlines that explain or reassure, no notes that describe what the screen
already shows: a screen title names the thing ("Đăng nhập", "Grafana"), and a
refusal states the fact ("Cần quyền Quản trị viên").

Vietnamese with correct diacritics. Roles: "Kiểm duyệt viên", "Quản trị viên".
Dashboards: Grafana, Restate, LiteLLM, RustFS, Argo CD. No marketing tone: the
reader is at work.
