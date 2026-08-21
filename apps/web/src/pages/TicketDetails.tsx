import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { toast } from 'sonner';

const TICKET_QUERY = `
  query GetTicket($id: ID!) {
    ticket(id: $id) {
      id
      title
      description
      status
      priority
      createdAt
      reporter {
        name
      }
      assignee {
        name
      }
      sla {
        firstResponseState
        firstResponseRemainingMinutes
        resolutionState
        resolutionRemainingMinutes
      }
    }
  }
`;

const CHANGE_STATUS_MUTATION = `
  mutation ChangeTicketStatus($ticketId: ID!, $status: TicketStatus!) {
    changeTicketStatus(ticketId: $ticketId, status: $status) {
      id
      status
    }
  }
`;

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [{ data, fetching, error }] = useQuery({ 
    query: TICKET_QUERY, 
    variables: { id } 
  });

  const [, changeStatus] = useMutation(CHANGE_STATUS_MUTATION);

  if (fetching) return <div className="p-8 text-zinc-500">Loading ticket details...</div>;
  if (error || !data?.ticket) return <div className="p-8 text-red-400">Error loading ticket</div>;

  const ticket = data.ticket;

  const handleStatusChange = async (newStatus: string) => {
    const toastId = toast.loading(`Changing status to ${newStatus}...`);
    const result = await changeStatus({ ticketId: ticket.id, status: newStatus });
    
    if (result.error) {
      toast.error(result.error.message, { id: toastId });
    } else {
      toast.success(`Ticket marked as ${newStatus}`, { id: toastId });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/tickets')}
        className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
      >
        ← Back to Tickets
      </button>

      <div className="bg-surface/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">{ticket.title}</h1>
            <p className="text-sm text-zinc-400 font-mono">ID: {ticket.id}</p>
          </div>
          <div className="flex gap-2">
            <select 
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-md px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus:border-brand"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 py-6 border-y border-white/10 mb-6">
          <div>
            <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Priority</span>
            <span className="text-sm font-medium text-white">{ticket.priority}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Reporter</span>
            <span className="text-sm font-medium text-white">{ticket.reporter.name}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">First Response SLA</span>
            <span className="text-sm font-medium text-white">{ticket.sla.firstResponseRemainingMinutes}m left</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Resolution SLA</span>
            <span className="text-sm font-medium text-white">{ticket.sla.resolutionRemainingMinutes}m left</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-zinc-300 mb-2">Description</h2>
          <div className="bg-black/20 rounded-md p-4 text-sm text-zinc-300 border border-white/5 whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>
      </div>
    </div>
  );
}
