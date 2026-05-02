document.addEventListener('DOMContentLoaded', () => {
  const role = document.body.dataset.role;

  if (role === 'reviewee') {
    const readiness = document.getElementById('readiness-score');
    const streak = document.getElementById('study-streak');

    if (readiness) readiness.textContent = '74%';
    if (streak) streak.textContent = '5 days';
  }
});