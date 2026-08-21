import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useMutation } from 'urql';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CREATE_TICKET_MUTATION = `
  mutation CreateTicket($title: String!, $description: String!, $priority: Priority!) {
    createTicket(title: $title, description: $description, priority: $priority) {
      id
      title
    }
  }
`;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'main' | 'create'>('main');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  
  const [, createTicket] = useMutation(CREATE_TICKET_MUTATION);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleCreate = async () => {
    if (!title || !description) return toast.error('Title and description are required');
    const toastId = toast.loading('Creating ticket...');
    const result = await createTicket({ title, description, priority });
    
    if (result.error) {
      toast.error(result.error.message, { id: toastId });
    } else {
      toast.success('Ticket created successfully', { id: toastId });
      setOpen(false);
      setView('main');
      setTitle('');
      setDescription('');
      navigate('/tickets');
    }
  };

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-background/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {view === 'main' ? (
          <>
            <Command.Input 
              autoFocus 
              placeholder="Type a command or search..." 
              className="w-full bg-transparent text-white px-4 py-4 outline-none border-b border-white/5 font-sans"
            />
            <Command.List className="max-h-[300px] overflow-y-auto p-2">
              <Command.Empty className="p-4 text-sm text-zinc-500 text-center">No results found.</Command.Empty>
              
              <Command.Group heading="Actions" className="px-2 py-2 text-xs font-medium text-zinc-500">
                <Command.Item 
                  onSelect={() => setView('create')}
                  className="px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 aria-selected:text-white flex items-center gap-2"
                >
                  Create New Ticket
                </Command.Item>
                <Command.Item 
                  onSelect={() => navigate('/dashboard')}
                  className="px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 aria-selected:text-white flex items-center gap-2"
                >
                  Go to Dashboard
                </Command.Item>
              </Command.Group>
            </Command.List>
          </>
        ) : (
          <div className="p-4 flex flex-col gap-4">
            <h2 className="text-lg font-medium text-white">Create New Ticket</h2>
            <input 
              autoFocus
              placeholder="Ticket Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand"
            />
            <textarea 
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand h-24 resize-none"
            />
            <select 
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setView('main')}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-zinc-200 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </Command.Dialog>
  );
}
