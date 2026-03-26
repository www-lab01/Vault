// 🔥 PRODUCTION READY - YOUR JSONBin CREDENTIALS
const API_KEY = "$2a$10$5SepU9r2PraMpGxplhm/Cu7O03sM2xA4p32tLGV0dQzhrnwl1S33K";
const BIN_ID = "69c2c25eb7ec241ddc9c01f5";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const IMGUR_CLIENT_ID = "YOUR_IMGUR_CLIENT_ID"; // Optional for images

// Production State
let appState = {
    currentUser: null,
    posts: [],
    notes: [],
    videos: [],
    chats: { general: [], cs: [], ece: [] },
    updates: [],
    complaints: [],
    notifications: [],
    searchResults: []
};

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    setupEventListeners();
    checkAuthStatus();
});

async function initApp() {
    try {
        await loadDatabase();
        showNotification('CollegeHub Loaded Successfully! 🎓', 'success');
    } catch (error) {
        console.error('Init failed:', error);
        showNotification('Failed to load data. Retrying...', 'error');
    }
}

// 🔥 AUTHENTICATION SYSTEM
const USERS = {
    'STUDENT001': { name: 'John Doe', avatar: 'https://ui-avatars.com/api/?name=John+Doe&size=128&background=667eea', dept: 'CS', year: 2, isAdmin: false },
    'STUDENT002': { name: 'Jane Smith', avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&size=128&background=f093fb', dept: 'ECE', year: 3, isAdmin: false },
    'ADMIN001': { name: 'Admin User', avatar: 'https://ui-avatars.com/api/?name=Admin&size=128&background=e74c3c', dept: 'Admin', year: 0, isAdmin: true }
};

async function login() {
    const studentId = document.getElementById('studentId').value;
    const password = document.getElementById('password').value;

    if (USERS[studentId] && password === '123456') {
        appState.currentUser = { id: studentId, ...USERS[studentId] };
        localStorage.setItem('collegehub_user', JSON.stringify(appState.currentUser));
        closeModal('loginModal');
        updateUI();
        await loadDatabase();
        showNotification(`Welcome ${appState.currentUser.name}!`, 'success');
        
        if (appState.currentUser.isAdmin) {
            document.getElementById('adminPanel').style.display = 'block';
        }
    } else {
        showNotification('Invalid credentials!', 'error');
    }
}

function checkAuthStatus() {
    const user = localStorage.getItem('collegehub_user');
    if (user) {
        appState.currentUser = JSON.parse(user);
        updateUI();
        loadDatabase();
    }
}

function updateUI() {
    if (!appState.currentUser) return;
    
    document.getElementById('userName').textContent = appState.currentUser.name;
    document.getElementById('userAvatar').src = appState.currentUser.avatar;
    document.getElementById('userAvatar').onerror = () => {
        document.getElementById('userAvatar').src = 'https://ui-avatars.com/api/?name=' + appState.currentUser.name.split(' ').map(n => n[0]).join('') + '&background=667eea';
    };
}

// 🔥 JSONBIN API - PRODUCTION READY
async function apiCall(path = '', options = {}) {
    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY,
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Call Failed:', error);
        throw error;
    }
}

async function loadDatabase() {
    const data = await apiCall('', { method: 'GET' });
    if (data?.record) {
        Object.assign(appState, data.record);
        renderAll();
    } else {
        await initializeDatabase();
    }
}

async function saveDatabase() {
    await apiCall('', {
        method: 'PUT',
        body: JSON.stringify(appState)
    });
}

async function initializeDatabase() {
    const initialData = {
        currentUser: null,
        posts: generateSamplePosts(),
        notes: generateSampleNotes(),
        videos: generateSampleVideos(),
        chats: { general: generateSampleMessages(), cs: [], ece: [] },
        updates: generateSampleUpdates(),
        complaints: [],
        notifications: [],
        searchResults: []
    };
    await apiCall('', { method: 'PUT', body: JSON.stringify(initialData) });
    Object.assign(appState, initialData);
    renderAll();
}

// 🔥 POSTS SYSTEM (Instagram Style)
async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    if (!content || !appState.currentUser) return;

    const post = {
        id: `post_${Date.now()}`,
        userId: appState.currentUser.id,
        userName: appState.currentUser.name,
        userAvatar: appState.currentUser.avatar,
        content,
        image: null,
        videoUrl: document.getElementById('postVideo').value || null,
        likes: [],
        comments: [],
        shares: 0,
        timestamp: new Date().toISOString()
    };

    appState.posts.unshift(post);
    document.getElementById('postContent').value = '';
    document.getElementById('postVideo').value = '';
    document.getElementById('postImage').value = '';
    
    await saveDatabase();
    renderPosts();
    showNotification('Post created successfully!', 'success');
}

function renderPosts() {
    const container = document.getElementById('postsContainer');
    container.innerHTML = appState.posts.slice(0, 20).map(post => createPostHTML(post)).join('');
}

function createPostHTML(post) {
    const isLiked = appState.currentUser && post.likes.includes(appState.currentUser.id);
    const timeAgo = getTimeAgo(post.timestamp);
    
    return `
        <article class="post-card">
            <div class="post-header">
                <img src="${post.userAvatar}" class="avatar" alt="${post.userName}">
                <div class="post-meta">
                    <strong>${post.userName}</strong>
                    <span class="post-time">${timeAgo}</span>
                </div>
            </div>
            <div class="post-content">
                <p>${post.content}</p>
                ${post.image ? `<img src="${post.image}" alt="Post image" class="post-media">` : ''}
                ${post.videoUrl ? createVideoEmbed(post.videoUrl) : ''}
            </div>
            <div class="post-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                    <i class="fas fa-heart"></i> ${post.likes.length}
                </button>
                <button class="action-btn" onclick="toggleComments('${post.id}')">
                    <i class="fas
