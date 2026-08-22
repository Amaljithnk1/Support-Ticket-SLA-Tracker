with open('apps/web/src/pages/TicketDetails.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

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
