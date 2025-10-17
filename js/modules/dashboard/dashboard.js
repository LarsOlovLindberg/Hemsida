// ============================================================
// dashboard.js - Dashboard (minimal version)
// Sökväg: js/modules/dashboard/dashboard.js
// ============================================================

/**
 * Initierar dashboard.
 */
export async function initDashboard() {
  console.log("[Dashboard] Initierad (minimal version).");
  updateDashboard();
}

/**
 * Uppdaterar dashboard med statistik.
 */
export function updateDashboard() {
  console.log("[Dashboard] Uppdaterad.");

  // Placeholder - implementera senare
  const statsContainer = document.getElementById("dashboardStats");
  if (statsContainer) {
    statsContainer.innerHTML = "<p>Dashboard kommer snart...</p>";
  }
}

// Exportera globalt
window.updateDashboard = updateDashboard;

console.log("[Dashboard] dashboard.js laddad.");
