(function () {
  const auth = window.StaffAuth.createAuthClient();

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

    const employeeSelect = document.getElementById("staffAccessEmployee");
    const pinField = document.getElementById("staffAccessPin");
    if (employeeSelect && pinField) {
      employeeSelect.addEventListener("change", () => {
        smoothFocus(pinField);
      });
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
    },
  };
})();
