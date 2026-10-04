import { useState } from 'react';
import { Link } from 'react-router-dom';
import { database, publishRegistration, useUserState } from '../firebase.jsx';
import Icon from './Icon.jsx';

const schools = [
  'AJ Katzenmaier',
  'Marjorie P Hart',
  'Greenbay',
  'North Elementary',
  'Howard A Yeager',
  'South Elementary',
];
const positions = ['Forward', 'Midfield', 'Defense', 'Goalkeeper'];
const grades = ['Pre-School', '1st', '2nd', '3rd', '4th', '5th'];
const sizes = ['Youth Small', 'Youth Medium', 'Youth Large', 'Small', 'Medium', 'Large', 'Extra-Large'];

function currentSeason() {
  const now = new Date();
  const month = now.getMonth();
  const season = month < 2 || month === 11 ? 'Winter'
    : month < 5 ? 'Spring' : month < 8 ? 'Summer' : 'Fall';
  return `${season} ${now.getFullYear()}`;
}

function currentLocalDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isEligibleBirthDate(value) {
  const birthDate = new Date(`${value}T00:00:00`);
  if (!value || Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== value) return false;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayHasNotPassed = today.getMonth() < birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (birthdayHasNotPassed) age -= 1;
  return age >= 4 && age <= 12;
}

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

export default function Registration() {
  const { user } = useUserState();
  const [posting, setPosting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [hasUniform, setHasUniform] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user || !database || posting) return;

    const form = event.currentTarget;
    form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]')
      .forEach((input) => { input.value = input.value.trim(); });
    const values = new FormData(form);
    const birthInput = form.elements.birthDate;
    const secondSchoolInput = form.elements.secondSchool;
    birthInput.setCustomValidity(isEligibleBirthDate(values.get('birthDate'))
      ? '' : 'Players must be between 4 and 12 years old.');
    secondSchoolInput.setCustomValidity(values.get('firstSchool') !== values.get('secondSchool')
      ? '' : 'Choose two different schools.');
    if (!form.reportValidity()) return;

    setPosting(true);
    setFeedback('');
    try {
      await publishRegistration(user, {
        season: clean(values.get('season'), 24),
        firstName: clean(values.get('firstName'), 80),
        lastName: clean(values.get('lastName'), 80),
        address: clean(values.get('address'), 160),
        city: clean(values.get('city'), 80),
        zip: clean(values.get('zip'), 5),
        birthDate: clean(values.get('birthDate'), 10),
        gender: clean(values.get('gender'), 32),
        grade: clean(values.get('grade'), 32),
        parentName: clean(values.get('parentName'), 120),
        phone: clean(values.get('phone'), 24),
        email: clean(values.get('email'), 254),
        firstSchool: clean(values.get('firstSchool'), 80),
        secondSchool: clean(values.get('secondSchool'), 80),
        normalPositions: values.getAll('normalPositions').join(', '),
        wantedPositions: values.getAll('wantedPositions').join(', '),
        hasUniform,
        jerseySize: hasUniform ? '' : clean(values.get('jerseySize'), 24),
        shortsSize: hasUniform ? '' : clean(values.get('shortsSize'), 24),
        parentSignature: clean(values.get('parentSignature'), 120),
        signatureDate: clean(values.get('signatureDate'), 10),
        // Submitting the signed waiver is the explicit consent action.
        consent: true,
      });
      form.reset();
      setHasUniform(false);
      setFeedback('Registration saved to your private account. The league can review it in Firebase.');
    } catch (error) {
      setFeedback(error.code === 'PERMISSION_DENIED'
        ? 'Your registration was not saved. The Firebase database rules may need to be deployed.'
        : error.message || 'Your registration could not be saved. Check your connection and try again.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="information-page registration-page" aria-labelledby="registration-title">
      <header className="page-heading">
        <h1 id="registration-title">Player registration</h1>
        <p>Register one player for the current NYSL season.</p>
      </header>

      {!user && (
        <div className="registration-access" role="status">
          <Icon name="log-in" size={22} />
          <p>Sign in with Google before submitting. Your registration is stored in a private path tied to your account.</p>
        </div>
      )}
      {!database && <p className="setup-note">Firebase is not configured. Add the Firebase values from `.env.example` to enable registration.</p>}

      <form className="registration-form" onSubmit={handleSubmit}>
        <fieldset disabled={!user || !database || posting}>
          <legend>Player and parent information</legend>
          <label className="registration-field">Season
            <input name="season" defaultValue={currentSeason()} readOnly />
          </label>
          <div className="registration-grid">
            <label className="registration-field">Player’s first name
              <input name="firstName" autoComplete="given-name" maxLength={80} required />
            </label>
            <label className="registration-field">Player’s last name
              <input name="lastName" autoComplete="family-name" maxLength={80} required />
            </label>
            <label className="registration-field registration-wide">Street address
              <input name="address" autoComplete="street-address" maxLength={160} required />
            </label>
            <label className="registration-field">City
              <input name="city" autoComplete="address-level2" maxLength={80} required />
            </label>
            <label className="registration-field">ZIP code
              <input name="zip" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}" title="Enter a 5-digit ZIP code" maxLength={5} required />
            </label>
            <label className="registration-field">Birth date
              <input name="birthDate" type="date" required />
              <small>Players must be between 4 and 12 years old.</small>
            </label>
            <fieldset className="registration-choice">
              <legend>Gender</legend>
              <label><input type="radio" name="gender" value="female" required /> Female</label>
              <label><input type="radio" name="gender" value="male" /> Male</label>
            </fieldset>
            <fieldset className="registration-choice registration-wide">
              <legend>Grade</legend>
              {grades.map((grade) => <label key={grade}><input type="radio" name="grade" value={grade} required /> {grade}</label>)}
            </fieldset>
            <label className="registration-field registration-wide">Parent or guardian
              <input name="parentName" autoComplete="name" defaultValue={user?.displayName || ''} maxLength={120} required />
            </label>
            <label className="registration-field">Contact phone
              <input name="phone" type="tel" autoComplete="tel" pattern="[0-9()+. -]{7,24}" title="Enter a valid phone number" maxLength={24} required />
            </label>
            <label className="registration-field">Contact email
              <input name="email" type="email" autoComplete="email" defaultValue={user?.email || ''} maxLength={254} required />
            </label>
            <label className="registration-field">Closest school
              <select name="firstSchool" defaultValue="" required>
                <option value="" disabled>Select a school</option>
                {schools.map((school) => <option key={school}>{school}</option>)}
              </select>
            </label>
            <label className="registration-field">Second-closest school
              <select name="secondSchool" defaultValue="" required>
                <option value="" disabled>Select a different school</option>
                {schools.map((school) => <option key={school}>{school}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="registration-choice-group" disabled={!user || !database || posting}>
          <legend>Player positions</legend>
          <div className="registration-grid">
            <fieldset className="registration-choice">
              <legend>Positions played</legend>
              {positions.map((position) => <label key={position}><input type="checkbox" name="normalPositions" value={position} /> {position}</label>)}
            </fieldset>
            <fieldset className="registration-choice">
              <legend>Positions the player wants to play</legend>
              {positions.map((position) => <label key={position}><input type="checkbox" name="wantedPositions" value={position} /> {position}</label>)}
            </fieldset>
          </div>
        </fieldset>

        <fieldset className="registration-choice-group" disabled={!user || !database || posting}>
          <legend>Uniform</legend>
          <label className="registration-check"><input type="checkbox" checked={hasUniform} onChange={(event) => setHasUniform(event.target.checked)} /> The player already has a uniform</label>
          {!hasUniform && (
            <div className="registration-grid">
              {['Jersey size', 'Shorts size'].map((label) => {
                const name = label.startsWith('Jersey') ? 'jerseySize' : 'shortsSize';
                return (
                  <fieldset className="registration-choice" key={name}>
                    <legend>{label}</legend>
                    {sizes.map((size) => <label key={size}><input type="radio" name={name} value={size} required /> {size}</label>)}
                  </fieldset>
                );
              })}
            </div>
          )}
        </fieldset>

        <fieldset className="registration-waiver" disabled={!user || !database || posting}>
          <legend>Permission to play</legend>
          <p>I, the parent or guardian of the minor registrant, agree that the registrant and I will abide by all the rules of the Northside Youth Soccer League (NYSL). In recognizing the possibility of physical injury associated with soccer and in consideration for the “League” accepting the registrant for its soccer programs and activities, I hereby release, discharge, and/or otherwise indemnify NYSL, their employees and associated personnel and volunteers, including the facilities used for practices and games, against any claim by or on behalf of the registrant as a result of the registrant’s participation in the program and/or being transported to or from NYSL sponsored activities, which transportation.</p>
          <p>By entering your name below, I hereby agree and authorize the above. In addition, by signing below, I also acknowledge that I have read the cancellation policy and agree to its terms.</p>
          <p>Please <Link to="/contact">contact the league</Link> to request its current cancellation policy before signing.</p>
          <div className="registration-grid">
            <label className="registration-field">Parent or guardian signature
              <input name="parentSignature" autoComplete="name" maxLength={120} required />
            </label>
            <label className="registration-field">Date
              <input name="signatureDate" type="date" defaultValue={currentLocalDate()} required />
            </label>
          </div>
        </fieldset>

        <div className="registration-submit">
          <p className="form-feedback" role="status" aria-live="polite">{feedback}</p>
          <button className="btn primary-action" type="submit" disabled={!user || !database || posting}>
            <Icon name="send" size={17} /> {posting ? 'Saving…' : 'Submit registration'}
          </button>
        </div>
        <p className="private-firebase-note">Registration details are visible only to the signed-in account that submitted them. Authorized NYSL administrators can review submissions in Firebase Console.</p>
      </form>
    </section>
  );
}
