import { useState } from 'react';
import { Link } from 'react-router-dom';
import data from '../data/nysl.json';
import { formatGameDate } from '../utilities/dates.js';
import Icon from './Icon.jsx';

const games = Object.entries(data.games);

function normalizeSearchText(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function Schedule() {
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeSearchText(query.trim());
  const filteredGames = games.filter(([id, game]) => {
    const location = data.locations[game.locationKey];
    const searchableText = [id, ...game.teams, formatGameDate(game.date), game.time, location.name, location.address].join(' ');
    return normalizeSearchText(searchableText).includes(normalizedQuery);
  });

  return (
    <section className="schedule-section" aria-labelledby="schedule-title">
      <header className="page-heading">
        <h1 id="schedule-title">Game schedule</h1>
        <p>Select a game to view its venue, messages, and photos. Sign in above to post or share pictures.</p>
      </header>

      <div className="schedule-filter">
        <label htmlFor="schedule-search">Search games</label>
        <div className="schedule-search-control">
          <input
            id="schedule-search"
            type="search"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Team, date, time, or venue"
          />
          {query && <button className="schedule-clear" type="button" onClick={() => setQuery('')}>Clear</button>}
        </div>
        <p className="schedule-result-count" role="status" aria-live="polite">
          Showing {filteredGames.length} of {games.length} games
        </p>
      </div>

      <ol className="schedule-list" aria-label="NYSL games">
        {filteredGames.length ? filteredGames.map(([id, game]) => {
          const location = data.locations[game.locationKey];
          return (
            <li className="schedule-item" key={id}>
              <div className="schedule-date"><Icon name="calendar-days" size={20} /><span>{formatGameDate(game.date)}</span></div>
              <Link className="schedule-match" to={`/game/${id}`} aria-label={`View ${game.teams[0]} versus ${game.teams[1]}, ${formatGameDate(game.date)}`}>
                <strong>{game.teams[0]} <span>vs.</span> {game.teams[1]}</strong>
                <small>Venue · Messages · Photos <Icon name="arrow-right" size={17} /></small>
              </Link>
              <div className="schedule-time"><Icon name="clock" size={19} />{game.time}</div>
              <a className="schedule-venue" href={location.mapUrl} target="_blank" rel="noreferrer" aria-label={`Get directions to ${location.name}`}>
                <Icon name="map-pin" size={20} />
                <span><strong>{location.name}</strong><small>{location.address}</small></span>
                <Icon name="arrow-up-right" size={18} className="venue-arrow" />
              </a>
            </li>
          );
        }) : <li className="schedule-empty">No games match “{query}”. Try a team, date, time, or venue.</li>}
      </ol>
      <p className="schedule-note">All games are played on Saturdays at outdoor venues. Extreme weather may shorten or cancel games. Check league updates before you leave.</p>
      <section className="venue-directory" aria-labelledby="venue-directory-title">
        <header className="section-heading">
          <div>
            <h2 id="venue-directory-title">Game venues</h2>
            <p className="section-intro">Find directions to every NYSL field.</p>
          </div>
        </header>
        <ul className="venue-directory-list">
          {Object.entries(data.locations).map(([key, location]) => (
            <li key={key}>
              <Icon name="map-pin" size={21} />
              <span><strong>{location.name}</strong><small>{location.address}</small></span>
              <a href={location.mapUrl} target="_blank" rel="noreferrer">Directions <Icon name="arrow-up-right" size={16} /></a>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
