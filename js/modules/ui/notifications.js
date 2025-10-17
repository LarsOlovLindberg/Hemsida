// ============================================================
// notifications.js - Toast/Notification System
// Sökväg: js/modules/ui/notifications.js
// ============================================================

// ============================================================
// NOTIFICATION CONFIGURATION
// ============================================================

const NOTIFICATION_CONFIG = {
  position: "top-right", // 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
  duration: 3000, // millisekunder
  maxNotifications: 5,
  animation: {
    enter: "slideInRight",
    exit: "slideOutRight",
  },
  icons: {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  },
  colors: {
    success: "#4CAF50",
    error: "#F44336",
    warning: "#FF9800",
    info: "#2196F3",
  },
};

// ============================================================
// NOTIFICATION QUEUE
// ============================================================

let notificationQueue = [];
let notificationCount = 0;

// ============================================================
// SHOW NOTIFICATION
// ============================================================

/**
 * Visar en notification/toast.
 * @param {string} message - Meddelande
 * @param {string} type - Typ ('success', 'error', 'warning', 'info')
 * @param {number} duration - Varaktighet i ms (0 = ingen auto-close)
 * @param {object} options - Extra options
 * @returns {object} - Notification object med close-metod
 */
export function showNotification(message, type = "info", duration = null, options = {}) {
  const {
    title = null,
    position = NOTIFICATION_CONFIG.position,
    closeButton = true,
    progressBar = true,
    onClick = null,
  } = options;

  // Skapa container om den inte finns
  ensureNotificationContainer(position);

  // Begränsa antal samtidiga notifications
  if (notificationQueue.length >= NOTIFICATION_CONFIG.maxNotifications) {
    const oldest = notificationQueue.shift();
    if (oldest && oldest.element) {
      closeNotification(oldest);
    }
  }

  // Skapa notification element
  const notificationId = `notification-${++notificationCount}`;
  const notification = createNotificationElement(notificationId, message, type, {
    title,
    closeButton,
    progressBar,
    onClick,
  });

  // Lägg till i container
  const container = document.querySelector(`.notification-container.${position}`);
  container.appendChild(notification.element);

  // Lägg till i queue
  notificationQueue.push(notification);

  // Animera in
  setTimeout(() => {
    notification.element.classList.add("show");
  }, 10);

  // Auto-close
  const actualDuration = duration !== null ? duration : NOTIFICATION_CONFIG.duration;
  if (actualDuration > 0) {
    notification.timeout = setTimeout(() => {
      closeNotification(notification);
    }, actualDuration);

    // Progress bar
    if (progressBar && notification.progressBar) {
      animateProgressBar(notification.progressBar, actualDuration);
    }
  }

  return notification;
}

/**
 * Skapar notification container om den inte finns.
 * @param {string} position - Position
 */
function ensureNotificationContainer(position) {
  let container = document.querySelector(`.notification-container.${position}`);

  if (!container) {
    container = document.createElement("div");
    container.className = `notification-container ${position}`;
    document.body.appendChild(container);
  }
}

/**
 * Skapar notification element.
 * @param {string} id - Notification ID
 * @param {string} message - Meddelande
 * @param {string} type - Typ
 * @param {object} options - Options
 * @returns {object} - Notification object
 */
function createNotificationElement(id, message, type, options) {
  const element = document.createElement("div");
  element.id = id;
  element.className = `notification notification-${type}`;
  element.style.borderLeftColor = NOTIFICATION_CONFIG.colors[type];

  const icon = NOTIFICATION_CONFIG.icons[type];

  element.innerHTML = `
    <div class="notification-icon">
      <i class="fas ${icon}"></i>
    </div>
    <div class="notification-content">
      ${options.title ? `<div class="notification-title">${safe(options.title)}</div>` : ""}
      <div class="notification-message">${safe(message)}</div>
    </div>
    ${options.closeButton ? '<button class="notification-close"><i class="fas fa-times"></i></button>' : ""}
    ${
      options.progressBar
        ? '<div class="notification-progress"><div class="notification-progress-bar"></div></div>'
        : ""
    }
  `;

  const notification = {
    id,
    element,
    type,
    timeout: null,
    progressBar: options.progressBar ? element.querySelector(".notification-progress-bar") : null,
    close: function () {
      closeNotification(this);
    },
  };

  // Close button event
  if (options.closeButton) {
    const closeBtn = element.querySelector(".notification-close");
    closeBtn.addEventListener("click", e => {
      e.stopPropagation();
      closeNotification(notification);
    });
  }

  // Click event
  if (options.onClick) {
    element.style.cursor = "pointer";
    element.addEventListener("click", () => {
      options.onClick(notification);
      closeNotification(notification);
    });
  }

  return notification;
}

/**
 * Stänger en notification.
 * @param {object} notification - Notification object
 */
export function closeNotification(notification) {
  if (!notification || !notification.element) return;

  // Stoppa timeout
  if (notification.timeout) {
    clearTimeout(notification.timeout);
  }

  // Animera ut
  notification.element.classList.remove("show");
  notification.element.classList.add("hide");

  // Ta bort efter animation
  setTimeout(() => {
    if (notification.element && notification.element.parentNode) {
      notification.element.parentNode.removeChild(notification.element);
    }

    // Ta bort från queue
    const index = notificationQueue.indexOf(notification);
    if (index > -1) {
      notificationQueue.splice(index, 1);
    }
  }, 300);
}

/**
 * Stänger alla notifications.
 */
export function closeAllNotifications() {
  const notifications = [...notificationQueue];
  notifications.forEach(notification => {
    closeNotification(notification);
  });
}

// ============================================================
// SHORTCUT FUNCTIONS
// ============================================================

/**
 * Visar success notification.
 * @param {string} message - Meddelande
 * @param {number} duration - Varaktighet
 * @returns {object}
 */
export function showSuccess(message, duration = null) {
  return showNotification(message, "success", duration);
}

/**
 * Visar error notification.
 * @param {string} message - Meddelande
 * @param {number} duration - Varaktighet (längre för errors)
 * @returns {object}
 */
export function showError(message, duration = 5000) {
  return showNotification(message, "error", duration);
}

/**
 * Visar warning notification.
 * @param {string} message - Meddelande
 * @param {number} duration - Varaktighet
 * @returns {object}
 */
export function showWarning(message, duration = 4000) {
  return showNotification(message, "warning", duration);
}

/**
 * Visar info notification.
 * @param {string} message - Meddelande
 * @param {number} duration - Varaktighet
 * @returns {object}
 */
export function showInfo(message, duration = null) {
  return showNotification(message, "info", duration);
}

// ============================================================
// SPECIAL NOTIFICATIONS
// ============================================================

/**
 * Visar loading notification (stängs inte automatiskt).
 * @param {string} message - Meddelande
 * @returns {object}
 */
export function showLoading(message = "Laddar...") {
  return showNotification(message, "info", 0, {
    closeButton: false,
    progressBar: false,
  });
}

/**
 * Visar confirmation notification med knappar.
 * @param {string} message - Meddelande
 * @param {function} onConfirm - Callback vid bekräftelse
 * @param {function} onCancel - Callback vid avbrytning
 * @returns {object}
 */
export function showConfirmation(message, onConfirm, onCancel = null) {
  const notification = showNotification(message, "warning", 0, {
    closeButton: false,
    progressBar: false,
  });

  // Lägg till knappar
  const content = notification.element.querySelector(".notification-content");
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "notification-buttons";
  buttonContainer.innerHTML = `
    <button class="btn btn-primary btn-sm notification-confirm">Bekräfta</button>
    <button class="btn btn-secondary btn-sm notification-cancel">Avbryt</button>
  `;
  content.appendChild(buttonContainer);

  // Event listeners
  buttonContainer.querySelector(".notification-confirm").addEventListener("click", e => {
    e.stopPropagation();
    if (onConfirm) onConfirm();
    closeNotification(notification);
  });

  buttonContainer.querySelector(".notification-cancel").addEventListener("click", e => {
    e.stopPropagation();
    if (onCancel) onCancel();
    closeNotification(notification);
  });

  return notification;
}

/**
 * Visar progress notification.
 * @param {string} message - Meddelande
 * @param {number} progress - Initial progress (0-100)
 * @returns {object}
 */
export function showProgress(message, progress = 0) {
  const notification = showNotification(message, "info", 0, {
    closeButton: true,
    progressBar: true,
  });

  notification.updateProgress = function (newProgress) {
    if (this.progressBar) {
      this.progressBar.style.width = `${newProgress}%`;
      this.progressBar.style.transition = "width 0.3s ease";
    }
  };

  notification.updateProgress(progress);

  return notification;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Animerar progress bar.
 * @param {HTMLElement} progressBar - Progress bar element
 * @param {number} duration - Duration i ms
 */
function animateProgressBar(progressBar, duration) {
  if (!progressBar) return;

  progressBar.style.transition = `width ${duration}ms linear`;
  progressBar.style.width = "0%";

  // Trigger reflow
  progressBar.offsetHeight;

  // Animera till 100%
  progressBar.style.width = "100%";
}

/**
 * Saniterar text (används internt).
 * @param {string} text - Text
 * @returns {string}
 */
function safe(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Ändrar position för notifications.
 * @param {string} position - Ny position
 */
export function setNotificationPosition(position) {
  if (!["top-right", "top-left", "bottom-right", "bottom-left", "top-center", "bottom-center"].includes(position)) {
    console.warn(`[Notifications] Ogiltig position: ${position}`);
    return;
  }

  NOTIFICATION_CONFIG.position = position;
  console.log(`[Notifications] Position ändrad till: ${position}`);
}

/**
 * Ändrar standard duration.
 * @param {number} duration - Duration i ms
 */
export function setNotificationDuration(duration) {
  NOTIFICATION_CONFIG.duration = duration;
  console.log(`[Notifications] Duration ändrad till: ${duration}ms`);
}

// ============================================================
// NOTIFICATION GROUPS
// ============================================================

/**
 * Skapar en notification group (flera notifications som hänger ihop).
 * @param {array} notifications - Array av notification configs
 * @returns {object}
 */
export function showNotificationGroup(notifications) {
  const group = {
    notifications: [],
    closeAll: function () {
      this.notifications.forEach(n => closeNotification(n));
    },
  };

  notifications.forEach((config, index) => {
    setTimeout(() => {
      const notification = showNotification(
        config.message,
        config.type || "info",
        config.duration,
        config.options || {}
      );
      group.notifications.push(notification);
    }, index * 200); // Stagger
  });

  return group;
}

// ============================================================
// PERSISTENT NOTIFICATIONS
// ============================================================

let persistentNotifications = {};

/**
 * Visar en persistent notification som kan uppdateras.
 * @param {string} id - Unikt ID
 * @param {string} message - Meddelande
 * @param {string} type - Typ
 * @returns {object}
 */
export function showPersistentNotification(id, message, type = "info") {
  // Stäng befintlig med samma ID
  if (persistentNotifications[id]) {
    closeNotification(persistentNotifications[id]);
  }

  const notification = showNotification(message, type, 0, {
    closeButton: true,
    progressBar: false,
  });

  persistentNotifications[id] = notification;

  notification.update = function (newMessage, newType = null) {
    if (newType) {
      this.element.className = `notification notification-${newType} show`;
      this.element.style.borderLeftColor = NOTIFICATION_CONFIG.colors[newType];

      const icon = NOTIFICATION_CONFIG.icons[newType];
      const iconElement = this.element.querySelector(".notification-icon i");
      if (iconElement) {
        iconElement.className = `fas ${icon}`;
      }
    }

    const messageElement = this.element.querySelector(".notification-message");
    if (messageElement) {
      messageElement.textContent = newMessage;
    }
  };

  return notification;
}

/**
 * Uppdaterar en persistent notification.
 * @param {string} id - ID
 * @param {string} message - Nytt meddelande
 * @param {string} type - Ny typ (optional)
 */
export function updatePersistentNotification(id, message, type = null) {
  const notification = persistentNotifications[id];
  if (notification && notification.update) {
    notification.update(message, type);
  }
}

/**
 * Stänger en persistent notification.
 * @param {string} id - ID
 */
export function closePersistentNotification(id) {
  const notification = persistentNotifications[id];
  if (notification) {
    closeNotification(notification);
    delete persistentNotifications[id];
  }
}

// ============================================================
// NOTIFICATION SOUNDS (Optional)
// ============================================================

const NOTIFICATION_SOUNDS = {
  success: new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZQQ0PVarj6p1TFAhKnu/ypnMfBi+A0fLZiTYIGme95+WcTA0MUKni7Z1aFQhHnO/xsWggBTGE0/HafigGJXPN8t+SQQsOWLXl75hPEgxKnuno5L+hUBUGQZjg8NiVSwkSYbru7KJZEwpMm+jrrGYbB0GB0/PajSz=="
  ),
  error: new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAD/+vr6+vr6+vn5+fn5+fj4+Pj4+Pf39/f39/b29vb29vX19fX19fT09PT09PPz8/Pz8/Ly8vLy8vHx8fHx8fDw8PDw8O/v7+/v7+7u7u7u7u3t7e3t7ezs7Ozs7Ovr6+vr6+rq6urq6unp6enp6ejo6Ojo6Ofn5+fn5+bm5ubm5uXl5eXl5eTk5OTk5OPj4+Pj4+Li4uLi4uHh4eHh4eDg4ODg4N/f39/f39zc3Nzc3Nvb29vb29ra2tra2tnZ2dnZ2djY2NjY2NfX19fX19bW1tbW1tXV1dXV1dTU1NTU1NPT09PT09LS0tLS0tHR0dHR0dDQ0NDQ0M/Pz8/Pz87Ozs7Ozs3Nzc3Nzc=="
  ),
  warning: new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZQQ0PVarj6p1TFAhKnu/ypnMfBi+A0fLZiTYIGme95+WcTA0MUKni7Z1aFQhHnO/xsWggBTGE0/HafigGJXPN8t+SQQsOWLXl75hPEgxKnuno5L+hUBUGQZjg8NiVSwkSYbru7KJZEwpMm+jrrGYbB0GB0/PajSz=="
  ),
};

let soundEnabled = true;

/**
 * Spelar notification sound.
 * @param {string} type - Notification typ
 */
function playNotificationSound(type) {
  if (!soundEnabled) return;

  const sound = NOTIFICATION_SOUNDS[type];
  if (sound) {
    sound.currentTime = 0;
    sound.volume = 0.3;
    sound.play().catch(err => {
      // Ignorera fel om användaren inte har interagerat med sidan än
      console.log("[Notifications] Kunde inte spela ljud:", err.message);
    });
  }
}

/**
 * Aktiverar/inaktiverar notification sounds.
 * @param {boolean} enabled - true/false
 */
export function setNotificationSounds(enabled) {
  soundEnabled = enabled;
  console.log(`[Notifications] Ljud ${enabled ? "aktiverat" : "inaktiverat"}.`);
}

// ============================================================
// BROWSER NOTIFICATIONS
// ============================================================

/**
 * Begär tillstånd för browser notifications.
 * @returns {Promise<string>} - 'granted', 'denied', eller 'default'
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("[Notifications] Browser notifications stöds inte.");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Visar browser notification.
 * @param {string} title - Titel
 * @param {string} body - Meddelande
 * @param {object} options - Extra options
 */
export async function showBrowserNotification(title, body, options = {}) {
  const permission = await requestNotificationPermission();

  if (permission !== "granted") {
    console.warn("[Notifications] Browser notification-tillstånd saknas.");
    // Fallback till vanlig notification
    showNotification(body, "info");
    return;
  }

  const notification = new Notification(title, {
    body: body,
    icon: options.icon || "/img/logo.png",
    badge: options.badge || "/img/badge.png",
    tag: options.tag || "default",
    requireInteraction: options.requireInteraction || false,
    ...options,
  });

  notification.onclick = () => {
    window.focus();
    if (options.onClick) {
      options.onClick();
    }
    notification.close();
  };

  return notification;
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

/**
 * Sätter upp keyboard shortcuts för notifications.
 */
function setupNotificationShortcuts() {
  document.addEventListener("keydown", e => {
    // Ctrl/Cmd + Shift + N = Stäng alla notifications
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
      e.preventDefault();
      closeAllNotifications();
      showInfo("Alla notifikationer stängda", 1000);
    }
  });
}

// Auto-setup shortcuts
if (typeof window !== "undefined") {
  setupNotificationShortcuts();
}

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initierar notification-systemet.
 */
export function initializeNotifications() {
  console.log("[Notifications] Initierar notification-system...");

  // Skapa CSS om det inte finns
  if (!document.getElementById("notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      .notification-container {
        position: fixed;
        z-index: 9999;
        pointer-events: none;
      }
      
      .notification-container.top-right {
        top: 20px;
        right: 20px;
      }
      
      .notification-container.top-left {
        top: 20px;
        left: 20px;
      }
      
      .notification-container.bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .notification-container.bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .notification-container.top-center {
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .notification-container.bottom-center {
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .notification {
        background: white;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-bottom: 10px;
        min-width: 300px;
        max-width: 400px;
        display: flex;
        align-items: flex-start;
        padding: 16px;
        border-left: 4px solid #2196F3;
        pointer-events: all;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .notification.show {
        opacity: 1;
        transform: translateX(0);
      }
      
      .notification.hide {
        opacity: 0;
        transform: translateX(100%);
      }
      
      .notification-icon {
        font-size: 20px;
        margin-right: 12px;
        flex-shrink: 0;
      }
      
      .notification-success .notification-icon { color: #4CAF50; }
      .notification-error .notification-icon { color: #F44336; }
      .notification-warning .notification-icon { color: #FF9800; }
      .notification-info .notification-icon { color: #2196F3; }
      
      .notification-content {
        flex: 1;
      }
      
      .notification-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #333;
      }
      
      .notification-message {
        color: #666;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .notification-close {
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        margin-left: 12px;
        flex-shrink: 0;
      }
      
      .notification-close:hover {
        color: #333;
      }
      
      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: rgba(0,0,0,0.1);
      }
      
      .notification-progress-bar {
        height: 100%;
        width: 100%;
        background: currentColor;
        transition: width 0.1s linear;
      }
      
      .notification-buttons {
        margin-top: 12px;
        display: flex;
        gap: 8px;
      }
      
      .notification-buttons button {
        padding: 6px 12px;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  console.log("[Notifications] ✅ Notification-system initierat.");
}

// Auto-initialize
if (typeof window !== "undefined" && document.readyState !== "loading") {
  initializeNotifications();
} else if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", initializeNotifications);
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.showNotification = showNotification;
window.closeNotification = closeNotification;
window.closeAllNotifications = closeAllNotifications;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.showLoading = showLoading;
window.showConfirmation = showConfirmation;
window.showProgress = showProgress;
window.showNotificationGroup = showNotificationGroup;
window.showPersistentNotification = showPersistentNotification;
window.updatePersistentNotification = updatePersistentNotification;
window.closePersistentNotification = closePersistentNotification;
window.setNotificationPosition = setNotificationPosition;
window.setNotificationDuration = setNotificationDuration;
window.setNotificationSounds = setNotificationSounds;
window.requestNotificationPermission = requestNotificationPermission;
window.showBrowserNotification = showBrowserNotification;

console.log("[Notifications] notifications.js laddad.");
