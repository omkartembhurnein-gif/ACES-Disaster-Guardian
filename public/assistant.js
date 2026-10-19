const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const sendButton = document.getElementById("sendButton");

// Predefined answers come from assistant-faq.js (FAQ). Suggested questions
// are answered instantly without calling the AI service.

// Match predefined questions regardless of case, spacing or the final "?".
function normalizeQuestion(text) {
    return text.toLowerCase().replace(/s+/g, " ").replace(/[?.!s]+$/, "").trim();
}

const predefinedLookup = new Map();
for (const group of FAQ) {
    for (const item of group.items) {
        predefinedLookup.set(normalizeQuestion(item.q), item.a);
        predefinedLookup.set(normalizeQuestion(item.label), item.a);
    }
}

function addMessage(sender, text) {
    const message = document.createElement("div");
    message.className = `chat-message ${sender}-message`;

    const title = document.createElement("strong");
    title.textContent = sender === "user" ? "You" : "Disaster Assistant";

    const paragraph = document.createElement("p");
    paragraph.className = "chat-text";
    paragraph.textContent = text;

    message.append(title, paragraph);
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return paragraph;
}

async function sendMessage(question) {
    addMessage("user", question);

    const answerElement = addMessage("assistant", "Thinking...");

    const predefined = predefinedLookup.get(normalizeQuestion(question));
    if (predefined) {
        answerElement.textContent = predefined;
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return;
    }

    sendButton.disabled = true;
    chatInput.disabled = true;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: question })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.error || `Request failed (${response.status})`
            );
        }

        if (data.error) {
            throw new Error(data.error);
        }

        const answer =
            data.reply ??
            data.answer ??
            data.message ??
            data.response ??
            data.choices?.[0]?.message?.content;

        if (typeof answer !== "string" || !answer.trim()) {
            throw new Error(
                "No answer was returned. Check the server's /api/chat response."
            );
        }

        answerElement.textContent = answer;
    } catch (error) {
        console.error("Assistant error:", error);
        answerElement.textContent = `Unable to get a response: ${error.message}`;
    } finally {
        sendButton.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

chatForm.addEventListener("submit", event => {
    event.preventDefault();

    const question = chatInput.value.trim();

    if (!question || sendButton.disabled) return;

    chatInput.value = "";
    sendMessage(question);
});

// Enter sends the message; Shift+Enter adds a new line.
chatInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});

// ---------- Suggested questions list ----------

const faqList = document.getElementById("faqList");
const faqSearch = document.getElementById("faqSearch");
const faqCategory = document.getElementById("faqCategory");

function renderFaq() {
    const term = normalizeQuestion(faqSearch.value);
    const topic = faqCategory.value;
    let shown = 0;

    const sections = FAQ
        .filter(group => !topic || group.category === topic)
        .map(group => {
            const items = group.items.filter(item =>
                !term ||
                normalizeQuestion(item.q).includes(term) ||
                normalizeQuestion(item.label).includes(term) ||
                normalizeQuestion(group.category).includes(term)
            );
            if (!items.length) return null;
            shown += items.length;

            const section = document.createElement("section");
            section.className = "faq-group";

            const heading = document.createElement("h3");
            heading.className = "faq-heading";
            heading.textContent = group.category;
            section.appendChild(heading);

            for (const item of items) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "suggestion-button";
                button.dataset.question = item.q;
                button.textContent = item.label;
                section.appendChild(button);
            }
            return section;
        })
        .filter(Boolean);

    if (!sections.length) {
        const empty = document.createElement("p");
        empty.className = "faq-empty";
        empty.textContent = "No suggested questions match. Type your question in the chat instead.";
        faqList.replaceChildren(empty);
    } else {
        faqList.replaceChildren(...sections);
    }

    const total = FAQ.reduce((sum, group) => sum + group.items.length, 0);
    document.getElementById("faqCount").textContent =
        shown === total ? `(${total})` : `(${shown} of ${total})`;
}

faqCategory.append(
    ...FAQ.map(group => {
        const option = document.createElement("option");
        option.value = group.category;
        option.textContent = `${group.category} (${group.items.length})`;
        return option;
    })
);

faqSearch.addEventListener("input", renderFaq);
faqCategory.addEventListener("change", renderFaq);

faqList.addEventListener("click", event => {
    const button = event.target.closest(".suggestion-button");
    if (!button || sendButton.disabled) return;

    chatInput.value = button.dataset.question || "";
    chatInput.focus();
});

renderFaq();
