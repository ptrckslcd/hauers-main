// Apply saved theme immediately
(function() {
  const savedTheme = localStorage.getItem('hauers-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  if (toggleBtn.dataset.initialized) return;
  toggleBtn.dataset.initialized = 'true';

  toggleBtn.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('hauers-theme', newTheme);
  });
}

document.addEventListener('DOMContentLoaded', initThemeToggle);
