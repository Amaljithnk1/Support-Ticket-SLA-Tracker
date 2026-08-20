import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';

// Placeholder Pages
const Dashboard = () => <div className="p-8">Dashboard Content</div>;
const TicketList = () => <div className="p-8">Ticket List Content</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Navigate to="/tickets" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tickets" element={<TicketList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
