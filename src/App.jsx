import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import Navigation from './components/Navigation.jsx';
import AuthControl from './components/AuthControl.jsx';
import InstallAppButton from './components/InstallAppButton.jsx';
import Home from './components/Home.jsx';
import Schedule from './components/Schedule.jsx';
import GameLayout from './components/GameLayout.jsx';
import GameDetails from './components/GameDetails.jsx';
import Messages from './components/Messages.jsx';
import Photos from './components/Photos.jsx';
import PrivatePage from './components/PrivatePage.jsx';
import About from './components/About.jsx';
import Contact from './components/Contact.jsx';
import Rules from './components/Rules.jsx';
import Registration from './components/Registration.jsx';
import { useUserState } from './firebase.jsx';

function RequireLogin({ children }) {
  const { user, loading } = useUserState();
  if (loading) return <p className="state-message" role="status">Checking your sign-in…</p>;
  if (!user) return <PrivatePage />;
  return children;
}

function LegacyGameRedirect() {
  const { gameId } = useParams();
  const { pathname } = useLocation();
  const suffix = pathname.endsWith('/mensajes') ? '/messages'
    : pathname.endsWith('/fotos') ? '/photos' : '';
  return <Navigate to={`/game/${gameId}${suffix}`} replace />;
}

function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    let title = 'NYSL | Northside Youth Soccer League';
    if (pathname === '/schedule') title = 'Game Schedule | NYSL';
    if (pathname === '/about') title = 'About NYSL';
    if (pathname === '/contact') title = 'Contact NYSL';
    if (pathname === '/rules') title = 'Rules and Policies | NYSL';
    if (pathname === '/registration') title = 'Player Registration | NYSL';
    if (pathname.endsWith('/messages')) title = 'Game Chat | NYSL';
    if (pathname.endsWith('/photos')) title = 'Game Photos | NYSL';
    if (pathname.startsWith('/game/')) title = pathname.endsWith('/messages')
      ? 'Game Chat | NYSL'
      : pathname.endsWith('/photos') ? 'Game Photos | NYSL' : 'Game Location | NYSL';
    document.title = title;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="NYSL home">
          <strong>NYSL</strong>
          <img src={`${import.meta.env.BASE_URL}nysl-logo.png`} alt="" width="46" height="46" />
          <small>Northside Youth Soccer League</small>
        </Link>
        <div className="header-actions">
          <Navigation />
          <AuthControl />
          <InstallAppButton />
        </div>
      </header>

      <main className="app-content">
        <PageTitle />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/games" element={<Navigate to="/schedule" replace />} />
          <Route path="/register" element={<Navigate to="/registration" replace />} />
          <Route path="/game-information" element={<Navigate to="/schedule" replace />} />
          <Route path="/game/:gameId" element={<GameLayout />}>
            <Route index element={<GameDetails />} />
            <Route path="messages" element={<RequireLogin><Messages /></RequireLogin>} />
            <Route path="photos" element={<RequireLogin><Photos /></RequireLogin>} />
          </Route>
          <Route path="/juegos" element={<Navigate to="/schedule" replace />} />
          <Route path="/partido/:gameId/*" element={<LegacyGameRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="site-footer">Northside Youth Soccer League, Chicago</footer>
    </div>
  );
}
