import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { limitToLast, orderByChild, query, ref } from '@firebase/database';
import { database, publishMessage, useRealtimeList, useUserState } from '../firebase.jsx';
import { formatGameDate, formatMessageTime } from '../utilities/dates.js';
import Icon from './Icon.jsx';

export default function Messages() {
  const { game, gameId } = useOutletContext();
  const { user } = useUserState();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const listEndRef = useRef(null);
  const shouldScrollRef = useRef(false);
  const didInitialScrollRef = useRef(false);
  const messagesQuery = useMemo(() => (
    database && user
      ? query(ref(database, `messages/${gameId}`), orderByChild('timestamp'), limitToLast(100))
      : null
  ), [gameId, user]);
  const [snapshots, loading, error] = useRealtimeList(messagesQuery, retryKey);

  const messages = useMemo(() => snapshots
    .map((snapshot) => ({ id: snapshot.key, ...snapshot.val() }))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)), [snapshots]);

  useEffect(() => {
    if (loading || !messages.length) return;
    if (!didInitialScrollRef.current || shouldScrollRef.current) {
      listEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
      didInitialScrollRef.current = true;
      shouldScrollRef.current = false;
    }
  }, [loading, messages]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!text.trim() || posting) return;

    shouldScrollRef.current = true;
    setPosting(true);
    setFeedback('');
    setFeedbackError(false);
    try {
      await publishMessage(gameId, user, text);
      setText('');
      setFeedback(`Message posted to ${game.teams[0]} vs. ${game.teams[1]}.`);
      setFeedbackError(false);
    } catch (publishError) {
      shouldScrollRef.current = false;
      setFeedback(publishError.message || 'The message could not be posted. Try again.');
      setFeedbackError(true);
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="community-section" aria-labelledby="messages-title">
      <div className="section-heading">
        <div>
          <p className="game-context-label">{game.teams[0]} vs. {game.teams[1]} / {formatGameDate(game.date)} / {game.time}</p>
          <h2 id="messages-title">Game messages</h2>
        </div>
        <span className="heading-mark"><Icon name="message-circle" size={20} /></span>
      </div>

      <div className="message-panel">
        {loading && <p className="state-message" role="status">Loading messages…</p>}
        {error && (
          <div className="community-error">
            <p className="state-message error-message" role="alert">Messages could not be loaded. Check your connection and try again.</p>
            <button className="text-button retry-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>Try again</button>
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="empty-state">
            <Icon name="message-circle" size={25} />
            <h3>Start the conversation</h3>
            <p>Share a useful update or cheer on your team.</p>
          </div>
        )}
        <ol className="message-list" aria-label="Messages in chronological order">
          {messages.map((message) => (
            <li className={`message-item${message.authorUid === user?.uid ? ' own-message' : ''}`} key={message.id}>
              <article className="message-bubble">
                <div className="message-meta">
                <strong>{message.author || 'NYSL family'}</strong>
                  <time>{formatMessageTime(message.timestamp)}</time>
                </div>
                <p>{message.text}</p>
              </article>
            </li>
          ))}
          <li className="message-list-end" ref={listEndRef} aria-hidden="true" />
        </ol>
      </div>

      <form className="message-form" onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="message-input">Write a message for this game</label>
        <textarea
          id="message-input"
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 500))}
          placeholder="Write a short update"
          maxLength={500}
          rows={2}
          disabled={posting || loading || Boolean(error)}
          required
        />
        <div className="message-form-footer">
          <span className="character-count">{text.length}/500</span>
          <button className="btn primary-action" type="submit" disabled={posting || !text.trim() || Boolean(error)}>
            <Icon name="send" size={17} /> {posting ? 'Posting…' : 'Send'}
          </button>
        </div>
        <p className="form-feedback" role={feedbackError ? 'alert' : 'status'} aria-live={feedbackError ? 'assertive' : 'polite'}>{feedback}</p>
      </form>
    </section>
  );
}
