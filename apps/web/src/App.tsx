import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Toaster } from 'sonner';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import TicketDetails from './pages/TicketDetails';

import Auth from './pages/Auth';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');
  return (
    <>
      <Toaster theme="dark" position="bottom-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={isAuthenticated ? <Shell /> : <Navigate to="/auth" replace />}>
          <Route path="/" element={<Navigate to="/tickets" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tickets" element={<TicketList />} />
          <Route path="/tickets/:id" element={<TicketDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </>
  );
}

export default App;
