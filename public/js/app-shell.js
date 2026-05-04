/**
 * app-shell.js
 * Handles: sidebar collapse/expand, navbar partial injection,
 *          sidebar partial injection, active link highlighting,
 *          page title sync, and mock-data population.
 */
document.addEventListener('DOMContentLoaded', async () => {


  /* ── Inject Material Symbols Outlined font (sidebar icons) ── */
  if (!document.getElementById('mat-symbols-css')) {
    const _msLink = document.createElement('link');
    _msLink.id   = 'mat-symbols-css';
    _msLink.rel  = 'stylesheet';
    _msLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block';
    document.head.appendChild(_msLink);
  }

  /* ── 2. Theme toggle init ─────────────────────────────── */
  if (typeof initThemeToggle === 'function') initThemeToggle();

  /* ── 3. Active sidebar link ───────────────────────────── */
  const currentPath = window.location.pathname;

  // Sub-pages that don't have a direct sidebar link — map to their parent section
  const sidebarAliases = {
    '/reviewee/diagnostic-result': '/reviewee/dashboard',
    '/reviewee/diagnostic':        '/reviewee/dashboard',
    '/reviewee/quiz':              '/reviewee/review',
    '/reviewee/onboarding':        '/reviewee/dashboard',
  };
  const canonicalPath = sidebarAliases[currentPath] || currentPath;

  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === canonicalPath) {
      link.classList.add('active');
    }
  });

  /* ── 4. Page title in navbar ──────────────────────────── */
  // Override for pages whose nav title differs from their sidebar label
  const navTitleOverrides = {
    '/reviewee/diagnostic':        'Diagnostic',
    '/reviewee/diagnostic-result': 'Diagnostic Results',
    '/reviewee/quiz':              'Practice Session',
    '/reviewee/study-plan':        'Study Plan',
    '/reviewee/onboarding':        'Getting Started',
    '/reviewee/dashboard':         'Home',
    '/reviewee/learner-profile':   'Profile',
    '/reviewee/review':            'Review',
    '/reviewee/progress':          'Progress',
    '/reviewee/materials':         'Learning Materials',
  };

  const activeLink = document.querySelector('.sidebar-link.active');
  const pageTitleEl = document.getElementById('nav-page-title');
  if (pageTitleEl) {
    if (navTitleOverrides[currentPath]) {
      pageTitleEl.textContent = navTitleOverrides[currentPath];
    } else if (activeLink) {
      const label = activeLink.querySelector('.sidebar-label');
      if (label) pageTitleEl.textContent = label.textContent.trim();
    }
  }

  /* ── 5. Sidebar collapse / expand ────────────────────── */
  const sidebar = document.getElementById('app-sidebar');
  const shell = document.querySelector('.app-shell');

  const COLLAPSED_KEY = 'hauers_sidebar_collapsed';
  const isCollapsed = () => localStorage.getItem(COLLAPSED_KEY) === '1';

  function syncCollapseHandleUI(collapsed) {
    const handle = document.getElementById('sidebar-collapse-handle');
    const icon = document.getElementById('sidebar-collapse-icon');
    if (handle) {
      handle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      handle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    }
    if (icon) {
      /* Expanded: chevron points left (collapse). Collapsed: chevron points right (expand). */
      icon.textContent = collapsed ? 'chevron_right' : 'chevron_left';
    }
  }

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
    syncCollapseHandleUI(collapsed);
  }

  // Restore persisted state immediately (no transition flash)
  applyCollapsedState(false);

  // Sidebar collapse handle (the hamburger button on the right border)
  const collapseHandle = document.getElementById('sidebar-collapse-handle');
  if (collapseHandle) {
    collapseHandle.addEventListener('click', () => {
      localStorage.setItem(COLLAPSED_KEY, isCollapsed() ? '0' : '1');
      applyCollapsedState(true);
    });
  }

  // Mobile: close sidebar when clicking a link
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        localStorage.setItem(COLLAPSED_KEY, '1');
        applyCollapsedState(true);
      }
    });
  });

  /* overlay click to close on mobile */
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      localStorage.setItem(COLLAPSED_KEY, '1');
      applyCollapsedState(true);
    });
  }

  /* ── 6. Populate navbar user info (runs on every page) ── */
  let currentUser = null;
  try {
    const ur = await fetch('/reviewee/api/user');
    if (ur.ok) {
      currentUser = await ur.json();
      const u = currentUser;
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
      if (nppRole)   nppRole.textContent   = u.examLevel ? `${u.examLevel} Reviewee` : 'Reviewee';
    }
  } catch (err) {
    console.error('Failed to load user info', err);
  }

  /* Profile popup links logic */
  const nppEditLink     = document.getElementById('npp-edit-link');
  const nppSettingsLink = document.getElementById('npp-settings-link');
  
  if (document.body.dataset.role === 'admin') {
    if (nppEditLink) nppEditLink.style.display = 'none';
    if (nppSettingsLink) nppSettingsLink.href = '/admin/settings';
  } else {
    if (nppEditLink) nppEditLink.href = '/reviewee/profile';
    if (nppSettingsLink) nppSettingsLink.href = '/reviewee/settings';
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
      /* Close notif panel if open */
      const notifPanel = document.getElementById('nav-notif-panel');
      if (notifPanel) notifPanel.hidden = true;
    });
    navUserEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navUserEl.click(); }
      if (e.key === 'Escape') { profilePopup.hidden = true; navUserEl.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ── Notification bell ──────────────────────────────── */
  const NOTIF_KEY  = 'hauers_reviewee_notifs_read_v2';
  const revieweeNotifs = [
    { id: 1, icon: '📋', text: 'Your study plan was updated for this week.',     time: '2 hours ago' },
    { id: 2, icon: '✅', text: 'Diagnostic completed — you scored 78/100.',      time: '1 day ago'   },
    { id: 3, icon: '📚', text: 'New review materials are available in your plan.', time: '2 days ago' },
  ];

  function initNotifications(notifs, storageKey) {
    const DISMISSED_KEY = storageKey + '_dismissed';
    const badge      = document.getElementById('nav-notif-badge');
    const listEl     = document.getElementById('nav-notif-list');
    const notifBtn   = document.getElementById('nav-notif-btn');
    const notifPanel = document.getElementById('nav-notif-panel');
    const clearBtn   = document.getElementById('nav-notif-clear');

    function getRead()      { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    function getDismissed() { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); }

    function getVisible() {
      const dismissed = getDismissed();
      return notifs.filter(n => !dismissed.includes(n.id));
    }

    function renderBadge() {
      const read = getRead();
      const unread = getVisible().filter(n => !read.includes(n.id));
      if (badge) {
        badge.textContent = unread.length;
        badge.hidden = unread.length === 0;
      }
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
              ${!isRead ? `
              <button class="nav-notif-action-btn mark-read" title="Mark as read" data-id="${n.id}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>` : ''}
              <button class="nav-notif-action-btn dismiss" title="Dismiss" data-id="${n.id}">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>`;
      }).join('');

      /* Mark-as-read buttons */
      listEl.querySelectorAll('.nav-notif-action-btn.mark-read').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const id = Number(btn.dataset.id);
          const r  = getRead();
          if (!r.includes(id)) { r.push(id); localStorage.setItem(storageKey, JSON.stringify(r)); }
          renderBadge(); renderList();
        });
      });

      /* Dismiss buttons */
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
        const ids = getVisible().map(n => n.id);
        localStorage.setItem(storageKey, JSON.stringify(ids));
        renderBadge(); renderList();
      });
    }
  }

  initNotifications(revieweeNotifs, NOTIF_KEY);

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

  /* ── 7. Fetch dashboard mock data and populate ─────────── */
  const isDashboard = currentPath === '/reviewee/dashboard';
  if (!isDashboard) return;

  let data;
  try {
    const r = await fetch('/reviewee/api/dashboard');
    if (!r.ok) return;
    data = await r.json();
  } catch (err) {
    console.error('Failed to load dashboard', err);
    return;
  }

  /* ── Stats Count-up utility ── */
  function animateValue(obj, start, end, duration) {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      obj.innerHTML = Math.floor(progress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  // User greeting
  const greetingEl = document.getElementById('dash-greeting');
  if (greetingEl && data.user) {
    const hour = new Date().getHours();
    const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    greetingEl.textContent = `Good ${tod}, ${data.user.firstName} 👋`;
  }

  // Exam level badge
  const badgeEl = document.getElementById('dash-level-badge');
  if (badgeEl && data.user) badgeEl.textContent = data.user.examLevel;

  // Weeks + exact days remaining
  const examDate = new Date('2026-04-27');
  const weeksEl = document.getElementById('weeks-remaining');
  if (weeksEl) {
    const weeks = Math.max(0, Math.round((examDate - new Date()) / (1000 * 60 * 60 * 24 * 7)));
    weeksEl.textContent = weeks;
  }
  const examDaysEl = document.getElementById('exam-days');
  if (examDaysEl) {
    const days = Math.max(0, Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24)));
    examDaysEl.textContent = days;
  }
  const examLevelEl = document.getElementById('exam-level-label');
  if (examLevelEl && data.user) examLevelEl.textContent = data.user.examLevel;

  // Readiness score ring
  const ringPct  = document.querySelector('.ring-prog[data-pct]');
  const ringNum  = document.getElementById('ring-pct-val');
  const ringNote = document.getElementById('ring-note');
  if (data.readinessScore != null) {
    const pct  = data.readinessScore;
    const r    = 54;
    const circ = 2 * Math.PI * r;
    if (ringPct) {
      ringPct.setAttribute('data-pct', pct);
      ringPct.style.strokeDasharray  = circ;
      ringPct.style.strokeDashoffset = circ;
      setTimeout(() => {
        ringPct.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)';
        ringPct.style.strokeDashoffset = circ * (1 - pct / 100);
      }, 200);
    }
    if (ringNum) animateValue(ringNum, 0, pct, 1400);
  }

  // Streak number
  const streakEl = document.getElementById('study-streak');
  if (streakEl && data.streak != null) animateValue(streakEl, 0, data.streak, 1000);

  // Streak week dots (Mon–Sun, last `streak` days marked active)
  const streakContainer = document.getElementById('streak-week');
  if (streakContainer && data.streak != null) {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIdx = (new Date().getDay() + 6) % 7; // 0=Mon … 6=Sun
    streakContainer.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const daysFromToday = todayIdx - i;
      const isActive = daysFromToday >= 0 && daysFromToday < data.streak;
      const isToday  = i === todayIdx;
      streakContainer.innerHTML +=
        `<div class="streak-day">` +
        `<div class="streak-dot${isActive ? ' active' : ''}${isToday ? ' today' : ''}"></div>` +
        `<span class="streak-day-label">${dayNames[i]}</span>` +
        `</div>`;
    }
  }

  // Task counts + progress bar + interactive rows
  const doneEl    = document.getElementById('tasks-done');
  const pendingEl = document.getElementById('tasks-pending');
  const taskFillEl = document.getElementById('task-progress-fill');
  const taskContainer = document.getElementById('dash-tasks-container');

  function updateTaskStats() {
    const total = 4; // Mock total
    const doneItems = taskContainer.querySelectorAll('.task-item.is-done').length;
    const pending = total - doneItems;
    const pct = Math.round((doneItems / total) * 100);

    if (doneEl) doneEl.textContent = doneItems;
    if (pendingEl) pendingEl.textContent = pending;
    if (taskFillEl) taskFillEl.style.width = pct + '%';
  }

  if (taskContainer) {
    const mockTasks = [
      { id: 1, text: 'Review Verbal flashcards', done: true },
      { id: 2, text: 'Numerical drills (30 min)', done: true },
      { id: 3, text: 'Analytical mock questions', done: false },
      { id: 4, text: 'Clerical ability drill', done: false },
    ];

    taskContainer.innerHTML = mockTasks.map(t => `
      <div class="task-item${t.done ? ' is-done' : ''}" data-id="${t.id}">
        <div class="task-checkbox">
          <span class="material-symbols-outlined">check</span>
        </div>
        <span class="task-label">${t.text}</span>
      </div>
    `).join('');

    taskContainer.querySelectorAll('.task-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('is-done');
        updateTaskStats();
      });
    });

    updateTaskStats();
  }

  // Competency Radar chart
  if (data.diagnostic && data.diagnostic.domainScores) {
    const canvasEl = document.getElementById('competencyRadar');
    if (canvasEl && typeof Chart !== 'undefined') {
      const labels = data.diagnostic.domainScores.map(d => d.domain);
      const scores = data.diagnostic.domainScores.map(d => d.score);

      const isDark     = document.documentElement.getAttribute('data-theme') === 'dark';
      const gridLine   = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
      const labelColor = isDark ? '#A1A1AA' : '#4b5563';
      const tickColor  = isDark ? '#555'    : '#aaa';
      const tooltipBg  = isDark ? 'rgba(14,14,14,0.97)' : 'rgba(255,255,255,0.97)';
      const tooltipTxt = isDark ? '#ffffff' : '#111827';
      const tooltipSub = isDark ? '#A1A1AA' : '#4b5563';
      const tooltipBdr = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      const ptBorder   = isDark ? '#0A0A0A' : '#ffffff';

      new Chart(canvasEl, {
        type: 'radar',
        data: {
          labels,
          datasets: [
            {
              label: 'Your Score',
              data: scores,
              backgroundColor: 'rgba(255,153,51,0.13)',
              borderColor: '#FF9933',
              borderWidth: 2.5,
              pointBackgroundColor: '#FF9933',
              pointBorderColor: ptBorder,
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7.5,
              pointHoverBackgroundColor: '#FF9933',
              fill: true,
            },
            {
              label: 'Passing Target',
              data: labels.map(() => 80),
              backgroundColor: 'rgba(255,51,102,0.04)',
              borderColor: 'rgba(255,51,102,0.5)',
              borderWidth: 1.5,
              borderDash: [6, 4],
              pointRadius: 0,
              pointHoverRadius: 0,
              fill: true,
            },
          ],
        },
        options: {
          animation: { duration: 1200, easing: 'easeInOutQuart' },
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              min: 0,
              max: 100,
              ticks: {
                stepSize: 20,
                color: tickColor,
                backdropColor: 'transparent',
                font: { size: 9, family: 'inherit' },
              },
              grid:       { color: gridLine, circular: false },
              angleLines: { color: gridLine },
              pointLabels: {
                color: labelColor,
                font: { size: 11, weight: '500', family: 'inherit' },
                padding: 10,
              },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor:      tooltipTxt,
              bodyColor:       tooltipSub,
              borderColor:     tooltipBdr,
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => `  ${ctx.dataset.label}: ${ctx.raw}%`,
              },
            },
          },
        },
      });

      // Domain score chips below chart
      const chipsEl = document.getElementById('radar-score-chips');
      if (chipsEl) {
        chipsEl.innerHTML = data.diagnostic.domainScores.map(({ domain, score }) => {
          const cls = score >= 75 ? 'chip--good' : score >= 60 ? 'chip--mid' : 'chip--low';
          return `<span class="radar-chip ${cls}"><strong>${score}%</strong>&nbsp;${domain}</span>`;
        }).join('');
      }
    }
  }

  // Weak domains
  const weakContainer = document.getElementById('weak-tags-container');
  if (weakContainer && data.weakDomains) {
    weakContainer.innerHTML = data.weakDomains
      .map(d => `<span class="weak-tag">${d}</span>`)
      .join('');
  }

  // Recommended focus with context icon
  const focusEl = document.getElementById('recommended-focus');
  const focusIconEl = document.querySelector('.focus-card-icon .material-symbols-outlined');
  
  if (focusEl && data.recommendedFocus) {
    focusEl.textContent = data.recommendedFocus;
    if (focusIconEl) {
      const txt = data.recommendedFocus.toLowerCase();
      if (txt.includes('verbal')) focusIconEl.textContent = 'record_voice_over';
      else if (txt.includes('numerical')) focusIconEl.textContent = 'calculate';
      else if (txt.includes('analytical')) focusIconEl.textContent = 'analytics';
      else if (txt.includes('clerical')) focusIconEl.textContent = 'inventory_2';
      else focusIconEl.textContent = 'auto_stories';
    }
  }

  // Diagnostic score + gap-to-passing bar
  if (data.diagnostic && data.diagnostic.latestScore != null) {
    const score  = data.diagnostic.latestScore;
    const diagEl = document.getElementById('diag-score');
    if (diagEl) diagEl.textContent = score;
    const gapFill = document.getElementById('score-gap-fill');
    if (gapFill) setTimeout(() => { gapFill.style.width = score + '%'; }, 350);
    const gapBadge = document.getElementById('score-gap-badge');
    if (gapBadge) {
      const gap = 80 - score;
      if (gap > 0) {
        gapBadge.textContent = gap + ' pts to passing';
      } else {
        gapBadge.textContent = 'Passing score achieved! 🎉';
        gapBadge.style.background   = 'rgba(74,222,128,0.1)';
        gapBadge.style.color        = '#4ade80';
        gapBadge.style.borderColor  = 'rgba(74,222,128,0.3)';
      }
    }
  }


});
