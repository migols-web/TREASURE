/**
 * TREASURE - Class Fund Management System
 * UI logic: tab switching, sidebar, settings, modals, CRUD display
 */

window._treasureEntered = false;

window.enterApp = function() {
  var landing = document.getElementById('landingScreen');
  if (!landing) return;
  window._treasureEntered = true;
  landing.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
  landing.style.opacity = '0';
  setTimeout(function() {
    landing.style.display = 'none';
    if (window._treasureOnEnter) {
      window._treasureOnEnter();
    } else {
      var auth = document.getElementById('authContainer');
      if (auth) {
        auth.style.display = 'flex';
        auth.classList.add('active');
      }
    }
  }, 500);
};

window.goToLanding = function() {
  location.reload();
};

// PASSWORD TOGGLE
window.togglePassword = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  const icon = btn.querySelector('i');
  if (icon) {
    icon.classList.toggle('fa-eye', !isHidden);
    icon.classList.toggle('fa-eye-slash', isHidden);
  }
};

window.showForm = function(formType) {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const tabButtons = document.querySelectorAll(".tab-btn");

  if (loginForm) loginForm.classList.remove("active");
  if (signupForm) signupForm.classList.remove("active");
  tabButtons.forEach(btn => btn.classList.remove("active"));

  if (formType === "login") {
    if (loginForm) loginForm.classList.add("active");
    if (tabButtons[0]) tabButtons[0].classList.add("active");
  } else if (formType === "signup") {
    if (signupForm) signupForm.classList.add("active");
    if (tabButtons[1]) tabButtons[1].classList.add("active");
  }
};

window.selectRole = function(role) {
  const isOfficer = role === 'classofficer';
  const label = isOfficer ? 'Class Officer' : 'Student';
  const icon  = isOfficer ? 'fa-user-shield' : 'fa-user-graduate';

  const roleSelect  = document.getElementById('roleSelect');
  const signupRole  = document.getElementById('signupRole');
  if (roleSelect)  roleSelect.value  = role;
  if (signupRole)  signupRole.value  = role;

  const pillText = document.getElementById('rolePillText');
  const pill     = document.getElementById('rolePill');
  if (pillText) pillText.textContent = label;
  if (pill) {
    pill.querySelector('i').className = `fas ${icon}`;
    pill.dataset.role = role;
  }

  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.role-card').forEach(c => {
    const cardIcon = c.querySelector('.role-card-icon i');
    if ((isOfficer && cardIcon?.classList.contains('fa-user-shield')) ||
        (!isOfficer && cardIcon?.classList.contains('fa-user-graduate'))) {
      c.classList.add('active');
    }
  });

  const picker    = document.getElementById('rolePicker');
  const authForms = document.getElementById('authForms');
  if (picker)    picker.style.display    = 'none';
  if (authForms) authForms.style.display = 'block';

  window.showForm('login');
};

window.backToRolePicker = function() {
  const picker    = document.getElementById('rolePicker');
  const authForms = document.getElementById('authForms');
  if (picker)    picker.style.display    = '';
  if (authForms) authForms.style.display = 'none';
  ['loginForm','signupForm'].forEach(id => {
    const f = document.getElementById(id);
    if (f) f.reset();
  });
  ['signInMessage','signUpMessage'].forEach(id => {
    const m = document.getElementById(id);
    if (m) { m.innerText = ''; m.classList.remove('show','success'); }
  });
};

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
    tab.classList.remove('active');
  });

  const activeTab = document.getElementById(tabId);
  if (activeTab) {
    activeTab.style.display = 'block';
    activeTab.classList.add('active');
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.tab === tabId) {
      item.classList.add('active');
    }
  });

  localStorage.setItem('activeTab', tabId);

  if (window.innerWidth <= 1023) {
    closeMobileSidebar();
  }

  if (tabId === 'dashboard') {
    updateDashboard();
  } else if (tabId === 'contributions') {
    loadContributions();
  } else if (tabId === 'classMembers') {
    loadMembers();
  } else if (tabId === 'events') {
    loadEvents();
  } else if (tabId === 'auditLog') {
    renderAuditTable();
  } else if (tabId === 'reports') {
    if (typeof window.updateReport === 'function') window.updateReport();
    else updateReport();
  } else if (tabId === 'payment') {
    loadQrCode();
  } else if (tabId === 'accountManagement') {
    if (typeof window.loadStudentAccounts === 'function') window.loadStudentAccounts();
  }
};

window.toggleTheme = function() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);

  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = (newTheme === 'dark');
};

function updateThemeIcon(theme) {
  document.querySelectorAll('#themeToggle i, #authThemeToggle i').forEach(icon => {
    icon.style.transform = theme === 'dark' ? 'rotate(180deg)' : 'rotate(0deg)';
    icon.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  });
  document.querySelectorAll('#themeToggle, #authThemeToggle').forEach(btn => {
    btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  });
}

window.toggleSidebar = function() {
  if (window.innerWidth >= 1024) return;
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.menu-overlay');

  if (sidebar.classList.contains('active')) {
    closeMobileSidebar();
  } else {
    sidebar.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.menu-overlay');
  if (!sidebar) return;
  sidebar.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

window.toggleSidebarCollapse = function() {
  if (window.innerWidth <= 1023) return;
  const sidebar = document.getElementById('sidebar');
  const isCollapsed = sidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
};

window.openSettings = function() {
  const overlay = document.getElementById('settingsOverlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    syncSettingsUI();
    _initNavDragDrop();
  }
};

window.closeSettings = function() {
  const overlay = document.getElementById('settingsOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
};

window.closeSettingsOnOverlay = function(e) {
  if (e.target === document.getElementById('settingsOverlay')) {
    closeSettings();
  }
};

function syncSettingsUI() {
  const theme = document.documentElement.getAttribute('data-theme');
  const darkToggle = document.getElementById('darkModeToggle');
  if (darkToggle) darkToggle.checked = (theme === 'dark');

  const currentFont = localStorage.getItem('fontSize') || 'medium';
  ['Small', 'Medium', 'Large'].forEach(s => {
    const el = document.getElementById('font' + s);
    if (el) el.classList.toggle('active', s.toLowerCase() === currentFont);
  });

  const currentLayout = localStorage.getItem('layout') || 'comfortable';
  const layoutComfort = document.getElementById('layoutComfort');
  const layoutCompact = document.getElementById('layoutCompact');
  if (layoutComfort) layoutComfort.classList.toggle('active', currentLayout === 'comfortable');
  if (layoutCompact) layoutCompact.classList.toggle('active', currentLayout === 'compact');

  const currentColor = localStorage.getItem('accentColor') || 'green';
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === currentColor);
  });

  const animToggle = document.getElementById('animToggle');
  if (animToggle) animToggle.checked = localStorage.getItem('animations') !== '0';

  const tooltipToggle = document.getElementById('tooltipToggle');
  if (tooltipToggle) tooltipToggle.checked = localStorage.getItem('tooltips') !== '0';

  const savedLabels = localStorage.getItem('navLabels');
  if (savedLabels) {
    try {
      const labels = JSON.parse(savedLabels);
      document.querySelectorAll('.nav-label-input').forEach(input => {
        const key = input.dataset.nav;
        if (labels[key]) input.value = labels[key];
      });
    } catch(e) {}
  }
}

window.handleDarkModeToggle = function(cb) {
  const newTheme = cb.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
};

window.setFontSize = function(size) {
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.add('font-' + size);
  localStorage.setItem('fontSize', size);
  ['Small', 'Medium', 'Large'].forEach(s => {
    const el = document.getElementById('font' + s);
    if (el) el.classList.toggle('active', s.toLowerCase() === size);
  });
};

window.setLayout = function(layout) {
  if (layout === 'compact') {
    document.body.classList.add('layout-compact');
  } else {
    document.body.classList.remove('layout-compact');
  }
  localStorage.setItem('layout', layout);
  const layoutComfort = document.getElementById('layoutComfort');
  const layoutCompact = document.getElementById('layoutCompact');
  if (layoutComfort) layoutComfort.classList.toggle('active', layout === 'comfortable');
  if (layoutCompact) layoutCompact.classList.toggle('active', layout === 'compact');
};

window.setAccentColor = function(name, primary, mid, dim, border) {
  const r = document.documentElement.style;
  r.setProperty('--primary', primary);
  r.setProperty('--primary-dark', primary);
  r.setProperty('--primary-light', mid);
  r.setProperty('--primary-dim', dim);
  r.setProperty('--primary-border', border);
  r.setProperty('--primary-glow', dim.replace('0.09', '0.18').replace('0.1', '0.2'));

  localStorage.setItem('accentColor', name);
  localStorage.setItem('accentVars', JSON.stringify({ name, primary, mid, dim, border }));
  
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === name);
  });
};

window.handleCustomColor = function(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const mix = (c, w=40) => Math.min(255, Math.round(c + (255-c)*(w/100)));
  const mid = '#' + [mix(r),mix(g),mix(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
  const dim = `rgba(${r},${g},${b},0.1)`;
  const border = `rgba(${r},${g},${b},0.24)`;
  setAccentColor('custom', hex, mid, dim, border);
  
  const wheel = document.getElementById('colorWheelSwatch');
  if (wheel) wheel.style.background = hex;
  
  localStorage.setItem('customColorHex', hex);
};

window.handleAnimToggle = function(cb) {
  localStorage.setItem('animations', cb.checked ? '1' : '0');
  if (!cb.checked) {
    const style = document.getElementById('no-anim-style') || document.createElement('style');
    style.id = 'no-anim-style';
    style.textContent = '*, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }';
    document.head.appendChild(style);
  } else {
    const style = document.getElementById('no-anim-style');
    if (style) style.remove();
  }
};

window.handleTooltipToggle = function(cb) {
  localStorage.setItem('tooltips', cb.checked ? '1' : '0');
  document.body.classList.toggle('no-tooltips', !cb.checked);
};

function _initNavDragDrop() {
  const list = document.getElementById('navLabelList');
  if (!list || list._dragInited) return;
  list._dragInited = true;

  let dragSrc = null;

  list.addEventListener('dragstart', e => {
    const row = e.target.closest('.nav-reorder-row');
    if (!row || row.classList.contains('nav-reorder-locked')) {
      e.preventDefault(); return;
    }
    dragSrc = row;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', row.dataset.nav);
  });

  list.addEventListener('dragend', e => {
    const row = e.target.closest('.nav-reorder-row');
    if (row) row.classList.remove('dragging');
    list.querySelectorAll('.nav-reorder-row').forEach(r => r.classList.remove('drag-over'));
    dragSrc = null;
  });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.target.closest('.nav-reorder-row');
    if (!row || row === dragSrc) return;
    list.querySelectorAll('.nav-reorder-row').forEach(r => r.classList.remove('drag-over'));
    row.classList.add('drag-over');
  });

  list.addEventListener('dragleave', e => {
    const row = e.target.closest('.nav-reorder-row');
    if (row) row.classList.remove('drag-over');
  });

  list.addEventListener('drop', e => {
    e.preventDefault();
    const row = e.target.closest('.nav-reorder-row');
    if (!row || row === dragSrc || !dragSrc) return;
    if (row.classList.contains('nav-reorder-locked')) return;
    row.classList.remove('drag-over');
    const rect = row.getBoundingClientRect();
    const mid  = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      list.insertBefore(dragSrc, row);
    } else {
      list.insertBefore(dragSrc, row.nextSibling);
    }
    const lockedRow = list.querySelector('.nav-reorder-locked');
    if (lockedRow) list.appendChild(lockedRow);
    const order = Array.from(list.querySelectorAll('.nav-reorder-row:not(.nav-reorder-locked)')).map(r => r.dataset.nav);
    _applyNavOrderToDom(order);
  });
}

window.resetSettings = function() {
  localStorage.removeItem('theme');
  localStorage.removeItem('sidebarCollapsed');
  localStorage.removeItem('fontSize');
  localStorage.removeItem('layout');
  localStorage.removeItem('accentColor');
  localStorage.removeItem('accentVars');
  localStorage.removeItem('animations');
  localStorage.removeItem('tooltips');
  localStorage.removeItem('navLabels');
  localStorage.removeItem('navOrder');
  localStorage.removeItem('customColorHex');

  document.documentElement.setAttribute('data-theme', 'light');
  updateThemeIcon('light');
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('collapsed');
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.remove('layout-compact');
  const noAnimStyle = document.getElementById('no-anim-style');
  if (noAnimStyle) noAnimStyle.remove();
  document.body.classList.remove('no-tooltips');

  const r = document.documentElement.style;
  r.setProperty('--primary', '#1a6b3c');
  r.setProperty('--primary-dark', '#124d2b');
  r.setProperty('--primary-light', '#2a8f52');
  r.setProperty('--primary-dim', 'rgba(26,107,60,0.09)');
  r.setProperty('--primary-border', 'rgba(26,107,60,0.24)');
  r.setProperty('--primary-glow', 'rgba(26,107,60,0.18)');

  document.querySelectorAll('.nav-label-input').forEach(input => {
    const key = input.dataset.nav;
    input.value = DEFAULT_NAV_LABELS[key] || '';
  });
  _applyNavLabelsToDom(DEFAULT_NAV_LABELS);
  _applyNavOrderToDom(DEFAULT_NAV_ORDER);
  _syncSettingsListOrder(DEFAULT_NAV_ORDER);

  syncSettingsUI();
  showNotification('Settings reset to defaults');
};

window.applySettings = function() {
  applyNavLabels();
  closeSettings();
  showNotification('Settings applied successfully');
};

const DEFAULT_NAV_LABELS = {
  dashboard: 'Dashboard',
  contributions: 'Contributions',
  payment: 'Payment',
  classMembers: 'Class Members',
  accountManagement: 'Manage Accounts',
  events: 'Events',
  reports: 'Reports',
  auditLog: 'Audit Log',
  creditsTab: 'About'
};

const DEFAULT_NAV_ORDER = [
  'dashboard','contributions','payment','classMembers',
  'accountManagement','events','reports','auditLog'
];

function _getCurrentOrder() {
  const rows = document.querySelectorAll('#navLabelList .nav-reorder-row:not(.nav-reorder-locked)');
  if (rows.length) return Array.from(rows).map(r => r.dataset.nav);
  const items = document.querySelectorAll('.nav-item[data-tab]');
  if (items.length) return Array.from(items).map(i => i.dataset.tab).filter(k => k !== 'creditsTab');
  return [...DEFAULT_NAV_ORDER];
}

function applyNavLabels() {
  const inputs = document.querySelectorAll('.nav-label-input');
  const labels = {};
  inputs.forEach(input => {
    const key = input.dataset.nav;
    const val = input.value.trim() || DEFAULT_NAV_LABELS[key];
    labels[key] = val;
    input.value = val;
  });

  const order = _getCurrentOrder();

  _applyNavLabelsToDom(labels);
  _applyNavOrderToDom(order);

  localStorage.setItem('navLabels', JSON.stringify(labels));
  localStorage.setItem('navOrder',  JSON.stringify(order));
}

const _TAB_HEADER_ICONS = {
  dashboard:         'fa-tachometer-alt',
  contributions:     'fa-money-bill-wave',
  payment:           'fa-credit-card',
  classMembers:      'fa-users',
  accountManagement: 'fa-user-shield',
  events:            'fa-calendar-alt',
  reports:           'fa-chart-bar',
  auditLog:          'fa-clipboard-list',
  creditsTab:        'fa-info-circle',
};

function _applyNavLabelsToDom(labels) {
  document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    const key = item.dataset.tab;
    if (!key || !labels[key]) return;
    // Update sidebar span
    const span = item.querySelector('span');
    if (span) span.textContent = labels[key];
    item.setAttribute('data-tooltip', labels[key]);
    // Update the matching tab's page-header h2 (preserve the icon)
    const tabContent = document.getElementById(key);
    if (tabContent) {
      const h2 = tabContent.querySelector('.page-header h2');
      if (h2) {
        const icon = h2.querySelector('i');
        const iconClass = _TAB_HEADER_ICONS[key];
        h2.innerHTML = icon
          ? '<i class="' + icon.className + '"></i> ' + labels[key]
          : (iconClass ? '<i class="fas ' + iconClass + '"></i> ' + labels[key] : labels[key]);
      }
    }
  });
  // Sync settings input values too
  document.querySelectorAll('.nav-label-input').forEach(input => {
    const key = input.dataset.nav;
    if (labels[key]) input.value = labels[key];
  });
}

function _applyNavOrderToDom(order) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const itemMap = {};
  sidebar.querySelectorAll('.nav-item[data-tab]').forEach(el => {
    itemMap[el.dataset.tab] = el;
  });
  const bottomRef = sidebar.querySelector('.sidebar-bottom-actions');
  // Insert ordered tabs first (never includes creditsTab)
  order.filter(k => k !== 'creditsTab').forEach(key => {
    if (itemMap[key]) sidebar.insertBefore(itemMap[key], bottomRef || null);
  });
  // Always pin creditsTab (About) as the very last nav item
  if (itemMap['creditsTab']) sidebar.insertBefore(itemMap['creditsTab'], bottomRef || null);
}


function _initSidebarDragDrop() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || sidebar._dragInited) return;
  sidebar._dragInited = true;
  let dragSrc = null;
  sidebar.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    if (item.dataset.tab !== 'creditsTab') item.setAttribute('draggable', 'true');
  });
  sidebar.addEventListener('dragstart', e => {
    const item = e.target.closest('.nav-item[data-tab]');
    if (!item || item.dataset.tab === 'creditsTab') { e.preventDefault(); return; }
    dragSrc = item; item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.tab);
  });
  sidebar.addEventListener('dragend', e => {
    const item = e.target.closest('.nav-item[data-tab]');
    if (item) item.classList.remove('dragging');
    sidebar.querySelectorAll('.nav-item').forEach(i => i.classList.remove('drag-over'));
    dragSrc = null;
  });
  sidebar.addEventListener('dragover', e => {
    e.preventDefault();
    const item = e.target.closest('.nav-item[data-tab]');
    if (!item || item === dragSrc) return;
    sidebar.querySelectorAll('.nav-item').forEach(i => i.classList.remove('drag-over'));
    item.classList.add('drag-over');
  });
  sidebar.addEventListener('dragleave', e => {
    const item = e.target.closest('.nav-item[data-tab]');
    if (item) item.classList.remove('drag-over');
  });
  sidebar.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.nav-item[data-tab]');
    if (!target || target === dragSrc || !dragSrc) return;
    if (target.dataset.tab === 'creditsTab') return;
    target.classList.remove('drag-over');
    const bottomRef = sidebar.querySelector('.sidebar-bottom-actions');
    const rect = target.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) sidebar.insertBefore(dragSrc, target);
    else sidebar.insertBefore(dragSrc, target.nextSibling);
    const ct = sidebar.querySelector('.nav-item[data-tab="creditsTab"]');
    if (ct) sidebar.insertBefore(ct, bottomRef || null);
    const order = Array.from(sidebar.querySelectorAll('.nav-item[data-tab]'))
      .map(i => i.dataset.tab).filter(k => k !== 'creditsTab');
    localStorage.setItem('navOrder', JSON.stringify(order));
    _syncSettingsListOrder(order);
  });
}
function loadNavLabels() {
  // Load saved labels
  const savedLabels = localStorage.getItem('navLabels');
  if (savedLabels) {
    try {
      _applyNavLabelsToDom(JSON.parse(savedLabels));
    } catch(e) {}
  }
  // Load saved order
  const savedOrder = localStorage.getItem('navOrder');
  if (savedOrder) {
    try {
      const order = JSON.parse(savedOrder);
      _applyNavOrderToDom(order);
      // Sync settings drag list to saved order
      _syncSettingsListOrder(order);
    } catch(e) {}
  }
  _initSidebarDragDrop();
}

function _syncSettingsListOrder(order) {
  const list = document.getElementById('navLabelList');
  if (!list) return;
  const rowMap = {};
  // Only reorder non-locked rows
  list.querySelectorAll('.nav-reorder-row:not(.nav-reorder-locked)[data-nav]').forEach(row => {
    rowMap[row.dataset.nav] = row;
  });
  const lockedRow = list.querySelector('.nav-reorder-locked');
  // Reorder draggable rows in saved order
  order.filter(k => k !== 'creditsTab').forEach(key => {
    if (rowMap[key]) {
      // Insert before the locked row so About stays last
      list.insertBefore(rowMap[key], lockedRow || null);
    }
  });
  // Ensure locked row is always last in the list
  if (lockedRow) list.appendChild(lockedRow);
}

window.showModal = function(id, isEdit = false) {
  const modal = document.getElementById(id);
  if (!modal) return;
  
  if (!isEdit) {
    const form = modal.querySelector('form');
    if (form) form.reset();
  }
  
  const title = modal.querySelector('.modal-header h2');
  if (title) {
    if (id === 'addContributionModal') {
      title.innerHTML = isEdit ? '<i class="fas fa-edit"></i> Edit Contribution' : '<i class="fas fa-money-bill-wave"></i> Add Contribution';
      // Reload event dropdown with latest data
      if (typeof window.loadEventsForContribModal === 'function') window.loadEventsForContribModal();
    }
    if (id === 'addMemberModal') title.innerHTML = isEdit ? '<i class="fas fa-user-edit"></i> Edit Member' : '<i class="fas fa-user-plus"></i> Add Member';
    if (id === 'addEventModal') title.innerHTML = isEdit ? '<i class="fas fa-edit"></i> Edit Event' : '<i class="fas fa-calendar-plus"></i> Add Event';
  }
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
  
  editingId = null;
  editingType = null;
  window.editingId = null;
  window.editingType = null;
};

window.filterContributions = function() {
  loadContributions();
};

window.showNotification = function(msg, type = 'success') {
  const icon = type === 'error' ? 'circle-xmark' : type === 'success' ? 'circle-check' : 'circle-info';
  const n = document.createElement('div');
  n.className = 'notification' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
  n.innerHTML = `
    <i class="fas fa-${icon} notif-icon"></i>
    <span class="notif-msg">${msg}</span>
    <button class="notif-close" onclick="this.closest('.notification').remove(); window._repositionNotifs && window._repositionNotifs();" aria-label="Close">
      <i class="fas fa-xmark"></i>
    </button>`;
  document.body.appendChild(n);
  window._repositionNotifs && window._repositionNotifs();
  const timer = setTimeout(() => {
    n.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => { n.remove(); window._repositionNotifs && window._repositionNotifs(); }, 300);
  }, 4000);
  n.querySelector('.notif-close').addEventListener('click', () => clearTimeout(timer));
};





window.openTermsModal = function() {
  const modal = document.getElementById('termsModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closeTermsModal = function() {
  const modal = document.getElementById('termsModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

window.closeTermsOnOverlay = function(e) {
  if (e.target === document.getElementById('termsModal')) {
    closeTermsModal();
  }
};

const DATA_KEYS = {
  members: 'treasure_members',
  contributions: 'treasure_contributions',
  events: 'treasure_events',
  auditLog: 'treasure_auditLog',
  qrCode: 'gcashQrCode'
};

function getData(key) {
  const data = localStorage.getItem(DATA_KEYS[key]);
  return data ? JSON.parse(data) : [];
}

function setData(key, data) {
  localStorage.setItem(DATA_KEYS[key], JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

let editingId = null;
let editingType = null;

window.loadMembers = function() {
  const members = getData('members');
  const tbody = document.querySelector('#membersTable tbody');
  if (!tbody) return;
  
  if (members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">No members found. Click "Add Member" to get started.</td></tr>';
    return;
  }
  
  tbody.innerHTML = members.map(m => `
    <tr>
      <td>${m.memberId || '-'}</td>
      <td>${m.memberName || '-'}</td>
      <td>${m.memberContact || '-'}</td>
      <td><span class="badge ${m.status === 'Active' ? 'badge-success' : 'badge-secondary'}">${m.status || 'Active'}</span></td>
      <td>${m.lastPayment || '—'}</td>
      <td class="officer-only" style="text-align:right;">
        <div class="action-btns">
          <button class="btn btn-primary btn-sm" onclick="editMember('${m.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteMember('${m.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  updateMemberSelect();
};

window.saveMember = function() {
  const memberId = document.getElementById('memberId').value.trim();
  const memberName = document.getElementById('memberName').value.trim();
  const memberContact = document.getElementById('memberContact').value.trim();
  
  if (!memberId || !memberName || !memberContact) {
    showNotification('Please fill in all fields', 'error');
    return;
  }
  
  const members = getData('members');
  
  if (editingId && editingType === 'member') {
    const index = members.findIndex(m => m.id === editingId);
    if (index !== -1) {
      members[index] = { ...members[index], memberId, memberName, memberContact };
      addAuditEntry('edit', `Member "${memberName}" was updated`);
      showNotification('Member updated successfully');
    }
  } else {
    members.push({
      id: generateId(),
      memberId,
      memberName,
      memberContact,
      status: 'Active',
      lastPayment: null,
      createdAt: new Date().toISOString()
    });
    addAuditEntry('add', `Member "${memberName}" was added`);
    showNotification('Member added successfully');
  }
  
  setData('members', members);
  closeModal('addMemberModal');
  loadMembers();
  updateDashboard();
};

window.editMember = function(id) {
  const members = getData('members');
  const member = members.find(m => m.id === id);
  if (!member) return;
  
  editingId = id;
  editingType = 'member';
  window.editingId = id;
  window.editingType = 'member';
  
  document.getElementById('memberId').value = member.memberId;
  document.getElementById('memberName').value = member.memberName;
  document.getElementById('memberContact').value = member.memberContact;
  
  showModal('addMemberModal', true);
};

window.deleteMember = function(id) {
  if (!confirm('Are you sure you want to delete this member?')) return;
  
  const members = getData('members');
  const member = members.find(m => m.id === id);
  const newMembers = members.filter(m => m.id !== id);
  
  setData('members', newMembers);
  addAuditEntry('delete', `Member "${member?.memberName || 'Unknown'}" was deleted`);
  showNotification('Member deleted successfully');
  loadMembers();
  updateDashboard();
};

window.loadContributions = function() {
  const contributions = getData('contributions');
  const members = getData('members');
  const tbody = document.querySelector('#contributionsTable tbody');
  if (!tbody) return;
  
  const statusFilter = document.getElementById('statusFilter')?.value || 'all';
  const dateFrom = document.getElementById('dateFrom')?.value;
  const dateTo = document.getElementById('dateTo')?.value;
  
  let filtered = contributions;
  
  if (statusFilter !== 'all') {
    filtered = filtered.filter(c => c.status?.toLowerCase() === statusFilter);
  }
  
  if (dateFrom) {
    filtered = filtered.filter(c => c.date >= dateFrom);
  }
  
  if (dateTo) {
    filtered = filtered.filter(c => c.date <= dateTo);
  }
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">No contributions found.</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td>
        <div>${c.memberName || '-'}</div>
        ${c.linkedEventName ? `<span class="event-link-badge"><i class="fas fa-calendar-check"></i>${c.linkedEventName}</span>` : ''}
      </td>
      <td>₱${parseFloat(c.amount || 0).toFixed(2)}</td>
      <td>${c.date || '-'}</td>
      <td>${c.method || '-'}</td>
      <td><span class="badge ${c.status === 'Paid' ? 'badge-success' : c.status === 'Half' ? 'badge-warning' : 'badge-danger'}">${c.status || 'Unpaid'}</span></td>
      <td class="officer-only" style="text-align:right;">
        <div class="action-btns">
          <button class="btn btn-primary btn-sm" onclick="editContribution('${c.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteContribution('${c.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
};

window.saveContribution = function() {
  const studentSelect = document.getElementById('studentSelect');
  const memberName = studentSelect ? studentSelect.value : '';
  const amount = parseFloat(document.getElementById('amount').value);
  const date = document.getElementById('paymentDate').value;
  const method = document.getElementById('paymentMethod').value;
  const notes = document.getElementById('notes')?.value || '';
  
  if (!memberName || !amount || !date || !method) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  const contributions = getData('contributions');
  
  const eventLinkEl = document.getElementById('contributionEventLink');
  const linkedEventId = eventLinkEl ? eventLinkEl.value : '';
  const linkedEventName = eventLinkEl ? (eventLinkEl.options[eventLinkEl.selectedIndex]?.text || '') : '';

  if (editingId && editingType === 'contribution') {
    const index = contributions.findIndex(c => c.id === editingId);
    if (index !== -1) {
      contributions[index] = { ...contributions[index], memberName, amount, date, method, notes, linkedEventId: linkedEventId || null, linkedEventName: linkedEventId ? linkedEventName : null };
      addAuditEntry('edit', `Contribution for "${memberName}" was updated`);
      showNotification('Contribution updated successfully');
    }
  } else {
    contributions.push({
      id: generateId(),
      memberName,
      amount,
      date,
      method,
      notes,
      linkedEventId: linkedEventId || null,
      linkedEventName: linkedEventId ? linkedEventName : null,
      status: 'Paid',
      createdAt: new Date().toISOString()
    });
    addAuditEntry('add', `Contribution of ₱${amount.toFixed(2)} for "${memberName}" was added`);
    showNotification('Contribution added successfully');
  }
  
  setData('contributions', contributions);
  closeModal('addContributionModal');
  loadContributions();
  updateDashboard();
};

window.editContribution = function(id) {
  const contributions = getData('contributions');
  const contribution = contributions.find(c => c.id === id);
  if (!contribution) return;
  
  editingId = id;
  editingType = 'contribution';
  window.editingId = id;
  window.editingType = 'contribution';
  
  const studentSelect = document.getElementById('studentSelect');
  if (studentSelect) studentSelect.value = contribution.memberName;
  document.getElementById('amount').value = contribution.amount;
  document.getElementById('paymentDate').value = contribution.date;
  document.getElementById('paymentMethod').value = contribution.method;
  const notes = document.getElementById('notes');
  if (notes) notes.value = contribution.notes || '';
  const elLink = document.getElementById('contributionEventLink');
  if (elLink && contribution.linkedEventId) {
    setTimeout(() => { elLink.value = contribution.linkedEventId; }, 50);
  }
  showModal('addContributionModal', true);
};

window.deleteContribution = function(id) {
  if (!confirm('Are you sure you want to delete this contribution?')) return;
  
  const contributions = getData('contributions');
  const contribution = contributions.find(c => c.id === id);
  const newContributions = contributions.filter(c => c.id !== id);
  
  setData('contributions', newContributions);
  addAuditEntry('delete', `Contribution for "${contribution?.memberName || 'Unknown'}" was deleted`);
  showNotification('Contribution deleted successfully');
  loadContributions();
  updateDashboard();
};

window.filterContributions = function() {
  loadContributions();
};

window.updateMemberSelect = function updateMemberSelect() {
  const members = getData('members');
  const select = document.getElementById('studentSelect');
  if (!select) return;
  // If localStorage is empty (cleared on login), don't populate with stale data
  if (!members || members.length === 0) {
    select.innerHTML = '<option value="">Select Student</option>';
    return;
  }
  const currentValue = select.value;
  select.innerHTML = '<option value="">Select Student</option>' + 
    members.map(m => `<option value="${m.memberName}">${m.memberName}</option>`).join('');
  select.value = currentValue;
};

window.loadEvents = function() {
  const events = getData('events');
  const tbody = document.querySelector('#eventsTable tbody');
  if (!tbody) return;
  
  if (events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">No events found. Click "Add Event" to get started.</td></tr>';
    return;
  }
  
  tbody.innerHTML = events.map(e => {
    const budget    = parseFloat(e.eventBudget || 0);
    const collected = parseFloat(e.eventBudgetPaid || 0);
    const remaining = Math.max(0, budget - collected);
    const pct       = budget > 0 ? Math.min(100, Math.round((collected / budget) * 100)) : 0;
    const statusClass = e.eventStatus === 'completed' ? 'badge-success'
                      : e.eventStatus === 'confirmed'  ? 'badge-primary'
                      : e.eventStatus === 'planning'   ? 'badge-warning' : 'badge-secondary';
    return `
    <tr>
      <td><strong>${e.eventName || '-'}</strong></td>
      <td>${e.eventDate || '-'}</td>
      <td>₱${budget.toFixed(2)}</td>
      <td>
        <div style="display:flex;flex-direction:column;gap:0.25rem;min-width:120px;">
          <span style="font-weight:600;color:var(--success);">₱${collected.toFixed(2)}</span>
          <div class="event-progress-bar">
            <div class="event-progress-fill" style="width:${pct}%"></div>
          </div>
          <span style="font-size:0.7rem;color:var(--text-light);">${pct}% funded</span>
        </div>
      </td>
      <td style="color:${remaining > 0 ? 'var(--warning)' : 'var(--success)'};">
        ${remaining > 0 ? '₱'+remaining.toFixed(2)+' left' : '<i class="fas fa-circle-check"></i> Fully funded'}
      </td>
      <td><span class="badge ${statusClass}">${e.eventStatus || '-'}</span></td>
      <td class="officer-only" style="text-align:right;">
        <div class="action-btns">
          <button class="btn btn-primary btn-sm" onclick="editEvent('${e.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteEvent('${e.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
};

window.saveEvent = function() {
  const eventName = document.getElementById('eventName').value.trim();
  const eventDate = document.getElementById('eventDate').value;
  const eventBudget = parseFloat(document.getElementById('eventBudget').value);
  const eventStatus = document.getElementById('eventStatus').value;
  
  if (!eventName || !eventDate || isNaN(eventBudget)) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  const events = getData('events');
  
  if (editingId && editingType === 'event') {
    const index = events.findIndex(e => e.id === editingId);
    if (index !== -1) {
      events[index] = { ...events[index], eventName, eventDate, eventBudget, eventStatus };
      addAuditEntry('edit', `Event "${eventName}" was updated`);
      showNotification('Event updated successfully');
    }
  } else {
    events.push({
      id: generateId(),
      eventName,
      eventDate,
      eventBudget,
      eventStatus,
      createdAt: new Date().toISOString()
    });
    addAuditEntry('add', `Event "${eventName}" was added`);
    showNotification('Event added successfully');
  }
  
  setData('events', events);
  closeModal('addEventModal');
  loadEvents();
  updateDashboard();
  // Refresh the contribution event dropdown
  if (typeof window.loadEventsForContribModal === 'function') window.loadEventsForContribModal();
};

window.editEvent = function(id) {
  const events = getData('events');
  const event = events.find(e => e.id === id);
  if (!event) return;
  
  editingId = id;
  editingType = 'event';
  window.editingId = id;
  window.editingType = 'event';
  
  document.getElementById('eventName').value = event.eventName;
  document.getElementById('eventDate').value = event.eventDate;
  document.getElementById('eventBudget').value = event.eventBudget;
  document.getElementById('eventStatus').value = event.eventStatus;
  
  showModal('addEventModal', true);
};

window.deleteEvent = function(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  
  const events = getData('events');
  const event = events.find(e => e.id === id);
  const newEvents = events.filter(e => e.id !== id);
  
  setData('events', newEvents);
  addAuditEntry('delete', `Event "${event?.eventName || 'Unknown'}" was deleted`);
  showNotification('Event deleted successfully');
  loadEvents();
  updateDashboard();
  if (typeof window.loadEventsForContribModal === 'function') window.loadEventsForContribModal();
};

window.updateDashboard = function() {
  const contributions = getData('contributions');
  const members = getData('members');
  const events = getData('events');
  
  const totalContributions = contributions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const totalExpenses = events
    .filter(e => e.eventStatus === 'completed')
    .reduce((sum, e) => sum + (parseFloat(e.eventBudget) || 0), 0);
  const totalFunds = totalContributions - totalExpenses;
  
  const paidMembers = new Set(contributions.filter(c => c.status === 'Paid').map(c => c.memberName));
  
  const totalFundsEl = document.getElementById('totalFunds');
  const totalContributionsEl = document.getElementById('totalContributions');
  const totalExpensesEl = document.getElementById('totalExpenses');
  const membersPaidEl = document.getElementById('membersPaid');
  
  if (totalFundsEl) totalFundsEl.textContent = `₱${totalFunds.toFixed(2)}`;
  if (totalContributionsEl) totalContributionsEl.textContent = `₱${totalContributions.toFixed(2)}`;
  if (totalExpensesEl) totalExpensesEl.textContent = `₱${totalExpenses.toFixed(2)}`;
  if (membersPaidEl) membersPaidEl.textContent = `${paidMembers.size}/${members.length}`;
  
  // Recent contributions
  const recentContainer = document.getElementById('recentContributions');
  if (recentContainer) {
    const sorted = [...contributions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    if (sorted.length === 0) {
      recentContainer.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-light);padding:1rem;">No contributions yet.</td></tr>';
    } else {
      recentContainer.innerHTML = sorted.map(c => `
        <tr>
          <td>${c.memberName || 'Unknown'}</td>
          <td>₱${parseFloat(c.amount || 0).toFixed(2)}</td>
          <td><span class="badge badge-success">${c.status || 'Paid'}</span></td>
        </tr>
      `).join('');
    }
  }
  
  // Upcoming events
  const upcomingContainer = document.getElementById('upcomingEvents');
  if (upcomingContainer) {
    const upcoming = events
      .filter(e => e.eventStatus !== 'completed' && e.eventStatus !== 'cancelled')
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .slice(0, 5);
    
    if (upcoming.length === 0) {
      upcomingContainer.innerHTML = '<div class="activity-empty">No upcoming events.</div>';
    } else {
      upcomingContainer.innerHTML = upcoming.map(e => `
        <div class="dash-event-row">
          <div class="dash-event-info">
            <span class="dash-event-name">${e.eventName || 'Untitled'}</span>
            <span class="dash-event-date">${e.eventDate || '-'}</span>
          </div>
          <div class="dash-event-right">
            <span class="dash-event-budget">₱${parseFloat(e.eventBudget || 0).toFixed(2)}</span>
            <span class="badge badge-info">${e.eventStatus || '-'}</span>
          </div>
        </div>
      `).join('');
    }
  }
};

window.updateReport = function() {
  const contributions = getData('contributions');
  const members = getData('members');
  const events = getData('events');
  
  const totalContributions = contributions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const totalExpenses = events
    .filter(e => e.eventStatus === 'completed')
    .reduce((sum, e) => sum + (parseFloat(e.eventBudget) || 0), 0);
  const totalFunds = totalContributions - totalExpenses;
  
  const paidMembers = new Set(contributions.filter(c => c.status === 'Paid').map(c => c.memberName));
  
  const reportTotalFunds = document.getElementById('reportTotalFunds');
  const reportTotalContributions = document.getElementById('reportTotalContributions');
  const reportTotalExpenses = document.getElementById('reportTotalExpenses');
  const reportMembersPaid = document.getElementById('reportMembersPaid');
  const reportDate = document.getElementById('reportDate');
  const reportContributionsBody = document.getElementById('reportContributionsBody');
  
  if (reportTotalFunds) reportTotalFunds.textContent = `₱${totalFunds.toFixed(2)}`;
  if (reportTotalContributions) reportTotalContributions.textContent = `₱${totalContributions.toFixed(2)}`;
  if (reportTotalExpenses) reportTotalExpenses.textContent = `₱${totalExpenses.toFixed(2)}`;
  if (reportMembersPaid) reportMembersPaid.textContent = `${paidMembers.size}/${members.length}`;
  if (reportDate) reportDate.textContent = new Date().toLocaleDateString();
  
  if (reportContributionsBody) {
    if (contributions.length === 0) {
      reportContributionsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;">No contributions recorded.</td></tr>';
    } else {
      reportContributionsBody.innerHTML = contributions.map(c => `
        <tr>
          <td>${c.memberName || 'Unknown'}</td>
          <td>₱${parseFloat(c.amount || 0).toFixed(2)}</td>
          <td>${c.date || '-'}</td>
          <td>${c.method || '-'}</td>
          <td><span class="badge badge-success">${c.status || 'Paid'}</span></td>
          <td>${c.notes || '-'}</td>
        </tr>
      `).join('');
    }
  }
};

window.generateReport = function() {
  updateReport();
  const contributions = getData('contributions');
  const members = getData('members');
  const events = getData('events');

  const totalContributions = contributions.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  const totalExpenses = events.filter(e => e.eventStatus === 'completed').reduce((s, e) => s + (parseFloat(e.eventBudget) || 0), 0);
  const totalFunds = totalContributions - totalExpenses;
  const paidMembers = new Set(contributions.filter(c => c.status === 'Paid').map(c => c.memberName));

  const rows = contributions.map(c => `
    <tr>
      <td>${c.memberName||'Unknown'}</td>
      <td>₱${parseFloat(c.amount||0).toFixed(2)}</td>
      <td>${c.date||'-'}</td>
      <td>${c.method||'-'}</td>
      <td>${c.status||'Paid'}</td>
      <td>${c.notes||'-'}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;">No contributions recorded.</td></tr>';

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { showNotification('Pop-up blocked — please allow pop-ups to print reports.', 'error'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>TREASURE — Report</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:2rem;color:#111;}
      h1{font-size:1.5rem;margin-bottom:0.25rem;}
      .meta{color:#666;font-size:0.85rem;margin-bottom:1.5rem;}
      .stats{display:flex;gap:1.5rem;margin-bottom:1.5rem;flex-wrap:wrap;}
      .stat{background:#f5f7f2;border-radius:8px;padding:1rem 1.5rem;min-width:140px;}
      .stat-label{font-size:0.75rem;text-transform:uppercase;letter-spacing:.06em;color:#555;}
      .stat-value{font-size:1.5rem;font-weight:700;color:#1a6b3c;}
      table{width:100%;border-collapse:collapse;font-size:0.875rem;}
      th{background:#1a6b3c;color:#fff;padding:.5rem .75rem;text-align:left;}
      td{padding:.5rem .75rem;border-bottom:1px solid #e5e7eb;}
      tr:nth-child(even) td{background:#f9fafb;}
      @media print{body{padding:0;}}
    </style></head><body>
    <h1>TREASURE — Class Fund Report</h1>
    <div class="meta">Generated: ${new Date().toLocaleString()}</div>
    <div class="stats">
      <div class="stat"><div class="stat-label">Total Funds</div><div class="stat-value">₱${totalFunds.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-label">Contributions</div><div class="stat-value">₱${totalContributions.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-label">Expenses</div><div class="stat-value">₱${totalExpenses.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-label">Members Paid</div><div class="stat-value">${paidMembers.size}/${members.length}</div></div>
    </div>
    <table><thead><tr><th>Name</th><th>Amount</th><th>Date</th><th>Method</th><th>Status</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <script>window.onload=()=>{window.print();}<\/script></body></html>`);
  win.document.close();
};

function addAuditEntry(type, message) {
  const auditLog = getData('auditLog');
  const currentUser = document.getElementById('currentUser')?.textContent || 'Unknown';
  const currentRole = document.getElementById('currentUserRole')?.textContent?.replace(/[()]/g, '') || 'unknown';
  
  auditLog.unshift({
    id: generateId(),
    type,
    message,
    user: currentUser,
    role: currentRole,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  });
  
  // Keep only last 100 entries
  if (auditLog.length > 100) {
    auditLog.pop();
  }
  
  setData('auditLog', auditLog);
  renderAuditTable();
}

let _currentAuditPage = 1;
const _auditPerPage = 10;

window.renderAuditTable = function() {
  // Prefer Firestore _auditCache (populated by firebaseauth.js) over localStorage
  const auditLog = (window._auditCache && window._auditCache.length > 0)
    ? window._auditCache
    : getData('auditLog');
  const tbody = document.getElementById('auditTableBody');
  const summary = document.getElementById('auditSummary');
  if (!tbody) return;
  
  const typeFilter = document.getElementById('auditTypeFilter')?.value || 'all';
  const search = document.getElementById('auditSearch')?.value.toLowerCase() || '';
  const dateFilter = document.getElementById('auditDateFilter')?.value || '';
  
  let filtered = auditLog;
  
  if (typeFilter !== 'all') {
    filtered = filtered.filter(a => a.type === typeFilter);
  }
  
  if (search) {
    filtered = filtered.filter(a => a.message.toLowerCase().includes(search) || a.user.toLowerCase().includes(search));
  }
  
  if (dateFilter) {
    filtered = filtered.filter(a => a.date === dateFilter);
  }
  
  // Summary
  if (summary) {
    const counts = { add: 0, edit: 0, delete: 0, login: 0, export: 0 };
    auditLog.forEach(a => { if (counts[a.type] !== undefined) counts[a.type]++; });
    summary.innerHTML = `
      <div class="audit-summary-item"><span class="audit-summary-label">Total:</span><span class="audit-summary-value">${auditLog.length}</span></div>
      <div class="audit-summary-item"><span class="audit-summary-label">Added:</span><span class="audit-summary-value" style="color:var(--success);">${counts.add}</span></div>
      <div class="audit-summary-item"><span class="audit-summary-label">Edited:</span><span class="audit-summary-value" style="color:var(--info);">${counts.edit}</span></div>
      <div class="audit-summary-item"><span class="audit-summary-label">Deleted:</span><span class="audit-summary-value" style="color:var(--danger);">${counts.delete}</span></div>
    `;
  }
  
  const totalPages = Math.max(1, Math.ceil(filtered.length / _auditPerPage));
  if (_currentAuditPage > totalPages) _currentAuditPage = totalPages;
  const start = (_currentAuditPage - 1) * _auditPerPage;
  const pageItems = filtered.slice(start, start + _auditPerPage);
  
  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light);">No audit records found.</td></tr>';
  } else {
    tbody.innerHTML = pageItems.map(a => `
      <tr>
        <td><i class="fas fa-${a.type === 'add' ? 'plus-circle' : a.type === 'edit' ? 'pen' : a.type === 'delete' ? 'trash' : 'info-circle'}" style="color:var(--primary);"></i></td>
        <td>${a.message}</td>
        <td>${a.user}</td>
        <td><span class="badge badge-secondary">${a.role}</span></td>
        <td>${new Date(a.timestamp).toLocaleString()}</td>
      </tr>
    `).join('');
  }
  
  // Pagination controls
  const pagination = document.getElementById('auditPagination');
  if (pagination) {
    if (totalPages <= 1) {
      pagination.innerHTML = '';
    } else {
      let html = `<button class="audit-page-btn" onclick="goToAuditPage(${_currentAuditPage - 1})" ${_currentAuditPage === 1 ? 'disabled' : ''}>‹</button>`;
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="audit-page-btn ${i === _currentAuditPage ? 'active' : ''}" onclick="goToAuditPage(${i})">${i}</button>`;
      }
      html += `<button class="audit-page-btn" onclick="goToAuditPage(${_currentAuditPage + 1})" ${_currentAuditPage === totalPages ? 'disabled' : ''}>›</button>`;
      pagination.innerHTML = html;
    }
  }
};

window.goToAuditPage = function(page) {
  if (page < 1) return;
  _currentAuditPage = page;
  renderAuditTable();
};

window.clearAuditFilters = function() {
  const tf = document.getElementById('auditTypeFilter');
  const sf = document.getElementById('auditSearch');
  const df = document.getElementById('auditDateFilter');
  if (tf) tf.value = 'all';
  if (sf) sf.value = '';
  if (df) df.value = '';
  _currentAuditPage = 1;
  renderAuditTable();
};

window.clearAuditLog = function() {
  if (!confirm('Are you sure you want to clear the audit log?')) return;
  setData('auditLog', []);
  _currentAuditPage = 1;
  renderAuditTable();
  showNotification('Audit log cleared');
};

window.qrPreviewData = null;

window.previewQr = function(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      window.qrPreviewData = e.target.result;
      const img = document.getElementById('gcashQrImage');
      if (img) img.src = window.qrPreviewData;
      const controls = document.getElementById('qrSaveControls');
      if (controls) controls.classList.add('active');
    };
    reader.readAsDataURL(input.files[0]);
  }
};

window.saveQrCode = function() {
  if (window.qrPreviewData) {
    localStorage.setItem(DATA_KEYS.qrCode, window.qrPreviewData);
    const controls = document.getElementById('qrSaveControls');
    if (controls) controls.classList.remove('active');
    showNotification('QR Code updated successfully');
    addAuditEntry('edit', 'GCash QR Code was updated');
  }
};

window.cancelQrUpload = function() {
  const savedQr = localStorage.getItem(DATA_KEYS.qrCode);
  const img = document.getElementById('gcashQrImage');
  if (savedQr && img) {
    img.src = savedQr;
  } else if (img) {
    img.src = 'https://placehold.co/280x280/f5f7f2/1a6b3c?text=No+QR+Uploaded';
  }
  const controls = document.getElementById('qrSaveControls');
  if (controls) controls.classList.remove('active');
  const input = document.getElementById('qrInput');
  if (input) input.value = '';
  window.qrPreviewData = null;
};

window.loadQrCode = function() {
  const savedQr = localStorage.getItem(DATA_KEYS.qrCode);
  const img = document.getElementById('gcashQrImage');
  if (savedQr && img) {
    img.src = savedQr;
  }
};

window.exportAllData = function() {
  const members = getData('members');
  const contributions = getData('contributions');
  const events = getData('events');
  
  let csv = 'TREASURE - Class Fund Management System\n';
  csv += 'Exported on: ' + new Date().toLocaleString() + '\n\n';
  
  csv += 'MEMBERS\n';
  csv += 'ID,Name,Contact,Status,Last Payment\n';
  members.forEach(m => {
    csv += `"${m.memberId}","${m.memberName}","${m.memberContact}","${m.status}","${m.lastPayment || ''}"\n`;
  });
  
  csv += '\nCONTRIBUTIONS\n';
  csv += 'Name,Amount,Date,Method,Status,Notes\n';
  contributions.forEach(c => {
    csv += `"${c.memberName}",${c.amount},"${c.date}","${c.method}","${c.status}","${c.notes || ''}"\n`;
  });
  
  csv += '\nEVENTS\n';
  csv += 'Name,Date,Budget,Status\n';
  events.forEach(e => {
    csv += `"${e.eventName}","${e.eventDate}",${e.eventBudget},"${e.eventStatus}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  // Use window.open so it works on iOS Safari (programmatic a.click() is blocked)
  const opened = window.open(url, '_blank');
  // Fallback for browsers that block window.open (e.g. popups disabled)
  if (!opened) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `treasure_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  
  addAuditEntry('export', 'All data was exported to CSV');
  showNotification('Data exported successfully');
};

window.openEditProfile = function() {
  // Implemented in firebaseauth.js — this is a fallback only
  if (typeof window._openEditProfileFB === 'function') { window._openEditProfileFB(); return; }
  showModal('editProfileModal');
};

window.saveProfile = function() {
  // Implemented in firebaseauth.js — this is a fallback only
  if (typeof window._saveProfileFB === 'function') { window._saveProfileFB(); return; }
  showNotification('Profile updated successfully');
  closeModal('editProfileModal');
};

document.addEventListener('DOMContentLoaded', () => {
  const _ls = document.getElementById('landingScreen');
  if (_ls) _ls.addEventListener('click', function() { if (typeof window.enterApp === 'function') window.enterApp(); });

  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (localStorage.getItem('sidebarCollapsed') === '1' && window.innerWidth > 1023) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('collapsed');
  }

  const savedFont = localStorage.getItem('fontSize');
  if (savedFont) {
    document.body.classList.add('font-' + savedFont);
  }

  if (localStorage.getItem('layout') === 'compact') {
    document.body.classList.add('layout-compact');
  }

  const savedAccent = localStorage.getItem('accentVars');
  if (savedAccent) {
    try {
      const v = JSON.parse(savedAccent);
      setAccentColor(v.name, v.primary, v.mid, v.dim, v.border);
    } catch(e) {}
  }

  if (localStorage.getItem('animations') === '0') {
    const style = document.createElement('style');
    style.id = 'no-anim-style';
    style.textContent = '*, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }';
    document.head.appendChild(style);
  }

  if (localStorage.getItem('tooltips') === '0') {
    document.body.classList.add('no-tooltips');
  }

  const savedCustomHex = localStorage.getItem('customColorHex');
  const savedAccentName = localStorage.getItem('accentColor');
  if (savedCustomHex && savedAccentName === 'custom') {
    const wheel = document.getElementById('colorWheelSwatch');
    if (wheel) wheel.style.background = savedCustomHex;
    const picker = document.getElementById('customColorPicker');
    if (picker) picker.value = savedCustomHex;
  }

  loadNavLabels();

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.querySelector('.menu-overlay');
      if (sidebar) sidebar.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('click', (e) => {
    const notifWrapper = document.getElementById('notifWrapper');
    const notifPanel = document.getElementById('notifPanel');
    if (notifWrapper && notifPanel && !notifWrapper.contains(e.target)) {
      notifPanel.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettings();
      closeTermsModal();
      document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
      });
      document.body.style.overflow = '';
    }
  });

  });


window.showLoading = function() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('active');
};

window.hideLoading = function() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.remove('active');
};