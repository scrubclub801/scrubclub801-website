window.STAFF_PORTAL_CONFIG = {
  appName: "Scrub Club 801 Staff Portal",
  defaultRole: "guest",
  adminOverrideStorageKey: "staff_admin_override",
  authProvider: "supabase", // "supabase" | "firebase"
  secureDataConnected: false,
  aiSummariesEnabled: false,
  inactivityDaysThreshold: 45,

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
