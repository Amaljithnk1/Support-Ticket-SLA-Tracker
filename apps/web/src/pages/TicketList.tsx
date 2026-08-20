import React from 'react';
import { useQuery } from 'urql';
import { motion } from 'framer-motion';

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

export default function TicketList() {
  const [{ data, fetching, error }] = useQuery({ query: TICKETS_QUERY });

  if (fetching) return <div className="p-8 text-zinc-500">Loading tickets...</div>;
  if (error) return <div className="p-8 text-red-400">Error loading tickets</div>;

  const tickets = data?.tickets?.nodes || [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-white">Tickets</h1>
        <button className="px-3 py-1.5 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition-colors">
          New Ticket
        </button>
      </div>

      <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="py-3 px-4 text-xs font-medium text-zinc-500">ID</th>
              <th className="py-3 px-4 text-xs font-medium text-zinc-500">Title</th>
              <th className="py-3 px-4 text-xs font-medium text-zinc-500">Status</th>
              <th className="py-3 px-4 text-xs font-medium text-zinc-500">Priority</th>
              <th className="py-3 px-4 text-xs font-medium text-zinc-500">SLA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tickets.map((ticket: any) => {
              const isBreached = ticket.sla.firstResponseState === 'BREACHED' || ticket.sla.resolutionState === 'BREACHED';
              
              return (
                <motion.tr 
                  key={ticket.id}
                  className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                  animate={isBreached ? { backgroundColor: ['rgba(24,24,27,1)', 'rgba(239,68,68,0.05)', 'rgba(24,24,27,1)'] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <td className="py-3 px-4 text-sm font-mono text-zinc-500">
                    {ticket.id.slice(-6)}
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-200 font-medium group-hover:text-white transition-colors">
                    {ticket.title}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-zinc-300">
                      {ticket.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-400">
                    {ticket.priority}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      isBreached ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                      ticket.sla.firstResponseState === 'AT_RISK' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
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
