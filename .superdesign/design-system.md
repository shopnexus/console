# ShopNexus Console design system

The staff console at `console.<domain>`. People at ShopNexus handle reported
banned goods and fakes, organised fraud, and lawful requests from the
authorities, and manage staff accounts. It is a desk tool used for hours on a
large screen. Members are moderators ("Kiểm duyệt viên") or admins ("Quản trị
viên").

The reference is the Android app's system, `app/.superdesign/design-system.md`:
colour roles, type scale, corner scale, motion and copy rules come from there.
`console/DESIGN.md` records what the console changes. Tokens are in
`src/styles/tokens.css`; `tools/common.py` copies them for the mockups.

## Tokens

- Colour: the app's M3 roles (seed #066A61, tertiary from #924628).
  `primary` is the one main action per view; `error` marks actions that take
  a right away from someone; `tertiary` appears only for a listing's price.
  `secondaryContainer` fills selected chips and indicators. Depth is tonal:
  only floating elements take the level-3 shadow (`shadow-float`).
- Type: Be Vietnam Pro, M3 scale, including displayLarge 57/64 and
  displayMedium 45/52. Opaque ids, keys and codes in a monospace face.
- Corners: 4, 8, 12, 16, 20, 28, 32 and full. Text fields 4 (M3 outlined),
  buttons full, cards 16 to 28, large panels 28 to 32.
- Icons: Material Symbols Rounded, weight 400; outline when inactive, filled
  when selected.
- Motion: springs (spatial and effects); hover through the M3 state layer.

## Sign-in and dashboard handoff (2026-11-05)

Desktop 1440 × 900. No app shell on these screens.

- Split screen. Start: a brand panel on `primaryContainer`, 40 % wide, with
  28 px inner corners against the form side, M3 Expressive shapes in
  `inversePrimary` and `onPrimaryContainer` tones at low contrast, the mascot
  holding a shield (`art_verified`) and "ShopNexus Console" in displayMedium,
  nothing else. End: the form column on `surface`, 400 px
  wide, centred.
- Steps: password, code; the first sign-in adds a new password and TOTP
  enrolment, shown as a two-step indicator. The member's email stays visible
  as a chip once typed, with "Đổi" to go back.
- Fields: M3 outlined, 56 px, label on the border when filled, supporting
  text below. The TOTP code is six 56 × 64 boxes in `titleLarge` monospace.
- One filled pill button per step (`primary`), full width, 48 px.
- Refusals say only that the sign-in was refused, with no detail about which
  part was wrong; a lock says when to try again.
- Dashboard handoff: a centred card on `surface` showing the console mark,
  a moving path and the dashboard's icon, the dashboard's name and its host
  in monospace. A refusal for role adds "Cần quyền Quản trị viên".
- Home: the console shell (navigation drawer, 64 px top bar), a search band
  on `primaryContainer`, then the records: for admins the audit log and the
  members that need a hand, for moderators the accounts they opened last;
  the tools and the keyboard shortcuts beside them. No greeting.

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
