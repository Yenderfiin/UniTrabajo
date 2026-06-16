import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { StudentRoute } from './components/layout/StudentRoute';
import { MicroJobsPage } from './pages/MicroJobsPage';
import { TransportPage } from './pages/TransportPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { LandingPage } from './pages/LandingPage';
import { MyOffersPage } from './pages/MyOffersPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MyApplicationsPage } from './pages/MyApplicationsPage';
import { MessagesPage } from './pages/MessagesPage';
import { TransportRouteDetailPage } from './pages/TransportRouteDetailPage';
import { MyTransportRoutesPage } from './pages/MyTransportRoutesPage';
import { MyTransportReservationsPage } from './pages/MyTransportReservationsPage';
import { RatingsHistoryPage } from './pages/RatingsHistoryPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta Raíz Pública */}
          <Route path="/" element={<LandingPage />} />

          {/* Rutas Públicas de Auth */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Rutas Privadas / Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<MainLayout />}>
              <Route index element={<MicroJobsPage />} />
              <Route path="perfil" element={<ProfilePage />} />
              <Route path="mis-vacantes" element={<MyOffersPage />} />
              <Route path="notificaciones" element={<NotificationsPage />} />
              <Route path="mensajes" element={<MessagesPage />} />
              <Route path="mis-postulaciones" element={<MyApplicationsPage />} />
              <Route path="calificaciones" element={<RatingsHistoryPage />} />
            </Route>

            <Route element={<StudentRoute />}>
              <Route path="/app/transporte" element={<MainLayout />}>
                <Route index element={<TransportPage />} />
                <Route path="mis-rutas" element={<MyTransportRoutesPage />} />
                <Route path="mis-reservas" element={<MyTransportReservationsPage />} />
                <Route path=":offerId" element={<TransportRouteDetailPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
