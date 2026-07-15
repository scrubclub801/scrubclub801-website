(function () {
  const auth = window.StaffAuth.createAuthClient();
  const ADMIN_OVERRIDE_STORAGE_KEY = window.STAFF_PORTAL_CONFIG?.adminOverrideStorageKey || "staff_admin_override";

  function getAdminOverrideSession() {
    // Placeholder: replace client-side override with server-verified token/session checks.
    try {
      const raw = sessionStorage.getItem(ADMIN_OVERRIDE_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed?.enabled) {
        return null;
      }
      const employeeName = parsed.employeeName || "Staff";
      return {
        email: parsed.email || `${employeeName.toLowerCase()}@scrubclub801.us`,
        role: parsed.role || "manager",
        name: employeeName,
        provider: "admin-override",
      };
    } catch (_err) {
      return null;
    }
  }

  function safeNextPath() {
    if (window.location.pathname.startsWith("/staff/")) {
      return window.location.pathname + window.location.search + window.location.hash;
    }
    return window.StaffAuth.dashboardPath();
  }

  async function enforceAccess() {
    const requiredRole = document.body.dataset.requiredRole || "employee";
    const session = (await auth.getSession()) || getAdminOverrideSession();

    if (!session) {
      const next = encodeURIComponent(safeNextPath());
      window.location.replace(`${window.StaffAuth.loginPath()}?next=${next}`);
      return;
    }

    if (!window.StaffAuth.canAccessRole(session.role, requiredRole)) {
      const next = encodeURIComponent(safeNextPath());
      window.location.replace(`${window.StaffAuth.loginPath()}?next=${next}`);
      return;
    }

    if (
      session.role === "employee" &&
      window.StaffTraining &&
      !window.location.pathname.startsWith("/staff/training/") &&
      window.StaffTraining.isTrainingRequired(session)
    ) {
      const next = encodeURIComponent(safeNextPath());
      window.location.replace(`/staff/training/?next=${next}`);
      return;
    }

    document.body.dataset.currentRole = session.role;
    document.body.dataset.currentEmail = session.email;
    if (session.name) {
      document.body.dataset.currentName = session.name;
    }

    const roleNodes = document.querySelectorAll("[data-role-display]");
    roleNodes.forEach((node) => {
      node.textContent = session.role;
    });

    const emailNodes = document.querySelectorAll("[data-email-display]");
    emailNodes.forEach((node) => {
      node.textContent = session.email;
    });
  }

  function subscribeSessionExpiry() {
    auth.onAuthChange((session) => {
      if (!session && !getAdminOverrideSession()) {
        const next = encodeURIComponent(safeNextPath());
        window.location.replace(`${window.StaffAuth.loginPath()}?next=${next}`);
      }
    });
  }

  window.StaffGuard = {
    auth,
    enforceAccess,
    subscribeSessionExpiry,
  };
})();
