import React, { useState, useEffect, useCallback } from 'react';
import { fetchJiraIssues, processJiraIssues } from '../../services/jiraService';
import './PRsTab.css';
import jsPDF from 'jspdf';

const PR_STORAGE_KEY = 'prsData';

const PRsTab = () => {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterAtrasados, setFilterAtrasados] = useState(false);
  const [filterRCAIncompleta, setFilterRCAIncompleta] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notes, setNotes] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  // Estados para o modal de relatório
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportFormat, setReportFormat] = useState('pdf');
  const [includeAllStatuses, setIncludeAllStatuses] = useState(true);
  const [includeRCAIncomplete, setIncludeRCAIncomplete] = useState(true);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [commentsFilter, setCommentsFilter] = useState('all');
  const [minDaysFilter, setMinDaysFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadPRs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const jiraIssues = await fetchJiraIssues();
      const { issues: processedIssues, stats: statsData } = processJiraIssues(jiraIssues);
      setIssues(processedIssues);
      setStats(statsData);
      const now = new Date();
      setLastUpdated(now);
      localStorage.setItem(PR_STORAGE_KEY, JSON.stringify({
        issues: processedIssues,
        stats: statsData,
        lastUpdated: now.toISOString()
      }));
    } catch (err) {
      setError("Erro ao carregar PRs do JIRA. Verifique suas credenciais.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedNotes = localStorage.getItem('prNotes');
    if (storedNotes) {
      setNotes(JSON.parse(storedNotes));
    }

    const storedPrs = localStorage.getItem(PR_STORAGE_KEY);
    if (storedPrs) {
      try {
        const { issues: storedIssues, stats: storedStats, lastUpdated: storedLastUpdated } = JSON.parse(storedPrs);
        if (Array.isArray(storedIssues)) {
          setIssues(storedIssues);
          setStats(storedStats);
          setLastUpdated(storedLastUpdated ? new Date(storedLastUpdated) : null);
        }
      } catch (parseError) {
        console.error('Erro ao ler PRs do localStorage:', parseError);
      }
    }
  }, []);

  const saveNote = (issueKey, value) => {
    setNotes((prevNotes) => {
      const nextNotes = {
        ...prevNotes,
        [issueKey]: value,
      };
      localStorage.setItem('prNotes', JSON.stringify(nextNotes));
      return nextNotes;
    });
  };

  const getFilteredIssues = () => {
    const lowerTerm = searchTerm.trim().toLowerCase();
    return issues.filter(issue => {
      if (filterAtrasados && !issue.isAtrasado) return false;
      if (filterRCAIncompleta && issue.rcaCompleta === "Completa") return false;
      if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
      if (ownerFilter !== 'all' && issue.owner !== ownerFilter) return false;
      if (commentsFilter === 'with' && (!issue.ultimoComentario || issue.ultimoComentario === "Sem comentários")) return false;
      if (commentsFilter === 'without' && issue.ultimoComentario && issue.ultimoComentario !== "Sem comentários") return false;
      if (minDaysFilter && issue.diasParado < Number(minDaysFilter)) return false;
      if (dateFrom && new Date(issue.ultimaAtividadeISO) < new Date(dateFrom)) return false;
      if (dateTo && new Date(issue.ultimaAtividadeISO) > new Date(`${dateTo}T23:59:59`)) return false;
      if (!lowerTerm) return true;
      return (
        issue.key.toLowerCase().includes(lowerTerm) ||
        issue.resumo.toLowerCase().includes(lowerTerm) ||
        issue.responsavel.toLowerCase().includes(lowerTerm) ||
        issue.owner.toLowerCase().includes(lowerTerm)
      );
    });
  };

  const statusOptions = Array.from(new Set(issues.map(issue => issue.status))).sort();
  const ownerOptions = Array.from(new Set(issues.map(issue => issue.owner))).sort();
  const activeFilterCount = [
    filterAtrasados,
    filterRCAIncompleta,
    statusFilter !== 'all',
    ownerFilter !== 'all',
    commentsFilter !== 'all',
    minDaysFilter,
    dateFrom,
    dateTo
  ].filter(Boolean).length;

  const filteredIssues = getFilteredIssues();

  const generatePDFReport = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const reportDate = new Date();
    const periodLabel = `${monthNames[reportMonth - 1]} ${reportYear}`;

    let reportIssues = issues;
    if (!includeAllStatuses) {
      reportIssues = reportIssues.filter(issue => issue.status === 'Em Criação (RCA)');
    }
    if (!includeRCAIncomplete) {
      reportIssues = reportIssues.filter(issue => issue.rcaCompleta === 'Completa');
    }

    const totalPRs = reportIssues.length;
    const totalAtrasados = reportIssues.filter(i => i.isAtrasado).length;
    const totalRCACompleta = reportIssues.filter(i => i.rcaCompleta === 'Completa').length;
    const avgDays = totalPRs ? Math.round(reportIssues.reduce((sum, i) => sum + i.diasParado, 0) / totalPRs) : 0;

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('CARREFOUR BRASIL', margin, yPosition);
    yPosition += 8;

    doc.setDrawColor(0, 75, 135);
    doc.setLineWidth(0.8);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório Executivo de PRs', margin, yPosition);
    yPosition += 6;
    doc.setFontSize(10);
    doc.text(`Período: ${periodLabel}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Data emissão: ${reportDate.toLocaleDateString('pt-BR')}`, margin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Executivo', margin, yPosition);
    yPosition += 7;

    const boxWidth = (pageWidth - margin * 2 - 12) / 4;
    const boxHeight = 18;
    const metricLabels = ['Total PRs', 'Atrasados', 'RCA Completa', 'Média dias parado'];
    const metricValues = [totalPRs, totalAtrasados, totalRCACompleta, avgDays];

    for (let i = 0; i < 4; i++) {
      const boxX = margin + i * (boxWidth + 4);
      doc.setDrawColor(170);
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(boxX, yPosition, boxWidth, boxHeight, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(72, 85, 99);
      doc.text(metricLabels[i], boxX + 3, yPosition + 6);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 43, 91);
      doc.text(String(metricValues[i]), boxX + 3, yPosition + 14);
    }
    yPosition += boxHeight + 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Parâmetros do relatório', margin, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Status incluídos: ${includeAllStatuses ? 'Todos' : 'Apenas Em Criação (RCA)'}`, margin, yPosition);
    yPosition += 5;
    doc.text(`RCA incompleta incluída: ${includeRCAIncomplete ? 'Sim' : 'Não'}`, margin, yPosition);
    yPosition += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Detalhamento de PRs', margin, yPosition);
    yPosition += 8;

    // Tabela de PRs
    const colWidths = [18, 60, 52, 18, 24];
    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
    const tableX = (pageWidth - tableWidth) / 2;
    const headers = ['PR', 'Resumo', 'Responsável', 'Dias', 'RCA'];
    const headerHeight = 8;
    const rowPadding = 2;
    const cellLineHeight = 5;

    const drawTableHeader = () => {
      doc.setDrawColor(180);
      doc.setFillColor(240, 242, 245);
      doc.rect(tableX, yPosition, tableWidth, headerHeight, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(39, 58, 93);
      let x = tableX;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x + rowPadding, yPosition + 6);
        x += colWidths[i];
      }
      yPosition += headerHeight;
    };

    const printRow = (issue) => {
      const descriptionLines = doc.splitTextToSize(issue.resumo, colWidths[1] - rowPadding * 2);
      const responsibleLines = doc.splitTextToSize(issue.responsavel, colWidths[2] - rowPadding * 2);
      const rcaText = String(issue.rcaCompleta || '').replace(/[^-À-ÿ ]+/g, '').trim();
      const rcaLines = doc.splitTextToSize(rcaText, colWidths[4] - rowPadding * 2);
      const rowLines = Math.max(descriptionLines.length, responsibleLines.length, rcaLines.length, 1);
      const rowHeight = headerHeight + (rowLines - 1) * cellLineHeight;

      if (yPosition + rowHeight > pageHeight - margin - 10) {
        doc.addPage();
        yPosition = margin;
        drawTableHeader();
      }

      let x = tableX;
      for (let i = 0; i < colWidths.length; i++) {
        doc.setDrawColor(180);
        doc.rect(x, yPosition, colWidths[i], rowHeight);
        x += colWidths[i];
      }

      const cellY = yPosition + 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(43, 53, 69);
      doc.text(issue.key, tableX + rowPadding, cellY);
      doc.text(descriptionLines, tableX + colWidths[0] + rowPadding, cellY);
      doc.text(responsibleLines, tableX + colWidths[0] + colWidths[1] + rowPadding, cellY);
      doc.text(String(issue.diasParado), tableX + colWidths[0] + colWidths[1] + colWidths[2] + rowPadding, cellY);
      doc.text(rcaLines, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + rowPadding, cellY);

      yPosition += rowHeight;
    };

    drawTableHeader();
    reportIssues.forEach((issue) => {
      printRow(issue);
    });

    if (yPosition > pageHeight - 25) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Documento interno Carrefour Brasil', pageWidth / 2, pageHeight - 10, { align: 'center' });
    const totalPages = doc.internal.getNumberOfPages();
    doc.text(`Página ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

    doc.save(`relatorio-prs-${periodLabel.replace(' ', '-').toLowerCase()}-${reportYear}.pdf`);
    setShowReportModal(false);
  };

  const generateDocReport = () => {
    const escapeHTML = (value) => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const reportDate = new Date();
    const periodLabel = `${monthNames[reportMonth - 1]} ${reportYear}`;

    let reportIssues = issues;
    if (!includeAllStatuses) {
      reportIssues = reportIssues.filter(issue => issue.status === 'Em Criação (RCA)');
    }
    if (!includeRCAIncomplete) {
      reportIssues = reportIssues.filter(issue => issue.rcaCompleta === 'Completa');
    }

    const htmlContent = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório de PRs</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1f2937; margin: 20px; }
    h1 { color: #004B87; }
    .header { margin-bottom: 18px; }
    .header p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #9ca3af; padding: 8px; vertical-align: top; }
    th { background: #f3f4f6; color: #111827; }
    .summary-box { display: inline-block; width: 23%; padding: 10px; margin: 4px 1%; background: #f8fafc; border: 1px solid #d1d5db; border-radius: 6px; }
    .summary-label { font-size: 11px; color: #4b5563; margin-bottom: 4px; }
    .summary-value { font-size: 18px; font-weight: bold; color: #111827; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CARREFOUR BRASIL</h1>
    <p><strong>Relatório Executivo de PRs</strong></p>
    <p>Período: ${escapeHTML(periodLabel)}</p>
    <p>Data emissão: ${escapeHTML(reportDate.toLocaleDateString('pt-BR'))}</p>
  </div>
  <div class="summary-box">
    <div class="summary-label">Total PRs</div>
    <div class="summary-value">${reportIssues.length}</div>
  </div>
  <div class="summary-box">
    <div class="summary-label">Atrasados</div>
    <div class="summary-value">${reportIssues.filter(i => i.isAtrasado).length}</div>
  </div>
  <div class="summary-box">
    <div class="summary-label">RCA Completa</div>
    <div class="summary-value">${reportIssues.filter(i => i.rcaCompleta === 'Completa').length}</div>
  </div>
  <div class="summary-box">
    <div class="summary-label">Média dias parado</div>
    <div class="summary-value">${reportIssues.length ? Math.round(reportIssues.reduce((sum, i) => sum + i.diasParado, 0) / reportIssues.length) : 0}</div>
  </div>
  <p><strong>Parâmetros:</strong> Status incluídos: ${includeAllStatuses ? 'Todos' : 'Apenas Em Criação (RCA)'}, RCA incompleta incluída: ${includeRCAIncomplete ? 'Sim' : 'Não'}</p>
  <table>
    <thead>
      <tr>
        <th>PR</th>
        <th>Resumo</th>
        <th>Responsável</th>
        <th>Dias</th>
        <th>RCA</th>
      </tr>
    </thead>
    <tbody>
      ${reportIssues.map(issue => `
        <tr>
          <td>${escapeHTML(issue.key)}</td>
          <td>${escapeHTML(issue.resumo)}</td>
          <td>${escapeHTML(issue.responsavel)}</td>
          <td>${escapeHTML(issue.diasParado)}</td>
          <td>${escapeHTML(issue.rcaCompleta)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-prs-${periodLabel.replace(' ', '-').toLowerCase()}-${reportYear}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    setShowReportModal(false);
  };

  const generateReport = () => {
    if (reportFormat === 'doc') {
      generateDocReport();
    } else {
      generatePDFReport();
    }
  };

  if (loading) {
    return (
      <div className="prs-tab">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Carregando PRs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prs-tab">
      {/* KPI Cards */}
      {stats && (
        <div className="kpi-cards">
          <div className="kpi-card blue">
            <div className="kpi-value">{stats.total}</div>
            <div className="kpi-label">Total de PRs</div>
          </div>
          <div className="kpi-card red">
            <div className="kpi-value">{stats.atrasados}</div>
            <div className="kpi-label">Atrasados</div>
          </div>
          <div className="kpi-card purple">
            <div className="kpi-value">{stats.mediaDias}</div>
            <div className="kpi-label">Média dias parado</div>
          </div>
          <div className="kpi-card orange">
            <div className="kpi-value">{stats.rcaIncompleta}%</div>
            <div className="kpi-label">RCA incompleta</div>
          </div>
        </div>
      )}

      {/* Filtros e Ações */}
      <div className="actions-bar">
        <div className="filters-dropdown-wrapper">
          <div className="filters-header">
            <div className="search-field">
              <span className="search-icon">🔎</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar PR, responsável ou owner..."
              />
            </div>
            <button
              className={`filters-toggle-btn ${filterDropdownOpen ? 'open' : ''}`}
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              type="button"
            >
              Filtros avançados {activeFilterCount ? `(${activeFilterCount})` : ''}
            </button>
          </div>

          {filterDropdownOpen && (
            <div className="filters-dropdown">
              <div className="filter-summary">
                <div className="summary-item">
                  <strong>{issues.length}</strong>
                  <span>PRs totais</span>
                </div>
                <div className="summary-item">
                  <strong>{filteredIssues.length}</strong>
                  <span>Exibidos</span>
                </div>
                <div className="summary-item">
                  <strong>{stats ? stats.atrasados : 0}</strong>
                  <span>Atrasados</span>
                </div>
                <div className="summary-item">
                  <strong>{stats ? stats.rcaIncompleta : 0}%</strong>
                  <span>RCA incompleta</span>
                </div>
              </div>

              <div className="filter-panel">
                <div className="filter-panel-group">
                  <label>Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">Todos</option>
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-panel-group">
                  <label>Owner</label>
                  <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                    <option value="all">Todos</option>
                    {ownerOptions.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-panel-group">
                  <label>Última atividade (de)</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="filter-panel-group">
                  <label>Última atividade (até)</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="filter-panel-group">
                  <label>Dias parado mínimo</label>
                  <input type="number" min="0" value={minDaysFilter} onChange={(e) => setMinDaysFilter(e.target.value)} placeholder="0" />
                </div>
                <div className="filter-panel-group filter-radio-group">
                  <label>Comentários</label>
                  <div className="radio-grid">
                    <label>
                      <input type="radio" name="commentsFilter" value="all" checked={commentsFilter === 'all'} onChange={(e) => setCommentsFilter(e.target.value)} /> Todos
                    </label>
                    <label>
                      <input type="radio" name="commentsFilter" value="with" checked={commentsFilter === 'with'} onChange={(e) => setCommentsFilter(e.target.value)} /> Com comentários
                    </label>
                    <label>
                      <input type="radio" name="commentsFilter" value="without" checked={commentsFilter === 'without'} onChange={(e) => setCommentsFilter(e.target.value)} /> Sem comentários
                    </label>
                  </div>
                </div>
                <div className="filter-panel-group filter-checkboxes">
                  <label>
                    <input type="checkbox" checked={filterAtrasados} onChange={(e) => setFilterAtrasados(e.target.checked)} /> Apenas atrasados
                  </label>
                  <label>
                    <input type="checkbox" checked={filterRCAIncompleta} onChange={(e) => setFilterRCAIncompleta(e.target.checked)} /> Apenas RCA incompleta
                  </label>
                </div>
              </div>

              <div className="filter-actions">
                <button className="filter-secondary-btn" type="button" onClick={() => {
                  setStatusFilter('all');
                  setOwnerFilter('all');
                  setCommentsFilter('all');
                  setMinDaysFilter('');
                  setDateFrom('');
                  setDateTo('');
                  setFilterAtrasados(false);
                  setFilterRCAIncompleta(false);
                  setSearchTerm('');
                }}>
                  Limpar tudo
                </button>
                <button className="filter-primary-btn" type="button" onClick={() => setFilterDropdownOpen(false)}>
                  Aplicar filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botão de Relatório */}
      <div className="report-section">
        <button className="report-btn" onClick={() => setShowReportModal(true)}>
          Gerar Relatório
        </button>
      </div>

      {/* Mensagens */}
      {error && <div className="error-message">{error}</div>}
      {!error && filteredIssues.length === 0 && !loading && (
        <div className="empty-state">
          <p>{lastUpdated ? 'Nenhum PR pendente no momento.' : 'Clique em Atualização imediata para carregar os PRs do JIRA.'}</p>
        </div>
      )}

      {/* Lista de PRs */}
      <div className="issues-container">
        {filteredIssues.map((issue) => (
          <div key={issue.key} className={`issue-card ${issue.rcaCompleta === "Completa" ? "rca-completa" : ""}`}>
            <div className="issue-header">
              <div className="issue-key-section">
                <span className="dias-pill">
                  <span className="dias-value">{issue.diasParado}</span>
                  <span className="dias-unit">dias</span>
                </span>
                <div className="key-row">
                  <a href={issue.link} target="_blank" rel="noopener noreferrer" className="issue-key">
                    {issue.key}
                  </a>
                  <span className={`rca-badge ${issue.rcaCompleta === "Completa" ? "complete" : "incomplete"}`}>
                    {issue.rcaCompleta}
                  </span>
                </div>
              </div>
              {issue.isAtrasado && <span className="atrasado-badge">ATRASADO</span>}
            </div>

            <div className="issue-summary">
              {issue.resumo}
            </div>

            <div className="issue-details">
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{issue.status}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Responsável:</span>
                <span className="detail-value">{issue.responsavel}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Owner:</span>
                <span className="detail-value">{issue.owner}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Última Atividade:</span>
                <span className="detail-value">{issue.ultimaAtividade}</span>
              </div>
            </div>

            {issue.ultimoComentario && issue.ultimoComentario !== "Sem comentários" && (
              <div className="issue-comment">
                <span className="comment-label">💬 Último Comentário:</span>
                <p className="comment-text">{issue.ultimoComentario}</p>
              </div>
            )}

            <div className="issue-notes">
              <div className="notes-header">
                <span>📝 Notas</span>
                <span className="notes-subtitle">Suas anotações ficam salvas neste navegador</span>
              </div>
              <textarea
                className="notes-textarea"
                value={notes[issue.key] || ''}
                onChange={(e) => saveNote(issue.key, e.target.value)}
                placeholder="Escreva aqui um comentário ou lembrete sobre esse PR..."
              />
            </div>

            <div className="issue-footer">
              <a href={issue.link} target="_blank" rel="noopener noreferrer" className="open-link">
                Abrir no JIRA →
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {stats && (
        <div className="info-footer">
          <p>Total de {filteredIssues.length} PR(s) exibido(s) • Atualizado em {lastUpdated ? lastUpdated.toLocaleTimeString('pt-BR') : '—'}</p>
        </div>
      )}

      <div className="emergency-refresh">
        <button className="emergency-btn" onClick={loadPRs}>
          Atualização imediata
        </button>
      </div>
      {/* Modal de Relatório */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Gerar Relatório</h3>
            <div className="modal-form">
              <div className="form-group">
                <label>Formato:</label>
                <select value={reportFormat} onChange={(e) => setReportFormat(e.target.value)}>
                  <option value="pdf">PDF</option>
                  <option value="doc">DOC</option>
                </select>
              </div>
              <div className="form-group">
                <label>Mês do relatório:</label>
                <select value={reportMonth} onChange={(e) => setReportMonth(parseInt(e.target.value))}>
                  <option value={1}>Janeiro</option>
                  <option value={2}>Fevereiro</option>
                  <option value={3}>Março</option>
                  <option value={4}>Abril</option>
                  <option value={5}>Maio</option>
                  <option value={6}>Junho</option>
                  <option value={7}>Julho</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Setembro</option>
                  <option value={10}>Outubro</option>
                  <option value={11}>Novembro</option>
                  <option value={12}>Dezembro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ano:</label>
                <input
                  type="number"
                  value={reportYear}
                  onChange={(e) => setReportYear(parseInt(e.target.value))}
                  min="2020"
                  max="2030"
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={includeAllStatuses}
                    onChange={(e) => setIncludeAllStatuses(e.target.checked)}
                  />
                  Incluir todos os status
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={includeRCAIncomplete}
                    onChange={(e) => setIncludeRCAIncomplete(e.target.checked)}
                  />
                  Incluir RCA incompleta
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowReportModal(false)}>Cancelar</button>
              <button className="generate-btn" onClick={generateReport}>
                Gerar {reportFormat === 'doc' ? 'DOC' : 'PDF'}
              </button>
            </div>
          </div>
        </div>
      )}    </div>
  );
};

export default PRsTab;
