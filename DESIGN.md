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
- **Type.** Geist, and Geist Mono (`font-mono`) for ids, codes, keys and
  version tags. Text runs at −0.012em, titles at −0.022em; times and counts
  use `tabular-nums`. The utilities keep the M3 role names with Geist sizes:
  `text-body-large` 14 px for chat and inputs, `text-body-medium` 13 px for
  rows, `text-body-small` 12 px for secondary lines, `text-label-*` 13.5,
  12.5 and 11.5 px, `text-title-*` 15, 14 and 13.5 px semibold,
  `text-headline-medium` 20 px for sign-in titles, `text-display-medium`
  28 px for figures.
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

## Density and keyboard

Pages are lists of records: 32 to 40 px rows, `hairline` dividers, opaque
ids in `font-mono`, a reason that does not fit cut short with the full text
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
