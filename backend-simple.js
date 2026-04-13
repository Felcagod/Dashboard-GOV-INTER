/**
 * BACKEND PROXY PARA JIRA - VERSÃO SIMPLIFICADA
 * Usa apenas Node.js built-in (sem axios)
 * Funciona identicamente ao Google Apps Script
 */

const http = require('http');
const https = require('https');
const url = require('url');

// ==================== CONFIGURAÇÃO ====================
const JIRA_CONFIG = {
  DOMAIN: "c4br.atlassian.net",
  EMAIL: "wagner_cardoso_2@carrefour.com",
  TOKEN: "ATATT3xFfGF0wRUdVVh3Ih9WQnerAiSId7TbJn2T1hAIz98g-viYYi2IHekoKSasTwsNS_5J9wLMt17e-Oz8QuYrN5DfPdgWW0JAuv6VMP4xV_UKukRaBc_rHbObuJnJOMES-KMP3XF-o77qCl354OZCXg8tFF_XbS54wM9RkFkljLGgHq2Esfw=941426E2"
};

const PORT = process.env.PORT || 5000;

// ==================== AUTH ====================
function getAuthHeader() {
  const auth = Buffer.from(`${JIRA_CONFIG.EMAIL}:${JIRA_CONFIG.TOKEN}`).toString('base64');
  return `Basic ${auth}`;
}

// ==================== FETCH JIRA ====================
async function buscarDoJira(jql, campos, maxResults = 50) {
  return new Promise((resolve, reject) => {
    const encodedJql = encodeURIComponent(jql);
    const jiraUrl = `https://${JIRA_CONFIG.DOMAIN}/rest/api/3/search/jql?jql=${encodedJql}&fields=${campos}&expand=comment&maxResults=${maxResults}`;

    console.log('🔍 Buscando do JIRA:', jql);

    https.get(jiraUrl, {
      headers: {
        'Authorization': getAuthHeader(),
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        console.error('❌ Erro JIRA:', res.statusCode, res.statusMessage);
        return reject(new Error(`JIRA retornou ${res.statusCode}`));
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('✅ Issues recebidas:', json.issues?.length || 0);
          resolve(json);
        } catch (e) {
          reject(new Error('Erro ao parsear JSON: ' + e.message));
        }
      });
    }).on('error', reject);
  });
}

// ==================== SERVIDOR HTTP ====================
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // === ROTA: Health Check ===
  if (pathname === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'Backend proxy está funcionando ✅' }));
    return;
  }

  // === ROTA: Buscar PRs ===
  if (pathname === '/api/jira/issues') {
    try {
      const jql = 'project = PR AND status IN ("Em Criação (RCA)", "Em Resolução") ORDER BY created DESC';
      const campos = "summary,status,updated,created,comment,assignee,reporter,issuetype";
      
      const data = await buscarDoJira(jql, campos, 100);
      
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } catch (error) {
      console.error('❌ Erro /api/jira/issues:', error.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // === ROTA: Buscar CHGs ===
  if (pathname === '/api/jira/changes') {
    try {
      const jql = "project = CHG and type = '[System] Change' ORDER BY created DESC";
      const campos = "summary,status,description,reporter,customfield_10250,customfield_10249,customfield_10251,customfield_12502,customfield_12503,customfield_16971,customfield_11310,issuetype";
      
      const data = await buscarDoJira(jql, campos);
      const issues = data.issues || [];
      
      res.writeHead(200);
      res.end(JSON.stringify({ ...data, issues, total: issues.length }));
    } catch (error) {
      console.error('❌ Erro /api/jira/changes:', error.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // === ROTA: Debug - Todos os status ===
  if (pathname === '/api/jira/debug/all-issues') {
    try {
      const jql = 'project = PR ORDER BY created DESC';
      const campos = "summary,status,updated,created,assignee,reporter";
      
      const data = await buscarDoJira(jql, campos, 100);
      
      // Contar por status
      const statusCount = {};
      data.issues?.forEach(issue => {
        const status = issue.fields?.status?.name || 'UNKNOWN';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      console.log('📊 TOTAL:', data.total);
      console.log('📋 Por Status:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   - "${status}": ${count}`);
      });

      const response = {
        total: data.total,
        statusCount,
        availableStatuses: Object.keys(statusCount),
        sample: data.issues?.slice(0, 5).map(i => ({
          key: i.key,
          summary: i.fields?.summary,
          status: i.fields?.status?.name
        })) || []
      };

      res.writeHead(200);
      res.end(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error('❌ Erro /api/jira/debug/all-issues:', error.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // === 404 ===
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Rota não encontrada', path: pathname }));
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 Backend Proxy JIRA Simplificado    ║
║  Rodando em http://localhost:${PORT}     ║
╚════════════════════════════════════════╝

📋 Endpoints:
   GET  /api/health - Verificar status
   GET  /api/jira/issues - Buscar PRs
   GET  /api/jira/debug/all-issues - Ver todos os status

🔧 Teste no navegador:
   http://localhost:${PORT}/api/health
  `);
});
