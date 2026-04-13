const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const Papa = require('papaparse');

const expectedColumns = [
  'Chave',
  'Resumo',
  'Status',
  'Descrição',
  'Relator',
  'Planned start date',
  'Planned end date'
];

const jiraHeaderMap = {
  'issue key': 'Chave',
  'key': 'Chave',
  'summary': 'Resumo',
  'status': 'Status',
  'description': 'Descrição',
  'assignee': 'Relator',
  'reporter': 'Relator',
  'planned start date': 'Planned start date',
  'planned end date': 'Planned end date',
};

const maximoHeaderMap = {
  'change_number': 'Chave',
  'summary': 'Resumo',
  'status': 'Status',
  'details': 'Descrição',
  'owner_name': 'Relator',
  'schedule_start': 'Planned start date',
  'schedule_finish': 'Planned end date',
  'id': 'Chave',
  'título': 'Resumo',
  'titulo': 'Resumo',
  'justification': 'Descrição',
  'descrição': 'Descrição',
  'descricao': 'Descrição',
  'requerente - requerente': 'Relator',
  'requester': 'Relator'
};

const sistemasCriticos = [
  'ARS\\NCR',
  'Athena',
  'Concentrador Fiscal',
  'Concsitef',
  'CTF',
  'Gescom',
  'Gold',
  'Guepardo',
  'MasterSaf',
  'Pegasus Descontos Comerciais',
  'SAD Contábil',
  'SAP',
  'SCE',
  'Sitef',
  'Storex',
  'TPLinux',
  'XRT'
];

const cores = {
  Jira: {
    header: 'FF8989EB',
    even: 'FFC4C3F7',
    odd: 'FFE8E7FC'
  },
  Maximo: {
    header: 'FF8BC34A',
    even: 'FFFFFFFF',
    odd: 'FFEEF7E3'
  },
  Participantes: {
    header: 'FF4B7BEC',
    even: 'FFE6F0FF',
    odd: 'FFFFFFFF'
  },
  Verificação: {
    header: 'FFFF5722',
    even: 'FFFFCCBC',
    odd: 'FFFFEDE6'
  }
};

const comentariosParticipantes = {
  A2: 'Igor Campos , Reginaldo Tadashi , Newton Albuquerque , Adilson Bassani',
  A3: 'Clodoaldo Dias , Wesley Magalhães',
  A4: 'Roberto , Wagner',
  A5: 'Sergio Massao , Wilton Carvalho',
  A6: 'Ricardo Witsmiszyn',
  A7: 'Enrique Dias , Ricardo Witsmiszyn',
  A8: 'Thais Yuta , Mauricio Souza , Guilherme Perdroso',
  A9: 'Thiago Pezzini , Samuel Silva'
};

const normalizeHeader = (value) => {
  if (!value && value !== 0) return '';
  return String(value).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const mapRowHeaders = (row, mapping) => {
  const mapped = {};
  Object.entries(row || {}).forEach(([header, value]) => {
    const normalized = normalizeHeader(header);
    const target = mapping[normalized] || header;
    mapped[target] = value;
  });
  return mapped;
};

const hasExpectedColumns = (row) => expectedColumns.every((column) => Object.prototype.hasOwnProperty.call(row, column));

const parseCsvBuffer = (buffer) => {
  const text = buffer.toString('utf8');
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  });
  return parsed.data || [];
};

const parseXlsxBuffer = async (buffer, preferredSheetNames = []) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const worksheetName = preferredSheetNames.find((name) => workbook.Sheets[name]) || workbook.SheetNames[0];
  if (!worksheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[worksheetName], { defval: '' });
};

const normalizeRow = (row, mapping) => {
  const renamed = mapRowHeaders(row, mapping);
  return expectedColumns.reduce((acc, key) => {
    acc[key] = renamed[key] != null ? renamed[key] : '';
    return acc;
  }, {});
};

const parseDateValue = (value) => {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const raw = String(value).trim();
  const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]) - 1;
    const year = Number(ddmmyyyy[3].length === 2 ? `20${ddmmyyyy[3]}` : ddmmyyyy[3]);
    const hours = Number(ddmmyyyy[4] || 0);
    const minutes = Number(ddmmyyyy[5] || 0);
    const seconds = Number(ddmmyyyy[6] || 0);
    const date = new Date(year, month, day, hours, minutes, seconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const isDataRelevante = (date) => {
  if (!date || !(date instanceof Date)) return false;
  const ano = date.getFullYear();
  const mes = date.getMonth() + 1;
  const dia = date.getDate();
  const ultimoDia = new Date(ano, mes, 0).getDate();

  if (dia === ultimoDia) return true;

  let proximoMes;
  let proximoAno;
  if (mes === 12) {
    proximoMes = 1;
    proximoAno = ano + 1;
  } else {
    proximoMes = mes + 1;
    proximoAno = ano;
  }

  if (dia === 1 && mes === proximoMes && ano === proximoAno) {
    return true;
  }

  return false;
};

const parseJiraBuffer = async (buffer) => {
  const rows = await parseXlsxBuffer(buffer, ['Your Jira Issues', 'JIRA', 'Jira']);
  const mapped = rows.map((row) => normalizeRow(row, jiraHeaderMap));
  if (!mapped.length || !hasExpectedColumns(mapped[0])) return null;
  return mapped;
};

const parseMaximoBuffer = async (buffer, fileName) => {
  const lowerName = String(fileName || '').toLowerCase();
  const tryRows = [];

  if (lowerName.endsWith('.csv')) {
    tryRows.push({ type: 'csv', rows: parseCsvBuffer(buffer) });
  } else {
    try {
      const xlsxRows = await parseXlsxBuffer(buffer, ['Maximo']);
      tryRows.push({ type: 'xlsx', rows: xlsxRows });
    } catch (_) {}
    if (tryRows.length === 0) {
      tryRows.push({ type: 'csv', rows: parseCsvBuffer(buffer) });
    }
  }

  for (const candidate of tryRows) {
    const mapped = candidate.rows.map((row) => normalizeRow(row, maximoHeaderMap));
    if (!mapped.length) continue;
    if (!hasExpectedColumns(mapped[0])) continue;

    const filtered = mapped
      .map((row) => ({
        ...row,
        'Planned start date': parseDateValue(row['Planned start date']),
        'Planned end date': parseDateValue(row['Planned end date'])
      }))
      .filter((row) => row['Chave'] !== 'String' && String(row['Status']) === 'AUTH');

    return filtered;
  }

  throw new Error('Não foi possível ler dados válidos do Maximo (nem Excel nem CSV).');
};

const normalizeText = (value) => String(value || '').toLowerCase();

const matchesSistemasCriticos = (row) => {
  const textoResumo = normalizeText(row['Resumo']);
  const textoDescricao = normalizeText(row['Descrição']);
  const regex = new RegExp(sistemasCriticos.join('|'), 'i');
  return regex.test(textoResumo) || regex.test(textoDescricao);
};

const buildTableRows = (rows) => [expectedColumns, ...rows.map((row) => expectedColumns.map((field) => row[field] ?? ''))];

const applySheetFormatting = (worksheet, sheetName) => {
  const cfg = cores[sheetName] || { header: 'FFCCCCCC', even: 'FFFFFFFF', odd: 'FFF5F5F5' };
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFC4C7C5' } },
    left: { style: 'thin', color: { argb: 'FFC4C7C5' } },
    bottom: { style: 'thin', color: { argb: 'FFC4C7C5' } },
    right: { style: 'thin', color: { argb: 'FFC4C7C5' } }
  };

  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'middle', wrapText: true };
    row.eachCell((cell, colNumber) => {
      const isHeader = rowNumber === 1;
      const fillColor = isHeader ? cfg.header : rowNumber % 2 === 0 ? cfg.even : cfg.odd;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };
      cell.font = isHeader
        ? { name: 'Montserrat', size: 12, bold: true }
        : { name: 'Montserrat', size: 11 };
      cell.border = thinBorder;

      if (sheetName === 'Participantes') {
        cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
      } else if (isHeader) {
        cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
      }

      if (!isHeader && sheetName !== 'Participantes' && (colNumber === 6 || colNumber === 7)) {
        cell.numFmt = 'dd/mm/yyyy hh:mm';
      }
    });
  });

  const columns = worksheet.columns.map((column, index) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const length = cell.value ? String(cell.value).length : 0;
      maxLength = Math.max(maxLength, length + 2);
    });
    const width = index === 0 ? Math.max(maxLength + 5, 20) : Math.min(Math.max(maxLength + 2, 10), 50);
    return { width };
  });

  worksheet.columns = columns;
  worksheet.views = [{ showGridLines: true }];
};

const buildDataSheet = (workbook, sheetName, rows) => {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRows(buildTableRows(rows));
  applySheetFormatting(sheet, sheetName);
};

const buildParticipantesSheet = (workbook) => {
  const sheet = workbook.addWorksheet('Participantes');

  const participantesObrigatorios = [
    ['Cargo', 'Responsável'],
    ['Arquitetura:', ''],
    ['Field:', ''],
    ['Governança:', ''],
    ['Infraestrutura:', ''],
    ['N1:', ''],
    ['Operação:', ''],
    ['Segurança:', ''],
    ['Telecom:', '']
  ];

  participantesObrigatorios.forEach((rowData) => {
    sheet.addRow(rowData);
  });

  sheet.addRow([]);
  sheet.addRow([]);
  sheet.addRow([]);
  sheet.addRow(['Participantes', 'Lista']);

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      const isHeader = rowNumber === 1 || rowNumber === 13;
      const fillColor = isHeader ? cores.Participantes.header : rowNumber % 2 === 0 ? cores.Participantes.even : cores.Participantes.odd;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };
      cell.font = isHeader ? { name: 'Montserrat', size: 12, bold: true } : { name: 'Montserrat', size: 11 };
      cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFC4C7C5' } },
        left: { style: 'thin', color: { argb: 'FFC4C7C5' } },
        bottom: { style: 'thin', color: { argb: 'FFC4C7C5' } },
        right: { style: 'thin', color: { argb: 'FFC4C7C5' } }
      };
    });
  });

  Object.entries(comentariosParticipantes).forEach(([coord, text]) => {
    const cell = sheet.getCell(coord);
    cell.note = text;
  });

  const maxColumn = 2;
  for (let col = 1; col <= maxColumn; col += 1) {
    let maxLength = 15;
    for (let row = 1; row <= sheet.rowCount; row += 1) {
      const cell = sheet.getRow(row).getCell(col);
      if (cell.value) {
        maxLength = Math.max(maxLength, String(cell.value).length + 5);
      }
    }
    sheet.getColumn(col).width = Math.min(maxLength, 50);
  }

  sheet.views = [{ showGridLines: true }];
};

const buildVerificationSheet = (workbook, rows) => {
  const sheet = workbook.addWorksheet('Verificação');
  sheet.addRows(buildTableRows(rows));
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      const isHeader = rowNumber === 1;
      const fillColor = isHeader ? cores.Verificação.header : rowNumber % 2 === 0 ? cores.Verificação.even : cores.Verificação.odd;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      cell.font = isHeader ? { name: 'Montserrat', size: 13, bold: true, color: { argb: 'FFFFFFFF' } } : { name: 'Montserrat', size: 11 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFC4C7C5' } },
        left: { style: 'thin', color: { argb: 'FFC4C7C5' } },
        bottom: { style: 'thin', color: { argb: 'FFC4C7C5' } },
        right: { style: 'thin', color: { argb: 'FFC4C7C5' } }
      };
      cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
      if (!isHeader && (colNumber === 6 || colNumber === 7)) {
        cell.numFmt = 'dd/mm/yyyy hh:mm';
      }
    });
  });

  const columns = sheet.columns.map((column, index) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const length = cell.value ? String(cell.value).length : 0;
      maxLength = Math.max(maxLength, length + 3);
    });
    const width = index === 0 ? Math.max(maxLength + 8, 30) : Math.min(Math.max(maxLength + 3, 15), 60);
    return { width };
  });
  sheet.columns = columns;
  sheet.views = [{ showGridLines: true }];
};

const generateSpreadsheetBuffer = async (jiraBuffer, glpiBuffer, glpiFileName, outputFileName) => {
  const jiraData = await parseJiraBuffer(jiraBuffer);
  const maximoData = await parseMaximoBuffer(glpiBuffer, glpiFileName);

  const combined = [
    ...(jiraData || []),
    ...maximoData
  ];

  const dfFiltrado = combined.filter((row) => matchesSistemasCriticos(row))
    .filter((row) => isDataRelevante(parseDateValue(row['Planned start date'])) || isDataRelevante(parseDateValue(row['Planned end date'])));

  const workbook = new ExcelJS.Workbook();
  if (jiraData) {
    buildDataSheet(workbook, 'Jira', jiraData);
  }

  buildDataSheet(workbook, 'Maximo', maximoData);
  buildParticipantesSheet(workbook);

  if (dfFiltrado.length > 0) {
    buildVerificationSheet(workbook, dfFiltrado);
  }

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  generateSpreadsheetBuffer
};
