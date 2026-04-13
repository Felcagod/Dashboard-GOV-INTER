# Configuração do Google OAuth

## 1. Criar uma Aplicação no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto (ou selecione um existente)
3. Vá para **APIs & Services** > **Credentials**
4. Clique em **Create Credentials** > **OAuth 2.0 Client ID**
5. Selecione **Web application**
6. Adicione as URLs autorizadas:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (desenvolvimento)
     - `http://localhost` (desenvolvimento)
     - Sua URL de produção (ex: `https://seu-site.com`)
   
   - **Authorized redirect URIs**:
     - `http://localhost:3000` (desenvolvimento)
     - Sua URL de produção (ex: `https://seu-site.com`)

7. Copie o **Client ID** gerado

## 2. Configurar no Projeto React

### Opção A: Variável de Ambiente (.env)

1. Crie um arquivo `.env` na raiz do projeto:
```
REACT_APP_GOOGLE_CLIENT_ID=seu_client_id_aqui
```

2. Modifique `src/App.js`:
```javascript
<GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
```

### Opção B: Configurar Diretamente no Código

1. Abra `src/App.js`
2. Substitua `YOUR_GOOGLE_CLIENT_ID` pelo seu Client ID:
```javascript
<GoogleOAuthProvider clientId="123456789-abcdefg.apps.googleusercontent.com">
```

## 3. Teste o Login

1. Inicie a aplicação: `npm start`
2. Navegue para `http://localhost:3000`
3. Clique no botão **"Sign in with Google"**
4. Faça login com sua conta Google
5. Você será redirecionado e verá seus dados de usuário

## Troubleshooting

### Erro: "Invalid Client ID"
- Verifique se o Client ID está correto
- Certifique-se de que está usando aspas corretas

### Erro: "Redirect URI mismatch"
- Adicione a URL atual ao Google Cloud Console
- Limpe o cache do navegador
- Tente em uma aba incógnita

### Token não funciona
- Verifique se o backend está rodando (se usar integração)
- Valide o token no backend com a biblioteca `google-auth-library`

## Boas Práticas de Segurança

- Nunca compartilhe seu Client Secret
- Use variáveis de ambiente para armazenar o Client ID em produção
- Valide sempre o token no backend
- Use HTTPS em produção
- Implemente rate limiting e proteção contra CSRF

## Referências

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [@react-oauth/google Documentation](https://github.com/react-oauth/react-oauth.google)
- [JWT Decode](https://www.npmjs.com/package/jwt-decode)
