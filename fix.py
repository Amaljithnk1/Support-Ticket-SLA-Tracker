import os
import re

# Fix calculator.test.ts
with open('packages/sla-engine/tests/calculator.test.ts', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('â€”', '—')
with open('packages/sla-engine/tests/calculator.test.ts', 'w', encoding='utf-8') as f:
    f.write(c)

# Fix TicketDetails.tsx
with open('apps/web/src/pages/TicketDetails.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('n  mutation ResolveTicket($ticketId: ID!) {', '  mutation ResolveTicket($ticketId: ID!) {')

button_code = """
              {isAgent && ticket.status === 'IN_PROGRESS' && (
                <button 
                  onClick={() => resolveTicket({ ticketId: ticket.id })}
                  className="px-3 py-1.5 bg-green-500/10 text-green-400 text-sm font-medium rounded hover:bg-green-500/20 transition-colors border border-green-500/20"
                >
                  Resolve Ticket
                </button>
              )}
"""

if "Resolve Ticket" not in c:
    c = c.replace('Assign to me\n                </button>\n              )}', 'Assign to me\n                </button>\n              )}\n' + button_code)

with open('apps/web/src/pages/TicketDetails.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

# Fix Auth.tsx
with open('apps/web/src/pages/Auth.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Remove Role Dropdown from Auth.tsx
role_regex = re.compile(r'\{\!isLogin && \(\s*<div>\s*<label[^>]*>Role</label>\s*<CustomSelect\s*value=\{role\}\s*onChange=\{setRole\}\s*options=\{[^}]*\}\s*/>\s*</div>\s*\)\}', re.MULTILINE | re.DOTALL)
c = re.sub(role_regex, '', c)

with open('apps/web/src/pages/Auth.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

