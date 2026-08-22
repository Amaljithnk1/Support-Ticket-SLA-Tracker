import React from 'react';
import { useQuery } from 'urql';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DASHBOARD_QUERY = `
  query GetDashboard {
    dashboard {
      openTickets
      inProgressTickets
      atRiskTickets
      breachedTickets
    }
    slaTrend(days: 7) {
      date
      met
      breached
    }
  }
`;

export default function Dashboard() {
  const [{ data: queryData, fetching }] = useQuery({ 
    query: DASHBOARD_QUERY,
    requestPolicy: 'cache-and-network' 
  });
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
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">{stat.label}</div>
              <div className={`text-4xl font-mono ${stat.text}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="h-[400px] w-full bg-surface/30 border border-white/5 rounded-xl p-6">
        <h2 className="text-sm font-medium text-zinc-400 mb-6">SLA Performance (Resolution)</h2>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={queryData?.slaTrend || []}>
            <defs>
              <linearGradient id="colorMet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorBreached" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#e4e4e7' }}
            />
            <Area type="monotone" name="Met SLAs" dataKey="met" stroke="#34d399" fillOpacity={1} fill="url(#colorMet)" strokeWidth={2} />
            <Area type="monotone" name="Breached SLAs" dataKey="breached" stroke="#ef4444" fillOpacity={1} fill="url(#colorBreached)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
