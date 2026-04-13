import React, { useState, useEffect, useMemo } from 'react';
import { saveAs } from 'file-saver';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';
import { fetchJiraChanges, processJiraChanges } from '../../services/changeService';
import './ChangesTab.css';

const CHANGES_STORAGE_KEY = 'changesData';

const STATUS_PIPELINE = [
  'NOVO',
  'AGUARDANDO COMITÊ',
  'AGUARDANDO APROVAÇÃO',
  'AGUARDANDO APROVAÇÃO EMERGENCIAL',
  'AGUARDANDO APROVAÇÃO PADRÃO',
  'AGUARDANDO APROVAÇÃO PIR',
  'AGUARDANDO APROVAÇÃO SI',
  'AGUARDANDO GOVERNANÇA',
  'AGUARDANDO IMPLANTAÇÃO',
  'EM ANDAMENTO',
  'CONCLUÍDO COM SUCESSO',
  'CONCLUÍDO COM FALHA',
  'EM ROLLBACK',
  'NÃO EXECUTADO',
  'PENDENTE EVIDENCIA PIR',
  'CANCELADO'
];

const normalizeStatus = (value) =>
  value ? value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() : '';

const FREEZE_CALENDAR_WINDOWS = [
  {
    id: 'jan_fechamento',
    label: 'Fechamento contábil',
    month: 0,
    startDay: 1,
    endDay: 1,
    description: 'Fechamento contábil em 1º de janeiro',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'jan_fechamento_31',
    label: 'Fechamento contábil',
    month: 0,
    startDay: 31,
    endDay: 31,
    description: 'Fechamento contábil em 31 de janeiro',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'fev_fechamento_1',
    label: 'Fechamento contábil',
    month: 1,
    startDay: 1,
    endDay: 1,
    description: 'Fechamento contábil em 1º de fevereiro',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'fev_fechamento_28',
    label: 'Fechamento contábil',
    month: 1,
    startDay: 28,
    endDay: 28,
    description: 'Fechamento contábil em 28 de fevereiro',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'fev_sazonal',
    label: 'Freezing sazonal',
    month: 1,
    startDay: 13,
    endDay: 18,
    description: 'Freezing sazonal em fevereiro',
    color: '#F59E0B',
    severity: 'medium'
  },
  {
    id: 'mar_fechamento',
    label: 'Fechamento contábil',
    month: 2,
    startDay: 1,
    endDay: 31,
    description: 'Mês inteiro de fechamento contábil em março',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'abr_fechamento_1',
    label: 'Fechamento contábil',
    month: 3,
    startDay: 1,
    endDay: 1,
    description: 'Fechamento contábil em 1º de abril',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'abr_sazonal',
    label: 'Freezing sazonal',
    month: 3,
    startDay: 2,
    endDay: 5,
    description: 'Freezing sazonal em abril',
    color: '#F59E0B',
    severity: 'medium'
  },
  {
    id: 'abr_fechamento_30',
    label: 'Fechamento contábil',
    month: 3,
    startDay: 30,
    endDay: 30,
    description: 'Fechamento contábil em 30 de abril',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'mai_fechamento_1',
    label: 'Fechamento contábil',
    month: 4,
    startDay: 1,
    endDay: 1,
    description: 'Fechamento contábil em 1º de maio',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'mai_sazonal',
    label: 'Freezing sazonal',
    month: 4,
    startDay: 5,
    endDay: 10,
    description: 'Freezing sazonal em maio',
    color: '#F59E0B',
    severity: 'medium'
  },
  {
    id: 'mai_fechamento_30',
    label: 'Fechamento contábil',
    month: 4,
    startDay: 30,
    endDay: 30,
    description: 'Fechamento contábil em 30 de maio',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'mai_fechamento_31',
    label: 'Fechamento contábil',
    month: 4,
    startDay: 31,
    endDay: 31,
    description: 'Fechamento contábil em 31 de maio',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'jun_fechamento_1',
    label: 'Fechamento contábil',
    month: 5,
    startDay: 1,
    endDay: 1,
    description: 'Fechamento contábil em 1º de junho',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'jun_sazonal',
    label: 'Freezing sazonal',
    month: 5,
    startDay: 11,
    endDay: 12,
    description: 'Freezing sazonal em junho',
    color: '#F59E0B',
    severity: 'medium'
  },
  {
    id: 'jun_fechamento_30',
    label: 'Fechamento contábil',
    month: 5,
    startDay: 30,
    endDay: 30,
    description: 'Fechamento contábil em 30 de junho',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'jul_fechamento_1',
    label: 'Fechamento contábil',
    month: 6,
    startDay: 1,
    endDay: 1,
    description: 'Fechamento contábil em 1º de julho',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'jul_fechamento_31',
    label: 'Fechamento contábil',
    month: 6,
    startDay: 31,
    endDay: 31,
    description: 'Fechamento contábil em 31 de julho',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'ago_fechamento_1',
    label: 'Fechamento contábil',
    month: 7,
    startDay: 1,
    endDay: 1,
    description: 'Fechamento contábil em 1º de agosto',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'ago_sazonal',
    label: 'Freezing sazonal',
    month: 7,
    startDay: 6,
    endDay: 9,
    description: 'Freezing sazonal em agosto',
    color: '#F59E0B',
    severity: 'medium'
  },
  {
    id: 'ago_fechamento_29',
    label: 'Fechamento contábil',
    month: 7,
    startDay: 29,
    endDay: 29,
    description: 'Fechamento contábil em 29 de agosto',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'ago_fechamento_31',
    label: 'Fechamento contábil',
    month: 7,
    startDay: 31,
    endDay: 31,
    description: 'Fechamento contábil em 31 de agosto',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'set_fechamento_1',
    label: 'Fechamento contábil',
    month: 8,
    startDay: 1,
    endDay: 1,
    description: 'Fechamento contábil em 1º de setembro',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'set_fechamento_30',
    label: 'Fechamento contábil',
    month: 8,
    startDay: 30,
    endDay: 30,
    description: 'Fechamento contábil em 30 de setembro',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'set_out_aniversario',
    label: 'Freezing Aniversário - Carrefour & Sam\'s',
    month: 8,
    startDay: 11,
    endDay: 30,
    description: 'Freezing de aniversário de setembro a outubro',
    color: '#DB2777',
    severity: 'high'
  },
  {
    id: 'out_aniversario',
    label: 'Freezing Aniversário - Carrefour & Sam\'s',
    month: 9,
    startDay: 1,
    endDay: 31,
    description: 'Mês inteiro de aniversário Carrefour & Sam\'s',
    color: '#DB2777',
    severity: 'high'
  },
  {
    id: 'nov_fechamento_1',
    label: 'Fechamento contábil',
    month: 10,
    startDay: 1,
    endDay: 1,
    description: 'Fechamento contábil em 1º de novembro',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'nov_sazonal',
    label: 'Freezing sazonal',
    month: 10,
    startDay: 14,
    endDay: 29,
    description: 'Freezing sazonal em novembro',
    color: '#F59E0B',
    severity: 'medium'
  },
  {
    id: 'nov_fechamento_30',
    label: 'Fechamento contábil',
    month: 10,
    startDay: 30,
    endDay: 30,
    description: 'Fechamento contábil em 30 de novembro',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'dez_fechamento_1',
    label: 'Fechamento contábil',
    month: 11,
    startDay: 1,
    endDay: 1,
    description: 'Fechamento contábil em 1º de dezembro',
    color: '#F59E0B',
    severity: 'high'
  },
  {
    id: 'dez_sazonal',
    label: 'Freezing sazonal',
    month: 11,
    startDay: 15,
    endDay: 30,
    description: 'Freezing sazonal em dezembro',
    color: '#F59E0B',
    severity: 'medium'
  },
  {
    id: 'dez_fechamento_31',
    label: 'Fechamento contábil',
    month: 11,
    startDay: 31,
    endDay: 31,
    description: 'Fechamento contábil em 31 de dezembro',
    color: '#F59E0B',
    severity: 'high'
  }
];

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const formatOutputName = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `Comitê de Mudanças ${day}-${month}-${year}.xlsx`;
};

const ChangesTab = () => {
  const [changes, setChanges] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban', 'list', 'timeline'
  const [lastUpdated, setLastUpdated] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false); // Toggle para mostrar só vencidas
  const [selectedMetricModal, setSelectedMetricModal] = useState(null); // 'approved', 'rejected', 'emergency'
  const [jiraFile, setJiraFile] = useState(null);
  const [glpiFile, setGlpiFile] = useState(null);
  const [spreadsheetError, setSpreadsheetError] = useState(null);
  const [spreadsheetProcessing, setSpreadsheetProcessing] = useState(false);
  const [spreadsheetSuccess, setSpreadsheetSuccess] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);


  const handleJiraFileChange = (event) => {
    setSpreadsheetError(null);
    setSpreadsheetSuccess('');
    setJiraFile(event.target.files?.[0] || null);
  };

  const handleGlpiFileChange = (event) => {
    setSpreadsheetError(null);
    setSpreadsheetSuccess('');
    setGlpiFile(event.target.files?.[0] || null);
  };

  const generateComiteSpreadsheet = async () => {
    if (!jiraFile || !glpiFile) {
      setSpreadsheetError('Selecione ambos os arquivos JIRA e GLPI para gerar a planilha.');
      return;
    }

    try {
      setSpreadsheetError(null);
      setSpreadsheetSuccess('');
      setSpreadsheetProcessing(true);

      const [jiraBase64, glpiBase64] = await Promise.all([
        fileToBase64(jiraFile),
        fileToBase64(glpiFile),
      ]);

      const fileName = formatOutputName();
      const response = await fetch('/api/export/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jiraFile: { name: jiraFile.name, data: jiraBase64 },
          glpiFile: { name: glpiFile.name, data: glpiBase64 },
          outputName: fileName,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Erro ao gerar a planilha no backend.');
      }

      const blob = await response.blob();
      saveAs(blob, fileName);
      setSpreadsheetSuccess(`Planilha gerada: ${fileName}`);
    } catch (err) {
      console.error(err);
      setSpreadsheetError('Falha ao gerar a planilha. Verifique o backend e tente novamente.');
    } finally {
      setSpreadsheetProcessing(false);
    }
  };

  const isAwaitingImplementation = (change) => {
    const raw = String(change.rawStatus || change.status || '').toLowerCase();
    return /aguardando implanta[cç][aã]o|aguardando implementação|aguardando implementacao/i.test(raw);
  };

  const isRejectedChange = (change) => {
    const rawStatus = normalizeStatus(change.status || change.rawStatus || '');
    const allowedStatuses = ['AGUARDANDO APROVACAO', 'REPROVADA', 'REVISAO NECESSARIA'];
    const isAllowed = allowedStatuses.includes(rawStatus);
    const isExcluded = rawStatus === 'EM ANDAMENTO' || isAwaitingImplementation(change) || rawStatus.startsWith('CONCLUIDO');
    return isAllowed && !isExcluded;
  };

  const isApprovedChange = (change) => {
    return change.isAprovado && !change.isEmergency && !change.isOverdue;
  };

  const isEmergencyChange = (change) => {
    return change.isEmergency && !change.isFinalized;
  };

  const getStatusBadgeStyle = (change) => {
    const raw = String(change.rawStatus || '').toLowerCase();
    if (raw.includes('concluído com sucesso') || raw.includes('concluido com sucesso')) {
      return { background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' };
    }
    if (raw.includes('concluído com falha') || raw.includes('concluido com falha') || raw.includes('falha')) {
      return { background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' };
    }
    if (change.statusVariant === 'approved') {
      return { background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' };
    }
    if (change.statusVariant === 'warning') {
      return { background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' };
    }
    return { background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' };
  };

  const getAuditRiskColor = (risk) => {
    if (risk === 'high') return '#EF4444';
    if (risk === 'medium') return '#F59E0B';
    return '#10B981';
  };

  const getAuditRiskLabel = (risk) => {
    if (risk === 'high') return 'Alto';
    if (risk === 'medium') return 'Médio';
    return 'Baixo';
  };

  const auditSummary = useMemo(() => {
    const total = changes.length;
    const withAlerts = changes.filter(c => Array.isArray(c.auditAlerts) && c.auditAlerts.length > 0);
    const highRisk = changes.filter(c => c.freezeRisk === 'high').length;
    const mediumRisk = changes.filter(c => c.freezeRisk === 'medium').length;
    const lowRisk = total - highRisk - mediumRisk;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    const calendarWindows = FREEZE_CALENDAR_WINDOWS.map((window) => {
      const monthName = window.month === null
        ? 'Todos os meses'
        : MONTH_NAMES[window.month];
      const active = window.month === null
        ? currentDay >= window.startDay && currentDay <= window.endDay
        : window.month === currentMonth && currentDay >= window.startDay && currentDay <= window.endDay;
      const matchedChanges = changes.filter((change) =>
        Array.isArray(change.auditAlerts) &&
        change.auditAlerts.some(alert => alert.toLowerCase().includes(window.label.toLowerCase()))
      );

      return {
        ...window,
        monthName,
        active,
        matchedChanges,
        count: matchedChanges.length
      };
    });

    return {
      total,
      withAlertsCount: withAlerts.length,
      highRisk,
      mediumRisk,
      lowRisk,
      calendarWindows,
      activeWindows: calendarWindows.filter(w => w.active).length
    };
  }, [changes]);

  const calendarMonthSummary = useMemo(() => {
    return Array.from({ length: 12 }, (_, month) => {
      const windows = FREEZE_CALENDAR_WINDOWS.filter((win) => win.month === month || win.month === null);
      const risk = windows.some((w) => w.severity === 'high')
        ? 'high'
        : windows.some((w) => w.severity === 'medium')
          ? 'medium'
          : windows.length > 0
            ? 'low'
            : 'safe';

      const summaryItems = windows.length > 0
        ? windows.map((w) => {
            const period = w.startDay === w.endDay ? `dia ${w.startDay}` : `de ${w.startDay} a ${w.endDay}`;
            return `${w.label} ${period}`;
          })
        : ['Sem janelas de freeze programadas'];

      return {
        month,
        monthName: MONTH_NAMES[month],
        risk,
        summaryItems
      };
    });
  }, []);

  // Calculate view statistics
  const viewStats = useMemo(() => {
    if (!changes.length) return {};
    
    const grouped = {};
    STATUS_PIPELINE.forEach(status => {
      grouped[status] = changes.filter(c => normalizeStatus(c.status) === normalizeStatus(status)).length;
    });

    const emergency = changes.filter(c => c.isEmergency && !c.isFinalized).length;
    const avgTime = changes.length > 0 
      ? Math.round(changes.reduce((sum, c) => sum + (c.timeline || 0), 0) / changes.length)
      : 0;

    return {
      byStagee: grouped,
      emergency,
      avgTime,
      onTrack: Math.round((stats?.aprovados || 0) / (stats?.total || 1) * 100)
    };
  }, [changes, stats]);

  const loadChanges = async () => {
    try {
      setLoading(true);
      setError(null);
      const jiraChanges = await fetchJiraChanges({
        startAt: 0,
        maxResults: 100,
        status: 'TODOS',
        search: searchTerm
      });
      const { changes: processedChanges, stats: statsData } = processJiraChanges(jiraChanges.issues || jiraChanges);
      setChanges(processedChanges);
      setStats(statsData);
      const now = new Date();
      setLastUpdated(now);
      localStorage.setItem(CHANGES_STORAGE_KEY, JSON.stringify({
        changes: processedChanges,
        stats: statsData,
        lastUpdated: now.toISOString()
      }));
    } catch (err) {
      setError("Erro ao carregar CHGs do JIRA. Verifique a conexão.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`Copiado: ${value}`);
      window.setTimeout(() => setCopyFeedback(''), 1800);
    } catch (copyError) {
      console.error('Erro ao copiar para a área de transferência:', copyError);
    }
  };

  useEffect(() => {
    const storedChanges = localStorage.getItem(CHANGES_STORAGE_KEY);
    if (storedChanges) {
      try {
        const { changes: storedItems, stats: storedStats, lastUpdated: storedLastUpdated } = JSON.parse(storedChanges);
        if (Array.isArray(storedItems)) {
          setChanges(storedItems);
          setStats(storedStats);
          setLastUpdated(storedLastUpdated ? new Date(storedLastUpdated) : null);
        }
      } catch (parseError) {
        console.error('Erro ao ler CHGs do localStorage:', parseError);
      }
    }
  }, []);

  const getFilteredChanges = () => {
    let filtered = changes;
    
    // Filtro de vencidas
    if (showOverdueOnly) {
      filtered = filtered.filter(c => c.isOverdue);
    }
    
    // Filtro de busca
    const lowerTerm = searchTerm.trim().toLowerCase();
    if (!lowerTerm) return filtered;
    
    return filtered.filter((change) => {
      return (
        change.key.toLowerCase().includes(lowerTerm) ||
        change.resumo.toLowerCase().includes(lowerTerm) ||
        change.responsavel.toLowerCase().includes(lowerTerm)
      );
    });
  };

  const filteredChanges = getFilteredChanges();
  const modalFilteredItems = (() => {
    let filtered = [];
    if (selectedMetricModal === 'approved') {
      filtered = changes.filter(isApprovedChange);
    } else if (selectedMetricModal === 'rejected') {
      filtered = changes.filter(isRejectedChange);
    } else if (selectedMetricModal === 'emergency') {
      filtered = changes.filter(isEmergencyChange);
    }
    return filtered;
  })();
  const groupedByStatus = useMemo(() => {
    const grouped = {};
    STATUS_PIPELINE.forEach(status => {
      grouped[status] = filteredChanges.filter(c => normalizeStatus(c.status) === normalizeStatus(status));
    });
    return grouped;
  }, [filteredChanges]);

  if (loading) {
    return (
      <div className="changes-container">
        <div className="loader-modern">
          <div className="spinner"></div>
          <p>Sincronizando CHGs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="changes-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="changes-container">
      {/* HERO METRICS */}
      <div className="hero-metrics">
        <div className="metric-card primary">
          <div className="metric-value">{stats?.total || 0}</div>
          <div className="metric-label">Mudanças Totais</div>
          <div className="metric-trend">Últimas 100 sincronizadas</div>
        </div>
        <div 
          className="metric-card success" 
          onClick={() => setSelectedMetricModal('approved')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
        >
          <div className="metric-value">{stats?.aprovados || 0}</div>
          <div className="metric-label">Aprovadas</div>
          <div className="metric-trend">{viewStats.onTrack}% em dia 🔗</div>
        </div>
        <div 
          className="metric-card danger" 
          onClick={() => setSelectedMetricModal('rejected')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
        >
          <div className="metric-value">{stats?.reprovados || 0}</div>
          <div className="metric-label">Reprovadas</div>
          <div className="metric-trend">{stats?.pctReprovado || 0}% taxa 🔗</div>
        </div>
        <div 
          className="metric-card warning" 
          onClick={() => setSelectedMetricModal('emergency')}
          style={{ cursor: viewStats.emergency > 0 ? 'pointer' : 'default', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => viewStats.emergency > 0 && (e.currentTarget.style.transform = 'translateY(-4px)')}
          onMouseLeave={(e) => viewStats.emergency > 0 && (e.currentTarget.style.transform = 'translateY(0px)')}
        >
          <div className="metric-value">{viewStats.emergency}</div>
          <div className="metric-label">Emergências</div>
          <div className="metric-trend">Requer atenção {viewStats.emergency > 0 && '🔗'}</div>
        </div>
      </div>

      <div className="audit-calendar-panel">
        <div className="audit-summary-row">
          <div className="audit-summary-card">
            <div className="audit-summary-title">Alertas de Auditoria</div>
            <div className="audit-summary-value">{auditSummary.withAlertsCount}</div>
            <div className="audit-summary-note">mudanças com alertas de risco</div>
          </div>
          <div className="audit-summary-card">
            <div className="audit-summary-title">Risco Freeze</div>
            <div className="audit-summary-value">{auditSummary.highRisk} 🔥</div>
            <div className="audit-summary-note">alertas críticos</div>
          </div>
          <div className="audit-summary-card">
            <div className="audit-summary-title">Janela Ativa</div>
            <div className="audit-summary-value">{auditSummary.activeWindows}</div>
            <div className="audit-summary-note">períodos de freeze hoje</div>
          </div>
        </div>
        <button className="full-calendar-btn" onClick={() => setShowCalendarModal(true)}>
          Ver calendário por mês
        </button>
      </div>

      {/* SEARCH & CONTROLS */}
      <div className="controls-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 Procure por ID, resumo ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="modern-search"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              ✕
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Filtro de Vencidas */}
          <button
            onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            title={`${showOverdueOnly ? 'Limpar' : 'Mostrar'} mudanças vencidas`}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `2px solid ${showOverdueOnly ? '#E4002B' : '#D1D5DB'}`,
              background: showOverdueOnly ? 'rgba(228, 0, 43, 0.1)' : 'transparent',
              color: showOverdueOnly ? '#E4002B' : '#6B7280',
              fontWeight: showOverdueOnly ? '700' : '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => e.target.style.borderColor = showOverdueOnly ? '#DC0A2D' : '#9CA3AF'}
          >
            ⏰ Vencidas {changes.filter(c => c.isOverdue).length > 0 && `(${changes.filter(c => c.isOverdue).length})`}
          </button>
        </div>

        <div className="view-switcher">
          <button 
            className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
            onClick={() => setViewMode('kanban')}
            title="Visualização em Kanban"
          >
            📊 Pipeline
          </button>
          <button 
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Visualização em Lista"
          >
            📋 Lista
          </button>
          <button 
            className={`view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
            title="Visualização em Timeline"
          >
            ⏱️ Timeline
          </button>
        </div>

        <button onClick={() => loadChanges()} className="refresh-modern">
          🔄 Atualizar
        </button>
      </div>

      <div className="spreadsheet-export-panel">
        <div className="spreadsheet-export-header">
          <h2>Gerar planilha final do Comitê</h2>
          <p>Envie o export do JIRA e do GLPI para combinar as mudanças e gerar a planilha final com o nome "Comitê de Mudanças dd-mm-aaaa".</p>
        </div>
        <div className="spreadsheet-export-controls">
          <label className="file-field">
            <span>Arquivo JIRA</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleJiraFileChange} />
            {jiraFile && <small>{jiraFile.name}</small>}
          </label>
          <label className="file-field">
            <span>Arquivo GLPI</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleGlpiFileChange} />
            {glpiFile && <small>{glpiFile.name}</small>}
          </label>
          <button
            className="export-button"
            onClick={generateComiteSpreadsheet}
            disabled={!jiraFile || !glpiFile || spreadsheetProcessing}
          >
            {spreadsheetProcessing ? 'Gerando...' : 'Gerar planilha final'}
          </button>
        </div>
        {spreadsheetError && <div className="spreadsheet-error">{spreadsheetError}</div>}
        {spreadsheetSuccess && <div className="spreadsheet-success">{spreadsheetSuccess}</div>}
      </div>

      {copyFeedback && <div className="copy-feedback-modern">{copyFeedback}</div>}

      {showCalendarModal && (
        <div className="calendar-modal-overlay" onClick={() => setShowCalendarModal(false)}>
          <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-modal-header">
              <div>
                <h2>Visão mensal de freeze</h2>
                <p>Doze meses claros, rápidos e fáceis de entender — com os riscos e janelas de cada mês.</p>
              </div>
              <button className="close-modal" onClick={() => setShowCalendarModal(false)}>✕</button>
            </div>
            <div className="calendar-modal-summary">
              <div className="summary-card">
                <span>Janela ativas</span>
                <strong>{auditSummary.activeWindows}</strong>
              </div>
              <div className="summary-card">
                <span>CHGs com alertas</span>
                <strong>{auditSummary.withAlertsCount}</strong>
              </div>
              <div className="summary-card">
                <span>Alertas críticos</span>
                <strong>{auditSummary.highRisk}</strong>
              </div>
            </div>
            <div className="calendar-modal-body">
              <div className="month-chart-card">
                <div className="chart-header">
                  <div>
                    <span>Risco por mês</span>
                    <p>Os 12 meses com o status de risco e as principais janelas de freeze.</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={calendarMonthSummary} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="monthName" tickLine={false} axisLine={false} stroke="rgba(255,255,255,0.6)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.08)' }}
                      contentStyle={{
                        background: 'rgba(15, 20, 25, 0.96)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '14px',
                        color: '#fff',
                        boxShadow: '0 18px 45px rgba(0,0,0,0.28)',
                        padding: '14px'
                      }}
                      labelStyle={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}
                      formatter={(value, name, props) => [
                        props?.payload?.summaryItems?.join(' • ') || 'Sem detalhes de janela',
                        'Janelas'
                      ]}
                    />
                    <Bar dataKey="riskValue" radius={[14, 14, 0, 0]} barSize={28}>
                      {calendarMonthSummary.map((entry) => (
                        <Cell
                          key={entry.month}
                          fill={
                            entry.risk === 'high'
                              ? '#ef4444'
                              : entry.risk === 'medium'
                                ? '#f59e0b'
                                : entry.risk === 'low'
                                  ? '#3b82f6'
                                  : '#10b981'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="month-grid">
                {calendarMonthSummary.map((monthData) => (
                  <div key={monthData.month} className={`month-summary-card ${monthData.risk}`}>
                    <div className="month-summary-title">
                      <span>{monthData.monthName}</span>
                      <span className={`month-summary-tag ${monthData.risk}`}>
                        {monthData.risk === 'high'
                          ? 'Alto risco'
                          : monthData.risk === 'medium'
                            ? 'Risco médio'
                            : monthData.risk === 'low'
                              ? 'Atenção'
                              : 'Livre'}
                      </span>
                    </div>
                    <div className="month-summary-items">
                      {monthData.summaryItems.map((item, index) => (
                        <div key={index} className="month-summary-item">{item}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="kanban-board">
          {STATUS_PIPELINE.slice(0, 8).map(status => {
            const changesList = groupedByStatus[status] || [];
            return (
              <div key={status} className="kanban-column">
                <div className="column-header">
                  <h3>{status}</h3>
                  <span className="column-count">{changesList.length}</span>
                </div>
                <div className="kanban-cards">
                  {changesList.length > 0 ? (
                    changesList.map(change => (
                      <div 
                        key={change.key} 
                        className={`kanban-card ${change.statusVariant}`}
                        onClick={() => setExpandedCard(expandedCard === change.key ? null : change.key)}
                      >
                        <div className="card-top">
                          <a 
                            href={change.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="change-id"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {change.key}
                          </a>
                          {change.isEmergency && <span className="emergency-dot">🔴</span>}
                        </div>
                        <p className="card-title">{change.resumo.substring(0, 60)}</p>
                        <div className="card-footer">
                          <span className="responsible">{change.responsavel.split(' ')[0]}</span>
                          <span className="status-badge">{change.status.substring(0, 12)}</span>
                        </div>
                        
                        {expandedCard === change.key && (
                          <div className="card-expanded">
                            <div className="detail-row">
                              <span className="label">Telefone:</span>
                              <span className="value">{change.telefone}</span>
                            </div>
                            <div className="detail-row">
                              <span className="label">Email:</span>
                              <span className="value">{change.email}</span>
                            </div>
                            <div className="detail-row">
                              <span className="label">QA:</span>
                              <span className="value">{change.qaStatus}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="empty-column">Vazio</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="list-view">
          {filteredChanges.length > 0 ? (
            <div className="list-items">
              {filteredChanges.map(change => (
                <div 
                  key={change.key} 
                  className={`list-item ${change.statusVariant}`}
                  onClick={() => setExpandedCard(expandedCard === change.key ? null : change.key)}
                >
                  <div className="list-item-main">
                    <div className="list-item-left">
                      <a 
                        href={change.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="list-id"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {change.key}
                      </a>
                      <div className="list-title">{change.resumo}</div>
                      <div className="list-meta">
                        <span>{change.responsavel}</span>
                        {change.isEmergency && <span className="emergency-badge-list">🔴 EMERGÊNCIA</span>}
                        {change.isOverdue && <span style={{ color: '#EF4444', fontWeight: '700', fontSize: '11px' }}>⏰ VENCIDA</span>}
                      </div>
                    </div>
                    <div className="list-item-right">
                      <span className={`status-label ${change.statusVariant}`}>{change.status}</span>
                    </div>
                  </div>

                  {expandedCard === change.key && (
                    <div className="list-item-expanded">
                      <div className="expanded-grid">
                        <div className="exp-cell">
                          <span className="exp-label">Telefone</span>
                          <span className="exp-value">{change.telefone}</span>
                        </div>
                        <div className="exp-cell">
                          <span className="exp-label">Email</span>
                          <span className="exp-value">{change.email}</span>
                        </div>
                        <div className="exp-cell">
                          <span className="exp-label">QA</span>
                          <span className="exp-value">{change.qaStatus}</span>
                        </div>
                        <div className="exp-cell">
                          <span className="exp-label">Prazo</span>
                          <span className="exp-value" style={{ color: change.isOverdue ? '#EF4444' : '#6B7280', fontWeight: change.isOverdue ? '700' : '600' }}>
                            {change.dueDateDisplay} {change.isOverdue && '⏰'}
                          </span>
                        </div>
                      </div>
                      <div className="expanded-content">
                        <div className="content-box">
                          <strong>Testes:</strong> {change.testes}
                        </div>
                        <div className="content-box">
                          <strong>Rollback:</strong> {change.rollback}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-modern">
              <div className="empty-icon">📭</div>
              <p>Nenhuma mudança encontrada</p>
              <small>Tente ajustar seus filtros</small>
            </div>
          )}
        </div>
      )}

      {/* TIMELINE VIEW */}
      {viewMode === 'timeline' && (
        <div className="timeline-view">
          {filteredChanges.length > 0 ? (
            <div className="timeline">
              {filteredChanges.map((change, index) => (
                <div key={change.key} className={`timeline-item ${change.statusVariant}`}>
                  <div className="timeline-marker">
                    <div className="marker-dot"></div>
                    {index !== filteredChanges.length - 1 && <div className="marker-line"></div>}
                  </div>
                  <div className="timeline-content">
                    <a 
                      href={change.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="timeline-id"
                    >
                      {change.key}
                    </a>
                    <p className="timeline-title">{change.resumo}</p>
                    <div className="timeline-meta">
                      <span className="meta-badge">{change.status}</span>
                      <span className="meta-person">{change.responsavel}</span>
                      {change.isEmergency && <span className="meta-emergency">🔴 EMERGÊNCIA</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-modern">
              <div className="empty-icon">📭</div>
              <p>Nenhuma mudança encontrada</p>
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div className="changes-footer">
        <div className="footer-info">
          {lastUpdated && (
            <span className="update-time">Sincronizado em {lastUpdated.toLocaleTimeString('pt-BR')}</span>
          )}
        </div>
      </div>

      {/* MODAL - METRIC DETAILS */}
      {selectedMetricModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary, #0f1419)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 200, 255, 0.2)',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            animation: 'slideUp 0.3s ease'
          }}>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid rgba(0, 200, 255, 0.2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h2 style={{ margin: 0, color: '#00C8FF', fontSize: '18px', fontWeight: '700' }}>
                  {selectedMetricModal === 'approved' && '✅ Mudanças Aprovadas'}
                  {selectedMetricModal === 'rejected' && '❌ Mudanças Reprovadas'}
                  {selectedMetricModal === 'emergency' && '🚁 Mudanças Emergenciais'}
                </h2>
                <div style={{ color: '#A5B4FC', fontSize: '13px' }}>
                  {modalFilteredItems.length} mudança{modalFilteredItems.length === 1 ? '' : 's'} nesta categoria
                </div>
              </div>
              <button
                onClick={() => setSelectedMetricModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(0, 200, 255, 0.1)';
                  e.target.style.color = '#00C8FF';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#999';
                }}
              >
                ✕
              </button>
            </div>

            {/* FILTERED LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {modalFilteredItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
                  <p>Nenhuma mudança encontrada nesta categoria</p>
                </div>
              ) : (
                modalFilteredItems.map((change) => (
                  <div
                    key={change.key}
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${
                        change.statusVariant === 'approved' ? 'rgba(16, 185, 129, 0.3)' :
                        change.statusVariant === 'warning' ? 'rgba(245, 158, 11, 0.3)' :
                        'rgba(239, 68, 68, 0.3)'
                      }`,
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      hover: 'translateX(4px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 200, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(0, 200, 255, 0.5)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = `${
                        change.statusVariant === 'approved' ? 'rgba(16, 185, 129, 0.3)' :
                        change.statusVariant === 'warning' ? 'rgba(245, 158, 11, 0.3)' :
                        'rgba(239, 68, 68, 0.3)'
                      }`;
                      e.currentTarget.style.transform = 'translateX(0px)';
                    }}
                    onClick={() => {
                      copyText(change.responsavel);
                    }}
                  >
                    <div>
                      <a
                        href={change.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#00C8FF',
                          textDecoration: 'none',
                          fontWeight: '700',
                          fontSize: '13px',
                          marginRight: '12px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {change.key}
                      </a>
                      <p style={{ margin: '4px 0 0 0', color: '#E8EAED', fontSize: '13px' }}>
                        {change.resumo}
                      </p>
                      <div style={{ marginTop: '6px', display: 'flex', gap: '12px', fontSize: '12px', color: '#999' }}>
                        <span title="Responsável">{change.responsavel}</span>
                        <span title="Email">{change.email}</span>
                        <span title="Telefone">{change.telefone}</span>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                        ...getStatusBadgeStyle(change)
                      }}>
                        {change.status}
                      </div>
                      {(() => {
                        const raw = String(change.rawStatus || '').toLowerCase();
                        if (raw.includes('concluído com sucesso') || raw.includes('concluido com sucesso')) return <span style={{ fontSize: '12px' }}>✅</span>;
                        if (raw.includes('concluído com falha') || raw.includes('concluido com falha') || raw.includes('falha')) return <span style={{ fontSize: '12px' }}>❌</span>;
                        return null;
                      })()}
                    </div>
                  </div>
                ))) }
            </div>

            {/* FOOTER */}
            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(0, 200, 255, 0.2)', textAlign: 'center', fontSize: '12px', color: '#999' }}>
              Total: {(() => {
                if (selectedMetricModal === 'approved') return changes.filter(isApprovedChange).length;
                if (selectedMetricModal === 'rejected') return changes.filter(isRejectedChange).length;
                if (selectedMetricModal === 'emergency') return changes.filter(isEmergencyChange).length;
                return 0;
              })()} mudanças
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangesTab;
