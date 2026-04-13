import React, { useState } from 'react';
import { changePassword, updateProfile } from '../../services/authService';

const ProfileTab = ({ userData, onProfileUpdate }) => {
  const canEditProfile = Boolean(userData.username);
  const [name, setName] = useState(userData.name);
  const [email, setEmail] = useState(userData.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSaveProfile = () => {
    setError('');
    setMessage('');

    const updated = updateProfile(userData.username, {
      name: name.trim() || userData.name,
      email: email.trim() || userData.email,
    });

    if (updated) {
      onProfileUpdate(updated);
      setMessage('Perfil atualizado com sucesso.');
    } else {
      setError('Não foi possível atualizar o perfil.');
    }
  };

  const handlePasswordChange = () => {
    setError('');
    setMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos de senha para continuar.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere.');
      return;
    }

    const success = changePassword(userData.username, currentPassword, newPassword);
    if (success) {
      setMessage('Senha alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError('Senha atual incorreta.');
    }
  };

  if (!canEditProfile) {
    return (
      <div className="profile-panel">
        <div className="profile-card">
          <h2>Perfil do Usuário</h2>
          <p className="profile-description">
            Você está acessando com Google. O perfil local dos 4 usuários cadastrados só está disponível via login direto.
          </p>
          <div className="profile-grid">
            <div className="profile-row">
              <label>Nome</label>
              <input value={userData.name} disabled />
            </div>
            <div className="profile-row">
              <label>Email</label>
              <input value={userData.email || 'Não disponível'} disabled />
            </div>
            <div className="profile-row">
              <label>Função</label>
              <input value={userData.role || 'Usuário Google'} disabled />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-panel">
      <div className="profile-card">
        <h2>Perfil do Usuário</h2>
        <p className="profile-description">Aqui você controla seus dados e altera a senha quando quiser.</p>
        <div className="profile-grid">
          <div className="profile-row">
            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="profile-row">
            <label>Usuário</label>
            <input value={userData.username} disabled />
          </div>
          <div className="profile-row">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="profile-row">
            <label>Função</label>
            <input value={userData.role} disabled />
          </div>
          <div className="profile-row">
            <label>Último login</label>
            <input value={userData.lastLogin || 'Nunca'} disabled />
          </div>
        </div>
        <button className="profile-save-btn" onClick={handleSaveProfile}>Salvar informações</button>
      </div>

      <div className="profile-card profile-password-card">
        <h2>Alterar Senha</h2>
        <p className="profile-description">Digite sua senha atual e escolha uma nova senha.</p>
        <div className="profile-grid">
          <div className="profile-row">
            <label>Senha atual</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="profile-row">
            <label>Nova senha</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="profile-row">
            <label>Confirmar nova senha</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        {error && <div className="profile-alert profile-alert-error">{error}</div>}
        {message && <div className="profile-alert profile-alert-success">{message}</div>}
        <button className="profile-save-btn" onClick={handlePasswordChange}>Atualizar senha</button>
      </div>
    </div>
  );
};

export default ProfileTab;
