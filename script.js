// --- DATA STRUCTURES ---
let workspaceData = [];
let inboxData = [];
let journalData = {}; // Format: { "2023-11-19": [...] }

let activeView = 'inbox'; // 'inbox', 'daily', 'project'
let currentSectionIndex = 0;
let currentPageIndex = 0;
// Default to today (YYYY-MM-DD format)
let currentJournalDate = new Date().toISOString().split('T')[0]; 

document.addEventListener('DOMContentLoaded', () => {
    loadFromMemory();
    
    // Defaults if empty
    if (!workspaceData || workspaceData.length === 0) workspaceData = [{ title: "GENERAL", pages: [ { title: "Quick Notes", tasks: [] } ] }];
    if (!inboxData) inboxData = [];
    if (!journalData) journalData = {};

    // Set date picker to today
    const datePicker = document.getElementById('journalDatePicker');
    if(datePicker) datePicker.value = currentJournalDate;

    saveToMemory();
    switchToInbox(); 
});

function enterWorkspace() {
    document.getElementById('landingPage').style.opacity = '0';
    setTimeout(() => { document.getElementById('landingPage').style.display = 'none'; document.getElementById('appContainer').style.display = 'block'; }, 600);
}

function toggleSidebar() {
    document.getElementById('sidebarCol').classList.toggle('active');
    document.getElementById('mobileOverlay').classList.toggle('active');
}

// --- NAVIGATION ---
function switchToInbox() {
    activeView = 'inbox';
    updateUI();
}

function switchToDaily() {
    activeView = 'daily';
    // Ensure date is set
    if(!document.getElementById('journalDatePicker').value) {
        document.getElementById('journalDatePicker').value = new Date().toISOString().split('T')[0];
    }
    currentJournalDate = document.getElementById('journalDatePicker').value;
    updateUI();
}

function switchPage(s, p) {
    activeView = 'project';
    currentSectionIndex = s; currentPageIndex = p;
    updateUI();
}

function checkMobileMenu() {
    if (window.innerWidth < 768 && document.getElementById('sidebarCol').classList.contains('active')) {
        toggleSidebar();
    }
}

function updateUI() {
    checkMobileMenu();
    renderSidebar();
    renderContent();
}


// --- RENDER SIDEBAR ---
function renderSidebar() { 
    document.getElementById('inboxTab').classList.toggle('active', activeView === 'inbox'); 
    document.getElementById('dailyTab').classList.toggle('active', activeView === 'daily'); 
    document.getElementById('inboxCount').innerText = inboxData.length; 
    
    const container = document.getElementById('sidebarContent'); 
    container.innerHTML = ""; 
    
    // --- PART 1: PROJECTS (WORKSPACE) --- 
    if (workspaceData) { 
    workspaceData.forEach((section, secIndex) => { 
    const sectionDiv = document.createElement('div'); 
    sectionDiv.innerHTML = `<div class="section-header"><span>${section.title}</span><button class="btn-add-page-mini" onclick="addPageToSection(${secIndex})">+</button></div>`; 
    
    section.pages.forEach((page, pgIndex) => { 
    const pageDiv = document.createElement('div'); 
    const isActive = (activeView === 'project' && secIndex === currentSectionIndex && pgIndex === currentPageIndex) ? 'active' : ''; 
    pageDiv.className = `page-item ${isActive}`; 
    pageDiv.innerHTML = ` 
    <div class="page-content-wrapper" onclick="switchPage(${secIndex}, ${pgIndex})"> 
    <i class="far fa-file-alt me-2" style="opacity:0.7; font-size: 0.85rem;"></i><span class="text-truncate">${page.title}</span> 
    </div> 
    <button class="btn-delete-page-sidebar" onclick="event.stopPropagation(); deleteSpecificPage(${secIndex}, ${pgIndex})"><i class="fas fa-trash-alt" style="font-size: 0.8rem;"></i></button> 
    `;
    sectionDiv.appendChild(pageDiv);
    });
    container.appendChild(sectionDiv);
    });
    }
    
    // --- CHAPTER 2: JOURNAL HISTORY --- 
    const historyDiv = document.createElement('div'); 
    historyDiv.innerHTML = `<div class="section-header" style="margin-top:20px; border-top:1px solid #444; padding-top:10px;"><span>JOURNAL HISTORY</span></div>`; 

    const dates = Object.keys(journalData).sort().reverse(); 

    dates.forEach(date => { 
    if(journalData[date].length > 0) { 
    const dateItem = document.createElement('div'); 
    const isActive = (activeView === 'daily' && currentJournalDate === date) ? 'active' : ''; 
    dateItem.className = `page-item ${isActive}`; 

    // CHANGED HERE: Trash button added 
    dateItem.innerHTML = ` 
    <div class="page-content-wrapper" onclick="loadSpecificDate('${date}')"> 
    <i class="far fa-calendar-check me-2" style="opacity:0.7; font-size: 0.85rem;"></i> 
    <span>${date}</span> 
    </div> 
    <button class="btn-delete-page-sidebar" onclick="event.stopPropagation(); deleteJournalEntry('${date}')"> 
    <i class="fas fa-trash-alt" style="font-size: 0.8rem;"></i> 
    </button> 
    `; 
    historyDiv.appendChild(dateItem); 
    } 
    }); 

    if(dates.length > 0) container.appendChild(historyDiv);
    }

// --- CHANGE DATE ---
function changeJournalDate() {
    currentJournalDate = document.getElementById('journalDatePicker').value;
    renderContent();
}

// --- RENDER CONTENT ---
function renderContent() {
    const el = {
        titleBread: document.getElementById('pageTitleBread'),
        title: document.getElementById('pageTitleDisplay'),
        desc: document.getElementById('pageDescDisplay'),
        tableHeader: document.getElementById('tableHeaderRow'),
        datePicker: document.getElementById('datePickerContainer'),
        deleteDropdown: document.getElementById('pageOptionsDropdown'),
        priorityInput: document.getElementById('priorityInput'),
        folderName: document.getElementById('folderNameDisplay')
    };

    let tasksToRender = [];

    if (activeView === 'inbox') {
        el.folderName.innerText = "Home";
        el.titleBread.innerText = "Inbox";
        el.title.innerText = "Inbox";
        el.desc.innerText = "Dump your ideas. Sort them later.";
        tasksToRender = inboxData;

        el.tableHeader.style.display = "none";
        el.priorityInput.style.display = "none";
        el.deleteDropdown.style.display = "none";
        el.datePicker.style.display = "none";

    } else if (activeView === 'daily') { 
        // Date Formatting - (Corrected Version) 
        const [y, m, d] = currentJournalDate.split('-'); 
        const dateObj = new Date(y, m - 1, d); 
        const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); 
        
        el.folderName.innerText = "Journal"; 
        el.titleBread.innerText = currentJournalDate; 
        el.title.innerText = dateStr; 
        
        // NEW HERE: We add the button to the description section 
        el.desc.innerHTML = ` 
        Daily log and tasks. 
        <button onclick="finishDailyEntry()" style="margin-left:15px; padding: 4px 10px; font-size: 0.8rem; border-radius: 4px; background: #28a745; color: white; border: none; cursor: pointer;"> 
        <i class="fas fa-check"></i> Save & Reset to Today 
        </button> 
        `; 
        
        if (!journalData[currentJournalDate]) journalData[currentJournalDate] = []; 
        tasksToRender = journalData[currentJournalDate]; 
        
        el.tableHeader.style.display = "none"; 
        el.priorityInput.style.display = "none"; 
        el.deleteDropdown.style.display = "none"; 
        el.datePicker.style.display = "block"; 
        
    } else {
        // Project View
        const section = workspaceData[currentSectionIndex];
        if (!section || !section.pages[currentPageIndex]) {
             activeView = 'inbox'; updateUI(); return;
        }
        const page = section.pages[currentPageIndex];
        
        el.folderName.innerText = section.title;
        el.titleBread.innerText = page.title;
        el.title.innerText = page.title;
        el.desc.innerText = "Project Database";
        tasksToRender = page.tasks;

        el.tableHeader.style.display = "grid";
        el.priorityInput.style.display = "block";
        el.deleteDropdown.style.display = "block";
        el.datePicker.style.display = "none";
    }

    renderTasks(tasksToRender);
}

function renderTasks(tasks) {
    const listDiv = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    listDiv.innerHTML = "";

    if (tasks.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    tasks.forEach((task, index) => {
        const row = document.createElement('div');
        
        // Simple View for Inbox & Daily
        if (activeView === 'inbox' || activeView === 'daily') {
            row.className = "simple-todo-row";
            const isChecked = task.status === 'done' ? 'checked' : '';
            const textClass = task.status === 'done' ? 'completed' : '';
            row.innerHTML = `
                <div class="simple-checkbox ${isChecked}" onclick="cycleStatus(${index})"><i class="fas fa-check"></i></div>
                <div class="task-name ${textClass}">${task.text}</div>
                <button class="btn-delete-row" onclick="deleteTask(${index})"><i class="fas fa-trash-alt"></i></button>
            `;
        } else {
            // Table View for Projects
            row.className = "task-row";
            let statusClass = task.status === 'progress' ? "status-progress" : (task.status === 'done' ? "status-done" : "status-todo");
            let statusText = task.status === 'progress' ? "In progress" : (task.status === 'done' ? "Done" : "Not started");
            let priorityClass = `priority-${task.priority.toLowerCase()}`;
            row.innerHTML = `
                <div class="task-name ${task.status === 'done' ? 'completed' : ''}">${task.text}</div>
                <div onclick="cycleStatus(${index})" class="badge-select ${statusClass}">${statusText}</div>
                <div class="badge-select ${priorityClass}">${task.priority}</div>
                <button class="btn-delete-row" onclick="deleteTask(${index})"><i class="fas fa-trash-alt"></i></button>
            `;
        }
        listDiv.appendChild(row);
    });
}

// --- TASK ACTIONS ---
function addTask() {
    const input = document.getElementById('taskInput');
    const priority = document.getElementById('priorityInput').value;
    if(!input.value.trim()) return;

    const newTask = { text: input.value.trim(), status: "todo", priority: priority };

    if (activeView === 'inbox') {
        inboxData.push(newTask);
    } else if (activeView === 'daily') {
        if (!journalData[currentJournalDate]) journalData[currentJournalDate] = [];
        journalData[currentJournalDate].push(newTask);
    } else {
        workspaceData[currentSectionIndex].pages[currentPageIndex].tasks.push(newTask);
    }

    input.value = "";
    saveToMemory(); updateUI();
}

function cycleStatus(index) {
    let tasks;
    if (activeView === 'inbox') tasks = inboxData;
    else if (activeView === 'daily') tasks = journalData[currentJournalDate];
    else tasks = workspaceData[currentSectionIndex].pages[currentPageIndex].tasks;
    
    const task = tasks[index];
    
    if (activeView !== 'project') {
        task.status = (task.status === 'done') ? 'todo' : 'done';
    } else {
        if(task.status === 'todo') task.status = 'progress';
        else if(task.status === 'progress') task.status = 'done';
        else task.status = 'todo';
    }
    saveToMemory(); renderContent();
}

function deleteTask(index) {
    let tasks;
    if (activeView === 'inbox') tasks = inboxData;
    else if (activeView === 'daily') tasks = journalData[currentJournalDate];
    else tasks = workspaceData[currentSectionIndex].pages[currentPageIndex].tasks;
    
    tasks.splice(index, 1);
    saveToMemory(); updateUI();
}

// --- MANAGEMENT ---
function deleteSpecificPage(secIndex, pgIndex) {
    Swal.fire({ title: 'Delete page?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', background: '#333', color: '#fff' }).then((result) => {
        if (result.isConfirmed) {
            workspaceData[secIndex].pages.splice(pgIndex, 1);
            if (activeView === 'project' && secIndex === currentSectionIndex) {
                activeView = 'inbox';
            }
            saveToMemory(); updateUI();
        }
    });
}
function deleteCurrentPage() { deleteSpecificPage(currentSectionIndex, currentPageIndex); }
async function createSection() { const { value: t } = await Swal.fire({ title: 'New Section', input: 'text', background: '#333', color: '#fff' }); if(t) { workspaceData.push({title: t.toUpperCase(), pages:[]}); saveToMemory(); updateUI(); } }
async function addPageToSection(idx) { const { value: t } = await Swal.fire({ title: 'New Page', input: 'text', background: '#333', color: '#fff' }); if(t) { workspaceData[idx].pages.push({title: t, tasks:[]}); saveToMemory(); renderSidebar(); if(activeView !== 'project') switchPage(idx, workspaceData[idx].pages.length-1); } }

// --- STORAGE (v5) ---
function saveToMemory() { 
    localStorage.setItem('DB_Work_v5', JSON.stringify(workspaceData)); 
    localStorage.setItem('DB_Inbox_v5', JSON.stringify(inboxData)); 
    localStorage.setItem('DB_Journal_v5', JSON.stringify(journalData)); 
}
function loadFromMemory() { 
    const w = localStorage.getItem('DB_Work_v5'); 
    const i = localStorage.getItem('DB_Inbox_v5'); 
    const j = localStorage.getItem('DB_Journal_v5');
    if(w) workspaceData = JSON.parse(w); 
    if(i) inboxData = JSON.parse(i);
    if(j) journalData = JSON.parse(j);
}

document.getElementById('taskInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') addTask(); });

// --- JOURNAL ACTIONS ---

// Clicking on an older date from the menu opens that day.
function loadSpecificDate(date) {
    activeView = 'daily';
    currentJournalDate = date;
    // Update the date picker as well.
    const dp = document.getElementById('journalDatePicker');
    if(dp) dp.value = date;
    updateUI();
    }
    
    // Runs when the "Save & Reset" button is clicked.
    function finishDailyEntry() {
    // 1. Save the data.
    saveToMemory();
    
    // 2. Set the date to TODAY.
    const today = new Date();
    // Manual string creation to avoid local time zone differences:
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0'); 
    const todayStr = `${year}-${month}-${day}`; 
    
    currentJournalDate = todayStr; 
    
    // 3. Update input 
    const dp = document.getElementById('journalDatePicker'); 
    if(dp) dp.value = todayStr; 
    
    // 4. Give visual feedback to the user 
    if(typeof Swal !== 'undefined') { 
    Swal.fire({ 
    position: 'top-end', 
    icon: 'success', 
    title: 'Journal Saved', 
    text: 'Returned to today.', 
    showConfirmButton: false, 
    timer: 1500, 
    background: '#333', 
    color: '#fff', 
    width: '300px' 
    }); 
    } 
    
    // 5. Refresh screen 
    updateUI();
    }
    
    // Runs when you click the trash can.
    function deleteJournalEntry(date) {
    Swal.fire({
    title: 'Delete entry?',
    text: `Journal for ${date} will be deleted.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    background: '#333',
    color: '#fff'
    }).then((result) => {
    if (result.isConfirmed) {
    // 1. Delete the data from the object
    delete journalData[date];
    
    // 2. If we are currently looking at the deleted date, scroll the page to today.
    if (currentJournalDate === date) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); 
    const day = String(today.getDate()).padStart(2, '0'); 
    currentJournalDate = `${year}-${month}-${day}`; 
    
    const dp = document.getElementById('journalDatePicker'); 
    if(dp) dp.value = currentJournalDate; 
    } 
    
    // 3. Save and Refresh Interface 
    saveToMemory(); 
    updateUI(); 
    } 
    });
    }