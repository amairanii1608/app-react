import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { limitToLast, orderByChild, query, ref } from '@firebase/database';
import { database, deleteOwnCommunityItem, publishMessage, reportCommunityItem, useRealtimeList, useUserState } from '../firebase.jsx';
import { formatDateTime, formatGameDate } from '../utilities/dates.js';
import { formatAuthorName } from '../utilities/names.js';
import Icon from './Icon.jsx';

export default function Messages() {
  const { game, gameId, postingEnabled } = useOutletContext();
  const { user } = useUserState();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [actionFeedbackError, setActionFeedbackError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [busyItemId, setBusyItemId] = useState('');
  const listEndRef = useRef(null);
  const actionFeedbackRef = useRef(null);
  const shouldScrollRef = useRef(false);
  const didInitialScrollRef = useRef(false);
  const messagesQuery = useMemo(() => (
    database
      ? query(ref(database, `messages/${gameId}`), orderByChild('timestamp'), limitToLast(100))
      : null
  ), [gameId]);
  const [snapshots, loading, error] = useRealtimeList(messagesQuery, retryKey);
  const hiddenQuery = useMemo(() => (database ? ref(database, `moderation/hidden/messages/${gameId}`) : null), [gameId]);
  const [hiddenSnapshots] = useRealtimeList(hiddenQuery);
  const hiddenIds = useMemo(() => new Set(hiddenSnapshots.map((snapshot) => snapshot.key)), [hiddenSnapshots]);

  const messages = useMemo(() => snapshots
    .map((snapshot) => ({ id: snapshot.key, ...snapshot.val() }))
    .filter((message) => !hiddenIds.has(message.id))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)), [snapshots, hiddenIds]);

  useEffect(() => {
    if (actionFeedback) actionFeedbackRef.current?.focus({ preventScroll: true });
  }, [actionFeedback]);

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
      setFeedback(publishError.code === 'community/blocked'
        ? publishError.message
        : publishError.message?.startsWith('Limit reached:')
        ? publishError.message
        : 'Your message could not be posted. Check your connection and try again.');
      setFeedbackError(true);
    } finally {
      setPosting(false);
    }
  }

  async function handleRemove(message) {
    if (!window.confirm('Remove your message from this game? This cannot be undone.')) return;
    setBusyItemId(message.id);
    setActionFeedback('');
    try {
      await deleteOwnCommunityItem('messages', gameId, message.id, user);
      setActionFeedback('Your message was removed.');
      setActionFeedbackError(false);
    } catch {
      setActionFeedback('Your message could not be removed. Check your connection and try again.');
      setActionFeedbackError(true);
    } finally { setBusyItemId(''); }
  }

  async function handleReport(message) {
    if (!window.confirm('Report this message? It will be hidden while it is reviewed.')) return;
    setBusyItemId(message.id);
    setActionFeedback('');
    try {
      await reportCommunityItem('messages', gameId, message.id, user);
      setActionFeedback('Message reported and hidden for review.');
      setActionFeedbackError(false);
    } catch (reportError) {
      setActionFeedback(reportError.message?.startsWith('Limit reached:')
        ? reportError.message
        : 'The message could not be reported. You may have already reported it.');
      setActionFeedbackError(true);
    } finally { setBusyItemId(''); }
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

      {actionFeedback && <p ref={actionFeedbackRef} className={`community-action-status${actionFeedbackError ? ' is-error' : ''}`} tabIndex="-1" role={actionFeedbackError ? 'alert' : 'status'} aria-live={actionFeedbackError ? 'assertive' : 'polite'}>{actionFeedback}</p>}

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
                <strong>{formatAuthorName(message.author)}</strong>
                  <time>{formatDateTime(message.timestamp)}</time>
                </div>
                <p>{message.text}</p>
                {user && <div className="community-item-actions">
                  {message.authorUid === user.uid ? (
                    <button className="text-button community-action delete-action" type="button" onClick={() => handleRemove(message)} disabled={busyItemId === message.id}>
                      {busyItemId === message.id ? 'Working…' : 'Delete my message'}
                    </button>
                  ) : (
                    <button className="text-button community-action report-action" type="button" onClick={() => handleReport(message)} disabled={busyItemId === message.id}>
                      {busyItemId === message.id ? 'Working…' : 'Report message'}
                    </button>
                  )}
                </div>}
              </article>
            </li>
          ))}
          <li className="message-list-end" ref={listEndRef} aria-hidden="true" />
        </ol>
      </div>

      {postingEnabled ? <form className="message-form" onSubmit={handleSubmit}>
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
        <p className="rate-limit-note">Up to five messages and photos combined every 30 seconds; up to two reports every 10 seconds.</p>
        <p className="form-feedback" role={feedbackError ? 'alert' : 'status'} aria-live={feedbackError ? 'assertive' : 'polite'}>{feedback}</p>
      </form> : !user && <aside className="guest-post-prompt">
        <p>Messages are visible to everyone. Sign in above to post your own.</p>
        <a className="text-link" href="#sign-in">Go to Sign in <Icon name="arrow-right" size={16} /></a>
      </aside>}
    </section>
  );
}
