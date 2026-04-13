import React, { useState, useEffect } from 'react';
import './SettingsMenu.css';

const SettingsMenu = ({ isOpen, onClose, theme, onThemeChange }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`settings-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Menu */}
      <div className={`settings-menu ${isOpen ? 'active' : ''} ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="settings-header">
          <h3>Configurações</h3>
          <button className="close-settings" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-icon" role="img" aria-label="Tema">🌗</span>
              <div>
                <h4>Modo de Exibição</h4>
                <p>Alterne entre tema claro e escuro</p>
              </div>
            </div>
            <label className="theme-toggle">
              <input
                type="checkbox"
                checked={theme === 'dark'}
                onChange={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-icon" role="img" aria-label="Personalização">🎨</span>
              <div>
                <h4>Personalização</h4>
                <p>Em breve: mais opções de tema</p>
              </div>
            </div>
            <span className="coming-soon">Em breve</span>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-icon" role="img" aria-label="Notificações">🔔</span>
              <div>
                <h4>Notificações</h4>
                <p>Em breve: configurações de alertas</p>
              </div>
            </div>
            <span className="coming-soon">Em breve</span>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-icon" role="img" aria-label="Privacidade">🔒</span>
              <div>
                <h4>Privacidade</h4>
                <p>Em breve: controles de privacidade</p>
              </div>
            </div>
            <span className="coming-soon">Em breve</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsMenu;