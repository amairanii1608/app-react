import { useEffect, useState } from 'react';
import { auth, firebaseConfigured, signInWithGoogle, signOutUser, useUserState } from '../firebase.jsx';
import Icon from './Icon.jsx';

function readableAuthError(error) {
  if (error?.code === 'auth/unauthorized-domain') {
    return 'Add this domain to the authorized domains in Firebase.';
  }
  if (error?.code === 'auth/operation-not-allowed') {
    return 'Enable Google sign-in in Firebase Authentication.';
  }
  if (error?.code === 'auth/popup-blocked') {
    return 'Allow pop-ups and try again.';
  }
  if (error?.code === 'auth/popup-closed-by-user') return 'The sign-in window was closed.';
  return `Sign-in could not be completed${error?.code ? ` (${error.code})` : ''}. Try again.`;
}

export default function AuthControl() {
  const { user, loading, error: stateError, sessionNotice, clearAuthError } = useUserState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const currentError = error || stateError;
  const firstName = user?.displayName?.trim().split(/\s+/)[0] || user?.email?.split('@')[0] || 'there';
  useEffect(() => {
    if (user) setError(null);
  }, [user]);
  useEffect(() => {
    if (!currentError) return undefined;
    const timeout = window.setTimeout(() => { setError(null); clearAuthError(); }, 3000);
    return () => window.clearTimeout(timeout);
  }, [currentError, clearAuthError]);

  async function handleAuthAction() {
    const wasSignedIn = Boolean(user);
    setBusy(true);
    setError(null);
    try {
      if (user) await signOutUser();
      else await signInWithGoogle();
    } catch (nextError) {
      if (wasSignedIn || !auth?.currentUser) setError(nextError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-control">
      <button
        id="sign-in"
        className={`btn auth-button${user ? ' signed-in' : ''}`}
        type="button"
        onClick={handleAuthAction}
        disabled={loading || busy || (!firebaseConfigured && !user)}
        aria-label={user ? `Sign out, ${user.displayName || user.email || ''}` : 'Sign in with Google'}
        title={!firebaseConfigured ? 'Configure Firebase to enable sign-in' : undefined}
      >
        <Icon name={user ? 'log-out' : 'log-in'} size={18} />
        <span>{loading ? 'Checking…' : busy ? 'Please wait' : user ? 'Sign out' : 'Sign in'}</span>
      </button>
      {user && <p className="auth-session-label" role="status"><strong>Welcome, {firstName}</strong><span>Signed in</span></p>}
      {!firebaseConfigured && <span className="auth-config-note">Firebase setup required</span>}
      {sessionNotice && <p className="auth-session-notice" role="status">{sessionNotice}</p>}
      {currentError && (
        <div className="auth-error" role="alert"><p>{readableAuthError(currentError)}</p><button type="button" onClick={() => { setError(null); clearAuthError(); }}>Dismiss</button></div>
      )}
    </div>
  );
}
