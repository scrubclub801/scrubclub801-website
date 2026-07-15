(function () {
  const STORAGE_KEYS = {
    items: "staff_inventory_items_v1",
    categories: "staff_inventory_categories_v1",
    usageLogs: "staff_inventory_usage_logs_v1",
    restockList: "staff_inventory_restock_list_v1",
    reminders: "staff_inventory_reminders_v1",
  };

  const DEFAULT_CATEGORIES = [
    "Cleaning Chemical",
    "Disposable Supply",
    "Reusable Tool",
    "Equipment",
    "Protective Equipment",
    "Vehicle Supply",
    "Laundry Supply",
    "Other",
  ];

  const ROLE = {
    ownerAdmin: "admin",
    manager: "manager",
    employee: "employee",
  };

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function numberValue(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function currency(value) {
    return numberValue(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function formatDate(value) {
    if (!value) {
      return "Not set";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not set";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function currentRole() {
    return document.body.dataset.currentRole || "employee";
  }

  function canManageRestock() {
    return window.StaffAuth.canAccessRole(currentRole(), ROLE.manager);
  }

  function canFullManageInventory() {
    return window.StaffAuth.canAccessRole(currentRole(), ROLE.ownerAdmin);
  }

  function canAddOrEditQuantities() {
    return window.StaffAuth.canAccessRole(currentRole(), ROLE.manager);
  }

  function categories() {
    const stored = readStorage(STORAGE_KEYS.categories, []);
    const merged = [...new Set([...DEFAULT_CATEGORIES, ...stored].map((item) => String(item || "").trim()).filter(Boolean))];
    return merged;
  }

  function addCustomCategory(name) {
    const next = String(name || "").trim();
    if (!next || DEFAULT_CATEGORIES.includes(next)) {
      return;
    }
    const existing = readStorage(STORAGE_KEYS.categories, []);
    if (!existing.includes(next)) {
      existing.push(next);
      writeStorage(STORAGE_KEYS.categories, existing);
    }
  }

  function inventoryItems() {
    return readStorage(STORAGE_KEYS.items, []).map((item) => ({
      id: item.id || uid("itm"),
      name: item.name || "",
      category: item.category || "Other",
      quantityOnHand: numberValue(item.quantityOnHand),
      unitType: item.unitType || "Unit",
      minimumStockLevel: numberValue(item.minimumStockLevel),
      preferredStockLevel: numberValue(item.preferredStockLevel),
      storageLocation: item.storageLocation || "",
      lastRestockDate: item.lastRestockDate || "",
      costPerUnit: numberValue(item.costPerUnit),
      preferredSupplier: item.preferredSupplier || "",
      notes: item.notes || "",
      restockOrdered: Boolean(item.restockOrdered),
      archived: Boolean(item.archived),
      createdBy: item.createdBy || "",
      updatedBy: item.updatedBy || "",
      createdAt: item.createdAt || nowIso(),
      updatedAt: item.updatedAt || nowIso(),
      maintenanceDueDate: item.maintenanceDueDate || "",
      expirationDate: item.expirationDate || "",
    }));
  }

  function saveInventoryItems(items) {
    writeStorage(STORAGE_KEYS.items, items);
  }

  function usageLogs() {
    return readStorage(STORAGE_KEYS.usageLogs, []);
  }

  function saveUsageLogs(logs) {
    writeStorage(STORAGE_KEYS.usageLogs, logs);
  }

  function restockList() {
    return readStorage(STORAGE_KEYS.restockList, []);
  }

  function saveRestockList(items) {
    writeStorage(STORAGE_KEYS.restockList, items);
  }

  function reminders() {
    return readStorage(STORAGE_KEYS.reminders, []);
  }

  function saveReminders(items) {
    writeStorage(STORAGE_KEYS.reminders, items);
  }

  function normalizedName(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function levenshtein(a, b) {
    const aa = normalizedName(a);
    const bb = normalizedName(b);
    if (!aa || !bb) {
      return Math.max(aa.length, bb.length);
    }
    const matrix = Array.from({ length: bb.length + 1 }, () => []);
    for (let i = 0; i <= bb.length; i += 1) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= aa.length; j += 1) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= bb.length; i += 1) {
      for (let j = 1; j <= aa.length; j += 1) {
        const cost = aa[j - 1] === bb[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[bb.length][aa.length];
  }

  function statusForItem(item) {
    const quantity = numberValue(item.quantityOnHand);
    const minimum = Math.max(0, numberValue(item.minimumStockLevel));

    if (item.restockOrdered) {
      return {
        label: "Restock Ordered",
        badgeClass: "info",
        reason: "A pending restock order has been recorded and is awaiting delivery.",
      };
    }

    if (quantity === 0) {
      return {
        label: "Out of Stock",
        badgeClass: "danger",
        reason: `No ${item.unitType || "units".toLowerCase()} remain. Minimum stock level is ${minimum}.`,
      };
    }

    if (minimum > 0 && quantity < minimum / 2) {
      return {
        label: "Critical",
        badgeClass: "danger",
        reason: `${quantity} ${item.unitType.toLowerCase()} remain. This is below half of minimum stock level ${minimum}.`,
      };
    }

    if (minimum > 0 && quantity <= minimum) {
      return {
        label: "Running Low",
        badgeClass: "warning",
        reason: `${quantity} ${item.unitType.toLowerCase()} remain. Minimum stock level is ${minimum}.`,
      };
    }

    return {
      label: "In Stock",
      badgeClass: "success",
      reason: `${quantity} ${item.unitType.toLowerCase()} remain, above minimum stock level ${minimum}.`,
    };
  }

  function toKind(item) {
    const category = String(item.category || "").toLowerCase();
    if (category.includes("chemical")) {
      return "chemical";
    }
    if (category.includes("tool")) {
      return "tool";
    }
    if (category.includes("equipment")) {
      return "equipment item";
    }
    return "consumable";
  }

  function aiSuggestForEntry(entry, existing) {
    const rawName = String(entry.name || "").trim();
    const lower = rawName.toLowerCase();

    let standardizedName = rawName;
    let category = entry.category || "Other";
    let unitType = entry.unitType || "Unit";

    if (/(glass|window)/.test(lower)) {
      standardizedName = "Glass Cleaner";
      category = "Cleaning Chemical";
      if (!entry.unitType) {
        unitType = "Bottle";
      }
    } else if (/(bleach|disinfect|sanitiz|degreas)/.test(lower)) {
      category = "Cleaning Chemical";
      if (!entry.unitType) {
        unitType = "Bottle";
      }
    } else if (/(glove|mask|respirator)/.test(lower)) {
      category = "Protective Equipment";
      if (!entry.unitType) {
        unitType = "Box";
      }
    } else if (/(bag|trash|liner|towel|wipe)/.test(lower)) {
      category = "Disposable Supply";
      if (!entry.unitType) {
        unitType = "Pack";
      }
    } else if (/(vacuum|extractor|buffer)/.test(lower)) {
      category = "Equipment";
      if (!entry.unitType) {
        unitType = "Unit";
      }
    }

    const normalized = normalizedName(rawName);
    const similar = existing
      .filter((item) => !item.archived)
      .map((item) => ({
        id: item.id,
        name: item.name,
        distance: levenshtein(normalized, normalizedName(item.name)),
      }))
      .filter((item) => item.distance <= 4)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    const storageGroup = category.includes("Chemical")
      ? "Chemicals Cabinet"
      : category.includes("Equipment") || category.includes("Tool")
      ? "Equipment Shelf"
      : "Consumables Rack";

    return {
      standardizedName,
      category,
      unitType,
      storageGroup,
      kind: toKind({ category }),
      duplicates: similar,
    };
  }

  function recentUsageByItem(logs, days) {
    const now = Date.now();
    const ms = days * 86400000;
    return logs.reduce((acc, log) => {
      const at = new Date(log.at).getTime();
      if (!Number.isFinite(at) || now - at > ms) {
        return acc;
      }
      acc[log.itemId] = (acc[log.itemId] || 0) + numberValue(log.quantityUsed);
      return acc;
    }, {});
  }

  function appointmentDemandEstimate() {
    if (!window.StaffRecords?.getAppointments) {
      return 0;
    }
    const future = window.StaffRecords
      .getAppointments()
      .filter((item) => {
        const at = new Date(item.scheduledStart).getTime();
        return Number.isFinite(at) && at > Date.now();
      });
    return future.length;
  }

  function aiRestockSuggestions(items, logs) {
    const active = items.filter((item) => !item.archived);
    const weeklyUsage = recentUsageByItem(logs, 7);
    const monthlyUsage = recentUsageByItem(logs, 30);
    const upcomingJobs = appointmentDemandEstimate();

    if (!logs.length && upcomingJobs === 0) {
      return {
        insufficient: true,
        message: "Not enough usage data is available to make a restock prediction.",
        rows: [],
      };
    }

    const rows = [];

    active.forEach((item) => {
      const status = statusForItem(item);
      const current = numberValue(item.quantityOnHand);
      const minimum = Math.max(0, numberValue(item.minimumStockLevel));
      const preferred = Math.max(minimum, numberValue(item.preferredStockLevel));
      const usedWeek = numberValue(weeklyUsage[item.id]);
      const usedMonth = numberValue(monthlyUsage[item.id]);
      const weeklyDemandFromJobs = Math.ceil((usedMonth / 30 || 0) * 7 + upcomingJobs * 0.2);

      let suggestedQty = 0;
      let reason = "";

      if (status.label === "Out of Stock" || status.label === "Critical" || status.label === "Running Low") {
        suggestedQty = Math.max(preferred - current, minimum - current, 1);
        reason = `${status.label} based on current quantity and minimum stock level.`;
      } else if (usedWeek > 0 && current - weeklyDemandFromJobs < minimum) {
        suggestedQty = Math.max(preferred - current, weeklyDemandFromJobs, 1);
        reason = "Current usage trend suggests a shortage before next cycle.";
      }

      if (suggestedQty > 0) {
        rows.push({
          id: uid("rst"),
          itemId: item.id,
          item: item.name,
          currentQuantity: current,
          minimumQuantity: minimum,
          suggestedOrderQuantity: Math.ceil(suggestedQty),
          estimatedCost: numberValue(item.costPerUnit) * Math.ceil(suggestedQty),
          supplier: item.preferredSupplier || "Not set",
          reason,
          status: "suggested",
          source: "AI Suggested Restock",
          createdAt: nowIso(),
        });
      }
    });

    const duplicateGroups = [];
    for (let i = 0; i < active.length; i += 1) {
      for (let j = i + 1; j < active.length; j += 1) {
        const left = active[i];
        const right = active[j];
        const dist = levenshtein(left.name, right.name);
        if (dist > 0 && dist <= 3) {
          duplicateGroups.push(`${left.name} and ${right.name} may be duplicates.`);
        }
      }
    }

    return {
      insufficient: false,
      message: duplicateGroups.length ? duplicateGroups.join(" ") : "Suggestions are based only on saved quantities, usage logs, and appointments.",
      rows,
    };
  }

  function recomputeReminders() {
    const items = inventoryItems().filter((item) => !item.archived);
    const logs = usageLogs();
    const existing = reminders();

    const generated = [];

    items.forEach((item) => {
      const status = statusForItem(item);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);

      if (["Running Low", "Critical", "Out of Stock"].includes(status.label)) {
        generated.push({
          id: uid("rem"),
          type: "stock",
          itemId: item.id,
          item: item.name,
          reason: status.reason,
          priority: status.label === "Critical" || status.label === "Out of Stock" ? "High" : "Medium",
          assignedStaff: "Inventory Team",
          dueDate: dueDate.toISOString(),
          status: "Open",
        });
      }

      if (item.restockOrdered) {
        const orderDue = new Date();
        orderDue.setDate(orderDue.getDate() + 3);
        generated.push({
          id: uid("rem"),
          type: "restock-order",
          itemId: item.id,
          item: item.name,
          reason: "Restock order has not yet been marked as delivered.",
          priority: "Medium",
          assignedStaff: "Manager",
          dueDate: orderDue.toISOString(),
          status: "Open",
        });
      }

      if (item.maintenanceDueDate) {
        generated.push({
          id: uid("rem"),
          type: "maintenance",
          itemId: item.id,
          item: item.name,
          reason: "Equipment maintenance due date is approaching.",
          priority: "Medium",
          assignedStaff: "Equipment Lead",
          dueDate: item.maintenanceDueDate,
          status: "Open",
        });
      }

      if (item.expirationDate) {
        generated.push({
          id: uid("rem"),
          type: "expiration",
          itemId: item.id,
          item: item.name,
          reason: "Product expiration date is approaching.",
          priority: "High",
          assignedStaff: "Inventory Team",
          dueDate: item.expirationDate,
          status: "Open",
        });
      }
    });

    const weeklyUsage = recentUsageByItem(logs, 7);
    const monthlyUsage = recentUsageByItem(logs, 30);

    items.forEach((item) => {
      const week = numberValue(weeklyUsage[item.id]);
      const monthDailyAvg = numberValue(monthlyUsage[item.id]) / 30;
      if (week > 0 && monthDailyAvg > 0 && week / 7 > monthDailyAvg * 1.8) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        generated.push({
          id: uid("rem"),
          type: "fast-usage",
          itemId: item.id,
          item: item.name,
          reason: "Supply usage has increased faster than the recent monthly average.",
          priority: "High",
          assignedStaff: "Manager",
          dueDate: dueDate.toISOString(),
          status: "Open",
        });
      }
    });

    const stillOpen = existing.filter((item) => item.status !== "Open");
    const merged = [...stillOpen, ...generated];
    saveReminders(merged);
    return merged;
  }

  function updateReminder(reminderId, action) {
    const data = reminders().map((reminder) => {
      if (reminder.id !== reminderId) {
        return reminder;
      }
      if (action === "complete") {
        return { ...reminder, status: "Completed" };
      }
      if (action === "snooze") {
        const due = new Date(reminder.dueDate || Date.now());
        due.setDate(due.getDate() + 2);
        return { ...reminder, status: "Open", dueDate: due.toISOString() };
      }
      return reminder;
    });
    saveReminders(data);
  }

  function proposeUsageAdjustment(itemId, quantityUsed, contextText) {
    const items = inventoryItems();
    const item = items.find((row) => row.id === itemId);
    if (!item) {
      return null;
    }

    const current = numberValue(item.quantityOnHand);
    const used = Math.max(0, numberValue(quantityUsed));
    const next = Math.max(0, current - used);

    return {
      itemId,
      item: item.name,
      current,
      used,
      next,
      context: contextText || "End of Job Report",
    };
  }

  function confirmUsageAdjustment(proposal) {
    if (!proposal) {
      return;
    }

    const items = inventoryItems();
    const updated = items.map((item) => {
      if (item.id !== proposal.itemId) {
        return item;
      }
      return {
        ...item,
        quantityOnHand: proposal.next,
        updatedAt: nowIso(),
        updatedBy: document.body.dataset.currentEmail || "",
      };
    });

    saveInventoryItems(updated);

    const logs = usageLogs();
    logs.push({
      id: uid("use"),
      itemId: proposal.itemId,
      item: proposal.item,
      quantityUsed: proposal.used,
      at: nowIso(),
      by: document.body.dataset.currentEmail || "",
      context: proposal.context,
    });
    saveUsageLogs(logs);
  }

  function renderInventoryTableRows(items) {
    return items
      .map((item) => {
        const status = statusForItem(item);
        return `
          <tr data-item-row-id="${item.id}">
            <td><button type="button" class="staff-link-button" data-open-item="${item.id}">${item.name}</button></td>
            <td>${item.category}</td>
            <td>${item.quantityOnHand} ${item.unitType}</td>
            <td>${item.minimumStockLevel}</td>
            <td><span class="badge ${status.badgeClass}">${status.label}</span></td>
            <td>${status.reason}</td>
            <td>${formatDate(item.lastRestockDate)}</td>
            <td>${canFullManageInventory() ? currency(item.costPerUnit) : "Restricted"}</td>
            <td>${item.preferredSupplier || "Not set"}</td>
            <td>
              <div class="staff-inline-actions">
                ${canAddOrEditQuantities() ? `<button type="button" class="staff-admin-cancel" data-edit-item="${item.id}">Edit</button>` : ""}
                ${canFullManageInventory() ? `<button type="button" class="staff-admin-cancel" data-archive-item="${item.id}">Archive</button>` : ""}
                ${canManageRestock() ? `<button type="button" class="staff-admin-cancel" data-order-item="${item.id}">Record Order</button>` : ""}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderInventoryCards(items) {
    return items
      .map((item) => {
        const status = statusForItem(item);
        return `
          <article class="staff-mobile-card">
            <div class="staff-mobile-card-head">
              <h3>${item.name}</h3>
              <span class="badge ${status.badgeClass}">${status.label}</span>
            </div>
            <p><strong>Category:</strong> ${item.category}</p>
            <p><strong>On Hand:</strong> ${item.quantityOnHand} ${item.unitType}</p>
            <p><strong>Minimum:</strong> ${item.minimumStockLevel}</p>
            <p><strong>Reason:</strong> ${status.reason}</p>
            <p><strong>Location:</strong> ${item.storageLocation || "Not set"}</p>
            <p><strong>Last Restock:</strong> ${formatDate(item.lastRestockDate)}</p>
            <div class="staff-inline-actions">
              <button type="button" class="staff-admin-cancel" data-open-item="${item.id}">Open Item</button>
              ${canAddOrEditQuantities() ? `<button type="button" class="staff-admin-cancel" data-edit-item="${item.id}">Edit</button>` : ""}
              ${canManageRestock() ? `<button type="button" class="staff-admin-cancel" data-order-item="${item.id}">Record Order</button>` : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderRestockList(rows) {
    if (!rows.length) {
      return '<div class="staff-empty-state small"><p>No AI restock suggestions are pending.</p></div>';
    }

    return `
      <div class="staff-table-wrap">
        <table class="staff-table" aria-label="AI restock suggestions">
          <thead>
            <tr>
              <th>Item</th>
              <th>Current</th>
              <th>Minimum</th>
              <th>Suggested Order</th>
              <th>Estimated Cost</th>
              <th>Supplier</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.item}</td>
                    <td>${row.currentQuantity}</td>
                    <td>${row.minimumQuantity}</td>
                    <td>${row.suggestedOrderQuantity}</td>
                    <td>${currency(row.estimatedCost)}</td>
                    <td>${row.supplier}</td>
                    <td>${row.reason}</td>
                    <td>
                      <div class="staff-inline-actions">
                        ${canManageRestock() ? `<button type="button" class="staff-admin-cancel" data-approve-restock="${row.id}">Approve</button>` : ""}
                        ${canManageRestock() ? `<button type="button" class="staff-admin-cancel" data-edit-restock="${row.id}">Edit</button>` : ""}
                        ${canManageRestock() ? `<button type="button" class="staff-admin-cancel" data-dismiss-restock="${row.id}">Dismiss</button>` : ""}
                      </div>
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderReminders(rows) {
    if (!rows.length) {
      return '<div class="staff-empty-state small"><p>No inventory reminders are active.</p></div>';
    }

    return `
      <div class="staff-grid staff-grid-3x">
        ${rows
          .map(
            (row) => `
              <article class="staff-reminder-card">
                <div class="staff-reminder-head">
                  <h3>${row.item}</h3>
                  <span class="badge ${row.priority === "High" ? "danger" : "warning"}">${row.priority}</span>
                </div>
                <p><strong>Reason:</strong> ${row.reason}</p>
                <p><strong>Assigned:</strong> ${row.assignedStaff}</p>
                <p><strong>Due:</strong> ${formatDate(row.dueDate)}</p>
                <div class="staff-inline-actions">
                  <button type="button" class="staff-admin-cancel" data-reminder-complete="${row.id}">Mark Complete</button>
                  <button type="button" class="staff-admin-cancel" data-reminder-snooze="${row.id}">Snooze</button>
                  <button type="button" class="staff-admin-cancel" data-reminder-open-item="${row.itemId}">Open Item</button>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function initInventoryPage() {
    const root = document.querySelector("[data-inventory-root]");
    if (!root) {
      return;
    }

    const role = currentRole();
    const canManage = window.StaffAuth.canAccessRole(role, ROLE.employee);

    function smoothFocus(node) {
      if (!node) {
        return;
      }
      if (window.StaffPortal?.scrollToElement) {
        window.StaffPortal.scrollToElement(node, { focus: false });
        return;
      }
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    root.innerHTML = `
      <div class="staff-kpi-grid staff-kpi-grid-4" data-inventory-kpis></div>

      <div class="staff-toolbar inventory-toolbar">
        <label class="staff-input-wrap"><span>Search</span><input type="search" data-inventory-search placeholder="Search supplies" /></label>
        <label class="staff-input-wrap"><span>Category</span><select data-inventory-category-filter></select></label>
        <label class="staff-input-wrap"><span>Status</span>
          <select data-inventory-status-filter>
            <option value="all">All statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Running Low">Running Low</option>
            <option value="Critical">Critical</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Restock Ordered">Restock Ordered</option>
          </select>
        </label>
      </div>

      <div class="staff-quick-actions inventory-actions">
        ${canManage ? '<button class="staff-button" type="button" data-open-supply-form>Add Supply</button>' : ""}
        <button class="staff-admin-cancel" type="button" data-open-import>Import Inventory</button>
      </div>

      <p class="staff-message" data-inventory-success role="status" aria-live="polite"></p>

      <div class="staff-empty-state" data-inventory-empty hidden>
        <h3>No supplies have been added yet.</h3>
        <p>Inventory starts empty and only updates when staff add or import real records.</p>
        <div class="staff-inline-actions">
          ${canManage ? '<button class="staff-button" type="button" data-open-supply-form-empty>Add First Supply</button>' : ""}
          <button class="staff-admin-cancel" type="button" data-open-import-empty>Import Inventory</button>
        </div>
      </div>

      <div class="staff-card staff-panel" data-inventory-form-card data-section-key="inventory-form" hidden>
        <div class="staff-panel-head">
          <h2 class="staff-section-title">Add Supply</h2>
        </div>
        <form class="inventory-form" data-supply-form>
          <label class="staff-input-wrap"><span>Item name</span><input name="name" required /></label>
          <label class="staff-input-wrap"><span>Category</span><select name="category" required></select></label>
          <label class="staff-input-wrap"><span>Quantity on hand</span><input name="quantityOnHand" type="number" min="0" step="0.01" required /></label>
          <label class="staff-input-wrap"><span>Unit</span><input name="unitType" placeholder="Bottle, Pack, Unit" required /></label>
          <label class="staff-input-wrap"><span>Desired minimum stock level</span><input name="minimumStockLevel" type="number" min="0" step="0.01" required /></label>
          <label class="staff-input-wrap"><span>Preferred stock level</span><input name="preferredStockLevel" type="number" min="0" step="0.01" required /></label>
          <label class="staff-input-wrap"><span>Storage location</span><input name="storageLocation" /></label>
          <label class="staff-input-wrap"><span>Last restock date</span><input name="lastRestockDate" type="date" /></label>
          <label class="staff-input-wrap"><span>Cost per unit</span><input name="costPerUnit" type="number" min="0" step="0.01" ${canFullManageInventory() ? "" : "disabled"} /></label>
          <label class="staff-input-wrap"><span>Preferred supplier</span><input name="preferredSupplier" ${canFullManageInventory() ? "" : "disabled"} /></label>
          <label class="staff-input-wrap"><span>Notes</span><textarea name="notes" rows="3"></textarea></label>

          ${
            canFullManageInventory()
              ? `<div class="staff-inline-actions">
                <input data-custom-category-input placeholder="Add custom category" />
                <button type="button" class="staff-admin-cancel" data-add-custom-category>Add Category</button>
              </div>`
              : ""
          }

          <div class="staff-inline-actions">
            <button type="submit" class="staff-button">Save Supply</button>
            <button type="button" class="staff-admin-cancel" data-close-supply-form>Cancel</button>
          </div>
          <p class="staff-message" data-supply-form-message></p>
        </form>
      </div>

      <article class="staff-card staff-panel" data-ai-entry-panel hidden>
        <div class="staff-panel-head"><h2 class="staff-section-title">AI Entry Suggestion</h2></div>
        <p class="inventory-ai-label">AI suggestion only. No record is changed until you approve.</p>
        <div data-ai-entry-content></div>
      </article>

      <div class="staff-table-shell" data-inventory-table-shell>
        <div class="staff-table-wrap staff-table-wrap-desktop">
          <table class="staff-table" aria-label="Inventory table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>On Hand</th>
                <th>Minimum</th>
                <th>Status</th>
                <th>Status Reason</th>
                <th>Last Restock</th>
                <th>Cost</th>
                <th>Supplier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody data-inventory-table-body data-section-key="inventory-list"></tbody>
          </table>
        </div>
        <div class="staff-mobile-cards" data-inventory-mobile-cards></div>
      </div>

      <article class="staff-card staff-panel" data-inventory-detail-panel hidden>
        <div class="staff-panel-head"><h2 class="staff-section-title">Inventory Item Details</h2></div>
        <div data-inventory-detail-content></div>
      </article>

      <div class="staff-layout-split">
        <article class="staff-card staff-panel" data-section-key="inventory-restock-assistant">
          <div class="staff-panel-head"><h2 class="staff-section-title">AI Restock Assistant</h2></div>
          <p class="inventory-ai-label">AI Suggested Restock</p>
          <p data-restock-summary></p>
          <button type="button" class="staff-admin-cancel" data-run-restock-ai>AI Restock Assistant</button>
        </article>

        <article class="staff-card staff-panel">
          <div class="staff-panel-head"><h2 class="staff-section-title">Supply Usage Confirmation</h2></div>
          <form class="staff-form" data-usage-form>
            <label class="staff-input-wrap"><span>Item</span><select name="itemId"></select></label>
            <label class="staff-input-wrap"><span>Approximate quantity used</span><input type="number" min="0" step="0.01" name="quantityUsed" /></label>
            <label class="staff-input-wrap"><span>Report context</span><input name="context" placeholder="End of Job Report" /></label>
            <button type="submit" class="staff-admin-cancel">Propose Inventory Update</button>
          </form>
          <div data-usage-proposal></div>
        </article>
      </div>

      <article class="staff-card staff-panel" data-section-key="inventory-restock-list">
        <div class="staff-panel-head"><h2 class="staff-section-title">Restock List</h2></div>
        <div data-reorder-list></div>
      </article>

      <article class="staff-card staff-panel" data-section-key="inventory-reminders">
        <div class="staff-panel-head"><h2 class="staff-section-title">Inventory Reminders</h2></div>
        <div data-inventory-reminders></div>
      </article>
    `;

    const state = {
      search: "",
      category: "all",
      status: "all",
      aiEntrySuggestion: null,
      usageProposal: null,
      selectedItemId: "",
      restockRows: restockList(),
    };

    const categoryFilter = root.querySelector("[data-inventory-category-filter]");
    const categorySelect = root.querySelector("[name='category']");

    function fillCategories() {
      const list = categories();
      categoryFilter.innerHTML = ['<option value="all">All categories</option>', ...list.map((item) => `<option value="${item}">${item}</option>`)].join("");
      if (categorySelect) {
        categorySelect.innerHTML = list.map((item) => `<option value="${item}">${item}</option>`).join("");
      }
    }

    function setKpis(items) {
      const active = items.filter((item) => !item.archived);
      const statuses = active.map(statusForItem);
      const low = statuses.filter((item) => item.label === "Running Low").length;
      const critical = statuses.filter((item) => item.label === "Critical").length;
      const out = statuses.filter((item) => item.label === "Out of Stock").length;
      const ordered = statuses.filter((item) => item.label === "Restock Ordered").length;

      root.querySelector("[data-inventory-kpis]").innerHTML = `
        <article class="staff-kpi-card"><p class="staff-kpi-label">Running Low</p><p class="staff-kpi-value">${low}</p><p class="staff-kpi-trend">Items at or below minimum levels.</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Critical</p><p class="staff-kpi-value">${critical}</p><p class="staff-kpi-trend">Items below half of minimum levels.</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Out of Stock</p><p class="staff-kpi-value">${out}</p><p class="staff-kpi-trend">Items with quantity equal to zero.</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Restock Ordered</p><p class="staff-kpi-value">${ordered}</p><p class="staff-kpi-trend">Pending restock orders waiting for delivery.</p></article>
      `;
    }

    function filteredItems() {
      const items = inventoryItems().filter((item) => !item.archived);
      return items.filter((item) => {
        const status = statusForItem(item).label;
        const searchHit = !state.search || JSON.stringify(item).toLowerCase().includes(state.search.toLowerCase());
        const categoryHit = state.category === "all" || item.category === state.category;
        const statusHit = state.status === "all" || status === state.status;
        return searchHit && categoryHit && statusHit;
      });
    }

    function refreshUsageItemOptions(items) {
      const select = root.querySelector("[data-usage-form] [name='itemId']");
      if (!select) {
        return;
      }
      select.innerHTML = items.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
    }

    function renderAiEntrySuggestion() {
      const panel = root.querySelector("[data-ai-entry-panel]");
      const content = root.querySelector("[data-ai-entry-content]");
      if (!panel || !content) {
        return;
      }

      if (!state.aiEntrySuggestion) {
        panel.hidden = true;
        content.innerHTML = "";
        return;
      }

      const suggestion = state.aiEntrySuggestion;
      panel.hidden = false;

      content.innerHTML = `
        <ul class="staff-detail-list">
          <li><strong>Standardized name:</strong> ${suggestion.standardizedName}</li>
          <li><strong>Category:</strong> ${suggestion.category}</li>
          <li><strong>Unit:</strong> ${suggestion.unitType}</li>
          <li><strong>Storage group:</strong> ${suggestion.storageGroup}</li>
          <li><strong>Item type:</strong> ${suggestion.kind}</li>
          <li><strong>Possible duplicates:</strong> ${suggestion.duplicates.length ? suggestion.duplicates.map((item) => item.name).join(", ") : "None found"}</li>
        </ul>
        <div class="staff-inline-actions">
          <button type="button" class="staff-admin-cancel" data-approve-ai-entry>Approve Suggestion</button>
          <button type="button" class="staff-admin-cancel" data-dismiss-ai-entry>Dismiss</button>
        </div>
      `;

      content.querySelector("[data-approve-ai-entry]").addEventListener("click", () => {
        if (!state.aiEntrySuggestion?.itemId) {
          return;
        }
        const items = inventoryItems();
        const updated = items.map((item) => {
          if (item.id !== state.aiEntrySuggestion.itemId) {
            return item;
          }
          return {
            ...item,
            name: state.aiEntrySuggestion.standardizedName,
            category: state.aiEntrySuggestion.category,
            unitType: state.aiEntrySuggestion.unitType,
            storageLocation: item.storageLocation || state.aiEntrySuggestion.storageGroup,
            updatedBy: document.body.dataset.currentEmail || "",
            updatedAt: nowIso(),
          };
        });
        saveInventoryItems(updated);
        state.selectedItemId = state.aiEntrySuggestion.itemId;
        state.aiEntrySuggestion = null;
        render();
        smoothFocus(root.querySelector(`[data-item-row-id="${state.selectedItemId}"]`) || root.querySelector("[data-inventory-detail-panel]"));
      });

      content.querySelector("[data-dismiss-ai-entry]").addEventListener("click", () => {
        state.aiEntrySuggestion = null;
        renderAiEntrySuggestion();
      });
    }

    function renderUsageProposal() {
      const node = root.querySelector("[data-usage-proposal]");
      if (!node) {
        return;
      }

      if (!state.usageProposal) {
        node.innerHTML = '<p class="staff-message">Usage updates require confirmation before inventory changes are saved.</p>';
        return;
      }

      node.innerHTML = `
        <div class="staff-empty-state small">
          <p>Proposed update: Reduce ${state.usageProposal.item} from ${state.usageProposal.current} to ${state.usageProposal.next}.</p>
          <div class="staff-inline-actions">
            <button type="button" class="staff-admin-cancel" data-confirm-usage>Confirm Update</button>
            <button type="button" class="staff-admin-cancel" data-cancel-usage>Cancel</button>
          </div>
        </div>
      `;

      node.querySelector("[data-confirm-usage]").addEventListener("click", () => {
        confirmUsageAdjustment(state.usageProposal);
        state.selectedItemId = state.usageProposal.itemId;
        state.usageProposal = null;
        render();
        smoothFocus(root.querySelector("[data-section-key='inventory-reminders']"));
      });

      node.querySelector("[data-cancel-usage]").addEventListener("click", () => {
        state.usageProposal = null;
        renderUsageProposal();
      });
    }

    function attachInventoryActions(visibleItems) {
      root.querySelectorAll("[data-open-item]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-open-item") || "";
          state.selectedItemId = id;
          render();
          smoothFocus(root.querySelector("[data-inventory-detail-panel]"));
        });
      });

      root.querySelectorAll("[data-archive-item]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-archive-item");
          const updated = inventoryItems().map((item) => (item.id === id ? { ...item, archived: true, updatedAt: nowIso() } : item));
          saveInventoryItems(updated);
          state.selectedItemId = id;
          render();
          smoothFocus(root.querySelector("[data-section-key='inventory-reminders']"));
        });
      });

      root.querySelectorAll("[data-order-item]").forEach((button) => {
        button.addEventListener("click", () => {
          if (!canManageRestock()) {
            return;
          }
          const id = button.getAttribute("data-order-item");
          const updated = inventoryItems().map((item) =>
            item.id === id
              ? {
                  ...item,
                  restockOrdered: true,
                  updatedAt: nowIso(),
                  updatedBy: document.body.dataset.currentEmail || "",
                }
              : item
          );
          saveInventoryItems(updated);
          render();
        });
      });

      root.querySelectorAll("[data-edit-item]").forEach((button) => {
        button.addEventListener("click", () => {
          if (!canAddOrEditQuantities()) {
            return;
          }
          const id = button.getAttribute("data-edit-item");
          const existing = visibleItems.find((item) => item.id === id);
          if (!existing) {
            return;
          }
          const nextQty = window.prompt(`Update quantity for ${existing.name}`, String(existing.quantityOnHand));
          if (nextQty == null) {
            return;
          }
          const next = Math.max(0, numberValue(nextQty));
          const updated = inventoryItems().map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantityOnHand: next,
                  updatedAt: nowIso(),
                  updatedBy: document.body.dataset.currentEmail || "",
                }
              : item
          );
          saveInventoryItems(updated);
          state.selectedItemId = id;
          render();
          smoothFocus(root.querySelector("[data-inventory-detail-panel]"));
        });
      });
    }

    function attachRestockActions() {
      root.querySelectorAll("[data-approve-restock]").forEach((button) => {
        button.addEventListener("click", () => {
          if (!canManageRestock()) {
            return;
          }
          const id = button.getAttribute("data-approve-restock");
          state.restockRows = state.restockRows.map((item) => (item.id === id ? { ...item, status: "approved" } : item));
          saveRestockList(state.restockRows);

          const target = state.restockRows.find((item) => item.id === id);
          if (target) {
            const updated = inventoryItems().map((item) =>
              item.id === target.itemId
                ? {
                    ...item,
                    restockOrdered: true,
                    updatedAt: nowIso(),
                    updatedBy: document.body.dataset.currentEmail || "",
                  }
                : item
            );
            saveInventoryItems(updated);
          }

          render();
        });
      });

      root.querySelectorAll("[data-dismiss-restock]").forEach((button) => {
        button.addEventListener("click", () => {
          if (!canManageRestock()) {
            return;
          }
          const id = button.getAttribute("data-dismiss-restock");
          state.restockRows = state.restockRows.filter((item) => item.id !== id);
          saveRestockList(state.restockRows);
          render();
        });
      });

      root.querySelectorAll("[data-edit-restock]").forEach((button) => {
        button.addEventListener("click", () => {
          if (!canManageRestock()) {
            return;
          }
          const id = button.getAttribute("data-edit-restock");
          const target = state.restockRows.find((item) => item.id === id);
          if (!target) {
            return;
          }
          const next = window.prompt(`Edit suggested quantity for ${target.item}`, String(target.suggestedOrderQuantity));
          if (next == null) {
            return;
          }
          const qty = Math.max(0, Math.ceil(numberValue(next)));
          state.restockRows = state.restockRows.map((item) =>
            item.id === id
              ? {
                  ...item,
                  suggestedOrderQuantity: qty,
                  estimatedCost: qty * (item.estimatedCost / Math.max(1, item.suggestedOrderQuantity)),
                }
              : item
          );
          saveRestockList(state.restockRows);
          render();
        });
      });
    }

    function attachReminderActions() {
      root.querySelectorAll("[data-reminder-complete]").forEach((button) => {
        button.addEventListener("click", () => {
          updateReminder(button.getAttribute("data-reminder-complete"), "complete");
          render();
        });
      });

      root.querySelectorAll("[data-reminder-snooze]").forEach((button) => {
        button.addEventListener("click", () => {
          updateReminder(button.getAttribute("data-reminder-snooze"), "snooze");
          render();
        });
      });

      root.querySelectorAll("[data-reminder-open-item]").forEach((button) => {
        button.addEventListener("click", () => {
          const itemId = button.getAttribute("data-reminder-open-item");
          const item = inventoryItems().find((row) => row.id === itemId);
          if (!item) {
            return;
          }
          state.search = item.name;
          const input = root.querySelector("[data-inventory-search]");
          if (input) {
            input.value = item.name;
          }
          render();
        });
      });
    }

    function render() {
      fillCategories();

      const visibleItems = filteredItems();
      const allActive = inventoryItems().filter((item) => !item.archived);
      setKpis(allActive);
      refreshUsageItemOptions(allActive);

      const empty = root.querySelector("[data-inventory-empty]");
      const tableShell = root.querySelector("[data-inventory-table-shell]");

      if (!allActive.length) {
        empty.hidden = false;
        tableShell.hidden = true;
      } else {
        empty.hidden = true;
        tableShell.hidden = false;
      }

      root.querySelector("[data-inventory-table-body]").innerHTML = renderInventoryTableRows(visibleItems);
      root.querySelector("[data-inventory-mobile-cards]").innerHTML = renderInventoryCards(visibleItems);

      const detailPanel = root.querySelector("[data-inventory-detail-panel]");
      const detailContent = root.querySelector("[data-inventory-detail-content]");
      const selectedItem = allActive.find((item) => item.id === state.selectedItemId);
      if (!selectedItem) {
        detailPanel.hidden = true;
        detailContent.innerHTML = "";
      } else {
        const detailStatus = statusForItem(selectedItem);
        detailPanel.hidden = false;
        detailContent.innerHTML = `
          <ul class="staff-detail-list">
            <li><strong>Item:</strong> ${selectedItem.name}</li>
            <li><strong>Category:</strong> ${selectedItem.category}</li>
            <li><strong>Quantity on hand:</strong> ${selectedItem.quantityOnHand} ${selectedItem.unitType}</li>
            <li><strong>Minimum stock level:</strong> ${selectedItem.minimumStockLevel}</li>
            <li><strong>Preferred stock level:</strong> ${selectedItem.preferredStockLevel}</li>
            <li><strong>Status:</strong> ${detailStatus.label}</li>
            <li><strong>Status reason:</strong> ${detailStatus.reason}</li>
            <li><strong>Storage location:</strong> ${selectedItem.storageLocation || "Not set"}</li>
            <li><strong>Supplier:</strong> ${selectedItem.preferredSupplier || "Not set"}</li>
            <li><strong>Notes:</strong> ${selectedItem.notes || "None"}</li>
          </ul>
        `;
      }

      const logs = usageLogs();
      const aiData = aiRestockSuggestions(allActive, logs);
      const summaryNode = root.querySelector("[data-restock-summary]");
      summaryNode.textContent = aiData.message;

      if (aiData.rows.length) {
        const currentById = Object.fromEntries(state.restockRows.map((item) => [item.itemId, item]));
        aiData.rows.forEach((row) => {
          if (!currentById[row.itemId]) {
            state.restockRows.push(row);
          }
        });
        saveRestockList(state.restockRows);
      }

      root.querySelector("[data-reorder-list]").innerHTML = renderRestockList(state.restockRows);

      const reminderRows = recomputeReminders().filter((item) => item.status === "Open");
      root.querySelector("[data-inventory-reminders]").innerHTML = renderReminders(reminderRows);

      renderAiEntrySuggestion();
      renderUsageProposal();

      attachInventoryActions(visibleItems);
      attachRestockActions();
      attachReminderActions();
    }

    function openForm() {
      const formCard = root.querySelector("[data-inventory-form-card]");
      if (formCard) {
        formCard.hidden = false;
        smoothFocus(formCard);
        formCard.querySelector("input[name='name']")?.focus({ preventScroll: true });
      }
    }

    function closeForm() {
      const formCard = root.querySelector("[data-inventory-form-card]");
      if (formCard) {
        formCard.hidden = true;
      }
    }

    root.querySelectorAll("[data-open-supply-form], [data-open-supply-form-empty]").forEach((button) => {
      button.addEventListener("click", openForm);
    });

    root.querySelector("[data-close-supply-form]")?.addEventListener("click", closeForm);

    root.querySelectorAll("[data-open-import], [data-open-import-empty]").forEach((button) => {
      button.addEventListener("click", () => {
        window.alert("Import is available when secure backend import is connected. No sample inventory is created automatically.");
        smoothFocus(root.querySelector("[data-inventory-table-shell]"));
      });
    });

    root.querySelector("[data-inventory-search]")?.addEventListener("input", (event) => {
      state.search = event.target.value || "";
      render();
    });

    root.querySelector("[data-inventory-category-filter]")?.addEventListener("change", (event) => {
      state.category = event.target.value || "all";
      render();
    });

    root.querySelector("[data-inventory-status-filter]")?.addEventListener("change", (event) => {
      state.status = event.target.value || "all";
      render();
    });

    root.querySelector("[data-run-restock-ai]")?.addEventListener("click", () => {
      const allActive = inventoryItems().filter((item) => !item.archived);
      const aiData = aiRestockSuggestions(allActive, usageLogs());
      if (aiData.rows.length) {
        aiData.rows.forEach((row) => {
          const existing = state.restockRows.find((item) => item.itemId === row.itemId && item.status !== "dismissed");
          if (!existing) {
            state.restockRows.push(row);
          }
        });
        saveRestockList(state.restockRows);
      }
      render();
      smoothFocus(root.querySelector("[data-section-key='inventory-restock-list']"));
    });

    root.querySelector("[data-add-custom-category]")?.addEventListener("click", () => {
      const input = root.querySelector("[data-custom-category-input]");
      if (!input) {
        return;
      }
      const value = input.value.trim();
      if (!value) {
        return;
      }
      addCustomCategory(value);
      input.value = "";
      fillCategories();
    });

    root.querySelector("[data-supply-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!canManage) {
        return;
      }

      const form = event.currentTarget;
      const data = new FormData(form);
      const entry = {
        id: uid("itm"),
        name: String(data.get("name") || "").trim(),
        category: String(data.get("category") || "Other"),
        quantityOnHand: numberValue(data.get("quantityOnHand")),
        unitType: String(data.get("unitType") || "Unit").trim(),
        minimumStockLevel: numberValue(data.get("minimumStockLevel")),
        preferredStockLevel: numberValue(data.get("preferredStockLevel")),
        storageLocation: String(data.get("storageLocation") || "").trim(),
        lastRestockDate: data.get("lastRestockDate") ? new Date(String(data.get("lastRestockDate"))).toISOString() : "",
        costPerUnit: canFullManageInventory() ? numberValue(data.get("costPerUnit")) : 0,
        preferredSupplier: canFullManageInventory() ? String(data.get("preferredSupplier") || "").trim() : "",
        notes: String(data.get("notes") || "").trim(),
        restockOrdered: false,
        archived: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: document.body.dataset.currentEmail || "",
        updatedBy: document.body.dataset.currentEmail || "",
      };

      if (!entry.name) {
        return;
      }

      const items = inventoryItems();
      items.push(entry);
      saveInventoryItems(items);

      const suggestion = aiSuggestForEntry(entry, items);
      state.aiEntrySuggestion = { ...suggestion, itemId: entry.id };

      const message = root.querySelector("[data-supply-form-message]");
      const success = root.querySelector("[data-inventory-success]");
      if (message) {
        message.textContent = "Supply saved. AI suggestion is ready for review.";
      }
      if (success) {
        success.textContent = `${entry.name} was added to inventory.`;
      }

      form.reset();
      closeForm();
      state.selectedItemId = entry.id;
      render();
      smoothFocus(root.querySelector(`[data-item-row-id="${entry.id}"]`) || root.querySelector("[data-inventory-detail-panel]"));
    });

    root.querySelector("[data-usage-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const proposal = proposeUsageAdjustment(String(data.get("itemId") || ""), data.get("quantityUsed"), String(data.get("context") || "End of Job Report"));
      state.usageProposal = proposal;
      renderUsageProposal();
    });

    render();
  }

  window.StaffInventory = {
    initInventoryPage,
    proposeUsageAdjustment,
    confirmUsageAdjustment,
  };
})();
