import data from '../data/nysl.json';
import Icon from './Icon.jsx';

export default function Contact() {
  return (
    <section className="information-page" aria-labelledby="contact-page-title">
      <header className="page-heading">
        <h1 id="contact-page-title">Contact NYSL</h1>
        <p>Questions about games, venues, or registration? Contact the league.</p>
      </header>
      <div className="contact-details">
        <section>
          <h2>General inquiries</h2>
          <a className="contact-detail-link" href={`mailto:${data.contact.email}`}>
            <Icon name="mail" size={23} /> {data.contact.email}
          </a>
          <p>{data.contact.replyNote}</p>
        </section>
        <section>
          <h2>League coordinator</h2>
          <p>Michael Randall, League Coordinator</p>
          <a className="contact-detail-link" href="tel:+16306908132">(630) 690-8132</a>
          <a className="contact-detail-link" href="mailto:michael.randall@chisoccer.org">michael.randall@chisoccer.org</a>
        </section>
      </div>
    </section>
  );
}
