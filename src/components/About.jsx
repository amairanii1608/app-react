export default function About() {
  return (
    <section className="information-page" aria-labelledby="about-title">
      <header className="page-heading">
        <h1 id="about-title">About NYSL</h1>
        <p>A neighborhood league built around learning, teamwork, and fair play.</p>
      </header>
      <div className="information-copy">
        <section aria-labelledby="mission-title">
          <h2 id="mission-title">Our mission</h2>
          <p>We support young athletes in Chicago’s North Side neighborhoods who want to learn and play soccer. NYSL gives players opportunities to build soccer skills, cooperate as a team, and practice good sportsmanship.</p>
        </section>
        <section aria-labelledby="vision-title">
          <h2 id="vision-title">Our vision</h2>
          <p>NYSL helps young athletes grow into strong, well-rounded, and mindful people through character, self-discipline, and leadership.</p>
        </section>
        <section aria-labelledby="history-title">
          <h2 id="history-title">League history</h2>
          <p>Founded in 1996, the Northside Youth Soccer League serves athletes ages 4–12 who live in Chicago’s North Side neighborhoods. The league is supported by a small full-time staff and the generous volunteer time of parents and former members.</p>
        </section>
      </div>
    </section>
  );
}
