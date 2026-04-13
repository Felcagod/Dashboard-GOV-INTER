import React, { useCallback } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const GoogleLoginButton = ({ onLoginSuccess, onError }) => {
  const handleSuccess = useCallback((credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      
      // Enviar para backend para validação
      sendToBackend(credentialResponse.credential, decoded);

      onLoginSuccess({
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
        token: credentialResponse.credential,
        provider: 'Google',
      });
    } catch (error) {
      console.error('Erro ao decodificar token do Google:', error);
      onError && onError(error);
    }
  }, [onLoginSuccess, onError]);

  const sendToBackend = async (token, decoded) => {
    try {
      const BACKEND_URL = process.env.REACT_APP_API_URL || '';
      const requestUrl = BACKEND_URL ? `${BACKEND_URL}/api/google-login` : '/api/google-login';

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          name: decoded.name,
          email: decoded.email,
          picture: decoded.picture,
        }),
      });

      if (!response.ok) {
        console.warn('Backend retornou erro, mas continuando com login local');
      }
    } catch (error) {
      // Continuar mesmo se backend não estiver disponível
      console.warn('Não foi possível enviar token ao backend:', error);
    }
  };

  const handleError = () => {
    console.log('Login com Google falhou');
    onError && onError(new Error('Login com Google falhou'));
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      theme="outline"
      size="large"
    />
  );
};

export default GoogleLoginButton;
