// JIRA Configuration
const JIRA_CONFIG = {
  DOMAIN: "c4br.atlassian.net",
  EMAIL: "wagner_cardoso_2@carrefour.com",
  TOKEN: "ATATT3xFfGF0wRUdVVh3Ih9WQnerAiSId7TbJn2T1hAIz98g-viYYi2IHekoKSasTwsNS_5J9wLMt17e-Oz8QuYrN5DfPdgWW0JAuv6VMP4xV_UKukRaBc_rHbObuJnJOMES-KMP3XF-o77qCl354OZCXg8tFF_XbS54wM9RkFkljLGgHq2Esfw=941426E2"
};

// URL do backend proxy (configure conforme necessário)
// Prioriza REACT_APP_API_URL. Em desenvolvimento, usa localhost:5001 como fallback.
const BACKEND_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '');

// Buscar issues do JIRA via backend proxy (evita CORS)
export const fetchJiraIssues = async () => {
  try {
    const requestUrl = BACKEND_URL ? `${BACKEND_URL}/api/jira/issues` : '/api/jira/issues';
    console.log('🔄 Buscando PRs do JIRA via backend proxy...', requestUrl);

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta do backend:', response.status, errorText);
      throw new Error(`Backend Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ PRs carregados com sucesso:', data.issues?.length || 0, 'issues');
    return data.issues || [];
  } catch (error) {
    console.error("❌ Erro ao buscar PRs do JIRA:", error);

    // Retornar dados de exemplo para desenvolvimento
    console.log('⚠️ Usando dados de exemplo (fallback)');
    return getMockData();
  }
};

// Dados de exemplo para desenvolvimento
const getMockData = () => {
  return [
    {
      key: 'PR-001',
      fields: {
        summary: 'Problema na integração com sistema legado',
        status: { name: 'Em Criação (RCA)' },
        assignee: { displayName: 'João Silva' },
        reporter: { displayName: 'Maria Santos' },
        updated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        comment: {
          comments: [
            {
              body: 'Cliente relatou erro 500 ao tentar acessar o sistema. Análise inicial indica problema na API de autenticação. 5 porquês identificados: 1) Falha na validação de token, 2) Timeout no banco de dados, 3) Configuração incorreta de cache, 4) Problema na rede, 5) Falha no load balancer.',
              updated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]
        }
      }
    },
    {
      key: 'PR-002',
      fields: {
        summary: 'Sistema lento durante horário comercial',
        status: { name: 'Em Resolução' },
        assignee: { displayName: 'Carlos Oliveira' },
        reporter: { displayName: 'Ana Costa' },
        updated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        comment: {
          comments: [
            {
              body: 'Usuários relatam lentidão entre 10h e 16h. Verificado que há pico de uso simultâneo. Implementando cache distribuído.',
              updated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]
        }
      }
    },
    {
      key: 'PR-003',
      fields: {
        summary: 'Erro na exportação de relatórios',
        status: { name: 'Em Criação (RCA)' },
        assignee: { displayName: 'Pedro Lima' },
        reporter: { displayName: 'Fernanda Rocha' },
        updated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        comment: {
          comments: [
            {
              body: 'Relatórios não são gerados quando há caracteres especiais no nome do arquivo.',
              updated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]
        }
      }
    }
  ];
};

// Processar issues do JIRA
export const processJiraIssues = (issues) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let atrasados = 0;
  let totalDias = 0;
  let rcaIncompletaCount = 0;

  const allowedStatuses = new Set(["Em Criação (RCA)", "Em Resolução"]);
  const processedIssues = issues
    .filter(issue => {
      const statusName = issue.fields?.status?.name;
      const nome = issue.fields?.assignee?.displayName || "";
      if (!allowedStatuses.has(statusName)) return false;
      return nome !== "Edgard Antonio Carolino da Silva" && nome !== "VINICIUS PACHECO";
    })
    .map(issue => {
      const f = issue.fields || {};
      let dataUltimaAtividade = new Date(f.updated || f.created);
      let textoComentario = "Sem comentários";
      let rcaStatus = "Incompleta";

      if (f.comment && f.comment.comments && f.comment.comments.length > 0) {
        const ultimoCmt = f.comment.comments[f.comment.comments.length - 1];
        const dataCmt = new Date(ultimoCmt.updated);
        if (dataCmt > dataUltimaAtividade) dataUltimaAtividade = dataCmt;

        const texto = extrairDescricaoSimples(ultimoCmt.body).toLowerCase();
        textoComentario = texto.substring(0, 220) + (texto.length > 220 ? "..." : "");

        if (/5 porquês|5 whys|ishikawa|fishbone|causa raiz|root cause|porquê|por que|por quê/i.test(texto) || texto.length > 400) {
          rcaStatus = "Completa";
        }
      }

      const diffDias = Math.floor(Math.abs(hoje - dataUltimaAtividade) / (1000 * 60 * 60 * 24));
      totalDias += diffDias;

      const dataFormatada = new Date(dataUltimaAtividade).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let isAtrasado = false;
      if (dataUltimaAtividade < hoje) {
        atrasados++;
        isAtrasado = true;
      }

      if (rcaStatus === "Incompleta") rcaIncompletaCount++;

      const jiraKey = issue.key || "N/A";

      return {
        id: jiraKey,
        key: jiraKey,
        resumo: f.summary || "Sem título",
        status: (f.status && f.status.name) || "N/A",
        responsavel: f.assignee ? f.assignee.displayName : "Não atribuído",
        owner: f.reporter ? f.reporter.displayName : "Não informado",
        ultimaAtividade: dataFormatada,
        ultimaAtividadeISO: dataUltimaAtividade.toISOString(),
        ultimoComentario: textoComentario,
        diasParado: diffDias,
        rcaCompleta: rcaStatus,
        isAtrasado: isAtrasado,
        link: `https://${JIRA_CONFIG.DOMAIN}/browse/${jiraKey}`
      };
    });

  // Ordenar por dias parado (descendente)
  processedIssues.sort((a, b) => b.diasParado - a.diasParado);

  const mediaDias = processedIssues.length ? Math.round(totalDias / processedIssues.length) : 0;
  const pctRCA = processedIssues.length ? Math.round((rcaIncompletaCount / processedIssues.length) * 100) : 0;

  return {
    issues: processedIssues,
    stats: {
      total: processedIssues.length,
      atrasados,
      mediaDias,
      rcaIncompleta: pctRCA
    }
  };
};

// Extrair descrição simples de comentário
function extrairDescricaoSimples(desc) {
  if (!desc) return "";
  if (typeof desc === 'string') return desc;
  try {
    let texto = "";
    const extrair = (obj) => {
      if (obj.text) texto += obj.text;
      if (obj.content) obj.content.forEach(extrair);
      if (obj.type === 'paragraph') texto += "\n";
    };
    extrair(desc);
    return texto.trim();
  } catch (e) {
    return "";
  }
}

const jiraService = {
  JIRA_CONFIG,
  fetchJiraIssues,
  processJiraIssues
};

export default jiraService;
