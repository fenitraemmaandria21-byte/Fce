import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AuthProvider } from '@/context/AuthContext'
import Dashboard from '@/pages/Dashboard'
import Aide from '@/pages/Aide'
import Gares from '@/pages/Gares'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import Arrets from '@/pages/Arrets'
import Arrivages from '@/pages/Arrivages'
import Bran from '@/pages/Bran'
import Billets from '@/pages/Billets'
import Clients from '@/pages/Clients'
import Locations from '@/pages/Locations'
import Marchandises from '@/pages/Marchandises'
import Rfe from '@/pages/Rfe'
import Statistiques from '@/pages/Statistiques'
import Parametres from '@/pages/Parametres'
import Tarifs from '@/pages/Tarifs'
import Trains from '@/pages/Trains'
import Utilisateurs from '@/pages/Utilisateurs'
import Voitures from '@/pages/Voitures'
import Wagons from '@/pages/Wagons'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="aide" element={<Aide />} />
            <Route path="gares" element={<Gares />} />
            <Route path="arrets" element={<Arrets />} />
            <Route path="tarifs" element={<Tarifs />} />
            <Route path="trains" element={<Trains />} />
            <Route path="voitures" element={<Voitures />} />
            <Route path="wagons" element={<Wagons />} />
            <Route path="billets" element={<Billets />} />
            <Route path="marchandises" element={<Marchandises />} />
            <Route path="arrivages" element={<Arrivages />} />
            <Route path="locations" element={<Locations />} />
            <Route
              path="bran"
              element={
                <ProtectedRoute roles={['SUPERADMIN', 'ADMIN']}>
                  <Bran />
                </ProtectedRoute>
              }
            />
            <Route
              path="rfe"
              element={
                <ProtectedRoute roles={['SUPERADMIN', 'ADMIN']}>
                  <Rfe />
                </ProtectedRoute>
              }
            />
            <Route
              path="utilisateurs"
              element={
                <ProtectedRoute roles={['SUPERADMIN', 'ADMIN']}>
                  <Utilisateurs />
                </ProtectedRoute>
              }
            />
            <Route path="clients" element={<Clients />} />
            <Route
              path="parametres"
              element={
                <ProtectedRoute roles={['SUPERADMIN']}>
                  <Parametres />
                </ProtectedRoute>
              }
            />
            <Route path="statistiques" element={<Statistiques />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          limit={4}
          newestOnTop
          closeOnClick
          pauseOnHover
          pauseOnFocusLoss={false}
          draggable
          progressClassName="!bg-fce-600"
          theme="colored"
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
