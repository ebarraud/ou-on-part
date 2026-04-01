'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Check if dismissed recently
    const lastDismissed = localStorage.getItem('install-prompt-dismissed');
    if (lastDismissed) {
      const diff = Date.now() - parseInt(lastDismissed, 10);
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        // Don't show for 7 days after dismissal
        setDismissed(true);
        return;
      }
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    // Listen for beforeinstallprompt (Android / Chrome desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIOSTip(false);
    localStorage.setItem('install-prompt-dismissed', String(Date.now()));
  };

  // Already installed or dismissed
  if (dismissed) return null;
  // Nothing to show (no prompt event and not iOS)
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      {/* Android / Chrome — native install prompt */}
      {deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto bg-white border border-gray-200 rounded-btn shadow-lg p-4 z-50 animate-in slide-in-from-bottom">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Installer l&apos;app</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Ajoute &quot;Où on part ?&quot; sur ton écran d&apos;accueil pour un accès rapide
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 text-xs text-gray-500 rounded-btn border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Plus tard
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-2 text-xs font-semibold text-white bg-primary rounded-btn hover:bg-primary-dark transition-colors"
            >
              Installer
            </button>
          </div>
        </div>
      )}

      {/* iOS — show tip for manual install */}
      {isIOS && !deferredPrompt && (
        <>
          {!showIOSTip ? (
            <button
              onClick={() => setShowIOSTip(true)}
              className="fixed bottom-4 right-4 bg-primary text-white rounded-full px-4 py-2.5 shadow-lg text-xs font-semibold z-50 flex items-center gap-1.5 hover:bg-primary-dark transition-colors"
            >
              <span>📱</span> Installer l&apos;app
            </button>
          ) : (
            <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto bg-white border border-gray-200 rounded-btn shadow-lg p-4 z-50">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📱</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Installer sur iPhone</p>
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    <p>1. Appuie sur le bouton <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">⬆️ Partager</span> en bas de Safari</p>
                    <p>2. Choisis <strong>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong></p>
                    <p>3. Appuie sur <strong>&quot;Ajouter&quot;</strong></p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>
              <button
                onClick={handleDismiss}
                className="mt-3 w-full py-2 text-xs text-gray-500 rounded-btn border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                J&apos;ai compris
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
