import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import WatchPage from './pages/Watch';
import HomePage from './pages/Home';
import ProfilePage from './pages/Profile';
import LoginPage from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/watch/:hash" element={<WatchPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
