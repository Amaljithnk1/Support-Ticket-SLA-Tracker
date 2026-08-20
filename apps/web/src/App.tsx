import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Toaster } from 'sonner';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';

function App() {
  return (
    <>
      <Toaster theme="dark" position="bottom-right" />
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
