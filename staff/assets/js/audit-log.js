(function () {
  function formatDate(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function row(item) {
    return `
      <tr>
        <td>${formatDate(item.created_at)}</td>
        <td>${item.actor_name || item.actor_email || "System"}</td>
        <td>${item.action || "unknown"}</td>
        <td>${item.target_table || ""}</td>
        <td>${item.target_id || ""}</td>
        <td>${item.previous_value ? "Yes" : "No"}</td>
        <td>${item.new_value ? "Yes" : "No"}</td>
      </tr>
    `;
  }

  async function initAuditLogPage() {
    const root = document.querySelector("[data-audit-log-root]");
    if (!root) {
      return;
    }

    if (!window.StaffDb?.isSupabaseConfigured()) {
      root.innerHTML = '<div class="staff-empty-state"><h3>Audit data unavailable.</h3><p>Connect secure backend logging to load immutable audit events.</p></div>';
      return;
    }

    const logs = await window.StaffDb.fetchAuditLogs();
    if (!logs.length) {
      root.innerHTML = '<div class="staff-empty-state"><h3>No audit entries yet.</h3><p>Changes to staff records will appear once backend logging is active.</p></div>';
      return;
    }

    root.innerHTML = `
      <div class="staff-table-wrap">
        <table class="staff-table" aria-label="Audit log table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Table</th>
              <th>Target</th>
              <th>Before</th>
              <th>After</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(row).join("")}
          </tbody>
        </table>
      </div>
      <div class="staff-empty-state small">
        <p>Audit records are append-only and should be retained according to policy requirements.</p>
      </div>
    `;
  }

  window.StaffAuditLog = {
    initAuditLogPage,
  };
})();
