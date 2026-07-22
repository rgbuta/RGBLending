/**
 * RGB Lending System - Core Production Engine (PART 1)
 * Driven entirely by Browser localStorage
 */

let loanRecords = [];
let currentPaymentsArray = []; 
let currentActiveFilter = 'ALL';
let privacyState = {
    totalOwed: true,
    totalInterest: true
};

// DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const mainContainer = document.getElementById('mainContainer');
const loanModal = document.getElementById('loanModal'); 
const loanForm = document.getElementById('loanForm');
const modalTitle = document.getElementById('modalTitle');
const btnUpdate = document.getElementById('btnUpdate');
const btnAddSubmit = document.getElementById('btnAddSubmit');
const searchInput = document.getElementById('searchInput');
const recordsTableBody = document.getElementById('recordsTableBody');

const totalOwedEl = document.getElementById('totalOwed');
const totalInterestEl = document.getElementById('totalInterest');
const totalCountEl = document.getElementById('totalCount');
const recordCountEl = document.getElementById('recordCount');

const amountField = document.getElementById('loanAmount');
const rateField = document.getElementById('interestRate');
const calculatedInterestField = document.getElementById('interestAmount');
const contactField = document.getElementById('borrowerContact');

// Initialize Toast Container
const toastContainer = document.createElement('div');
toastContainer.className = 'fb-toast-container';
document.body.appendChild(toastContainer);

// UI Input Control Engine
function handleStatusFieldToggle() {
    const statusField = document.getElementById('paymentStatus');
    const dueDateField = document.getElementById('dueDate');
    
    if (!statusField || !dueDateField) return;
    
    if (statusField.value === 'Paid') {
        dueDateField.disabled = true;
        dueDateField.style.backgroundColor = '#e0e0e0'; // Grays out input background
        dueDateField.style.opacity = '0.6';
        dueDateField.style.cursor = 'not-allowed';
    } else {
        dueDateField.disabled = false;
        dueDateField.style.backgroundColor = '';
        dueDateField.style.opacity = '';
        dueDateField.style.cursor = '';
    }
}

// Calculations Engine
function autoCalculateMonthlyInterest() {
    if (!amountField || !rateField || !calculatedInterestField) return;
    const amount = parseFloat(amountField.value) || 0;
    const rate = parseFloat(rateField.value) || 0;
    const computedInterest = amount * (rate / 100);
    
    if (computedInterest > 0) {
        calculatedInterestField.value = "₱" + computedInterest.toLocaleString(undefined, {minimumFractionDigits: 2});
    } else {
        calculatedInterestField.value = "";
    }
}

function autoCalculateDueDate() {
    const startDateField = document.getElementById('startDate');
    const dueDateField = document.getElementById('dueDate');
    const statusField = document.getElementById('paymentStatus');
    
    // Do not alter or calculate due dates if field is disabled via Paid status
    if (!startDateField || !startDateField.value || !dueDateField || (statusField && statusField.value === 'Paid')) return;
    
    const releaseDate = new Date(startDateField.value);
    releaseDate.setMonth(releaseDate.getMonth() + 1);
    const year = releaseDate.getFullYear();
    const month = String(releaseDate.getMonth() + 1).padStart(2, '0');
    const day = String(releaseDate.getDate()).padStart(2, '0');

    dueDateField.value = `${year}-${month}-${day}`;
}

if (amountField && rateField) {
    amountField.addEventListener('input', autoCalculateMonthlyInterest);
    rateField.addEventListener('input', autoCalculateMonthlyInterest);
}

const startDateField = document.getElementById('startDate');
if (startDateField) {
    startDateField.addEventListener('change', autoCalculateDueDate);
}

const statusDropdown = document.getElementById('paymentStatus');
if (statusDropdown) {
    statusDropdown.addEventListener('change', handleStatusFieldToggle);
}

// Payment Sub-form Management
function addNewPaymentRow() {
    const dateInput = document.getElementById('payDate');
    const amountInput = document.getElementById('payAmount');

    if (!dateInput || !dateInput.value || !amountInput || !amountInput.value || parseFloat(amountInput.value) <= 0) {
        alert('Mangyaring ilagay ang tamang Date at Amount ng bayad, boss.');
        return;
    }
    currentPaymentsArray.push({
        date: dateInput.value,
        amount: parseFloat(amountInput.value)
    });

    amountInput.value = '';
    renderPaymentHistoryInModal();
    
    const recordIdEl = document.getElementById('recordId');
    const recordId = recordIdEl ? String(recordIdEl.value).trim() : '';
    if (recordId) {
        const index = loanRecords.findIndex(r => String(r.id).trim() === recordId);
        if (index !== -1) {
            loanRecords[index].payments = [...currentPaymentsArray];
            saveData(); 
        }
    }
}
window.addNewPaymentRow = addNewPaymentRow;

function removePaymentRow(index) {
    currentPaymentsArray.splice(index, 1);
    renderPaymentHistoryInModal();
    
    const recordIdEl = document.getElementById('recordId');
    const recordId = recordIdEl ? String(recordIdEl.value).trim() : '';
    if (recordId) {
        const loanIndex = loanRecords.findIndex(r => String(r.id).trim() === recordId);
        if (loanIndex !== -1) {
            loanRecords[loanIndex].payments = [...currentPaymentsArray];
            saveData();
        }
    }
}
window.removePaymentRow = removePaymentRow;

function renderPaymentHistoryInModal() {
    const container = document.getElementById('paymentHistoryListWrapper');
    if (!container) return;

    if (currentPaymentsArray.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#95a5a6; font-size:0.85em; padding:10px 0;">Walang nakatalang kasaysayan ng bayad.</div>`;
        return;
    }

    currentPaymentsArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = '';
    currentPaymentsArray.forEach((pay, index) => {
        const itemRow = document.createElement('div');
        itemRow.style = "display:flex; justify-content:space-between; align-items:center; background:white; padding:6px 10px; border-radius:4px; margin-bottom:6px; border:1px solid #e0e0e0; font-size:0.85em;";
        itemRow.innerHTML = `
            <div>📅 <strong>${pay.date}</strong> &nbsp;|&nbsp; 💰 <span style="color:#27ae60; font-weight:bold;">₱${pay.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
            <button type="button" onclick="removePaymentRow(${index})" style="background:#e74c3c; color:white; padding:3px 8px; font-size:0.8em; border-radius:3px; border:none; cursor:pointer;">Burahin</button>
        `;
        container.appendChild(itemRow);
    });
}

// Protected Status Overrides Engine
function checkAndAutoUpdateStatuses() {
    const today = new Date();
    today.setHours(0,0,0,0);
    let hasChanges = false;

    loanRecords.forEach(record => {
        const computedInterest = record.amount * (record.interest / 100);
        const totalDue = record.amount + computedInterest;
        const totalPaidSoFar = record.payments ? record.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
        const isFullyPaid = totalPaidSoFar >= totalDue;

        if (isFullyPaid) {
            if (record.status !== 'Paid') {
                record.status = 'Paid';
                hasChanges = true;
            }
        } else {
            if (record.status === 'Paid' && !isFullyPaid) {
                record.status = 'In Progress';
                hasChanges = true;
            }
            
            // Allow manual status settings ('In Progress' or 'Upcoming') to persist unless overdue
            if (record.dueDate && record.status !== 'In Progress' && record.status !== 'Upcoming') {
                const dueDateObj = new Date(record.dueDate);
                dueDateObj.setHours(0,0,0,0);

                if (dueDateObj < today) {
                    if (record.status !== 'Overdue') {
                        record.status = 'Overdue';
                        hasChanges = true;
                    }
                }
            }
        }
    });

    if (hasChanges) {
        localStorage.setItem('rgb_loan_records_v3', JSON.stringify(loanRecords));
    }
}

// Notification Toasts System
function showFBToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `fb-toast ${type}`; 
    const icon = type === 'overdue' ? '🚨' : '⚠️';

    toast.innerHTML = `
        <div class="fb-toast-icon">${icon}</div>
        <div class="fb-toast-content">
            <div class="fb-toast-title">${title}</div>
            <div class="fb-toast-body">${message}</div>
        </div>
        <button class="fb-toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 7000);
}

function triggerSystemAlertToasts() {
    toastContainer.innerHTML = '';
    loanRecords.forEach(r => {
        if (r.status === 'Overdue') {
            showFBToast('overdue', 'System Alert: Overdue Account', `Si <strong>${r.name}</strong> ay lumagpas na sa takdang petsa noong ${r.dueDate}. Mangyaring singilin agad, boss.`);
        } else if (r.status === 'Upcoming') {
            showFBToast('upcoming', 'Reminder: Upcoming Due Date', `Malapit na ang sisingilin kay <strong>${r.name}</strong> sa darating na ${r.dueDate}.`);
        }
    });
}

/**
 * RGB Lending System - Core Production Engine (PART 2)
 * Driven entirely by Browser localStorage
 */

// Auth Handlers
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

function handleLogin(e) {
    e.preventDefault();
    const userField = document.getElementById('username');
    const passField = document.getElementById('password');
    const errorDiv = document.getElementById('loginError');

    if (userField && passField && userField.value === 'admin' && passField.value === 'rgb123') {
        if (errorDiv) errorDiv.style.display = 'none';
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block';
        
        loadData(); 
        triggerSystemAlertToasts();
    } else {
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'Maling username o password, boss!';
        }
    }
}

function logout() {
    if (confirm('Sigurado ka bang nais mong mag-logout?')) {
        if (mainContainer) mainContainer.style.display = 'none';
        if (loginOverlay) loginOverlay.style.display = 'flex';
    }
}
window.logout = logout;

// Modal Configuration with Input Lock Callbacks
function openModal(mode = 'add', recordId = null) {
    if (loanForm) loanForm.reset(); 
    
    currentPaymentsArray = [];
    const payDateInput = document.getElementById('payDate');
    if (payDateInput) payDateInput.value = new Date().toISOString().slice(0, 10);
    if (calculatedInterestField) calculatedInterestField.value = '';

    const hiddenIdInput = document.getElementById('recordId');
    if (hiddenIdInput) hiddenIdInput.value = '';

    if (mode === 'add') {
        if (modalTitle) modalTitle.textContent = 'Add New Loan Record';
        if (btnUpdate) btnUpdate.style.display = 'none';
        if (btnAddSubmit) btnAddSubmit.style.display = 'block';
        renderPaymentHistoryInModal();
    } else if (mode === 'edit') {
        if (modalTitle) modalTitle.textContent = 'Edit Loan Record';
        if (btnUpdate) btnUpdate.style.display = 'block';
        if (btnAddSubmit) btnAddSubmit.style.display = 'none';
        
        if (recordId) {
            if (hiddenIdInput) hiddenIdInput.value = String(recordId).trim();
            populateForm(String(recordId).trim()); 
        }
    }

    handleStatusFieldToggle(); // Check locks instantly upon display
    if (loanModal) loanModal.style.display = 'flex'; 
    document.body.style.overflow = 'hidden'; 
}
window.openModal = openModal;

function closeModal() {
    if (loanModal) loanModal.style.display = 'none';
    document.body.style.overflow = 'auto'; 
}
window.closeModal = closeModal;

window.addEventListener('click', function(e) {
    if (e.target === loanModal) closeModal();
});

// Storage Synchronization 
function loadData() {
    const savedData = localStorage.getItem('rgb_loan_records_v3');
    loanRecords = savedData ? JSON.parse(savedData) : [];
    
    checkAndAutoUpdateStatuses();
    updateDashboard();
    
    const activeBtn = document.querySelector('.filter-btn.active') || document.querySelector('.filter-all');
    filterRecords(currentActiveFilter, activeBtn);
    
    checkNotifications();
}

function saveData() {
    localStorage.setItem('rgb_loan_records_v3', JSON.stringify(loanRecords));
    
    checkAndAutoUpdateStatuses();
    updateDashboard();
    
    const activeBtn = document.querySelector('.filter-btn.active') || document.querySelector('.filter-all');
    filterRecords(currentActiveFilter, activeBtn);
    
    checkNotifications();
}

function populateForm(id) {
    const record = loanRecords.find(r => String(r.id).trim() === String(id).trim());
    if (!record) return;

    if (document.getElementById('borrowerName')) document.getElementById('borrowerName').value = record.name;
    if (contactField) contactField.value = record.contact || ''; 
    if (document.getElementById('loanAmount')) document.getElementById('loanAmount').value = record.amount;
    if (document.getElementById('interestRate')) document.getElementById('interestRate').value = record.interest;
    if (document.getElementById('startDate')) document.getElementById('startDate').value = record.startDate;
    if (document.getElementById('dueDate')) document.getElementById('dueDate').value = record.dueDate;
    if (document.getElementById('paymentStatus')) document.getElementById('paymentStatus').value = record.status;
    
    currentPaymentsArray = record.payments ? [...record.payments] : [];
    
    autoCalculateMonthlyInterest();
    renderPaymentHistoryInModal();
    handleStatusFieldToggle(); // Evaluate locks immediately after data binding
}

// Form Submission Pipe with Balanced Ledger Logic
if (loanForm) {
    loanForm.removeAttribute('onsubmit');
    
    loanForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const recordId = document.getElementById('recordId').value ? String(document.getElementById('recordId').value).trim() : "";
        const selectedStatus = document.getElementById('paymentStatus').value;
        const borrowerName = document.getElementById('borrowerName').value;
        const borrowerContactStr = contactField ? contactField.value.trim() : ''; 
        
        const recordData = {
            name: borrowerName,
            contact: borrowerContactStr || 'N/A', 
            amount: parseFloat(document.getElementById('loanAmount').value) || 0,
            interest: parseFloat(document.getElementById('interestRate').value) || 0,
            startDate: document.getElementById('startDate').value,
            dueDate: document.getElementById('dueDate').value, 
            status: selectedStatus,
            payments: [...currentPaymentsArray]
        };

        // AUTO-SETTLE BALANCE ENFORCEMENT: Add virtual payment line if manually closed as Paid
        if (selectedStatus === 'Paid') {
            const computedInterest = recordData.amount * (recordData.interest / 100);
            const totalDue = recordData.amount + computedInterest;
            const totalPaidSoFar = recordData.payments.reduce((sum, p) => sum + p.amount, 0);
            
            if (totalPaidSoFar < totalDue) {
                const remainingBalance = totalDue - totalPaidSoFar;
                recordData.payments.push({
                    date: new Date().toISOString().slice(0, 10),
                    amount: remainingBalance
                });
            }
        }

        if (recordId !== "") {
            const index = loanRecords.findIndex(r => String(r.id).trim() === recordId);
            if (index !== -1) {
                recordData.id = recordId;
                loanRecords[index] = { ...loanRecords[index], ...recordData };
            } else {
                alert(`Error: Hindi mahanap ang Record ID (${recordId}) sa memory, boss.`);
                return;
            }
        } else {
            let nextNumber = 1;
            if (loanRecords.length > 0) {
                const ids = loanRecords.map(r => {
                    if (r.id && String(r.id).startsWith('ID-')) {
                        return parseInt(String(r.id).replace('ID-', '')) || 0;
                    }
                    return 0;
                });
                nextNumber = Math.max(...ids, 0) + 1;
            }
            recordData.id = 'ID-' + String(nextNumber).padStart(3, '0');
            loanRecords.push(recordData);
        }

        saveData();
        closeModal();
    });
}

function deleteRecord(id) {
    if (confirm('Sigurado ka bang nais mong burahin ang record na ito?')) {
        loanRecords = loanRecords.filter(r => String(r.id).trim() !== String(id).trim());
        saveData();
    }
}
window.deleteRecord = deleteRecord;

// Rendering Pipeline
function renderTable(records) {
    if (!recordsTableBody) return;
    recordsTableBody.innerHTML = '';

    if (records.length === 0) {
        recordsTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:#7f8c8d;">Walang natagpuang record.</td></tr>`;
        if (recordCountEl) recordCountEl.textContent = '0 record(s) found';
        return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    records.forEach(record => {
        const tr = document.createElement('tr');
        const computedInterestAmount = record.amount * (record.interest / 100);
        const cleanStatusClass = record.status.toLowerCase().replace(/\s+/g, '').replace('-', '');
        const totalPaidSoFar = record.payments ? record.payments.reduce((sum, p) => sum + p.amount, 0) : 0;

        let historyHTML = '';
        if (record.payments && record.payments.length > 0) {
            const sortedPayments = [...record.payments].sort((a, b) => new Date(b.date) - new Date(a.date));
            sortedPayments.forEach(p => {
                historyHTML += `<div style="margin-bottom:4px; border-bottom:1px dashed #e0e0e0; padding-bottom:2px;">📅 ${p.date} - <span style="color:#27ae60; font-weight:bold;">₱${p.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</span></div>`;
            });
            historyHTML += `<div style="margin-top:6px; font-weight:bold; color:#2c3e50; font-size:0.95em;">Total Paid: ₱${totalPaidSoFar.toLocaleString(undefined, {minimumFractionDigits:2})}</div>`;
        } else {
            historyHTML = `<span style="color:#95a5a6; font-style:italic;">No payments recorded</span>`;
        }

        let dueDateDisplay = record.dueDate;
        if (record.status === 'Paid') {
            dueDateDisplay = `<span style="color:#7f8c8d; text-decoration: line-through;">${record.dueDate}</span> <br><small style="color:#27ae60; font-weight:bold;">(Settled)</small>`;
        } else if (record.dueDate) {
            const dueDateObj = new Date(record.dueDate);
            dueDateObj.setHours(0,0,0,0);
            const timeDiff = dueDateObj.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            if (daysDiff < 0) {
                const absDays = Math.abs(daysDiff);
                dueDateDisplay = `
                    <span class="highlight-overdue-date" style="display:block; text-align:center;">⚠️ ${record.dueDate}</span>
                    <small style="color:#e74c3c; font-weight:bold; display:block; text-align:center; margin-top:2px;">(${absDays} ${absDays === 1 ? 'day' : 'days'} Overdue)</small>
                `;
            } else if (daysDiff === 0) {
                dueDateDisplay = `
                    <span class="highlight-overdue-date" style="background-color:#fff3cd !important; color:#856404 !important; border-color:#ffeeba !important; display:block; text-align:center;">📅 ${record.dueDate}</span>
                    <small style="color:#856404; font-weight:bold; display:block; text-align:center; margin-top:2px;">(Due Today!)</small>
                `;
            } else {
                dueDateDisplay = `
                    <span style="font-weight:bold;">${record.dueDate}</span>
                    <small style="color:#2980b9; display:block; margin-top:2px;">(${daysDiff} ${daysDiff === 1 ? 'day' : 'days'} left)</small>
                `;
            }
        }

        tr.innerHTML = `
            <td data-label="Borrower Name & ID"><small style="opacity:0.7;">${record.id}</small><br><strong>${record.name}</strong> </td>
            <td data-label="Contact Number"><strong>${record.contact}</strong></td>
            <td data-label="Loan Amount (₱)">₱${record.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td data-label="Monthly Interest (%)">${record.interest}%</td>
            <td data-label="Month Interest Amount (₱)" style="color:#27ae60; font-weight:bold;">₱${computedInterestAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td data-label="Loan Released">${record.startDate}</td>
            <td data-label="Due Date">${dueDateDisplay}</td>
            <td data-label="Loan Status"><span class="status status-${cleanStatusClass}">${record.status}</span></td>
            <td data-label="Payment History & Notes" style="max-width:260px; font-size:0.82em; text-align:left; line-height:1.4;">${historyHTML}</td>
            <td data-label="Actions">
                <div style="display:flex; gap:5px; justify-content:center; width:100%;">
                    <button class="btn-edit" onclick="openModal('edit', '${record.id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteRecord('${record.id}')">Del</button>
                </div>
            </td>
        `;
        recordsTableBody.appendChild(tr);
    });

    if (recordCountEl) recordCountEl.textContent = `${records.length} record(s) found`;
}

function updateDashboard() {
    let totalOwed = 0;
    let totalInterestRevenue = 0;

    loanRecords.forEach(r => {
        const computedInterest = r.amount * (r.interest / 100);
        const totalDue = r.amount + computedInterest;
        const totalPaid = r.payments ? r.payments.reduce((sum, p) => sum + p.amount, 0) : 0;

        if (r.status.trim().toLowerCase() !== 'paid') {
            const balanceLeft = totalDue - totalPaid;
            totalOwed += (balanceLeft > 0 ? balanceLeft : 0);
            totalInterestRevenue += computedInterest;
        }
    });
    const formattedOwed = '₱' + totalOwed.toLocaleString(undefined, {minimumFractionDigits: 2});
    const formattedInterest = '₱' + totalInterestRevenue.toLocaleString(undefined, {minimumFractionDigits: 2});

    if (totalOwedEl) {
        totalOwedEl.setAttribute('data-value', formattedOwed);
        totalOwedEl.textContent = privacyState.totalOwed ? "••••••" : formattedOwed;
    }
    
    if (totalInterestEl) {
        totalInterestEl.setAttribute('data-value', formattedInterest);
        totalInterestEl.textContent = privacyState.totalInterest ? "••••••" : formattedInterest;
    }

    if (totalCountEl) {
        totalCountEl.textContent = loanRecords.filter(r => r.status.trim().toLowerCase() !== 'paid').length;
    }
}

if (searchInput) {
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const filtered = loanRecords.filter(r => 
            r.name.toLowerCase().includes(query) || 
            r.id.toLowerCase().includes(query) ||
            r.status.toLowerCase().includes(query) ||
            (r.contact && r.contact.toLowerCase().includes(query)) 
        );
        renderTable(filtered);
    });
}

function filterRecords(statusType, currentButton) {
    currentActiveFilter = statusType;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (currentButton) {
        currentButton.classList.add('active');
    }

    const targetStatus = statusType.trim().toLowerCase();
    if (targetStatus === 'all') {
        renderTable(loanRecords);
    } else if (targetStatus === 'active') {
        renderTable(loanRecords.filter(r => r.status.trim().toLowerCase() !== 'paid'));
    } else {
        renderTable(loanRecords.filter(r => r.status.trim().toLowerCase() === targetStatus));
    }
}
window.filterRecords = filterRecords;

// Security Display Toggles
function togglePrivacy(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const eyeBtn = element.nextElementSibling;
    const realValue = element.getAttribute('data-value') || "₱0.00";

    if (privacyState[elementId]) {
        element.textContent = realValue;
        privacyState[elementId] = false;
        element.style.letterSpacing = "normal";
        if (eyeBtn) {
            eyeBtn.textContent = "🙈"; 
            eyeBtn.title = "Hide";
        }
    } else {
        element.textContent = "••••••";
        privacyState[elementId] = true;
        element.style.letterSpacing = "2px";
        if (eyeBtn) {
            eyeBtn.textContent = "👁️";
            eyeBtn.title = "Show";
        }
    }
}
window.togglePrivacy = togglePrivacy;

// Notification Board Subsystems
function checkNotifications() {
    const toggleBtn = document.getElementById('notifToggle');
    const bodyContainer = document.getElementById('notifBody');
    if (!toggleBtn || !bodyContainer) return;

    const urgentRecords = loanRecords.filter(r => r.status === 'Overdue' || r.status === 'Upcoming');
    
    if (urgentRecords.length > 0) {
        toggleBtn.classList.add('show');
        if (document.getElementById('notifBadge')) document.getElementById('notifBadge').textContent = urgentRecords.length;
        if (document.getElementById('notifPanelBadge')) document.getElementById('notifPanelBadge').textContent = urgentRecords.length;
        
        bodyContainer.innerHTML = '';
        urgentRecords.forEach(r => {
            const item = document.createElement('div');
            item.className = `notif-item ${r.status.toLowerCase().replace('-', '')}`;
            item.onclick = function() { openModal('edit', r.id); toggleNotifPanel(); };
            item.innerHTML = `<div class="notif-name">${r.name}</div><div class="notif-details">Status: <strong>${r.status}</strong><br>Due: <span>${r.dueDate}</span></div>`;
            bodyContainer.appendChild(item);
        });
    } else {
        toggleBtn.classList.remove('show');
    }
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.toggle('hidden');
}
window.toggleNotifPanel = toggleNotifPanel;
// --- Portability Backups Engine (Stream-Based RFC 4180 Parser) ---
function exportToCSV() {
    if (loanRecords.length === 0) { alert('Walang data na pwedeng i-export.'); return; }
    
    // Add UTF-8 BOM to prevent character corruption in Excel
    let csvContent = "\uFEFF" + "ID,Borrower Name,Contact Number,Loan Amount,Interest Rate,Start Date,Due Date,Status,PaymentsJSON\r\n";
    
    loanRecords.forEach(r => {
        // Enforce strict JSON minimization to strip out structural spaces and newlines
        const paymentsEscaped = JSON.stringify(r.payments || []).replace(/"/g, '""');
        const cleanName = (r.name || '').replace(/"/g, '""');
        const cleanContact = (r.contact || 'N/A').replace(/"/g, '""');
        
        csvContent += `"${r.id}","${cleanName}","${cleanContact}",${r.amount},${r.interest},"${r.startDate}","${r.dueDate}","${r.status}","${paymentsEscaped}"\r\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); 
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `RGB_Lending_Backup_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
}
window.exportToCSV = exportToCSV;

/**
 * Full Text Stream RFC 4180 Parser
 * Tracks quote states continuously across text segments to protect embedded arrays
 */
function parseFullCSVText(text) {
    let lines = [];
    let currentLine = [];
    let currentField = '';
    let insideQuotes = false;

    // Normalize incoming line endings safely
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < cleanText.length; i++) {
        let char = cleanText[i];
        let nextChar = cleanText[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Read escaped double quote pairs ("") as a single literal quote
                currentField += '"';
                i++; 
            } else {
                // Toggle state when encountering single quote bounds
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentLine.push(currentField);
            currentField = '';
        } else if (char === '\n' && !insideQuotes) {
            currentLine.push(currentField);
            lines.push(currentLine);
            currentLine = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    // Catch hanging tail metrics if final clean line lacks trailing delimiter breaks
    if (currentField || currentLine.length > 0) {
        currentLine.push(currentField);
        lines.push(currentLine);
    }

    return lines;
}

function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        
        // Extract raw multi-dimensional text parameters cleanly
        const allParsedRows = parseFullCSVText(text);
        
        let importedCount = 0;
        let newRecords = [];

        // Begin extraction loop at row 1 to safely bypass column headers
        for (let i = 1; i < allParsedRows.length; i++) {
            const columns = allParsedRows[i];
            
            // Skip broken blank rows at the footer boundary
            if (columns.length < 8 || (columns.length === 1 && columns[0] === '')) continue;

            const id = columns[0].trim();
            const name = columns[1].trim();
            const contact = columns[2].trim(); 
            const amount = parseFloat(columns[3]) || 0;
            const interest = parseFloat(columns[4]) || 0;
            const startDate = columns[5].trim();
            const dueDate = columns[6].trim();
            const status = columns[7].trim();
            
            let payments = [];
            if (columns[8]) {
                try {
                    // Re-bind the continuous text data back to actual active arrays
                    payments = JSON.parse(columns[8].trim());
                } catch(err) { 
                    console.error("Payment parse error at row " + i, err);
                    payments = []; 
                }
            }

            newRecords.push({ id, name, contact, amount, interest, startDate, dueDate, status, payments });
            importedCount++;
        }

        if (newRecords.length > 0) {
            loanRecords = newRecords;
            saveData();
            alert(`Salamat, boss! Matagumpay na na-import ang ${importedCount} records kasama ang kanilang payment history at loan status.`);
        } else {
            alert('Maling CSV format ang na-upload, boss.');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}
window.importCSV = importCSV;

// System Setup Orchestration
document.addEventListener("DOMContentLoaded", () => {
    const btnAll = document.querySelector('.filter-all');
    const btnActive = document.querySelector('.filter-active');
    const btnOverdue = document.querySelector('.status-overdue');
    const btnPaid = document.querySelector('.status-paid');

    if (btnAll) btnAll.addEventListener('click', (e) => filterRecords('ALL', e.currentTarget));
    if (btnActive) btnActive.addEventListener('click', (e) => filterRecords('ACTIVE', e.currentTarget));
    if (btnOverdue) btnOverdue.addEventListener('click', (e) => filterRecords('Overdue', e.currentTarget));
    if (btnPaid) btnPaid.addEventListener('click', (e) => filterRecords('Paid', e.currentTarget));
    
    loadData();
});