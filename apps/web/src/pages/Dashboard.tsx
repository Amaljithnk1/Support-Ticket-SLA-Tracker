import React from 'react';
import { useQuery } from 'urql';

const DASHBOARD_QUERY = `
  query GetDashboard {
    dashboard {
      openTickets
      inProgressTickets
      atRiskTickets
      breachedTickets
    }
  }
`;

export default function Dashboard() {
  const [{ data: queryData, fetching }] = useQuery({ query: DASHBOARD_QUERY });
  const stats = queryData?.dashboard || { openTickets: 0, inProgressTickets: 0, atRiskTickets: 0, breachedTickets: 0 };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-white">Overview</h1>
      
      {fetching ? (
        <div className="text-sm text-zinc-500">Loading metrics...</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Open', value: stats.openTickets, color: 'border-zinc-500', text: 'text-zinc-200' },
            { label: 'In Progress', value: stats.inProgressTickets, color: 'border-brand', text: 'text-brand-400' },
            { label: 'At Risk', value: stats.atRiskTickets, color: 'border-amber-500', text: 'text-amber-400' },
            { label: 'Breached', value: stats.breachedTickets, color: 'border-red-500', text: 'text-red-500' },
          ].map(stat => (
            <div key={stat.label} className={`p-6 bg-surface/50 backdrop-blur-sm rounded-xl border-t-2 ${stat.color} shadow-2xl border-x border-b border-white/5`}>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{stat.label}</div>
              <div className={`text-4xl font-mono ${stat.text}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="p-6 bg-surface/30 border border-white/5 rounded-xl">
        <h2 className="text-sm font-medium text-zinc-400 mb-2">Metrics Engine</h2>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
          The dashboard uses real-time aggregate statistics queried directly from the SLA calculation engine. 
          "At Risk" denotes tickets that have consumed more than 75% of their allocated business hours budget 
          (excluding weekends and holidays).
        </p>
      </div>
    </div>
  );
}
