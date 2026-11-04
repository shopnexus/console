# Console design

The staff console at `console.<domain>`. People at ShopNexus handle three
things only: reported banned goods and fakes, organised fraud, and lawful
requests from the authorities. The console is where they do it, and where
staff accounts are managed. It calls `/v1/staff/*` on the API with the
`staff_session` cookie.

## Source

The Android app's design system, `app/.superdesign/design-system.md`, is the
reference for colour, type, shape, motion and the deal model.
`src/styles/tokens.css` turns those tokens into Tailwind utilities; the
website carries the same file. See the website's `DESIGN.md` for the token
to utility table.

The app is a buyer's and seller's phone. The console is a desk tool used for
hours at a time on a large screen, so it keeps the app's tokens and drops
most of its layout.

## Kept from the app

- Colour roles, Be Vietnam Pro and the type scale, the corner scale, the
  springs, Material Symbols Rounded, and the tonal depth: only floating
  elements (menus, dialogs, toasts) get `shadow-float`.
- The deal model. Staff read cases; they do not rule on deals. No screen
  offers to refund, hold money, or decide a dispute, because the platform
  does none of these.
- Vietnamese copy with correct diacritics, prices in Vietnamese format.

## Changed for the console

**Desktop first.** The console is designed at expanded and up (840 px and
wider) and stays usable on a tablet in landscape. Compact gets a working
layout but no design of its own.

**Navigation.** An M3 navigation rail at the start (80 px, `surfaceContainer`)
on expanded, and a standard navigation drawer (360 px) from large up. The
drawer lists the work areas: Tài khoản, Nhật ký thao tác and Nhân viên, which
the API serves today, and Báo cáo once reports have endpoints.
The top bar is 64 px on `surface` with the page title in `titleLarge`, a
global search for an account or listing id, and the signed-in member.

**Density.** Pages are lists of records, not feeds. Tables use `bodyMedium`
cells and `labelLarge` headers, 52 px rows by default and 40 px in a compact
mode, `outlineVariant` dividers, and `surfaceContainerLow` on the hovered
row. Opaque ids (`acc_3r61q6fbvt9b8`) use `font-mono`. Detail opens in a side
panel beside the list so a member can move through a queue without losing
their place.

**Roles in this context.** `primary` is still the one main action per view.
Actions that take a right away from someone (suspend an account, disable a
member) use `error`, and ask for a reason before they run, since every action
lands in the audit log with its reason. `tertiary` keeps its meaning and so
appears only where the console shows a listing's price or a bargain from the
record.

**Keyboard.** Staff work through queues, so every list moves with `j`/`k`,
opens with Enter and closes with Escape, and every control has a visible
2 px `primary` focus ring. Hover takes the `state-layer` utility.

**Sign-in.** Email, password, then the TOTP code, with enrolment on the
first sign-in. A refused sign-in says only that it was refused; the session
lasts eight hours and expiry returns the member to sign-in with the page they
were on kept in the URL.

**Theme.** Light, dark from the system, and an override through `data-theme`
on `<html>`, as on the website.
