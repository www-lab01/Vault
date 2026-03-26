// JSONBin Configuration - YOUR CREDENTIALS
const API_KEY = "$2a$10$5SepU9r2PraMpGxplhm/Cu7O03sM2xA4p32tLGV0dQzhrnwl1S33K";
const BIN_ID = "69c2c25eb7ec241ddc9c01f5";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const HEADERS = {
    'Content-Type': 'application/json',
    'X-Master-Key': API_KEY
};

// App State
let currentUser = null;
let posts = [];
let notes = [];
let videos = [];
let chats = {};
let updates = [];
let complaints = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// Authentication
async function login() {
    const studentId = document.getElementById('loginStudentId').value;
    const password = document.getElementById('loginPassword').value;
    
    // Demo users
    const demoUsers = {
        'STUDENT001': { name: 'John Doe', avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=667eea&color=fff', dept: 'CS', year: '2nd' },
        'STUDENT002': { name: 'Jane Smith', avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=f093fb&color=fff', dept: 'ECE', year: '3rd' },
        'STUDENT003': { name: 'Mike Johnson', avatar: 'https://ui-avatars.com/api/?name=Mike+Johnson&background=667eea&color=fff', dept: 'Mech', year: '1st' }
    };
    
    if (demoUsers[studentId]) {
        currentUser = { id: studentId, ...demoUsers[studentId] };
        localStorage.setItem('collegehub_user', JSON.stringify(currentUser));
        document.getElementById('loginModal').classList.remove('active');
        updateUserUI();
        loadAllData();
    } else {
        alert('Invalid credentials!\nDemo accounts:\nSTUDENT001/123456\nSTUDENT002/123456\nSTUDENT003/123456');
    }
}

function checkAuth() {
    const user = localStorage.getItem('collegehub_user');
    if (user) {
        currentUser = JSON.parse(user);
        document.getElementById('loginModal').classList.remove('active');
        updateUserUI();
        loadAllData();
    }
}

function updateUserUI() {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userAvatar').src = currentUser.avatar;
}

// Event Listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = e.target.dataset.tab;
            switchTab(targetTab);
        });
    });

    // Modals
    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Post image
    document.getElementById('postImage').addEventListener('change', handleImageUpload);

    // Enter key support
    document.getElementById('postContent').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            createPost();
        }
    });

    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

function logout() {
    localStorage.removeItem('collegehub_user');
    currentUser = null;
    document.getElementById('loginModal').classList.add('active');
}

// JSONBin API Functions
async function apiRequest(path = '', options = {}) {
    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers: {
                ...HEADERS,
                ...options.headers
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

async function loadAllData() {
    const data = await apiRequest('', { method: 'GET' });
    if (data?.record) {
        const db = data.record;
        posts = db.posts || [];
        notes = db.notes || [];
        videos = db.videos || [];
        chats = db.chats || {};
        updates = db.updates || [];
        complaints = db.complaints || [];
        
        renderPosts();
        renderNotes();
        renderVideos();
        renderChats();
        renderUpdates();
        renderComplaints();
    } else {
        // Initialize empty database
        await initializeDatabase();
    }
}

async function initializeDatabase() {
    const initialData = {
        posts: [],
        notes: [],
        videos: [],
        chats: { general: [] },
        updates: [],
        complaints: []
    };
    await apiRequest('', {
        method: 'PUT',
        body: JSON.stringify(initialData)
    });
}

// Posts
async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    if (!content || !currentUser) return;

    const post = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        content,
        image: null,
        likes: [],
        comments: [],
        timestamp: new Date().toISOString()
    };

    posts.unshift(post);
    document.getElementById('postContent').value = '';
    await saveData();
    renderPosts();
}

function renderPosts() {
    const container = document.getElementById('postsContainer');
    container.innerHTML = posts.map(post => `
        <div class="post">
            <div class="post-header">
                <img src="${post.userAvatar}" class="avatar" alt="${post.userName}">
                <div>
                    <strong>${post.userName}</strong>
                    <small>${formatTime(post.timestamp)}</small>
                </div>
            </div>
            <p>${post.content}</p>
            ${post.image ? `<img src="${post.image}" alt="Post image">` : ''}
            <div class="post-actions">
                <button class="post-action" onclick="likePost('${post.id}')">
                    <i class="fas fa-heart ${post.likes.includes(currentUser?.id) ? 'liked' : ''}"></i>
                    ${post.likes.length}
                </button>
                <button class="post-action" onclick="toggleComment('${post.id}')">
                    <i class="fas fa-comment"></i> ${post.comments.length}
                </button>
                <button class="post-action">
                    <i class="fas fa-share"></i> Share
                </button>
            </div>
        </div>
    `).join('');
}

async function likePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post || !currentUser) return;

    const index = post.likes.indexOf(currentUser.id);
    if (index > -1) {
        post.likes.splice(index, 1);
    } else {
        post.likes.push(currentUser.id);
    }
    await saveData();
    renderPosts();
}

// Notes
function showNoteModal() {
    document.getElementById('noteModal').classList.add('active');
}

async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const subject = document.getElementById('noteSubject').value;

    if (!title || !content || !currentUser) return;

    const note = {
        id: Date.now().toString(),
        title,
        content,
        subject,
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: new Date().toISOString()
    };

    notes.unshift(note);
    document.getElementById('noteModal').classList.remove('active');
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    await saveData();
    renderNotes();
}

function renderNotes() {
    const container = document.getElementById('notesContainer');
    container.innerHTML = notes.map(note => `
        <div class="note-card">
            <h3>${note.title}</h3>
            <p class="subject-badge">${note.subject.toUpperCase()}</p>
            <p>${note.content.substring(0, 150)}...</p>
            <div class="note-footer">
                <small>by ${note.userName} • ${formatTime(note.timestamp)}</small>
                <button class="btn-primary" onclick="viewNote('${note.id}')">View Full</button>
            </div>
        </div>
    `).join('');
}

// Videos
function showVideoModal() {
    alert('Video upload feature - Add YouTube link or file upload');
}

function renderVideos() {
    const container = document.getElementById('videosContainer');
    container.innerHTML = videos.map(video => `
        <div class="video-card">
            <div class="video-thumbnail">
                <i class="fas fa-play"></i>
            </div>
            <h3>${video.title}</h3>
            <p>${video.description}</p>
        </div>
    `).join('');
}

// Chat
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    const room = document.getElementById('chatRooms').value;

    if (!message || !currentUser) return;

    if (!chats[room]) chats[room] = [];
    chats[room].push({
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        message,
        timestamp: new Date().toISOString()
    });

    input.value = '';
    await saveData();
    renderChats();
}

function renderChats() {
    const room = document.getElementById('chatRooms').value;
    const container = document.getElementById('chatMessages');
    const messages = chats[room] || [];
    
    container.innerHTML = messages.map(msg => `
        <div class="chat-message ${msg.userId === currentUser?.id ? 'sent' : 'received'}">
            <strong>${msg.userName}:</strong> ${msg.message}
            <small>${formatTime(msg.timestamp)}</small>
        </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
}

document.getElementById('chatRooms').addEventListener('change', renderChats);

// Updates & Complaints
function renderUpdates() {
    const container = document.getElementById('updatesContainer');
    container.innerHTML = updates.map(update => `
        <div class="update-card">
            <h3>📢 ${update.title}</h3>
            <p>${update.content}</p>
            <small>Posted on ${formatDate(update.timestamp)}</small>
        </div>
    `).join('');
}

function renderComplaints() {
    const container = document.getElementById('complaintsContainer');
    container.innerHTML = complaints.map(complaint => `
        <div class="complaint-card">
            <h3>⚠️ ${complaint.title}</h3>
            <p>${complaint.content}</p>
            <div class="status ${complaint.status}">${complaint.status || 'Pending'}</div>
        </div>
    `).join('');
}

function showComplaintModal() {
    const complaint = prompt('Enter your complaint:');
    if (complaint && currentUser) {
        complaints.push({
            id: Date.now().toString(),
            title: `Complaint from ${currentUser.name}`,
            content: complaint,
            userId: currentUser.id,
            status: 'Pending',
            timestamp: new Date().toISOString()
        });
        saveData();
        renderComplaints();
    }
}

// Save all data
async function saveData() {
    const data = {
        posts,
        notes,
        videos,
        chats,
        updates,
        complaints
    };
    await apiRequest('', {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

// Utility Functions
function formatTime(isoString) {
    return new Date(isoString).toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
    });
}

function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString();
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        // In production, upload to Imgur/CDN
        alert('Image upload feature - In production, use Imgur API');
    }
}

// PWA Support
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
