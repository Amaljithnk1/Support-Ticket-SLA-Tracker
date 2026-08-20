import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useMutation } from 'urql';
import { toast } from 'sonner';

const CHANGE_STATUS_MUTATION = `
  mutation ChangeTicketStatus($ticketId: ID!, $status: TicketStatus!) {
    changeTicketStatus(ticketId: $ticketId, status: $status) {
      id
      status
    }
  }
`;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, changeStatus] = useMutation(CHANGE_STATUS_MUTATION);

  // Toggle the menu when ⌘K is pressed
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

  const handleStatusChange = async (status: string) => {
    setOpen(false);
    // Hardcoding ticket 1 for demonstration, real app uses selected row
    const toastId = toast.loading(`Changing status to ${status}...`);
    
    // Optimistic UI happens in urql cache, this is the actual request
    const result = await changeStatus({ ticketId: "mock-ticket-id", status });
    
    if (result.error) {
      toast.error(`Failed to change status: ${result.error.message}`, { id: toastId });
    } else {
      toast.success(`Ticket marked as ${status}`, { id: toastId });
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
        <Command.Input 
          autoFocus 
          placeholder="Type a command or search..." 
          className="w-full bg-transparent text-white px-4 py-4 outline-none border-b border-white/5 font-sans"
        />
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="p-4 text-sm text-zinc-500 text-center">No results found.</Command.Empty>
          
          <Command.Group heading="Change Status" className="px-2 py-2 text-xs font-medium text-zinc-500">
            <Command.Item 
              onSelect={() => handleStatusChange('IN_PROGRESS')}
              className="px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 aria-selected:text-white flex items-center gap-2"
            >
              Set Active Ticket to In Progress
            </Command.Item>
            <Command.Item 
              onSelect={() => handleStatusChange('RESOLVED')}
              className="px-3 py-2 text-sm text-zinc-300 rounded cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 aria-selected:text-white flex items-center gap-2"
            >
              Resolve Active Ticket
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
