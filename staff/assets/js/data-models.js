(function () {
  const STORAGE_KEYS = {
    employees: "staff_employees_v1",
    clients: "staff_clients_v1",
    appointments: "staff_appointments_v1",
    services: "staff_services_v1",
    payments: "staff_payments_v1",
    employeePayouts: "staff_employee_payouts_v1",
    clientNotes: "staff_client_notes_v1",
    reminders: "staff_reminders_v1",
    jobReports: "staff_job_reports_v1",
    trainingRecords: "staff_training_records_v1",
    quotes: "staff_quotes_v1",
  };

  const SERVICE_FREQUENCY = ["one_time", "weekly", "biweekly", "monthly", "custom"];
  const HEALTH_STATUSES = ["new", "active", "recurring", "follow_up_needed", "at_risk", "inactive"];

  const ENTITY_SCHEMAS = {
    employees: {
      required: ["id", "fullName", "email", "role", "status"],
      optional: ["phone", "timezone", "permissions"],
    },
    clients: {
      required: ["id", "name", "serviceFrequency", "accountStatus"],
      optional: [
        "phone",
        "email",
        "address",
        "serviceType",
        "assignedEmployeeId",
        "assignedEmployeeName",
        "assignedEmployeeEmail",
        "lastServiceDate",
        "nextScheduledService",
        "totalAmountPaid",
        "completedServicesCount",
        "healthStatus",
        "healthStatusOverride",
        "internalNotes",
        "customerFacingNotes",
        "petOrAccessInstructions",
        "preferredProducts",
      ],
    },
    appointments: {
      required: ["id", "clientId", "status"],
      optional: ["scheduledStart", "scheduledEnd", "serviceType", "assignedEmployeeId", "assignedEmployeeName", "recurringConfirmed"],
    },
    services: {
      required: ["id", "clientId", "serviceType", "completedAt"],
      optional: ["appointmentId", "assignedEmployeeId", "assignedEmployeeName"],
    },
    payments: {
      required: ["id", "clientId", "serviceDate", "paymentStatus"],
      optional: ["serviceType", "amountCharged", "employeePayout", "tips", "additionalFees", "paymentMethod", "assignedEmployeeId", "assignedEmployeeName"],
    },
    employeePayouts: {
      required: ["id", "paymentId", "employeeId", "amount"],
      optional: ["status", "paidAt"],
    },
    clientNotes: {
      required: ["id", "clientId", "noteType", "content", "createdAt"],
      optional: ["createdBy", "requiresFollowUp", "resolvedAt"],
    },
    reminders: {
      required: ["id", "clientId", "reason", "dueDate", "priority", "assignedEmployeeName", "status"],
      optional: ["sourceType", "snoozedUntil"],
    },
    jobReports: {
      required: ["id", "clientId", "serviceDate", "status"],
      optional: ["notes", "containsUnresolvedIssue", "issueSummary", "reviewRequestSentAt", "thankYouSentAt"],
    },
    trainingRecords: {
      required: ["employeeKey", "employeeName", "progressPercent"],
      optional: ["complete", "quiz"],
    },
  };

  function readCollection(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function writeCollection(key, items) {
    localStorage.setItem(key, JSON.stringify(Array.isArray(items) ? items : []));
  }

  function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeDateValue(value) {
    if (!value) {
      return "";
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return "";
    }
    return d.toISOString();
  }

  function normalizeFrequency(value) {
    if (SERVICE_FREQUENCY.includes(value)) {
      return value;
    }
    return "one_time";
  }

  function normalizeHealthStatus(value) {
    if (HEALTH_STATUSES.includes(value)) {
      return value;
    }
    return "new";
  }

  function normalizeClient(client) {
    const source = client || {};
    return {
      id: source.id || "",
      name: source.name || "",
      phone: source.phone || "",
      email: source.email || "",
      address: source.address || "",
      serviceType: source.serviceType || "",
      serviceFrequency: normalizeFrequency(source.serviceFrequency),
      assignedEmployeeId: source.assignedEmployeeId || "",
      assignedEmployeeName: source.assignedEmployeeName || "",
      assignedEmployeeEmail: source.assignedEmployeeEmail || "",
      lastServiceDate: normalizeDateValue(source.lastServiceDate),
      nextScheduledService: normalizeDateValue(source.nextScheduledService),
      totalAmountPaid: toNumber(source.totalAmountPaid),
      completedServicesCount: toNumber(source.completedServicesCount),
      healthStatus: normalizeHealthStatus(source.healthStatus),
      healthStatusOverride: source.healthStatusOverride ? normalizeHealthStatus(source.healthStatusOverride) : "",
      internalNotes: source.internalNotes || "",
      customerFacingNotes: source.customerFacingNotes || "",
      petOrAccessInstructions: source.petOrAccessInstructions || "",
      preferredProducts: source.preferredProducts || "",
      accountStatus: source.accountStatus || "active",
      createdAt: normalizeDateValue(source.createdAt) || new Date().toISOString(),
      updatedAt: normalizeDateValue(source.updatedAt) || new Date().toISOString(),
    };
  }

  function normalizeAppointment(appointment) {
    const source = appointment || {};
    return {
      id: source.id || "",
      clientId: source.clientId || "",
      clientName: source.clientName || "",
      scheduledStart: normalizeDateValue(source.scheduledStart),
      scheduledEnd: normalizeDateValue(source.scheduledEnd),
      serviceType: source.serviceType || "",
      serviceFrequency: normalizeFrequency(source.serviceFrequency),
      status: source.status || "scheduled",
      assignedEmployeeId: source.assignedEmployeeId || "",
      assignedEmployeeName: source.assignedEmployeeName || "",
      assignedEmployeeEmail: source.assignedEmployeeEmail || "",
      recurringConfirmed: Boolean(source.recurringConfirmed),
      createdAt: normalizeDateValue(source.createdAt) || new Date().toISOString(),
      updatedAt: normalizeDateValue(source.updatedAt) || new Date().toISOString(),
    };
  }

  function normalizePayment(payment) {
    const source = payment || {};
    return {
      id: source.id || "",
      clientId: source.clientId || "",
      clientName: source.clientName || "",
      serviceDate: normalizeDateValue(source.serviceDate),
      serviceType: source.serviceType || "",
      amountCharged: toNumber(source.amountCharged),
      employeePayout: toNumber(source.employeePayout),
      tips: toNumber(source.tips),
      additionalFees: toNumber(source.additionalFees),
      paymentStatus: source.paymentStatus || "pending",
      paymentMethod: source.paymentMethod || "",
      assignedEmployeeId: source.assignedEmployeeId || "",
      assignedEmployeeName: source.assignedEmployeeName || "",
      assignedEmployeeEmail: source.assignedEmployeeEmail || "",
      createdAt: normalizeDateValue(source.createdAt) || new Date().toISOString(),
    };
  }

  function normalizeReminder(reminder) {
    const source = reminder || {};
    return {
      id: source.id || "",
      clientId: source.clientId || "",
      clientName: source.clientName || "",
      reason: source.reason || "",
      dueDate: normalizeDateValue(source.dueDate),
      priority: source.priority || "normal",
      assignedEmployeeName: source.assignedEmployeeName || "",
      assignedEmployeeEmail: source.assignedEmployeeEmail || "",
      status: source.status || "open",
      sourceType: source.sourceType || "manual",
      snoozedUntil: normalizeDateValue(source.snoozedUntil),
      createdAt: normalizeDateValue(source.createdAt) || new Date().toISOString(),
    };
  }

  function getClients() {
    return readCollection(STORAGE_KEYS.clients).map(normalizeClient);
  }

  function setClients(clients) {
    writeCollection(STORAGE_KEYS.clients, clients.map(normalizeClient));
  }

  function getAppointments() {
    return readCollection(STORAGE_KEYS.appointments).map(normalizeAppointment);
  }

  function setAppointments(appointments) {
    writeCollection(STORAGE_KEYS.appointments, appointments.map(normalizeAppointment));
  }

  function getPayments() {
    return readCollection(STORAGE_KEYS.payments).map(normalizePayment);
  }

  function setPayments(payments) {
    writeCollection(STORAGE_KEYS.payments, payments.map(normalizePayment));
  }

  function getReminders() {
    return readCollection(STORAGE_KEYS.reminders).map(normalizeReminder);
  }

  function setReminders(reminders) {
    writeCollection(STORAGE_KEYS.reminders, reminders.map(normalizeReminder));
  }

  function getClientNotes() {
    return readCollection(STORAGE_KEYS.clientNotes);
  }

  function getJobReports() {
    return readCollection(STORAGE_KEYS.jobReports);
  }

  function getQuotes() {
    return readCollection(STORAGE_KEYS.quotes);
  }

  function daysSince(dateValue) {
    if (!dateValue) {
      return Number.POSITIVE_INFINITY;
    }
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return Number.POSITIVE_INFINITY;
    }
    const diffMs = Date.now() - date.getTime();
    return Math.floor(diffMs / 86400000);
  }

  function canViewRecord(session, assignedEmployeeEmail) {
    if (!session || session.role === "manager") {
      return true;
    }
    if (!assignedEmployeeEmail) {
      return true;
    }
    return session.email && session.email.toLowerCase() === assignedEmployeeEmail.toLowerCase();
  }

  function getVisibleClients(session) {
    return getClients().filter((client) => canViewRecord(session, client.assignedEmployeeEmail));
  }

  function getVisibleAppointments(session) {
    return getAppointments().filter((appointment) => canViewRecord(session, appointment.assignedEmployeeEmail));
  }

  function getVisiblePayments(session) {
    return getPayments().filter((payment) => canViewRecord(session, payment.assignedEmployeeEmail));
  }

  function getVisibleReminders(session) {
    return getReminders().filter((reminder) => canViewRecord(session, reminder.assignedEmployeeEmail));
  }

  function deriveHealthSuggestion(client, context) {
    const appointments = context.appointments.filter((item) => item.clientId === client.id);
    const notes = context.notes.filter((item) => item.clientId === client.id);
    const reports = context.reports.filter((item) => item.clientId === client.id);
    const quotes = context.quotes.filter((item) => item.clientId === client.id);
    const completedServices = toNumber(client.completedServicesCount);
    const recurringSelected = client.serviceFrequency && client.serviceFrequency !== "one_time";
    const recurringConfirmed = appointments.some((item) => item.recurringConfirmed);
    const canceledCount = appointments.filter((item) => item.status === "canceled" || item.status === "no_show").length;
    const unresolvedNote = notes.some((item) => item.requiresFollowUp && !item.resolvedAt);
    const unresolvedReport = reports.some((item) => item.containsUnresolvedIssue);
    const pendingQuote = quotes.some((item) => item.status === "pending" || item.status === "awaiting_response");

    if (completedServices === 0) {
      return { status: "new", reason: "No completed services are recorded yet." };
    }

    if (unresolvedNote || unresolvedReport || pendingQuote) {
      return { status: "follow_up_needed", reason: "An unresolved note, report issue, or pending quote requires follow-up." };
    }

    if (recurringSelected && recurringConfirmed) {
      return { status: "recurring", reason: "A recurring schedule is confirmed from saved appointment records." };
    }

    if (canceledCount >= 2) {
      return { status: "at_risk", reason: "Multiple missed or canceled appointments were recorded." };
    }

    const thresholdDays = Number(window.STAFF_PORTAL_CONFIG?.inactivityDaysThreshold || 45);
    if (daysSince(client.lastServiceDate) > thresholdDays && daysSince(client.nextScheduledService) > thresholdDays) {
      return { status: "inactive", reason: "No recent completed or scheduled service is within the configured period." };
    }

    return { status: "active", reason: "Recent service activity has no unresolved issues." };
  }

  function getClientPaymentSummary(clientId, payments) {
    const filtered = payments.filter((payment) => payment.clientId === clientId && payment.paymentStatus !== "void");
    const completed = filtered.filter((payment) => payment.paymentStatus === "paid");
    const totalPaid = completed.reduce((sum, payment) => sum + payment.amountCharged + payment.additionalFees, 0);
    const totalPayouts = completed.reduce((sum, payment) => sum + payment.employeePayout, 0);
    const totalTips = completed.reduce((sum, payment) => sum + payment.tips, 0);
    const averageJobValue = completed.length ? totalPaid / completed.length : 0;
    const lastPaymentDate = completed
      .map((payment) => payment.serviceDate)
      .filter(Boolean)
      .sort()
      .pop() || "";

    return {
      totalPaid,
      totalPayouts,
      totalTips,
      averageJobValue,
      completedJobs: completed.length,
      lastPaymentDate,
    };
  }

  function getClientTimeline(clientId) {
    const appointments = getAppointments().filter((item) => item.clientId === clientId);
    const payments = getPayments().filter((item) => item.clientId === clientId);
    const reports = getJobReports().filter((item) => item.clientId === clientId);
    const quotes = getQuotes().filter((item) => item.clientId === clientId);

    const timeline = [];
    quotes.forEach((item) => {
      if (item.submittedAt) {
        timeline.push({ type: "Quote submitted", when: item.submittedAt });
      }
      if (item.acceptedAt) {
        timeline.push({ type: "Quote accepted", when: item.acceptedAt });
      }
    });

    appointments.forEach((item) => {
      if (item.createdAt) {
        timeline.push({ type: "Appointment scheduled", when: item.createdAt });
      }
      if (item.assignedEmployeeName) {
        timeline.push({ type: "Employee assigned", when: item.updatedAt || item.createdAt });
      }
      if (item.startedAt) {
        timeline.push({ type: "Job started", when: item.startedAt });
      }
      if (item.completedAt) {
        timeline.push({ type: "Job completed", when: item.completedAt });
      }
    });

    reports.forEach((item) => {
      if (item.createdAt) {
        timeline.push({ type: "End-of-job report", when: item.createdAt });
      }
      if (item.reviewRequestSentAt) {
        timeline.push({ type: "Review request sent", when: item.reviewRequestSentAt });
      }
      if (item.followUpCompletedAt) {
        timeline.push({ type: "Follow-up completed", when: item.followUpCompletedAt });
      }
    });

    payments.forEach((item) => {
      if (item.paymentStatus === "paid" && item.createdAt) {
        timeline.push({ type: "Payment recorded", when: item.createdAt });
      }
    });

    return timeline
      .filter((item) => item.when)
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  }

  function updateReminderStatus(reminderId, nextStatus) {
    const reminders = getReminders();
    const updated = reminders.map((item) => {
      if (item.id !== reminderId) {
        return item;
      }
      return {
        ...item,
        status: nextStatus,
      };
    });
    setReminders(updated);
  }

  function snoozeReminder(reminderId, days) {
    const reminders = getReminders();
    const updated = reminders.map((item) => {
      if (item.id !== reminderId) {
        return item;
      }
      const base = item.dueDate ? new Date(item.dueDate) : new Date();
      base.setDate(base.getDate() + (days || 1));
      return {
        ...item,
        snoozedUntil: base.toISOString(),
        dueDate: base.toISOString(),
      };
    });
    setReminders(updated);
  }

  function updateClientHealthOverride(clientId, status) {
    const clients = getClients().map((item) => {
      if (item.id !== clientId) {
        return item;
      }
      return {
        ...item,
        healthStatusOverride: normalizeHealthStatus(status),
        updatedAt: new Date().toISOString(),
      };
    });
    setClients(clients);
  }

  function updateClientFrequency(clientId, frequency, session) {
    if (!session || !window.StaffAuth.canAccessRole(session.role, "employee")) {
      return;
    }

    const clients = getClients().map((item) => {
      if (item.id !== clientId) {
        return item;
      }
      return {
        ...item,
        serviceFrequency: normalizeFrequency(frequency),
        updatedAt: new Date().toISOString(),
      };
    });
    setClients(clients);
  }

  window.StaffRecords = {
    STORAGE_KEYS,
    ENTITY_SCHEMAS,
    SERVICE_FREQUENCY,
    HEALTH_STATUSES,
    getClients,
    setClients,
    getAppointments,
    setAppointments,
    getPayments,
    setPayments,
    getReminders,
    setReminders,
    getClientNotes,
    getJobReports,
    getQuotes,
    getVisibleClients,
    getVisibleAppointments,
    getVisiblePayments,
    getVisibleReminders,
    deriveHealthSuggestion,
    getClientPaymentSummary,
    getClientTimeline,
    updateReminderStatus,
    snoozeReminder,
    updateClientHealthOverride,
    updateClientFrequency,
  };
})();
