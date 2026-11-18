# Console design

The console at `console.<domain>`. People at ShopNexus handle reported
banned goods and fakes, organised fraud and lawful requests from the
authorities, answer support tickets, and ask the agent about records. It is
a desk tool used for hours at a time on a large screen. It calls
`/v1/console/*` on the API with the `console_session` cookie.

## Source

`.superdesign/design-system.md` is the console's design system and the
mockups in `.superdesign/mockups/` are the approved screens. Colour roles
and the motion springs come from the Android app's
`app/.superdesign/design-system.md`. `src/styles/tokens.css` turns the
tokens into Tailwind utilities; Tailwind's own colours, type steps, radii,
shadows and breakpoints are off.

## Tokens

- **Colour.** The app's M3 roles. `primary` is the one main action per
  view; `error` marks an action that takes a right away from someone;
  `tertiary` appears only for a listing's price. The page is
  `surface-container`; the work area is one `surface-container-lowest` card.
- **Type.** Be Vietnam Pro for all text. Ids, codes, keys and version tags
  stay in Be Vietnam Pro with `tabular-nums`. Text keeps the face's own
  spacing, because negative tracking closes its narrow word spaces; titles run
  at −0.015em. Times and counts use `tabular-nums` too. The utilities
  keep the M3 role names: `text-body-large` 16 px for chat and inputs,
  `text-body-medium` 15 px for rows, `text-body-small` 13 px for secondary
  lines, `text-label-*` 15, 14 and 13 px, `text-title-*` 17, 16 and 15 px
  semibold, `text-headline-medium` 22 px for sign-in titles,
  `text-display-medium` 32 px for figures.
- **Borders and depth.** `border-hairline` is `outline-variant` mixed 70 %
  with the card colour. Depth is `shadow-lift`, a 1 px ring with a 1 to 2 px
  shadow; menus and dialogs take `shadow-float`, a soft 12/32 px shadow.
- **Corners.** `rounded-xs` 5 px for keys and version tags, `sm` 6 px for
  controls, chips and nav rows, `md` 8 px for tiles and record avatars,
  `lg` 10 px for blocks and notices, `xl` 12 px for cards, the work card and
  the ask box, `2xl` 14 px for the sign-in card and chat bubbles.
- **Controls.** Buttons and nav rows are 32 px high. The primary action is
  filled `primary`; the agent's send and "Cuộc mới" are filled `on-surface`.
  Hover is a `surface-container-low` fill.
- **Icons.** Material Symbols Light (`~icons/material-symbols-light/…`);
  the agent's sparkle is Material Symbols Rounded, which the light set lacks.

## Shell

A 232 px nav on the page colour: the mark and "ShopNexus Console", account
search on `/`, then Trang chủ, Hỗ trợ with the count of open tickets, Báo
cáo (greyed "Sắp có" until report cases ship), Agent and Tài khoản
("Sắp có"). Nhật ký thao tác and Nhân viên join for admins once they have
pages. Công cụ lists the ops dashboards with ↗, or a lock below the
member's role. The member sits at the bottom with the theme and sign-out
in a menu. `[` collapses the nav to a 64 px rail of icons; the browser keeps
that choice, and Hỗ trợ opens on the rail.

The work area is one white card with 12 px corners and `shadow-lift`. A
page with a title gets a 52 px header in the card; pages of panes (Hỗ trợ,
Agent) fill it and split it with hairlines.

## Agent

The agent reads and answers; the member acts. The page has a 264 px list
of the member's chats grouped by day (Hôm nay, Hôm qua, 7 ngày trước, Cũ
hơn) with an icon for the record each is about, and "Cuộc mới" (`N`). The
chat column is at most 680 px: the member's questions as bubbles (with who
asked and when in a record's shared chat), answers as plain text after the
sources as 24 px chips, and copy and ask-again under each answer. The ask
box holds the attached ticket or account as a chip; + attaches another,
which opens that record's shared chat. While an answer is on its way two
grey lines wait and send becomes stop (Esc). No screen says what the agent
is doing or can do.

## Records

- A record's initial is `Initial` in `components/ui.tsx`. It takes one of
  four tints picked from the record's id (`tintOf` in `lib/look.ts`), so an
  account has the same colour on every page. With `status`, a dot at the
  bottom end shows `primary` for active and `error` for suspended. A
  member's initial is filled `primary` (`member`).
- A picked row in any list takes `pickedRow(on)` from `lib/look.ts` and
  `PickedBar`: `primary` at 6 % with a 3 px `primary` bar at the start.
- A ticket's queue row shows the person's initial with the ticket's kind as
  an 18 px badge on it.
- The person at the top of a side column sits on a `band` (`band-error`
  when suspended) with a `dots` layer, both utilities in `tokens.css`.

## Báo cáo

- `/reports` and `/reports/:account_id`: the 320 px queue beside the case.
  Chờ xử lý lists open cases by their latest report, with the open count
  from the server's `total` in an `error` badge here and beside Báo cáo in
  the nav; Đã xử lý lists resolved cases, newest first.
- The case opens on a `band` with the account, its reasons as pills and
  the most reported listing. Tin bị báo lists every reported listing with
  its photo, price, status and report count; then each report with the
  reporter, the reason and the note.
- The decision bar is pinned to the bottom. The member ticks the listings
  to hide and Tạm khoá with a term; Tạm khoá adds the reason the person
  sees. The action button names what is ticked. It hides, then suspends,
  then marks the case actioned (`carryOut` in `lib/reports.ts`); Không vi
  phạm dismisses the case.
- A resolved case's bar lists what was done, the member and the time.
  Hoàn tác restores the hidden listings and the suspension, then reopens
  the case (`undoCase`).
- Hỏi agent opens the account's shared chat in Agent. The agent's evidence
  and proposal come with the agent's blocks.

## Tài khoản

- `/accounts` and `/accounts/:id`: the 340 px list beside the account.
  Tất cả lists every account newest first; Đang khoá lists the suspended
  ones whose term ends first, with their count from the server's `total`
  in an `error` badge. The search finds one account by id or phone number
  on Enter. On this page `/` and the nav's "Tìm tài khoản" focus that
  search; elsewhere a pick in the nav's popover opens the account here.
- The account opens on a `band`: the 72 px initial, the name, the status,
  the id with a copy button, chips for a verified phone and earlier
  suspensions, Hỏi agent (the account's shared chat in Agent) and Tạm khoá
  or Mở khoá. A suspended account adds a card with the end, the days left,
  a bar for the time served and who suspended it for how long.
- Lịch sử is the console's suspensions and their ends as a timeline that
  ends on the account's creation. Thông tin and Định danh sit in a 272 px
  column beside it.
- Tạm khoá opens a popover: 1 ngày, 7 ngày, 30 ngày or Không hạn, each with
  its end date, then the reason (up to 500 characters) that the person
  sees, and "Tạm khoá 7 ngày" in `error`.

## Motion

The utilities are in `src/styles/tokens.css`, on the app's springs. Each
entrance takes 160 to 240 ms and starts at once, and every control works
while it runs.

- A route change from the nav is a view transition: the white pill slides
  to the new row (`vt-pill`), the work card's old page fades out in 90 ms
  and the new one rises in (`vt-work`).
- A list takes `rise-list`: its rows rise 6 px into place 18 ms apart, and
  rows past the tenth come with the tenth. Rows animate only when they
  mount, so a refetch leaves the list still.
- The detail beside a list takes `animate-pane` and is keyed by the
  record's id, so `j`/`k` slides each record in from 10 px.
- Menus and popovers take `animate-pop` from their anchor corner. The
  picked segment takes `animate-thumb` through `segment(on)` in
  `lib/look.ts`, the picked row's bar `animate-bar`, a count badge
  `animate-badge` keyed by its number, and a suspension's bar
  `animate-grow`.
- A press sinks a button or link to 98 % and its fill eases in 138 ms.
- A theme change opens as a circle from the pressed segment.
- The agent's waiting lines shimmer; an answer rises in when it arrives.
- On sign-in the mascot floats and the shapes turn slowly; each step slides
  in.
- With reduced motion every animation and transition takes 1 ms.

## Density and keyboard

Pages are lists of records: 32 to 40 px rows, `hairline` dividers, opaque
ids in `tabular-nums`, a reason that does not fit cut short with the full text
as the row's title. Detail opens beside the list. Lists move with `j`/`k`,
open with Enter and close with Escape; every control has a visible 2 px
`primary` focus ring.

## Deal model and copy

ShopNexus holds no money: the only deal path is cash on delivery with
inspection at the door. No screen offers escrow, a wallet or a refund.
Copy is Vietnamese with correct diacritics, short, and states facts: a
title names the thing, a refusal states the fact ("Cần quyền Quản trị
viên").

## Sign-in

Email, password, then the TOTP code, with enrolment on the first sign-in.
A refused sign-in says only that it was refused; the session lasts eight
hours and expiry returns the member to sign-in with the page they were on
kept in the URL.

## Theme

Light, dark from the system, and an override through `data-theme` on
`<html>`.
