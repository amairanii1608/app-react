import { useEffect, useState } from 'react';

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    if (standalone.matches || window.navigator.standalone) return undefined;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(() => event);
    };
    const handleInstalled = () => setInstallPrompt(null);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!installPrompt) return null;

  const install = async () => {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <button className="install-app-button" type="button" onClick={install}>
      Install app
    </button>
  );
}
