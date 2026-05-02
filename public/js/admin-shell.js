/**
 * admin-shell.js
 * Handles: navbar/sidebar injection, Material Symbols font, theme toggle,
 *          active link, page title, sidebar collapse, and dashboard data population.
 */
document.addEventListener('DOMContentLoaded', async () => {

  /* ── Inject Material Symbols Outlined font ─────────────── */
  if (!document.getElementById('mat-symbols-css')) {
    const link = document.createElement('link');
    link.id   = 'mat-symbols-css';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block';
    document.head.appendChild(link);
  }

  /* ── 2. Theme toggle ────────────────────────────────────── */
  if (typeof initThemeToggle === 'function') initThemeToggle();

  /* ── 3. Active sidebar link ─────────────────────────────── */
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === currentPath) link.classList.add('active');
  });

  /* ── 4. Page title in navbar ────────────────────────────── */
  const activeLink  = document.querySelector('.sidebar-link.active');
  const pageTitleEl = document.getElementById('nav-page-title');
  if (pageTitleEl && activeLink) {
    const label = activeLink.querySelector('.sidebar-label');
    if (label) pageTitleEl.textContent = label.textContent.trim();
  }

  /* ── 5. Sidebar collapse / expand ──────────────────────── */
  const sidebar    = document.getElementById('app-sidebar');
  const shell      = document.querySelector('.app-shell');

  const COLLAPSED_KEY = 'hauers_admin_sidebar_collapsed';
  const isCollapsed   = () => localStorage.getItem(COLLAPSED_KEY) === '1';

  function applyCollapsedState(animate) {
    if (!sidebar || !shell) return;
    if (animate) {
      sidebar.classList.add('animating');
      setTimeout(() => sidebar.classList.remove('animating'), 300);
    }
    const collapsed = isCollapsed();
    sidebar.classList.toggle('collapsed', collapsed);
    shell.classList.toggle('sidebar-collapsed', collapsed);
    document.body.classList.toggle('sidebar-collapsed', collapsed);
  }

  applyCollapsedState(false);

  const collapseHandle = document.getElementById('sidebar-collapse-handle');
  if (collapseHandle) {
    collapseHandle.addEventListener('click', () => {
      localStorage.setItem(COLLAPSED_KEY, isCollapsed() ? '0' : '1');
      applyCollapsedState(true);
    });
  }

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        localStorage.setItem(COLLAPSED_KEY, '1');
        applyCollapsedState(true);
      }
    });
  });

  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      localStorage.setItem(COLLAPSED_KEY, '1');
      applyCollapsedState(true);
    });
  }

  /* ── 6. Navbar user info ────────────────────────────────── */
  try {
    const r = await fetch('/admin/api/user');
    if (r.ok) {
      const u = await r.json();
      const avatarEl    = document.getElementById('nav-avatar');
      const userNameEl  = document.getElementById('nav-user-name');
      const userEmailEl = document.getElementById('nav-user-email');
      if (avatarEl)    avatarEl.textContent    = u.firstName[0].toUpperCase();
      if (userNameEl)  userNameEl.textContent  = `${u.firstName} ${u.lastName}`;
      if (userEmailEl) userEmailEl.textContent = u.email;

      /* Sync profile popup fields */
      const nppAvatar = document.getElementById('npp-avatar');
      const nppName   = document.getElementById('npp-name');
      const nppEmail  = document.getElementById('npp-email');
      const nppRole   = document.getElementById('npp-role');
      if (nppAvatar) nppAvatar.textContent = u.firstName[0].toUpperCase();
      if (nppName)   nppName.textContent   = `${u.firstName} ${u.lastName}`;
      if (nppEmail)  nppEmail.textContent  = u.email;
      if (nppRole)   nppRole.textContent   = 'Administrator';
    }
  } catch (err) {
    console.error('Failed to load user info', err);
  }

  /* Profile popup links for admin */
  const nppEditLink     = document.getElementById('npp-edit-link');
  const nppSettingsLink = document.getElementById('npp-settings-link');
  if (nppEditLink) nppEditLink.style.display = 'none';
  if (nppSettingsLink) {
    nppSettingsLink.href = '/admin/system-settings';
    nppSettingsLink.innerHTML = '<span class="npp-icon material-symbols-outlined">settings</span>Account Settings';
  }

  /* Nav-user click → toggle profile popup */
  const navUserEl    = document.getElementById('nav-user');
  const profilePopup = document.getElementById('nav-profile-popup');
  if (navUserEl && profilePopup) {
    navUserEl.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = !profilePopup.hidden;
      profilePopup.hidden = isOpen;
      navUserEl.setAttribute('aria-expanded', String(!isOpen));
      const notifPanel = document.getElementById('nav-notif-panel');
      if (notifPanel) notifPanel.hidden = true;
    });
    navUserEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navUserEl.click(); }
      if (e.key === 'Escape') { profilePopup.hidden = true; navUserEl.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ── Notification bell ──────────────────────────────── */
  const ADMIN_NOTIF_KEY = 'hauers_admin_notifs_read';
  const adminNotifs = [
    { id: 1, icon: '👤', text: '3 new users registered today.',                   time: '1 hour ago'  },
    { id: 2, icon: '📝', text: 'Question bank now has 15+ questions.',             time: '5 hours ago' },
    { id: 3, icon: '📊', text: 'Weekly analytics report is ready to view.',       time: '1 day ago'   },
  ];

  function initAdminNotifications(notifs, storageKey) {
    const DISMISSED_KEY = storageKey + '_dismissed';
    const badge      = document.getElementById('nav-notif-badge');
    const listEl     = document.getElementById('nav-notif-list');
    const notifBtn   = document.getElementById('nav-notif-btn');
    const notifPanel = document.getElementById('nav-notif-panel');
    const clearBtn   = document.getElementById('nav-notif-clear');

    function getRead()      { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    function getDismissed() { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); }
    function getVisible()   { const d = getDismissed(); return notifs.filter(n => !d.includes(n.id)); }

    function renderBadge() {
      const unread = getVisible().filter(n => !getRead().includes(n.id));
      if (badge) { badge.textContent = unread.length; badge.hidden = unread.length === 0; }
    }

    function renderList() {
      if (!listEl) return;
      const visible = getVisible();
      const read    = getRead();
      if (!visible.length) {
        listEl.innerHTML = '<div class="nav-notif-empty">You\'re all caught up 🎉</div>';
        return;
      }
      listEl.innerHTML = visible.map(n => {
        const isRead = read.includes(n.id);
        return `
          <div class="nav-notif-item${isRead ? ' read' : ''}" data-id="${n.id}">
            <span class="nav-notif-icon">${n.icon}</span>
            <div class="nav-notif-body">
              <p class="nav-notif-text">${n.text}</p>
              <span class="nav-notif-time">${n.time}</span>
            </div>
            ${isRead ? '' : '<span class="nav-notif-dot"></span>'}
            <div class="nav-notif-actions">
              ${!isRead ? `<button class="nav-notif-action-btn mark-read" title="Mark as read" data-id="${n.id}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>` : ''}
              <button class="nav-notif-action-btn dismiss" title="Dismiss" data-id="${n.id}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>`;
      }).join('');

      listEl.querySelectorAll('.nav-notif-action-btn.mark-read').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const id = Number(btn.dataset.id);
          const r  = getRead();
          if (!r.includes(id)) { r.push(id); localStorage.setItem(storageKey, JSON.stringify(r)); }
          renderBadge(); renderList();
        });
      });

      listEl.querySelectorAll('.nav-notif-action-btn.dismiss').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const id = Number(btn.dataset.id);
          const d  = getDismissed();
          if (!d.includes(id)) { d.push(id); localStorage.setItem(DISMISSED_KEY, JSON.stringify(d)); }
          renderBadge(); renderList();
        });
      });
    }

    renderBadge();
    renderList();

    if (notifBtn && notifPanel) {
      notifBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = !notifPanel.hidden;
        notifPanel.hidden = isOpen;
        if (profilePopup) { profilePopup.hidden = true; if (navUserEl) navUserEl.setAttribute('aria-expanded', 'false'); }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', e => {
        e.stopPropagation();
        localStorage.setItem(storageKey, JSON.stringify(getVisible().map(n => n.id)));
        renderBadge(); renderList();
      });
    }
  }

  initAdminNotifications(adminNotifs, ADMIN_NOTIF_KEY);

  /* Close popups when clicking outside */
  document.addEventListener('click', () => {
    if (profilePopup) { profilePopup.hidden = true; if (navUserEl) navUserEl.setAttribute('aria-expanded', 'false'); }
    const notifPanel = document.getElementById('nav-notif-panel');
    if (notifPanel) notifPanel.hidden = true;
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (profilePopup) { profilePopup.hidden = true; if (navUserEl) navUserEl.setAttribute('aria-expanded', 'false'); }
      const notifPanel = document.getElementById('nav-notif-panel');
      if (notifPanel) notifPanel.hidden = true;
    }
  });

  /* ── 7. Dashboard data population ─────────────────────── */
  if (currentPath !== '/admin/home') return;

  let data;
  try {
    const r = await fetch('/admin/api/dashboard');
    if (!r.ok) return;
    data = await r.json();
  } catch (err) {
    console.error('Failed to load admin dashboard', err);
    return;
  }

  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };

  /* KPI tiles */
  setVal('stat-total-users',      data.totalUsers);
  setVal('stat-active-reviewees', data.activeReviewees);
  setVal('stat-avg-readiness',    data.avgReadiness + '%');
  setVal('stat-new-signups',      '+' + data.recentSignups);

  /* Domain performance bars */
  const domainsContainer = document.getElementById('domain-bars');
  if (domainsContainer && data.domainAverages) {
    domainsContainer.innerHTML = data.domainAverages.map(({ domain, avg }) => {
      const valCls  = avg >= 70 ? ' good' : avg < 60 ? ' warn' : '';
      const fillCls = avg < 60  ? ' warn' : '';
      return `
        <div class="msc-bar-item">
          <div class="msc-bar-label">
            <span>${domain}</span>
            <span class="mbar-val${valCls}">${avg}%</span>
          </div>
          <div class="msc-bar-track">
            <div class="msc-bar-fill${fillCls}" data-bw="${avg}" style="width:0%;transition:width 1.1s cubic-bezier(0.4,0,0.2,1)"></div>
          </div>
        </div>`;
    }).join('');
    setTimeout(() => {
      domainsContainer.querySelectorAll('.msc-bar-fill[data-bw]').forEach(bar => {
        bar.style.width = bar.dataset.bw + '%';
      });
    }, 300);
  }

  /* Users by exam level */
  const splitContainer = document.getElementById('level-split');
  if (splitContainer && data.usersByLevel) {
    splitContainer.innerHTML = data.usersByLevel.map(({ level, count }) => {
      const pct = Math.round((count / data.totalUsers) * 100);
      return `
        <div class="msc-bar-item">
          <div class="msc-bar-label">
            <span>${level}</span>
            <span class="mbar-val">${count} <span style="font-weight:400;opacity:0.55">(${pct}%)</span></span>
          </div>
          <div class="msc-bar-track">
            <div class="msc-bar-fill" data-bw="${pct}" style="width:0%;transition:width 1.1s cubic-bezier(0.4,0,0.2,1)"></div>
          </div>
        </div>`;
    }).join('');
    setTimeout(() => {
      splitContainer.querySelectorAll('.msc-bar-fill[data-bw]').forEach(bar => {
        bar.style.width = bar.dataset.bw + '%';
      });
    }, 400);
  }

  /* Pass rate */
  if (data.passRate != null) {
    setVal('pass-rate-val', data.passRate + '%');
    const fill = document.getElementById('pass-rate-fill');
    if (fill) setTimeout(() => { fill.style.width = data.passRate + '%'; }, 350);
  }

  /* Weak domains */
  const weakContainer = document.getElementById('admin-weak-domains');
  if (weakContainer && data.weakestCommonDomains) {
    weakContainer.innerHTML = data.weakestCommonDomains
      .map(d => `<span class="weak-tag">${d}</span>`)
      .join('');
  }

  /* Recent activity feed */
  const activityContainer = document.getElementById('activity-feed');
  if (activityContainer && data.recentActivity) {
    const icons = {
      signup:     'person_add',
      diagnostic: 'monitor_heart',
      quiz:       'quiz',
    };
    activityContainer.innerHTML = data.recentActivity.map(item => `
      <div class="activity-item">
        <span class="activity-icon activity-icon--${item.type}">
          <span class="material-symbols-outlined" style="font-size:15px;line-height:1;font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 20">${icons[item.type] || 'info'}</span>
        </span>
        <div class="activity-body">
          <p class="activity-text">${item.text}</p>
          <span class="activity-time">${item.time}</span>
        </div>
      </div>`).join('');
  }

});
