/**
 * EXEMPLO DE BACKEND SIMPLES
 * 
 * Para usar este arquivo:
 * 1. Instale express: npm install express cors body-parser
 * 2. Execute: node backend-example.js
 * 3. O servidor rodará em http://localhost:5000
 */

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Usuários simulados
const users = [
  { id: 1, name: 'Usuário Demo', email: 'demo@example.com', password: '123456' },
  { id: 2, name: 'João Silva', email: 'joao@example.com', password: 'senha123' },
];

// Rota de Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Validação básica
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  // Buscar usuário
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Email ou senha inválidos' });
  }

  // Gerar token simulado (em produção, use JWT)
  const token = 'jwt-token-' + Date.now() + '-' + Math.random();

  return res.json({
    name: user.name,
    email: user.email,
    token: token,
  });
});

// Rota para Login com Google
app.post('/api/google-login', (req, res) => {
  const { token, name, email, picture } = req.body;

  // Validação básica
  if (!token || !email) {
    return res.status(400).json({ error: 'Token e email são obrigatórios' });
  }

  // Aqui você deveria validar o token com o Google usando a biblioteca 'google-auth-library'
  // Para este exemplo, apenas validamos que o token chegou

  // Buscar ou criar usuário
  let user = users.find(u => u.email === email);
  
  if (!user) {
    // Criar novo usuário
    user = {
      id: users.length + 1,
      name: name,
      email: email,
      picture: picture,
      provider: 'Google'
    };
    users.push(user);
  }

  // Gerar token simulado (em produção, use JWT)
  const jwtToken = 'jwt-token-' + Date.now() + '-' + Math.random();

  return res.json({
    name: user.name,
    email: user.email,
    picture: picture,
    token: jwtToken,
    provider: 'Google'
  });
});

// Rota para registrar novo usuário
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  // Verificar se usuário já existe
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Este email já está registrado' });
  }

  // Criar novo usuário
  const newUser = {
    id: users.length + 1,
    name,
    email,
    password, // Em produção, fazer hash da senha!
  };

  users.push(newUser);

  return res.status(201).json({
    message: 'Usuário criado com sucesso',
    user: { name, email },
  });
});

// Rota de saúde da API
app.get('/api/health', (req, res) => {
  res.json({ status: 'API está funcionando' });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`\n📝 Credenciais de teste:`);
  console.log(`   Email: demo@example.com`);
  console.log(`   Senha: 123456\n`);
  console.log(`Endpoints disponíveis:`);
  console.log(`   POST /api/login - Fazer login`);
  console.log(`   POST /api/google-login - Fazer login com Google`);
  console.log(`   POST /api/register - Registrar novo usuário`);
  console.log(`   GET /api/health - Verificar status da API\n`);
});
