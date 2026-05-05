// ===== CPUT ShuttleTracker - Core JavaScript =====

// Global utility functions
const ShuttleUtils = {
    // Format date/time for South African timezone
    formatTime: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-ZA', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
    },
    
    // Get status color based on bus status
    getStatusColor: function(status) {
        const colors = {
            'on_time': '#28a745',
            'delayed': '#ff9800',
            'early': '#17a2b8',
            'out_of_service': '#dc3545'
        };
        return colors[status] || '#6c757d';
    },
    
    // Get status icon
    getStatusIcon: function(status) {
        const icons = {
            'on_time': 'fa-check-circle',
            'delayed': 'fa-exclamation-circle',
            'early': 'fa-fast-forward',
            'out_of_service': 'fa-times-circle'
        };
        return icons[status] || 'fa-question-circle';
    },
    
    // Calculate time remaining
    getTimeRemaining: function(minutes) {
        if (minutes <= 0) return 'Arrived';
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    },
    
    // Show notification toast
    showNotification: function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    // API request helper with error handling
    apiRequest: async function(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            ShuttleUtils.showNotification('Connection error. Please try again.', 'error');
            throw error;
        }
    }
};

// Initialize navigation active states
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    
    // Set active states for sidebar and bottom nav
    document.querySelectorAll('.sidebar-item, .nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPath || (currentPath.includes('/bus/') && href === '/dashboard')) {
            item.classList.add('active');
        }
    });
    
    // Add notification styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 350px;
        }
        .notification.show {
            transform: translateX(0);
        }
        .notification i {
            font-size: 1.2em;
        }
        .notification-success i { color: #28a745; }
        .notification-error i { color: #dc3545; }
        .notification-info i { color: #17a2b8; }
    `;
    document.head.appendChild(style);
});

// Handle responsive design
window.addEventListener('resize', function() {
    const sidebar = document.querySelector('.sidebar');
    const bottomNav = document.querySelector('.bottom-nav');
    
    if (window.innerWidth <= 768) {
        if (sidebar) sidebar.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'flex';
    } else {
        if (sidebar) sidebar.style.display = 'block';
        if (bottomNav) bottomNav.style.display = 'none';
    }
});

// Initialize on load
window.addEventListener('load', function() {
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const bottomNav = document.querySelector('.bottom-nav');
        if (sidebar) sidebar.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'flex';
    }
});
