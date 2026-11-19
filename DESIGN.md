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

- **Colour.** Teal and neutrals. `primary` is the one main action per view
  and the one thing on it to notice. The page is `surface-container-lowest`
  (white) and the sidebar `surface`. Raw JSON takes the `code-*` colours.
  - Red (`error`) and the browns and oranges (`tertiary`, `tertiary-fixed`)
    stay out of the UI unless they are needed. `error` is kept for real
    errors (a failed request, an invalid field, a run or tool call that
    failed) and for a small dot or pill on a state that blocks someone
    right now (Suspended, Hidden, Disabled), never as a wash or a block of
    red text. `tertiary` is not used.
  - Prices are `on-surface`, semibold, `tabular-nums`.
  - Chips, tags and badges for facts (report counts, the price guide,
    reasons, kinds, "Past the alert") are neutral: `surface-container` or a
    hairline border with `on-surface-variant` text, teal only for the one
    to notice, and icons that carry the meaning.
  - Hero bands are a teal wash and a neutral one. A suspended account or a
    hidden listing keeps the same band and says so with its status pill.
  - A destructive action on the page (Suspend, Hide listing, Delete chat)
    is a neutral outline button; only the confirm inside its popover is
    filled `error`.
  - Charts take `chart-1` to `chart-5`, teal shades and greys (primary,
    primary at 60 %, inverse-primary, secondary, outline-variant), by an
    agent's or provider's place in its list. A bad change reads by its
    arrow in `on-surface`, not in red; a limit passed fills `on-surface`.
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
- **Corners.** `rounded-xs` 5 px for keys, `sm` 6 px, `md` 8 px for record
  avatars, `lg` 10 px for nav rows, `xl` 12 px for inputs, `2xl` 14 px for
  small cards inside a card, `3xl` 16 px for cards and list rows, `4xl`
  20 px for bubbles and panels, `5xl` 24 px for the ask box and the sign-in
  card.
- **Controls.** Buttons are 36 px pills (`Btn`), 40 px when big. The
  primary action is filled `primary`, send included; Pause is filled
  `on-surface`. Hover is `on-surface` at 5 %. Every select is `Select` in
  `components/Select.tsx`, never the browser's.
- **Icons.** Material Symbols Light (`~icons/material-symbols-light/…`);
  the agent's sparkle is Material Symbols Rounded, which the light set lacks.

## Shell

One 272 px sidebar on `surface` beside the white page, with no card around
the page. From the top: the mark, New chat (`N`, the home page `/`),
Search (`/`, chats by title and an account by id, email or phone on Enter),
Support and Reports with their counts, Accounts, Tools (the dashboards in a
menu, a lock below the member's role), the member's chats grouped by day
(Today, Yesterday, Previous 7 days, Older), Settings for admins, and the
member with the theme and sign-out in a menu. `[` folds the sidebar to a
64 px rail; Support and a chat with a side panel open start on the rail.

Settings (`/settings/*`, admins) swaps the sidebar for its own, with
Console to go back: Overview, Members, Agents, Models, Providers, Budgets,
Tools, Guardrails and Audit log. Each page opens on a band with the page's
icon, its title, a row of fact chips and its actions.

## Agent

The agent reads and proposes; the member acts. A new chat opens on the
mascot, a greeting and the ask box, with the last three chats under it. A
chat is at most 800 px wide: the member's questions as bubbles, each answer
after the mascot.

- A turn is a run: its steps as phases, each with its tool calls folded to
  tallies ("Counts ×3") until it opens; a call as a row, "label what", that
  opens the tool panel (Result, Input, Raw JSON, Timing); provider switches
  and guardrails as quiet rows; the rate-limit countdown; and the context
  meter in the ask box. A finished run folds to "Worked for 42 s · 4 steps"
  with the last phase's title under it. The tool panel floats over the
  chat at its right edge and takes no room: a click outside, Esc or the
  same row closes it, and focus goes back to the row.
- Pause is the run's main control and becomes Stop now. A paused run shows
  Continue and End above the ask box. A message sent while the run works
  or is paused steers it; each steer shows Waiting, "Read before step n",
  or Not read with "Send as a new message".
- Answers are text with numbered citations, figures, tables, charts, a
  document card and follow-ups. Under a finished answer: Copy, Ask again,
  the turn's time, tokens and cost as quiet text (shown on hover, nothing
  that is unknown or zero), and "N sources", which opens the bordered list
  of sources. A citation opens the sources panel over the chat at its
  source: grouped by kind with filter chips, each row the record's initial
  (a dot for an account's state) or its kind, its name, a meta line, its
  number and a one-line quote. A row opens in place, one at a time, to the
  quote, up to four facts, Open, View tool call and Copy id. A tool call
  opened from it floats over it and gives way to it on close. The document
  panel has versions, Copy as Markdown and Print to PDF. No chat panel folds
  the sidebar.
- Clarifying questions are numbered cards of options with Continue and
  Use defaults. A spent budget replaces the ask box until midnight.
- The ask box takes `/` for the page's commands and the skills, `@` and `+`
  for a ticket, report or account (the page's own records first), and the
  agent picker. A record's labels reach the console only; the agent gets
  the kind and id.
- Support puts the customer's chat in the middle, under the order and its
  shipment, and the agent in a 420 px panel of tabs (`RecordAgent`). A
  ticket has no chat of its own: each tab is a chat of the member's that
  mentions the ticket, listed by the server's mention filter. `+` or `N`
  opens a tab with the ticket in its box and four starters. The box takes
  `/new question`, `/clear` (the tab starts over, the chat stays in the
  history), `/close`, `/reply how` (the answer lands in the reply box) and
  `/summary`; every answer has Use in reply. Nothing reaches the customer
  until the member sends it. Ctrl [ and Ctrl ] move between tabs, Ctrl K
  opens the switcher (1 to 9 jump), Ctrl / moves between the reply box and
  the agent's box; the browser keeps Ctrl 1 to 9 and Ctrl Tab. Details
  takes the panel's place from the header.

## Records

- A record's initial is `Initial` in `components/ui.tsx`. It takes one of
  four tints picked from the record's id (`tintOf` in `lib/look.ts`), so an
  account has the same colour on every page. With `status`, a dot at the
  bottom end shows `primary` for active and `error` for suspended. A
  member's initial is filled `primary` (`member`). The tints are teal and
  neutral.
- A picked row in any list takes `pickedRow(on)` from `lib/look.ts`: a
  white card with the soft shadow and a faint `primary` ring.
- The person at the top of a side column sits on a `band` with a `dots`
  layer, both utilities in `tokens.css`; a suspended person shows it by
  the status dot.

## Reports

- `/reports` and `/reports/:account_id`: the 310 px queue beside the case.
  Waiting lists open cases by their latest report, with the open count from
  the server's `total` in a `primary` badge here and beside Reports in the
  sidebar; Resolved lists resolved cases, newest first.
- The case opens on a hero with the account, its reasons as pills and the
  most reported listing; then the reported listings and the people who
  reported, with their notes.
- The decision bar is pinned to the bottom. The member ticks the listings
  to hide and Suspend with a term; Suspend adds the reason the person sees.
  The action button names what is ticked. It hides, then suspends, then
  marks the case actioned (`carryOut` in `lib/reports.ts`); Not a violation
  dismisses the case.
- A resolved case's bar lists what was done, the member and the time.
  Undo restores the hidden listings and the suspension, then reopens the
  case (`undoCase`).
- Ask the agent opens the account's shared chat.

## Accounts

- `/accounts` and `/accounts/:id`: the 330 px list beside the account. All
  lists every account newest first; Suspended lists the suspended ones whose
  term ends first, with their count in a `primary` badge. The search finds
  one account by id or phone number on Enter; on this page `/` focuses it.
- The account opens on a hero: the 72 px initial, the name, the status, the
  id with a copy button, chips for a verified phone and earlier
  suspensions, Ask the agent and Suspend, or Lift suspension. A suspended
  account adds a card with the term, the days left, a bar for the time
  served and who suspended it.
- History is the console's suspensions and their ends as a timeline that
  ends on the account's creation; Details (phone, email, joined) sits in a
  300 px column beside it.
- Suspend opens a popover: 1 day, 7 days, 30 days or No end as cards with
  their end dates, then the reason (up to 500 characters) the person sees,
  and "Suspend 7 days" filled `error`; Suspend itself is a neutral outline.

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

## Chat motion

Only what arrives now moves; a thread that opens draws still.

The run's activity, the citation pills, the sources list and button, the
follow-up chips and the streaming words follow AI Portal's chat
(`ai-portal/frontend/src/features/chat` and `styles/activity.css`): the
same sizes, spacing, radii, timings and behaviour, in our tokens and with
our teal for done. Its styles are the activity section of
`styles/global.css`, not classes in each component.

- Text streams by a smooth reveal (`useSmoothReveal` in `lib/motion.ts`):
  the speed eases over 300 ms toward clearing the backlog in 0.6 s, never
  under 40 characters a second, and plays out the rest after the stream
  ends. It never cuts inside a combining mark or a surrogate pair, so a
  Vietnamese vowel never shows without its tone. Each new word resolves out
  of a 4 px blur in 420 ms (`stream-word`), and a 2 px caret rides the end
  of the last block and breathes every 1.1 s (`streaming-tail`), only while
  text is revealed. History shows in full at once.
- Whatever mounts in the 800 ms after a thread opens draws still; an
  entrance keyed by an id plays once, also when the live turn is replaced
  by the stored one (`useArrival`).
- A sent question shows at once and rises 6 px in 220 ms; the ask box
  clears and keeps its focus. Enter sends, Shift+Enter breaks the line, and
  nothing sends while an input method composes. The box grows to eight
  lines. While a run is live, send is Pause, then Stop now.
- Before the run's first event a brain fades in with one plain word that
  shimmers and changes every 4.5 s, a clock from 3 s and "Still working,
  long answers can take a minute." from 20 s, until the first step
  replaces it.
- The run is a trigger line (brain, "Working" shimmering with its clock)
  over its rows on a 1 px rail, told apart by ink. Only live things move:
  the live phase's title shimmers (`act-shimmer`) beside a spinner, a
  running call's icon pulses every 1.6 s, and a new row drops in 6 px in
  220 ms (`act-enter`). A live run shows its last four rows. It opens while
  it works and folds when it ends unless the member opened or closed it.
  Folds open and close in 200 ms (`act-disclosure`); chevrons turn in
  180 ms.
- Answer blocks rise in once as they arrive, figures count up on arrival,
  and follow-ups fade up 6 px in 220 ms after the answer, 80 ms then 50 ms
  apart.
- The thread follows its end while the member is at the bottom; scrolled
  up, it stays and shows "Jump to latest". Sending always scrolls to the
  new question.
- Meters move by translate in 280 ms and draw still at first. Menus open
  from their trigger at 96 % in 150 ms. Side panels and the tool panel come
  in from 16 px in 220 ms; the tool panel leaves the same way in 140 ms. A
  press sinks a control to 97 %. With reduced motion every
  animation takes 1 ms and live text stays plain.

## Density and keyboard

Pages are lists of records: 32 to 40 px rows, `hairline` dividers, opaque
ids in `tabular-nums`, a reason that does not fit cut short with the full text
as the row's title. Detail opens beside the list. Lists move with `j`/`k`,
open with Enter and close with Escape; every control has a visible 2 px
`primary` focus ring.

## Deal model and copy

ShopNexus holds no money: the only deal path is cash on delivery with
inspection at the door. No screen offers escrow, a wallet or a refund.
Copy is English, short, and states facts: a title names the thing, a
refusal states the fact ("Admins only"). What a customer wrote, the replies
sent to customers and the reason a suspended person sees stay Vietnamese.

## Sign-in

Email, password, then the TOTP code, with enrolment on the first sign-in.
A refused sign-in says only that it was refused; the session lasts eight
hours and expiry returns the member to sign-in with the page they were on
kept in the URL.

## Theme

Light, dark from the system, and an override through `data-theme` on
`<html>`.
