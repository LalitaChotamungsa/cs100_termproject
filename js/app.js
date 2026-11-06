
const STORAGE_KEY = "powerUpPortfolios";

function getPortfolios() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
        console.error("Could not read saved portfolios:", error);
        return [];
    }
}

function savePortfolios(portfolios) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolios));
}

function makeId(prefix) {
    if (window.crypto && crypto.randomUUID) {
        return prefix + "-" + crypto.randomUUID();
    }
    return prefix + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = message;
    element.className = isError ? "form-message text-danger mt-2" : "form-message text-success mt-2";
}

function validWebUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

/* ---------- FORM PAGE ---------- */
function setupFormPage() {
    const portfolioForm = document.getElementById("portfolio-form");
    const itemForm = document.getElementById("item-form");
    const portfolioSelect = document.getElementById("portfolio-select");
    const itemFields = document.getElementById("item-fields");

    if (!portfolioForm || !itemForm || !portfolioSelect || !itemFields) return;

    function refreshPortfolioSelect(selectedId = "") {
        const portfolios = getPortfolios();
        portfolioSelect.replaceChildren();

        if (portfolios.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "-- Create a portfolio first --";
            portfolioSelect.append(option);
            itemFields.disabled = true;
            return;
        }

        const firstOption = document.createElement("option");
        firstOption.value = "";
        firstOption.textContent = "-- Select a portfolio --";
        portfolioSelect.append(firstOption);

        portfolios.forEach((portfolio) => {
            const option = document.createElement("option");
            option.value = portfolio.id;
            option.textContent = portfolio.displayName;
            portfolioSelect.append(option);
        });

        if (selectedId && portfolios.some((p) => p.id === selectedId)) {
            portfolioSelect.value = selectedId;
        }
        itemFields.disabled = !portfolioSelect.value;
    }

    portfolioSelect.addEventListener("change", () => {
        itemFields.disabled = !portfolioSelect.value;
        showMessage("item-message", "");
    });

    portfolioForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!portfolioForm.checkValidity()) {
            portfolioForm.classList.add("was-validated");
            showMessage("portfolio-message", "Please complete all required fields.", true);
            return;
        }

        const data = new FormData(portfolioForm);
        const portfolio = {
            id: makeId("portfolio"),
            displayName: data.get("displayName").trim(),
            enjoy: data.get("enjoy").trim(),
            tried: data.get("tried").trim(),
            curious: data.get("curious").trim(),
            items: []
        };

        const portfolios = getPortfolios();
        portfolios.push(portfolio);

        try {
            savePortfolios(portfolios);
            portfolioForm.reset();
            portfolioForm.classList.remove("was-validated");
            refreshPortfolioSelect(portfolio.id);
            showMessage("portfolio-message", "Portfolio created and saved!");
        } catch (error) {
            console.error(error);
            showMessage("portfolio-message", "Could not save. Please check browser storage.", true);
        }
    });

    itemForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!portfolioSelect.value) {
            showMessage("item-message", "Please create or select a Portfolio first.", true);
            return;
        }

        const skillInputs = itemForm.querySelectorAll('input[name="skills"]:checked');
        const skills = Array.from(skillInputs).map((input) => input.value);
        const skillsError = document.getElementById("skills-error");
        skillsError.textContent = "";

        if (!itemForm.checkValidity()) {
            itemForm.classList.add("was-validated");
            showMessage("item-message", "Please complete all required fields.", true);
            return;
        }

        if (skills.length === 0) {
            skillsError.textContent = "Please select at least one skill.";
            showMessage("item-message", "Please select at least one skill.", true);
            return;
        }

        const data = new FormData(itemForm);
        const evidenceUrl = data.get("evidence").trim();

        if (!validWebUrl(evidenceUrl)) {
            document.getElementById("evidence").classList.add("is-invalid");
            showMessage("item-message", "Evidence must be a valid http:// or https:// URL.", true);
            return;
        }
        document.getElementById("evidence").classList.remove("is-invalid");

        const item = {
            id: makeId("item"),
            title: data.get("title").trim(),
            type: data.get("type"),
            date: data.get("date"),
            role: data.get("role").trim(),
            description: data.get("description").trim(),
            skills: skills,
            reflection: {
                whatIDid: data.get("whatIDid").trim(),
                whatILearned: data.get("whatILearned").trim(),
                challenge: data.get("challenge").trim(),
                nextStep: data.get("nextStep").trim()
            },
            evidence: [evidenceUrl]
        };

        const portfolios = getPortfolios();
        const selectedPortfolio = portfolios.find((portfolio) => portfolio.id === portfolioSelect.value);

        if (!selectedPortfolio) {
            showMessage("item-message", "Selected Portfolio was not found. Please refresh the page.", true);
            return;
        }

        selectedPortfolio.items.push(item);

        try {
            savePortfolios(portfolios);
            itemForm.reset();
            itemForm.classList.remove("was-validated");
            skillsError.textContent = "";
            showMessage("item-message", "Portfolio Item saved successfully!");
            refreshPortfolioSelect(selectedPortfolio.id);
        } catch (error) {
            console.error(error);
            showMessage("item-message", "Could not save. Please check browser storage.", true);
        }
    });

    refreshPortfolioSelect();
}

/*PROFILE PAGE  */
function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text || "";
    return element;
}

function renderProfilePage() {
    const list = document.getElementById("portfolio-list");
    if (!list) return;

    const portfolios = getPortfolios();
    list.replaceChildren();

    if (portfolios.length === 0) {
    const empty = createTextElement("div", "empty-state", "No portfolios yet. Create your first portfolio to get started.");
    list.append(empty);
    return;
}

    portfolios.forEach((portfolio) => {
        const card = createTextElement("section", "profile-card mb-4");
        const header = createTextElement("div", "profile-card-header");
        const name = createTextElement("h2", "h4 fw-bold mb-1", portfolio.displayName);
        const count = createTextElement("span", "badge text-bg-light", `${portfolio.items.length} item(s)`);
        header.append(name, count);
        card.append(header);

        const intro = createTextElement("div", "profile-intro");
        const introRows = [
            ["What I Enjoy", portfolio.enjoy],
            ["What I've Tried", portfolio.tried],
            ["What I'm Curious About", portfolio.curious]
        ];

        introRows.forEach(([label, value]) => {
            const block = createTextElement("div", "mb-2");
            block.append(createTextElement("h3", "h6 fw-bold mb-1", label));
            block.append(createTextElement("p", "mb-0 text-secondary", value));
            intro.append(block);
        });
        card.append(intro);

        const itemsHeading = createTextElement("h3", "h5 fw-bold mt-4 mb-3", "Portfolio Items");
        card.append(itemsHeading);

        if (!portfolio.items || portfolio.items.length === 0) {
            card.append(createTextElement("p", "text-secondary", "No items have been added to this portfolio."));
        } else {
            portfolio.items.forEach((item) => {
                const itemCard = createTextElement("article", "item-card mb-3");
                const top = createTextElement("div", "d-flex flex-wrap justify-content-between gap-2");
                top.append(createTextElement("h4", "h6 fw-bold mb-1", item.title));
                top.append(createTextElement("span", "badge text-bg-light", item.type));
                itemCard.append(top);
                itemCard.append(createTextElement("p", "small text-secondary mb-2", `${item.date} · ${item.role}`));
                itemCard.append(createTextElement("p", "mb-3", item.description));

                const skills = createTextElement("div", "d-flex flex-wrap gap-2 mb-3");
                (item.skills || []).forEach((skill) => {
                    skills.append(createTextElement("span", "badge skill-badge", skill));
                });
                itemCard.append(skills);

                const reflection = item.reflection || {};
                const reflectionBox = createTextElement("div", "reflection-box");
                [
                    ["What I did", reflection.whatIDid],
                    ["What I learned", reflection.whatILearned],
                    ["Challenge", reflection.challenge],
                    ["Next step", reflection.nextStep]
                ].forEach(([label, value]) => {
                    const p = createTextElement("p", "mb-2");
                    const strong = createTextElement("strong", "me-1", `${label}:`);
                    p.append(strong, document.createTextNode(value || ""));
                    reflectionBox.append(p);
                });
                itemCard.append(reflectionBox);

                const evidenceTitle = createTextElement("p", "fw-bold small mt-3 mb-1", "Evidence");
                itemCard.append(evidenceTitle);
                (item.evidence || []).forEach((url) => {
                    if (validWebUrl(url)) {
                        const link = createTextElement("a", "evidence-link d-block", url);
                        link.href = url;
                        link.target = "_blank";
                        link.rel = "noopener noreferrer";
                        itemCard.append(link);
                    }
                });

                card.append(itemCard);
            });
        }

        list.append(card);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupFormPage();
    renderProfilePage();
});
