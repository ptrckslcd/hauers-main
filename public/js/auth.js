const EYE_OPEN  = `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
const EYE_CLOSED = `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;

function wireEyeToggle(btnId, inputId) {
  const btn   = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const show = input.getAttribute('type') === 'password';
    input.setAttribute('type', show ? 'text' : 'password');
    btn.innerHTML = show ? EYE_CLOSED : EYE_OPEN;
  });
}

/* ── OTP: auto-advance, backspace, arrow keys, paste ─────────────── */
function initOTPBoxes(boxes) {
  if (!boxes || !boxes.length) return;
  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1);
      box.classList.toggle('filled', box.value !== '');
      if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace') {
        if (box.value) {
          box.value = '';
          box.classList.remove('filled');
        } else if (i > 0) {
          boxes[i - 1].value = '';
          boxes[i - 1].classList.remove('filled');
          boxes[i - 1].focus();
        }
      }
      if (e.key === 'ArrowLeft'  && i > 0)               boxes[i - 1].focus();
      if (e.key === 'ArrowRight' && i < boxes.length - 1) boxes[i + 1].focus();
    });
    box.addEventListener('paste', e => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach((d, j) => {
        if (boxes[j]) { boxes[j].value = d; boxes[j].classList.add('filled'); }
      });
      boxes[Math.min(digits.length, boxes.length - 1)].focus();
    });
    box.addEventListener('focus', () => box.select());
  });
}

/* Assemble box values into hidden input; returns true if all 6 filled */
function assembleOTP(boxes, hiddenField) {
  const value = boxes.map(b => b.value).join('');
  if (hiddenField) hiddenField.value = value;
  return value.length === 6;
}

/* ── Resend countdown timer ─────────────────────────────────────── */
function startResendTimer(countdownId, resendBtnId, seconds, onResend) {
  const countdownEl = document.getElementById(countdownId);
  const resendBtn   = document.getElementById(resendBtnId);
  if (!countdownEl || !resendBtn) return;
  let remaining = seconds || 90;
  resendBtn.disabled = true;
  function tick() {
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    countdownEl.textContent = `${m}:${s}`;
    if (remaining <= 0) { countdownEl.textContent = ''; resendBtn.disabled = false; return; }
    remaining--;
    setTimeout(tick, 1000);
  }
  tick();
  resendBtn.addEventListener('click', () => {
    if (resendBtn.disabled) return;
    remaining = seconds || 90;
    resendBtn.disabled = true;
    tick();
    if (typeof onResend === 'function') onResend();
  });
}

/* ── Forgot-password two-step ───────────────────────────────────── */
function initForgotPassword() {
  const step1 = document.getElementById('fp-step-1');
  const step2 = document.getElementById('fp-step-2');
  if (!step1 || !step2) return;

  const emailForm      = document.getElementById('fp-email-form');
  const emailDisplay   = document.getElementById('fp-email-display');
  const hiddenEmail    = document.getElementById('fp-hidden-email');
  const changeEmailBtn = document.getElementById('fp-change-email');
  const otpForm        = document.getElementById('fp-otp-form');
  const otpHidden      = document.getElementById('fp-otp-value');
  const otpBoxes       = Array.from(step2.querySelectorAll('.otp-box'));

  step1.classList.add('active');

  emailForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('fp-email').value.trim();
    if (emailDisplay) emailDisplay.textContent = email;
    if (hiddenEmail)  hiddenEmail.value = email;
    step1.classList.remove('active');
    step2.classList.add('active');
    initOTPBoxes(otpBoxes);
    startResendTimer('fp-countdown', 'fp-resend-btn', 90);
    if (otpBoxes[0]) otpBoxes[0].focus();
  });

  if (otpForm) {
    otpForm.addEventListener('submit', e => {
      if (!assembleOTP(otpBoxes, otpHidden)) e.preventDefault();
    });
  }

  if (changeEmailBtn) {
    changeEmailBtn.addEventListener('click', () => {
      step2.classList.remove('active');
      step1.classList.add('active');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initThemeToggle === 'function') initThemeToggle();

  // Login / signup / reset password eye toggles
  wireEyeToggle('toggle-password',         'password');
  wireEyeToggle('toggle-confirm-password', 'confirm-password');
  wireEyeToggle('toggle-new-password',     'new-password');

  // Email-verify OTP page (signup-success.html)
  const otpForm   = document.getElementById('otp-form');
  const otpBoxes  = Array.from(document.querySelectorAll('#otp-form .otp-box'));
  const otpHidden = document.getElementById('otp-value');
  if (otpBoxes.length) {
    initOTPBoxes(otpBoxes);
    startResendTimer('otp-countdown', 'otp-resend-btn', 90);
    if (otpBoxes[0]) otpBoxes[0].focus();
    if (otpForm) {
      otpForm.addEventListener('submit', e => {
        if (!assembleOTP(otpBoxes, otpHidden)) e.preventDefault();
      });
    }
  }

  // Forgot-password two-step
  initForgotPassword();
});
