import React, { useState } from 'react';
import { useQuery } from 'urql';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from '../components/ui/CustomSelect';

const TICKETS_QUERY = `
  query GetTickets($status: TicketStatus, $priority: Priority, $take: Int, $cursor: String) {
    tickets(status: $status, priority: $priority, take: $take, cursor: $cursor) {
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
      pageInfo {
        hasNextPage
        endCursor
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
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  const [{ data, fetching, error }] = useQuery({ 
    query: TICKETS_QUERY,
    requestPolicy: 'cache-and-network',
    variables: { 
      take: 20,
      status: statusFilter === '' ? undefined : statusFilter,
      priority: priorityFilter === '' ? undefined : priorityFilter
    }
  });
  
  const navigate = useNavigate();

  const handleNewTicket = () => {
    // Standardize ctrl/cmd key firing for the event listener
    const isMac = navigator.platform.toLowerCase().includes('mac');
    document.dispatchEvent(new KeyboardEvent('keydown', { 
      key: 'k', 
      ctrlKey: !isMac,
      metaKey: isMac 
    }));
  };

  const tickets = data?.tickets?.nodes || [];
  const pageInfo = data?.tickets?.pageInfo;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Tickets</h1>
        <button 
          onClick={handleNewTicket}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md shadow-lg shadow-white/10 hover:bg-zinc-200 transition-all hover:-translate-y-0.5"
        >
          New Ticket
        </button>
      </div>

      <div className="flex gap-4">
        <div className="w-48">
          <CustomSelect 
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'OPEN', label: 'Open' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'RESOLVED', label: 'Resolved' },
              { value: 'CLOSED', label: 'Closed' }
            ]}
          />
        </div>
        <div className="w-48">
          <CustomSelect 
            value={priorityFilter}
            onChange={setPriorityFilter}
            placeholder="All Priorities"
            options={[
              { value: '', label: 'All Priorities' },
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' }
            ]}
          />
        </div>
      </div>

      <div className="bg-surface border border-white/10 rounded-xl overflow-hidden shadow-2xl relative min-h-[400px]">
        {fetching && tickets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <span className="text-sm text-zinc-400">Loading...</span>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <span className="text-sm text-red-400">Error loading tickets</span>
          </div>
        )}

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
              const isClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
              
              const renderSLA = () => {
                if (isBreached) return { text: 'BREACHED', style: 'bg-red-500/20 text-red-400 border-red-500/30 shadow-red-500/20' };
                if (isClosed) return { text: 'MET', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' };
                if (ticket.sla.firstResponseState === 'AT_RISK') return { text: `${ticket.sla.firstResponseRemainingMinutes}m left`, style: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10' };
                return { text: `${ticket.sla.firstResponseRemainingMinutes}m left`, style: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
              };
              
              const slaBadge = renderSLA();
              
              return (
                <motion.tr 
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="group cursor-pointer bg-transparent"
                  whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}
                  animate={isBreached && !isClosed ? { backgroundColor: ['rgba(24,24,27,0)', 'rgba(239,68,68,0.08)', 'rgba(24,24,27,0)'] } : {}}
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
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider border shadow-sm ${slaBadge.style}`}>
                      {slaBadge.text}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        
        {pageInfo?.hasNextPage && (
          <div className="p-4 border-t border-white/5 flex justify-center">
            <button className="text-xs font-medium text-zinc-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-md border border-white/10 hover:bg-white/10">
              Load More (Mocked for demo)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
