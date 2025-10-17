// ============================================================
// api.js - Centraliserad API-kommunikation
// Sökväg: js/api.js
// ============================================================

import { setLoading, setError } from "./state.js";

// ============================================================
// API CONFIGURATION
// ============================================================

const API_CONFIG = {
  baseUrl: "/api",
  timeout: 30000, // 30 sekunder
  retryAttempts: 3,
  retryDelay: 1000, // 1 sekund
  headers: {
    "Content-Type": "application/json",
  },
};

// ============================================================
// API CLIENT
// ============================================================

class ApiClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.retryAttempts = config.retryAttempts;
    this.retryDelay = config.retryDelay;
    this.defaultHeaders = config.headers;
  }

  /**
   * Gör ett API-anrop.
   * @param {string} endpoint - API-endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    console.log(`[API] ${config.method || "GET"} ${url}`);

    try {
      const response = await this.fetchWithTimeout(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`[API] Fel vid anrop till ${url}:`, error);
      throw error;
    }
  }

  /**
   * Fetch med timeout.
   * @param {string} url - URL
   * @param {object} config - Fetch config
   * @returns {Promise<Response>}
   */
  async fetchWithTimeout(url, config) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Hanterar API-svar.
   * @param {Response} response - Fetch response
   * @returns {Promise<any>}
   */
  async handleResponse(response) {
    const contentType = response.headers.get("content-type");

    // Hantera olika content types
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else if (contentType && contentType.includes("text/")) {
      data = await response.text();
    } else {
      data = await response.blob();
    }

    // Kontrollera om request lyckades
    if (!response.ok) {
      const error = new Error(data.error || data.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * GET-request.
   * @param {string} endpoint - API-endpoint
   * @param {object} params - Query parameters
   * @returns {Promise<any>}
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: "GET",
    });
  }

  /**
   * POST-request.
   * @param {string} endpoint - API-endpoint
   * @param {object} data - Request body
   * @returns {Promise<any>}
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT-request.
   * @param {string} endpoint - API-endpoint
   * @param {object} data - Request body
   * @returns {Promise<any>}
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE-request.
   * @param {string} endpoint - API-endpoint
   * @returns {Promise<any>}
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: "DELETE",
    });
  }

  /**
   * Upload fil.
   * @param {string} endpoint - API-endpoint
   * @param {FormData} formData - Form data med fil
   * @returns {Promise<any>}
   */
  async upload(endpoint, formData) {
    return this.request(endpoint, {
      method: "POST",
      body: formData,
      headers: {
        // Låt browser sätta Content-Type för FormData
      },
    });
  }
}

// Skapa global API-klient
const api = new ApiClient(API_CONFIG);

// ============================================================
// API ENDPOINTS
// ============================================================

/**
 * Huvudman API
 */
export const huvudmanApi = {
  /**
   * Hämtar alla huvudmän.
   * @param {object} filters - Filter (overformyndareId, includeInactive)
   * @returns {Promise<array>}
   */
  async getAll(filters = {}) {
    setLoading("huvudman", true);
    try {
      const data = await api.get("/get_huvudman.php", filters);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("huvudman", false);
    }
  },

  /**
   * Hämtar en specifik huvudman.
   * @param {string} pnr - Personnummer
   * @returns {Promise<object>}
   */
  async getOne(pnr) {
    setLoading("huvudman", true);
    try {
      const data = await api.get("/get_huvudman_details.php", { pnr });
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("huvudman", false);
    }
  },

  /**
   * Skapar ny huvudman.
   * @param {object} huvudmanData - Huvudmandata
   * @returns {Promise<object>}
   */
  async create(huvudmanData) {
    setLoading("huvudman", true);
    try {
      const data = await api.post("/create_huvudman.php", huvudmanData);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("huvudman", false);
    }
  },

  /**
   * Uppdaterar huvudman.
   * @param {string} pnr - Personnummer
   * @param {object} huvudmanData - Huvudmandata
   * @returns {Promise<object>}
   */
  async update(pnr, huvudmanData) {
    setLoading("huvudman", true);
    try {
      const data = await api.put(`/update_huvudman.php?pnr=${pnr}`, huvudmanData);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("huvudman", false);
    }
  },

  /**
   * Tar bort huvudman.
   * @param {string} pnr - Personnummer
   * @returns {Promise<object>}
   */
  async delete(pnr) {
    setLoading("huvudman", true);
    try {
      const data = await api.delete(`/delete_huvudman.php?pnr=${pnr}`);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("huvudman", false);
    }
  },
};

/**
 * Årsräkning API
 */
export const arsrakningApi = {
  /**
   * Hämtar årsräkning för en huvudman och ett år.
   * @param {string} pnr - Personnummer
   * @param {number} year - År
   * @returns {Promise<object>}
   */
  async get(pnr, year) {
    setLoading("arsrakning", true);
    try {
      const data = await api.get("/get_arsrakning.php", { pnr, ar: year });
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("arsrakning", false);
    }
  },

  /**
   * Sparar årsräkning.
   * @param {string} pnr - Personnummer
   * @param {number} year - År
   * @param {object} arsrakningData - Årsräkningsdata
   * @returns {Promise<object>}
   */
  async save(pnr, year, arsrakningData) {
    setLoading("arsrakning", true);
    try {
      const data = await api.post(`/save_arsrakning.php?pnr=${pnr}&ar=${year}`, arsrakningData);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("arsrakning", false);
    }
  },
};

/**
 * Redogörelse API
 */
export const redogorelseApi = {
  /**
   * Hämtar redogörelse.
   * @param {string} pnr - Personnummer
   * @param {number} year - År
   * @returns {Promise<object>}
   */
  async get(pnr, year) {
    try {
      const data = await api.get("/get_redogorelse.php", { pnr, ar: year });
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },

  /**
   * Sparar redogörelse.
   * @param {string} pnr - Personnummer
   * @param {number} year - År
   * @param {object} redogorelseData - Redogörelsedata
   * @returns {Promise<object>}
   */
  async save(pnr, year, redogorelseData) {
    try {
      const data = await api.post(`/save_redogorelse.php?pnr=${pnr}&ar=${year}`, redogorelseData);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },
};

/**
 * Arvode API
 */
export const arvodeApi = {
  /**
   * Hämtar arvode.
   * @param {string} pnr - Personnummer
   * @param {number} year - År
   * @returns {Promise<object>}
   */
  async get(pnr, year) {
    try {
      const data = await api.get("/get_arvode.php", { pnr, ar: year });
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },

  /**
   * Sparar arvode.
   * @param {string} pnr - Personnummer
   * @param {number} year - År
   * @param {object} arvodeData - Arvodedata
   * @returns {Promise<object>}
   */
  async save(pnr, year, arvodeData) {
    try {
      const data = await api.post(`/save_arvode.php?pnr=${pnr}&ar=${year}`, arvodeData);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },
};

/**
 * God Man Profiler API
 */
export const godManApi = {
  /**
   * Hämtar alla God man-profiler.
   * @returns {Promise<array>}
   */
  async getAll() {
    try {
      const data = await api.get("/get_godman_profiles.php");
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },

  /**
   * Hämtar en God man-profil.
   * @param {number} id - Profil-ID
   * @returns {Promise<object>}
   */
  async getOne(id) {
    try {
      const data = await api.get("/get_godman_profile.php", { id });
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },

  /**
   * Skapar ny God man-profil.
   * @param {object} profileData - Profildata
   * @returns {Promise<object>}
   */
  async create(profileData) {
    try {
      const data = await api.post("/create_godman_profile.php", profileData);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },

  /**
   * Uppdaterar God man-profil.
   * @param {number} id - Profil-ID
   * @param {object} profileData - Profildata
   * @returns {Promise<object>}
   */
  async update(id, profileData) {
    try {
      const data = await api.put(`/update_godman_profile.php?id=${id}`, profileData);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },

  /**
   * Tar bort God man-profil.
   * @param {number} id - Profil-ID
   * @returns {Promise<object>}
   */
  async delete(id) {
    try {
      const data = await api.delete(`/delete_godman_profile.php?id=${id}`);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },
};

/**
 * Överförmyndare API
 */
export const overformyndareApi = {
  /**
   * Hämtar alla överförmyndare.
   * @returns {Promise<array>}
   */
  async getAll() {
    setLoading("overformyndare", true);
    try {
      const data = await api.get("/get_overformyndare.php");
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("overformyndare", false);
    }
  },

  /**
   * Skapar ny överförmyndare.
   * @param {object} ofData - Överförmyndaredata
   * @returns {Promise<object>}
   */
  async create(ofData) {
    setLoading("overformyndare", true);
    try {
      const data = await api.post("/create_overformyndare.php", ofData);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("overformyndare", false);
    }
  },

  /**
   * Uppdaterar överförmyndare.
   * @param {number} id - Överförmyndare-ID
   * @param {object} ofData - Överförmyndaredata
   * @returns {Promise<object>}
   */
  async update(id, ofData) {
    setLoading("overformyndare", true);
    try {
      const data = await api.put(`/update_overformyndare.php?id=${id}`, ofData);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("overformyndare", false);
    }
  },

  /**
   * Tar bort överförmyndare.
   * @param {number} id - Överförmyndare-ID
   * @returns {Promise<object>}
   */
  async delete(id) {
    setLoading("overformyndare", true);
    try {
      const data = await api.delete(`/delete_overformyndare.php?id=${id}`);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("overformyndare", false);
    }
  },
};

/**
 * Dokument API
 */
export const documentApi = {
  /**
   * Hämtar dokument för en huvudman.
   * @param {string} pnr - Personnummer
   * @returns {Promise<array>}
   */
  async getAll(pnr) {
    setLoading("documents", true);
    try {
      const data = await api.get("/get_documents.php", { pnr });
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("documents", false);
    }
  },

  /**
   * Laddar upp dokument.
   * @param {string} pnr - Personnummer
   * @param {File} file - Fil att ladda upp
   * @param {object} metadata - Metadata (titel, typ, etc.)
   * @returns {Promise<object>}
   */
  async upload(pnr, file, metadata = {}) {
    setLoading("documents", true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pnr", pnr);

      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });

      const data = await api.upload("/upload_document.php", formData);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("documents", false);
    }
  },

  /**
   * Tar bort dokument.
   * @param {number} documentId - Dokument-ID
   * @returns {Promise<object>}
   */
  async delete(documentId) {
    setLoading("documents", true);
    try {
      const data = await api.delete(`/delete_document.php?id=${documentId}`);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading("documents", false);
    }
  },

  /**
   * Laddar ner dokument.
   * @param {number} documentId - Dokument-ID
   * @returns {Promise<Blob>}
   */
  async download(documentId) {
    try {
      const blob = await api.get(`/download_document.php?id=${documentId}`);
      return blob;
    } catch (error) {
      setError(error);
      throw error;
    }
  },
};

/**
 * Försörjningsstöd API
 */
export const forsorjningsstodApi = {
  /**
   * Hämtar försörjningsstöd.
   * @param {string} pnr - Personnummer
   * @param {number} year - År
   * @param {number} month - Månad
   * @returns {Promise<object>}
   */
  async get(pnr, year, month) {
    try {
      const data = await api.get("/get_forsorjningsstod.php", { pnr, ar: year, manad: month });
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },

  /**
   * Sparar försörjningsstöd.
   * @param {string} pnr - Personnummer
   * @param {number} year - År
   * @param {number} month - Månad
   * @param {object} data - Försörjningsstöd-data
   * @returns {Promise<object>}
   */
  async save(pnr, year, month, data) {
    try {
      const result = await api.post(`/save_forsorjningsstod.php?pnr=${pnr}&ar=${year}&manad=${month}`, data);
      return result;
    } catch (error) {
      setError(error);
      throw error;
    }
  },
};

/**
 * Dashboard API
 */
export const dashboardApi = {
  /**
   * Hämtar dashboard-statistik.
   * @returns {Promise<object>}
   */
  async getStats() {
    try {
      const data = await api.get("/get_dashboard_stats.php");
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },

  /**
   * Hämtar senaste aktiviteter.
   * @param {number} limit - Antal att hämta
   * @returns {Promise<array>}
   */
  async getRecentActivity(limit = 10) {
    try {
      const data = await api.get("/get_recent_activity.php", { limit });
      return data;
    } catch (error) {
      setError(error);
      throw error;
    }
  },
};

// ============================================================
// BATCH OPERATIONS
// ============================================================

/**
 * Kör flera API-anrop parallellt.
 * @param {array} requests - Array av request-promises
 * @returns {Promise<array>}
 */
export async function batchRequest(requests) {
  try {
    const results = await Promise.allSettled(requests);

    const successful = results.filter(r => r.status === "fulfilled").map(r => r.value);

    const failed = results.filter(r => r.status === "rejected").map(r => r.reason);

    if (failed.length > 0) {
      console.warn(`[API] ${failed.length} requests misslyckades:`, failed);
    }

    return { successful, failed };
  } catch (error) {
    setError(error);
    throw error;
  }
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.api = api;
window.huvudmanApi = huvudmanApi;
window.arsrakningApi = arsrakningApi;
window.redogorelseApi = redogorelseApi;
window.arvodeApi = arvodeApi;
window.godManApi = godManApi;
window.overformyndareApi = overformyndareApi;
window.documentApi = documentApi;
window.forsorjningsstodApi = forsorjningsstodApi;
window.dashboardApi = dashboardApi;
window.batchRequest = batchRequest;

console.log("[API] api.js laddad.");
