# Tela de Login + Dashboard - Sistema de Autorizações e Governança

Uma aplicação web completa desenvolvida com **React** para autenticação segura e acompanhamento de PRs (Problems) em tempo real via integração com JIRA.

## ✨ Características

- **Interface Moderna**: Design limpo com gradiente elegante
- **Animações Suaves**: Transições fluidas e efeitos visuais
- **Validação de Formulário**: Validação em tempo real de email e senha
- **Login com Google**: Autenticação via OAuth 2.0 do Google
- **Avatar do Usuário**: Exibição de foto de perfil/iniciais
- **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Integração Backend**: Exemplo de integração com API REST
- **Segurança**: Campo de senha com toggle de visibilidade
- **Credenciais de Demonstração**: Para testar sem backend real

## 🚀 Como Iniciar

### Pré-requisitos
- Node.js 14+ instalado
- npm ou yarn

### Instalação

1. Clone o repositório ou navegue até a pasta do projeto
2. Instale as dependências:
```bash
npm install
```

### Configurar Google OAuth (Opcional)

Se deseja usar autenticação via Google:
1. Leia o arquivo [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)
2. Obtenha um Client ID no Google Cloud Console
3. Configure no arquivo `src/App.js` ou em um arquivo `.env`

### Executar a Aplicação

```bash
npm start
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador

## 📝 Como Usar

### Entrada com Email/Senha
- **Email**: demo@example.com
- **Senha**: 123456

Ou use qualquer email válido e senha com 6+ caracteres para testar a validação.

### Entrada com Google
1. Clique no botão **"Sign in with Google"**
2. Faça login com sua conta Google
3. Você será autenticado automaticamente

## 🎨 Componentes

### `Login.js`
Componente principal da tela de login com:
- Formulário de email e senha
- Integração com Google Sign-In
- Validação de email e senha
- Toggle de visibilidade de senha
- Estado de carregamento com spinner
- Mensagens de erro personalizadas

### `GoogleLoginButton.js`
Componente para autenticação via Google:
- Botão de login do Google
- Decodificação de JWT
- Envio de dados para backend
- Fallback para modo demonstração

### `App.js`
Componente raiz que gerencia:
- Estado de autenticação
- Dados do usuário
- Tela de boas-vindas após login
- Integração com GoogleOAuthProvider

## 🔌 Integração Backend

### Autenticação por Email/Senha

Para conectar com seu backend real, modifique a URL em [src/components/Login.js](src/components/Login.js):

```javascript
const response = await fetch('http://seu-servidor.com/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: email,
    password: password,
  }),
});

const data = await response.json();
```

**Resposta Esperada:**
```json
{
  "name": "Nome do Usuário",
  "email": "usuario@example.com",
  "token": "seu-jwt-token"
}
```

### Autenticação pelo Google

O backend receberá um POST para `/api/google-login`:

```json
{
  "token": "JWT-do-Google",
  "name": "Nome do Usuário",
  "email": "usuario@gmail.com",
  "picture": "URL-da-foto"
}
```

**Resposta Esperada:**
```json
{
  "name": "Nome do Usuário",
  "email": "usuario@gmail.com",
  "picture": "URL-da-foto",
  "token": "seu-jwt-token",
  "provider": "Google"
}
```

## 📦 Build para Produção

```bash
npm run build
```

Isso cria uma pasta `build/` otimizada para produção.

## 🛠️ Exemplo de Backend (Node.js + Express)

Se desejar criar um backend para testar, aqui está um exemplo simples:

```bash
npm install express cors
node backend-example.js
```

O servidor rodará em `http://localhost:5000`

> Nova integração: o backend agora suporta geração de planilhas totalmente em JavaScript.
> O endpoint `/api/export/spreadsheet` processa JIRA e GLPI e retorna a planilha formatada.

## 🎯 Rotas de API Esperadas

- **POST** `/api/login` - Autenticar usuário com email/senha
  - Body: `{ email, password }`
  - Response: `{ name, email, token }`

- **POST** `/api/google-login` - Autenticar via Google
  - Body: `{ token, name, email, picture }`
  - Response: `{ name, email, picture, token, provider }`

- **POST** `/api/register` - Registrar novo usuário
  - Body: `{ name, email, password }`
  - Response: `{ message, user }`

## 📱 Responsividade

A aplicação é totalmente responsiva e funciona bem em:
- Desktops (1920px+)
- Tablets (768px - 1024px)
- Celulares (320px - 767px)

## 🔒 Notas de Segurança

- Em produção, use HTTPS
- Armazene tokens em local storage de forma segura
- Implement rate limiting no backend
- Valide todas as entradas no backend também
- Use variáveis de ambiente para URLs de API
- Valide tokens JWT do Google no backend
- Nunca exponha seu Client Secret do Google

## 📚 Dependências

- `react` - Biblioteca de UI
- `react-dom` - Renderização de componentes React
- `@react-oauth/google` - Integração com Google OAuth
- `jwt-decode` - Decodificação de tokens JWT

## 🔧 Scripts Disponíveis

```bash
npm start       # Inicia servidor de desenvolvimento
npm build       # Build para produção
npm test        # Executa testes
npm eject       # Ejetar configuração (irreversível)
```

## 📄 Licença

Este projeto é fornecido como exemplo educacional.

## 🤝 Suporte

Para dúvidas ou sugestões sobre Google OAuth, consulte [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)
