(function () {
  const VERIFIED_EMPLOYEES = [
    {
      id: "verified-owner-admin",
      full_name: "Nella Maglic",
      email: "nellamaglic@gmail.com",
      role: "owner",
      account_status: "active",
      training_progress: 0,
      assigned_jobs_count: 0,
      last_login_at: "",
    },
    {
      id: "verified-manager",
      full_name: "Baylee Ellis",
      email: "",
      role: "manager",
      account_status: "active",
      training_progress: 0,
      assigned_jobs_count: 0,
      last_login_at: "",
    },
  ];

  const ROLE_LABELS = {
    owner: "Owner",
    admin: "Administrator",
    manager: "Manager",
    team_lead: "Team Lead",
    employee: "Employee",
    trainee: "Trainee",
  };

  function formatDate(value) {
    if (!value) {
      return "Never";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Never";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function employeeCard(employee) {
    const role = ROLE_LABELS[employee.role] || employee.role || "Employee";
    const statusBadgeClass = employee.account_status === "active" ? "success" : "warning";

    return `
      <article class="staff-mobile-card">
        <div class="staff-mobile-card-head">
          <h3>${employee.full_name || "Unnamed employee"}</h3>
          <span class="badge ${statusBadgeClass}">${employee.account_status || "unknown"}</span>
        </div>
        <p>${employee.email || "No email"}</p>
        <p>Role: ${role}</p>
        <p>Training: ${Number(employee.training_progress || 0) > 0 ? `${Number(employee.training_progress)}%` : "Training Not Started"}</p>
        <p>Shift: No shift assigned.</p>
        <p>Today's Jobs: No jobs assigned today.</p>
        <p>Performance: No performance history yet.</p>
        <p>Last Login: ${formatDate(employee.last_login_at)}</p>
      </article>
    `;
  }

  function row(employee) {
    const role = ROLE_LABELS[employee.role] || employee.role || "Employee";
    const canManage = window.StaffAuth.canAccessRole(document.body.dataset.currentRole || "guest", "admin");
    const disableRemove = employee.role === "owner";
    const removeText = disableRemove ? "Protected" : "Disable";

    return `
      <tr>
        <td>${employee.full_name || "Unnamed employee"}</td>
        <td>${employee.email || "No email"}</td>
        <td>${role}</td>
        <td>${employee.account_status || "unknown"}</td>
        <td>${Number(employee.training_progress || 0) > 0 ? `${Number(employee.training_progress)}%` : "Training Not Started"}</td>
        <td>${formatDate(employee.last_login_at)}</td>
        <td>
          ${
            canManage
              ? `<div class="staff-inline-actions">
                <button type="button" class="staff-admin-cancel" data-employee-action="change-role" data-employee-id="${employee.id}">Change Role</button>
                <button type="button" class="staff-admin-cancel" data-employee-action="disable" data-employee-id="${employee.id}" ${disableRemove ? "disabled" : ""}>${removeText}</button>
              </div>`
              : "No administrative actions"
          }
        </td>
      </tr>
    `;
  }

  function mountEmpty(root, message) {
    root.innerHTML = `<div class="staff-empty-state"><h3>No employee records found.</h3><p>${message}</p></div>`;
  }

  async function loadEmployees() {
    const root = document.querySelector("[data-employee-management-root]");
    if (!root) {
      return;
    }

    let employees = VERIFIED_EMPLOYEES;
    if (window.StaffDb?.isSupabaseConfigured()) {
      const fetched = await window.StaffDb.fetchEmployees();
      if (fetched.length) {
        employees = fetched;
      }
    }

    root.innerHTML = `
      <div class="staff-table-shell">
        <div class="staff-table-wrap staff-table-wrap-desktop">
          <table class="staff-table" aria-label="Employee management table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Training</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${employees.map(row).join("")}
            </tbody>
          </table>
        </div>
        <div class="staff-mobile-cards">
          ${employees.map(employeeCard).join("")}
        </div>
      </div>
      <div class="staff-empty-state small">
        <p>Owner accounts cannot be removed from the portal. If only one Owner remains, disable action is blocked.</p>
        <p>Schedules, jobs, training completion, and performance stay empty until real activity is recorded.</p>
      </div>
    `;

    root.querySelectorAll("[data-employee-action='disable']").forEach((button) => {
      button.addEventListener("click", async () => {
        const employeeId = button.getAttribute("data-employee-id");
        if (!employeeId || button.hasAttribute("disabled")) {
          return;
        }
        try {
          await window.StaffDb.callSecureAction("disable-employee", { employeeId });
          await loadEmployees();
        } catch (_err) {
          button.textContent = "Action Failed";
        }
      });
    });

    root.querySelectorAll("[data-employee-action='change-role']").forEach((button) => {
      button.addEventListener("click", async () => {
        const employeeId = button.getAttribute("data-employee-id");
        if (!employeeId) {
          return;
        }
        const nextRole = window.prompt("Enter new role: owner, admin, manager, team_lead, employee, trainee", "employee");
        if (!nextRole) {
          return;
        }
        try {
          await window.StaffDb.callSecureAction("change-employee-role", { employeeId, role: window.StaffAuth.normalizeRole(nextRole) });
          await loadEmployees();
        } catch (_err) {
          button.textContent = "Update Failed";
        }
      });
    });
  }

  window.StaffAdmin = {
    initEmployeeManagementPage() {
      loadEmployees();
    },
  };
})();
