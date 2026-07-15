(function () {
  const auth = window.StaffAuth.createAuthClient();

  function safeNextPath() {
    if (window.location.pathname.startsWith("/staff/")) {
      return window.location.pathname + window.location.search + window.location.hash;
    }
    return window.StaffAuth.dashboardPath();
  }

  async function enforceAccess() {
    const requiredRole = document.body.dataset.requiredRole || "employee";
    const session = await auth.getSession();

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
    if (session.displayName) {
      document.body.dataset.currentName = session.displayName;
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
      if (!session) {
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
