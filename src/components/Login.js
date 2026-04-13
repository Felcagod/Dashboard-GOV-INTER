import React, { useState } from 'react';
import {
  authenticate,
  recordLogin,
  startPasswordReset,
  completePasswordReset,
} from '../services/authService';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState('login');
  const [resetUsername, setResetUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [resetToken, setResetToken] = useState('');

  const validateLogin = () => {
    const newErrors = {};
    if (!username) {
      newErrors.username = 'Usuário é obrigatório';
    }
    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode !== 'login') return;

    const newErrors = validateLogin();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setStatusMessage('');

    const user = authenticate(username, password);
    if (!user) {
      setErrors({ form: 'Usuário ou senha incorretos. Use apenas os 4 usuários permitidos.' });
      setIsLoading(false);
      return;
    }

    const loggedUser = recordLogin(username);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(loggedUser);
    }, 600);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setMode('reset-request');
    setErrors({});
    setStatusMessage('');
    setResetUsername(username);
  };

  const handleSendResetCode = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!resetUsername) {
      newErrors.resetUsername = 'Digite seu usuário para receber o código.';
      setErrors(newErrors);
      return;
    }

    const code = startPasswordReset(resetUsername);
    if (!code) {
      setErrors({ resetUsername: 'Usuário não encontrado. Use Wagner, Enrique, Kelvyn ou Roberta.' });
      return;
    }

    setResetToken(code);
    setMode('reset-verify');
    setStatusMessage('Código enviado! Use o código abaixo para redefinir a senha.');
    setErrors({});
  };

  const handleConfirmReset = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!resetCode) {
      newErrors.resetCode = 'Digite o código enviado.';
    }
    if (!newPassword) {
      newErrors.newPassword = 'Digite a nova senha.';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem.';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const success = completePasswordReset(resetUsername, resetCode, newPassword);
    if (!success) {
      setErrors({ resetCode: 'Código inválido ou expirado. Gere outro código.' });
      return;
    }

    setStatusMessage('Senha redefinida com sucesso! Faça login com a nova senha.');
    setMode('login');
    setUsername(resetUsername);
    setPassword('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setErrors({});
  };

  const handleBackToLogin = () => {
    setMode('login');
    setErrors({});
    setStatusMessage('');
    setResetCode('');
    setResetUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-header">
          <div className="logo-wrap">
            <img src="/carrefour-logo-new.svg" alt="Carrefour" className="carrefour-logo" />
          </div>
          <h1>Portal Carrefour</h1>
          <p>Autorização e Governança Corporativa</p>
        </div>

        {mode === 'login' && (
          <>
            {errors.form && <span className="error-message form-error">{errors.form}</span>}

            <div className="form-group">
              <label htmlFor="username">Usuário</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Wagner"
                className={errors.username ? 'input-error' : ''}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={errors.password ? 'input-error' : ''}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Lembrar-me</span>
              </label>
              <a 
                role="button" 
                tabIndex="0" 
                className="forgot-password" 
                onClick={handleForgotPassword}
                onKeyPress={(e) => e.key === 'Enter' && handleForgotPassword()}
              >
                Esqueceu sua senha?
              </a>
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Conectando...
                </>
              ) : (
                'Entrar'
              )}
            </button>

            <div className="signup-link">
              <p>Somente usuários cadastrados têm acesso.</p>
            </div>
          </>
        )}

        {mode === 'reset-request' && (
          <>
            <div className="reset-panel">
              <h2>Redefinir senha</h2>
              <p>Digite seu usuário cadastrado. Um código de verificação será gerado.</p>

              <div className="form-group">
                <label htmlFor="resetUsername">Usuário</label>
                <input
                  type="text"
                  id="resetUsername"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  placeholder="Wagner"
                  className={errors.resetUsername ? 'input-error' : ''}
                />
                {errors.resetUsername && <span className="error-message">{errors.resetUsername}</span>}
              </div>

              <button type="button" className="submit-btn" onClick={handleSendResetCode}>
                Enviar código de redefinição
              </button>
              <button type="button" className="secondary-btn" onClick={handleBackToLogin}>
                Voltar ao login
              </button>
            </div>
          </>
        )}

        {mode === 'reset-verify' && (
          <>
            <div className="reset-panel">
              <h2>Confirme a nova senha</h2>
              <p>{statusMessage}</p>
              <p className="reset-code-display">Código enviado: <strong>{resetToken}</strong></p>

              <div className="form-group">
                <label htmlFor="resetCode">Código</label>
                <input
                  type="text"
                  id="resetCode"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="123456"
                  className={errors.resetCode ? 'input-error' : ''}
                />
                {errors.resetCode && <span className="error-message">{errors.resetCode}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Nova senha</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className={errors.newPassword ? 'input-error' : ''}
                />
                {errors.newPassword && <span className="error-message">{errors.newPassword}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar nova senha</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={errors.confirmPassword ? 'input-error' : ''}
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>

              <button type="button" className="submit-btn" onClick={handleConfirmReset}>
                Atualizar senha
              </button>
              <button type="button" className="secondary-btn" onClick={handleBackToLogin}>
                Voltar ao login
              </button>
            </div>
          </>
        )}

        {statusMessage && mode === 'login' && <div className="form-message success">{statusMessage}</div>}
      </form>

      {/* <div className="demo-credentials">
        <p><strong>Usuários permitidos:</strong></p>
        <p>Wagner · Enrique · Kelvyn · Roberta</p>
        <p><strong>Senha padrão:</strong> govc4*</p>
      </div> */}
    </div>
  );
};

export default Login;
