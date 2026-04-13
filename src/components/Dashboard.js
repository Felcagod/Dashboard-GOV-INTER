import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import PRsTab from './tabs/PRsTab';
import ChangesTab from './tabs/ChangesTab';
import ContactsTab from './tabs/ContactsTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import ProfileTab from './tabs/ProfileTab';
import SettingsMenu from './SettingsMenu';

const Dashboard = ({ userData, onLogout, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState('prs');
  const [theme, setTheme] = useState('light');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Carregar tema do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard-theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Salvar tema no localStorage
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('dashboard-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`dashboard-container ${theme}`}>
      {/* Settings Menu */}
      <SettingsMenu
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <img src="/carrefour-logo-new.svg" alt="Carrefour" className="carrefour-logo" />
          <div>
            <h1>GOV ITSM</h1>
            <p>Sistema de Acompanhamento de PRs e Auditoria</p>
          </div>
        </div>
        <div className="header-user" ref={profileRef}>
          <button
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            title="Configurações"
            aria-label="Configurações"
          >
            ⚙️
          </button>
          <button
            className={`profile-top-btn ${profileOpen ? 'open' : ''}`}
            onClick={() => setProfileOpen((prev) => !prev)}
            title="Perfil"
          >
            {userData.picture && <img src={userData.picture} alt="User" className="user-avatar" />}
            <span>{userData.name}</span>
            <span className="profile-caret">▼</span>
          </button>
          {profileOpen && (
            <div className="profile-dropdown">
              <button
                className="dropdown-item"
                onClick={() => {
                  setActiveTab('profile');
                  setProfileOpen(false);
                }}
              >
                Meu perfil
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setSettingsOpen(true);
                  setProfileOpen(false);
                }}
              >
                Configurações
              </button>
              <button
                className="dropdown-item logout-item"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
              >
                Sair
              </button>
            </div>
          )}
          <button onClick={onLogout} className="logout-btn">Sair</button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === 'prs' ? 'active' : ''}`}
          onClick={() => setActiveTab('prs')}
        >
          PRs
        </button>
        <button
          className={`tab-btn ${activeTab === 'changes' ? 'active' : ''}`}
          onClick={() => setActiveTab('changes')}
        >
          CHGs
        </button>
        <button
          className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          Contatos
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Análises
        </button>
      </div>

      {/* Tabs Content */}
      <div className="tabs-content">
        <div style={{ display: activeTab === 'prs' ? 'block' : 'none' }}>
          <PRsTab />
        </div>
        <div style={{ display: activeTab === 'changes' ? 'block' : 'none' }}>
          <ChangesTab />
        </div>
        <div style={{ display: activeTab === 'contacts' ? 'block' : 'none' }}>
          <ContactsTab />
        </div>
        <div style={{ display: activeTab === 'analytics' ? 'block' : 'none' }} className="tab-panel">
          <AnalyticsTab />
        </div>
        <div style={{ display: activeTab === 'profile' ? 'block' : 'none' }} className="tab-panel">
          <ProfileTab userData={userData} onProfileUpdate={onProfileUpdate} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
