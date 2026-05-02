// Core UI initialization
document.addEventListener('DOMContentLoaded', () => {

  // 1. Initialize Theme Toggle
  if (typeof initThemeToggle === 'function') {
    initThemeToggle();
  }

  // 2. Identify Context
  const path = window.location.pathname;
  const isLegalPage = path.includes('/privacy') || path.includes('/terms');
  const isAppPage = path.includes('/reviewee/') || path.includes('/admin/');
  let isFromApp = false;

  if (isAppPage) {
    isFromApp = true;
    sessionStorage.setItem('fromApp', 'true');
  } else if (isLegalPage) {
    const ref = document.referrer || '';
    if (ref.includes('/reviewee/') || ref.includes('/admin/')) {
      isFromApp = true;
      sessionStorage.setItem('fromApp', 'true');
    } else {
      isFromApp = sessionStorage.getItem('fromApp') === 'true';
    }
  } else {
    sessionStorage.removeItem('fromApp');
  }

  // 3. User Profile Dropdown logic
  const userBtn = document.getElementById('nav-user');
  const popup = document.getElementById('nav-profile-popup');
  if (userBtn && popup) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = userBtn.getAttribute('aria-expanded') === 'true';
      userBtn.setAttribute('aria-expanded', !expanded);
      popup.hidden = expanded;
    });
    document.addEventListener('click', (e) => {
      if (!userBtn.contains(e.target)) {
        userBtn.setAttribute('aria-expanded', 'false');
        popup.hidden = true;
      }
    });
  }

  // 4. Notification Bell logic
  const notifBtn = document.getElementById('nav-notif-btn');
  const notifPanel = document.getElementById('nav-notif-panel');
  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifPanel.hidden = !notifPanel.hidden;
      if (popup) {
        popup.hidden = true;
        if(userBtn) userBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('click', (e) => {
      if (!notifBtn.contains(e.target) && !notifPanel.contains(e.target)) {
        notifPanel.hidden = true;
      }
    });
    const notifClear = document.getElementById('nav-notif-clear');
    if (notifClear) {
      notifClear.addEventListener('click', () => {
         const list = document.getElementById('nav-notif-list');
         if (list) list.innerHTML = '<div class="nav-notif-empty">No notifications</div>';
         const badge = document.getElementById('nav-notif-badge');
         if (badge) badge.hidden = true;
      });
    }
  }

  // 5. Sidebar Toggle logic (for dashboard & legal pages)
  const appShell = document.querySelector('.app-shell');
  const sidebar = document.getElementById('app-sidebar');
  const collapseBtn = document.getElementById('sidebar-collapse-handle');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (collapseBtn && sidebar && appShell) {
    collapseBtn.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      appShell.classList.toggle('sidebar-collapsed', isCollapsed);
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    });
  }
  if (overlay && sidebar && appShell) {
    overlay.addEventListener('click', () => {
      sidebar.classList.add('collapsed');
      appShell.classList.add('sidebar-collapsed');
      document.body.classList.add('sidebar-collapsed');
    });
  }

  // 6. Header Scrolled Elevation logic
  const headerOuter = document.querySelector('.header-outer');
  if (headerOuter) {
    const onScroll = () => headerOuter.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // 7. Footer Mouse Move Effect
  const siteFooter = document.querySelector('.site-footer');
  if (siteFooter) {
    siteFooter.addEventListener('mousemove', e => {
      const rect = siteFooter.getBoundingClientRect();
      siteFooter.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
      siteFooter.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
    });
  }

  // 8. Scroll reveal 
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

  // 9. Stat counter animation 
  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1100;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      el.textContent = Math.round(eased * target);
      if (elapsed < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.stat-count[data-count]').forEach(animateCounter);
          statObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    statObserver.observe(heroStats);
  }

  // 10. Hide footer on App Pages (e.g. Dashboard)
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (footerPlaceholder && isFromApp) {
    footerPlaceholder.style.display = 'none';
  }

  // 11. Custom Role Overrides (Since navbar is shared, client-side overrides)
  if (isAppPage) {
    let currentRole = document.body.dataset.role || sessionStorage.getItem('appRole');
    if (!currentRole && path.includes('/admin/')) currentRole = 'admin';
    else if (!currentRole) currentRole = 'reviewee';
    
    if (document.body.dataset.role) {
      sessionStorage.setItem('appRole', document.body.dataset.role);
    }
    
    if (currentRole === 'admin') {
      const logoLink = document.querySelector('.nav-logo-link');
      if (logoLink) logoLink.href = '/admin/dashboard';

      const nppRole = document.getElementById('npp-role');
      if (nppRole) nppRole.textContent = 'Admin';

      const editLink = document.getElementById('npp-edit-link');
      if (editLink) editLink.style.display = 'none';

      const settingsLink = document.getElementById('npp-settings-link');
      if (settingsLink) {
        settingsLink.href = '/admin/settings';
        settingsLink.innerHTML = '<span class="npp-icon material-symbols-outlined">settings</span> System Settings';
      }

      const userName = document.getElementById('nav-user-name');
      if (userName) userName.textContent = 'Admin Portal';
      
      const nppName = document.getElementById('npp-name');
      if (nppName) nppName.textContent = 'System Admin';

      const userEmail = document.getElementById('nav-user-email');
      if (userEmail) userEmail.textContent = 'admin@hauers.com';
      
      const nppEmail = document.getElementById('npp-email');
      if (nppEmail) nppEmail.textContent = 'admin@hauers.com';

      const navAvatar = document.getElementById('nav-avatar');
      if (navAvatar) navAvatar.textContent = 'A';
      const nppAvatar = document.getElementById('npp-avatar');
      if (nppAvatar) nppAvatar.textContent = 'A';
    }
  }
});