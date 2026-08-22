import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { toast } from 'sonner';
import { CustomSelect } from '../components/ui/CustomSelect';

const TICKET_QUERY = `
  query GetTicket($id: ID!) {
    ticket(id: $id) {
      id
      title
      description
      status
      priority
      createdAt
      firstResponseAt
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
      comments {
        id
        content
        createdAt
        author {
          name
          role
        }
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

const ADD_COMMENT_MUTATION = `
  mutation AddComment($ticketId: ID!, $content: String!) {
    addComment(ticketId: $ticketId, content: $content) {
      id
      content
    }
  }
`;

const ASSIGN_TICKET_MUTATION = `
  mutation AssignTicket($ticketId: ID!, $assigneeId: ID!) {
    assignTicket(ticketId: $ticketId, assigneeId: $assigneeId) {
      id
      assignee {
        name
      }
    }
  }
`;

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');
  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAgent = user?.role === 'AGENT';
  
  const [{ data, fetching, error }, executeQuery] = useQuery({ 
    query: TICKET_QUERY, 
    variables: { id } 
  });

  const [, changeStatus] = useMutation(CHANGE_STATUS_MUTATION);
  const [, addComment] = useMutation(ADD_COMMENT_MUTATION);
  const [, assignTicket] = useMutation(ASSIGN_TICKET_MUTATION);

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
      executeQuery({ requestPolicy: 'network-only' });
    }
  };

  const handleAssignToMe = async () => {
    const toastId = toast.loading('Assigning ticket...');
    const result = await assignTicket({ ticketId: ticket.id, assigneeId: user.id });
    
    if (result.error) {
      toast.error(result.error.message, { id: toastId });
    } else {
      toast.success('Ticket assigned to you', { id: toastId });
      executeQuery({ requestPolicy: 'network-only' });
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    const toastId = toast.loading('Posting comment...');
    const result = await addComment({ ticketId: ticket.id, content: commentText });
    
    if (result.error) {
      toast.error(result.error.message, { id: toastId });
    } else {
      toast.success('Comment posted', { id: toastId });
      setCommentText('');
      executeQuery({ requestPolicy: 'network-only' });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/tickets')}
        className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
      >
        â† Back to Tickets
      </button>

      <div className="bg-surface/50 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">{ticket.title}</h1>
            <p className="text-sm text-zinc-400 font-mono">ID: {ticket.id}</p>
          </div>
          <div className="flex gap-2 items-center">
            {isAgent && !ticket.assignee && (
              <button 
                onClick={handleAssignToMe}
                className="px-3 py-1.5 bg-brand/10 text-brand-400 text-sm font-medium rounded hover:bg-brand/20 transition-colors border border-brand/20"
              >
                Assign to me
              </button>
            )}
            
            {isAgent ? (
              <div className="w-40">
                <CustomSelect 
                  value={ticket.status}
                  onChange={handleStatusChange}
                  options={[
                    { value: 'OPEN', label: 'OPEN' },
                    { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
                    { value: 'RESOLVED', label: 'RESOLVED' },
                    { value: 'CLOSED', label: 'CLOSED' }
                  ]}
                />
              </div>
            ) : (
              <span className="px-3 py-1.5 bg-white/10 text-zinc-300 text-sm font-medium rounded border border-white/10">
                {ticket.status}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 py-6 border-y border-white/10 mb-6">
          <div>
            <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Priority</span>
            <span className="text-sm font-medium text-white">{ticket.priority}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Assignee</span>
            <span className="text-sm font-medium text-white">{ticket.assignee ? ticket.assignee.name : 'Unassigned'}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">First Response SLA</span>
            <span className={`text-sm font-medium ${ticket.sla.firstResponseState === 'BREACHED' ? 'text-red-400' : (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.firstResponseAt ? 'text-emerald-400' : 'text-white')}`}>
              {ticket.sla.firstResponseState === 'BREACHED' ? 'BREACHED' : (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.firstResponseAt ? 'MET' : `${ticket.sla.firstResponseRemainingMinutes}m left`)}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Resolution SLA</span>
            <span className={`text-sm font-medium ${ticket.sla.resolutionState === 'BREACHED' ? 'text-red-400' : (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'text-emerald-400' : 'text-white')}`}>
              {ticket.sla.resolutionState === 'BREACHED' ? 'BREACHED' : (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'MET' : `${ticket.sla.resolutionRemainingMinutes}m left`)}
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-zinc-300 mb-2">Description</h2>
          <div className="bg-black/20 rounded-md p-4 text-sm text-zinc-300 border border-white/5 whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>
      </div>
      
      {/* Comments Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-medium text-white">Discussion</h2>
        
        <div className="space-y-4">
          {ticket.comments.map((comment: { id: string, content: string, createdAt: string, author: { name: string, role: string } }) => (
            <div key={comment.id} className="bg-surface/30 border border-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-zinc-300">
                  {comment.author.name[0]}
                </div>
                <span className="text-sm font-medium text-white">{comment.author.name}</span>
                {comment.author.role === 'AGENT' && (
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded shadow-sm shadow-blue-500/10">
                    Agent
                  </span>
                )}
                <span className="text-xs text-zinc-500">{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-zinc-300 pl-8 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
          {ticket.comments.length === 0 && (
            <div className="text-sm text-zinc-500 italic p-4 border border-dashed border-white/10 rounded-lg text-center">
              No comments yet. Be the first to start the discussion.
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <textarea 
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand min-h-[100px] resize-y"
          />
          <div className="flex justify-end">
            <button 
              onClick={handlePostComment}
              className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-zinc-200 transition-colors"
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

