import React, { useState, useEffect } from 'react';
import styles from '../styles/CookieBanner.module.css';

interface Preferences {
  analytics: boolean;
  ads: boolean;
  behavioralAds: boolean;  // nuevo
  social: boolean;
  affiliate: boolean;
  security: boolean;
}

interface CookieBannerProps {
  onPersonalize: () => void;
}

const defaultPreferences: Preferences = {
  analytics: false,
  ads: false,
  behavioralAds: false,  // nuevo
  social: false,
  affiliate: false,
  security: false,
};

const CookieBanner: React.FC<CookieBannerProps> = ({ onPersonalize }) => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      analytics: true,
      ads: true,
      behavioralAds: true,  // nuevo
      social: true,
      affiliate: true,
      security: true,
    };
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(defaultPreferences));
    setShowBanner(false);
  };

  return (
    showBanner && (
      <div className={styles.cookieBanner}>
        <p>
          Usamos cookies para optimizar nuestro sitio web y servicio. Puedes personalizar tus preferencias o aceptar todas.{' '}
          <a href="/politica-cookies" target="_blank" rel="noopener noreferrer">Política de Cookies</a>
        </p>
        <div className={styles.buttons}>
          <button onClick={handleAcceptAll}>Aceptar todas</button>
          <button onClick={handleRejectAll}>Rechazar todas</button>
          <button onClick={onPersonalize}>Personalizar</button>
        </div>
      </div>
    )
  );
};

export default CookieBanner;
