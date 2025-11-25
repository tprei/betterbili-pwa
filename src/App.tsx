import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import WatchPage from './pages/Watch';

// Placeholder pages
const HomePage = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-4">Catalog</h1>
    <p className="text-zinc-400">Video catalog will appear here.</p>
  </div>
);

const ProfilePage = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-4">Profile</h1>
    <p className="text-zinc-400">User stats will appear here.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/watch/:hash" element={<WatchPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
