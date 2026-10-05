import { Link, NavLink, Outlet, Navigate, useParams } from 'react-router-dom';
import data from '../data/nysl.json';
import Icon from './Icon.jsx';
import { useUserState } from '../firebase.jsx';
import { formatGameDate } from '../utilities/dates.js';

export default function GameLayout() {
  const { gameId } = useParams();
  const game = data.games[gameId];
  const { user, loading } = useUserState();

  if (!game) return <Navigate to="/schedule" replace />;
  const location = data.locations[game.locationKey];

  return (
    <section className="game-shell" aria-labelledby="game-title">
      <Link className="back-link" to="/schedule"><Icon name="arrow-left" size={17} /> Game schedule</Link>
      <header className="game-overview">
        <p className="game-date-label">{formatGameDate(game.date)} <span aria-hidden="true">/</span> {game.time}</p>
        <h1 id="game-title" aria-label={`${game.teams[0]} contra ${game.teams[1]}`}><span>{game.teams[0]}</span><span className="matchup-divider">vs.</span><span>{game.teams[1]}</span></h1>
        <p className="game-venue"><Icon name="map-pin" size={18} /> {location.name}</p>
      </header>

      <nav className={`game-tabs${user ? '' : ' guest-tabs'}`} aria-label="Game information">
        <NavLink to={`/game/${gameId}`} end className={({ isActive }) => `game-tab${isActive ? ' active' : ''}`}>
          <Icon name="map-pin" size={17} /> Venue
        </NavLink>
        {user ? (
          <>
            <NavLink to={`/game/${gameId}/messages`} className={({ isActive }) => `game-tab${isActive ? ' active' : ''}`}>
              <Icon name="message-circle" size={17} /> Messages
            </NavLink>
            <NavLink to={`/game/${gameId}/photos`} className={({ isActive }) => `game-tab${isActive ? ' active' : ''}`}>
              <Icon name="image-plus" size={17} /> Photos
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to={`/game/${gameId}/messages`} className={({ isActive }) => `game-tab game-tab-locked${isActive ? ' active' : ''}`}>
              <Icon name="message-circle" size={17} /> Messages <small>Read</small>
            </NavLink>
            <NavLink to={`/game/${gameId}/photos`} className={({ isActive }) => `game-tab game-tab-locked${isActive ? ' active' : ''}`}>
              <Icon name="image-plus" size={17} /> Photos <small>Read</small>
            </NavLink>
          </>
        )}
      </nav>
      {loading && <p className="member-note" role="status">Checking your sign-in to unlock Messages and Photos…</p>}
      {!loading && !user && <p className="member-note">Read messages and photos here. Sign in to add your own.</p>}
      <Outlet context={{ game, location, gameId }} />
    </section>
  );
}
