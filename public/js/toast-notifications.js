/**
 * Toast Notification System
 * Provides global toast notifications for user feedback
 */

(function() {
  const TOAST_TIMEOUT = 4000;
  let toastContainer = null;

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          background: var(--bg-primary, #ffffff);
          border: 1px solid var(--border-default, #e5e7eb);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #000000);
          pointer-events: auto;
          animation: slideInRight 0.3s ease-out;
        }
        
        .toast.success {
          background: rgba(34, 197, 94, 0.1);
          border-color: #22c55e;
          color: #16a34a;
        }
        
        .toast.error {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #dc2626;
        }
        
        .toast.info {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
          color: #1d4ed8;
        }
        
        .toast-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    return toastContainer;
  }

  window.showToast = function(message, type = 'info') {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    else if (type === 'error') icon = 'error';
    
    toast.innerHTML = `
      <span class="material-symbols-outlined toast-icon">${icon}</span>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    const timeoutId = setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, TOAST_TIMEOUT);
  };
})();
