// ── AUTH MODAL LOGIC VARIABLES ──
const authModal = document.getElementById('authModal');
const authTabsContainer = document.getElementById('authTabsContainer');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const formLogin = document.getElementById('form-login');
const formSignup = document.getElementById('form-signup');
const formForgot = document.getElementById('form-forgot');
const authHeaderTitle = document.querySelector('.auth-header h3');
const authHeaderDesc = document.querySelector('.auth-header p');

function openAuthModal(type) {
  authModal.classList.add('active');
  document.body.style.overflow = 'hidden'; 
  switchTab(type);
}

function closeAuthModal() {
  authModal.classList.remove('active');
  document.body.style.overflow = 'auto'; 
}

function switchTab(type) {
  formLogin.classList.remove('active');
  formSignup.classList.remove('active');
  formForgot.classList.remove('active');
  
  if (type === 'login') {
    authTabsContainer.style.display = 'flex';
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    formLogin.classList.add('active');
    authHeaderTitle.textContent = "Welcome Back";
    authHeaderDesc.textContent = "Manage your child's bus transport easily.";
  } 
  else if (type === 'signup') {
    authTabsContainer.style.display = 'flex';
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    formSignup.classList.add('active');
    authHeaderTitle.textContent = "Create Account";
    authHeaderDesc.textContent = "Join Snehal Bus Service today.";
  } 
  else if (type === 'forgot') {
    authTabsContainer.style.display = 'none'; 
    formForgot.classList.add('active');
    authHeaderTitle.textContent = "Reset Password";
    authHeaderDesc.textContent = "Enter your registered details to recover account.";
  }
}

authModal.addEventListener('click', function(e) {
  if (e.target === authModal) {
    closeAuthModal();
  }
});

function showToast(message, isSuccess = true) {
  const toast = document.getElementById('customToast');
  const toastText = document.getElementById('toastText');
  const toastIcon = document.getElementById('toastIcon');
  
  toastText.textContent = message;
  if(isSuccess) {
    toast.style.background = '#2ECC71'; 
    toastIcon.textContent = '✅';
  } else {
    toast.style.background = '#E74C3C'; 
    toastIcon.textContent = '⚠️';
  }
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

// ── FIXED: SECURE LOGIN SUBMISSION VIA PURE EMAIL ──
function handleLogin(e) {
  e.preventDefault(); 

  const emailVal = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailVal)) {
    showToast("Please enter a valid Email Address!", false);
    return;
  }

  fetch("http://localhost:5000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailVal, password: password })
  })
  .then(res => res.json()) 
  .then(data => {
    if (data.status === "Success" || data.email) {
      closeAuthModal();
      showToast("Login Successful! Redirecting...", true);
      
      localStorage.setItem('userLoggedIn', 'true');
      localStorage.setItem('userName', data.name);
      localStorage.setItem('userPhone', data.email); // userPhone slot matches local dashboard logic
      
      setTimeout(() => { window.location.href = "dashboard.html"; }, 1500);
    } else {
      showToast(data.message || "Invalid credentials!", false); 
    }
  })
  .catch(err => {
    console.error("Login Fetch Error, checking manual fallback options:", err);
    if (password === "123456") {
      showToast("Offline Simulation Mode Active!", true);
      let nameField = emailVal.split('@')[0];
      localStorage.setItem('userLoggedIn', 'true');
      localStorage.setItem('userName', nameField.charAt(0).toUpperCase() + nameField.slice(1));
      localStorage.setItem('userPhone', emailVal);
      setTimeout(() => { window.location.href = "dashboard.html"; }, 1500);
    } else {
      showToast("Invalid credentials! To test locally without server, use password '123456'", false);
    }
  });
}

// ── FIXED: PURE EMAIL SIGN-UP SUBMISSION ──
function handleSignup(e) {
  e.preventDefault(); 

  const name = document.getElementById('signup-name').value.trim();
  const emailVal = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailVal)) {
    showToast("Please enter a valid Email Address!", false);
    return;
  }

  fetch("http://localhost:5000/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email: emailVal, password })
  })
  .then(res => res.text())
  .then(data => {
    if (data.includes("पहले से रजिस्टर्ड") || data.includes("already registered")) {
       showToast("Email ID already registered!", false);
    } else {
       closeAuthModal();
       showToast("Account Created Successfully! Please Login.", true);
       
       let registeredEmails = JSON.parse(localStorage.getItem('registered_emails_sim') || '[]');
       registeredEmails.push({ email: emailVal, name: name, password: password });
       localStorage.setItem('registered_emails_sim', JSON.stringify(registeredEmails));

       switchTab('login'); 
    }
  })
  .catch(err => {
    console.error(err);
    let registeredEmails = JSON.parse(localStorage.getItem('registered_emails_sim') || '[]');
    const standsExist = registeredEmails.find(u => u.email === emailVal);

    if (standsExist) {
      showToast("Simulation Error: This Email ID is already registered!", false);
    } else {
      closeAuthModal();
      showToast("Server Offline! Simulation Account Created. Please Login.", true);
      registeredEmails.push({ email: emailVal, name: name, password: "123456" });
      localStorage.setItem('registered_emails_sim', JSON.stringify(registeredEmails));
      switchTab('login');
    }
  });
}

// ── FORGOT PASSWORD HANDLERS ──
function handleForgotPassword(e) {
  e.preventDefault(); 
  const emailVal = document.getElementById('forgot-identity').value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(emailVal)) {
    showToast("Please enter a valid Email Address!", false);
    return;
  }

  fetch("http://localhost:5000/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: emailVal })
  })
  .then(res => res.text())
  .then(data => {
    showToast("Verification OTP sent successfully!", true);
    document.getElementById('forgot-step-mobile').style.display = 'none';
    document.getElementById('forgot-step-otp').style.display = 'block';
  })
  .catch(err => {
    console.error(err);
    showToast("Server Offline! Simulation OTP sent.", true);
    document.getElementById('forgot-step-mobile').style.display = 'none';
    document.getElementById('forgot-step-otp').style.display = 'block';
  });
}

function handleVerifyOTP(e) {
  if(e) e.preventDefault();
  const emailVal = document.getElementById('forgot-identity').value.trim().toLowerCase();
  const otpEntered = document.getElementById('forgot-otp-input').value.trim();
  const newPassword = document.getElementById('forgot-new-password').value.trim();

  if (otpEntered.length !== 4) {
    showToast("Please enter a valid 4-digit OTP code!", false);
    return;
  }
  if (newPassword.length < 6) {
    showToast("Password must be at least 6 characters long!", false);
    return;
  }

  fetch("http://localhost:5000/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailVal, otp: otpEntered, newPassword: newPassword })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "Success") {
      showToast("Password updated successfully! Please login.", true);
      resetForgotFormLayout();
      switchTab('login'); 
    } else {
      showToast(data.message || "Invalid OTP code!", false);
    }
  })
  .catch(err => {
    console.error(err);
    if (otpEntered === "1234") {
      showToast("Offline Success: Password reset simulation completed!", true);
      resetForgotFormLayout();
      switchTab('login');
    } else {
      showToast("Invalid OTP! (Use '1234' for simulation)", false);
    }
  });
}

function resetForgotFormLayout() {
  if(document.getElementById('forgot-step-mobile')) document.getElementById('forgot-step-mobile').style.display = 'block';
  if(document.getElementById('forgot-step-otp')) document.getElementById('forgot-step-otp').style.display = 'none';
  document.getElementById('forgot-identity').value = '';
  document.getElementById('forgot-otp-input').value = '';
  document.getElementById('forgot-new-password').value = '';
}

const originalSwitchTab = window.switchTab;
window.switchTab = function(type) {
  if (type === 'forgot') { resetForgotFormLayout(); }
  if (typeof originalSwitchTab === 'function') { originalSwitchTab(type); }
};

// ── CAROUSEL IMAGE SLIDESHOW LOGIC ──
const totalSlides = 6;
let activeIndex = 0;
const track = document.getElementById('slidesTrack');
const badge = document.getElementById('slideBadge');
const thumbsContainer = document.getElementById('thumbsContainer');

const slideImages = [
  { src: "WhatsApp Image 2026-06-01 at 8.01.37 PM.jpeg", fallback: "https://placehold.co/100x68/1A2456/FFD600?text=Students+1" },
  { src: "WhatsApp Image 2026-06-01 at 8.01.37 PM (1).jpeg", fallback: "https://placehold.co/100x68/1A2456/FFD600?text=Event+2" },
  { src: "WhatsApp Image 2026-06-01 at 8.01.38 PM (1).jpg", fallback: "https://placehold.co/100x68/1A2456/FFD600?text=RS+Mundle+3" },
  { src: "WhatsApp Image 2026-06-01 at 8.01.38 PM (2).jpeg", fallback: "https://placehold.co/100x68/1A2456/FFD600?text=Yellow+Bus+4" },
  { src: "WhatsApp Image 2026-06-01 at 8.01.38 PM (3).jpeg", fallback: "https://placehold.co/100x68/1A2456/FFD600?text=Blue+Uniform+5" },
  { src: "WhatsApp Image 2026-06-01 at 8.01.38 PM.jpeg", fallback: "https://placehold.co/100x68/1A2456/FFD600?text=Transit+Van+6" }
];

function initializeThumbnails() {
  if(!thumbsContainer) return;
  thumbsContainer.innerHTML = '';
  slideImages.forEach((imgObj, i) => {
    const thumb = document.createElement('div');
    thumb.className = `thumb-card ${i === 0 ? 'active' : ''}`;
    thumb.setAttribute('onclick', `gotoSlide(${i})`);
    const img = document.createElement('img');
    img.src = imgObj.src;
    img.alt = `Slide ${i + 1}`;
    img.onerror = function() { this.src = imgObj.fallback; };
    thumb.appendChild(img);
    thumbsContainer.appendChild(thumb);
  });
}

function updateSliderView() {
  if(!track) return;
  track.style.transform = `translateX(-${activeIndex * 100}%)`;
  badge.textContent = `${activeIndex + 1} / ${totalSlides}`;
  const thumbs = document.querySelectorAll('.thumb-card');
  thumbs.forEach((t, i) => {
    if (i === activeIndex) {
      t.classList.add('active');
      t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else { t.classList.remove('active'); }
  });
}

function slideNext() {
  if (activeIndex < totalSlides - 1) { activeIndex++; } else { activeIndex = 0; }
  updateSliderView();
}
function slidePrev() {
  if (activeIndex > 0) { activeIndex--; } else { activeIndex = totalSlides - 1; }
  updateSliderView();
}
function gotoSlide(index) {
  activeIndex = index;
  updateSliderView();
}
window.addEventListener('DOMContentLoaded', () => { initializeThumbnails(); });