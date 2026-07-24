/* ── APP LOGIC ───────────────────────────────────────────────── */

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const clockEl = document.getElementById('clock');
const regionFilter = document.getElementById('regionFilter');
const periodFilter = document.getElementById('periodFilter');
const loadFileBtn = document.getElementById('loadFileBtn');
const fileInput = document.getElementById('fileInput');
const exportBtn = document.getElementById('exportBtn');
const optimizeBtn = document.getElementById('optimizeBtn');
const riskFilterBtns = document.querySelectorAll('#riskFilter button');
const branchTabs = document.getElementById('branchTabs');

// Data holders
let currentData = {
  deliveries: deliveryData,
  fleet: fleetData,
  inventory: inventoryData,
  orders: ordersData,
  costPerKm: 1.42
};

let activeRegion = 'salta';
let activeBranch = 'all';
let activeRisk = 'all';
let activePeriod = 'today';
let selectedDriver = null;
let map;
let markerLayer;
let routeLayer;

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  initDriverModal();
  if (navItems.length) initNavigation();
  initClock();
  populateDashboard();
  initFilters();
  renderBranchTabs();
  initFileHandling();
  initExport();
  initOptimize();
}

function initDriverModal() {
  const modal = document.getElementById('driverLoginModal');
  const listEl = document.getElementById('driverList');
  const badgeEl = document.querySelector('.driver-badge');
  if (!modal || !listEl) return;

  const managerBtn = document.createElement('button');
  managerBtn.className = 'driver-btn';
  managerBtn.innerHTML = '<strong>Gerente</strong><span>Vista completa</span>';
  managerBtn.addEventListener('click', () => {
    selectedDriver = null;
    if (badgeEl) badgeEl.textContent = 'Dashboard Gerente';
    modal.classList.remove('visible');
    populateDashboard();
  });
  listEl.appendChild(managerBtn);

  driversData.forEach(driver => {
    const btn = document.createElement('button');
    btn.className = 'driver-btn';
    btn.innerHTML = `<strong>${escHtml(driver.name)}</strong><span>${escHtml(driver.vehicle)}</span>`;
    btn.addEventListener('click', () => {
      selectedDriver = driver;
      if (badgeEl) badgeEl.textContent = driver.name;
      modal.classList.remove('visible');
      populateDashboard();
    });
    listEl.appendChild(btn);
  });

  if (badgeEl) {
    badgeEl.style.cursor = 'pointer';
    badgeEl.addEventListener('click', () => {
      modal.classList.add('visible');
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('visible')) {
      modal.classList.remove('visible');
    }
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('visible');
  });

  if (badgeEl) badgeEl.textContent = 'Dashboard Gerente';
}


// Navigation
function initNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      showPanel(target);
      updateNavActive(item);
    });
  });
}

function showPanel(panelId) {
  const target = document.getElementById(panelId);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateNavActive(activeItem) {
  navItems.forEach(item => item.classList.remove('active'));
  activeItem.classList.add('active');
}

// Clock
function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  if (!clockEl) return;
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString('es-AR', { hour12: false });

  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const d = now.getDate(), m = months[now.getMonth()], y = now.getFullYear();
  const clockDateEl = document.getElementById('clockDate');
  if (clockDateEl) clockDateEl.textContent = `${days[now.getDay()]} · ${d} ${m} ${y}`;
  const topbarDateEl = document.getElementById('topbarDate');
  if (topbarDateEl) topbarDateEl.textContent = `Salta · ${d} ${m} ${y}`;
}

// Populate dashboard
function populateDashboard() {
  updateKPIs();
  renderDeliveryChart();
  renderFleetList();
  renderInventoryTable();
  renderOrdersList(activeRisk);
  renderOrdersTable();
  renderOrderMarkers();
}

function updateKPIs() {
  const allOrders = Array.isArray(currentData.orders) ? currentData.orders : [];
  const allFleet = Array.isArray(currentData.fleet) ? currentData.fleet : [];

  const filteredOrders = selectedDriver
    ? allOrders.filter(o => o.driver === selectedDriver.name)
    : allOrders;
  const branchOrders = filterByBranch(filteredOrders);
  const totalOrders = branchOrders.length;
  const activeVehicles = allFleet.filter(v => v.status === 'active').length;
  const fleetPercent = allFleet.length
    ? Math.round((activeVehicles / allFleet.length) * 100)
    : 0;

  document.getElementById('onTimeMetric').textContent = `${calculateOnTimeRate()}%`;
  document.getElementById('inTransitMetric').textContent = totalOrders;
  document.getElementById('fleetMetric').textContent = `${fleetPercent}%`;
  document.getElementById('costMetric').textContent = `$${currentData.costPerKm.toFixed(2)}`;

  const critCount = branchOrders.filter(o => o.risk === 'high' || o.risk === 'medium').length;
  const critEl = document.getElementById('criticalMetric');
  if (critEl) critEl.textContent = `${critCount} con riesgo`;

  const fleetBadgeEl = document.getElementById('fleetBadge');
  if (fleetBadgeEl) fleetBadgeEl.textContent = `${allFleet.length} unidades`;

  const deliveries = Array.isArray(currentData.deliveries) ? currentData.deliveries : [];
  const onTimeCount = deliveries.filter(d => d.v >= d.sla).length;

  const onTimeSubEl = document.getElementById('onTimeSubMetric');
  if (onTimeSubEl) {
    onTimeSubEl.textContent = deliveries.length
      ? `${onTimeCount} de ${deliveries.length} horas cumplidas`
      : '—';
    onTimeSubEl.className = onTimeCount / (deliveries.length || 1) >= 0.9 ? 'positive' : 'negative';
  }

  const fleetSubEl = document.getElementById('fleetSubMetric');
  if (fleetSubEl) {
    fleetSubEl.textContent = allFleet.length
      ? `${activeVehicles} de ${allFleet.length} activos`
      : '—';
  }
}

function calculateOnTimeRate() {
  const deliveries = currentData.deliveries || [];
  if (!deliveries.length) return 0;
  const onTimeCount = deliveries.filter(d => d.v >= d.sla).length;
  return Math.round((onTimeCount / deliveries.length) * 1000) / 10;
}

// Delivery Chart
function renderDeliveryChart() {
  const chartEl = document.getElementById('deliveryChart');
  if (!chartEl) return;
  chartEl.innerHTML = '';

  const periodLabelEl = document.getElementById('deliveryPeriodLabel');
  if (periodLabelEl) {
    const periodNames = { today: 'Hoy', week: 'Semana', month: 'Mes' };
    periodLabelEl.textContent = `SLA · ${periodNames[activePeriod] || 'Hoy'}`;
  }

  if (!Array.isArray(currentData.deliveries) || !currentData.deliveries.length) {
    chartEl.innerHTML = '<div class="empty-chart">No hay datos de entregas disponibles.</div>';
    return;
  }

  const maxV = Math.max(...currentData.deliveries.map(d => Number(d.v) || 0));
  if (maxV <= 0) {
    chartEl.innerHTML = '<div class="empty-chart">No hay datos de entregas válidos.</div>';
    return;
  }

  const slaRate = calculateOnTimeRate();
  const slaBadgeEl = document.getElementById('slaBadge');
  if (slaBadgeEl) {
    if (slaRate >= 90) { slaBadgeEl.className = 'badge good'; slaBadgeEl.textContent = 'Estable'; }
    else if (slaRate >= 70) { slaBadgeEl.className = 'badge warn'; slaBadgeEl.textContent = 'En riesgo'; }
    else { slaBadgeEl.className = 'badge crit'; slaBadgeEl.textContent = 'Crítico'; }
  }

  currentData.deliveries.forEach(d => {
    const barWrap = document.createElement('div');
    barWrap.className = 'bar-wrap';

    const barOuter = document.createElement('div');
    barOuter.className = 'bar-outer';

    const bar = document.createElement('div');
    const belowSla = d.sla > 0 && Number(d.v) < Number(d.sla);
    bar.className = belowSla ? 'bar below' : 'bar';
    bar.style.height = `${(Number(d.v) || 0) / maxV * 100}%`;
    bar.dataset.val = `${d.v} entregas`;
    bar.title = `${d.h}:00 - ${d.v} entregas`;

    const label = document.createElement('div');
    label.className = 'bar-label';
    label.textContent = d.h;

    barOuter.appendChild(bar);
    barWrap.appendChild(barOuter);
    barWrap.appendChild(label);
    chartEl.appendChild(barWrap);
  });
}

// Fleet List
function renderFleetList() {
  const listEl = document.getElementById('fleetList');
  if (!listEl) return;
  listEl.innerHTML = '';

  const allFleet = Array.isArray(currentData.fleet) ? currentData.fleet : [];
  let fleetItems = activeRegion === 'all'
    ? allFleet
    : allFleet.filter(vehicle => vehicle.region === activeRegion);

  if (selectedDriver) {
    fleetItems = fleetItems.filter(v => v.name === selectedDriver.vehicle);
  }

  if (!fleetItems.length) {
    listEl.innerHTML = '<div class="empty-panel">No hay vehículos disponibles para esta selección.</div>';
    return;
  }

  fleetItems.forEach(vehicle => {
    const item = document.createElement('div');
    item.className = 'fleet-item';
    item.innerHTML = `
      <span class="fleet-icon">${escHtml(vehicle.icon)}</span>
      <div class="fleet-info">
        <strong class="fleet-name">${escHtml(vehicle.name)}</strong>
        <span class="fleet-route">Ruta: ${escHtml(vehicle.route)}</span>
        <span class="fleet-subinfo">Chofer: ${escHtml(vehicle.driver)}</span>
      </div>
      <span class="fleet-status ${escHtml(vehicle.status)}">${escHtml(getStatusText(vehicle.status))}</span>
    `;
    listEl.appendChild(item);
  });
}

function getStatusText(status) {
  const statusLabels = { active: 'Activo', delay: 'Demorado', wait: 'En espera' };
  return statusLabels[status] || status;
}

// Inventory Table
function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!Array.isArray(currentData.inventory) || !currentData.inventory.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No hay inventario disponible.</td></tr>';
    return;
  }

  currentData.inventory.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escHtml(item.sku)}</td>
      <td>${escHtml(item.stock)}</td>
      <td>${escHtml(item.demand)}</td>
      <td><span class="inv-tag ${escHtml(item.state)}">${escHtml(item.state)}</span></td>
    `;
    tbody.appendChild(row);
  });
}

// Map & Orders
function renderOrderMarkers() {
  if (!map) return;

  markerLayer.forEach(m => m.setMap(null));
  markerLayer = [];
  routeLayer.forEach(r => r.setMap(null));
  routeLayer = [];

  const allOrders = Array.isArray(currentData.orders) ? currentData.orders : [];
  let orders = activeRegion === 'all'
    ? allOrders
    : allOrders.filter(order => order.region === activeRegion);

  if (selectedDriver) {
    orders = orders.filter(order => order.driver === selectedDriver.name);
  }

  orders = filterByBranch(orders);

  if (activeRisk !== 'all') {
    orders = orders.filter(order => order.risk === activeRisk);
  }

  orders = orders.filter(o => !(o.lat === 0 && o.lng === 0));

  const branchLocation = getBranchLocation(activeBranch);
  const originLatLng = branchLocation
    ? {lat: branchLocation.lat, lng: branchLocation.lng}
    : {lat: -24.7830, lng: -65.4230};

  const bounds = new google.maps.LatLngBounds();
  bounds.extend(originLatLng);

  if (branchLocation) {
    const m = new google.maps.Marker({
      position: originLatLng,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#00d4e8',
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 10,
      },
      title: branchLocation.name,
    });
    m.addListener('click', () => {
      new google.maps.InfoWindow({
        content: `<b>${escHtml(branchLocation.name)}</b><br>${escHtml(branchLocation.address)}`
      }).open(map, m);
    });
    markerLayer.push(m);
  }

  orders.forEach(order => {
    const dest = {lat: order.lat, lng: order.lng};
    const color = order.risk === 'high' ? '#ff4757' : '#f5a623';

    const line = new google.maps.Polyline({
      path: [originLatLng, dest],
      map,
      strokeColor: color,
      strokeWeight: 2,
      strokeOpacity: 0,
      icons: [{
        icon: {path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeColor: color, scale: 3},
        offset: '0',
        repeat: '12px',
      }],
    });
    routeLayer.push(line);

    const m = new google.maps.Marker({
      position: dest,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8,
      },
      title: order.id,
    });
    m.addListener('click', () => {
      new google.maps.InfoWindow({
        content: `<b>${escHtml(order.id)}</b><br>${escHtml(order.dest)}<br>${escHtml(order.driver)} — ${escHtml(order.vehicle || 'Sin vehículo asignado')}`
      }).open(map, m);
    });
    markerLayer.push(m);
    bounds.extend(dest);
  });

  if (orders.length > 0) {
    map.fitBounds(bounds, {top: 50, right: 50, bottom: 50, left: 50});
  } else {
    map.setCenter(originLatLng);
    map.setZoom(12);
  }
}

window.initMap = function() {
  const darkStyle = [
    {elementType:'geometry',stylers:[{color:'#0c0f1a'}]},
    {elementType:'labels.text.stroke',stylers:[{color:'#07090f'}]},
    {elementType:'labels.text.fill',stylers:[{color:'#7a8aaa'}]},
    {featureType:'road',elementType:'geometry',stylers:[{color:'#181e30'}]},
    {featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#1e2840'}]},
    {featureType:'road',elementType:'labels.text.fill',stylers:[{color:'#7a8aaa'}]},
    {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#253050'}]},
    {featureType:'water',elementType:'geometry',stylers:[{color:'#07090f'}]},
    {featureType:'poi',elementType:'geometry',stylers:[{color:'#111624'}]},
    {featureType:'transit',elementType:'geometry',stylers:[{color:'#111624'}]},
    {featureType:'administrative',elementType:'geometry.stroke',stylers:[{color:'#1e2840'}]},
    {featureType:'administrative',elementType:'labels.text.fill',stylers:[{color:'#7a8aaa'}]},
    {featureType:'landscape',elementType:'geometry',stylers:[{color:'#111624'}]},
  ];
  const mapEl = document.getElementById('deliveryMap');
  if (!mapEl) return;
  map = new google.maps.Map(mapEl, {
    center: {lat:-24.7830,lng:-65.4230},
    zoom: 12,
    styles: darkStyle,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true,
  });
  markerLayer = [];
  routeLayer = [];
  renderOrderMarkers();
};

function renderOrdersList(filter = 'all') {
  const listEl = document.getElementById('ordersList');
  if (!listEl) return;
  listEl.innerHTML = '';

  const allOrders = Array.isArray(currentData.orders) ? currentData.orders : [];
  let branchFiltered = activeRegion === 'all'
    ? allOrders
    : allOrders.filter(order => order.region === activeRegion);

  if (selectedDriver) {
    branchFiltered = branchFiltered.filter(order => order.driver === selectedDriver.name);
  }

  branchFiltered = filterByBranch(branchFiltered);

  const filtered = filter === 'all'
    ? branchFiltered
    : branchFiltered.filter(o => o.risk === filter);

  if (!filtered.length) {
    listEl.innerHTML = '<div class="empty-panel">No hay pedidos para la selección actual.</div>';
    return;
  }

  filtered.forEach(order => {
    const item = document.createElement('div');
    item.className = `order-row risk-${order.risk}`;
    item.innerHTML = `
      <span class="order-id">${escHtml(order.id)}</span>
      <span class="order-dest">${escHtml(order.dest)}
        <small class="order-driver">${escHtml(order.driver)}</small>
        <small class="order-vehicle">Vehículo: ${escHtml(order.vehicle || 'Sin asignar')}</small>
        ${order.pcc ? `<small class="order-pcc">PCC: ${escHtml(order.pcc)}</small>` : ''}
        ${order.branch ? `<small class="order-branch">Sucursal: ${escHtml(order.branch)}</small>` : ''}
        ${order.zone ? `<small class="order-zone">Zona: ${escHtml(order.zone)}</small>` : ''}
        ${order.volume ? `<small class="order-volume">Volumen: ${escHtml(order.volume)}</small>` : ''}
      </span>
      <span class="order-eta">${escHtml(order.eta)}</span>
      <span class="order-issue">${escHtml(order.issue)}</span>
      <span class="risk-pill ${order.risk}">${order.risk === 'high' ? 'Alto' : order.risk === 'low' ? 'Bajo' : 'Medio'}</span>
    `;
    listEl.appendChild(item);
  });
}

// Filters
function initFilters() {
  regionFilter.addEventListener('change', () => {
    activeRegion = regionFilter.value;
    populateDashboard();
  });

  periodFilter.addEventListener('change', () => {
    activePeriod = periodFilter.value;
    populateDashboard();
  });

  riskFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      riskFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRisk = btn.dataset.risk;
      renderOrdersList(activeRisk);
      renderOrdersTable();
      renderOrderMarkers();
    });
  });
}

function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const allOrders = Array.isArray(currentData.orders) ? currentData.orders : [];
  let branchFiltered = activeRegion === 'all'
    ? allOrders
    : allOrders.filter(order => order.region === activeRegion);

  if (selectedDriver) {
    branchFiltered = branchFiltered.filter(order => order.driver === selectedDriver.name);
  }

  const branchFiltered2 = filterByBranch(branchFiltered);
  const filtered = activeRisk === 'all' ? branchFiltered2 : branchFiltered2.filter(o => o.risk === activeRisk);

  if (!filtered.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="8" class="empty-row">No hay pedidos cargados para la selección actual.</td>`;
    tbody.appendChild(row);
    return;
  }

  filtered.forEach(order => {
    const row = document.createElement('tr');
    const riskLabel = order.risk === 'high' ? 'Alto' : order.risk === 'low' ? 'Bajo' : order.risk === 'medium' ? 'Medio' : escHtml(order.risk || '-');
    row.innerHTML = `
      <td>${escHtml(order.id)}</td>
      <td>${escHtml(order.dest)}</td>
      <td>${escHtml(order.driver || '-')}</td>
      <td>${escHtml(order.vehicle || '-')}</td>
      <td>${escHtml(order.branch || order.region || '-')}</td>
      <td>${escHtml(order.zone || '-')}</td>
      <td>${escHtml(order.eta || '-')}</td>
      <td>${riskLabel}</td>
    `;
    tbody.appendChild(row);
  });
}

function normalizeBranch(value) {
  return (value || '').toString().trim().toLowerCase().replace(/^sucursal\s+/, '');
}

function filterByBranch(items) {
  if (activeBranch === 'all') return items;
  return items.filter(item => normalizeBranch(item.branch || item.region || item.zone) === normalizeBranch(activeBranch));
}

function filterByPeriod(items) {
  return items;
}

function getBranchLocation(branchName) {
  if (!branchName || branchName === 'all') return null;
  return sucursalesData.find(s => normalizeBranch(s.name) === normalizeBranch(branchName)) || null;
}

function renderBranchTabs() {
  if (!branchTabs) return;
  branchTabs.innerHTML = '';

  const items = [{id:'all',name:'Todas'}].concat(sucursalesData);
  items.forEach(branch => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `branch-tab ${activeBranch === (branch.id === 'all' ? 'all' : branch.name) ? 'active' : ''}`.trim();
    btn.textContent = branch.name;
    btn.dataset.branch = branch.id === 'all' ? 'all' : branch.name;
    btn.addEventListener('click', () => {
      activeBranch = btn.dataset.branch;
      renderBranchTabs();
      populateDashboard();
    });
    branchTabs.appendChild(btn);
  });
}

// File Handling
function initFileHandling() {
  loadFileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileLoad);
}

function handleFileLoad(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onerror = () => {
    showToast('Error al leer el archivo.', 'error');
    fileInput.value = '';
  };

  reader.onload = (e) => {
    const text = e.target.result;
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.json')) {
        const data = JSON.parse(text);
        currentData = { ...currentData, ...data };
      } else if (fileName.endsWith('.csv')) {
        const csvItems = parseCSV(text);
        const dataset = detectDataset(csvItems);
        if (!dataset) {
          showToast('No se pudo identificar el tipo de datos en la planilla. Revisá los encabezados.', 'warn');
          return;
        }
        currentData = { ...currentData, ...buildDataFromCSV(csvItems, dataset) };
      } else {
        showToast('Formato no compatible. Usá un archivo .csv o .json.', 'warn');
        return;
      }

      populateDashboard();
      showToast('Datos cargados exitosamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al cargar el archivo. Revisá el formato y los encabezados.', 'error');
    } finally {
      fileInput.value = '';
    }
  };
  reader.readAsText(file);
}

function parseCSV(text) {
  const sanitized = text.replace(/^﻿/, '');
  const rows = sanitized.split(/\r?\n/).filter(line => line.trim());
  if (!rows.length) return [];

  const delimiter = rows[0].includes(';') ? ';' : ',';
  const rowSplit = new RegExp(`${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`);

  const headers = rows[0]
    .split(rowSplit)
    .map(h => h.trim().toLowerCase().replace(/\"/g, ''));

  return rows.slice(1).map(line => {
    const values = line
      .split(rowSplit)
      .map(value => value.trim().replace(/^\"|\"$/g, ''));

    return headers.reduce((obj, header, index) => {
      obj[header] = values[index] || '';
      return obj;
    }, {});
  });
}

function detectDataset(items) {
  if (!items.length) return null;
  const keys = Object.keys(items[0]);
  const normalizedKeys = keys.map(k => k.toLowerCase());

  if (normalizedKeys.some(k => ['sku', 'stock', 'demanda', 'estado', 'state'].includes(k))) return 'inventory';
  if (normalizedKeys.some(k => ['id', 'pedido', 'orden', 'n° de factura', 'factura', 'factu', 'n de factura'].includes(k)) && normalizedKeys.some(k => ['dest', 'destino', 'address', 'direccion', 'domicilio', 'domicilio observaciones', 'domicilio observación'].includes(k))) return 'orders';
  if (normalizedKeys.some(k => ['route', 'ruta'].includes(k)) && normalizedKeys.some(k => ['name', 'unidad', 'vehiculo', 'vehicle'].includes(k))) return 'fleet';
  if (normalizedKeys.some(k => ['h', 'hora'].includes(k)) && normalizedKeys.some(k => ['v', 'valor', 'entregas'].includes(k))) return 'deliveries';
  if (normalizedKeys.some(k => ['nombre de cliente', 'domicilio observaciones', 'n° de factura', 'fecha compra', 'fecha entrega a completar por logistica', 'zona'].includes(k))) return 'orders';

  return null;
}

function buildDataFromCSV(items, dataset) {
  if (dataset === 'inventory') {
    return {
      inventory: items.map(item => ({
        sku: item.sku || item.SKU || item.Sku || item['codigo'] || '',
        stock: Number(item.stock || item.Stock || item.cantidad || item.Cantidad || 0),
        demand: Number(item.demand || item.Demand || item.demanda || item.Demanda || 0),
        state: (item.state || item.State || item.estado || item.Estado || 'ok').toLowerCase()
      }))
    };
  }

  if (dataset === 'orders') {
    return {
      orders: items.map(item => ({
        id: item.id || item.ID || item.Id || item.pedido || item.orden || item['n° de factura'] || item.factura || item['n de factura'] || '',
        pcc: item.pcc || item.PCC || item['n° pcc'] || item['num pcc'] || item.folio || '',
        dest: item.dest || item.Dest || item.destino || item.Destino || item.address || item.direccion || item['domicilio observaciones'] || item['domicilio observación'] || item.domicilio || '',
        eta: item.eta || item.ETA || item.Eta || item.hora || item['fecha entrega a completar por logistica'] || item['fecha entrega'] || item['fecha entrega a completar'] || item['fecha compra'] || '',
        issue: item.issue || item.Issue || item.incidencia || item.Incidencia || item.observacion || item.Observacion || item.rto || item.RTO || item.entregado || item.Entregado || '',
        risk: normalizeRisk(item.risk || item.Risk || item.riesgo || item.Riesgo || item.entregado || item.Entregado || item.rto || item.RTO || 'medium'),
        driver: item.driver || item.Driver || item.chofer || item.Chofer || '',
        branch: item.branch || item.Branch || item.sucursal || item.Sucursal || item.zona || item.Zona || item.region || item.Region || 'Sin sucursal',
        region: item.region || item.Region || item.zona || item.Zona || 'salta',
        zone: item.zone || item.Zone || item.zona || item.Zona || item.region || item.Region || '',
        volume: item.volume || item.Volume || item.volumen || item.Volumen || item['m3'] || item['bultos'] || item['volumen m3'] || '',
        lat: Number(item.lat || item.Lat || item.latitude || item.Latitude || 0),
        lng: Number(item.lng || item.Lng || item.longitude || item.Longitude || 0),
        vehicle: item.vehicle || item.Vehicle || item.vehiculo || item.Unidad || '',
        date: item.date || item.Date || item.fecha || item.Fecha || item['fecha compra'] || item['fecha entrega'] || ''
      }))
    };
  }

  if (dataset === 'fleet') {
    return {
      fleet: items.map(item => ({
        icon: item.icon || '🚛',
        name: item.name || item.Name || item.nombre || item.Nombre || item.unidad || item.Unidad || '',
        route: item.route || item.Route || item.ruta || item.Ruta || '',
        driver: item.driver || item.Driver || item.chofer || item.Chofer || '',
        status: (item.status || item.Status || item.estado || item.Estado || 'active').toLowerCase(),
        region: item.region || item.Region || 'salta'
      }))
    };
  }

  if (dataset === 'deliveries') {
    return {
      deliveries: items.map(item => ({
        h: item.h || item.H || item.hora || item.Hora || '',
        v: Number(item.v || item.V || item.valor || item.Valor || item.entregas || 0),
        sla: Number(item.sla || item.SLA || item.Sla || 0)
      }))
    };
  }

  return {};
}

function normalizeRisk(value) {
  const normalized = (value || '').toString().trim().toLowerCase();
  if (['alto', 'high'].includes(normalized)) return 'high';
  if (['medio', 'medium'].includes(normalized)) return 'medium';
  if (['bajo', 'low'].includes(normalized)) return 'low';
  if (normalized.includes('pendiente') || normalized.includes('rto') || normalized.includes('no entregado') || normalized.includes('retorno')) return 'high';
  if (normalized.includes('entregado') || normalized.includes('descargado')) return 'low';
  return 'medium';
}

// Export
function initExport() {
  exportBtn.addEventListener('click', () => {
    if (!Array.isArray(currentData.inventory) || !currentData.inventory.length) {
      showToast('No hay datos de inventario para exportar.', 'warn');
      return;
    }
    const csv = inventoryToCSV(currentData.inventory);
    downloadCSV(csv, 'inventario_critico.csv');
  });
}

function initOptimize() {
  optimizeBtn.addEventListener('click', () => {
    optimizeBtn.classList.add('spinning');
    setTimeout(() => optimizeBtn.classList.remove('spinning'), 600);
    currentData.fleet = currentData.fleet.map(vehicle => ({
      ...vehicle,
      route: shuffleRoute(vehicle.route)
    }));
    renderFleetList();
    showToast('Rutas optimizadas.', 'success');
  });
}

function inventoryToCSV(data) {
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  const headers = 'SKU,Stock,Demanda,Estado\n';
  const rows = data.map(item => [esc(item.sku), esc(item.stock), esc(item.demand), esc(item.state)].join(',')).join('\n');
  return headers + rows;
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function shuffleRoute(route) {
  const parts = route.split(' → ');
  return parts.reverse().join(' → ');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
