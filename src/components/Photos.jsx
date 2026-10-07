import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { limitToLast, orderByChild, query, ref } from '@firebase/database';
import { cloudinaryConfigured, database, publishPicture, uploadPicture, useRealtimeList, useUserState } from '../firebase.jsx';
import { formatGameDate, formatPhotoDate } from '../utilities/dates.js';
import Icon from './Icon.jsx';

export default function Photos() {
  const { game, gameId } = useOutletContext();
  const { user } = useUserState();
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadedAsset, setUploadedAsset] = useState(null);
  const [failedImageIds, setFailedImageIds] = useState(() => new Set());
  const [pendingPictureId, setPendingPictureId] = useState(null);
  const [highlightedPictureId, setHighlightedPictureId] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const fileInputRef = useRef(null);
  const picturesQuery = useMemo(() => (
    database
      ? query(ref(database, `pictures/${gameId}`), orderByChild('timestamp'), limitToLast(100))
      : null
  ), [gameId]);
  const [snapshots, loading, error] = useRealtimeList(picturesQuery, retryKey);

  const pictures = useMemo(() => snapshots
    .map((snapshot) => ({ id: snapshot.key, ...snapshot.val() }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)), [snapshots]);

  useEffect(() => {
    if (!pendingPictureId || !pictures.some((picture) => picture.id === pendingPictureId)) return undefined;
    const card = document.getElementById(`photo-${pendingPictureId}`);
    if (!card) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'instant' : 'smooth' });
    setHighlightedPictureId(pendingPictureId);
    const timeoutId = window.setTimeout(() => setHighlightedPictureId(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [pictures, pendingPictureId]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || posting || !cloudinaryConfigured) return;

    setPosting(true);
    setFeedback('Uploading photo…');
    setFeedbackError(false);
    let uploadedUrl = uploadedAsset?.file === file ? uploadedAsset.url : '';
    try {
      if (!uploadedUrl) {
        uploadedUrl = await uploadPicture(file);
        setUploadedAsset({ file, url: uploadedUrl });
      }
      const savedPicture = await publishPicture(gameId, user, { url: uploadedUrl, caption });
      setPendingPictureId(savedPicture.key);
      setUploadedAsset(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setCaption('');
      setFeedback(`Photo added to the ${game.teams[0]} vs. ${game.teams[1]} gallery.`);
      setFeedbackError(false);
    } catch (publishError) {
      setFeedback(uploadedUrl
        ? 'The photo reached Cloudinary but could not be saved to the gallery. Check your connection before trying again.'
        : 'The photo could not be uploaded. Check your connection and try again.');
      setFeedbackError(true);
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="community-section photo-section" aria-labelledby="photos-title">
      <div className="section-heading">
        <div>
          <p className="game-context-label">{game.teams[0]} vs. {game.teams[1]} / {formatGameDate(game.date)} / {game.time}</p>
          <h2 id="photos-title">Game photos</h2>
        </div>
        <span className="heading-mark"><Icon name="image-plus" size={20} /></span>
      </div>

      {user ? <form className="photo-form" onSubmit={handleSubmit}>
        <div className="photo-form-heading">
          <div>
            <h3>Share a moment</h3>
            <p>Add a game photo and, if you like, a short caption.</p>
          </div>
          <Icon name="camera" size={22} />
        </div>
        <label className="file-picker" htmlFor="photo-input">
          <Icon name="image-plus" size={20} />
          <span>{file ? 'Change photo' : 'Choose or take a photo'}</span>
          <input
            className="visually-hidden"
            id="photo-input"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              setFile(nextFile);
              if (nextFile !== uploadedAsset?.file) setUploadedAsset(null);
              setFeedback('');
              setFeedbackError(false);
            }}
            disabled={posting}
          />
        </label>
        {file && (
          <div className="photo-preview">
            <img src={previewUrl} alt="Preview of the selected photo" />
            <p>{file.name}</p>
            <button className="text-button" type="button" onClick={() => {
              setFile(null);
              setUploadedAsset(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }} disabled={posting}>Remove photo</button>
          </div>
        )}
        <label className="visually-hidden" htmlFor="photo-caption">Photo caption (optional)</label>
        <input
          className="form-control caption-input"
          id="photo-caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value.slice(0, 160))}
          placeholder="Add a caption (optional)"
          maxLength={160}
          disabled={posting}
        />
        <div className="photo-form-footer">
          <p className="form-feedback" role={feedbackError ? 'alert' : 'status'} aria-live={feedbackError ? 'assertive' : 'polite'}>{feedback}</p>
          <button className="btn primary-action" type="submit" disabled={!file || posting || !cloudinaryConfigured}>
            <Icon name="image-plus" size={17} /> {posting ? 'Posting…' : 'Post photo'}
          </button>
        </div>
        {!cloudinaryConfigured && <p className="setup-note">Cloudinary is not configured. See the setup guide in the project folder.</p>}
      </form> : <aside className="guest-post-prompt">
        <p>Photos are visible to everyone. Sign in above to upload your own.</p>
        <a className="text-link" href="#sign-in">Go to Sign in <Icon name="arrow-right" size={16} /></a>
      </aside>}

      <div className="photo-gallery-heading">
        <h3>Gallery</h3>
        {loading ? <span role="status">Loading gallery…</span> : !error && (
          <span role="status" aria-live="polite">{pictures.length} {pictures.length === 1 ? 'photo' : 'photos'}</span>
        )}
      </div>
      {loading && <p className="state-message" role="status">Loading photos…</p>}
      {error && (
        <div className="community-error">
          <p className="state-message error-message" role="alert">Photos could not be loaded. Check your connection and try again.</p>
          <button className="text-button retry-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>Try again</button>
        </div>
      )}
      {!loading && !error && pictures.length === 0 && (
        <div className="empty-state gallery-empty">
          <Icon name="camera" size={25} />
          <h3>The gallery is ready</h3>
          <p>Photos shared by the community will appear here.</p>
        </div>
      )}
      <div className="photo-gallery">
        {pictures.map((picture) => (
          <article
            className={`photo-card${highlightedPictureId === picture.id ? ' newly-added' : ''}`}
            id={`photo-${picture.id}`}
            key={picture.id}
          >
            {failedImageIds.has(picture.id) ? (
              <p className="photo-image-error" role="status">This photo is saved, but its image could not be loaded.</p>
            ) : (
              <img
                src={picture.url}
                alt={picture.caption || `Photo shared by ${picture.author || 'an NYSL family'}`}
                loading="lazy"
                onError={() => setFailedImageIds((ids) => new Set(ids).add(picture.id))}
              />
            )}
            <div className="photo-card-caption">
              {picture.caption && <p>{picture.caption}</p>}
              <div className="photo-meta">
                <strong>{picture.author || 'NYSL family'}</strong>
                <time>{formatPhotoDate(picture.timestamp)}</time>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
