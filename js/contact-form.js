const feedbackForm = document.querySelector(".feedback-form");

if (feedbackForm) {
    feedbackForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(feedbackForm);
        const payload = {
            name: formData.get("name")?.toString().trim() || "",
            email: formData.get("email")?.toString().trim() || "",
            message: formData.get("message")?.toString().trim() || ""
        };

        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Request failed");
            }

            feedbackForm.reset();
            alert("Спасибо! Сообщение отправлено.");
        } catch (_error) {
            alert("Не удалось отправить сообщение. Попробуйте позже.");
        }
    });
}
