import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchJiraChanges, processJiraChanges } from '../../services/changeService';
import './ContactsTab.css';

const CONTACT_OVERRIDES = {
  'Wagner Silva': {
    email: 'wagner.silva@carrefour.com',
    group: 'Governança de TI',
    phone: '+55 11 99999-0001',
  },
  'Enrique Santos': {
    email: 'enrique.santos@carrefour.com',
    group: 'Operações de Change',
    phone: '+55 11 99999-0002',
  },
  'Kelvyn Costa': {
    email: 'kelvyn.costa@carrefour.com',
    group: 'Infraestrutura e Deploy',
    phone: '+55 11 99999-0003',
  },
  'Roberta Almeida': {
    email: 'roberta.almeida@carrefour.com',
    group: 'Suporte e Sustentação',
    phone: '+55 11 99999-0004',
  },
};

const PERFORMANCE_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'high', label: 'Acima de 80%' },
  { id: 'medium', label: '50-80%' },
  { id: 'low', label: 'Abaixo de 50%' },
];

const normalizeText = (value) =>
  value ? value.toString().trim().toLowerCase() : '';

const buildEmail = (name) => {
  const override = CONTACT_OVERRIDES[name]?.email;
  if (override) return override;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '');
  return `${slug}@carrefour.com`;
};

const buildGroup = (name, changeType) => {
  const override = CONTACT_OVERRIDES[name]?.group;
  if (override) return override;
  if (/security|segurança|governança/i.test(changeType)) return 'Governança e Segurança';
  if (/infra|deploy|implantação|implantacao/i.test(changeType)) return 'Infraestrutura e Deploy';
  if (/integracao|integração|integração/i.test(changeType)) return 'Integração DevOps';
  return 'Operações de Change';
};

const formatPhone = (phone = '') => {
  const normalized = phone.toString().trim();
  return normalized || 'Não informado';
};

const normalizeStatus = (value) =>
  value ? value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() : '';

const getPerformanceLabel = (rate) => {
  if (rate >= 80) return 'Alta confiabilidade';
  if (rate >= 50) return 'Performance estável';
  return 'Atenção necessária';
};

const createContactProfiles = (changes) => {
  const profileMap = {};

  changes.forEach((change) => {
    const fullName = change.responsavel || 'Não informado';
    const key = normalizeText(fullName) || `contact-${Math.random().toString(36).slice(2)}`;
    const email = change.email && change.email !== 'Não informado'
      ? change.email
      : buildEmail(fullName);
    const group = buildGroup(fullName, change.changeType);
    const phone = CONTACT_OVERRIDES[fullName]?.phone || formatPhone(change.telefone);

    if (!profileMap[key]) {
      profileMap[key] = {
        id: key,
        fullName,
        email,
        phone,
        group,
        totalChanges: 0,
        successfulChanges: 0,
        implementationChanges: 0,
        cancelledChanges: 0,
        failedChanges: 0,
        emergencyCount: 0,
        recentChanges: [],
        notes: [],
      };
    }

    const profile = profileMap[key];
    profile.totalChanges += 1;
    const rawStatus = normalizeStatus(change.status || change.rawStatus || '');
    const isSuccessful = /CONCLUIDO COM SUCESSO|CONCLUIDO SUCESSO|SUCESSO|APROVADO/.test(rawStatus) || change.isAprovado;
    const isImplementation = /IMPLEMENTA(C|Ç)AO|EM ANDAMENTO|AGUARDANDO IMPLANTACAO|AGUARDANDO IMPLANTA[CÇ][AÃ]O|IMPLANTACAO/.test(rawStatus);
    const isCancelled = /CANCELADO|CANCELADA/.test(rawStatus);
    const isFailed = /CONCLUIDO COM FALHA|CONCLUIDO FALHA|FALHA|NÃO EXECUTADO|NAO EXECUTADO|ROLLBACK/.test(rawStatus);

    if (isSuccessful) {
      profile.successfulChanges += 1;
    }
    if (isImplementation) {
      profile.implementationChanges += 1;
    }
    if (isCancelled) {
      profile.cancelledChanges += 1;
    }
    if (isFailed) {
      profile.failedChanges += 1;
    }
    if (change.isEmergency) {
      profile.emergencyCount += 1;
    }

    profile.recentChanges.push({
      key: change.key || 'N/A',
      link: change.link || '#',
      status: change.status,
    });
    profile.notes.push({ key: change.key, status: change.status, success: isSuccessful });
    profile.phone = profile.phone !== 'Não informado' ? profile.phone : formatPhone(change.telefone);
  });

  const profiles = Object.values(profileMap).map((profile) => ({
    ...profile,
    successRate: profile.totalChanges
      ? Math.round((profile.successfulChanges / profile.totalChanges) * 100)
      : 0,
  }));

  profiles.sort((a, b) => {
    if (b.totalChanges !== a.totalChanges) return b.totalChanges - a.totalChanges;
    return b.successRate - a.successRate;
  });

  return profiles;
};

const ATTENTION_FLAGS_KEY = 'contactAttentionFlags';

const createSummary = (profiles) => {
  const totalContacts = profiles.length;
  const totalChanges = profiles.reduce((sum, profile) => sum + profile.totalChanges, 0);
  const totalSuccess = profiles.reduce((sum, profile) => sum + profile.successfulChanges, 0);
  const totalFailures = profiles.reduce((sum, profile) => sum + profile.failedChanges, 0);
  const totalEmergencies = profiles.reduce((sum, profile) => sum + profile.emergencyCount, 0);
  const avgSuccessRate = totalChanges ? Math.round((totalSuccess / totalChanges) * 100) : 0;
  const topContributor = profiles[0] || null;

  return {
    totalContacts,
    totalChanges,
    totalSuccess,
    totalFailures,
    totalEmergencies,
    avgSuccessRate,
    topContributor,
  };
};

const ContactsTab = () => {
  const [profiles, setProfiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [showEmergenciesOnly, setShowEmergenciesOnly] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [attentionFlags, setAttentionFlags] = useState(() => {
    const stored = localStorage.getItem(ATTENTION_FLAGS_KEY);
    return stored ? JSON.parse(stored) : {};
  });

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const jiraChanges = await fetchJiraChanges();
      const { changes: processedChanges } = processJiraChanges(jiraChanges.issues || jiraChanges);
      const contactProfiles = createContactProfiles(processedChanges);
      setProfiles(contactProfiles);
      setStats(createSummary(contactProfiles));
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar a lista de contatos. Verifique a conexão com o JIRA.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    localStorage.setItem(ATTENTION_FLAGS_KEY, JSON.stringify(attentionFlags));
  }, [attentionFlags]);

  const toggleAttentionFlag = (profileId) => {
    setAttentionFlags((prev) => ({
      ...prev,
      [profileId]: !prev[profileId],
    }));
  };

  const groupOptions = useMemo(() => {
    const groups = Array.from(new Set(profiles.map((profile) => profile.group))).sort();
    return groups;
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const term = normalizeText(searchTerm);
    return profiles.filter((profile) => {
      if (groupFilter !== 'all' && profile.group !== groupFilter) return false;
      if (showEmergenciesOnly && profile.emergencyCount === 0) return false;
      if (performanceFilter === 'high' && profile.successRate < 80) return false;
      if (performanceFilter === 'medium' && (profile.successRate < 50 || profile.successRate >= 80)) return false;
      if (performanceFilter === 'low' && profile.successRate >= 50) return false;
      if (!term) return true;
      return [profile.fullName, profile.email, profile.phone, profile.group]
        .map(normalizeText)
        .some((value) => value.includes(term));
    });
  }, [profiles, searchTerm, groupFilter, performanceFilter, showEmergenciesOnly]);

  if (loading) {
    return <div className="contacts-container"><p>Carregando lista de contatos...</p></div>;
  }

  if (error) {
    return <div className="contacts-container"><p className="contacts-error">{error}</p></div>;
  }

  return (
    <div className="contacts-container">
      <div className="contacts-kpis">
        <div className="kpi-card">
          <div className="kpi-label">Contatos ativos</div>
          <div className="kpi-value">{stats?.totalContacts ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">CHGs atribuídas</div>
          <div className="kpi-value highlight">{stats?.totalChanges ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Taxa média de sucesso</div>
          <div className="kpi-value approved-color">{stats?.avgSuccessRate ?? 0}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Emergências no radar</div>
          <div className="kpi-value warning-color">{stats?.totalEmergencies ?? 0}</div>
        </div>
      </div>

      <div className="contacts-panel">
        <div className="contacts-panel-header">
          <div>
            <h2>Lista de contatos</h2>
            <p className="panel-description">
              Perfil avançado de cada responsável por CHGs, para você priorizar quem contatar e entender histórico de sucesso.
            </p>
          </div>
          {stats?.topContributor && (
            <div className="top-contributor-card">
              <div className="top-label">Maior volume</div>
              <div className="top-name">{stats.topContributor.fullName}</div>
              <div className="top-meta">{stats.topContributor.totalChanges} CHGs</div>
            </div>
          )}
        </div>

        <div className="contacts-filters">
          <input
            type="text"
            placeholder="Buscar por nome, email, telefone ou grupo"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="contacts-search"
          />
          <div className="contacts-filters-row">
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="contacts-select"
            >
              <option value="all">Todos os grupos</option>
              {groupOptions.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>

            <div className="performance-chips">
              {PERFORMANCE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`chip ${performanceFilter === filter.id ? 'chip-active' : ''}`}
                  onClick={() => setPerformanceFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`chip emergency-chip ${showEmergenciesOnly ? 'chip-active' : ''}`}
              onClick={() => setShowEmergenciesOnly((prev) => !prev)}
            >
              Somente emergências
            </button>
          </div>
        </div>
      </div>

      <div className="contact-list">
        {filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile) => {
            const isAttention = Boolean(attentionFlags[profile.id]);
            return (
              <div
                key={profile.id}
                className={`contact-card contact-card-summary ${isAttention ? 'attention-card' : ''}`}
              >
                <div className="contact-card-summary-header" onClick={() => setSelectedProfile(profile)}>
                  <div>
                    <h3>{profile.fullName}</h3>
                    <div className="contact-subtitle">{profile.group}</div>
                  </div>
                  <button
                    type="button"
                    className={`attention-action ${isAttention ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAttentionFlag(profile.id);
                    }}
                  >
                    {isAttention ? '⚠️ Atenção' : 'Marcar atenção'}
                  </button>
                </div>
                <div className="contact-summary-meta" onClick={() => setSelectedProfile(profile)}>
                  <span>{profile.totalChanges} changes</span>
                  <span>{getPerformanceLabel(profile.successRate)}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="contacts-empty">Nenhum contato encontrado com esses filtros.</div>
        )}
      </div>

      {lastUpdated && (
        <div className="contacts-footer">Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}</div>
      )}

      {selectedProfile && (
        <div className="contacts-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="contacts-overlay-panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="overlay-close"
              onClick={() => setSelectedProfile(null)}
            >
              ✕
            </button>
            <div className="profile-card-detail">
              <div className="profile-card-header">
                <div>
                  <h2>{selectedProfile.fullName}</h2>
                  <div className="contact-subtitle">{selectedProfile.group}</div>
                  <div className="profile-contact-lines">
                    <a href={`mailto:${selectedProfile.email}`} className="info-link">{selectedProfile.email}</a>
                    <a href={`tel:${selectedProfile.phone.replace(/\D/g, '')}`} className="info-link">{selectedProfile.phone}</a>
                  </div>
                </div>
                {selectedProfile.emergencyCount > 0 && (
                  <span className="status-pill emergency">{selectedProfile.emergencyCount} emergências</span>
                )}
              </div>

              <div className="profile-detail-metrics">
                <div className="metric-block">
                  <span className="metric-label">Total de changes</span>
                  <strong>{selectedProfile.totalChanges}</strong>
                </div>
                <div className="metric-block">
                  <span className="metric-label">Changes com sucesso</span>
                  <strong>{selectedProfile.successfulChanges}</strong>
                </div>
                <div className="metric-block">
                  <span className="metric-label">Changes em implementação</span>
                  <strong>{selectedProfile.implementationChanges}</strong>
                </div>
                <div className="metric-block">
                  <span className="metric-label">Changes canceladas</span>
                  <strong>{selectedProfile.cancelledChanges}</strong>
                </div>
                <div className="metric-block">
                  <span className="metric-label">Changes concluídas com falha</span>
                  <strong>{selectedProfile.failedChanges}</strong>
                </div>
                <div className="metric-block">
                  <span className="metric-label">Taxa de acerto</span>
                  <strong>{selectedProfile.successRate}%</strong>
                </div>
              </div>

              <div className="profile-change-list-section">
                <span className="recent-label">Todas as CHGs</span>
                <div className="profile-change-list">
                  {selectedProfile.recentChanges.map((change) => (
                    <a
                      key={change.key}
                      href={change.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-change-link"
                    >
                      {change.key}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsTab;
