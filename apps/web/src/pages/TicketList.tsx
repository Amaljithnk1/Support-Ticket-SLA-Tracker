import React from 'react';
import { useQuery } from 'urql';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const TICKETS_QUERY = `
  query GetTickets {
    tickets(take: 20) {
      nodes {
        id
        title
        status
        priority
        sla {
          firstResponseState
          resolutionState
          firstResponseRemainingMinutes
          resolutionRemainingMinutes
        }
      }
    }
  }
`;

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  sla: {
    firstResponseState: string;
    resolutionState: string;
    firstResponseRemainingMinutes: number;
    resolutionRemainingMinutes: number;
  };
}

export default function TicketList() {
  const [{ data, fetching, error }] = useQuery({ query: TICKETS_QUERY });
  const navigate = useNavigate();

  if (fetching) return <div className="p-8 text-zinc-500">Loading tickets...</div>;
  if (error) return <div className="p-8 text-red-400">Error loading tickets</div>;

  const tickets = data?.tickets?.nodes || [];

  const handleNewTicket = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Tickets</h1>
        <button 
          onClick={handleNewTicket}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md shadow-lg shadow-white/10 hover:bg-zinc-200 hover:shadow-white/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          New Ticket
        </button>
      </div>

      <div className="bg-surface border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">ID</th>
              <th className="py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Title</th>
              <th className="py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
              <th className="py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Priority</th>
              <th className="py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">SLA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tickets.map((ticket: Ticket) => {
              const isBreached = ticket.sla.firstResponseState === 'BREACHED' || ticket.sla.resolutionState === 'BREACHED';
              
              return (
                <motion.tr 
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="group cursor-pointer bg-transparent"
                  whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}
                  animate={isBreached ? { backgroundColor: ['rgba(24,24,27,0)', 'rgba(239,68,68,0.08)', 'rgba(24,24,27,0)'] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <td className="py-4 px-6 text-sm font-mono text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    {ticket.id.slice(-6)}
                  </td>
                  <td className="py-4 px-6 text-sm text-zinc-200 font-medium group-hover:text-white transition-colors">
                    {ticket.title}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm ${
                      ticket.status === 'OPEN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/10' :
                      ticket.status === 'IN_PROGRESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' :
                      'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-sm font-medium ${
                      ticket.priority === 'URGENT' ? 'text-red-400' :
                      ticket.priority === 'HIGH' ? 'text-orange-400' :
                      'text-zinc-400'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider border shadow-sm ${
                      isBreached ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-red-500/20' : 
                      ticket.sla.firstResponseState === 'AT_RISK' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10' : 
                      'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>
                      {ticket.sla.firstResponseRemainingMinutes}m left
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
