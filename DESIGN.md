# Console design

The console at `console.<domain>`. People at ShopNexus handle reported
banned goods and fakes, organised fraud and lawful requests from the
authorities, and answer support tickets. The console is where they do it,
and where console members are managed. It calls `/v1/console/*` on the API with the
`console_session` cookie.

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
- The deal model. Members read cases; they do not rule on deals. No screen
  offers to refund, hold money, or decide a dispute, because the platform
  does none of these.
- Vietnamese copy with correct diacritics, prices in Vietnamese format.

## Changed for the console

**Desktop first.** The console is designed at expanded and up (840 px and
wider) and stays usable on a tablet in landscape. Compact gets a working
layout but no design of its own.

**Navigation.** A 256 px navigation drawer on `surfaceContainerLow` lists
the work areas: Hỗ trợ with the count of open tickets, Tài khoản,
Nhật ký thao tác and Nhân viên, which the API serves today, and Báo cáo
once reports have endpoints, then the ops dashboards under Công cụ. The
button beside the name, or `[`, collapses it to a 64 px rail of icons, with
each label as the icon's title and the counts as small badges on the icons.
The browser keeps that choice. Hỗ trợ opens with the rail, since its queue,
thread and facts need the width; expanding the drawer there lasts until the
member leaves the page and does not change the saved choice.
The top bar is 48 px on `surface` with the page title in `titleLarge` and
the theme switch.

**Density.** Pages are lists of records. Rows are 40 px, list
avatars and icon badges 32 px, buttons in a page 36 px, and cards on a page
use the `lg` corner with 12 to 16 px of padding and 8 to 16 px between them.
Tables use `bodyMedium` cells and `labelMedium` headers, `outlineVariant`
dividers, and `surfaceContainerLow` on the hovered row; a reason that does
not fit its row is cut short and shows in full as the row's title. Opaque
ids (`acc_3r61q6fbvt9b8`) use `font-mono`. Detail opens in a side panel
beside the list so a member can move through a queue without losing their
place.

**Roles in this context.** `primary` is still the one main action per view.
Actions that take a right away from someone (suspend an account, disable a
member) use `error`, and ask for a reason before they run, since every action
lands in the audit log with its reason. `tertiary` keeps its meaning and so
appears only where the console shows a listing's price or a bargain from the
record.

**Keyboard.** Members work through queues, so every list moves with `j`/`k`,
opens with Enter and closes with Escape, and every control has a visible
2 px `primary` focus ring. Hover takes the `state-layer` utility.

**Sign-in.** Email, password, then the TOTP code, with enrolment on the
first sign-in. A refused sign-in says only that it was refused; the session
lasts eight hours and expiry returns the member to sign-in with the page they
were on kept in the URL.

**Theme.** Light, dark from the system, and an override through `data-theme`
on `<html>`, as on the website.
