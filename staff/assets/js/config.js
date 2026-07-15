window.STAFF_PORTAL_CONFIG = {
  appName: "Scrub Club 801 Staff Portal",
  defaultRole: "employee",
  authProvider: "supabase", // "supabase" | "firebase"
  secureDataConnected: true,
  aiSummariesEnabled: false,
  inactivityDaysThreshold: 45,
  allowPublicSignup: false,

  roles: {
    owner: "owner",
    admin: "admin",
    manager: "manager",
    teamLead: "team_lead",
    employee: "employee",
    trainee: "trainee",
    guest: "guest",
  },

  push: {
    enabled: false,
    vapidPublicKey: "",
  },

  ai: {
    enabled: false,
    endpoint: "",
  },

  // Supabase settings
  supabase: {
    url: "",
    anonKey: "",
    persistSession: true,
  },

  // Firebase settings
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: "",
  },
};
