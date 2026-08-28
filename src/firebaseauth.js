/**
 * TREASURE - Class Fund Management System
 * Firebase auth, Firestore CRUD, real-time listeners
 *
 * Data architecture: /classData/{section}/{collection}
 * All users in the same section read/write the same shared documents.
 * No officer-UID lookup, no sourceUidForData, no cross-user permission issues.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  setDoc,
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  getDocs,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let _unsubs            = [];
let _recentActivities  = [];

// Shared-path helpers
// All class data lives at /classData/{section}/{col}
let currentSection = null;

function classCol(col) {
  if (!currentSection) throw new Error("classSection not set — user not initialised yet.");
  return collection(db, 'classData', currentSection, col);
}
function classDoc(col, id) {
  if (!currentSection) throw new Error("classSection not set — user not initialised yet.");
  return doc(db, 'classData', currentSection, col, id);
}

// DOM refs
const authContainer    = document.getElementById("authContainer");
const appContainer     = document.getElementById("appContainer");
const currentUserEl    = document.getElementById("currentUser");
const currentUserRoleEl = document.getElementById("currentUserRole");
const logoutBtn        = document.getElementById("logoutBtn");

// Hide both containers immediately onAuthStateChanged will reveal the correct one.
if (appContainer)  appContainer.style.display  = "none";
if (authContainer) authContainer.style.display = "none";

let currentUserData       = null;
let currentUserId         = null;
let unsubscribeFunctions  = [];

//Utility
function showMessage(message, elementId, isSuccess = false) {
  const msgDiv = document.getElementById(elementId);
  if (!msgDiv) return;
  msgDiv.innerText = message;
  msgDiv.classList.remove("show", "success");
  void msgDiv.offsetWidth;
  msgDiv.classList.add("show");
  if (isSuccess) msgDiv.classList.add("success");
  setTimeout(() => msgDiv.classList.remove("show"), 4000);
}

function getData(key) {
  const data = localStorage.getItem('treasure_' + key);
  return data ? JSON.parse(data) : [];
}

//Sign Up
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const termsCheckbox = document.getElementById("termsCheckbox");
    if (!termsCheckbox || !termsCheckbox.checked) {
      showMessage("Please agree to the Terms and Conditions to continue.", "signUpMessage");
      const wrapper = document.querySelector('.terms-checkbox-wrapper');
      if (wrapper) {
        wrapper.style.borderColor = 'var(--danger)';
        wrapper.style.background  = 'var(--danger-dim)';
        setTimeout(() => { wrapper.style.borderColor = ''; wrapper.style.background = ''; }, 2000);
      }
      return;
    }

    if (typeof showLoading === 'function') showLoading();

    const email        = document.getElementById("newEmail").value.trim();
    const password     = document.getElementById("newPassword").value;
    const confirm      = document.getElementById("confirmPasswordInput").value;
    const role         = document.getElementById("signupRole").value;
    const classSection = document.getElementById("classSectionInput").value.trim().toLowerCase();

    if (password !== confirm) {
      if (typeof hideLoading === 'function') hideLoading();
      return showMessage("Passwords do not match!", "signUpMessage");
    }
    if (password.length < 6) {
      if (typeof hideLoading === 'function') hideLoading();
      return showMessage("Password must be at least 6 characters long.", "signUpMessage");
    }

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", user.uid), {
        email, role, classSection,
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      showMessage("Account created successfully! Please sign in.", "signUpMessage", true);
      signupForm.reset();
      if (typeof showForm === "function") showForm("login");
    } catch (err) {
      console.error("Signup error:", err);
      showMessage(err.message, "signUpMessage");
    } finally {
      if (typeof hideLoading === 'function') hideLoading();
    }
  });
}

//Sign In
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (typeof showLoading === 'function') showLoading();

    const email          = document.getElementById("Email").value.trim();
    const password       = document.getElementById("passwordInput").value;
    const selectedRole   = document.getElementById("roleSelect").value;
    const enteredSection = document.getElementById("classSectionLogin").value.trim().toLowerCase();

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userSnap  = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) {
        if (typeof hideLoading === 'function') hideLoading();
        showMessage("No user data found!", "signInMessage");
        await signOut(auth);
        return;
      }

      const data = userSnap.data();

      if ((data.role || "").toLowerCase() !== (selectedRole || "").toLowerCase()) {
        if (typeof hideLoading === 'function') hideLoading();
        showMessage(`Access denied! Registered as "${data.role}".`, "signInMessage");
        await signOut(auth);
        return;
      }

      if (enteredSection && (data.classSection || "").toLowerCase() !== enteredSection.toLowerCase()) {
        if (typeof hideLoading === 'function') hideLoading();
        showMessage("Incorrect class section!", "signInMessage");
        await signOut(auth);
        return;
      }

      currentUserData = data;
      currentUserId   = user.uid;
      if (typeof hideLoading === 'function') hideLoading();
      initializeAppInterface(user, data);

    } catch (err) {
      console.error("Login error:", err);
      if (typeof hideLoading === 'function') hideLoading();
      showMessage(err.message || "Incorrect email or password", "signInMessage");
    }
  });
}

//Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    unsubscribeFunctions.forEach(unsub => { try { unsub(); } catch(e) {} });
    unsubscribeFunctions = [];
    await signOut(auth);
    resetInterface();
  });
}

//Session restore on page refresh
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUserData = null;
    currentUserId   = null;
    currentSection  = null;
    // Always clear stale data on signed-out state
    ['treasure_members','treasure_contributions','treasure_events','treasure_auditLog'].forEach(k => localStorage.removeItem(k));
    window._treasureOnEnter = function() {
      if (authContainer) { authContainer.style.display = 'flex'; authContainer.classList.add('active'); }
    };
    // Show landing screen if not yet entered, otherwise show auth directly
    const landing = document.getElementById('landingScreen');
    if (!window._treasureEntered) {
      if (landing) landing.style.display = 'flex';
    } else {
      if (landing) landing.style.display = 'none';
      if (authContainer) { authContainer.style.display = 'flex'; authContainer.classList.add('active'); }
    }
    return;
  }
  if (currentUserId === user.uid) return; // login handler already ran
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (userSnap.exists()) {
    currentUserData = userSnap.data();
    currentUserId   = user.uid;
    const landing   = document.getElementById('landingScreen');
    if (landing) landing.style.display = 'none';
    window._treasureEntered = true;
    initializeAppInterface(user, currentUserData);
  }
});

//App initialisatio
function initializeAppInterface(user, data) {
  const landing = document.getElementById("landingScreen");
  if (landing) landing.style.display = "none";
  if (authContainer) { authContainer.style.display = "none"; authContainer.classList.remove("active"); }
  if (appContainer)  { appContainer.style.display  = "flex";  appContainer.classList.add("active"); }

  const name = data.firstName ? (data.firstName + " " + (data.lastName || "")).trim() : (data.email || user.email);
  if (currentUserEl)     currentUserEl.textContent     = name;
  if (currentUserRoleEl) currentUserRoleEl.textContent = "(" + data.role + ")";
  document.body.classList.toggle("officer-visible", /officer/i.test(data.role));

  // Derive the shared section path — this replaces all sourceUidForData logic
  currentSection = (data.classSection || "").toLowerCase();

  ['treasure_members','treasure_contributions','treasure_events','treasure_auditLog'].forEach(k => localStorage.removeItem(k));

  setupDataListeners();

  // Restore last active tab (visual only — data loaded below)
  const savedTab = localStorage.getItem('activeTab') || 'dashboard';
  if (typeof window.switchTab === 'function') window.switchTab(savedTab, true);

  // Load all data once with correct section
  if (typeof window.updateDashboard   === 'function') window.updateDashboard();
  if (typeof window.loadMembers       === 'function') window.loadMembers();
  if (typeof window.loadContributions === 'function') window.loadContributions();
  if (typeof window.loadEvents        === 'function') window.loadEvents();
  if (typeof window.renderAuditTable  === 'function') window.renderAuditTable();
  if (savedTab === 'accountManagement' && typeof window.loadStudentAccounts === 'function') window.loadStudentAccounts();
  updateReport();
  loadQrCode();
  addAuditEntry('login', `User "${data.email}" logged in as ${data.role}`);
}

function resetInterface() {
  unsubscribeFunctions.forEach(unsub => { try { unsub(); } catch(e) {} });
  _unsubs.forEach(unsub => { try { unsub(); } catch(e) {} });
  unsubscribeFunctions = [];
  _unsubs = [];
  currentUserData = null;
  currentUserId   = null;
  currentSection  = null;
  localStorage.removeItem('activeTab');
  // Clear cached section data so another user/section never sees stale data
  ['treasure_members','treasure_contributions','treasure_events','treasure_auditLog'].forEach(k => localStorage.removeItem(k));

  if (appContainer)  { appContainer.style.display  = "none";  appContainer.classList.remove("active"); }
  if (authContainer) { authContainer.style.display = "flex";  authContainer.classList.add("active"); }

  const rolePicker = document.getElementById('rolePicker');
  const authForms  = document.getElementById('authForms');
  if (rolePicker) rolePicker.style.display = '';
  if (authForms)  authForms.style.display  = 'none';

  ['signInMessage', 'signUpMessage'].forEach(id => {
    const m = document.getElementById(id);
    if (m) { m.innerText = ''; m.classList.remove('show', 'success'); }
  });
  document.body.classList.remove("officer-visible");
}

// ── Real-time listeners on /classData/{section}/… ────────────────────────────
function setupDataListeners() {
  unsubscribeFunctions.forEach(unsub => { try { unsub(); } catch(e) {} });
  unsubscribeFunctions = [];

  const unsubMembers = onSnapshot(classCol('members'), (snapshot) => {
    const members = [];
    snapshot.forEach(d => members.push({ id: d.id, ...d.data() }));
    localStorage.setItem('treasure_members', JSON.stringify(members));
    if (typeof window.loadMembers     === 'function') window.loadMembers();
    if (typeof window.updateDashboard === 'function') window.updateDashboard();
  });
  unsubscribeFunctions.push(unsubMembers);

  const unsubContributions = onSnapshot(classCol('contributions'), (snapshot) => {
    const contributions = [];
    snapshot.forEach(d => contributions.push({ id: d.id, ...d.data() }));
    localStorage.setItem('treasure_contributions', JSON.stringify(contributions));
    if (typeof window.loadContributions === 'function') window.loadContributions();
    if (typeof window.updateDashboard   === 'function') window.updateDashboard();
    if (typeof window.updateReport      === 'function') window.updateReport();
  });
  unsubscribeFunctions.push(unsubContributions);

  const unsubEvents = onSnapshot(classCol('events'), (snapshot) => {
    const events = [];
    snapshot.forEach(d => events.push({ id: d.id, ...d.data() }));
    localStorage.setItem('treasure_events', JSON.stringify(events));
    if (typeof window.loadEvents      === 'function') window.loadEvents();
    if (typeof window.updateDashboard === 'function') window.updateDashboard();
    loadEventsForContribModal();
  });
  unsubscribeFunctions.push(unsubEvents);

  const unsubAudit = onSnapshot(classCol('auditLog'), (snapshot) => {
    _auditCache = [];
    snapshot.forEach(d => _auditCache.push({ id: d.id, ...d.data() }));
    _auditCache.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (typeof window.renderAuditTable === 'function') window.renderAuditTable();
  });
  unsubscribeFunctions.push(unsubAudit);
  _unsubs.push(unsubAudit);

  // QR code lives on the section root doc: /classData/{section}
  const unsubSection = onSnapshot(doc(db, 'classData', currentSection), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.gcashQr) {
        localStorage.setItem('gcashQrCode', data.gcashQr);
        const img = document.getElementById('gcashQrImage');
        if (img) img.src = data.gcashQr;
      }
    }
  });
  unsubscribeFunctions.push(unsubSection);
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────
async function saveToFirestore(collectionName, data, id = null) {
  if (!currentSection) { showNotification("Not initialised", "error"); return null; }
  try {
    if (id) {
      await updateDoc(classDoc(collectionName, id), { ...data, updatedAt: new Date().toISOString() });
      return id;
    } else {
      const ref = await addDoc(classCol(collectionName), { ...data, createdAt: new Date().toISOString() });
      return ref.id;
    }
  } catch (err) {
    console.error(`Error saving to ${collectionName}:`, err);
    showNotification(`Failed to save: ${err.message}`, "error");
    return null;
  }
}

async function deleteFromFirestore(collectionName, id) {
  if (!currentSection) { showNotification("Not initialised", "error"); return false; }
  try {
    await deleteDoc(classDoc(collectionName, id));
    return true;
  } catch (err) {
    console.error(`Error deleting from ${collectionName}:`, err);
    showNotification(`Failed to delete: ${err.message}`, "error");
    return false;
  }
}

async function addAuditEntry(type, message) {
  if (!currentSection) return;
  try {
    await addDoc(classCol('auditLog'), {
      type, message,
      user:      currentUserData?.email || 'Unknown',
      role:      currentUserData?.role  || 'unknown',
      timestamp: new Date().toISOString(),
      date:      new Date().toISOString().split('T')[0]
    });
  } catch (err) { console.error("Error adding audit entry:", err); }
}

// ── Save / Delete overrides ───────────────────────────────────────────────────
window.saveMember = async function() {
  const memberId      = document.getElementById('memberId').value.trim();
  const memberName    = document.getElementById('memberName').value.trim();
  const memberContact = document.getElementById('memberContact').value.trim();
  if (!memberId || !memberName || !memberContact) { showNotification('Please fill in all fields', 'error'); return; }
  const result = await saveToFirestore('members', { memberId, memberName, memberContact, status: 'Active', lastPayment: null }, window.editingId);
  if (result) {
    addAuditEntry(window.editingId ? 'edit' : 'add', `Member "${memberName}" was ${window.editingId ? 'updated' : 'added'}`);
    showNotification(`Member ${window.editingId ? 'updated' : 'added'} successfully`);
    closeModal('addMemberModal');
    window.editingId = null; window.editingType = null;
  }
};

window.saveContribution = async function() {
  const memberName = document.getElementById('studentSelect')?.value || '';
  const amount     = parseFloat(document.getElementById('amount').value);
  const date       = document.getElementById('paymentDate').value;
  const method     = document.getElementById('paymentMethod').value;
  const notes      = document.getElementById('notes')?.value || '';
  if (!memberName || !amount || !date || !method) { showNotification('Please fill in all required fields', 'error'); return; }
  const result = await saveToFirestore('contributions', { memberName, amount, date, method, notes, status: 'Paid' }, window.editingId);
  if (result) {
    addAuditEntry(window.editingId ? 'edit' : 'add', `Contribution of ₱${amount.toFixed(2)} for "${memberName}" was ${window.editingId ? 'updated' : 'added'}`);
    showNotification(`Contribution ${window.editingId ? 'updated' : 'added'} successfully`);
    closeModal('addContributionModal');
    window.editingId = null; window.editingType = null;
  }
};

window.saveEvent = async function() {
  const eventName   = document.getElementById('eventName').value.trim();
  const eventDate   = document.getElementById('eventDate').value;
  const eventBudget = parseFloat(document.getElementById('eventBudget').value);
  const eventStatus = document.getElementById('eventStatus').value;
  if (!eventName || !eventDate || isNaN(eventBudget)) { showNotification('Please fill in all required fields', 'error'); return; }
  const result = await saveToFirestore('events', { eventName, eventDate, eventBudget, eventStatus }, window.editingId);
  if (result) {
    addAuditEntry(window.editingId ? 'edit' : 'add', `Event "${eventName}" was ${window.editingId ? 'updated' : 'added'}`);
    showNotification(`Event ${window.editingId ? 'updated' : 'added'} successfully`);
    closeModal('addEventModal');
    window.editingId = null; window.editingType = null;
  }
};

window.deleteMember = async function(id) {
  if (!confirm('Are you sure you want to delete this member?')) return;
  const member  = getData('members').find(m => m.id === id);
  const success = await deleteFromFirestore('members', id);
  if (success) { addAuditEntry('delete', `Member "${member?.memberName || 'Unknown'}" was deleted`); showNotification('Member deleted successfully'); }
};

window.deleteContribution = async function(id) {
  if (!confirm('Are you sure you want to delete this contribution?')) return;
  const contribution = getData('contributions').find(c => c.id === id);
  const success      = await deleteFromFirestore('contributions', id);
  if (success) { addAuditEntry('delete', `Contribution for "${contribution?.memberName || 'Unknown'}" was deleted`); showNotification('Contribution deleted successfully'); }
};

window.deleteEvent = async function(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  const event   = getData('events').find(e => e.id === id);
  const success = await deleteFromFirestore('events', id);
  if (success) { addAuditEntry('delete', `Event "${event?.eventName || 'Unknown'}" was deleted`); showNotification('Event deleted successfully'); }
};

window.clearAuditLog = async function() {
  if (!confirm('Are you sure you want to clear the audit log?')) return;
  if (!currentSection) return;
  try {
    const snapshot  = await getDocs(classCol('auditLog'));
    await Promise.all(snapshot.docs.map(d => deleteDoc(classDoc('auditLog', d.id))));
    showNotification('Audit log cleared');
  } catch (err) { showNotification('Failed to clear audit log', 'error'); }
};

// ── Member select for contribution modal ──────────────────────────────────────
async function loadMembers() {
  if (!currentSection) return;
  try {
    const snapshot = await getDocs(classCol('members'));
    const select   = document.getElementById("studentSelect") || document.getElementById("memberSelect");
    if (!select) return;
    select.innerHTML = '<option value="">Select Student</option>';
    snapshot.forEach((docSnap) => {
      const m   = docSnap.data();
      const opt = document.createElement("option");
      opt.value       = m.memberName || "Unnamed";
      opt.textContent = m.memberName || "Unnamed";
      select.appendChild(opt);
    });
  } catch (err) { console.error("Error loading members:", err); }
}

// ── Event dropdown for contribution modal ─────────────────────────────────────
async function loadEventsForContribModal() {
  const sel = document.getElementById('contributionEventLink');
  if (!sel || !currentSection) return;
  try {
    const snap = await getDocs(classCol('events'));
    sel.innerHTML  = '<option value="">No event linked</option>';
    const events   = [];
    snap.forEach(d => events.push({ id: d.id, ...d.data() }));
    events.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    events.forEach(e => {
      const budget    = parseFloat(e.eventBudget    || 0);
      const collected = parseFloat(e.eventBudgetPaid || 0);
      const remaining = Math.max(0, budget - collected);
      const pct       = budget > 0 ? Math.round((collected / budget) * 100) : 0;
      const opt       = document.createElement('option');
      opt.value             = e.id;
      opt.dataset.name      = e.eventName || '';
      opt.dataset.budget    = budget;
      opt.dataset.collected = collected;
      opt.textContent       = `${e.eventName}${e.eventStatus ? ` [${e.eventStatus}]` : ''} — ₱${remaining.toFixed(2)} remaining (${pct}% funded)`;
      sel.appendChild(opt);
    });
  } catch(err) { console.error('Error loading events for modal:', err); }
}
window.loadEventsForContribModal = loadEventsForContribModal;

// ── Refresh student dropdown directly from Firestore (prevents cross-section bleed) ──
async function _refreshStudentSelect() {
  const select = document.getElementById('studentSelect');
  if (!select || !currentSection) return;
  try {
    const snapshot = await getDocs(classCol('members'));
    const current  = select.value; // preserve selection when editing
    select.innerHTML = '<option value="">Select Student</option>';
    const members = [];
    snapshot.forEach(d => members.push({ id: d.id, ...d.data() }));
    members.sort((a, b) => (a.memberName || '').localeCompare(b.memberName || ''));
    members.forEach(m => {
      const opt = document.createElement('option');
      opt.value       = m.memberName || '';
      opt.textContent = m.memberName || 'Unnamed';
      select.appendChild(opt);
    });
    if (current) select.value = current;
  } catch (err) { console.error('Error refreshing student select:', err); }
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function showModal(id, isEdit = false) {
  const modal = document.getElementById(id);
  if (!modal) return;
  const form  = modal.querySelector("form");
  if (!isEdit && form) form.reset();
  const title = modal.querySelector(".modal-header h2");
  if (title) {
    if (id === "addContributionModal") {
      title.innerHTML = isEdit ? "<i class=\"fas fa-edit\"></i> Edit Contribution" : "<i class=\"fas fa-money-bill-wave\"></i> Add Contribution";
      // Reload the event dropdown every time the contribution modal opens
      loadEventsForContribModal();
      // Always repopulate student dropdown from current section's Firestore data
      _refreshStudentSelect();
    }
    if (id === "addMemberModal")       title.innerHTML = isEdit ? "<i class=\"fas fa-user-edit\"></i> Edit Member" : "<i class=\"fas fa-user-plus\"></i> Add Member";
    if (id === "addEventModal")        title.innerHTML = isEdit ? "<i class=\"fas fa-edit\"></i> Edit Event" : "<i class=\"fas fa-calendar-plus\"></i> Add Event";
  }
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "";
  if (id === "addMemberModal")       _setBtnMode("saveMemberBtn",       "Save", "add", _addMemberHandler);
  if (id === "addContributionModal") _setBtnMode("saveContributionBtn", "Save", "add", _addContributionHandler);
  if (id === "addEventModal")        _setBtnMode("saveEventBtn",        "Save", "add", _addEventHandler);
}
window.showModal  = showModal;
window.closeModal = closeModal;

function _setBtnMode(btnId, label, mode, handlerFn) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.textContent = label; btn.dataset.mode = mode; btn._handler = handlerFn;
}
function _attachSingleHandler(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn || btn._bound) return;
  btn._bound = true;
  btn.addEventListener("click", async (e) => { e.preventDefault(); if (typeof btn._handler === "function") await btn._handler(); });
}
function setUpdateButton(btn, callback) { btn.textContent = "Update"; btn.dataset.mode = "edit"; btn._handler = callback; }

// ── Add / edit handlers ───────────────────────────────────────────────────────
async function _addMemberHandler() {
  const user = auth.currentUser;
  if (!user) return showNotification("Please log in first.", "error");
  const memberId      = document.getElementById("memberId").value.trim();
  const memberName    = document.getElementById("memberName").value.trim();
  const memberContact = document.getElementById("memberContact").value.trim();
  if (!memberId || !memberName || !memberContact) return showNotification("Please fill out all required fields.", "error");
  try {
    if (window.editingId) {
      await updateDoc(classDoc('members', window.editingId), { memberId, memberName, memberContact, updatedAt: new Date().toISOString() });
      showNotification("Member updated successfully");
      if (typeof logActivity === 'function') logActivity('edit', `Member "${memberName}" was updated.`);
    } else {
      await addDoc(classCol('members'), { memberId, memberName, memberContact, status: "Active", lastPayment: null, createdAt: new Date().toISOString() });
      showNotification("Member added successfully");
      if (typeof logActivity === 'function') logActivity('add', `Member "${memberName}" was added.`);
    }
    window.editingId = null; window.editingType = null;
    closeModal("addMemberModal");
    if (typeof window.updateMemberSelect === "function") window.updateMemberSelect();
  } catch (err) { showNotification("Error saving member: " + err.message, "error"); }
}

async function _addContributionHandler() {
  const user = auth.currentUser;
  if (!user) return showNotification("Please log in first.", "error");
  const studentName    = document.getElementById("studentSelect").value.trim();
  const amount         = parseFloat(document.getElementById("amount").value);
  const date           = document.getElementById("paymentDate").value;
  const method         = document.getElementById("paymentMethod").value;
  const noteText       = document.getElementById("notes").value.trim();
  const eventSel       = document.getElementById("contributionEventLink");
  const linkedEventId  = eventSel ? eventSel.value : '';
  const linkedEventName = linkedEventId && eventSel.selectedOptions[0] ? eventSel.selectedOptions[0].dataset.name || '' : '';
  if (!studentName || !amount || !date || !method) return showNotification("Please fill out all required fields.", "error");
  try {
    if (window.editingId) {
      await updateDoc(classDoc('contributions', window.editingId), {
        memberName: studentName, amount, date, method, notes: noteText,
        linkedEventId: linkedEventId || null, linkedEventName: linkedEventName || null,
        updatedAt: new Date().toISOString(),
      });
      showNotification("Contribution updated successfully");
      if (typeof logActivity === 'function') logActivity('edit', `Contribution for "${studentName}" was updated.`);
    } else {
      await addDoc(classCol('contributions'), {
        memberName: studentName, amount, date, method, notes: noteText, status: "Paid",
        linkedEventId: linkedEventId || null, linkedEventName: linkedEventName || null,
        createdAt: new Date().toISOString(),
      });
      if (linkedEventId) await _creditEventPayment(linkedEventId, linkedEventName, amount, studentName);
      showNotification("Contribution added successfully" + (linkedEventId ? ` & applied to "${linkedEventName}"` : ''));
      if (typeof logActivity === 'function') logActivity('add', `Contribution of ₱${amount.toFixed(2)} added for "${studentName}"${linkedEventId ? ` → ${linkedEventName}` : ''}.`);
    }
    window.editingId = null; window.editingType = null;
    closeModal("addContributionModal");
  } catch (err) { showNotification("Error saving contribution: " + err.message, "error"); }
}

async function _creditEventPayment(eventId, eventName, amount) {
  try {
    const eventRef  = classDoc('events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) return;
    const eventData = eventSnap.data();
    const budget    = parseFloat(eventData.eventBudget    || 0);
    const paid      = parseFloat(eventData.eventBudgetPaid || 0);
    const newPaid   = Math.min(paid + amount, budget);
    const updates   = { eventBudgetPaid: newPaid, updatedAt: new Date().toISOString() };
    if (newPaid >= budget && eventData.eventStatus !== 'completed') updates.eventStatus = 'confirmed';
    await updateDoc(eventRef, updates);
  } catch(err) { console.warn('Could not update event payment:', err.message); }
}

async function _addEventHandler() {
  const user = auth.currentUser;
  if (!user) return showNotification("Please log in first.", "error");
  const eventName   = document.getElementById("eventName").value.trim();
  const eventDate   = document.getElementById("eventDate").value;
  const eventBudget = parseFloat(document.getElementById("eventBudget").value);
  const eventStatus = document.getElementById("eventStatus").value;
  if (!eventName || !eventDate || isNaN(eventBudget) || !eventStatus) return showNotification("Please fill out all required fields.", "error");
  try {
    if (window.editingId) {
      await updateDoc(classDoc('events', window.editingId), { eventName, eventDate, eventBudget, eventStatus, updatedAt: new Date().toISOString() });
      showNotification("Event updated successfully");
      if (typeof logActivity === 'function') logActivity('edit', `Event "${eventName}" was updated.`);
    } else {
      await addDoc(classCol('events'), { eventName, eventDate, eventBudget, eventStatus, createdAt: new Date().toISOString() });
      showNotification("Event added successfully");
      if (typeof logActivity === 'function') logActivity('add', `Event "${eventName}" was added.`);
    }
    window.editingId = null; window.editingType = null;
    closeModal("addEventModal");
  } catch (err) { showNotification("Error saving event: " + err.message, "error"); }
}

_attachSingleHandler("saveMemberBtn");
_attachSingleHandler("saveContributionBtn");
_attachSingleHandler("saveEventBtn");
_setBtnMode("saveMemberBtn",       "Save", "add", _addMemberHandler);
_setBtnMode("saveContributionBtn", "Save", "add", _addContributionHandler);
_setBtnMode("saveEventBtn",        "Save", "add", _addEventHandler);

// ── Reports ───────────────────────────────────────────────────────────────────
async function updateReport() {
  try {
    if (!auth.currentUser || !currentSection) return;
    const rTF  = document.getElementById("reportTotalFunds");
    const rTC  = document.getElementById("reportTotalContributions");
    const rTE  = document.getElementById("reportTotalExpenses");
    const rMP  = document.getElementById("reportMembersPaid");
    const rBody = document.getElementById("reportContributionsBody") || document.getElementById("reportContributionsTable")?.querySelector("tbody");
    if (!rBody) return;
    rBody.innerHTML = "";

    const [contribSnap, membersSnap, eventsSnap] = await Promise.all([
      getDocs(classCol('contributions')),
      getDocs(classCol('members')),
      getDocs(classCol('events')),
    ]);

    let totalContributions = 0, totalExpenses = 0, membersPaidCount = 0;
    contribSnap.forEach((docSnap) => {
      const c = docSnap.data(); const amount = parseFloat(c.amount || 0);
      totalContributions += amount;
      if ((c.status || "").toLowerCase() === "paid") membersPaidCount++;
      const row = document.createElement("tr");
      row.innerHTML = `<td>${c.memberName||"Unnamed"}</td><td>₱${amount.toFixed(2)}</td><td>${c.date||""}</td><td>${c.method||""}</td><td>${c.status||""}</td>`;
      rBody.appendChild(row);
    });
    eventsSnap.forEach((docSnap) => {
      const e = docSnap.data();
      if ((e.eventStatus || "").toLowerCase() === "completed") totalExpenses += parseFloat(e.eventBudget || 0);
    });
    if (rTF)  rTF.textContent  = `₱${(totalContributions - totalExpenses).toFixed(2)}`;
    if (rTC)  rTC.textContent  = `₱${totalContributions.toFixed(2)}`;
    if (rTE)  rTE.textContent  = `₱${totalExpenses.toFixed(2)}`;
    if (rMP)  rMP.textContent  = `${membersPaidCount}/${membersSnap.size}`;
    const rd = document.getElementById("reportDate"); if (rd) rd.textContent = new Date().toLocaleDateString();
  } catch (err) { console.error("Error updating report:", err); }
}

window.generateReport = async function(e) {
  const btn = (e && e.target) || document.querySelector('[onclick*="generateReport"]') || {};
  const orig = btn.innerHTML;
  if (btn.innerHTML !== undefined) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...'; btn.disabled = true; }
  try {
    await updateReport();
    const rd = document.getElementById("reportDate");
    if (rd) rd.textContent = new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' });
    const reportEl = document.getElementById("reportContent");
    if (!reportEl) { window.print(); return; }
    const printWin = window.open('', '_blank', 'width=900,height=700');
    printWin.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TREASURE — Financial Report</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;background:#fff;padding:2rem;}h2{font-size:1.5rem;font-weight:700;margin-bottom:.25rem;color:#1a6b3c;}p{color:#444;margin-bottom:.25rem;font-size:.85rem;}.report-header{text-align:center;margin-bottom:1.5rem;border-bottom:2px solid #1a6b3c;padding-bottom:1rem;}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;}.stat-box{border:1px solid #d6ddd0;border-radius:8px;padding:.875rem;text-align:center;}.stat-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:#4c5e54;margin-bottom:.25rem;}.stat-value{font-size:1.25rem;font-weight:700;color:#1a6b3c;}table{width:100%;border-collapse:collapse;margin-top:.5rem;}th{background:#1a6b3c;color:#fff;padding:.5rem .75rem;text-align:left;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;}td{padding:.5rem .75rem;border-bottom:1px solid #e8ede4;font-size:.85rem;}tr:nth-child(even) td{background:#f5f7f2;}.section-title{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#1a6b3c;margin:1.25rem 0 .5rem;}.footer{text-align:center;margin-top:2rem;padding-top:1rem;border-top:1px solid #d6ddd0;font-size:.75rem;color:#4c5e54;}@media print{body{padding:1rem;}}</style></head><body>
<div class="report-header"><h2>Class Fund Financial Report</h2><p>Generated on: ${document.getElementById("reportDate")?.textContent||new Date().toLocaleDateString()}</p><p>Report Period: ${document.getElementById("reportPeriodText")?.textContent||"Current Month"}</p></div>
<div class="stats-grid">
<div class="stat-box"><div class="stat-label">Total Funds</div><div class="stat-value">${document.getElementById("reportTotalFunds")?.textContent||"₱0.00"}</div></div>
<div class="stat-box"><div class="stat-label">Total Contributions</div><div class="stat-value">${document.getElementById("reportTotalContributions")?.textContent||"₱0.00"}</div></div>
<div class="stat-box"><div class="stat-label">Total Expenses</div><div class="stat-value">${document.getElementById("reportTotalExpenses")?.textContent||"₱0.00"}</div></div>
<div class="stat-box"><div class="stat-label">Members Paid</div><div class="stat-value">${document.getElementById("reportMembersPaid")?.textContent||"0/0"}</div></div>
</div>
<div class="section-title">Contributions Summary</div>
<table><thead><tr><th>Name</th><th>Amount</th><th>Date</th><th>Method</th><th>Status</th></tr></thead>
<tbody>${document.getElementById("reportContributionsBody")?.innerHTML||"<tr><td colspan='5' style='text-align:center;color:#888;padding:1rem;'>No contributions</td></tr>"}</tbody></table>
<div class="footer">Generated by TREASURE — Class Fund Management System</div>
</body></html>`);
    printWin.document.close(); printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 800);
  } finally { if (btn.innerHTML !== undefined) { btn.innerHTML = orig; btn.disabled = false; } }
};

// ── Loading overlay ───────────────────────────────────────────────────────────
function showLoading() { const o = document.getElementById("loadingOverlay"); if (o) o.classList.add("active"); }
function hideLoading() { const o = document.getElementById("loadingOverlay"); if (o) o.classList.remove("active"); }
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// ── QR Code — stored on /classData/{section} root doc ────────────────────────
window.previewQr = function(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('gcashQrImage').src = e.target.result;
      const c = document.getElementById('qrSaveControls'); if(c) c.style.display = 'flex';
    };
    reader.readAsDataURL(input.files[0]);
  }
};

window.cancelQrUpload = function() {
  const c = document.getElementById('qrSaveControls'); if(c) c.style.display = 'none';
  document.getElementById('qrInput').value = "";
  loadQrCode();
};

window.saveQrCode = async function() {
  const user = auth.currentUser;
  if (!user || !currentSection) return showNotification("You must be logged in.", "error");
  const imgElement = document.getElementById('gcashQrImage');
  const fileInput  = document.getElementById('qrInput');
  if (fileInput.files.length === 0) return showNotification("No file selected.", "error");
  const maxWidth = 500;
  const canvas   = document.createElement("canvas");
  const ctx      = canvas.getContext("2d");
  const img      = new Image();
  img.src        = imgElement.src;
  img.onload     = async function() {
    const ratio   = maxWidth / img.width;
    canvas.width  = maxWidth;
    canvas.height = img.height * ratio;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const compressed = canvas.toDataURL("image/jpeg", 0.7);
    try {
      // QR is stored on the shared section doc, not a user doc
      await setDoc(doc(db, 'classData', currentSection), { gcashQr: compressed, updatedAt: new Date().toISOString() }, { merge: true });
      showNotification("GCash QR Code updated successfully");
      const c = document.getElementById('qrSaveControls'); if(c) c.style.display = 'none';
    } catch (err) {
      console.error("Error saving QR:", err);
      showNotification("Failed to save QR. The image might be too large.", "error");
    }
  };
};

async function loadQrCode() {
  if (!currentSection) return;
  try {
    const docSnap = await getDoc(doc(db, 'classData', currentSection));
    const imgEl   = document.getElementById('gcashQrImage');
    if (!imgEl) return;
    imgEl.src = docSnap.exists() && docSnap.data().gcashQr
      ? docSnap.data().gcashQr
      : "https://placehold.co/280x280/f5f7f2/1a6b3c?text=No+QR+Uploaded";
  } catch (err) { console.error("Error loading QR code:", err); }
}
window.loadQrCode = loadQrCode;

// ── Export ────────────────────────────────────────────────────────────────────
window.exportAllData = async function() {
  if (!auth.currentUser || !currentSection) return showNotification('Please log in first.', "error");
  try {
    showLoading();
    const [contribSnap, membersSnap, eventsSnap] = await Promise.all([
      getDocs(classCol('contributions')),
      getDocs(classCol('members')),
      getDocs(classCol('events')),
    ]);
    let csv = 'CONTRIBUTIONS\r\nName,Amount,Date,Method,Status,Notes\r\n';
    contribSnap.forEach(d => { const c = d.data(); csv += `"${c.memberName||''}","${c.amount||0}","${c.date||''}","${c.method||''}","${c.status||''}","${c.notes||''}"\r\n`; });
    csv += '\r\nMEMBERS\r\nID,Name,Contact,Status,Last Payment\r\n';
    membersSnap.forEach(d => { const m = d.data(); csv += `"${m.memberId||''}","${m.memberName||''}","${m.memberContact||''}","${m.status||''}","${m.lastPayment||''}"\r\n`; });
    csv += '\r\nEVENTS\r\nName,Date,Budget,Status\r\n';
    eventsSnap.forEach(d => { const e = d.data(); csv += `"${e.eventName||''}","${e.eventDate||''}","${e.eventBudget||0}","${e.eventStatus||''}"\r\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `TREASURE_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logActivity('export', 'All data exported as CSV.');
  } catch (err) { showNotification('Export failed: ' + err.message, "error"); }
  finally { hideLoading(); }
};

// ── Profile ───────────────────────────────────────────────────────────────────
window.openEditProfile = async function() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    const d    = snap.exists() ? snap.data() : {};
    document.getElementById('editFirstName').value = d.firstName || '';
    document.getElementById('editLastName').value  = d.lastName  || '';
    document.getElementById('editEmail').value     = d.email || user.email || '';
    showModal('editProfileModal');
  } catch (err) { showNotification('Could not load profile: ' + err.message, "error"); }
};

window.saveProfile = async function() {
  const user = auth.currentUser;
  if (!user) return;
  const firstName = document.getElementById('editFirstName').value.trim();
  const lastName  = document.getElementById('editLastName').value.trim();
  try {
    const snap        = await getDoc(doc(db, 'users', user.uid));
    const currentData = snap.exists() ? snap.data() : {};
    await updateDoc(doc(db, 'users', user.uid), { firstName, lastName, updatedAt: new Date().toISOString() });
    const nameDisplay = firstName ? `${firstName} ${lastName}`.trim() : (currentData.email || user.email);
    const userEl      = document.getElementById('currentUser');      if (userEl) userEl.textContent = nameDisplay;
    const roleEl      = document.getElementById('currentUserRole'); if (roleEl) roleEl.textContent = `(${currentData.role || 'student'})`;
    showNotification('Profile updated successfully!');
    logActivity('edit', 'Profile information was updated.');
    closeModal('editProfileModal');
  } catch (err) { showNotification('Failed to save profile: ' + err.message, 'error'); }
};

// ── Account management (officer only) ────────────────────────────────────────
window.loadStudentAccounts = async function() {
  if (!currentUserData || !/officer/i.test(currentUserData.role)) return;
  const tableBody = document.getElementById("studentAccountsTable");
  if (!tableBody) return;
  try {
    const q        = query(collection(db, "users"), where("classSection", "==", currentUserData.classSection));
    const snapshot = await getDocs(q);
    tableBody.innerHTML = "";
    let foundAny = false;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (docSnap.id === currentUserId) return;
      foundAny = true;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.email}</td>
        <td><span class="badge ${data.role === 'classofficer' ? 'badge-primary' : 'badge-secondary'}">${data.role}</span></td>
        <td>${data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'}</td>
        <td style="text-align:right;"><div class="action-btns">
          <button class="btn btn-danger btn-sm" onclick="deleteUserAccount('${docSnap.id}')"><i class="fas fa-trash"></i></button>
        </div></td>`;
      tableBody.appendChild(tr);
    });
    if (!foundAny) tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1.5rem;">No other users found in ${currentUserData.classSection}</td></tr>`;
  } catch (err) { console.error("Error loading student accounts:", err); }
};

window.deleteUserAccount = async function(userId) {
  if (!confirm("Are you sure you want to delete this account?")) return;
  try {
    await deleteDoc(doc(db, "users", userId));
    showNotification("Account removed successfully");
    window.loadStudentAccounts();
  } catch (err) { showNotification("Failed to delete account: " + err.message, "error"); }
};

// ── Notifications ─────────────────────────────────────────────────────────────
window.showNotification = function(message, type = 'success') {
  const icon = type === 'error' ? 'circle-xmark' : type === 'success' ? 'circle-check' : 'circle-info';
  const n    = document.createElement('div');
  n.className = 'notification' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
  n.innerHTML = `<i class="fas fa-${icon} notif-icon"></i><span class="notif-msg">${message}</span>
    <button class="notif-close" onclick="this.closest('.notification').remove(); window._repositionNotifs && window._repositionNotifs();" aria-label="Close"><i class="fas fa-xmark"></i></button>`;
  document.body.appendChild(n);
  window._repositionNotifs && window._repositionNotifs();
  const timer = setTimeout(() => { n.style.animation = 'slideOutRight 0.3s ease forwards'; setTimeout(() => { n.remove(); window._repositionNotifs && window._repositionNotifs(); }, 300); }, 4000);
  n.querySelector('.notif-close').addEventListener('click', () => clearTimeout(timer));
};

window._repositionNotifs = function() {
  const notifs = Array.from(document.querySelectorAll('.notification'));
  let bottom = 1.5;
  notifs.reverse().forEach(n => { n.style.bottom = bottom + 'rem'; n.style.top = 'auto'; bottom += (n.offsetHeight / 16) + 0.5; });
};

// ── In-app notification panel ─────────────────────────────────────────────────
let _appNotifications = [];
window.toggleNotifPanel = function() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  const isOpening = !panel.classList.contains('active');
  panel.classList.toggle('active');
  if (isOpening) _renderNotifications();
};
window.addAppNotification = function(message, type = 'info') {
  const iconMap = { info: 'fa-bell', success: 'fa-check-circle', warn: 'fa-exclamation-triangle', error: 'fa-times-circle' };
  _appNotifications.unshift({ id: Date.now(), message, type, icon: iconMap[type] || 'fa-bell', time: new Date(), unread: true });
  _renderNotifications();
  if (typeof showNotification === 'function') showNotification(message, type === 'error' ? 'error' : 'success');
};
function _renderNotifications() {
  const list = document.getElementById('notifList'); const badge = document.getElementById('notifBadge');
  if (!list) return;
  const unreadCount = _appNotifications.filter(n => n.unread).length;
  if (badge) { badge.textContent = unreadCount; badge.style.display = unreadCount > 0 ? 'flex' : 'none'; }
  if (_appNotifications.length === 0) { list.innerHTML = '<div class="notif-empty">No notifications yet</div>'; return; }
  list.innerHTML = _appNotifications.slice(0, 20).map(n => `
    <div class="notif-item ${n.unread?'unread':''}" onclick="markNotifRead(${n.id})" style="display:flex;align-items:flex-start;gap:.75rem;padding:.75rem;border-radius:var(--radius-md);cursor:pointer;transition:background .15s;${n.unread?'background:var(--primary-dim);':''}">
      <div style="width:32px;height:32px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;background:${n.type==='warn'?'var(--warning-dim)':n.type==='success'?'var(--success-dim)':'var(--info-dim)'};color:${n.type==='warn'?'var(--warning)':n.type==='success'?'var(--success)':'var(--info)'};flex-shrink:0;"><i class="fas ${n.icon}"></i></div>
      <div style="flex:1;"><div style="font-size:.875rem;font-weight:500;">${n.message}</div><div style="font-size:.75rem;color:var(--text-light);margin-top:.25rem;">${_timeAgo(n.time)}</div></div>
    </div>`).join('');
}
window.markNotifRead       = function(id) { const n = _appNotifications.find(x => x.id===id); if(n){n.unread=false;_renderNotifications();} };
window.clearAllNotifications = function() { _appNotifications = []; _renderNotifications(); };
function _timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

// ── Activity log ──────────────────────────────────────────────────────────────
function _renderActivityList() {
  const list = document.getElementById('activityList');
  if (!list) return;
  if (_recentActivities.length === 0) { list.innerHTML = '<div class="activity-empty">No recent activity.</div>'; return; }
  const iconMap = { add:'fa-plus', edit:'fa-pen', delete:'fa-trash-alt', login:'fa-sign-in-alt', export:'fa-file-export' };
  list.innerHTML = _recentActivities.slice(0,20).map(a => {
    const diff = Math.floor((Date.now()-a.time)/1000);
    const t = diff<60?'Just now':diff<3600?`${Math.floor(diff/60)}m ago`:diff<86400?`${Math.floor(diff/3600)}h ago`:new Date(a.time).toLocaleDateString();
    return `<div class="activity-item"><div class="activity-icon ${a.type}"><i class="fas ${iconMap[a.type]||'fa-circle'}"></i></div><div class="activity-content"><div class="activity-text">${a.message}</div><div class="activity-time">${t}</div></div></div>`;
  }).join('');
}
window.clearActivityLog = function() { _recentActivities = []; _renderActivityList(); };
window.logActivity = function(type, message) {
  writeAuditEntry(type, message);
  if (typeof window.addAppNotification === 'function') window.addAppNotification(message, type==='delete'?'warn':type==='edit'?'info':'success');
  _recentActivities.unshift({ type, message, time: Date.now() });
  _renderActivityList();
};

// ── Audit log ─────────────────────────────────────────────────────────────────
let _auditCache = [];
let _auditPage  = 1;
const AUDIT_PER_PAGE = 15;

async function writeAuditEntry(type, message) {
  if (!currentSection) return;
  try {
    const performedBy   = document.getElementById('currentUser')?.textContent || (auth.currentUser?.email || 'Unknown');
    const performedRole = document.getElementById('currentUserRole')?.textContent?.replace(/[()]/g,'').trim() || 'unknown';
    await addDoc(classCol('auditLog'), { type, message, performedBy, performedRole, timestamp: new Date().toISOString() });
  } catch (err) { console.warn('Audit write failed:', err.message); }
}

window.renderAuditTable = function() {
  const typeFilter = document.getElementById('auditTypeFilter')?.value || 'all';
  const searchVal  = (document.getElementById('auditSearch')?.value  || '').toLowerCase();
  const dateFilter = document.getElementById('auditDateFilter')?.value || '';
  let filtered = _auditCache.filter(a => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (searchVal && !a.message?.toLowerCase().includes(searchVal) && !a.performedBy?.toLowerCase().includes(searchVal)) return false;
    if (dateFilter && (a.timestamp ? a.timestamp.slice(0,10) : '') !== dateFilter) return false;
    return true;
  });
  const counts = { add:0, edit:0, delete:0, login:0, export:0 };
  _auditCache.forEach(a => { if (counts[a.type] !== undefined) counts[a.type]++; });
  const summaryEl = document.getElementById('auditSummary');
  if (summaryEl) summaryEl.innerHTML = `
    <div class="audit-summary-item"><span class="audit-summary-label">Total:</span><span class="audit-summary-value">${_auditCache.length}</span></div>
    <div class="audit-summary-item"><span class="audit-summary-label">Added:</span><span class="audit-summary-value" style="color:var(--success);">${counts.add}</span></div>
    <div class="audit-summary-item"><span class="audit-summary-label">Edited:</span><span class="audit-summary-value" style="color:var(--info);">${counts.edit}</span></div>
    <div class="audit-summary-item"><span class="audit-summary-label">Deleted:</span><span class="audit-summary-value" style="color:var(--danger);">${counts.delete}</span></div>
    <div class="audit-summary-item"><span class="audit-summary-label">Logins:</span><span class="audit-summary-value" style="color:var(--primary);">${counts.login}</span></div>`;
  const totalPages = Math.max(1, Math.ceil(filtered.length / AUDIT_PER_PAGE));
  if (_auditPage > totalPages) _auditPage = totalPages;
  const pageItems = filtered.slice((_auditPage-1)*AUDIT_PER_PAGE, _auditPage*AUDIT_PER_PAGE);
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;
  const iconMap  = { add:'fa-plus-circle', edit:'fa-pen', delete:'fa-trash', login:'fa-sign-in-alt', export:'fa-file-export', info:'fa-info-circle' };
  const labelMap = { add:'Added', edit:'Edited', delete:'Deleted', login:'Login', export:'Export', info:'Info' };
  tbody.innerHTML = pageItems.length === 0
    ? `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light);"><i class="fas fa-clipboard-list" style="font-size:2rem;display:block;margin-bottom:.5rem;opacity:.3;"></i>No audit entries found.</td></tr>`
    : pageItems.map(a => {
        const t = a.type || 'info';
        return `<tr>
          <td><i class="fas ${iconMap[t]||'fa-circle'}" style="color:var(--primary);"></i></td>
          <td>${a.message||'—'}</td>
          <td style="font-size:.83rem;color:var(--text-light);">${a.performedBy||'—'}</td>
          <td><span class="badge badge-${t==='add'?'success':t==='edit'?'info':t==='delete'?'danger':'secondary'}">${labelMap[t]||t}</span></td>
          <td style="font-size:.78rem;color:var(--text-light);white-space:nowrap;">${a.timestamp?new Date(a.timestamp).toLocaleString():'—'}</td></tr>`;
      }).join('');
  const pagEl = document.getElementById('auditPagination');
  if (pagEl) {
    if (totalPages <= 1) { pagEl.innerHTML = ''; return; }
    let html = `<button class="audit-page-btn" onclick="auditGoPage(${_auditPage-1})" ${_auditPage===1?'disabled':''}>‹</button>`;
    for (let p=1; p<=totalPages; p++) {
      if (totalPages>7 && p>2 && p<totalPages-1 && Math.abs(p-_auditPage)>1) { if(p===3||p===totalPages-2) html+=`<span style="padding:.25rem;color:var(--text-light);">…</span>`; continue; }
      html += `<button class="audit-page-btn ${p===_auditPage?'active':''}" onclick="auditGoPage(${p})">${p}</button>`;
    }
    html += `<button class="audit-page-btn" onclick="auditGoPage(${_auditPage+1})" ${_auditPage===totalPages?'disabled':''}>›</button>`;
    pagEl.innerHTML = html;
  }
};

window.auditGoPage = function(p) { _auditPage = p; window.renderAuditTable(); document.getElementById('auditLog')?.scrollIntoView({behavior:'smooth',block:'start'}); };
window.clearAuditFilters = function() {
  const tf=document.getElementById('auditTypeFilter'); if(tf) tf.value='all';
  const sf=document.getElementById('auditSearch');     if(sf) sf.value='';
  const df=document.getElementById('auditDateFilter'); if(df) df.value='';
  _auditPage=1; window.renderAuditTable();
};

window.initAuditLogListener = function() {}; 
window.updateReport = updateReport;



const MAX_ATTEMPTS = 8;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes

window.handleLoginAttempt = async function(email, password) {
  let attemptsData = JSON.parse(localStorage.getItem('loginAttempts')) || {
    count: 0,
    lockUntil: null
  };

  const now = Date.now();

  if (attemptsData.lockUntil) {
    if (now < attemptsData.lockUntil) {
      const remainingMinutes = Math.ceil((attemptsData.lockUntil - now) / 60000);
      showNotification(`Too many failed login attempts. Please try again in ${remainingMinutes} minute(s).`, "error");
      return;
    } else {
      attemptsData = {
        count: 0,
        lockUntil: null
      };
      localStorage.removeItem('loginAttempts');
    }
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    localStorage.removeItem('loginAttempts');
    showNotification("Login successful!", "success");

    if (typeof window.enterApp === 'function') {
      window.enterApp();
    }
  } catch (error) {
    console.error('Firebase Auth Error:', error.code, error.message);
    
    attemptsData.count += 1;
    
    if (attemptsData.count >= MAX_ATTEMPTS) {
      attemptsData.lockUntil = Date.now() + LOCKOUT_TIME_MS;
      localStorage.setItem('loginAttempts', JSON.stringify(attemptsData));
      showNotification(`Too many failed login attempts. Please try again later.`, "error");
    } else {
      localStorage.setItem('loginAttempts', JSON.stringify(attemptsData));
      showNotification(`Incorrect Username or Password. You have ${MAX_ATTEMPTS - attemptsData.count} attempt(s) left.`, "error");
    }
  }
};