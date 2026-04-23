import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { MicroJobsPage } from './pages/MicroJobsPage';
import { TransportPage } from './pages/TransportPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<MicroJobsPage />} />
          <Route path="transporte" element={<TransportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
