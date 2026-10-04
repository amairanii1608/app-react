import { Link } from 'react-router-dom';
import data from '../data/nysl.json';
import { formatGameDate } from '../utilities/dates.js';
import Icon from './Icon.jsx';

const [firstGameId, firstGame] = Object.entries(data.games)[0];
const firstVenue = data.locations[firstGame.locationKey];

export default function Home() {
  return (
    <div className="home-grid">
      <section className="fixture-panel" aria-labelledby="next-game-title">
        <header className="fixture-heading">
          <h1 id="next-game-title">Next game</h1>
        </header>

        <div className="fixture-body">
            <div className="fixture-teams" aria-label={`${firstGame.teams[0]} versus ${firstGame.teams[1]}`}>
            <strong>{firstGame.teams[0]}</strong>
            <span>vs.</span>
            <strong>{firstGame.teams[1]}</strong>
          </div>
          <div className="fixture-facts">
            <div><Icon name="calendar-days" size={28} /><strong>{formatGameDate(firstGame.date)}</strong></div>
            <div><Icon name="clock" size={29} /><strong>{firstGame.time}</strong></div>
            <div className="fixture-location">
              <Icon name="map-pin" size={31} />
              <span><strong>{firstVenue.name}</strong><small>{firstVenue.address}</small></span>
            </div>
          </div>
        </div>

        <div className="route-panel">
          <span className="route-line" aria-hidden="true"><Icon name="map-pin-solid" size={58} /></span>
            <Link className="route-primary" to={`/game/${firstGameId}`}>View game</Link>
          <a className="route-secondary" href={firstVenue.mapUrl} target="_blank" rel="noreferrer">Get directions</a>
        </div>
      </section>

      <div className="home-side">
        <section className="notices-panel" aria-labelledby="announcements-title">
          <header className="notices-heading"><h2 id="announcements-title">League updates</h2></header>
          <div className="notices-body">
            <div className="announcement-list">
              {data.announcements.map((announcement) => (
                <article className="announcement-row" key={announcement.date}>
                  <time>{announcement.date}</time>
                  <h3>{announcement.title}</h3>
                </article>
              ))}
            </div>
            {data.announcements.some((announcement) => announcement.detail) && (
              <p className="announcement-detail">{data.announcements.find((announcement) => announcement.detail).detail}</p>
            )}
          </div>
        </section>

        <section className="contact-panel" aria-labelledby="contact-title">
          <h2 id="contact-title">Contact NYSL</h2>
          <a href={`mailto:${data.contact.email}`}><Icon name="mail" size={41} />{data.contact.email}</a>
          <p>{data.contact.replyNote}</p>
        </section>
      </div>
    </div>
  );
}
