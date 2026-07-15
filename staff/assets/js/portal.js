(function () {
  const NAV_ITEMS = [
    { label: "Dashboard", href: "/staff/dashboard/", role: "trainee", icon: "dashboard" },
    { label: "Appointments", href: "/staff/appointments/", role: "employee", icon: "calendar" },
    { label: "Quotes", href: "/staff/quotes/", role: "employee", icon: "quotes" },
    { label: "Clients", href: "/staff/customers/", role: "employee", icon: "customers" },
    { label: "Payments", href: "/staff/payments/", role: "employee", icon: "payments" },
    { label: "Customer Health", href: "/staff/customer-health/", role: "employee", icon: "health" },
    { label: "Employees", href: "/staff/employees/", role: "team_lead", icon: "employees" },
    { label: "Training Center", href: "/staff/training/", role: "trainee", icon: "training" },
    { label: "Inventory", href: "/staff/inventory/", role: "employee", icon: "inventory" },
    { label: "Messages", href: "/staff/messages/", role: "trainee", icon: "messages" },
    { label: "Notification Settings", href: "/staff/notification-settings/", role: "trainee", icon: "messages" },
    { label: "Audit Log", href: "/staff/audit-log/", role: "admin", icon: "analytics" },
    { label: "Analytics", href: "/staff/analytics/", role: "manager", icon: "analytics" },
    { label: "Settings", href: "/staff/settings/", role: "admin", icon: "settings" },
  ];

  const ACTION_TARGETS = {
    dashboard: "/staff/dashboard/",
    training: "/staff/training/",
    inventory: "/staff/inventory/",
    messages: "/staff/messages/",
    notificationSettings: "/staff/notification-settings/",
    auditLog: "/staff/audit-log/",
    quotes: "/staff/quotes/",
    appointments: "/staff/appointments/",
    customers: "/staff/customers/",
    payments: "/staff/payments/",
    customerHealth: "/staff/customer-health/",
    employees: "/staff/employees/",
    analytics: "/staff/analytics/",
    settings: "/staff/settings/",
    login: "/staff/",
  };

  function iconSvg(name) {
    const icons = {
      dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"></rect><rect x="13" y="3" width="8" height="5" rx="2"></rect><rect x="13" y="10" width="8" height="11" rx="2"></rect><rect x="3" y="13" width="8" height="8" rx="2"></rect></svg>',
      calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3"></rect><line x1="8" y1="2.5" x2="8" y2="6.5"></line><line x1="16" y1="2.5" x2="16" y2="6.5"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg>',
      quotes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"></path><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="13" y2="17"></line></svg>',
      customers: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"></circle><path d="M3.5 19c.7-3.1 3-5 5.5-5s4.8 1.9 5.5 5"></path><circle cx="17" cy="9" r="2.2"></circle><path d="M14.5 18.5c.4-1.8 1.8-3.1 3.5-3.5"></path></svg>',
      payments: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3"></rect><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h3"></path><path d="M14 14h2"></path></svg>',
      health: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.2-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.8-7 10-7 10z"></path></svg>',
      employees: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"></circle><path d="M5 20c.9-3.8 3.6-6 7-6s6.1 2.2 7 6"></path></svg>',
      training: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5l8-3.5l8 3.5v6.5c0 4.1-2.4 6.9-8 8.5c-5.6-1.6-8-4.4-8-8.5z"></path><polyline points="8.5,12.5 11,15 15.5,10.5"></polyline></svg>',
      inventory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4l8 4v10l-8 4l-8-4z"></path><polyline points="4,7 12,11 20,7"></polyline><line x1="12" y1="11" x2="12" y2="21"></line></svg>',
      messages: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H8l-4 4z"></path><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="12" x2="13" y2="12"></line></svg>',
      analytics: '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="4" y1="20" x2="20" y2="20"></line><rect x="6" y="11" width="3" height="9" rx="1"></rect><rect x="11" y="7" width="3" height="13" rx="1"></rect><rect x="16" y="4" width="3" height="16" rx="1"></rect></svg>',
      settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"></circle><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2a1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9a1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1a1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6a1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9h.1a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6z"></path></svg>',
    };
    return icons[name] || icons.dashboard;
  }

  function buildSidebar(role) {
    const navRoot = document.querySelector("[data-staff-nav]");
    if (!navRoot) {
      return;
    }

    const currentPath = window.location.pathname;

    navRoot.innerHTML = "";

    NAV_ITEMS
      .filter((item) => window.StaffAuth.canAccessRole(role, item.role))
      .forEach((item) => {
        const link = document.createElement("a");
        link.className = "staff-nav-link";
        link.href = item.href;
        link.innerHTML = `<span class="staff-nav-link-icon">${iconSvg(item.icon)}</span><span class="staff-nav-link-text">${item.label}</span>`;
        if (currentPath === item.href || currentPath.startsWith(item.href)) {
          link.classList.add("active");
          link.setAttribute("aria-current", "page");
        }
        navRoot.appendChild(link);
      });
  }

  function goToRoute(href) {
    if (!href || !href.startsWith("/staff/")) {
      return;
    }
    try {
      sessionStorage.setItem("staff-scroll-top-on-load", "1");
    } catch (_err) {
      // Ignore storage failures.
    }
    window.location.assign(href);
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_err) {
      return false;
    }
  }

  function headerOffset() {
    const header = document.querySelector(".staff-top");
    if (!header) {
      return 16;
    }
    return Math.max(16, header.getBoundingClientRect().height + 10);
  }

  function isFullyVisible(node) {
    if (!node) {
      return false;
    }
    const rect = node.getBoundingClientRect();
    const top = headerOffset();
    const bottom = window.innerHeight;
    return rect.top >= top && rect.bottom <= bottom;
  }

  function scrollToElement(node, options) {
    if (!node) {
      return;
    }

    if (isFullyVisible(node)) {
      if (options?.focus) {
        node.focus({ preventScroll: true });
      }
      return;
    }

    const reduceMotion = prefersReducedMotion();
    const top = window.scrollY + node.getBoundingClientRect().top - headerOffset();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reduceMotion ? "auto" : "smooth",
    });

    if (options?.focus) {
      window.setTimeout(() => {
        node.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 240);
    }
  }

  function restoreTopScrollIfRequested() {
    let shouldScrollTop = false;
    try {
      shouldScrollTop = sessionStorage.getItem("staff-scroll-top-on-load") === "1";
      if (shouldScrollTop) {
        sessionStorage.removeItem("staff-scroll-top-on-load");
      }
    } catch (_err) {
      shouldScrollTop = false;
    }

    if (!shouldScrollTop) {
      return;
    }

    const reduceMotion = prefersReducedMotion();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function scrollToSection(sectionKey) {
    if (!sectionKey) {
      return false;
    }
    const node = document.querySelector(`[data-section-key="${sectionKey}"]`);
    if (!node) {
      return false;
    }
    scrollToElement(node);
    return true;
  }

  function canUseEmployeePortalEnhancements() {
    const role = document.body.dataset.currentRole || "guest";
    return window.StaffAuth.canAccessRole(role, "employee");
  }

  function setupBackToTopButton() {
    if (!canUseEmployeePortalEnhancements()) {
      return;
    }

    if (document.querySelector("[data-back-to-top]")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "staff-back-to-top";
    button.setAttribute("data-back-to-top", "true");
    button.setAttribute("aria-label", "Scroll to top");
    button.textContent = "Back to Top";
    document.body.appendChild(button);

    button.classList.add("visible");

    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function setupAssistant() {
    const role = document.body.dataset.currentRole || "guest";
    if (!window.StaffAuth.canAccessRole(role, "employee")) {
      return;
    }

    const startAssistant = () => {
      if (window.StaffAssistant && typeof window.StaffAssistant.init === "function") {
        window.StaffAssistant.init();
      }
    };

    if (window.StaffAssistant) {
      startAssistant();
      return;
    }

    if (document.querySelector('script[data-assistant-script="true"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src = "/staff/assets/js/ai-assistant.js";
    script.defer = true;
    script.setAttribute("data-assistant-script", "true");
    script.addEventListener("load", startAssistant);
    document.head.appendChild(script);
  }

  function setupRouteActions() {
    const currentRole = document.body.dataset.currentRole || "employee";

    document.querySelectorAll("[data-scroll-target]").forEach((node) => {
      const jumpToTarget = (event) => {
        const sectionKey = node.getAttribute("data-scroll-target");
        if (!sectionKey) {
          return;
        }
        if (!scrollToSection(sectionKey)) {
          return;
        }
        event.preventDefault();
      };

      node.addEventListener("click", jumpToTarget);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          jumpToTarget(event);
        }
      });
    });

    document.querySelectorAll("[data-nav-target]").forEach((node) => {
      const requiredRole = node.getAttribute("data-required-role");
      if (requiredRole && !window.StaffAuth.canAccessRole(currentRole, requiredRole)) {
        node.remove();
        return;
      }

      const navigateToTarget = (event) => {
        const targetKey = node.getAttribute("data-nav-target");
        if (scrollToSection(targetKey)) {
          event.preventDefault();
          return;
        }
        const href = ACTION_TARGETS[targetKey];
        if (!href) {
          return;
        }
        event.preventDefault();
        goToRoute(href);
      };

      node.addEventListener("click", (event) => {
        navigateToTarget(event);
      });

      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          navigateToTarget(event);
        }
      });
    });

    document.querySelectorAll("[data-go-home]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        goToRoute(window.StaffAuth.dashboardPath());
      });
    });

    document.querySelectorAll("[data-go-back]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        goToRoute(window.StaffAuth.dashboardPath());
      });
    });
  }

  function setupSignOut() {
    const signOut = document.querySelector("[data-sign-out]");
    if (!signOut) {
      return;
    }

    signOut.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        await window.StaffGuard.auth.signOut();
      } catch (_err) {
        // Ignore errors and continue redirect so session is never left dangling in UI.
      }
      window.location.replace(window.StaffAuth.loginPath());
    });
  }

  function updateTrainingStatusChip() {
    const statusNodes = document.querySelectorAll("[data-training-status]");
    if (!statusNodes.length || !window.StaffTraining) {
      return;
    }

    const role = document.body.dataset.currentRole || "employee";
    const email = document.body.dataset.currentEmail || "";
    const name = document.body.dataset.currentName || "";
    const status = window.StaffTraining.getProgressForUser({ role, email, name });
    const label = status.complete ? "Training Complete" : status.progressPercent > 0 ? "Training In Progress" : "Training Not Started";

    statusNodes.forEach((node) => {
      node.textContent = label;
      node.classList.toggle("is-complete", status.complete);
      node.classList.toggle("is-required", !status.complete);
    });
  }

  async function initProtectedPage() {
    await window.StaffGuard.enforceAccess();
    window.StaffGuard.subscribeSessionExpiry();
    buildSidebar(document.body.dataset.currentRole || "employee");
    restoreTopScrollIfRequested();
    setupRouteActions();
    setupBackToTopButton();
    updateTrainingStatusChip();
    setupSignOut();
    setupAssistant();
  }

  window.StaffPortal = {
    initProtectedPage,
    scrollToElement,
    isFullyVisible,
    prefersReducedMotion,
  };
})();
