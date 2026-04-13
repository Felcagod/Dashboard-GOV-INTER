/**
 * BACKEND PROXY PARA JIRA (Recomendado)
 * 
 * Evita problemas de CORS e mantém suas credenciais seguras
 * 
 * Para usar:
 * 1. npm install express cors axios dotenv
 * 2. Crie arquivo .env com as variáveis
 * 3. node backend-proxy.js
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const { generateSpreadsheetBuffer } = require('./backend-exporter');

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// ==================== CONFIGURAÇÃO ====================
const DEFAULT_JIRA_TOKEN = "ATATT3xFfGF0wRUdVVh3Ih9WQnerAiSId7TbJn2T1hAIz98g-viYYi2IHekoKSasTwsNS_5J9wLMt17e-Oz8QuYrN5DfPdgWW0JAuv6VMP4xV_UKukRaBc_rHbObuJnJOMES-KMP3XF-o77qCl354OZCXg8tFF_XbS54wM9RkFkljLGgHq2Esfw=941426E2";
const parsedJiraTokens = (process.env.JIRA_TOKENS || '')
  .split(',')
  .map(token => token.trim())
  .filter(Boolean);
const JIRA_CONFIG = {
  DOMAIN: process.env.JIRA_DOMAIN || "c4br.atlassian.net",
  EMAIL: process.env.JIRA_EMAIL || "wagner_cardoso_2@carrefour.com",
  TOKENS: [
    ...parsedJiraTokens,
    process.env.JIRA_TOKEN,
    process.env.JIRA_TOKEN_FALLBACK,
    DEFAULT_JIRA_TOKEN
  ].filter(Boolean)
};

console.log('JIRA config:', {
  domain: JIRA_CONFIG.DOMAIN,
  email: JIRA_CONFIG.EMAIL,
  tokensLoaded: JIRA_CONFIG.TOKENS.length,
  hasPrimaryToken: Boolean(process.env.JIRA_TOKEN),
  hasFallbackToken: Boolean(process.env.JIRA_TOKEN_FALLBACK),
  hasTokensList: Boolean(process.env.JIRA_TOKENS)
});

// ==================== AUTH ====================
const getAuthHeader = (token) => {
  const auth = Buffer.from(`${JIRA_CONFIG.EMAIL}:${token}`).toString('base64');
  return `Basic ${auth}`;
};

const requestWithFallback = async ({ method, url, data = null, params = null, headers = {} }) => {
  let lastError = null;
  for (const [index, token] of JIRA_CONFIG.TOKENS.entries()) {
    try {
      const requestHeaders = {
        Accept: 'application/json',
        Authorization: getAuthHeader(token),
        ...headers
      };

      if (data != null && typeof data === 'object') {
        requestHeaders['Content-Type'] = 'application/json';
      }

      console.log(`JIRA request ${index + 1}/${JIRA_CONFIG.TOKENS.length}: ${method.toUpperCase()} ${url}`);
      const response = await axios({
        method,
        url,
        data,
        params,
        headers: requestHeaders,
        timeout: 20000
      });
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`JIRA request failed with token ${index + 1}/${JIRA_CONFIG.TOKENS.length}: ${error.message}`);
      if (error.response) {
        console.warn('JIRA response status:', error.response.status);
        console.warn('JIRA response data:', JSON.stringify(error.response.data));
      }
      if (index < JIRA_CONFIG.TOKENS.length - 1) {
        console.warn('Tentando próximo token JIRA...');
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};


// ==================== ROTAS ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend proxy está funcionando' });
});

// ENDPOINT DE DEBUG - Descobrir quais status existem no projeto PR
app.get('/api/jira/debug/all-issues', async (req, res) => {
  try {
    const jql = 'project = PR ORDER BY created DESC';
    const campos = "summary,status,updated,created,assignee,reporter";
    
    const url = `https://${JIRA_CONFIG.DOMAIN}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${campos}&maxResults=50`;

    console.log('🔍 DEBUG ALL - Buscando TODAS as issues do projeto PR...');

    const response = await requestWithFallback({
      method: 'get',
      url,
      headers: {
        Accept: 'application/json'
      }
    });

    // Contar issues por status
    const statusCount = {};
    response.data.issues.forEach(issue => {
      const status = issue.fields?.status?.name || 'UNKNOWN';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    console.log('📊 TOTAL DE ISSUES:', response.data.total);
    console.log('📋 Issues por Status:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   - "${status}": ${count}`);
    });

    res.json({
      total: response.data.total,
      statusCount,
      availableStatuses: Object.keys(statusCount),
      sample: response.data.issues.slice(0, 5).map(i => ({
        key: i.key,
        summary: i.fields?.summary,
        status: i.fields?.status?.name
      }))
    });
  } catch (error) {
    console.error('❌ Erro DEBUG:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Proxy para buscar issues JIRA
app.get('/api/jira/issues', async (req, res) => {
  try {
    const jql = 'project = PR AND status IN ("Em Criação (RCA)", "Em Resolução") ORDER BY created DESC';
    const campos = "summary,status,updated,created,comment,assignee,reporter,issuetype";
    const url = `https://${JIRA_CONFIG.DOMAIN}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${campos}&expand=comment&maxResults=100`;
    console.log('🔗 URL Completa:', url);

    const response = await requestWithFallback({
      method: 'get',
      url,
      headers: {
        Accept: 'application/json'
      }
    });

    const allowedIssueTypeRegex = /problem|problema/i;
    const filteredIssues = response.data.issues?.filter(issue => {
      const issueType = issue.fields?.issuetype?.name || '';
      return allowedIssueTypeRegex.test(issueType);
    }) || [];

    console.log('✅ SUCCESS - Issues retornadas (antes do filtro de tipo):', response.data.issues?.length || 0);
    console.log('✅ Issues após filtro de tipo:', filteredIssues.length);
    console.log('📊 Total de resultados:', filteredIssues.length);
    
    // Debugar status encontrados
    if (filteredIssues.length > 0) {
      const statusUnicos = [...new Set(filteredIssues.map(i => i.fields?.status?.name))];
      console.log('📋 Status encontrados:', statusUnicos);
      console.log('👥 Primeiras 3 issues filtradas:', filteredIssues.slice(0, 3).map(i => ({
        key: i.key,
        issueType: i.fields?.issuetype?.name,
        status: i.fields?.status?.name,
        assignee: i.fields?.assignee?.displayName
      })));
    }

    res.json({ ...response.data, issues: filteredIssues, total: filteredIssues.length });
  } catch (error) {
    console.error('Erro ao buscar issues JIRA:', error.message);
    console.error('Erro detalhes:', error.response?.data || error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Credenciais JIRA inválidas' });
    }
    
    if (error.response?.status === 403) {
      return res.status(403).json({ error: 'Acesso negado ao JIRA' });
    }

    res.status(500).json({ error: 'Erro ao buscar issues do JIRA' });
  }
});

// Proxy para buscar CHGs JIRA
app.get('/api/jira/changes', async (req, res) => {
  try {
    const { startAt = '0', maxResults = '100', status, search } = req.query;
    const startAtNum = Math.max(0, Number(startAt) || 0);
    const maxResultsNum = Math.min(100, Math.max(10, Number(maxResults) || 50));

    let jql = "project = CHG and type = '[System] Change'";
    if (status && status.trim() && status.toUpperCase() !== 'TODOS') {
      const safeStatus = status.replace(/"/g, '\\"');
      jql += ` AND status = "${safeStatus}"`;
    }
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/"/g, '\\"');
      jql += ` AND (summary ~ "${safeSearch}" OR description ~ "${safeSearch}" OR reporter ~ "${safeSearch}" OR comment ~ "${safeSearch}")`;
    }
    jql += ' ORDER BY created DESC';

    const campos = "summary,status,updated,created,comment,reporter,description,customfield_10250,customfield_10249,customfield_10251,customfield_12502,customfield_16971,customfield_11310,issuetype";
    const url = `https://${JIRA_CONFIG.DOMAIN}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${campos}&expand=comment&startAt=${startAtNum}&maxResults=${maxResultsNum}`;
    console.log('🔗 URL Completa CHGs:', url);

    const response = await requestWithFallback({
      method: 'get',
      url,
      headers: {
        Accept: 'application/json'
      }
    });

    const issues = response.data.issues || [];
    console.log('✅ CHGs retornadas:', issues.length);
    console.log('📊 Total disponível:', response.data.total);
    const statusUnicos = [...new Set(issues.map(i => i.fields?.status?.name).filter(Boolean))];
    console.log('📋 Status CHG encontrados:', statusUnicos);

    res.json({
      ...response.data,
      issues,
      total: response.data.total || issues.length,
      startAt: response.data.startAt ?? startAtNum,
      maxResults: response.data.maxResults ?? maxResultsNum
    });
  } catch (error) {
    console.error('Erro ao buscar CHGs JIRA:', error.message);
    console.error('Erro detalhes:', error.response?.data || error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Credenciais JIRA inválidas' });
    }
    
    if (error.response?.status === 403) {
      return res.status(403).json({ error: 'Acesso negado ao JIRA' });
    }

    res.status(500).json({ error: 'Erro ao buscar CHGs do JIRA' });
  }
});

// Buscar issue específica
app.get('/api/jira/issue/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const url = `https://${JIRA_CONFIG.DOMAIN}/rest/api/3/issue/${key}?expand=comment`;

    const response = await requestWithFallback({
      method: 'get',
      url,
      headers: {
        Accept: 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar issue:', error.message);
    res.status(500).json({ error: 'Erro ao buscar issue do JIRA' });
  }
});

// Adicionar comentário em issue
app.post('/api/jira/issue/:key/comment', async (req, res) => {
  try {
    const { key } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'Comentário é obrigatório' });
    }

    const url = `https://${JIRA_CONFIG.DOMAIN}/rest/api/3/issue/${key}/comment`;

    const response = await requestWithFallback({
      method: 'post',
      url,
      data: {
        body: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: comment
                }
              ]
            }
          ]
        }
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error.message);
    res.status(500).json({ error: 'Erro ao adicionar comentário' });
  }
});

// Atualizar status da issue
app.put('/api/jira/issue/:key/status', async (req, res) => {
  try {
    const { key } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const url = `https://${JIRA_CONFIG.DOMAIN}/rest/api/3/issue/${key}/transitions`;

    // Buscar transições disponíveis
    const transitionsRes = await requestWithFallback({
      method: 'get',
      url,
      headers: {
        Accept: 'application/json'
      }
    });

    const transition = transitionsRes.data.transitions.find(t => t.to.name === status);

    if (!transition) {
      return res.status(400).json({ error: 'Status não disponível para esta issue' });
    }

    // Executar transição
    await requestWithFallback({
      method: 'post',
      url,
      data: {
        transition: { id: transition.id }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, message: 'Status atualizado' });
  } catch (error) {
    console.error('Erro ao atualizar status:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

app.post('/api/export/spreadsheet', async (req, res) => {
  try {
    const { jiraFile, glpiFile, outputName } = req.body;
    if (!jiraFile?.data || !glpiFile?.data) {
      return res.status(400).json({ error: 'Os arquivos Jira e GLPI são obrigatórios.' });
    }

    const jiraBuffer = Buffer.from(jiraFile.data, 'base64');
    const glpiBuffer = Buffer.from(glpiFile.data, 'base64');
    const fileName = outputName || 'Comitê de Mudanças.xlsx';

    const workbookBuffer = await generateSpreadsheetBuffer(jiraBuffer, glpiBuffer, glpiFile.name, fileName);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(workbookBuffer);
  } catch (error) {
    console.error('Erro ao exportar planilha:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar a planilha.' });
  }
});

// ==================== INICIAÇÃO ====================
const PORT = process.env.BACKEND_PORT || 5001;
app.listen(PORT, () => {
  console.log(`\n🚀 Backend Proxy JIRA rodando em http://localhost:${PORT}`);
  console.log(`\n📝 Configuração JIRA:`);
  console.log(`   Domain: ${JIRA_CONFIG.DOMAIN}`);
  console.log(`   Email: ${JIRA_CONFIG.EMAIL}`);
  console.log(`   Tokens ativos: ${JIRA_CONFIG.TOKENS.length}`);
  console.log(`\nEndpoints disponíveis:`);
  console.log(`   GET /api/health - Verificar status`);
  console.log(`   GET /api/jira/issues - Buscar PRs`);
  console.log(`   GET /api/jira/changes - Buscar CHGs`);
  console.log(`   GET /api/jira/issue/:key - Buscar issue específica`);
  console.log(`   POST /api/jira/issue/:key/comment - Adicionar comentário`);
  console.log(`   PUT /api/jira/issue/:key/status - Atualizar status`);
  console.log(`   POST /api/export/spreadsheet - Gerar planilha via JS`);
});
