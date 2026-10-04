import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function PrivatePage({ children }) {
  return (
    <section className="private-page" aria-labelledby="private-title">
      <span className="heading-mark"><Icon name="log-in" size={20} /></span>
      <div>
        <h2 id="private-title">Sign in to continue</h2>
        <p>Game messages and photos are available to families and league members with Google sign-in.</p>
        <Link className="text-link" to="/schedule">Back to the schedule <Icon name="arrow-right" size={16} /></Link>
      </div>
      {children}
    </section>
  );
}
