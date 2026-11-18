// The read-only MCP tools server gives the agents (server/internal/agent/mcp/
// server.go), with the console's short label and what each reads. An
// agent's tools allowlist names them; a tool missing here shows its name.

export type ToolGroup = 'ticket' | 'account' | 'order' | 'listing' | 'report' | 'log' | 'data'

export interface ToolInfo {
  name: string
  label: string
  reads: string
  group: ToolGroup
}

export const tools: ToolInfo[] = [
  { name: 'ticket_get', label: 'Ticket', reads: 'A ticket with its person, order and first messages', group: 'ticket' },
  { name: 'ticket_messages', label: 'Ticket messages', reads: "A ticket's older messages", group: 'ticket' },
  { name: 'tickets_list', label: 'Support tickets', reads: 'The support queue', group: 'ticket' },
  { name: 'tickets_of_account', label: "Account's tickets", reads: 'Other tickets from the same person', group: 'ticket' },
  { name: 'account_get', label: 'Account', reads: 'Profile, verification, orders, reports', group: 'account' },
  { name: 'accounts_list', label: 'Accounts', reads: 'Accounts, or those suspended now', group: 'account' },
  { name: 'orders_of_account', label: "Account's orders", reads: 'Orders as buyer or seller', group: 'order' },
  { name: 'listings_of_account', label: "Account's listings", reads: "A seller's listings on sale or sold", group: 'listing' },
  { name: 'order_get', label: 'Order', reads: 'COD order and delivery events', group: 'order' },
  { name: 'listing_get', label: 'Listing', reads: 'Any status except deleted', group: 'listing' },
  { name: 'price_guide', label: 'Price guide', reads: 'A price against similar listings', group: 'data' },
  { name: 'report_cases_list', label: 'Report cases', reads: 'The report queue', group: 'report' },
  { name: 'report_case_get', label: 'Report case', reads: "An account's report case", group: 'report' },
  { name: 'console_actions', label: 'Action history', reads: "The console's audit log", group: 'log' },
  { name: 'count', label: 'Counts', reads: 'How many of a kind of record', group: 'data' },
  { name: 'lookup', label: 'What an id is', reads: 'Which records have an id', group: 'data' },
]

export function toolInfo(name: string): ToolInfo {
  return tools.find((t) => t.name === name) ?? { name, label: name, reads: '', group: 'data' }
}
