import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function Navigation() {
  const { pathname } = useLocation();
  const leagueMenuRef = useRef(null);
  const leaguePage = ['/about', '/contact', '/rules', '/registration'].includes(pathname);
  const closeMenu = () => {
    if (leagueMenuRef.current) leagueMenuRef.current.open = false;
  };

  useEffect(() => {
    const closeOnOutsidePress = (event) => {
      const menu = leagueMenuRef.current;
      if (menu && !menu.contains(event.target)) menu.open = false;
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && leagueMenuRef.current?.open) {
        closeMenu();
        leagueMenuRef.current.querySelector('summary')?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (leagueMenuRef.current) leagueMenuRef.current.open = false;
  }, [pathname]);

  return (
    <nav className="nav nav-pills app-nav" aria-label="Main navigation">
      <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/" end>
        <Icon name="house" size={18} /> Home
      </NavLink>
      <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/schedule">
        <Icon name="calendar-days" size={18} /> Schedule
      </NavLink>
      <details ref={leagueMenuRef} className={`league-menu${leaguePage ? ' active' : ''}`}>
        <summary className={`league-menu-summary${leaguePage ? ' active' : ''}`}>
          League info <span className="league-menu-caret" aria-hidden="true" />
        </summary>
        <div className="league-menu-panel">
          <NavLink to="/about" onClick={closeMenu}>About NYSL</NavLink>
          <NavLink to="/rules" onClick={closeMenu}>Rules and Policies</NavLink>
          <NavLink to="/contact" onClick={closeMenu}>Contact</NavLink>
          <NavLink to="/registration" onClick={closeMenu}>Player Registration</NavLink>
        </div>
      </details>
    </nav>
  );
}
