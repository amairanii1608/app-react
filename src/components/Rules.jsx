import rulesContent from '../data/rules-content.html?raw';

export default function Rules() {
  return (
    <section className="information-page rules-page" aria-labelledby="rules-title">
      <header className="page-heading">
        <h1 id="rules-title">Rules and policies</h1>
        <p>FIFA rules govern NYSL play except where the league policies below modify them.</p>
      </header>
      <article className="rules-content" dangerouslySetInnerHTML={{ __html: rulesContent }} />
    </section>
  );
}
