// A configuração JIRA deve ser fornecida pelo backend.
// Não armazene o domínio JIRA diretamente no código público.
const JIRA_CONFIG = {
  DOMAIN: process.env.REACT_APP_JIRA_DOMAIN || ''
};

// URL do backend proxy
// Prioriza REACT_APP_API_URL. Em desenvolvimento, usa localhost:5001 como fallback.
const BACKEND_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : '');

// Buscar CHGs do JIRA via backend proxy
export const fetchJiraChanges = async ({ startAt = 0, maxResults = 100, status = '', search = '', dateRange = null } = {}) => {
  try {
    console.log('🔄 Buscando CHGs do JIRA via backend proxy...');

    const params = new URLSearchParams();
    params.set('startAt', String(startAt));
    params.set('maxResults', String(maxResults));
    if (status && status.trim() && status.toUpperCase() !== 'TODOS') {
      params.set('status', status);
    }
    if (search) params.set('search', search);
    
    // Adicionar filtro de data se fornecido (em dias)
    if (dateRange) {
      params.set('daysAgo', String(dateRange));
    }

    const requestUrl = BACKEND_URL ? `${BACKEND_URL}/api/jira/changes?${params.toString()}` : `/api/jira/changes?${params.toString()}`;

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
    console.log('✅ CHGs carregados com sucesso:', data.issues?.length || 0, 'issues', 'total:', data.total);
    return {
      issues: data.issues || [],
      total: data.total || (data.issues || []).length,
      startAt: data.startAt || startAt,
      maxResults: data.maxResults || maxResults
    };
  } catch (error) {
    console.error("❌ Erro ao buscar CHGs do JIRA:", error);
    console.log('⚠️ Usando dados de exemplo (fallback)');
    return {
      issues: getMockData(),
      total: 1,
      startAt: 0,
      maxResults: getMockData().length
    };
  }
};

// Dados de exemplo para desenvolvimento
const getMockData = () => {
  return [
    {
      key: 'CHG-001',
      fields: {
        summary: 'Atualização do sistema de autenticação',
        status: { name: 'Aguardando Comitê' },
        reporter: { displayName: 'Usuário de Exemplo' },
        description: 'Sistema de autenticação precisa ser atualizado para suportar OAuth 2.0',
        customfield_10250: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Testes unitários e de integração já realizados com sucesso em ambiente de staging." }
              ]
            }
          ]
        },
        customfield_10249: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Rollback: reverter para versão anterior do serviço em caso de falha na autenticação." }
              ]
            }
          ]
        },
        customfield_11310: { value: 'Aprovado' }
      }
    }
  ];
};

// Extrair descrição simples de comentário ou customfield
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

const SYSTEMS_FECHAMENTO = [
  'SAP',
  'FINANCEIRO',
  'FISCAL',
  'GRI',
  'LOJA',
  'PDV',
  'ERP',
  'OPERACIONAL',
  'CONTABILIDADE'
];

const SYSTEMS_SAZONAL = [
  'PROMO',
  'BLACK FRIDAY',
  'CYBER MONDAY',
  'SAMS',
  'E-COMMERCE',
  'OMNI',
  'LOGÍSTICA',
  'VAREJO'
];

const FREEZE_WINDOWS = [
  {
    id: 'month_end',
    label: 'Período de Fechamento',
    month: null,
    startDay: 25,
    endDay: 31,
    severity: 'high',
    description: 'Final de mês com operação de fechamento financeiro'
  },
  {
    id: 'carrefour_anniversary',
    label: 'Aniversário Carrefour',
    month: 5,
    startDay: 10,
    endDay: 18,
    severity: 'high',
    description: 'Intervalo de comunicação e campanha interna'
  },
  {
    id: 'sams_anniversary',
    label: "Aniversário Sam's",
    month: 7,
    startDay: 10,
    endDay: 18,
    severity: 'medium',
    description: 'Forte volume de vendas no varejo Sam’s'
  },
  {
    id: 'start_of_year',
    label: 'Início de Ano',
    month: 0,
    startDay: 1,
    endDay: 10,
    severity: 'medium',
    description: 'Alta probabilidade de mudanças críticas no início do ano'
  },
  {
    id: 'pre_black_friday',
    label: 'Pré-Black Friday',
    month: 10,
    startDay: 15,
    endDay: 30,
    severity: 'high',
    description: 'Período sazonal de alto tráfego e demanda'
  }
];

const buildAuditFlags = (fields, created, updated, dueDate, changeType) => {
  const summary = fields.summary || "";
  const description = extrairDescricaoSimples(fields.description || "");
  const componentText = Array.isArray(fields.components)
    ? fields.components.map((c) => c.name || c).join(' ')
    : (fields.components || "");
  const labelText = Array.isArray(fields.labels) ? fields.labels.join(' ') : (fields.labels || "");

  const searchableText = [
    summary,
    description,
    changeType,
    componentText,
    labelText
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matchedFechamento = SYSTEMS_FECHAMENTO.filter(system => searchableText.includes(system.toLowerCase()));
  const matchedSazonal = SYSTEMS_SAZONAL.filter(system => searchableText.includes(system.toLowerCase()));

  const auditDate = dueDate || updated || created || new Date();
  const auditMonth = auditDate.getMonth();
  const auditDay = auditDate.getDate();

  const matchedWindows = FREEZE_WINDOWS.filter((window) => {
    if (window.month === null) {
      return auditDay >= window.startDay && auditDay <= window.endDay;
    }
    return window.month === auditMonth && auditDay >= window.startDay && auditDay <= window.endDay;
  });

  const auditAlerts = [
    ...matchedFechamento.map(system => `Sistema de fechamento detectado: ${system}`),
    ...matchedSazonal.map(system => `Sistema sazonal detectado: ${system}`),
    ...matchedWindows.map(window => `${window.label}: ${window.description}`)
  ];

  const freezeRisk = matchedWindows.length > 0 || matchedFechamento.length > 0
    ? 'high'
    : matchedSazonal.length > 0
      ? 'medium'
      : 'low';

  return {
    auditAlerts,
    freezeRisk,
    auditDate,
    auditDateDisplay: auditDate ? auditDate.toLocaleDateString('pt-BR') : 'Sem prazo'
  };
};

// Processar CHGs do JIRA
export const processJiraChanges = (issues) => {
  if (!issues || issues.length === 0) {
    return { changes: [], stats: { total: 0, aprovados: 0, reprovados: 0 } };
  }

  let aprovadosCount = 0;
  let reprovadosCount = 0;

  const processedChanges = issues.map(issue => {
    const f = issue.fields || {};
    const rawStatus = (f.status && f.status.name) || "N/A";
    const normalizedStatus = rawStatus.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
    const status = rawStatus.toString().toUpperCase();
    const changeTypeRaw = f['Change type'] || f.changeType || (f.issuetype && f.issuetype.name) || f.customfield_11311 || "";
    const changeType = typeof changeTypeRaw === 'string' ? changeTypeRaw : (changeTypeRaw?.value || changeTypeRaw?.name || "");
    const isEmergency = /emergency|emergencial/i.test(changeType);
    const isFinalized = /CANCELADO|CONCLUIDO|NAO EXECUTADO/.test(normalizedStatus);
    const isConcluidoComSucesso = /CONCLUIDO COM SUCESSO/.test(normalizedStatus) && !/CONCLUIDO COM FALHA/.test(normalizedStatus);
    const isNotExecuted = /\bNAO EXECUTADO\b/.test(normalizedStatus);
    const isPIRPending = /AGUARDANDO APROVACAO PIR/.test(normalizedStatus);

    // Extrair dados dos custom fields
    const textoTeste = extrairDescricaoSimples(f.customfield_10250 || "");
    const textoRollback = extrairDescricaoSimples(f.customfield_10249 || "");
    const qaSelecaoRaw = f.customfield_11310;
    const qaSelecao = typeof qaSelecaoRaw === 'string'
      ? qaSelecaoRaw
      : qaSelecaoRaw?.value || "";
    const telefoneRaw = f.customfield_16971 || f.customfield_10251 || f.customfield_12502 || "";
    const telefone = typeof telefoneRaw === 'string'
      ? telefoneRaw.trim()
      : extrairDescricaoSimples(telefoneRaw).trim();
    const emailRaw = f.reporter?.emailAddress || "";
    const email = typeof emailRaw === 'string'
      ? emailRaw.trim()
      : extrairDescricaoSimples(emailRaw).trim();
    const responsavelNome = f.reporter ? f.reporter.displayName : "Não informado";
    
    // Extrair datas
    const created = f.created ? new Date(f.created) : null;
    const updated = f.updated ? new Date(f.updated) : null;
    const dueDate = f.duedate ? new Date(f.duedate) : null;
    const isOverdue = dueDate && dueDate < new Date() && !isFinalized;
    
    // Validar erros
    let erros = [];
    
    if (!textoTeste || textoTeste.length < 10) {
      erros.push("Falta Teste");
    }
    
    if (!textoRollback || textoRollback.length < 10) {
      erros.push("Falta Rollback");
    }
    
    // Validar QA
    if (!qaSelecao) {
      erros.push("QA não informado");
    } else {
      const qaNaoSeAplica = /não se aplica|nao se aplica|n\/a|n\.a|- não se aplica -/i.test(qaSelecao);
      const qaAprovado = /aprovado/i.test(qaSelecao);

      if (qaNaoSeAplica) {
        const qaLimpo = textoTeste.toLowerCase().trim();
        const termosInvalidos = ["n/a", "nao se aplica", "não se aplica", "n.a", "vazio", "teste", ".", "---"];
        if (qaLimpo.length < 15 || termosInvalidos.some(termo => qaLimpo.includes(termo))) {
          erros.push("Justificativa QA insuficiente");
        }
      } else if (!qaAprovado) {
        erros.push("QA não aprovada");
      }
    }
    
    const auditMetadata = buildAuditFlags(f, created, updated, dueDate, changeType);
    const isAprovado = isConcluidoComSucesso || (!isNotExecuted && erros.length === 0);
    if (isAprovado) {
      aprovadosCount++;
    } else {
      reprovadosCount++;
    }
    
    const jiraKey = issue.key || "N/A";
    const statusLabel = isConcluidoComSucesso
      ? "Concluído com sucesso"
      : isNotExecuted
        ? "Não executado"
        : isPIRPending
          ? "Pendente PIR"
          : isAprovado
            ? "Aprovado"
            : "Pendente";
    const statusVariant = isConcluidoComSucesso
      ? "success"
      : isNotExecuted
        ? "neutral"
        : isPIRPending
          ? "pending"
          : isAprovado
            ? "approved"
            : "warning";

    return {
      id: jiraKey,
      key: jiraKey,
      resumo: f.summary || "Sem título",
      status,
      rawStatus,
      statusLabel,
      statusVariant,
      changeType: changeType || "Desconhecido",
      isEmergency,
      isFinalized,
      responsavel: responsavelNome,
      telefone: telefone || "Não informado",
      email: email || "Não informado",
      complianceLabel: statusLabel,
      complianceVariant: statusVariant,
      motivos: erros.join(", ") || "Sem pendências",
      qaJustificativa: qaSelecao === "Não se Aplica" ? textoTeste : "N/A (Anexado)",
      testes: textoTeste.substring(0, 300) + (textoTeste.length > 300 ? "..." : ""),
      rollback: textoRollback.substring(0, 300) + (textoRollback.length > 300 ? "..." : ""),
      qaStatus: qaSelecao || "Não preenchido",
      isAprovado: isAprovado,
      link: `https://${JIRA_CONFIG.DOMAIN}/browse/${jiraKey}`,
      created,
      updated,
      dueDate,
      isOverdue,
      dueDateDisplay: dueDate ? dueDate.toLocaleDateString('pt-BR') : 'Sem prazo',
      auditAlerts: auditMetadata.auditAlerts,
      freezeRisk: auditMetadata.freezeRisk,
      auditDate: auditMetadata.auditDate,
      auditDateDisplay: auditMetadata.auditDateDisplay
    };
  });

  // Ordenar: emergencial antes, não priorizar concluído/cancelado, depois reprovados primeiro
  processedChanges.sort((a, b) => {
    const aPriority = a.isEmergency && !a.isFinalized ? 0 : 1;
    const bPriority = b.isEmergency && !b.isFinalized ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    if (a.isAprovado === b.isAprovado) return 0;
    return a.isAprovado ? 1 : -1;
  });

  return {
    changes: processedChanges,
    stats: {
      total: processedChanges.length,
      aprovados: aprovadosCount,
      reprovados: reprovadosCount,
      pctReprovado: processedChanges.length ? Math.round((reprovadosCount / processedChanges.length) * 100) : 0
    }
  };
};
