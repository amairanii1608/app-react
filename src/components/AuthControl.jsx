import { useState } from 'react';
import { firebaseConfigured, signInWithGoogle, signOutUser, useUserState } from '../firebase.jsx';
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
  return error?.message || 'Sign-in could not be completed. Try again.';
}

export default function AuthControl() {
  const { user, loading, error: stateError } = useUserState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const currentError = error || stateError;

  async function handleAuthAction() {
    setBusy(true);
    setError(null);
    try {
      if (user) await signOutUser();
      else await signInWithGoogle();
    } catch (nextError) {
      setError(nextError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-control">
      <button
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
      {!firebaseConfigured && <span className="auth-config-note">Firebase setup required</span>}
      {currentError && (
        <>
          <span className="visually-hidden" aria-live="polite">{readableAuthError(currentError)}</span>
          <p className="auth-error" role="status">{readableAuthError(currentError)}</p>
        </>
      )}
    </div>
  );
}
