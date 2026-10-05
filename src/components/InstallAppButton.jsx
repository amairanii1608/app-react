import { useEffect, useState } from 'react';

function manualInstallInstructions() {
  if (!window.isSecureContext) {
    return 'Open the secure HTTPS version of NYSL to install it. On iPhone or iPad, use Safari and choose Share, then Add to Home Screen.';
  }

  const userAgent = window.navigator.userAgent;
  const isAppleMobile = /iphone|ipad|ipod/i.test(userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  return isAppleMobile
    ? 'In Safari, tap Share, then Add to Home Screen.'
    : 'Open your browser menu and choose Install app or Add to Home screen.';
}

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installHelp, setInstallHelp] = useState('');
  const [installed, setInstalled] = useState(() => (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  ));

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      if (standalone.matches) setInstalled(true);
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(() => event);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    standalone.addEventListener?.('change', handleDisplayModeChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      standalone.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!installPrompt) {
      setInstallHelp((help) => help ? '' : manualInstallInstructions());
      return;
    }

    const prompt = installPrompt;
    setInstallPrompt(null);
    setInstallHelp('');
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome !== 'accepted') setInstallHelp(manualInstallInstructions());
    } catch {
      setInstallHelp(manualInstallInstructions());
    }
  };

  return (
    <div className="install-control">
      <button
        className="install-app-button"
        type="button"
        onClick={install}
        aria-expanded={Boolean(installHelp)}
        aria-describedby={installHelp ? 'install-help' : undefined}
      >
        Install app
      </button>
      {installHelp && <p className="install-help" id="install-help" role="status">{installHelp}</p>}
    </div>
  );
}
