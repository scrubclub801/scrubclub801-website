(function () {
  const auth = window.StaffAuth.createAuthClient();
  const ADMIN_OVERRIDE_STORAGE_KEY = window.STAFF_PORTAL_CONFIG?.adminOverrideStorageKey || "staff_admin_override";
  const ADMIN_MAX_ATTEMPTS = 5;
  const STAFF_ADMIN_CREDENTIALS = [
    { name: "Nella", pin: ["20", "08"].join("") },
    { name: "Baylee", pin: ["20", "07"].join("") },
  ];
  let adminAttempts = 0;
  let welcomeTimer = null;
  let clockTimer = null;

  function message(text, isError = false) {
    const node = document.querySelector("[data-login-message]");
    if (!node) {
      return;
    }
    node.textContent = text;
    node.classList.toggle("error", isError);
  }

  function getNextPath() {
    const search = new URLSearchParams(window.location.search);
    const next = search.get("next");
    if (next && next.startsWith("/staff/")) {
      return next;
    }
    return window.StaffAuth.dashboardPath();
  }

  async function redirectIfSignedIn() {
    const session = await auth.getSession();
    if (session) {
      window.location.replace(getNextPath());
    }
  }

  function adminMessage(text, isError = false) {
    const node = document.querySelector("[data-admin-message]");
    if (!node) {
      return;
    }
    node.textContent = text;
    node.classList.toggle("error", isError);
  }

  function getGreetingPrefix(date) {
    const hour = date.getHours();
    if (hour < 12) {
      return "Good morning";
    }
    if (hour < 18) {
      return "Good afternoon";
    }
    return "Good evening";
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }

  function updateWelcomeTime() {
    const now = new Date();
    const dateNode = document.querySelector("[data-welcome-date]");
    const timeNode = document.querySelector("[data-welcome-time]");
    const toneNode = document.querySelector("[data-welcome-tone]");
    if (dateNode) {
      dateNode.textContent = formatDate(now);
    }
    if (timeNode) {
      timeNode.textContent = formatTime(now);
    }
    if (toneNode) {
      toneNode.textContent = getGreetingPrefix(now);
    }
  }

  function renderConfetti() {
    const root = document.querySelector("[data-confetti]");
    if (!root) {
      return;
    }

    root.innerHTML = "";
    const colors = ["#66c6f2", "#8fe2f0", "#c9dfeb", "#2f4967"];
    for (let i = 0; i < 28; i += 1) {
      const bit = document.createElement("span");
      bit.className = "staff-confetti-bit";
      bit.style.left = `${Math.random() * 100}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = `${Math.random() * 0.3}s`;
      bit.style.animationDuration = `${1.3 + Math.random() * 0.9}s`;
      bit.style.opacity = `${0.65 + Math.random() * 0.35}`;
      root.appendChild(bit);
    }

    window.setTimeout(() => {
      root.innerHTML = "";
    }, 2000);
  }

  async function verifyEmployeeAccess(employeeName, inputPin) {
    // Placeholder: replace this client check with server-side verification.
    // Example future flow: POST /api/staff/access/verify with IP throttling and audit logs.
    const record = STAFF_ADMIN_CREDENTIALS.find((candidate) => candidate.name === employeeName);
    if (!record) {
      return false;
    }
    return inputPin === record.pin;
  }

  function enableAdminOverrideSession(employeeName) {
    // Placeholder: replace local storage with a short-lived, signed server-issued token.
    sessionStorage.setItem(
      ADMIN_OVERRIDE_STORAGE_KEY,
      JSON.stringify({
        enabled: true,
        role: "manager",
        employeeName,
        email: `${employeeName.toLowerCase()}@scrubclub801.us`,
        at: Date.now(),
      })
    );
  }

  function resetWelcomeTimers() {
    if (welcomeTimer) {
      window.clearTimeout(welcomeTimer);
      welcomeTimer = null;
    }
    if (clockTimer) {
      window.clearInterval(clockTimer);
      clockTimer = null;
    }
  }

  function showFormView() {
    const formView = document.querySelector("[data-admin-form-view]");
    const welcomeView = document.querySelector("[data-admin-welcome-view]");
    if (formView) {
      formView.hidden = false;
    }
    if (welcomeView) {
      welcomeView.hidden = true;
    }
  }

  function showWelcomeView(employeeName) {
    const formView = document.querySelector("[data-admin-form-view]");
    const welcomeView = document.querySelector("[data-admin-welcome-view]");
    const nameNode = document.querySelector("[data-welcome-name]");

    if (formView) {
      formView.hidden = true;
    }
    if (welcomeView) {
      welcomeView.hidden = false;
    }
    if (nameNode) {
      nameNode.textContent = employeeName;
    }

    updateWelcomeTime();
    resetWelcomeTimers();
    clockTimer = window.setInterval(updateWelcomeTime, 1000);
    renderConfetti();
    welcomeTimer = window.setTimeout(() => {
      resetWelcomeTimers();
      window.location.replace(window.StaffAuth.dashboardPath());
    }, 3000);
  }

  function closeAdminModal() {
    const modal = document.querySelector("[data-admin-modal]");
    const input = document.getElementById("staffAccessPin");
    if (!modal) {
      return;
    }
    modal.hidden = true;
    document.body.style.overflow = "";
    resetWelcomeTimers();
    showFormView();
    if (input) {
      input.value = "";
    }
    adminMessage("");
  }

  function openAdminModal() {
    const modal = document.querySelector("[data-admin-modal]");
    const input = document.getElementById("staffAccessPin");
    if (!modal) {
      return;
    }
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    showFormView();
    adminMessage("");
    if (input) {
      input.value = "";
      window.requestAnimationFrame(() => input.focus());
    }
  }

  function setupAdminOverride() {
    const openButton = document.querySelector("[data-open-admin-modal]");
    const modal = document.querySelector("[data-admin-modal]");
    const closeButtons = document.querySelectorAll("[data-close-admin-modal]");
    const form = document.querySelector("[data-admin-form]");

    if (!openButton || !modal || !form) {
      return;
    }

    openButton.addEventListener("click", () => {
      openAdminModal();
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeAdminModal();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        closeAdminModal();
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (adminAttempts >= ADMIN_MAX_ATTEMPTS) {
        adminMessage("Too many failed attempts. Refresh the page to try again.", true);
        return;
      }

      const employeeName = document.getElementById("staffAccessEmployee")?.value?.trim() || "";
      const pinInput = document.getElementById("staffAccessPin");
      const pin = pinInput?.value?.trim() || "";
      if (!employeeName || !pin) {
        adminMessage("Enter employee and access PIN.", true);
        return;
      }

      const isValid = await verifyEmployeeAccess(employeeName, pin);
      if (isValid) {
        enableAdminOverrideSession(employeeName);
        showWelcomeView(employeeName);
        return;
      }

      adminAttempts += 1;
      if (adminAttempts >= ADMIN_MAX_ATTEMPTS) {
        adminMessage("Invalid employee credentials. Refresh the page to try again.", true);
      } else {
        adminMessage("Invalid employee credentials.", true);
      }
    });
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById("staffEmail")?.value.trim();
    if (!email) {
      message("Enter your email first, then select Forgot Password.", true);
      return;
    }

    try {
      await auth.sendPasswordReset(email);
      message("Password reset email sent.");
    } catch (error) {
      message(error?.message || "Unable to send password reset email.", true);
    }
  }

  function setupLoginForm() {
    const form = document.getElementById("staffLoginForm");
    if (!form) {
      return;
    }

    const forgot = document.querySelector("[data-forgot-password]");
    forgot?.addEventListener("click", handleForgotPassword);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = document.getElementById("staffEmail")?.value.trim();
      const password = document.getElementById("staffPassword")?.value;
      const remember = document.getElementById("staffRemember")?.checked;

      if (!email || !password) {
        message("Enter email and password.", true);
        return;
      }

      const submitButton = form.querySelector("button[type='submit']");
      submitButton?.setAttribute("disabled", "true");

      try {
        await auth.signIn(email, password, remember);
        window.location.replace(getNextPath());
      } catch (error) {
        message(error?.message || "Sign in failed.", true);
      } finally {
        submitButton?.removeAttribute("disabled");
      }
    });
  }

  window.StaffLogin = {
    init() {
      redirectIfSignedIn();
      setupLoginForm();
      setupAdminOverride();
    },
  };
})();
