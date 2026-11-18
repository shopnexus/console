# ShopNexus Console design system

The console at `console.<domain>`. People at ShopNexus handle reported
banned goods and fakes, organised fraud, and lawful requests from the
authorities, answer support tickets, and manage console members. It is a desk tool used for hours on a
large screen. Members are moderators ("Kiểm duyệt viên") or admins ("Quản trị
viên").

The colour roles come from the Android app's system,
`app/.superdesign/design-system.md`. The look is the console's own: Geist
since 2026-11-16, with the larger type and the Records rules below since
2026-11-17 (earlier versions stay on the canvas). `tools/build_geist.py`
holds the shared pieces for the mockups: the nav, `avatar` with its tints,
`figure`, `chip`, `side_record`, `picked`, and `bigger()` for the type scale.

## Tokens

- Colour: the app's M3 roles (seed #066A61, tertiary from #924628).
  `primary` is the one main action per view; `error` marks actions that take
  a right away from someone; `tertiary` appears only for a listing's price.
  The page is `surfaceContainer`; the work area is one `surfaceContainerLowest`
  card with 12 px corners and a hairline ring.
- Type: Be Vietnam Pro since 2026-11-18 (Geist before), for all text, ids,
  codes, keys and version tags included, with tabular figures for them and
  for times and counts. No monospace face. Text keeps the face's own letter
  spacing, since negative tracking closes its narrow word spaces; titles
  −0.015em. Body 15–16 px, secondary
  lines 13 px, page and card titles 16–17 px semibold, sign-in titles 22 px,
  figures on tiles 32 px.
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
  the theme switch at the top end, the host at the bottom. No app
  shell.
- Steps: password, code; the first sign-in adds a new password and TOTP
  enrolment, shown as a two-step indicator. The member's email stays visible
  as a row with "Đổi" once typed.
- The TOTP code is six 44 × 48 boxes with tabular figures, in two groups of three.
  Enrolment shows the QR and the key with a copy button side by side.
- Refusals say only that the sign-in was refused, with no detail about which
  part was wrong; a lock says when to try again.
- The dashboard handoff is a centred card on the same dotted surface with the
  console mark, a moving path and the dashboard's icon, its name and its
  host. A refusal for role adds "Cần quyền Quản trị viên".

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
- Blocks are 12 px cards with a header (icon, title, `v1` with tabular figures), a body
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
- Run steps since 2026-11-18 (the owner asked for them; before, no narration): a running turn shows a run card with the elapsed time and live counts, a timeline of steps with a one-line summary each, tool calls as chips that open to their input and result, a sub-agent's own steps, and a Steer box. A finished turn folds this into "Worked for 42 s · steps · tool calls · sources" with the reasoning summary, and a footer chip opens the turn details (model, provider, tokens, cost, time). `tools/build_soft_trace.py`.

## Hỗ trợ

- Every ticket is its own chat between a person and ShopNexus. Members
  answer in it as ShopNexus; the person sees only "ShopNexus", and the
  member's name shows here under each reply ("Lan · 09:05") and in the
  audit log.
- Three panes in the work card: the 320 px queue (Đang mở and Đã xử lý as a
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

Direction B since 2026-11-17 (`tools/build_geist_reports_b.py`); the
agent-chat drafts stay on the canvas. Reports are grouped by the reported
account into cases, and a case reads as a file with the decision first.

- The 320 px queue: Chờ xử lý (its count in an `error` badge) and Đã xử
  lý; rows with the case's initial and report count, the listing, the
  reasons as dots and the age, red past 24 hours. A resolved row shows who
  and when, and the outcome.
- The case: a hero band with the account, its reasons as pills with their
  counts, and the most reported listing beside it; the evidence as a 2 × 2
  grid of cards that show their proof once the agent finds it; then the
  people who reported, with their notes.
- A decision bar is pinned to the bottom: a tick per listing to hide,
  Tạm khoá with its term, the reason the person sees, Không vi phạm, and the
  action in `error` named by what is ticked ("Ẩn tin và khoá 7 ngày"). When
  the agent proposes, the ticks start from its proposal and the bar carries
  its version.
- A resolved case's bar lists what was done, who and when, and Hoàn tác.
- The agent's chat opens as a 400 px drawer on the end side and folds the
  queue to a strip of initials.

## Records

Since 2026-11-17 the pages carry more depth than lists of facts. The rules
hold on every page: Trang chủ, Hỗ trợ, Báo cáo, Agent and Tài khoản.

- Initials: a record's initial takes one of four tints from the brand roles
  (`primary` at 10 %, `secondaryContainer`, `tertiaryFixed`,
  `inversePrimary` at 40 %), picked from its id, so it keeps its colour on
  every screen. A dot at the bottom end gives the status: `primary` active,
  `error` suspended. Members' initials are filled `primary`.
- Lists and queues: 34–36 px initials, the date at the end of the first
  line. The picked row is `primary` at 6 % with a 3 px `primary` bar at the
  start, in every list (queues, Việc tiếp theo, the agent's chats). A report
  case's initial carries its report count as a badge, `error` from three. A
  row in Việc tiếp theo carries its kind as a small badge on the initial.
- Side columns open on the person as a small hero band (`side_record`): the
  44 px initial with its status dot, name, id, chips and three figures.
- Trang chủ's tiles are figure cards with the last 12 days as bars.
- A record opens on a hero band: two soft radial washes (`primary` and
  `tertiaryFixed`, or `error` and `errorContainer` for a suspended account)
  under a dotted grid that fades down. The band holds the 72 px initial, the
  name with a status pill, the id with a copy button, a row of chips, and
  the actions at the end. The header above it is a breadcrumb with up and
  down for `k` and `j`.
- Figures are cards: a 28 px tinted icon tile, the label, the number at
  28 px and 12 bars for the last 90 days. A figure that counts against the
  person is in `error`.
- Lịch sử is a timeline: a 28 px badge per kind (`errorContainer` lock for a
  suspension, `primary` lock-open for its end, neutral for the account's
  creation), the member's initial, what was done, the time, and the reason
  as a quote with a coloured start border.
- Popovers: 14 px corners, a tinted icon tile beside the title, choices as
  small cards that carry their result (a term with its end date), and the
  actions on a `surfaceContainerLow` footer.

## Tài khoản

- Two panes in the work card: the 340 px list and the account beside it.
  The list has Tất cả (newest first) and Đang khoá (the term that ends first
  first, with the days left, its count in an `error` badge) as a segmented
  control, and the search by id or phone number. On this page `/` and the
  nav's "Tìm tài khoản" focus that search; elsewhere `/` opens the nav's
  popover.
- The account: the hero band with the chips (seller or buyer, verified
  phone, earlier suspensions), four figures (orders bought, orders sold,
  the refusal rate, reports), Lịch sử beside a 272 px column with Thông
  tin and Định danh (the phone and the email, each with its verified mark).
- Actions: Hỏi agent (opens Agent with the account attached) and Tạm khoá
  in an `error` outline. Tạm khoá opens a popover: the terms 1 ngày, 7 ngày,
  30 ngày and Không hạn as cards with their end dates, the reason with
  "<name> thấy lý do này" and a count to 280, then Huỷ and "Tạm khoá 7 ngày"
  filled `error`.
- A suspended account: the `error` band, then a card with the end, the days
  left in `error`, a bar for the time served, the start and who suspended
  it for how long. Mở khoá is the filled `primary` action.

## Copy

Minimal, as in the app: few elements per block, and icons and layout in
place of explanatory copy. Before a line of text goes in, it must say
something the icon, the position or the number cannot. No taglines, no
headlines that explain or reassure, no notes that describe what the screen
already shows: a screen title names the thing ("Đăng nhập", "Grafana"), and a
refusal states the fact ("Cần quyền Quản trị viên").

English since 2026-11-18 (Vietnamese before): every label, title and message on the console is in English; people's and shops' names keep their diacritics. Roles: "Moderator", "Admin". The soft mockups get their copy from `tools/en.py`.
Dashboards: Grafana, Restate, LiteLLM, RustFS, Argo CD. No marketing tone: the
reader is at work.
