document.addEventListener('DOMContentLoaded', () => {
  const sidebarMenu = document.getElementById('sidebar-menu');
  if (!sidebarMenu) return;

  const role = document.body.dataset.role;
  const currentPath = window.location.pathname;

  const revieweeLinks = [
    { label: 'Dashboard', href: '/reviewee/dashboard' },
    { label: 'Onboarding', href: '/reviewee/onboarding' },
    { label: 'Learner Profile', href: '/reviewee/learner-profile' },
    { label: 'Diagnostic', href: '/reviewee/diagnostic' },
    { label: 'Diagnostic Result', href: '/reviewee/diagnostic-result' },
    { label: 'Quiz', href: '/reviewee/quiz' },
    { label: 'Study Plan', href: '/reviewee/study-plan' },
    { label: 'Progress', href: '/reviewee/progress' },
    { label: 'Materials', href: '/reviewee/materials' },
    { label: 'Settings', href: '/reviewee/settings' },
    { label: 'Terms of Use', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' }
  ];

  const adminLinks = [
    { label: 'Home', href: '/admin/home' },
    { label: 'Reviewees', href: '/admin/reviewees' },
    { label: 'Question Bank', href: '/admin/question-bank' },
    { label: 'Reports', href: '/admin/reports' }
  ];

  const links = role === 'admin' ? adminLinks : revieweeLinks;

  sidebarMenu.innerHTML = links
    .map((link) => {
      const isActive = currentPath === link.href;
      return `
        <li class="sidebar-item">
          <a href="${link.href}" class="sidebar-link ${isActive ? 'active' : ''}">
            ${link.label}
          </a>
        </li>
      `;
    })
    .join('');
});