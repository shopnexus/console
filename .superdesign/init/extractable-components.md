# Extractable components

None yet: the console has one placeholder route. The sign-in screens define
the first shared pieces:

## SignInShell
- Source: none yet (designed in .superdesign/tools/common.py)
- Category: layout
- Description: Split screen: brand panel on primary-container with the mascot, form column on surface
- Extractable props: step (string), showSteps (boolean)
- Hardcoded: logo, mascot art, the three duties, footer

## OutlinedField
- Source: none yet
- Category: basic
- Description: M3 outlined text field, 56 px, label on the border
- Extractable props: label, value, supporting, error (boolean), trailingIcon
