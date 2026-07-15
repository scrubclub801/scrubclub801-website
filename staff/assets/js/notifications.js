(function () {
  const STORAGE_KEY = "staff_notification_preferences_v1";

  const CATEGORIES = [
    { key: "job_assigned", label: "New job assigned" },
    { key: "appointment_changed", label: "Appointment changed" },
    { key: "appointment_canceled", label: "Appointment canceled" },
    { key: "job_begins_soon", label: "Job begins soon" },
    { key: "internal_message", label: "New internal message" },
    { key: "monthly_training", label: "Monthly training update" },
    { key: "training_deadline", label: "Training deadline approaching" },
    { key: "inventory_alert", label: "Inventory alert" },
    { key: "manager_announcement", label: "Manager announcement" },
    { key: "job_follow_up", label: "End-of-job follow-up needed" },
  ];

  function readPreferences() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          optedIn: false,
          prompted: false,
          categories: Object.fromEntries(CATEGORIES.map((item) => [item.key, true])),
        };
      }
      const parsed = JSON.parse(raw);
      parsed.categories = parsed.categories || {};
      CATEGORIES.forEach((item) => {
        if (typeof parsed.categories[item.key] !== "boolean") {
          parsed.categories[item.key] = true;
        }
      });
      return parsed;
    } catch (_err) {
      return {
        optedIn: false,
        prompted: false,
        categories: Object.fromEntries(CATEGORIES.map((item) => [item.key, true])),
      };
    }
  }

  function writePreferences(prefs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return null;
    }
    try {
      return await navigator.serviceWorker.register("/staff/sw.js", { scope: "/staff/" });
    } catch (_err) {
      return null;
    }
  }

  async function requestPermission() {
    if (!("Notification" in window)) {
      return "unsupported";
    }
    return Notification.requestPermission();
  }

  function renderPrompt(prefs) {
    if (!document.body.dataset.currentRole || prefs.prompted) {
      return;
    }

    const banner = document.createElement("aside");
    banner.className = "staff-notification-prompt";
    banner.innerHTML = `
      <p>Enable staff notifications for schedule changes, assigned jobs, training updates, and internal messages?</p>
      <div>
        <button type="button" class="staff-button" data-enable-notifications>Enable Notifications</button>
        <button type="button" class="staff-admin-cancel" data-not-now>Not Now</button>
      </div>
    `;
    document.body.appendChild(banner);

    banner.querySelector("[data-enable-notifications]").addEventListener("click", async () => {
      prefs.prompted = true;
      const permission = await requestPermission();
      await registerServiceWorker();
      prefs.optedIn = permission === "granted";
      writePreferences(prefs);
      banner.remove();
    });

    banner.querySelector("[data-not-now]").addEventListener("click", () => {
      prefs.prompted = true;
      writePreferences(prefs);
      banner.remove();
    });
  }

  function renderSettingsPage() {
    const mount = document.querySelector("[data-notification-settings-root]");
    if (!mount) {
      return;
    }

    const prefs = readPreferences();

    mount.innerHTML = `
      <div class="staff-card staff-panel">
        <h2 class="staff-section-title">Notification Consent</h2>
        <p>Push notifications require HTTPS and a secure backend service.</p>
        <p>Current permission: <strong>${("Notification" in window ? Notification.permission : "unsupported")}</strong></p>
      </div>
      <div class="staff-card staff-panel">
        <h2 class="staff-section-title">Categories</h2>
        <form data-notification-categories>
          ${CATEGORIES.map((item) => `<label class="staff-checkbox"><input type="checkbox" name="${item.key}" ${prefs.categories[item.key] ? "checked" : ""} /> ${item.label}</label>`).join("")}
          <button type="submit" class="staff-button">Save Notification Preferences</button>
        </form>
      </div>
      <div class="staff-empty-state small">
        <p>Private customer details are not included in lock-screen notification previews.</p>
      </div>
    `;

    mount.querySelector("[data-notification-categories]").addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      CATEGORIES.forEach((item) => {
        prefs.categories[item.key] = formData.get(item.key) === "on";
      });
      writePreferences(prefs);
    });
  }

  window.StaffNotifications = {
    initPrompt() {
      renderPrompt(readPreferences());
    },
    initSettingsPage() {
      renderSettingsPage();
    },
  };
})();
