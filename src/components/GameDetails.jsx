import { useOutletContext } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function GameDetails() {
  const { location } = useOutletContext();

  return (
    <section className="game-detail-section" aria-labelledby="venue-title">
      <div className="section-heading">
        <div>
          <h2 id="venue-title">Game venue</h2>
          <p className="section-intro">{location.address}</p>
        </div>
        <a className="map-directions" href={location.mapUrl} target="_blank" rel="noreferrer">
          Get directions <Icon name="arrow-up-right" size={16} />
        </a>
      </div>
      <div className="map-frame">
        <iframe
          src={location.mapEmbedUrl}
          title={`Map of ${location.name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </section>
  );
}
