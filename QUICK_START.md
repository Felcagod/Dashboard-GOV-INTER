# Quick Start - Dashboard

## 🚀 Início Rápido (5 minutos)

### Setup Simplificado

1. **Instalar dependências:**
```bash
npm install
```

2. **Iniciar aplicação:**
```bash
npm start
```

3. **Acessar:**
- URL: http://localhost:3000
- Email: `demo@example.com`
- Senha: `123456`

## 🔐 Com Integração JIRA

### Setup com Backend Proxy (Recomendado)

**Terminal 1 - Backend Proxy:**
```bash
npm install express cors axios dotenv
# Crie .env com suas credenciais JIRA
node backend-proxy.js
```

**Terminal 2 - Frontend:**
```bash
npm start
```

### Arquivo .env (Backend)
```
JIRA_DOMAIN=seu_dominio_jira.atlassian.net
JIRA_EMAIL=seu.email@exemplo.com
JIRA_TOKEN=seu_token_jira
PORT=5001
```

## 📊 Dashboard - Funcionamento

### Fluxo de Autenticação
1. Usuário faz login (email/senha ou Google)
2. Dados do usuário são salvos em estado React
3. Usuário é levado ao Dashboard
4. Dashboard carrega PRs do JIRA ao montar

### Aba PRs
- **KPI Cards**: Informações em tempo real
- **Filtros**: Apenas atrasados ou RCA incompleta
- **Cards**: Detalhes de cada PR com link direto

### Dados Carregados
- Status: "Em Criação (RCA)" e "Em Resolução"
- Ordenação: Por data de criação (descendente)
- Atualização: Clique em "🔄 Atualizar"

## ⚠️ Solução de Problemas

### "Erro ao carregar PRs"
- [ ] Verifique conexão de internet
- [ ] Confirme token JIRA válido
- [ ] Acessar JIRA diretamente: https://seu_dominio_jira.atlassian.net/
- [ ] Cheque permissões do usuário

### CORS Error
- [ ] Use backend proxy (`backend-proxy.js`)
- [ ] Ou configure CORS no JIRA

### Token expirado
- [ ] Gere novo em https://id.atlassian.com/manage-profile/security/api-tokens
- [ ] Atualize credenciais

## 🧪 Testar Sem JIRA

Se JIRA não estiver disponível:

1. O dashboard exibirá: "Nenhum PR pendente no momento"
2. Crie dados fictícios em `src/services/jiraService.js`:

```javascript
export const fetchJiraIssues = async () => {
  // Mock data
  return [
    {
      key: 'PR-001',
      fields: {
        summary: 'Teste PR 1',
        status: { name: 'Em Resolução' },
        assignee: { displayName: 'João Silva' },
        // ... mais campos
      }
    }
  ];
};
```

## 📱 Acessar de Outro PC

### Na mesma rede local:
```bash
npm start -- --host 0.0.0.0
```

Acesse de outro PC: `http://seu-ip:3000`

### Na internet (requer publicação):
- Deploy no Vercel, Netlify, GitHub Pages, etc.

## 🔑 Chaves Importantes

| Item | Valor | Onde |
|------|-------|------|
| JIRA Domain | seu_dominio_jira.atlassian.net | .env ou backend |
| JIRA Email | seu.email@exemplo.com | .env ou backend |
| JIRA Token | seu_token_jira | .env ou backend |
| Google Client ID | seu_id | .env.local |

## 📚 Documentação Completa

- [README.md](README.md) - Documentação geral
- [DASHBOARD_JIRA_SETUP.md](DASHBOARD_JIRA_SETUP.md) - Setup JIRA detalhado
- [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) - Setup Google OAuth

## 💡 Dicas

1. **Atualizar frequentemente**: Clique em "🔄 Atualizar" para sincronizar com JIRA
2. **Filtros**: Use para focar em PRs críticos
3. **Links**: Clique em links para editar direto no JIRA
4. **Banco de dados**: Implemente persistência de dados no backend

## 🚀 Próximos Passos

- [ ] Implementar banco de dados (MongoDB, PostgreSQL)
- [ ] Adicionar autenticação JWT
- [ ] Criar aba de Análises
- [ ] Implementar notificações em tempo real (WebSocket)
- [ ] Deploy em produção

## ✅ Checklist de Deploy

- [ ] Configurar variáveis de ambiente
- [ ] Usar HTTPS
- [ ] Implementar CORS corretamente
- [ ] Testar em múltiplos navegadores
- [ ] Testar responsividade mobile
- [ ] Configurar monitoramento/logging
- [ ] Backup de dados

## 📞 Suporte

Para dúvidas específicas:
- **JIRA**: [Documentação oficial](https://developer.atlassian.com/cloud/jira/rest/v3/)
- **React**: [react.dev](https://react.dev/)
- **Backend**: Ver `backend-proxy.js`
