import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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

// Dummy time-series data for the glowing chart visual
const data = [
  { name: 'Mon', active: 12, breached: 1 },
  { name: 'Tue', active: 18, breached: 2 },
  { name: 'Wed', active: 14, breached: 0 },
  { name: 'Thu', active: 25, breached: 4 },
  { name: 'Fri', active: 22, breached: 3 },
];

export default function Dashboard() {
  const [{ data: queryData }] = useQuery({ query: DASHBOARD_QUERY });
  const stats = queryData?.dashboard || { openTickets: 0, inProgressTickets: 0, atRiskTickets: 0, breachedTickets: 0 };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-white">Overview</h1>
      
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Open', value: stats.openTickets, color: 'border-zinc-500' },
          { label: 'In Progress', value: stats.inProgressTickets, color: 'border-brand' },
          { label: 'At Risk', value: stats.atRiskTickets, color: 'border-amber-500' },
          { label: 'Breached', value: stats.breachedTickets, color: 'border-red-500' },
        ].map(stat => (
          <div key={stat.label} className={`p-4 bg-surface rounded-lg border-l-2 ${stat.color} border-y border-y-white/5 border-r border-r-white/5`}>
            <div className="text-sm text-zinc-500">{stat.label}</div>
            <div className="text-3xl font-mono text-white mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="h-[400px] w-full bg-surface border border-white/5 rounded-xl p-6">
        <h2 className="text-sm font-medium text-zinc-400 mb-6">Active SLAs (Business Hours)</h2>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5E6AD2" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#5E6AD2" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorBreached" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#e4e4e7' }}
            />
            <Area type="monotone" dataKey="active" stroke="#5E6AD2" fillOpacity={1} fill="url(#colorActive)" strokeWidth={2} />
            <Area type="monotone" dataKey="breached" stroke="#ef4444" fillOpacity={1} fill="url(#colorBreached)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
