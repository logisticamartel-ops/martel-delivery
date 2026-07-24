const SHEETS = {
  arenales:     '1dZNp9z5-_CgAO4wx40t8fPSVDxvP22rQDqYvBM-VVeg',
  trescerritos: '1VpmaSu__g6NayzjFxsTuoYs13wBvdhzY4Jc5SNWWrs8',
  rioja: '1EvEX9-FDWk_Tdur42DlcRCWETzxHRB4k-XyWeKhZEto',
  malvinas:     '1EjL3RIf_h2Nsoq8aXZVJmLbnfSxMcmcJZEKuNbRt8V8',
  chile:        '1tqS1H8Ue1gh7ooZbAuJ4SOEoGipoEXHnvOfgMdWsOCI',
  balcarce:     '1veQOjXaBHsGDq8MBQlcKZViABQfLIyEGia7kRxwj7jQ',
  ecommerce:    '11OqDLZb371Lz3CN_29zDi2TzjqK0oDZ49y1jrhWLSTA',
};

function getSheet(suc) {
  const anio = new Date().getFullYear().toString();
  const ss = SpreadsheetApp.openById(SHEETS[suc]);
  const sheets = ss.getSheets();
  let sheet = sheets.find(s => s.getName().toUpperCase().includes('DELIVERY') && s.getName().includes(anio));
  if (!sheet) sheet = sheets.find(s => s.getName().toUpperCase().includes('DELIVERY'));
  if (!sheet) sheet = sheets[0];
  return sheet;
}

function getOrCreateSheet(sucursal) {
  if (SHEETS[sucursal]) return getSheet(sucursal);
  const props = PropertiesService.getScriptProperties();
  let sheetId = props.getProperty('SHEET_' + sucursal);
  if (!sheetId) {
    const ss = SpreadsheetApp.create('Martel Delivery — ' + sucursal.toUpperCase());
    const sheet = ss.getActiveSheet();
    const anio = new Date().getFullYear().toString();
    sheet.setName('DELIVERY ' + anio);
    sheet.appendRow(['ID','NOMBRE DE CLIENTE','N° DE FACTURA','DOMICILIO OBSERVACIONES','FECHA COMP','entregado','FECHA ENTREGA','CHOFER','HORA CARGA','TELEFONO','OBSERVACIONES']);
    sheet.setFrozenRows(1);
    sheetId = ss.getId();
    props.setProperty('SHEET_' + sucursal, sheetId);
    SpreadsheetApp.flush();
  }
  const ss = SpreadsheetApp.openById(sheetId);
  const anio = new Date().getFullYear().toString();
  let sheet = ss.getSheets().find(s => s.getName().toUpperCase().includes('DELIVERY') && s.getName().includes(anio));
  if (!sheet) sheet = ss.getSheets().find(s => s.getName().toUpperCase().includes('DELIVERY'));
  if (!sheet) sheet = ss.getSheets()[0];
  return sheet;
}

// ── HISTORIAL ──────────────────────────────────────────────────
function getHistorialSheet() {
  const props = PropertiesService.getScriptProperties();
  let sheetId = props.getProperty('HISTORIAL_SHEET_ID');
  if (!sheetId) {
    const ss = SpreadsheetApp.create('Martel Delivery — HISTORIAL');
    const sheet = ss.getActiveSheet();
    sheet.setName('Historial');
    sheet.appendRow(['FECHA_ENTREGA','SUCURSAL','CLIENTE_ID','NOMBRE','FACTURA','DOMICILIO','CHOFER','FECHA_PEDIDO']);
    sheet.setFrozenRows(1);
    sheetId = ss.getId();
    props.setProperty('HISTORIAL_SHEET_ID', sheetId);
    SpreadsheetApp.flush();
  }
  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheets().find(s => s.getName() === 'Historial');
  if (!sheet) sheet = ss.getSheets()[0];
  return sheet;
}

// ── CALIFICACIONES ─────────────────────────────────────────────
function getCalificacionesSheet() {
  const props = PropertiesService.getScriptProperties();
  let sheetId = props.getProperty('CALIFICACIONES_SHEET_ID');
  if (!sheetId) {
    const ss = SpreadsheetApp.create('Martel Delivery — CALIFICACIONES');
    const sheet = ss.getActiveSheet();
    sheet.setName('Calificaciones');
    sheet.appendRow(['FECHA','CHOFER','FACTURA','SUCURSAL','ESTRELLAS']);
    sheet.setFrozenRows(1);
    sheetId = ss.getId();
    props.setProperty('CALIFICACIONES_SHEET_ID', sheetId);
    SpreadsheetApp.flush();
  }
  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheets().find(s => s.getName() === 'Calificaciones');
  if (!sheet) sheet = ss.getSheets()[0];
  return sheet;
}

function doGet(e) {
  const action = e.parameter.action || 'read';

  if (action === 'resolve_maps') {
    try {
      const url = e.parameter.url;
      if (!url) return resp({ ok: false, error: 'Falta url' }, e.parameter.callback);
      const response = UrlFetchApp.fetch(url, { followRedirects: true, muteHttpExceptions: true });
      const finalUrl = response.getFinalUrl() || url;
      const content = response.getContentText();
      let lat = null, lng = null;
      const m1 = (finalUrl + content).match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (m1) { lat = parseFloat(m1[1]); lng = parseFloat(m1[2]); }
      if (!lat) {
        const m2 = (finalUrl + content).match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (m2) { lat = parseFloat(m2[1]); lng = parseFloat(m2[2]); }
      }
      if (!lat) {
        const m3 = (finalUrl + content).match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (m3) { lat = parseFloat(m3[1]); lng = parseFloat(m3[2]); }
      }
      if (lat && lng) return resp({ ok: true, lat: lat, lng: lng }, e.parameter.callback);
      return resp({ ok: false, error: 'No se encontraron coordenadas' }, e.parameter.callback);
    } catch(err) {
      return resp({ ok: false, error: err.toString() }, e.parameter.callback);
    }
  }

  if (action === 'get_seguimiento') {
    try {
      const factura = String(e.parameter.factura || '').trim();
      const sucursal = e.parameter.sucursal || '';
      if (!factura) return resp({ ok: false }, e.parameter.callback);
      const sucsToSearch = sucursal && SHEETS[sucursal] ? [sucursal] : Object.keys(SHEETS);
      for (const suc of sucsToSearch) {
        const sheet = getSheet(suc);
        const all = sheet.getDataRange().getValues();
        for (let i = 1; i < all.length; i++) {
          const rowFac = String(all[i][2] || '').trim();
          if (rowFac.toLowerCase() === factura.toLowerCase()) {
            const estado = String(all[i][5] || '').toLowerCase().trim();
            const remito = String(all[i][6] || '').toLowerCase().trim();
            const chofer = String(all[i][7] || '').toLowerCase().trim();
            const nombre = String(all[i][1] || '').trim();
            return resp({ ok: true, factura: rowFac, nombre: nombre, estado: estado.includes('entregado') ? 'entregado' : 'pendiente', remito: remito, chofer: chofer, sucursal: suc }, e.parameter.callback);
          }
        }
      }
      return resp({ ok: false }, e.parameter.callback);
    } catch(err) {
      return resp({ ok: false, error: err.toString() }, e.parameter.callback);
    }
  }

  if (action === 'write') {
    try {
      const { sucursal, cliente, factura, remito } = e.parameter;
      if (!sucursal || !SHEETS[sucursal]) {
        return resp({ ok: false, error: 'Sucursal invalida: ' + sucursal }, e.parameter.callback);
      }
      const sheet = getSheet(sucursal);
      const all = sheet.getDataRange().getValues();
      let filaIndex = -1;
      // Buscar desde abajo para encontrar la fila más reciente (entregas parciales)
      for (let i = all.length - 1; i >= 1; i--) {
        const rowCliente = String(all[i][0] || '').trim();
        const rowFactura = String(all[i][2] || '').trim();
        if (rowCliente === String(cliente).trim() && rowFactura === String(factura).trim()) {
          filaIndex = i + 1;
          break;
        }
      }
      if (filaIndex === -1) {
        return resp({ ok: false, error: 'Fila no encontrada' }, e.parameter.callback);
      }
      sheet.getRange(filaIndex, 7).setValue(remito);
      if (remito === 'completo') {
        sheet.getRange(filaIndex, 6).setValue('entregado');
        // ── GRABAR EN HISTORIAL ──
        try {
          const rowData = all[filaIndex - 1];
          const histSheet = getHistorialSheet();
          const fechaEntrega = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
          const fechaPedido = rowData[4] instanceof Date
            ? Utilities.formatDate(rowData[4], Session.getScriptTimeZone(), 'dd/MM/yyyy')
            : String(rowData[4] || '').trim();
          histSheet.appendRow([
            fechaEntrega,
            sucursal,
            String(rowData[0] || '').trim(),
            String(rowData[1] || '').trim(),
            String(rowData[2] || '').trim(),
            String(rowData[3] || '').trim(),
            String(rowData[7] || '').trim(),
            fechaPedido
          ]);
          SpreadsheetApp.flush();
        } catch(histErr) {}
      }
      return resp({ ok: true, fila: filaIndex, remito: remito }, e.parameter.callback);
    } catch(err) {
      return resp({ ok: false, error: err.toString() }, e.parameter.callback);
    }
  }

  if (action === 'get_historial') {
    try {
      const sheet = getHistorialSheet();
      const all = sheet.getDataRange().getValues();
      if (all.length <= 1) return resp({ ok: true, rows: [] }, e.parameter.callback);
      const rows = all.slice(1).map(function(r) {
        return {
          fecha_entrega: String(r[0] || ''),
          sucursal:      String(r[1] || ''),
          cliente:       String(r[2] || ''),
          nombre:        String(r[3] || ''),
          factura:       String(r[4] || ''),
          domicilio:     String(r[5] || ''),
          chofer:        String(r[6] || ''),
          fecha_pedido:  String(r[7] || '')
        };
      });
      return resp({ ok: true, rows: rows }, e.parameter.callback);
    } catch(err) {
      return resp({ ok: false, error: err.toString() }, e.parameter.callback);
    }
  }

  // ── CALIFICACIONES ─────────────────────────────────────────────
  if (action === 'rate_delivery') {
    try {
      const estrellas = parseInt(e.parameter.estrellas) || 0;
      const factura = String(e.parameter.factura || '').trim();
      if (!factura || estrellas < 1 || estrellas > 5) {
        return resp({ ok: false, error: 'Datos invalidos' }, e.parameter.callback);
      }
      const calSheet = getCalificacionesSheet();
      const fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
      calSheet.appendRow([
        fecha,
        String(e.parameter.chofer || '').trim(),
        factura,
        String(e.parameter.sucursal || '').trim(),
        estrellas
      ]);
      SpreadsheetApp.flush();
      return resp({ ok: true }, e.parameter.callback);
    } catch(err) {
      return resp({ ok: false, error: err.toString() }, e.parameter.callback);
    }
  }

  if (action === 'get_calificaciones') {
    try {
      const calSheet = getCalificacionesSheet();
      const all = calSheet.getDataRange().getValues();
      if (all.length <= 1) return resp({ ok: true, calificaciones: [] }, e.parameter.callback);
      const calificaciones = all.slice(1).map(function(r) {
        const fechaRaw = r[0];
        const fechaStr = fechaRaw instanceof Date
          ? Utilities.formatDate(fechaRaw, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
          : String(fechaRaw || '');
        return {
          fecha:     fechaStr,
          chofer:    String(r[1] || ''),
          factura:   String(r[2] || ''),
          sucursal:  String(r[3] || ''),
          estrellas: Number(r[4]) || 0
        };
      });
      return resp({ ok: true, calificaciones: calificaciones }, e.parameter.callback);
    } catch(err) {
      return resp({ ok: false, error: err.toString() }, e.parameter.callback);
    }
  }

  if (action === 'write_chofer') {
    try {
      const { sucursal, cliente, factura, chofer } = e.parameter;
      if (!sucursal || !SHEETS[sucursal]) {
        return resp({ ok: false, error: 'Sucursal invalida: ' + sucursal }, e.parameter.callback);
      }
      const sheet = getSheet(sucursal);
      const all = sheet.getDataRange().getValues();
      let filaIndex = -1;
      // Buscar desde abajo para encontrar la fila más reciente (entregas parciales)
      for (let i = all.length - 1; i >= 1; i--) {
        const rowCliente = String(all[i][0] || '').trim();
        const rowFactura = String(all[i][2] || '').trim();
        if (rowCliente === String(cliente).trim() && rowFactura === String(factura).trim()) {
          filaIndex = i + 1;
          break;
        }
      }
      if (filaIndex === -1) {
        return resp({ ok: false, error: 'Fila no encontrada' }, e.parameter.callback);
      }
      sheet.getRange(filaIndex, 8).setValue(chofer || '');
      return resp({ ok: true, fila: filaIndex, chofer: chofer }, e.parameter.callback);
    } catch(err) {
      return resp({ ok: false, error: err.toString() }, e.parameter.callback);
    }
  }

  if (action === 'update_pedido') {
    try {
      const { sucursal, cliente, factura_orig, nombre, factura, domicilio } = e.parameter;
      if (!sucursal || !SHEETS[sucursal]) {
        return resp({ ok: false, error: 'Sucursal invalida' }, e.parameter.callback);
      }
      const sheet = getSheet(sucursal);
      const all = sheet.getDataRange().getValues();
      let filaIndex = -1;
      for (let i = 1; i < all.length; i++) {
        const rowCliente = String(all[i][0] || '').trim();
        const rowFactura = String(all[i][2] || '').trim();
        if (rowCliente === String(cliente).trim() && rowFactura === String(factura_orig).trim()) {
          filaIndex = i + 1;
          break;
        }
      }
      if (filaIndex === -1) {
        return resp({ ok: false, error: 'Fila no encontrada' }, e.parameter.callback);
      }
      if (nombre)    sheet.getRange(filaIndex, 2).setValue(nombre);
      if (factura)   sheet.getRange(filaIndex, 3).setValue(factura);
      if (domicilio) sheet.getRange(filaIndex, 4).setValue(domicilio);
      SpreadsheetApp.flush();
      return resp({ ok: true, fila: filaIndex }, e.parameter.callback);
    } catch(err) {
      return resp({ ok: false, error: err.toString() }, e.parameter.callback);
    }
  }

  if (action === 'nuevo_pedido') {
    try {
      const { sucursal, nombre, factura, domicilio, observaciones, fecha, cliente, horacarga, telefono } = e.parameter;
      if (!sucursal) return resp({ ok: false, error: 'Falta sucursal' }, e.parameter.callback);
      const sheet = getOrCreateSheet(sucursal);
      sheet.appendRow([
        cliente       || '',
        nombre        || '',
        factura       || '',
        domicilio + (observaciones ? ' ' + observaciones : ''),
        fecha         || '',
        'PENDIENTE',
        '',
        '',
        horacarga     || '',
        telefono      || '',
        observaciones || ''
      ]);
      SpreadsheetApp.flush();
      return resp({ ok: true }, e.parameter.callback);
    } catch(err) {
      return resp({ ok: false, error: err.toString() }, e.parameter.callback);
    }
  }

  if (action === 'get_chofer_pedidos') {
    try {
      const chofer = (e.parameter.chofer || '').toLowerCase().trim();
      if (!chofer) return resp({ ok: false, error: 'Falta chofer' }, e.parameter.callback);
      function normChofer(val) {
        const v = (val || '').toLowerCase();
        if (v.includes('victor')) return 'victor';
        if (v.includes('cacho') || v.includes('salvador')) return 'cacho';
        if (v.includes('puma') || v.includes('juan carlos')) return 'puma';
        if (v.includes('guille') || v.includes('guillermo')) return 'guillermo';
        if (v.includes('gustavo')) return 'gustavo';
        if (v.includes('rafael')) return 'rafael';
        if (v.includes('fernando')) return 'fernando';
        return '';
      }
      function parseFecha(val) {
        if (val instanceof Date && !isNaN(val)) return val;
        if (!val) return null;
        const str = String(val).trim();
        if (!str) return null;
        const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (m) {
          const y = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
          return new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
        }
        const d = new Date(str);
        return isNaN(d) ? null : d;
      }
      const hace7 = new Date();
      hace7.setDate(hace7.getDate() - 7);
      hace7.setHours(0, 0, 0, 0);
      const pedidos = [];
      for (const suc in SHEETS) {
        try {
          const sheet = getSheet(suc);
          const all = sheet.getDataRange().getValues();
          for (let i = 1; i < all.length; i++) {
            const nombre = String(all[i][1] || '').trim();
            const factura = String(all[i][2] || '').trim();
            if (!nombre && !factura) continue;
            if (normChofer(String(all[i][7] || '')) !== chofer) continue;
            const remito = String(all[i][6] || '').toLowerCase().trim();
            if (remito !== 'descargado') continue;
            const estado = String(all[i][5] || '').toLowerCase().trim();
            if (estado.includes('entregado')) continue;
            const fechaDate = parseFecha(all[i][4]);
            if (fechaDate && fechaDate < hace7) continue;
            pedidos.push({
              cliente:   String(all[i][0] || '').trim(),
              nombre:    nombre,
              factura:   factura,
              domicilio: String(all[i][3] || '').trim(),
              sucursal:  suc,
              remito:    remito
            });
          }
        } catch(e2) {}
      }
      return resp({ ok: true, pedidos: pedidos }, e.parameter.callback);
    } catch(err) {
      return resp({ ok: false, error: err.toString() }, e.parameter.callback);
    }
  }

  // LECTURA
  const sucFiltro = e.parameter.sucursal || '';
  const result = {};
  const hoy30 = new Date(); hoy30.setDate(hoy30.getDate()-30); hoy30.setHours(0,0,0,0);

  function leerHoja(sheet) {
    const all = sheet.getDataRange().getValues();
    const header = all[0];
    const rows = all.slice(1).filter(function(row) {
      const st = String(row[5] || '').toLowerCase().trim();
      const esEnt = Boolean(st.match(/entregado|completo/));
      if (!esEnt) return true;
      const f = row[4];
      if (f instanceof Date && !isNaN(f)) return f >= hoy30;
      return true;
    });
    return [header, ...rows];
  }

  if (sucFiltro && SHEETS[sucFiltro]) {
    // Sync individual — solo lee una sucursal, sin sleep
    try { result[sucFiltro] = leerHoja(getSheet(sucFiltro)); } catch(err) { result[sucFiltro] = []; }
  } else {
    // Sync completa — todas las sucursales
    for (const suc in SHEETS) {
      Utilities.sleep(400);
      try { result[suc] = leerHoja(getSheet(suc)); } catch(err) { result[suc] = []; }
    }
    try {
      const props = PropertiesService.getScriptProperties();
      props.getKeys().filter(k => k.startsWith('SHEET_')).forEach(function(key) {
        const suc = key.replace('SHEET_', '');
        if (SHEETS[suc]) return;
        try {
          Utilities.sleep(300);
          const ss = SpreadsheetApp.openById(props.getProperty(key));
          const sheet = ss.getSheets().find(s => s.getName().toUpperCase().includes('DELIVERY')) || ss.getSheets()[0];
          result[suc] = leerHoja(sheet);
        } catch(e2) { result[suc] = []; }
      });
    } catch(e3) {}
  }

  const json = JSON.stringify(result);
  const cb = e.parameter.callback;
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function resp(obj, cb) {
  const json = JSON.stringify(obj);
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
