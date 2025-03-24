import React, { useState, useEffect } from 'react';
import styles from '../styles/CookiePreferencesModal.module.css';

interface Preferences {
  analytics: boolean;
  ads: boolean;
  behavioralAds: boolean; // nuevo
  social: boolean;
  affiliate: boolean;
  security: boolean;
}

interface CookiePreferencesModalProps {
  onClose: () => void;
}

const defaultPreferences: Preferences = {
  analytics: false,
  ads: false,
  behavioralAds: false, // nuevo
  social: false,
  affiliate: false,
  security: false,
};

const CookiePreferencesModal: React.FC<CookiePreferencesModalProps> = ({ onClose }) => {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  useEffect(() => {
    const stored = localStorage.getItem('cookieConsent');
    if (stored) {
      setPreferences(JSON.parse(stored));
    }
  }, []);

  const handlePreferenceChange = (type: keyof Preferences) => {
    setPreferences((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSave = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences));
    onClose();
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h2>Preferencias de Cookies</h2>
        <label>
          <input type="checkbox" checked disabled />
          Cookies Técnicas y Funcionales (necesarias)
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.analytics}
            onChange={() => handlePreferenceChange('analytics')}
          />
          Cookies Analíticas
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.ads}
            onChange={() => handlePreferenceChange('ads')}
          />
          Cookies Publicitarias
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.behavioralAds}
            onChange={() => handlePreferenceChange('behavioralAds')}
          />
          Cookies de Publicidad Comportamental
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.social}
            onChange={() => handlePreferenceChange('social')}
          />
          Cookies Sociales
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.affiliate}
            onChange={() => handlePreferenceChange('affiliate')}
          />
          Cookies de Afiliados
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.security}
            onChange={() => handlePreferenceChange('security')}
          />
          Cookies de Seguridad
        </label>
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            Guardar preferencias
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookiePreferencesModal;
