(function () {
  const auth = window.StaffAuth.createAuthClient();
  const NO_SECURE_EMAIL_MESSAGE = "Secure email login has not been connected yet. Use Staff Access for local testing or complete the Supabase setup.";

  function smoothFocus(node) {
    if (!node) {
      return;
    }
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = window.scrollY + node.getBoundingClientRect().top - 24;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
    node.focus({ preventScroll: true });
  }

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

  function welcomeRoleLabel(role) {
    if (role === "manager") {
      return "Manager";
    }
    if (role === "owner" || role === "admin") {
      return "Manager";
    }
    if (role === "team_lead") {
      return "Team Lead";
    }
    if (role === "employee") {
      return "Employee";
    }
    if (role === "trainee") {
      return "Trainee";
    }
    return "Staff";
  }

  function addWelcomeConfetti(host) {
    if (!host) {
      return;
    }
    host.innerHTML = "";
    const colors = ["#66c6f2", "#49d7cf", "#c9dfeb", "#edf7fc"];
    for (let i = 0; i < 18; i += 1) {
      const bit = document.createElement("span");
      bit.className = "staff-confetti-bit";
      bit.style.left = `${Math.random() * 96}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.animationDuration = `${800 + Math.floor(Math.random() * 700)}ms`;
      bit.style.animationDelay = `${Math.floor(Math.random() * 260)}ms`;
      host.appendChild(bit);
    }
  }

  async function showWelcomeThenRedirect(session) {
    const card = document.querySelector(".staff-login-card");
    const form = document.getElementById("staffLoginForm");
    const modal = document.querySelector("[data-staff-access-modal]");
    const welcome = document.querySelector("[data-login-welcome]");
    const title = document.querySelector("[data-login-welcome-title]");
    const dateNode = document.querySelector("[data-login-welcome-date]");
    const timeNode = document.querySelector("[data-login-welcome-time]");
    const confetti = document.querySelector("[data-login-confetti]");

    if (!welcome) {
      window.location.replace(getNextPath());
      return;
    }

    if (modal) {
      modal.hidden = true;
    }
    if (form) {
      form.hidden = true;
    }

    const now = new Date();
    const displayName = session.displayName || session.email || "Staff";
    const role = welcomeRoleLabel(session.role);
    title.textContent = `Welcome ${displayName} (${role})`;
    dateNode.textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    timeNode.textContent = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    addWelcomeConfetti(confetti);
    welcome.hidden = false;

    if (card) {
      smoothFocus(card);
    }
    welcome.focus({ preventScroll: true });

    await new Promise((resolve) => window.setTimeout(resolve, 2000));
    window.location.replace(getNextPath());
  }

  function mapSignInError(error) {
    const raw = String(error?.message || "").toLowerCase();
    if (raw.includes("invalid login credentials") || raw.includes("invalid_credentials")) {
      return "Incorrect email or password.";
    }
    if (raw.includes("email not confirmed")) {
      return "Email address is not verified yet. Check your inbox to confirm the account.";
    }
    if (raw.includes("not been connected")) {
      return NO_SECURE_EMAIL_MESSAGE;
    }
    return error?.message || "Sign in failed.";
  }

  async function redirectIfSignedIn() {
    const session = await auth.getSession();
    if (session) {
      window.location.replace(getNextPath());
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById("staffEmail")?.value.trim();
    if (!email) {
      message("Enter your email first, then select Forgot Password.", true);
      return;
    }

    if (!window.StaffAuth.isSecureEmailLoginConnected()) {
      message(NO_SECURE_EMAIL_MESSAGE, true);
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

    const emailField = document.getElementById("staffEmail");
    const passwordField = document.getElementById("staffPassword");
    if (emailField && passwordField) {
      emailField.addEventListener("change", () => {
        smoothFocus(passwordField);
      });
    }

    const forgot = document.querySelector("[data-forgot-password]");
    forgot?.addEventListener("click", handleForgotPassword);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = document.getElementById("staffEmail")?.value.trim().toLowerCase();
      const password = document.getElementById("staffPassword")?.value;
      const remember = document.getElementById("staffRemember")?.checked;

      if (!email || !password) {
        message("Enter email and password.", true);
        return;
      }

      if (!window.StaffAuth.isSecureEmailLoginConnected()) {
        message(NO_SECURE_EMAIL_MESSAGE, true);
        return;
      }

      const submitButton = form.querySelector("button[type='submit']");
      submitButton?.setAttribute("disabled", "true");

      try {
        const profile = await window.StaffAuth.fetchStaffProfileByEmail(email);
        if (!profile) {
          message("This email account has not been created in Staff Portal yet.", true);
          return;
        }

        await auth.signIn(email, password, remember);
        const session = await auth.getSession();
        if (!session) {
          message("Sign in failed.", true);
          return;
        }

        await showWelcomeThenRedirect(session);
      } catch (error) {
        message(mapSignInError(error), true);
      } finally {
        submitButton?.removeAttribute("disabled");
      }
    });
  }

  function setupStaffAccessModal() {
    const openButton = document.querySelector("[data-open-staff-access]");
    const modal = document.querySelector("[data-staff-access-modal]");
    const form = document.getElementById("staffAccessForm");
    const messageNode = document.querySelector("[data-staff-access-message]");
    const employeeSelect = document.getElementById("staffAccessEmployee");
    const pinField = document.getElementById("staffAccessPin");
    if (!openButton || !modal || !form || !employeeSelect || !pinField) {
      return;
    }

    function setModalMessage(text, isError = false) {
      if (!messageNode) {
        return;
      }
      messageNode.textContent = text;
      messageNode.classList.toggle("error", isError);
    }

    function openModal() {
      modal.hidden = false;
      setModalMessage("");
      smoothFocus(pinField);
      pinField.focus({ preventScroll: true });
    }

    function closeModal() {
      modal.hidden = true;
      form.reset();
      setModalMessage("");
      openButton.focus({ preventScroll: true });
    }

    openButton.addEventListener("click", openModal);

    employeeSelect.addEventListener("change", () => {
      smoothFocus(pinField);
    });

    modal.querySelectorAll("[data-close-staff-access]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const employee = employeeSelect.value;
      const pin = pinField.value.trim();
      if (!employee || !pin) {
        setModalMessage("Invalid employee credentials.", true);
        return;
      }

      const submitButton = form.querySelector("button[type='submit']");
      submitButton?.setAttribute("disabled", "true");
      try {
        await auth.signInWithStaffAccess(employee, pin);
        const session = await auth.getSession();
        if (!session) {
          setModalMessage("Invalid employee credentials.", true);
          return;
        }
        await showWelcomeThenRedirect(session);
      } catch (_err) {
        setModalMessage("Invalid employee credentials.", true);
      } finally {
        submitButton?.removeAttribute("disabled");
      }
    });
  }

  window.StaffLogin = {
    async init() {
      await redirectIfSignedIn();
      setupLoginForm();
      setupStaffAccessModal();
    },
  };
})();
