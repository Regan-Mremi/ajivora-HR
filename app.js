/* ============================================================
   Ajivora — Full ERP Frontend (Supabase Connected)
   ============================================================ */

// ===================== SUPABASE CONFIG =====================
// ⚠️ REPLACE THESE WITH YOUR REAL VALUES

const SUPABASE_URL = 'https://pjekkexyrstbcealyqou.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqZWtrZXh5cnN0YmNlYWx5cW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMjQzOTAsImV4cCI6MjEwNDkwMDM5MH0.qvlwuUrZEyb9iIqRGZxLGl_KpSxJGdSMs4Dy0s8mQ7U';


// We use `sb` because the CDN already declares a global `supabase`
let sb = null;
try {
  if (SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co' && SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY') {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase not configured – running in demo mode');
}

// ===================== STATE =====================
let currentUser = null;
let isLoginMode = true;
let employees = [];          // will be loaded from Supabase
let contracts = [];          // generated contracts from Supabase
let candidates = [];         // recruitment applications
let performanceReviews = [];
let trainingPrograms = [];
let departmentsList = [];
let selectedEmployee = null;
let contractStep = 1;
let contractData = {};
let employeeFilter = 'All';
let searchQuery = '';
let contractSearchQuery = '';
let candidateSearchQuery = '';
let isLoading = false;
const DEFAULT_DEPARTMENTS = ['Engineering', 'Product', 'Sales', 'Design', 'Finance', 'HR', 'Operations'];

function getDepartmentNames() {
  if (departmentsList.length) return departmentsList.map(d => d.name);
  return [...DEFAULT_DEPARTMENTS];
}

// Fallback mock data (used only if Supabase is not configured)
const mockEmployees = [
  { emp_id: 'EMP-0041', first_name: 'Marcus', last_name: 'Chen', role: 'Senior Engineer', department: 'Engineering', status: 'Active', joined_date: '2021-03-15', salary: 148000, email: 'm.chen@ajivora.com', phone: '+65 9123 4567', location: 'Singapore', manager: 'Elena Sousa', bio: 'Marcus leads backend platform initiatives.', skills: ['Go','Kubernetes','PostgreSQL'], education: 'B.Sc. Computer Science, NUS · 2016' },
  { emp_id: 'EMP-0042', first_name: 'Priya', last_name: 'Nair', role: 'Product Manager', department: 'Product', status: 'Active', joined_date: '2023-09-01', salary: 132000 },
  { emp_id: 'EMP-0043', first_name: 'David', last_name: 'Osei', role: 'Sales Executive', department: 'Sales', status: 'Active', joined_date: '2022-01-10', salary: 95000 },
  { emp_id: 'EMP-0044', first_name: 'Lena', last_name: 'Hoffmann', role: 'UX Designer', department: 'Design', status: 'On Leave', joined_date: '2020-06-20', salary: 118000 },
  { emp_id: 'EMP-0045', first_name: 'James', last_name: 'Mwangi', role: 'Financial Analyst', department: 'Finance', status: 'Active', joined_date: '2022-11-05', salary: 108000 },
];

// ===================== HELPERS =====================
function getInitials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatMoney(n) {
  const num = Number(n || 0);
  return 'TSh ' + num.toLocaleString('en-TZ');
}

function showToast(message, type = 'success') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `fixed top-5 right-5 z-[100] px-5 py-3 rounded-lg text-sm font-medium shadow-lg transition-all
    ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===================== DATA LOADING =====================
async function loadEmployees() {
  if (!sb) {
    employees = mockEmployees.map(e => ({
      ...e,
      id: e.emp_id,
      name: `${e.first_name} ${e.last_name}`,
      initials: getInitials(e.first_name, e.last_name),
      dept: e.department,
      joined: formatDate(e.joined_date)
    }));
    return;
  }

  isLoading = true;
  const { data, error } = await sb
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false });

  isLoading = false;

  if (error) {
    console.error(error);
    showToast('Failed to load employees: ' + error.message, 'error');
    employees = [];
    return;
  }

  employees = (data || []).map(e => ({
    ...e,
    name: `${e.first_name} ${e.last_name}`,
    initials: getInitials(e.first_name, e.last_name),
    dept: e.department,
    joined: formatDate(e.joined_date),
    salary: Number(e.salary || 0),
    bonus: Number(e.bonus || 0),
    nssf_percent: e.nssf_percent != null ? Number(e.nssf_percent) : 10,
    tax_percent: e.tax_percent != null ? Number(e.tax_percent) : 0,
    is_manager: !!e.is_manager
  }));
}

async function loadContracts() {
  if (!sb) {
    contracts = [];
    return;
  }
  const { data, error } = await sb
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    contracts = [];
    return;
  }
  contracts = data || [];
}

async function loadCandidates() {
  if (!sb) {
    candidates = [];
    return;
  }
  const { data, error } = await sb.from('candidates').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); candidates = []; return; }
  candidates = data || [];
}

async function loadPerformance() {
  if (!sb) {
    performanceReviews = [];
    return;
  }
  const { data, error } = await sb.from('performance_reviews').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); performanceReviews = []; return; }
  performanceReviews = data || [];
}

async function loadTraining() {
  if (!sb) {
    trainingPrograms = [
      { id: '1', title: 'Leadership Essentials', enrolled: 48, completed: 32, progress: 67 },
      { id: '2', title: 'Advanced Kubernetes', enrolled: 24, completed: 18, progress: 75 },
      { id: '3', title: 'Inclusive Hiring Practices', enrolled: 112, completed: 89, progress: 79 },
    ];
    return;
  }
  const { data, error } = await sb.from('training_programs').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    trainingPrograms = [];
    return;
  }
  trainingPrograms = data || [];
}

async function loadDepartments() {
  if (!sb) {
    departmentsList = DEFAULT_DEPARTMENTS.map((name, i) => ({ id: 'local-' + i, name }));
    return;
  }
  const { data, error } = await sb.from('departments').select('*').order('name');
  if (error) {
    console.error(error);
    departmentsList = DEFAULT_DEPARTMENTS.map((name, i) => ({ id: 'local-' + i, name }));
    return;
  }
  departmentsList = data && data.length
    ? data
    : DEFAULT_DEPARTMENTS.map((name, i) => ({ id: 'local-' + i, name }));
}

async function loadAllData() {
  await loadEmployees();
  await loadContracts();
  await loadCandidates();
  await loadPerformance();
  await loadTraining();
  await loadDepartments();
}

// ===================== AUTH =====================
async function checkAuth() {
  // Always show login first so user can type email & password
  // (do not jump into the app automatically)
  showAuth();

  if (!sb) {
    return;
  }

  // If already logged in from before, show a note — still must click Sign In or we can continue
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      const email = session.user.email || '';
      const emailInput = document.getElementById('auth-email');
      if (emailInput && email) emailInput.value = email;
      const errEl = document.getElementById('auth-error');
      if (errEl) {
        errEl.textContent = 'You have a saved session. Enter your password and click Sign In, or clear site data to reset.';
        errEl.classList.remove('hidden', 'text-red-400');
        errEl.classList.add('text-green-400');
      }
    }
  } catch (e) {
    console.warn(e);
  }
}

function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  if (currentUser?.email) {
    const name = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    document.getElementById('user-name').textContent = name;
  }
  navigate('dashboard');
}

document.getElementById('auth-toggle').addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  document.getElementById('auth-title').textContent = isLoginMode ? 'Sign in to your account' : 'Create account';
  document.getElementById('auth-subtitle').textContent = isLoginMode ? 'HR Director access only' : 'Only one user is allowed';
  document.getElementById('auth-submit').textContent = isLoginMode ? 'Sign In' : 'Register';
  document.getElementById('auth-toggle-text').textContent = isLoginMode ? "Don't have an account?" : 'Already have an account?';
  document.getElementById('auth-toggle').textContent = isLoginMode ? 'Register' : 'Sign In';
  document.getElementById('auth-error').classList.add('hidden');
});

async function handleAuthClick() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');
  errEl.classList.add('hidden');

  if (!email) {
    errEl.textContent = 'Please enter your email.';
    errEl.classList.remove('hidden', 'text-green-400');
    errEl.classList.add('text-red-400');
    document.getElementById('auth-email').focus();
    return;
  }
  if (!password) {
    errEl.textContent = 'Please enter your password.';
    errEl.classList.remove('hidden', 'text-green-400');
    errEl.classList.add('text-red-400');
    document.getElementById('auth-password').focus();
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.classList.remove('hidden', 'text-green-400');
    errEl.classList.add('text-red-400');
    document.getElementById('auth-password').focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = isLoginMode ? 'Signing in...' : 'Creating account...';

  try {
    if (!sb) {
      errEl.textContent = 'Supabase is not configured. Put your URL and anon key in app.js.';
      errEl.classList.remove('hidden', 'text-green-400');
      errEl.classList.add('text-red-400');
      return;
    }

    if (isLoginMode) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      await loadAllData();
      showApp();
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: 'Judith' } }
      });
      if (error) throw error;
      errEl.textContent = 'Account created! Now type password again and click Sign In.';
      errEl.classList.remove('hidden', 'text-red-400');
      errEl.classList.add('text-green-400');
      isLoginMode = true;
      document.getElementById('auth-title').textContent = 'Sign in to your account';
      document.getElementById('auth-submit').textContent = 'Sign In';
      document.getElementById('auth-toggle-text').textContent = "Don't have an account?";
      document.getElementById('auth-toggle').textContent = 'Register';
    }
  } catch (err) {
    errEl.textContent = err.message || 'Login failed. Check email and password.';
    errEl.classList.remove('hidden', 'text-green-400');
    errEl.classList.add('text-red-400');
  } finally {
    submitBtn.disabled = false;
    if (!document.getElementById('auth-screen').classList.contains('hidden')) {
      submitBtn.textContent = isLoginMode ? 'Sign In' : 'Register';
    }
  }
}

// ONLY login when user clicks the button — never auto-submit the form
document.getElementById('auth-submit')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  handleAuthClick();
});

document.getElementById('auth-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
});

// Typing Enter in email → go to password (do NOT login)
document.getElementById('auth-email')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('auth-password')?.focus();
  }
});

// Typing Enter in password → login only if both filled (optional convenience)
document.getElementById('auth-password')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    handleAuthClick();
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  if (sb) await sb.auth.signOut();
  currentUser = null;
  showAuth();
});

// ===================== NAVIGATION =====================
document.querySelectorAll('.sidebar-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-item').forEach(b => {
      b.classList.remove('active');
      b.classList.add('text-gray-400');
    });
    btn.classList.add('active');
    btn.classList.remove('text-gray-400');
    navigate(btn.dataset.page);
  });
});

function navigate(page) {
  const content = document.getElementById('page-content');
  switch (page) {
    case 'dashboard': content.innerHTML = renderDashboard(); break;
    case 'employees': content.innerHTML = renderEmployees(); bindEmployees(); break;
    case 'profile': content.innerHTML = renderProfile(); bindProfile(); break;
    case 'contract': content.innerHTML = renderContract(); bindContract(); break;
    case 'contracts': 
      loadContracts().then(() => {
        document.getElementById('page-content').innerHTML = renderContracts();
      });
      content.innerHTML = `<div class="p-10 text-center text-gray-500">Loading contracts...</div>`;
      break;
    case 'departments':
      loadDepartments().then(() => {
        document.getElementById('page-content').innerHTML = renderDepartments();
        bindDepartments();
      });
      content.innerHTML = `<div class="p-10 text-center text-gray-500">Loading departments...</div>`;
      break;
    case 'payroll': content.innerHTML = renderPayroll(); break;
    case 'attendance': content.innerHTML = renderAttendance(); break;
    case 'recruitment':
      loadCandidates().then(() => {
        document.getElementById('page-content').innerHTML = renderRecruitment();
        bindRecruitment();
      });
      content.innerHTML = `<div class="p-10 text-center text-gray-500">Loading applications...</div>`;
      break;
    case 'performance':
      loadPerformance().then(() => {
        document.getElementById('page-content').innerHTML = renderPerformance();
        bindPerformance();
      });
      content.innerHTML = `<div class="p-10 text-center text-gray-500">Loading reviews...</div>`;
      break;
    case 'training':
      loadTraining().then(() => {
        document.getElementById('page-content').innerHTML = renderTraining();
        bindTraining();
      });
      content.innerHTML = `<div class="p-10 text-center text-gray-500">Loading programs...</div>`;
      break;
  }
}

// ===================== RENDERERS =====================
function getEATGreeting() {
  // East Africa Time = UTC+3
  const now = new Date();
  const eatHour = (now.getUTCHours() + 3) % 24;
  if (eatHour >= 5 && eatHour < 12) return 'Good morning';
  if (eatHour >= 12 && eatHour < 17) return 'Good afternoon';
  if (eatHour >= 17 && eatHour < 21) return 'Good evening';
  return 'Good night';
}

function getEATDateString() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Nairobi'
  });
}

function renderDashboard() {
  const total = employees.length;
  const onLeave = employees.filter(e => e.status === 'On Leave').length;
  const greeting = getEATGreeting();
  const dateStr = getEATDateString();
  const managers = employees.filter(e => e.is_manager);
  const openApps = candidates.filter(c => c.status === 'Applied' || c.status === 'Interview').length;
  const monthlyPayroll = employees.reduce((s, e) => {
    const base = Math.round((e.salary || 0) / 12);
    const bonus = Number(e.bonus || 0);
    return s + base + bonus;
  }, 0);

  return `
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-white">${greeting}, Judith.</h1>
      <p class="text-sm text-gray-500 mt-1">${dateStr} · Ajivora HR Suite · East Africa Time</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      ${statCard('Total Employees', String(total), total ? 'From your database' : 'Add employees to begin', 'text-green-400')}
      ${statCard('On Leave Today', String(onLeave), onLeave ? 'Currently on leave' : 'None on leave', 'text-gray-400')}
      ${statCard('Open Applications', String(openApps), 'Recruitment pipeline', 'text-blue-400')}
      ${statCard('Payroll This Month', formatMoney(monthlyPayroll), 'Estimated gross (monthly)', 'text-amber-400')}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-dark-800 border border-dark-700 rounded-xl p-5">
        <h3 class="text-sm font-medium text-white mb-4">Headcount by Department</h3>
        <div class="space-y-3">
          ${(() => {
            const names = getDepartmentNames();
            const colors = ['bg-blue-500','bg-green-500','bg-orange-500','bg-purple-500','bg-pink-500','bg-emerald-500','bg-amber-500','bg-cyan-500','bg-rose-500'];
            const max = Math.max(...names.map(x => employees.filter(e => e.dept === x).length), 1);
            return names.map((d, i) => {
              const count = employees.filter(e => e.dept === d).length;
              return `
              <div class="flex items-center gap-3">
                <span class="w-28 text-sm text-gray-300 truncate">${d}</span>
                <div class="flex-1 bg-dark-700 rounded-full h-1.5">
                  <div class="${colors[i % colors.length]} progress-bar" style="width:${(count/max)*100}%"></div>
                </div>
                <span class="w-10 text-right text-sm font-mono text-gray-400">${count}</span>
              </div>`;
            }).join('');
          })()}
        </div>
      </div>

      <div class="bg-dark-800 border border-dark-700 rounded-xl p-5">
        <h3 class="text-sm font-medium text-white mb-4">Managers</h3>
        <div class="space-y-4">
          ${managers.length === 0 
            ? '<p class="text-sm text-gray-500">No managers yet. Tick “Is Manager” when adding an employee.</p>'
            : managers.slice(0, 6).map(e => `
              <div class="flex items-start gap-3 cursor-pointer hover:bg-dark-700/40 p-2 rounded-lg -mx-2" onclick="selectEmployee('${e.emp_id || e.id}')">
                <div class="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-xs font-medium text-blue-300 shrink-0">${e.initials}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-white">${e.name}</div>
                  <div class="text-xs text-gray-500">${e.role} · <span class="text-blue-400">${e.dept}</span></div>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    </div>
  `;
}

function statCard(label, value, sub, subColor) {
  return `
    <div class="bg-dark-800 border border-dark-700 rounded-xl p-5">
      <div class="text-xs text-gray-500 mb-1">${label}</div>
      <div class="text-2xl font-semibold text-white">${value}</div>
      <div class="text-xs ${subColor} mt-1">${sub}</div>
    </div>
  `;
}

function renderEmployees() {
  const filtered = employees.filter(e => {
    const matchDept = employeeFilter === 'All' || e.dept === employeeFilter;
    const matchSearch = !searchQuery || 
      e.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.emp_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  const depts = ['All', ...getDepartmentNames()];

  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-white">Employee Directory</h1>
        <p class="text-sm text-gray-500 mt-1">${filtered.length} total records</p>
      </div>
      <button onclick="openAddEmployeeModal()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">
        + Add Employee
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-5">
      <input type="text" id="emp-search" placeholder="Search by name or ID..." value="${searchQuery}"
        class="px-3 py-1.5 rounded-lg border text-sm text-white placeholder-gray-500 w-56" />
      ${depts.map(d => `
        <button data-filter="${d}" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-medium transition
          ${employeeFilter === d ? 'bg-blue-600 text-white' : 'bg-dark-800 text-gray-400 border border-dark-700 hover:bg-dark-700'}">
          ${d}
        </button>
      `).join('')}
    </div>

    <div class="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
      ${isLoading ? '<div class="p-10 text-center text-gray-500">Loading employees...</div>' : `
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-gray-500 border-b border-dark-700">
            <th class="px-4 py-3 font-medium">Employee ID</th>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Role</th>
            <th class="px-4 py-3 font-medium">Department</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Joined</th>
            <th class="px-4 py-3 font-medium">Salary</th>
            <th class="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length === 0 ? `
            <tr><td colspan="8" class="px-4 py-10 text-center text-gray-500">
              No employees found. Click “+ Add Employee” to create the first one.
            </td></tr>
          ` : filtered.map(e => `
            <tr class="border-b border-dark-700/50 hover:bg-dark-700/30">
              <td class="px-4 py-3 font-mono text-gray-400">${e.emp_id || '—'}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2 cursor-pointer" onclick="selectEmployee('${e.emp_id || e.id}')">
                  <span class="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center text-xs font-medium text-blue-300">${e.initials}</span>
                  <span class="text-white font-medium">${e.name}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-300">${e.role || '—'}</td>
              <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full bg-dark-600 text-xs text-gray-300">${e.dept || '—'}</span></td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1.5 text-xs">
                  <span class="status-dot ${e.status === 'Active' ? 'bg-green-500' : e.status === 'On Leave' ? 'bg-amber-500' : 'bg-blue-500'}"></span>
                  ${e.status || 'Active'}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-400">${e.joined || '—'}</td>
              <td class="px-4 py-3 font-mono text-white">${formatMoney(e.salary)}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <button onclick="openEditEmployeeModal('${e.emp_id || e.id}')" class="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                  <button onclick="deleteEmployee('${e.id || e.emp_id}')" class="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>

    ${employeeModalHTML()}
  `;
}

function employeeModalHTML() {
  return `
    <div id="employee-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div class="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-dark-700 flex items-center justify-between">
          <h2 id="modal-title" class="text-lg font-semibold text-white">Add Employee</h2>
          <button type="button" onclick="closeEmployeeModal()" class="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <form id="employee-form" class="p-6 space-y-4">
          <input type="hidden" id="edit-id" />
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">First Name *</label>
              <input type="text" id="f-first" required class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Last Name *</label>
              <input type="text" id="f-last" required class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Email</label>
              <input type="email" id="f-email" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Phone</label>
              <input type="text" id="f-phone" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Role *</label>
              <input type="text" id="f-role" required class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Department *</label>
              <select id="f-dept" required class="w-full px-3 py-2 rounded-lg border text-sm text-white">
                ${getDepartmentNames().map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Status</label>
              <select id="f-status" class="w-full px-3 py-2 rounded-lg border text-sm text-white">
                <option>Active</option><option>On Leave</option><option>Probation</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Joined Date</label>
              <input type="date" id="f-joined" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Basic salary (TSH / year)</label>
              <input type="number" id="f-salary" class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="e.g. 24000000" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Monthly bonus (TSH)</label>
              <input type="number" id="f-bonus" class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="e.g. 100000" value="0" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">NSSF employee % (default 10)</label>
              <input type="number" id="f-nssf" min="0" max="100" step="0.1" class="w-full px-3 py-2 rounded-lg border text-sm text-white" value="10" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Other tax / PAYE % (optional)</label>
              <input type="number" id="f-tax" min="0" max="100" step="0.1" class="w-full px-3 py-2 rounded-lg border text-sm text-white" value="0" />
            </div>
          </div>
          <p class="text-[10px] text-gray-500">Payroll auto: monthly basic = annual÷12, + bonus − NSSF% − tax% on basic.</p>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Location</label>
            <input type="text" id="f-location" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Reports To (manager name)</label>
            <input type="text" id="f-manager" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
          </div>
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="f-is-manager" class="w-4 h-4 rounded border-dark-600 bg-dark-700 text-blue-600" />
              <span class="text-sm text-gray-300">Is Manager — show on Dashboard Managers list</span>
            </label>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" onclick="closeEmployeeModal()" class="px-4 py-2 rounded-lg border border-dark-600 text-sm text-gray-400 hover:bg-dark-700">Cancel</button>
            <button type="submit" id="modal-submit" class="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Save Employee</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function bindProfile() {
  document.getElementById('employee-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveEmployee(true);
  });
}

function startContractFromEmployee(id) {
  const emp = employees.find(e => e.emp_id === id || e.id === id) || selectedEmployee;
  if (!emp) {
    showToast('No employee selected', 'error');
    return;
  }
  contractStep = 1;
  contractData = {
    first: emp.first_name || (emp.name || '').split(' ')[0] || '',
    last: emp.last_name || (emp.name || '').split(' ').slice(1).join(' ') || '',
    email: emp.email || '',
    phone: emp.phone || '',
    title: emp.role || '',
    dept: emp.department || emp.dept || '',
    start: emp.joined_date || '',
    salary: emp.salary || '',
    bonus: ''
  };
  document.querySelectorAll('.sidebar-item').forEach(b => {
    b.classList.remove('active');
    b.classList.add('text-gray-400');
  });
  const btn = document.querySelector('[data-page="contract"]');
  if (btn) {
    btn.classList.add('active');
    btn.classList.remove('text-gray-400');
  }
  navigate('contract');
  showToast('Contract form filled from profile — review and continue');
}

function bindEmployees() {
  document.getElementById('emp-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    navigate('employees');
  });
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      employeeFilter = btn.dataset.filter;
      navigate('employees');
    });
  });

  document.getElementById('employee-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveEmployee(false);
  });
}

function openAddEmployeeModal() {
  const modal = document.getElementById('employee-modal');
  if (!modal) {
    showToast('Open Employees page to add staff', 'error');
    return;
  }
  document.getElementById('modal-title').textContent = 'Add Employee';
  document.getElementById('edit-id').value = '';
  document.getElementById('employee-form').reset();
  const cb = document.getElementById('f-is-manager');
  if (cb) cb.checked = false;
  modal.classList.remove('hidden');
}

function openEditEmployeeModal(id) {
  const emp = employees.find(e => e.emp_id === id || e.id === id);
  if (!emp) {
    showToast('Employee not found', 'error');
    return;
  }
  const modal = document.getElementById('employee-modal');
  if (!modal) {
    showToast('Edit form not available on this page', 'error');
    return;
  }

  document.getElementById('modal-title').textContent = 'Edit Employee';
  document.getElementById('edit-id').value = emp.id || emp.emp_id;
  document.getElementById('f-first').value = emp.first_name || '';
  document.getElementById('f-last').value = emp.last_name || '';
  document.getElementById('f-email').value = emp.email || '';
  document.getElementById('f-phone').value = emp.phone || '';
  document.getElementById('f-role').value = emp.role || '';
  document.getElementById('f-dept').value = emp.department || emp.dept || getDepartmentNames()[0] || '';
  document.getElementById('f-status').value = emp.status || 'Active';
  document.getElementById('f-joined').value = emp.joined_date || '';
  document.getElementById('f-salary').value = emp.salary || '';
  document.getElementById('f-bonus').value = emp.bonus ?? 0;
  document.getElementById('f-nssf').value = emp.nssf_percent ?? 10;
  document.getElementById('f-tax').value = emp.tax_percent ?? 0;
  document.getElementById('f-location').value = emp.location || '';
  document.getElementById('f-manager').value = emp.manager || '';
  const cb = document.getElementById('f-is-manager');
  if (cb) cb.checked = !!emp.is_manager;
  modal.classList.remove('hidden');
}

function closeEmployeeModal() {
  document.getElementById('employee-modal').classList.add('hidden');
}

async function deleteEmployee(id) {
  if (!confirm('Are you sure you want to delete this employee? This cannot be undone.')) return;

  if (!sb) {
    employees = employees.filter(e => e.id !== id && e.emp_id !== id);
    showToast('Employee deleted');
    navigate('employees');
    return;
  }

  try {
    const { error } = await sb.from('employees').delete().eq('id', id);
    if (error) throw error;
    showToast('Employee deleted successfully');
    await loadEmployees();
    navigate('employees');
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
}

async function saveEmployee(fromProfile = false) {
  const editId = document.getElementById('edit-id').value;
  const first = document.getElementById('f-first').value.trim();
  const last = document.getElementById('f-last').value.trim();

  const payload = {
    first_name: first,
    last_name: last,
    email: document.getElementById('f-email').value.trim() || null,
    phone: document.getElementById('f-phone').value.trim() || null,
    role: document.getElementById('f-role').value.trim(),
    department: document.getElementById('f-dept').value,
    status: document.getElementById('f-status').value,
    joined_date: document.getElementById('f-joined').value || null,
    salary: Number(document.getElementById('f-salary').value) || null,
    bonus: Number(document.getElementById('f-bonus')?.value) || 0,
    nssf_percent: Number(document.getElementById('f-nssf')?.value) || 0,
    tax_percent: Number(document.getElementById('f-tax')?.value) || 0,
    location: document.getElementById('f-location').value.trim() || null,
    manager: document.getElementById('f-manager').value.trim() || null,
    is_manager: document.getElementById('f-is-manager')?.checked || false,
  };

  if (!editId) {
    const nextNum = employees.length + 41;
    payload.emp_id = `EMP-${String(nextNum).padStart(4, '0')}`;
  }

  const finishNav = () => {
    closeEmployeeModal();
    showToast(editId ? 'Employee updated successfully' : 'Employee added successfully');
    if (fromProfile && editId) {
      selectedEmployee = employees.find(e => e.id === editId || e.emp_id === editId) || selectedEmployee;
      navigate('profile');
    } else {
      navigate('employees');
    }
  };

  if (!sb) {
    if (editId) {
      const idx = employees.findIndex(e => e.id === editId || e.emp_id === editId);
      if (idx >= 0) {
        employees[idx] = { ...employees[idx], ...payload, name: `${first} ${last}`, initials: getInitials(first, last), dept: payload.department, joined: formatDate(payload.joined_date), is_manager: !!payload.is_manager };
      }
    } else {
      employees.unshift({
        id: payload.emp_id,
        ...payload,
        name: `${first} ${last}`,
        initials: getInitials(first, last),
        dept: payload.department,
        joined: formatDate(payload.joined_date),
        is_manager: !!payload.is_manager
      });
    }
    finishNav();
    return;
  }

  try {
    let error;
    if (editId) {
      ({ error } = await sb.from('employees').update(payload).eq('id', editId));
    } else {
      ({ error } = await sb.from('employees').insert(payload));
    }
    if (error) throw error;
    await loadEmployees();
    finishNav();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function selectEmployee(id) {
  selectedEmployee = employees.find(e => e.emp_id === id || e.id === id) || employees[0];
  document.querySelectorAll('.sidebar-item').forEach(b => {
    b.classList.remove('active');
    b.classList.add('text-gray-400');
  });
  const profileBtn = document.querySelector('[data-page="profile"]');
  profileBtn.classList.add('active');
  profileBtn.classList.remove('text-gray-400');
  navigate('profile');
}

function renderProfile() {
  const e = selectedEmployee || employees[0];
  if (!e) {
    return `<div class="text-center py-20 text-gray-500">No employee selected. Go to Employees and click one.</div>`;
  }

  return `
    <div class="bg-dark-800 border border-dark-700 rounded-xl p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-dark-600 flex items-center justify-center text-xl font-semibold text-blue-300">${e.initials}</div>
        <div>
          <h1 class="text-xl font-semibold text-white">${e.name}</h1>
          <p class="text-sm text-gray-400">${e.role || '—'} · ${e.dept || '—'}${e.location ? ' · ' + e.location : ''}</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="inline-flex items-center gap-1 text-xs"><span class="status-dot ${e.status === 'Active' ? 'bg-green-500' : 'bg-amber-500'}"></span> ${e.status || 'Active'}</span>
            <span class="px-2 py-0.5 rounded-full bg-dark-600 text-xs text-gray-400">Full-time</span>
            <span class="px-2 py-0.5 rounded-full bg-dark-600 text-xs text-gray-400">${e.emp_id || '—'}</span>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button type="button" onclick="openEditEmployeeModal('${e.id || e.emp_id}')" class="px-4 py-2 rounded-lg border border-dark-600 text-sm text-gray-300 hover:bg-dark-700">Edit Profile</button>
        <button type="button" onclick="startContractFromEmployee('${e.id || e.emp_id}')" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Generate Contract</button>
      </div>
    </div>

    ${employeeModalHTML()}

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 space-y-5">
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Contact Information</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><div class="text-gray-500 text-xs mb-0.5">Email</div><div class="text-white">${e.email || '—'}</div></div>
            <div><div class="text-gray-500 text-xs mb-0.5">Phone</div><div class="text-white">${e.phone || '—'}</div></div>
            <div><div class="text-gray-500 text-xs mb-0.5">Location</div><div class="text-white">${e.location || '—'}</div></div>
            <div><div class="text-gray-500 text-xs mb-0.5">Manager</div><div class="text-white">${e.manager || '—'}</div></div>
          </div>
        </div>

        <div class="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Employment Details</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><div class="text-gray-500 text-xs mb-0.5">Date Joined</div><div class="text-white">${e.joined || '—'}</div></div>
            <div><div class="text-gray-500 text-xs mb-0.5">Contract Type</div><div class="text-white">Full-time</div></div>
            <div><div class="text-gray-500 text-xs mb-0.5">Annual Salary</div><div class="text-white">${formatMoney(e.salary)}</div></div>
            <div><div class="text-gray-500 text-xs mb-0.5">Department</div><div class="text-white">${e.dept || '—'}</div></div>
          </div>
        </div>
      </div>

      <div class="space-y-5">
        ${e.bio ? `
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Bio</h3>
          <p class="text-sm text-gray-300 leading-relaxed">${e.bio}</p>
        </div>` : ''}
        ${e.skills?.length ? `
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Skills</h3>
          <div class="flex flex-wrap gap-2">
            ${e.skills.map(s => `<span class="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs">${s}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>
  `;
}

function renderContract() {
  const steps = ['Employee Info', 'Employment Terms', 'Compensation', 'Finalize'];
  return `
    <div class="max-w-2xl mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-semibold text-white">Employee Contract Form</h1>
        <p class="text-sm text-gray-500 mt-1">Generate a new employment contract</p>
      </div>

      <div class="flex items-center justify-center gap-0 mb-8">
        ${steps.map((s, i) => `
          <div class="flex items-center">
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${contractStep > i + 1 ? 'bg-blue-600 text-white' : contractStep === i + 1 ? 'bg-blue-600 text-white' : 'bg-dark-700 text-gray-500'}">
                ${contractStep > i + 1 ? '✓' : i + 1}
              </div>
              <span class="text-[10px] mt-1.5 ${contractStep === i + 1 ? 'text-blue-400' : 'text-gray-500'}">${s}</span>
            </div>
            ${i < steps.length - 1 ? `<div class="w-16 h-px mx-2 ${contractStep > i + 1 ? 'bg-blue-600' : 'bg-dark-700'}"></div>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="bg-dark-800 border border-dark-700 rounded-xl p-6" id="contract-step-content">
        ${renderContractStep()}
      </div>

      <div class="flex justify-between mt-6">
        <button id="contract-back" class="px-4 py-2 rounded-lg border border-dark-600 text-sm text-gray-400 hover:bg-dark-700 ${contractStep === 1 ? 'opacity-40 cursor-not-allowed' : ''}">Back</button>
        <button id="contract-next" class="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
          ${contractStep === 4 ? 'Generate Contract' : 'Continue →'}
        </button>
      </div>
    </div>
  `;
}

function renderContractStep() {
  if (contractStep === 1) {
    return `
      <h3 class="text-sm font-medium text-white mb-4">Personal Information</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">First Name *</label>
          <input type="text" id="c-first" value="${contractData.first || ''}" class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="e.g. Marcus" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Last Name *</label>
          <input type="text" id="c-last" value="${contractData.last || ''}" class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="e.g. Chen" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Employee ID</label>
          <input type="text" value="Auto-generated" disabled class="w-full px-3 py-2 rounded-lg border text-sm text-gray-500" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Date of Birth</label>
          <input type="date" id="c-dob" value="${contractData.dob || ''}" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Email Address *</label>
          <input type="email" id="c-email" value="${contractData.email || ''}" class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="name@company.io" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Phone Number</label>
          <input type="tel" id="c-phone" value="${contractData.phone || ''}" class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="+1 (555) 000-0000" />
        </div>
      </div>
    `;
  }
  if (contractStep === 2) {
    return `
      <h3 class="text-sm font-medium text-white mb-4">Employment Terms</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Job Title *</label>
          <input type="text" id="c-title" value="${contractData.title || ''}" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Department *</label>
          <select id="c-dept" class="w-full px-3 py-2 rounded-lg border text-sm text-white">
            ${getDepartmentNames().map(d => `<option ${contractData.dept===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Start Date *</label>
          <input type="date" id="c-start" value="${contractData.start || ''}" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Contract Type</label>
          <select id="c-type" class="w-full px-3 py-2 rounded-lg border text-sm text-white">
            <option>Full-time</option><option>Part-time</option><option>Contract</option>
          </select>
        </div>
      </div>
    `;
  }
  if (contractStep === 3) {
    return `
      <h3 class="text-sm font-medium text-white mb-4">Compensation</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Annual Base Salary (TSH) *</label>
          <input type="number" id="c-salary" value="${contractData.salary || ''}" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Signing Bonus</label>
          <input type="number" id="c-bonus" value="${contractData.bonus || ''}" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
        </div>
      </div>
    `;
  }
  return `
    <h3 class="text-sm font-medium text-white mb-4">Review & Finalize</h3>
    <div class="space-y-3 text-sm">
      <div class="flex justify-between py-2 border-b border-dark-700"><span class="text-gray-500">Name</span><span class="text-white">${contractData.first || ''} ${contractData.last || ''}</span></div>
      <div class="flex justify-between py-2 border-b border-dark-700"><span class="text-gray-500">Email</span><span class="text-white">${contractData.email || '—'}</span></div>
      <div class="flex justify-between py-2 border-b border-dark-700"><span class="text-gray-500">Title</span><span class="text-white">${contractData.title || '—'}</span></div>
      <div class="flex justify-between py-2 border-b border-dark-700"><span class="text-gray-500">Department</span><span class="text-white">${contractData.dept || '—'}</span></div>
      <div class="flex justify-between py-2 border-b border-dark-700"><span class="text-gray-500">Salary</span><span class="text-white">${formatMoney(contractData.salary)}</span></div>
    </div>
    <p class="text-xs text-gray-500 mt-4">By generating this contract you confirm the details above are correct.</p>
  `;
}

function bindContract() {
  document.getElementById('contract-back')?.addEventListener('click', () => {
    if (contractStep > 1) {
      saveContractStep();
      contractStep--;
      navigate('contract');
    }
  });
  document.getElementById('contract-next')?.addEventListener('click', async () => {
    saveContractStep();
    if (contractStep < 4) {
      contractStep++;
      navigate('contract');
    } else {
      // Save contract to Supabase
      await generateAndSaveContract();
    }
  });
}

async function generateAndSaveContract() {
  const payload = {
    first_name: contractData.first || null,
    last_name: contractData.last || null,
    email: contractData.email || null,
    phone: contractData.phone || null,
    job_title: contractData.title || null,
    department: contractData.dept || null,
    start_date: contractData.start || null,
    contract_type: 'Full-time',
    salary: Number(contractData.salary) || null,
    bonus: Number(contractData.bonus) || 0,
    status: 'Generated'
  };

  // Always generate PDF for download
  generateContractPDF(payload);

  if (!sb) {
    showToast(`Contract PDF generated for ${payload.first_name || ''} ${payload.last_name || ''}! (Demo mode – not saved to DB)`);
    contractStep = 1;
    contractData = {};
    navigate('contract');
    return;
  }

  try {
    console.log('Saving contract...', payload);
    const { data, error } = await sb.from('contracts').insert(payload).select();
    
    if (error) {
      console.error('Insert error:', error);
      throw error;
    }

    console.log('Contract saved successfully:', data);
    showToast(`Contract saved & PDF downloaded for ${payload.first_name || ''} ${payload.last_name || ''}!`);
    
    await loadContracts();
    console.log('Contracts after reload:', contracts);
    
    contractStep = 1;
    contractData = {};
    navigate('contracts');
  } catch (err) {
    console.error('Failed to save contract:', err);
    showToast('Failed to save contract: ' + (err.message || err), 'error');
  }
}

function generateContractPDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Ajivora', 20, 15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Employment Contract', 20, 23);

  // Body
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYMENT AGREEMENT', 105, 45, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let y = 60;

  const lines = [
    ['Employee Name', `${data.first_name || ''} ${data.last_name || ''}`],
    ['Email', data.email || '—'],
    ['Phone', data.phone || '—'],
    ['Job Title', data.job_title || '—'],
    ['Department', data.department || '—'],
    ['Start Date', data.start_date || '—'],
    ['Contract Type', data.contract_type || 'Full-time'],
    ['Annual Salary', data.salary ? `TSh ${Number(data.salary).toLocaleString('en-TZ')}` : '—'],
    ['Signing Bonus', data.bonus ? `TSh ${Number(data.bonus).toLocaleString('en-TZ')}` : 'TSh 0'],
  ];

  lines.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), 80, y);
    y += 10;
  });

  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('This document was generated by Ajivora HR Suite.', 25, y);
  y += 7;
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 25, y);

  y += 20;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.text('__________________________', 25, y);
  doc.text('Employee Signature', 25, y + 7);

  doc.text('__________________________', 120, y);
  doc.text('HR Director Signature', 120, y + 7);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Ajivora Enterprise Suite — Confidential', 105, 285, { align: 'center' });

  const fileName = `Contract_${data.first_name || 'Employee'}_${data.last_name || ''}_${Date.now()}.pdf`;
  doc.save(fileName);
}

function saveContractStep() {
  if (contractStep === 1) {
    contractData.first = document.getElementById('c-first')?.value;
    contractData.last = document.getElementById('c-last')?.value;
    contractData.dob = document.getElementById('c-dob')?.value;
    contractData.email = document.getElementById('c-email')?.value;
    contractData.phone = document.getElementById('c-phone')?.value;
  } else if (contractStep === 2) {
    contractData.title = document.getElementById('c-title')?.value;
    contractData.dept = document.getElementById('c-dept')?.value;
    contractData.start = document.getElementById('c-start')?.value;
  } else if (contractStep === 3) {
    contractData.salary = document.getElementById('c-salary')?.value;
    contractData.bonus = document.getElementById('c-bonus')?.value;
  }
}

function renderContracts() {
  const filtered = contracts.filter(c => {
    if (!contractSearchQuery) return true;
    const q = contractSearchQuery.toLowerCase();
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    return name.includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.job_title || '').toLowerCase().includes(q) ||
      (c.department || '').toLowerCase().includes(q);
  });

  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-white">Contracts</h1>
        <p class="text-sm text-gray-500 mt-1">${filtered.length} contract${filtered.length !== 1 ? 's' : ''}</p>
      </div>
      <button onclick="navigate('contract')" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
        + New Contract
      </button>
    </div>

    <div class="mb-5">
      <input type="text" id="contract-search" placeholder="Search by name, email, title or department..."
        value="${contractSearchQuery}"
        class="px-3 py-2 rounded-lg border text-sm text-white placeholder-gray-500 w-full max-w-md"
        oninput="contractSearchQuery = this.value; document.getElementById('page-content').innerHTML = renderContracts();" />
    </div>

    <div class="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
      ${contracts.length === 0 ? `
        <div class="p-12 text-center text-gray-500">
          <p class="mb-3">No contracts generated yet.</p>
          <button onclick="navigate('contract')" class="text-blue-400 hover:text-blue-300 text-sm">Create your first contract →</button>
        </div>
      ` : filtered.length === 0 ? `
        <div class="p-12 text-center text-gray-500">No contracts match your search.</div>
      ` : `
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-500 border-b border-dark-700">
              <th class="px-4 py-3 font-medium">Employee</th>
              <th class="px-4 py-3 font-medium">Job Title</th>
              <th class="px-4 py-3 font-medium">Department</th>
              <th class="px-4 py-3 font-medium">Salary</th>
              <th class="px-4 py-3 font-medium">Start Date</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 font-medium">Created</th>
              <th class="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(c => `
              <tr class="border-b border-dark-700/50 hover:bg-dark-700/30">
                <td class="px-4 py-3">
                  <div class="text-white font-medium">${c.first_name || ''} ${c.last_name || ''}</div>
                  <div class="text-xs text-gray-500">${c.email || ''}</div>
                </td>
                <td class="px-4 py-3 text-gray-300">${c.job_title || '—'}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full bg-dark-600 text-xs text-gray-300">${c.department || '—'}</span></td>
                <td class="px-4 py-3 font-mono text-white">${c.salary ? formatMoney(c.salary) : '—'}</td>
                <td class="px-4 py-3 text-gray-400">${c.start_date || '—'}</td>
                <td class="px-4 py-3"><span class="text-xs text-green-400">${c.status || 'Generated'}</span></td>
                <td class="px-4 py-3 text-gray-500 text-xs">${c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <button onclick="downloadContractById('${c.id}')" 
                      class="text-xs text-blue-400 hover:text-blue-300 font-medium">
                      Download PDF
                    </button>
                    <button onclick="deleteContract('${c.id}')" 
                      class="text-xs text-red-400 hover:text-red-300 font-medium">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
}

function downloadContractById(id) {
  const c = contracts.find(x => x.id === id);
  if (!c) {
    showToast('Contract not found', 'error');
    return;
  }
  generateContractPDF({
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone,
    job_title: c.job_title,
    department: c.department,
    start_date: c.start_date,
    contract_type: c.contract_type || 'Full-time',
    salary: c.salary,
    bonus: c.bonus
  });
  showToast('PDF downloaded');
}

async function deleteContract(id) {
  if (!confirm('Are you sure you want to delete this contract? This cannot be undone.')) return;

  if (!sb) {
    contracts = contracts.filter(c => c.id !== id);
    showToast('Contract deleted');
    document.getElementById('page-content').innerHTML = renderContracts();
    return;
  }

  try {
    const { error } = await sb.from('contracts').delete().eq('id', id);
    if (error) throw error;
    showToast('Contract deleted successfully');
    await loadContracts();
    document.getElementById('page-content').innerHTML = renderContracts();
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
}

function renderDepartments() {
  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-white">Departments</h1>
        <p class="text-sm text-gray-500 mt-1">${departmentsList.length} department${departmentsList.length !== 1 ? 's' : ''} · used in Employees, filters & dashboard</p>
      </div>
      <button onclick="openAddDeptModal()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">+ Add Department</button>
    </div>

    <div class="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
      ${departmentsList.length === 0 ? `
        <div class="p-12 text-center text-gray-500">
          <p class="mb-3">No departments yet.</p>
          <button onclick="openAddDeptModal()" class="text-blue-400 text-sm">Add first department →</button>
        </div>
      ` : `
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-500 border-b border-dark-700">
              <th class="px-4 py-3 font-medium">Department Name</th>
              <th class="px-4 py-3 font-medium">Employees</th>
              <th class="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${departmentsList.map(d => {
              const count = employees.filter(e => e.dept === d.name || e.department === d.name).length;
              return `
              <tr class="border-b border-dark-700/50">
                <td class="px-4 py-3 text-white font-medium">${d.name}</td>
                <td class="px-4 py-3 text-gray-400">${count}</td>
                <td class="px-4 py-3">
                  <div class="flex gap-3">
                    <button onclick="openEditDeptModal('${d.id}', '${String(d.name).replace(/'/g, "\\'")}')" class="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                    <button onclick="deleteDepartment('${d.id}')" class="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>

    <div id="dept-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div class="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-sm mx-4">
        <div class="px-6 py-4 border-b border-dark-700 flex justify-between">
          <h2 id="dept-modal-title" class="text-lg font-semibold text-white">Add Department</h2>
          <button onclick="closeDeptModal()" class="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <form id="dept-form" class="p-6 space-y-4">
          <input type="hidden" id="dept-edit-id" />
          <div>
            <label class="block text-xs text-gray-400 mb-1">Department Name *</label>
            <input id="dept-name" required class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="e.g. Logistics" />
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" onclick="closeDeptModal()" class="px-4 py-2 rounded-lg border border-dark-600 text-sm text-gray-400">Cancel</button>
            <button type="submit" class="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function bindDepartments() {
  document.getElementById('dept-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveDepartment();
  });
}

function openAddDeptModal() {
  document.getElementById('dept-modal-title').textContent = 'Add Department';
  document.getElementById('dept-edit-id').value = '';
  document.getElementById('dept-name').value = '';
  document.getElementById('dept-modal').classList.remove('hidden');
}

function openEditDeptModal(id, name) {
  document.getElementById('dept-modal-title').textContent = 'Edit Department';
  document.getElementById('dept-edit-id').value = id;
  document.getElementById('dept-name').value = name;
  document.getElementById('dept-modal').classList.remove('hidden');
}

function closeDeptModal() {
  document.getElementById('dept-modal').classList.add('hidden');
}

async function saveDepartment() {
  const id = document.getElementById('dept-edit-id').value;
  const name = document.getElementById('dept-name').value.trim();
  if (!name) return;

  if (!sb || String(id).startsWith('local-')) {
    if (id) {
      const d = departmentsList.find(x => x.id === id);
      if (d) d.name = name;
    } else {
      if (departmentsList.some(d => d.name.toLowerCase() === name.toLowerCase())) {
        showToast('Department already exists', 'error');
        return;
      }
      departmentsList.push({ id: 'local-' + Date.now(), name });
    }
    closeDeptModal();
    showToast(id ? 'Department updated' : 'Department added');
    document.getElementById('page-content').innerHTML = renderDepartments();
    bindDepartments();
    return;
  }

  try {
    if (id) {
      const { error } = await sb.from('departments').update({ name }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('departments').insert({ name });
      if (error) throw error;
    }
    closeDeptModal();
    showToast(id ? 'Department updated' : 'Department added');
    await loadDepartments();
    document.getElementById('page-content').innerHTML = renderDepartments();
    bindDepartments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteDepartment(id) {
  if (!confirm('Delete this department? Employees keep their current department name.')) return;

  if (!sb || String(id).startsWith('local-')) {
    departmentsList = departmentsList.filter(d => d.id !== id);
    showToast('Department deleted');
    document.getElementById('page-content').innerHTML = renderDepartments();
    bindDepartments();
    return;
  }

  try {
    const { error } = await sb.from('departments').delete().eq('id', id);
    if (error) throw error;
    showToast('Department deleted');
    await loadDepartments();
    document.getElementById('page-content').innerHTML = renderDepartments();
    bindDepartments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function calcEmployeePay(e) {
  const base = Math.round(Number(e.salary || 0) / 12);
  const bonus = Math.round(Number(e.bonus || 0));
  const nssfPct = e.nssf_percent != null ? Number(e.nssf_percent) : 10;
  const taxPct = e.tax_percent != null ? Number(e.tax_percent) : 0;
  const nssf = Math.round(base * (nssfPct / 100));
  const tax = Math.round(base * (taxPct / 100));
  const deductions = nssf + tax;
  const net = base + bonus - deductions;
  return { base, bonus, nssf, tax, nssfPct, taxPct, deductions, net };
}

function renderPayroll() {
  const active = employees;
  const rows = active.map(e => ({ ...e, ...calcEmployeePay(e) }));
  const gross = rows.reduce((s, r) => s + r.base + r.bonus, 0);
  const ded = rows.reduce((s, r) => s + r.deductions, 0);
  const netTotal = gross - ded;
  const month = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });

  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-white">Payroll</h1>
        <p class="text-sm text-gray-500 mt-1">Auto-calculated from each employee’s bonus, NSSF % & tax % · ${month}</p>
      </div>
      <button onclick="runPayroll()" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">Run Payroll</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      ${statCard('Gross Payroll', formatMoney(gross), 'Basic + bonuses', 'text-gray-400')}
      ${statCard('Total Deductions', formatMoney(ded), 'NSSF + tax (per employee rates)', 'text-gray-400')}
      ${statCard('Net Disbursement', formatMoney(netTotal), 'To be transferred', 'text-green-400')}
    </div>
    <div class="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-dark-700 flex justify-between">
        <span class="text-sm font-medium text-white">Pay Statements — ${month}</span>
        <span class="text-xs text-gray-500">${rows.length} employees</span>
      </div>
      ${rows.length === 0 ? `<div class="p-10 text-center text-gray-500">Add employees first to calculate payroll.</div>` : `
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-gray-500 border-b border-dark-700">
            <th class="px-4 py-3">Employee</th>
            <th class="px-4 py-3">Department</th>
            <th class="px-4 py-3">Base Pay</th>
            <th class="px-4 py-3">Bonus</th>
            <th class="px-4 py-3">Deductions</th>
            <th class="px-4 py-3">Net Pay</th>
            <th class="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr class="border-b border-dark-700/50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center text-xs text-blue-300">${r.initials}</span>
                  <span class="text-white font-medium">${r.name}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-400">${r.dept || '—'}</td>
              <td class="px-4 py-3 font-mono">${formatMoney(r.base)}</td>
              <td class="px-4 py-3 font-mono text-green-400">+${formatMoney(r.bonus)}</td>
              <td class="px-4 py-3 font-mono text-red-400">-${formatMoney(r.deductions)}</td>
              <td class="px-4 py-3 font-mono text-white font-medium">${formatMoney(r.net)}</td>
              <td class="px-4 py-3"><span class="text-xs text-green-400">Ready</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>
  `;
}

function runPayroll() {
  showToast('Payroll run completed for ' + employees.length + ' employees');
}

function renderAttendance() {
  return `
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-white">Attendance</h1>
      <p class="text-sm text-gray-500 mt-1">Daily attendance tracking</p>
    </div>
    <div class="bg-dark-800 border border-dark-700 rounded-xl p-16 text-center">
      <div class="text-4xl mb-4 opacity-40">◷</div>
      <h2 class="text-lg font-medium text-white mb-2">Coming Soon</h2>
      <p class="text-sm text-gray-500 max-w-md mx-auto">
        Attendance tracking (check-in / check-out, leave requests, and reports) will be available in a future update.
      </p>
    </div>
  `;
}

function renderRecruitment() {
  const filtered = candidates.filter(c => {
    if (!candidateSearchQuery) return true;
    const q = candidateSearchQuery.toLowerCase();
    return `${c.full_name||''} ${c.email||''} ${c.position||''}`.toLowerCase().includes(q);
  });
  const applied = candidates.filter(c => c.status === 'Applied').length;
  const interview = candidates.filter(c => c.status === 'Interview').length;
  const hired = candidates.filter(c => c.status === 'Hired').length;
  const rejected = candidates.filter(c => c.status === 'Rejected').length;

  return `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-white">Recruitment</h1>
        <p class="text-sm text-gray-500 mt-1">
          Applications · Email CVs to 
          <a href="mailto:recruitment@gwambina.co.tz" class="text-blue-400 hover:underline">recruitment@gwambina.co.tz</a>
          then log them here
        </p>
      </div>
      <button onclick="openAddCandidateModal()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">+ Log Application</button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('Applied', String(applied), 'New applications', 'text-gray-400')}
      ${statCard('Interview', String(interview), 'In process', 'text-blue-400')}
      ${statCard('Hired', String(hired), 'Selected', 'text-green-400')}
      ${statCard('Rejected', String(rejected), 'Not selected', 'text-red-400')}
    </div>

    <div class="mb-5">
      <input type="text" id="candidate-search" placeholder="Search by name, email or position..."
        value="${candidateSearchQuery}"
        class="px-3 py-2 rounded-lg border text-sm text-white placeholder-gray-500 w-full max-w-md"
        oninput="candidateSearchQuery=this.value; document.getElementById('page-content').innerHTML=renderRecruitment(); bindRecruitment();" />
    </div>

    <div class="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
      ${candidates.length === 0 ? `
        <div class="p-12 text-center text-gray-500">
          <p class="mb-2">No applications yet.</p>
          <p class="text-xs mb-4">When someone emails a CV to <strong class="text-gray-400">recruitment@gwambina.co.tz</strong>, click “+ Log Application” to add them.</p>
          <button onclick="openAddCandidateModal()" class="text-blue-400 text-sm">Log first application →</button>
        </div>
      ` : `
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-500 border-b border-dark-700">
              <th class="px-4 py-3">Applicant</th>
              <th class="px-4 py-3">Position</th>
              <th class="px-4 py-3">Source</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Applied</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(c => `
              <tr class="border-b border-dark-700/50">
                <td class="px-4 py-3">
                  <div class="text-white font-medium">${c.full_name || '—'}</div>
                  <div class="text-xs text-gray-500">${c.email || ''} ${c.phone ? '· ' + c.phone : ''}</div>
                </td>
                <td class="px-4 py-3 text-gray-300">${c.position || '—'}</td>
                <td class="px-4 py-3 text-xs text-gray-500">${c.source || 'Email'}</td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full ${
                    c.status === 'Hired' ? 'bg-green-500/20 text-green-400' :
                    c.status === 'Interview' ? 'bg-blue-500/20 text-blue-400' :
                    c.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-dark-600 text-gray-300'
                  }">${c.status || 'Applied'}</span>
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs">${c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-2">
                    ${c.status !== 'Interview' && c.status !== 'Hired' ? `<button onclick="updateCandidateStatus('${c.id}','Interview')" class="text-xs text-blue-400 hover:text-blue-300">Interview</button>` : ''}
                    ${c.status !== 'Hired' ? `<button onclick="updateCandidateStatus('${c.id}','Hired')" class="text-xs text-green-400 hover:text-green-300">Hire</button>` : ''}
                    ${c.status !== 'Rejected' ? `<button onclick="updateCandidateStatus('${c.id}','Rejected')" class="text-xs text-amber-400 hover:text-amber-300">Reject</button>` : ''}
                    <button onclick="deleteCandidate('${c.id}')" class="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <div id="candidate-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div class="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-md mx-4">
        <div class="px-6 py-4 border-b border-dark-700 flex justify-between items-center">
          <h2 class="text-lg font-semibold text-white">Log Application</h2>
          <button onclick="closeCandidateModal()" class="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <form id="candidate-form" class="p-6 space-y-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Full Name *</label>
            <input id="cand-name" required class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Email</label>
            <input id="cand-email" type="email" class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="from CV email" />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Phone</label>
            <input id="cand-phone" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Position Applied For *</label>
            <input id="cand-position" required class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="e.g. Accountant" />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <textarea id="cand-notes" rows="2" class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="CV received via recruitment@gwambina.co.tz"></textarea>
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" onclick="closeCandidateModal()" class="px-4 py-2 rounded-lg border border-dark-600 text-sm text-gray-400">Cancel</button>
            <button type="submit" class="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function bindRecruitment() {
  document.getElementById('candidate-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveCandidate();
  });
}

function openAddCandidateModal() {
  document.getElementById('candidate-form')?.reset();
  document.getElementById('candidate-modal')?.classList.remove('hidden');
}
function closeCandidateModal() {
  document.getElementById('candidate-modal')?.classList.add('hidden');
}

async function saveCandidate() {
  const payload = {
    full_name: document.getElementById('cand-name').value.trim(),
    email: document.getElementById('cand-email').value.trim() || null,
    phone: document.getElementById('cand-phone').value.trim() || null,
    position: document.getElementById('cand-position').value.trim(),
    notes: document.getElementById('cand-notes').value.trim() || null,
    source: 'Email (recruitment@gwambina.co.tz)',
    status: 'Applied'
  };
  if (!sb) {
    candidates.unshift({ id: String(Date.now()), ...payload, created_at: new Date().toISOString() });
    closeCandidateModal();
    showToast('Application logged');
    document.getElementById('page-content').innerHTML = renderRecruitment();
    bindRecruitment();
    return;
  }
  try {
    const { error } = await sb.from('candidates').insert(payload);
    if (error) throw error;
    closeCandidateModal();
    showToast('Application logged');
    await loadCandidates();
    document.getElementById('page-content').innerHTML = renderRecruitment();
    bindRecruitment();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateCandidateStatus(id, status) {
  if (!sb) {
    const c = candidates.find(x => x.id === id);
    if (c) c.status = status;
    showToast('Status updated to ' + status);
    document.getElementById('page-content').innerHTML = renderRecruitment();
    bindRecruitment();
    return;
  }
  try {
    const { error } = await sb.from('candidates').update({ status }).eq('id', id);
    if (error) throw error;
    showToast('Status → ' + status);
    await loadCandidates();
    document.getElementById('page-content').innerHTML = renderRecruitment();
    bindRecruitment();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCandidate(id) {
  if (!confirm('Delete this application?')) return;
  if (!sb) {
    candidates = candidates.filter(c => c.id !== id);
    document.getElementById('page-content').innerHTML = renderRecruitment();
    bindRecruitment();
    showToast('Deleted');
    return;
  }
  try {
    const { error } = await sb.from('candidates').delete().eq('id', id);
    if (error) throw error;
    showToast('Application deleted');
    await loadCandidates();
    document.getElementById('page-content').innerHTML = renderRecruitment();
    bindRecruitment();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderPerformance() {
  const avg = performanceReviews.length
    ? (performanceReviews.reduce((s, r) => s + Number(r.rating || 0), 0) / performanceReviews.length).toFixed(1)
    : '—';
  const done = performanceReviews.filter(r => r.status === 'Completed').length;
  const pending = performanceReviews.filter(r => r.status !== 'Completed').length;

  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-white">Performance</h1>
        <p class="text-sm text-gray-500 mt-1">Review cycles & ratings</p>
      </div>
      <button onclick="openAddReviewModal()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">+ Add Review</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      ${statCard('Avg Rating', String(avg), 'All reviews', 'text-green-400')}
      ${statCard('Completed', String(done), 'Finished reviews', 'text-gray-400')}
      ${statCard('Pending', String(pending), 'In progress', 'text-amber-400')}
    </div>
    <div class="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
      ${performanceReviews.length === 0 ? `
        <div class="p-12 text-center text-gray-500">
          <p class="mb-3">No performance reviews yet.</p>
          <button onclick="openAddReviewModal()" class="text-blue-400 text-sm">Add first review →</button>
        </div>
      ` : `
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-500 border-b border-dark-700">
              <th class="px-4 py-3">Employee</th>
              <th class="px-4 py-3">Period</th>
              <th class="px-4 py-3">Rating</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Notes</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            ${performanceReviews.map(r => `
              <tr class="border-b border-dark-700/50">
                <td class="px-4 py-3 text-white font-medium">${r.employee_name || '—'}</td>
                <td class="px-4 py-3 text-gray-400">${r.period || '—'}</td>
                <td class="px-4 py-3 font-mono text-white">${r.rating != null ? r.rating : '—'}</td>
                <td class="px-4 py-3">
                  <span class="text-xs ${r.status === 'Completed' ? 'text-green-400' : r.status === 'In Progress' ? 'text-blue-400' : 'text-amber-400'}">${r.status || 'Pending'}</span>
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">${r.notes || '—'}</td>
                <td class="px-4 py-3">
                  <button onclick="deleteReview('${r.id}')" class="text-xs text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <div id="review-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div class="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-md mx-4">
        <div class="px-6 py-4 border-b border-dark-700 flex justify-between">
          <h2 class="text-lg font-semibold text-white">Add Performance Review</h2>
          <button onclick="closeReviewModal()" class="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <form id="review-form" class="p-6 space-y-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Employee Name *</label>
            <input id="rev-name" list="emp-list" required class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
            <datalist id="emp-list">${employees.map(e => `<option value="${e.name}">`).join('')}</datalist>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Period *</label>
            <input id="rev-period" required placeholder="e.g. Q3 2026" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Rating (1–5)</label>
              <input id="rev-rating" type="number" min="1" max="5" step="0.1" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Status</label>
              <select id="rev-status" class="w-full px-3 py-2 rounded-lg border text-sm text-white">
                <option>Pending</option><option>In Progress</option><option>Completed</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea id="rev-notes" rows="2" class="w-full px-3 py-2 rounded-lg border text-sm text-white"></textarea>
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" onclick="closeReviewModal()" class="px-4 py-2 rounded-lg border border-dark-600 text-sm text-gray-400">Cancel</button>
            <button type="submit" class="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function bindPerformance() {
  document.getElementById('review-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveReview();
  });
}
function openAddReviewModal() {
  document.getElementById('review-form')?.reset();
  document.getElementById('review-modal')?.classList.remove('hidden');
}
function closeReviewModal() {
  document.getElementById('review-modal')?.classList.add('hidden');
}

async function saveReview() {
  const payload = {
    employee_name: document.getElementById('rev-name').value.trim(),
    period: document.getElementById('rev-period').value.trim(),
    rating: Number(document.getElementById('rev-rating').value) || null,
    status: document.getElementById('rev-status').value,
    notes: document.getElementById('rev-notes').value.trim() || null
  };
  if (!sb) {
    performanceReviews.unshift({ id: String(Date.now()), ...payload, created_at: new Date().toISOString() });
    closeReviewModal();
    showToast('Review saved');
    document.getElementById('page-content').innerHTML = renderPerformance();
    bindPerformance();
    return;
  }
  try {
    const { error } = await sb.from('performance_reviews').insert(payload);
    if (error) throw error;
    closeReviewModal();
    showToast('Review saved');
    await loadPerformance();
    document.getElementById('page-content').innerHTML = renderPerformance();
    bindPerformance();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  if (!sb) {
    performanceReviews = performanceReviews.filter(r => r.id !== id);
    document.getElementById('page-content').innerHTML = renderPerformance();
    bindPerformance();
    return;
  }
  try {
    const { error } = await sb.from('performance_reviews').delete().eq('id', id);
    if (error) throw error;
    await loadPerformance();
    document.getElementById('page-content').innerHTML = renderPerformance();
    bindPerformance();
    showToast('Deleted');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function parseParticipantNames(t) {
  if (!t) return [];
  if (Array.isArray(t.participants)) return t.participants.filter(Boolean);
  if (typeof t.participants === 'string' && t.participants.trim()) {
    return t.participants.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function renderTraining() {
  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-white">Training</h1>
        <p class="text-sm text-gray-500 mt-1">Learning & development programs</p>
      </div>
      <button onclick="openAddTrainingModal()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">+ New Program</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      ${statCard('Programs', String(trainingPrograms.length), 'Active programs', 'text-gray-400')}
      ${statCard('Total Enrolled', String(trainingPrograms.reduce((s,t)=>s+Number(t.enrolled||parseParticipantNames(t).length||0),0)), 'Across all programs', 'text-gray-400')}
      ${statCard('Avg Completion', trainingPrograms.length ? Math.round(trainingPrograms.reduce((s,t)=>s+Number(t.progress||0),0)/trainingPrograms.length)+'%' : '—', 'Progress', 'text-green-400')}
    </div>
    <div class="space-y-4">
      ${trainingPrograms.length === 0 ? `
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-12 text-center text-gray-500">
          <p class="mb-3">No training programs yet.</p>
          <button onclick="openAddTrainingModal()" class="text-blue-400 text-sm">Create first program →</button>
        </div>
      ` : trainingPrograms.map(t => {
        const names = parseParticipantNames(t);
        const enrolled = Number(t.enrolled) || names.length || 0;
        return `
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-white">${t.title}</h3>
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-500">${t.completed || 0}/${enrolled} completed</span>
              <button onclick="deleteTraining('${t.id}')" class="text-xs text-red-400 hover:text-red-300">Delete</button>
            </div>
          </div>
          <div class="flex items-center gap-3 mb-3">
            <div class="flex-1 bg-dark-700 rounded-full h-2">
              <div class="bg-blue-500 h-2 rounded-full" style="width:${Math.min(100, Number(t.progress||0))}%"></div>
            </div>
            <span class="text-xs font-mono text-gray-400 w-10 text-right">${t.progress || 0}%</span>
          </div>
          ${names.length ? `
            <div class="pt-2 border-t border-dark-700">
              <div class="text-xs text-gray-500 mb-2">Participants (${names.length})</div>
              <div class="flex flex-wrap gap-2">
                ${names.map(n => `<span class="px-2 py-0.5 rounded-md bg-dark-600 text-xs text-gray-300">${n}</span>`).join('')}
              </div>
            </div>
          ` : `<div class="text-xs text-gray-600">No participant names added</div>`}
        </div>`;
      }).join('')}
    </div>

    <div id="training-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div class="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-dark-700 flex justify-between">
          <h2 class="text-lg font-semibold text-white">New Training Program</h2>
          <button onclick="closeTrainingModal()" class="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <form id="training-form" class="p-6 space-y-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Program Title *</label>
            <input id="tr-title" required class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Participant names</label>
            <textarea id="tr-participants" rows="4" class="w-full px-3 py-2 rounded-lg border text-sm text-white" placeholder="One name per line, or separated by commas&#10;e.g.&#10;Judith Mwangi&#10;John Doe&#10;Amina Hassan"></textarea>
            <p class="text-[10px] text-gray-500 mt-1">Enrolled count is calculated from the names you list</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Completed</label>
              <input id="tr-completed" type="number" min="0" value="0" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Progress %</label>
              <input id="tr-progress" type="number" min="0" max="100" value="0" class="w-full px-3 py-2 rounded-lg border text-sm text-white" />
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" onclick="closeTrainingModal()" class="px-4 py-2 rounded-lg border border-dark-600 text-sm text-gray-400">Cancel</button>
            <button type="submit" class="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function bindTraining() {
  document.getElementById('training-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveTraining();
  });
}
function openAddTrainingModal() {
  document.getElementById('training-form')?.reset();
  document.getElementById('training-modal')?.classList.remove('hidden');
}
function closeTrainingModal() {
  document.getElementById('training-modal')?.classList.add('hidden');
}

async function saveTraining() {
  const namesRaw = document.getElementById('tr-participants')?.value || '';
  const participants = namesRaw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const enrolled = participants.length;
  const completed = Number(document.getElementById('tr-completed').value) || 0;
  let progress = Number(document.getElementById('tr-progress').value);
  if (!progress && enrolled) progress = Math.round((completed / enrolled) * 100);
  const payload = {
    title: document.getElementById('tr-title').value.trim(),
    enrolled,
    completed,
    progress: progress || 0,
    participants
  };
  if (!sb) {
    trainingPrograms.unshift({ id: String(Date.now()), ...payload });
    closeTrainingModal();
    showToast('Program added');
    document.getElementById('page-content').innerHTML = renderTraining();
    bindTraining();
    return;
  }
  try {
    const { error } = await sb.from('training_programs').insert(payload);
    if (error) throw error;
    closeTrainingModal();
    showToast('Program added');
    await loadTraining();
    document.getElementById('page-content').innerHTML = renderTraining();
    bindTraining();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTraining(id) {
  if (!confirm('Delete this program?')) return;
  if (!sb) {
    trainingPrograms = trainingPrograms.filter(t => t.id !== id);
    document.getElementById('page-content').innerHTML = renderTraining();
    bindTraining();
    return;
  }
  try {
    const { error } = await sb.from('training_programs').delete().eq('id', id);
    if (error) throw error;
    await loadTraining();
    document.getElementById('page-content').innerHTML = renderTraining();
    bindTraining();
    showToast('Deleted');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================== INIT =====================
checkAuth();
