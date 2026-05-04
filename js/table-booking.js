const openReservationModalBtn = document.getElementById("open-reservation-modal");
const reservationModal = document.getElementById("reservation-modal");
const reservationModalClose = document.getElementById("reservation-modal-close");
const bookingDateInput = document.getElementById("booking-date");
const bookingTimeInput = document.getElementById("booking-time");
const bookingEndTimeInput = document.getElementById("booking-end-time");
const tablesGrid = document.getElementById("tables-grid");
const bookingForm = document.getElementById("table-booking-form");
const bookingNameInput = document.getElementById("booking-name");
const bookingPhoneInput = document.getElementById("booking-phone");
const bookingStatus = document.getElementById("booking-status");
const bookingTimeLimit = document.getElementById("booking-time-limit");

// Отладочная проверка
if (DEBUG_MODE) {
    debugLog.info("Инициализация table-booking.js");
    debugAssert.notNull(openReservationModalBtn, "Кнопка открытия модального окна не найдена");
    debugAssert.notNull(reservationModal, "Модальное окно бронирования не найдено");
}

const TOTAL_TABLES = 20;

function isValidPhone(phone) {
    return /^\+[1-9][0-9]{10}$/.test(phone);
}

function sanitizePhoneInput(value) {
    let sanitized = value.replace(/[^0-9+]/g, "");

    if (!sanitized.startsWith("+")) {
        sanitized = "+" + sanitized;
    }

    sanitized = "+" + sanitized.slice(1).replace(/\+/g, "");

    if (sanitized.length > 1 && sanitized[1] === "0") {
        sanitized = "+" + sanitized.slice(2);
    }

    if (sanitized.length > 12) {
        sanitized = sanitized.slice(0, 12);
    }

    return sanitized;
}

const YEAR_MIN_DATE = "2026-01-01";
const YEAR_MAX_DATE = "2026-12-31";
let selectedTables = new Set();

function setBookingStatus(message, type) {
    bookingStatus.textContent = message;
    bookingStatus.classList.remove("success", "error");
    if (type) {
        bookingStatus.classList.add(type);
    }
}

function getBookingParams() {
    const date = bookingDateInput.value;
    const startTime = bookingTimeInput.value;
    const endTime = bookingEndTimeInput ? bookingEndTimeInput.value : "";
    return { date, startTime, endTime };
}

function normalizeDateTo2026(dateValue) {
    if (!dateValue) {
        return "";
    }

    const parts = dateValue.split("-");
    if (parts.length !== 3) {
        return "";
    }

    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        return "";
    }

    const safeDate = new Date(2026, month - 1, day);
    const safeMonth = String(safeDate.getMonth() + 1).padStart(2, "0");
    const safeDay = String(safeDate.getDate()).padStart(2, "0");
    return `2026-${safeMonth}-${safeDay}`;
}

function getMinutes(timeValue) {
    const [hours, minutes] = timeValue.split(":").map(Number);
    return (hours * 60) + minutes;
}

function toScheduleMinutes(dateValue, timeValue) {
    const dateObj = new Date(`${dateValue}T00:00:00`);
    const dayOfWeek = dateObj.getDay();
    const minutes = getMinutes(timeValue);

    if (dayOfWeek === 0 || dayOfWeek === 6) {
        if (minutes === 0) {
            return 24 * 60;
        }
    }
    return minutes;
}

function getTimeLimitText(dateValue) {
    if (!dateValue) {
        return "Пн-Пт: до 23:00, Сб-Вс: до 00:00";
    }

    const dayOfWeek = new Date(`${dateValue}T00:00:00`).getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        return "Можно бронировать до 23:00 (пн-пт)";
    }
    return "Можно бронировать до 00:00 (сб-вс)";
}

function isBookingTimeAllowed(dateValue, timeValue) {
    const dateObj = new Date(`${dateValue}T00:00:00`);
    const dayOfWeek = dateObj.getDay(); // 0: Sunday, 6: Saturday
    const minutes = getMinutes(timeValue);
    const openMinutes = 11 * 60;

    // Monday-Friday: 11:00-23:00
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        return minutes >= openMinutes && minutes <= (23 * 60);
    }

    // Saturday-Sunday: 11:00-00:00 (allow 00:00 and 11:00-23:59)
    return minutes === 0 || minutes >= openMinutes;
}

function updateTimeLimitHint() {
    if (!bookingTimeLimit) {
        return;
    }
    bookingTimeLimit.textContent = getTimeLimitText(bookingDateInput.value);
}

function clearSelection() {
    selectedTables = new Set();
}

function buildTableButton(tableNumber, isBusy) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `table-item ${isBusy ? "busy" : "free"}`;
    button.dataset.tableNumber = String(tableNumber);
    button.textContent = `Стол ${tableNumber}`;

    if (!isBusy) {
        button.addEventListener("click", () => {
            if (selectedTables.has(tableNumber)) {
                selectedTables.delete(tableNumber);
                button.classList.remove("selected");
            } else {
                selectedTables.add(tableNumber);
                button.classList.add("selected");
            }

            if (selectedTables.size === 0) {
                setBookingStatus("Выберите один или несколько свободных столиков.", null);
            } else {
                const selectedList = Array.from(selectedTables).sort((a, b) => a - b).join(", ");
                setBookingStatus(`Выбраны столики: ${selectedList}`, null);
            }
        });
    }

    return button;
}

async function loadTables() {
    const { date, startTime, endTime } = getBookingParams();
    clearSelection();

    if (!date || !startTime || !endTime) {
        tablesGrid.innerHTML = "";
        setBookingStatus("Сначала выберите дату и время (с/до).", "error");
        return;
    }

    if (!isBookingTimeAllowed(date, startTime) || !isBookingTimeAllowed(date, endTime)) {
        tablesGrid.innerHTML = "";
        setBookingStatus("Недоступное время: пн-пт 11:00-23:00, сб-вс 11:00-00:00.", "error");
        return;
    }

    if (toScheduleMinutes(date, endTime) <= toScheduleMinutes(date, startTime)) {
        tablesGrid.innerHTML = "";
        setBookingStatus("Время 'до' должно быть позже времени 'с'.", "error");
        return;
    }

    try {
        const response = await fetch(
            `/api/tables?date=${encodeURIComponent(date)}&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`
        );
        if (!response.ok) {
            throw new Error("Failed to load tables");
        }

        const data = await response.json();
        const busyTables = new Set(data.busy_tables || []);

        tablesGrid.innerHTML = "";
        for (let i = 1; i <= TOTAL_TABLES; i += 1) {
            tablesGrid.appendChild(buildTableButton(i, busyTables.has(i)));
        }

        setBookingStatus("Выберите один или несколько свободных столиков.", null);
    } catch (_error) {
        setBookingStatus("Не удалось загрузить план столиков.", "error");
    }
}

function openReservationModal() {
    reservationModal.classList.add("active");
    document.body.style.overflow = "hidden";
    loadTables();
}

function closeReservationModal() {
    reservationModal.classList.remove("active");
    document.body.style.overflow = "";
    setBookingStatus("", null);
}

if (openReservationModalBtn && reservationModal) {
    openReservationModalBtn.addEventListener("click", openReservationModal);
}

if (reservationModalClose) {
    reservationModalClose.addEventListener("click", closeReservationModal);
}

if (reservationModal) {
    reservationModal.addEventListener("click", (event) => {
        if (event.target === reservationModal) {
            closeReservationModal();
        }
    });
}

if (bookingDateInput) {
    bookingDateInput.min = YEAR_MIN_DATE;
    bookingDateInput.max = YEAR_MAX_DATE;
    if (!bookingDateInput.value) {
        bookingDateInput.value = "2026-01-01";
    }
    updateTimeLimitHint();
    bookingDateInput.addEventListener("input", () => {
        const normalized = normalizeDateTo2026(bookingDateInput.value);
        if (normalized) {
            bookingDateInput.value = normalized;
        }
        updateTimeLimitHint();
    });
    bookingDateInput.addEventListener("change", () => {
        updateTimeLimitHint();
        loadTables();
    });
}

if (bookingTimeInput) {
    bookingTimeInput.addEventListener("change", loadTables);
}

if (bookingEndTimeInput) {
    bookingEndTimeInput.addEventListener("change", loadTables);
}

if (bookingPhoneInput) {
    bookingPhoneInput.addEventListener("input", function (event) {
        const oldValue = this.value;
        const sanitized = sanitizePhoneInput(oldValue);

        if (oldValue !== sanitized) {
            this.value = sanitized;
        }
    });

    bookingPhoneInput.addEventListener("paste", function (event) {
        event.preventDefault();
        const pastedText = (event.clipboardData || window.clipboardData).getData("text");
        const sanitized = sanitizePhoneInput(pastedText);

        const currentValue = this.value;
        const cursorPos = this.selectionStart;
        const selectionEnd = this.selectionEnd;

        const newValue = currentValue.slice(0, cursorPos) + sanitized + currentValue.slice(selectionEnd);
        this.value = sanitizePhoneInput(newValue);
    });
}

if (bookingForm) {
    bookingForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const { date, startTime, endTime } = getBookingParams();
        const name = bookingNameInput.value.trim();
        const phone = bookingPhoneInput.value.trim();

        if (!date || !startTime || !endTime || !name || !phone || selectedTables.size === 0) {
            setBookingStatus("Укажите дату, время (с/до), имя, телефон и выберите хотя бы один столик.", "error");
            return;
        }

        if (!isValidPhone(phone)) {
            setBookingStatus("Телефон должен быть в формате +71234567890 (11 цифр, начинается с +)", "error");
            return;
        }

        if (!isBookingTimeAllowed(date, startTime) || !isBookingTimeAllowed(date, endTime)) {
            setBookingStatus("Время не подходит: пн-пт 11:00-23:00, сб-вс 11:00-00:00.", "error");
            return;
        }

        if (toScheduleMinutes(date, endTime) <= toScheduleMinutes(date, startTime)) {
            setBookingStatus("Время 'до' должно быть позже времени 'с'.", "error");
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;
            const selectedList = Array.from(selectedTables);

            for (const tableNumber of selectedList) {
                const response = await fetch("/api/reservations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        table_number: tableNumber,
                        date,
                        start_time: startTime,
                        end_time: endTime,
                        name,
                        phone
                    })
                });

                if (response.ok) {
                    successCount += 1;
                } else {
                    errorCount += 1;
                }
            }

            if (successCount > 0) {
                bookingNameInput.value = "";
                bookingPhoneInput.value = "";
                setBookingStatus(`Успешно забронировано: ${successCount}. Не удалось: ${errorCount}.`, "success");
            } else {
                setBookingStatus("Не удалось забронировать выбранные столики.", "error");
            }

            clearSelection();
            loadTables();
        } catch (error) {
            setBookingStatus(error.message || "Ошибка при бронировании.", "error");
        }
    });
}

function runBookingTests() {
    console.log("\n=== МОДУЛЬНЫЕ ТЕСТЫ: Бронирование ===");
    
    console.log("\nТест 1: Валидация телефона");
    const phoneTests = [
        { input: "+71234567890", expected: true, desc: "Корректный номер" },
        { input: "71234567890", expected: false, desc: "Без +" },
        { input: "+0123456789", expected: false, desc: "Ноль после +" },
        { input: "abc", expected: false, desc: "Буквы" },
    ];
    
    let passed = 0;
    phoneTests.forEach((test, i) => {
        const result = isValidPhone(test.input);
        const status = result === test.expected ? "✅ PASS" : "❌ FAIL";
        if (result === test.expected) passed++;
        console.log(`  ${i + 1}. ${status} - ${test.desc}`);
    });
    console.log(`  Результат: ${passed}/${phoneTests.length}`);
    
    console.log("\nТест 2: Санитизация телефона");
    const sanitizeTests = [
        { input: "abc", expected: "+", desc: "Буквы удаляются" },
        { input: "+0123", expected: "+123", desc: "Ноль удаляется" },
        { input: "7123", expected: "+7123", desc: "+ добавляется" },
    ];
    
    passed = 0;
    sanitizeTests.forEach((test, i) => {
        const result = sanitizePhoneInput(test.input);
        const status = result === test.expected ? "✅ PASS" : "❌ FAIL";
        if (result === test.expected) passed++;
        console.log(`  ${i + 1}. ${status} - ${test.desc}`);
    });
    console.log(`  Результат: ${passed}/${sanitizeTests.length}`);
    
    console.log("\nТест 3: Проверка времени");
    const timeTests = [
        { date: "2026-05-11", time: "18:00", expected: true, desc: "Пн-Пт 18:00 - валидно" },
        { date: "2026-05-11", time: "10:00", expected: false, desc: "Пн-Пт 10:00 - рано" },
        { date: "2026-05-16", time: "23:00", expected: true, desc: "Сб-Вс 23:00 - валидно" },
    ];
    
    passed = 0;
    timeTests.forEach((test, i) => {
        const result = isBookingTimeAllowed(test.date, test.time);
        const status = result === test.expected ? "✅ PASS" : "❌ FAIL";
        if (result === test.expected) passed++;
        console.log(`  ${i + 1}. ${status} - ${test.desc}`);
    });
    console.log(`  Результат: ${passed}/${timeTests.length}`);
    console.log("====================================\n");
}

// Автоматический запуск тестов в режиме DEBUG
if (typeof DEBUG_MODE !== "undefined" && DEBUG_MODE) {
    runBookingTests();
}
