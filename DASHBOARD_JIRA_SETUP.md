# JIRA Integration - Dashboard PRs

## 🎯 Visão Geral

O Dashboard integra-se diretamente com sua instância JIRA para monitorar PRs (Problems/Casos) em tempo real. O sistema transforma o código de App Script em uma aplicação web moderna com interface intuitiva.

## ⚙️ Configuração

### 1. Credenciais JIRA

As credenciais JIRA devem ser definidas em variáveis de ambiente no backend. Não armazene valores sensíveis diretamente no código público.

```javascript
const JIRA_CONFIG = {
  DOMAIN: process.env.JIRA_DOMAIN,
  EMAIL: process.env.JIRA_EMAIL,
  TOKEN: process.env.JIRA_TOKEN
};
```

### 2. Solução CORS

Se encontrar problemas de CORS ao chamar a API JIRA diretamente, implemente um backend proxy:

```javascript
// backend.js (Node.js + Express)
app.get('/api/proxy-jira', async (req, res) => {
  const url = req.query.url;
  const auth = req.headers.authorization;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': auth,
      'Accept': 'application/json'
    }
  });
  
  const data = await response.json();
  res.json(data);
});
```

Então atualize `jiraService.js`:

```javascript
export const fetchJiraIssues = async () => {
  const url = `http://seu-servidor.com/api/proxy-jira?url=${encodeURIComponent(fullUrl)}`;
  // ... resto do código
};
```

## 📊 Aba PRs

### Funcionalidades

- **KPI Cards**: Visualização rápida de métricas
  - Total de PRs
  - Quantidade de atrasados
  - Média de dias parado
  - Percentual de RCA incompleta

- **Filtros**: 
  - Apenas Atrasados (⚠️)
  - RCA Incompleta (❌)

- **Cards de PRs**: Exibição detalhada de cada caso
  - ID JIRA com link direto
  - Resumo do problema
  - Status atual
  - Responsável e Owner
  - Última atividade
  - Último comentário
  - Dias parado
  - Status da RCA

### Cores e Estados

- 🟢 **RCA Completa**: Background verde suave
- 🔴 **Atrasado**: Badge vermelho com animação
- 🟠 **RCA Incompleta**: Background amarelo suave
- 🔵 **Normal**: Fundo branco

## 🔄 Atualização de Dados

### Automática
O dashboard carrega dados ao montar. Usuários podem clicar em "🔄 Atualizar" para forçar nova busca.

### Backend (Agendado)
Implemente no backend para atualizar em intervalos regulares:

```javascript
// Cron job - atualizar a cada hora
cron.schedule('0 * * * *', async () => {
  const issues = await fetchFromJira();
  // Salvar em banco de dados local
  // Enviar notificação se houver mudanças
});
```

## 🔍 Consulta JQL

O dashboard busca issues com a seguinte consulta:

```
project = PR AND status IN ("Em Criação (RCA)", "Em Resolução") ORDER BY created DESC
```

**Campos incluídos:**
- summary
- status
- updated
- created
- comment
- assignee
- reporter

### Modificar Consulta

Edite o arquivo `src/services/jiraService.js`:

```javascript
const jql = 'project = PR AND status IN ("Em Criação (RCA)", "Em Resolução") ORDER BY created DESC';
```

## 📋 Processamento de Dados

### Filtros aplicados
- Exclui automaticamente PRs atribuídos a:
  - Edgard Antonio Carolino da Silva
  - VINICIUS PACHECO

### Detecção de RCA Completa
O sistema verifica o último comentário para palavras-chave:
- "5 porquês"
- "5 whys"
- "ishikawa"
- "fishbone"
- "causa raiz"
- "root cause"
- "porquê" / "por que"

Ou se o comentário tem mais de 400 caracteres.

### Cálculo de Atrasado
Um PR é considerado atrasado se a última atividade foi anterior a hoje (00:00).

## 🚀 Próximas Abas

### 📊 Análises
- Gráficos de tendência
- Taxa de resolução
- Tempo médio de fechamento
- Distribuição por responsável

### ⚙️ Configurações
- Editar credenciais JIRA
- Personalizar filtros
- Habilitar notificações
- Agendamento de atualizações

## 🔐 Segurança

⚠️ **IMPORTANTE**: Seu token JIRA está visível no código frontend!

### Solução Recomendada:

1. **Backend Proxy** (recomendado)
   - Credenciais JIRA no servidor, não no cliente
   - Frontend faz requisições para backend apenas

2. **Variáveis de Ambiente**
   - `REACT_APP_JIRA_DOMAIN`
   - `REACT_APP_JIRA_EMAIL`
   - Utilize backend para token (nunca exponha em .env público)

3. **OAuth 2.0**
   - Implementar OAuth com JIRA
   - Melhor prática de segurança

## 📱 Responsividade

O dashboard é totalmente responsivo:
- Desktop: Layout completo com 4 KPIs por linha
- Tablet: Grid 2x2
- Mobile: Stack vertical (1 KPI por linha)

## 🐛 Troubleshooting

### "Erro ao carregar PRs do JIRA"
1. Verifique conexão de internet
2. Confirm token JIRA está válido
3. Verifique permissões do usuário no JIRA
4. Verifique se projeto "PR" existe

### CORS Error
- Use backend proxy
- Ou implemente JSONP
- Ou configure CORS no JIRA

### Token expirado
1. Gere novo token no JIRA
2. Atualize em `jiraService.js`

## 📞 Suporte

Para questões sobre:
- **JIRA API**: Consulte [documentação oficial](https://developer.atlassian.com/cloud/jira/rest/v3/)
- **React**: Consulte [documentação React](https://react.dev/)
- **Configuração**: Revise este arquivo
