/**
 * Конфигурация режимов сборки и отладки
 * 
 * Режимы:
 * - DEBUG: включает дополнительные проверки, логирование, валидацию
 * - PRODUCTION: отключает отладочный вывод, оптимизирует производительность
 * 
 * Использование:
 * - В браузере: DEBUG_MODE=true в URL или localStorage
 * - В Node.js: NODE_ENV=development/production
 */

const DEBUG_MODE = (() => {
    // Проверка через параметры окружения Node.js
    if (typeof process !== "undefined" && process.env) {
        return process.env.NODE_ENV === "development";
    }

    // Проверка через URL параметры
    if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("debug") === "true") {
            return true;
        }

        // Проверка через localStorage
        try {
            const saved = localStorage.getItem("debug_mode");
            if (saved === "true") {
                return true;
            }
        } catch (error) {
            // localStorage недоступен
        }
    }

    return false;
})();

// Отладочный логгер
const debugLog = {
    info: (...args) => {
        if (DEBUG_MODE) {
            console.log("[DEBUG]", ...args);
        }
    },
    warn: (...args) => {
        if (DEBUG_MODE) {
            console.warn("[DEBUG WARNING]", ...args);
        }
    },
    error: (...args) => {
        if (DEBUG_MODE) {
            console.error("[DEBUG ERROR]", ...args);
        }
    },
    time: (label) => {
        if (DEBUG_MODE) {
            console.time(`[DEBUG] ${label}`);
        }
    },
    timeEnd: (label) => {
        if (DEBUG_MODE) {
            console.timeEnd(`[DEBUG] ${label}`);
        }
    }
};

// Валидация в режиме отладки
const debugAssert = {
    notNull: (value, message) => {
        if (DEBUG_MODE && value === null || value === undefined) {
            throw new Error(`[ASSERT] ${message}`);
        }
    },
    isTrue: (condition, message) => {
        if (DEBUG_MODE && !condition) {
            throw new Error(`[ASSERT] ${message}`);
        }
    },
    typeOf: (value, expectedType, message) => {
        if (DEBUG_MODE && typeof value !== expectedType) {
            throw new Error(`[ASSERT] ${message}: expected ${expectedType}, got ${typeof value}`);
        }
    }
};

if (DEBUG_MODE) {
    console.warn("=== DEBUG MODE ENABLED ===");
}
