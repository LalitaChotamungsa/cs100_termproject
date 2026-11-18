
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

// =============================================================================== //


/* ==================== PERSONALITY QUIZ ==================== */
(() => {
    const quizPageIds = ["home", "quiz", "loading", "result"];
    const questions = [
        {
            id: "q1",
            text: "วันหยุดที่ไม่มีนัด คุณมักจะเลือกทำอะไร?",
            options: [
                { text: "อยู่บ้านเงียบ ๆ ใช้เวลากับตัวเอง", type: "timid" },
                { text: "หมกมุ่นกับเกม ซีรีส์ หรือเรื่องที่กำลังอิน", type: "otaku" },
                { text: "หาอะไรทำให้วันนั้นมีสีสัน อาจแกล้งเพื่อนเล่นด้วย", type: "mischief" },
                { text: "วาดรูป ถ่ายภาพ ฟังเพลง หรือหาแรงบันดาลใจ", type: "art" }
            ]
        },
        {
            id: "q2",
            text: "ถ้าต้องเข้ากลุ่มกับคนที่ไม่สนิท คุณจะ...",
            options: [
                { text: "ฟังก่อน ขอทำความคุ้นเคยสักพัก", type: "timid" },
                { text: "เริ่มคุยจากเรื่องที่ตัวเองสนใจ", type: "otaku" },
                { text: "ชวนคุย แซวเล่นให้บรรยากาศไม่เงียบ", type: "mischief" },
                { text: "สังเกตคนและบรรยากาศก่อนค่อยเปิดบทสนทนา", type: "art" }
            ]
        },
        {
            id: "q3",
            text: "เวลาได้รับโจทย์ยาก ๆ คุณมักจะ...",
            options: [
                { text: "ค่อย ๆ คิดเงียบ ๆ ในแบบของตัวเอง", type: "timid" },
                { text: "ค้นข้อมูลให้ลึกจนเข้าใจทุกมุม", type: "otaku" },
                { text: "เอาจริงเอาจังให้เสร็จ แต่ระหว่างทางก็มีมุกแทรก", type: "mischief" },
                { text: "ลองคิดวิธีแปลกใหม่ที่ไม่เหมือนใคร", type: "art" }
            ]
        },
        {
            id: "q4",
            text: "เพื่อนมักจะจำคุณได้จากอะไร?",
            options: [
                { text: "เป็นคนเงียบ ๆ แต่คอยใส่ใจรายละเอียด", type: "timid" },
                { text: "รู้ลึกเรื่องที่ตัวเองชอบแบบไม่น่าเชื่อ", type: "otaku" },
                { text: "ดูจริงจัง แต่ชอบปล่อยมุกหรือแกล้งคนสนิท", type: "mischief" },
                { text: "มีสไตล์หรือมุมมองที่เป็นตัวเองชัดเจน", type: "art" }
            ]
        },
        {
            id: "q5",
            text: "ถ้าได้เลือกทำโปรเจกต์หนึ่งอย่าง คุณอยากทำอะไร?",
            options: [
                { text: "งานที่ได้ทำคนเดียวและมีเวลาคิด", type: "timid" },
                { text: "โปรเจกต์ที่ได้ศึกษาเรื่องที่ชอบอย่างจริงจัง", type: "otaku" },
                { text: "งานที่ได้วางแผน ลงมือจริง และคุมให้งานสำเร็จ", type: "mischief" },
                { text: "งานสร้างสรรค์ที่ได้ทดลองสี รูปทรง หรือไอเดียใหม่", type: "art" }
            ]
        },
        {
            id: "q6",
            text: "ถ้ามีคนเข้าใจคุณผิด คุณจะทำอย่างไร?",
            options: [
                { text: "อาจไม่พูดอะไร ถ้าไม่จำเป็นจริง ๆ", type: "timid" },
                { text: "อธิบายด้วยเหตุผลและข้อมูลที่มี", type: "otaku" },
                { text: "พูดตรง ๆ ให้เข้าใจ แต่ยังแซวได้เหมือนเดิม", type: "mischief" },
                { text: "เลือกอธิบายในแบบของตัวเอง อาจใช้ภาพหรือผลงานแทนคำพูด", type: "art" }
            ]
        },
        {
            id: "q7",
            text: "ของแบบไหนที่คุณมักจะเก็บไว้หรือสนใจเป็นพิเศษ?",
            options: [
                { text: "ของชิ้นเล็ก ๆ ที่มีความทรงจำส่วนตัว", type: "timid" },
                { text: "ของสะสมจากเกม หนัง การ์ตูน หรือสิ่งที่ชอบ", type: "otaku" },
                { text: "ของที่มีประโยชน์ ใช้งานได้จริง", type: "mischief" },
                { text: "สมุดสเก็ตช์ กล้อง โปสเตอร์ หรือของดีไซน์สวย", type: "art" }
            ]
        },
        {
            id: "q8",
            text: "ประโยคไหนใกล้เคียงกับตัวคุณมากที่สุด?",
            options: [
                { text: "ไม่ต้องเด่นก็ได้ แค่ได้เป็นตัวเองก็พอ", type: "timid" },
                { text: "ถ้าชอบอะไรแล้ว จะรู้ให้สุดไปเลย", type: "otaku" },
                { text: "งานต้องเป๊ะ แต่ชีวิตอย่าเครียดเกินไป", type: "mischief" },
                { text: "ขอทำอะไรในแบบที่มีลายเซ็นของตัวเอง", type: "art" }
            ]
        }
    ];

    const types = {
        timid: {
            name: "เด็กติ๋ม",
            english: "THE QUIET ONE",
            emoji: "🤫",
            headline: "เงียบหน่อย แต่มีอะไรอยู่ข้างในเยอะ",
            description: "คุณเป็นคนที่สบายใจกับพื้นที่ส่วนตัว ชอบสังเกตและคิดในแบบของตัวเอง อาจไม่ใช่คนที่พูดเยอะที่สุด แต่มีรายละเอียดและความรู้สึกมากกว่าที่คนอื่นเห็น"
        },
        otaku: {
            name: "โอตาคุ",
            english: "THE DEEP DIVER",
            emoji: "🎮",
            headline: "ถ้าอินแล้ว ก็ไปให้สุด",
            description: "คุณชอบลงลึกในสิ่งที่ตัวเองสนใจ ไม่ว่าจะเป็นเกม หนัง เพลง เทคโนโลยี หรือเรื่องเฉพาะทาง ยิ่งสนใจก็ยิ่งอยากรู้รายละเอียด และพร้อมใช้เวลากับสิ่งนั้นได้นานกว่าคนทั่วไป"
        },
        mischief: {
            name: "จริงจังจอมแก่น",
            english: "THE PLAYFUL PLANNER",
            emoji: "🧩",
            headline: "เอาจริงเอาจัง แต่ก็ยังมีมุมกวน",
            description: "คุณเป็นคนมีเป้าหมาย ชอบให้งานออกมาดีและพร้อมลงมือทำจริงจัง แต่ก็มีมุมขี้เล่น ชอบแซวหรือสร้างสีสันให้คนรอบตัว ไม่ปล่อยให้ชีวิตเคร่งเครียดเกินไป"
        },
        art: {
            name: "เด็กอาร์ต",
            english: "THE CREATIVE SOUL",
            emoji: "🎨",
            headline: "มองโลกในมุมที่ไม่เหมือนใคร",
            description: "คุณชอบสังเกตและมองเห็นไอเดียจากเรื่องธรรมดา มีรสนิยมและวิธีแสดงตัวตนของตัวเอง ชอบทดลองสิ่งใหม่ ๆ และให้ความสำคัญกับความรู้สึกหรือความหมายที่ซ่อนอยู่ในสิ่งต่าง ๆ"
        }
    };

    let questionOrder = [];
    let currentQuestion = 0;
    let answers = {};
    let resultType = "";

    const getElement = (id) => document.getElementById(id);

    // สุ่มลำดับข้อมูลโดยไม่เปลี่ยน Array ต้นฉบับ
    function shuffleItems(items) {
        const shuffled = [...items];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const randomIndex = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
        }

        return shuffled;
    }

    function showQuizPage(pageId) {
        quizPageIds.forEach((id) => {
            const page = getElement(id);
            if (page) {
                page.classList.toggle("active", id === pageId);
            }
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // เริ่มแบบทดสอบและสุ่มทั้งคำถามกับตัวเลือก
    function startQuiz() {
        questionOrder = shuffleItems(questions).map((question) => ({
            ...question,
            options: shuffleItems(question.options)
        }));

        currentQuestion = 0;
        answers = {};
        resultType = "";

        showQuizPage("quiz");
        renderQuestion();
    }

    function renderQuestion() {
        const question = questionOrder[currentQuestion];
        if (!question) return;

        const number = getElement("questionNumber");
        const progress = getElement("progressBar");
        const questionText = getElement("questionText");
        const optionsBox = getElement("options");
        const backButton = getElement("backBtn");
        const nextButton = getElement("nextBtn");

        if (number) {
            number.textContent = `QUESTION ${currentQuestion + 1} / ${questionOrder.length}`;
        }

        if (progress) {
            progress.style.width = `${((currentQuestion + 1) / questionOrder.length) * 100}%`;
        }

        if (questionText) {
            questionText.textContent = question.text;
        }

        if (!optionsBox) return;

        optionsBox.replaceChildren();

        question.options.forEach((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "quiz-option";
            button.textContent = option.text;

            button.classList.toggle(
                "selected",
                answers[question.id] === option.type
            );

            button.addEventListener("click", () => {
                answers[question.id] = option.type;

                optionsBox.querySelectorAll(".quiz-option").forEach((item) => {
                    item.classList.remove("selected");
                });

                button.classList.add("selected");

                if (nextButton) {
                    nextButton.disabled = false;
                }
            });

            optionsBox.append(button);
        });

        if (backButton) {
            backButton.hidden = currentQuestion === 0;
        }

        if (nextButton) {
            nextButton.disabled = !answers[question.id];

            nextButton.textContent =
                currentQuestion === questionOrder.length - 1
                    ? "ดูผลลัพธ์ →"
                    : "ถัดไป →";
        }
    }

    // คำนวณคะแนนตามประเภทของคำตอบ ไม่ใช่ตามตำแหน่งตัวเลือก
    function calculateResult() {
        const scores = {
            timid: 0,
            otaku: 0,
            mischief: 0,
            art: 0
        };

        Object.values(answers).forEach((type) => {
            if (Object.prototype.hasOwnProperty.call(scores, type)) {
                scores[type]++;
            }
        });

        const highestScore = Math.max(...Object.values(scores));

        const winners = Object.keys(scores).filter((type) => {
            return scores[type] === highestScore;
        });

        // หากคะแนนเสมอกัน จะสุ่มผลจากประเภทที่คะแนนสูงสุด
        resultType = winners[Math.floor(Math.random() * winners.length)];

        showQuizPage("loading");
        window.setTimeout(showResult, 1000);
    }

    function showResult() {
        const result = types[resultType];
        if (!result) return;

        if (getElement("resultEmoji")) {
            getElement("resultEmoji").textContent = result.emoji;
        }

        if (getElement("resultTitle")) {
            getElement("resultTitle").textContent = result.name;
        }

        if (getElement("resultEnglish")) {
            getElement("resultEnglish").textContent = result.english;
        }

        if (getElement("resultHeadline")) {
            getElement("resultHeadline").textContent = result.headline;
        }

        if (getElement("resultDescription")) {
            getElement("resultDescription").textContent = result.description;
        }

        showQuizPage("result");
    }

    // สร้างภาพผลลัพธ์สำหรับดาวน์โหลดและแชร์
    function createResultCanvas() {
        const result = types[resultType];

        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;

        const context = canvas.getContext("2d");

        context.fillStyle = "#eaf0f8";
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = "#1a2637";
        context.fillRect(55, 55, 970, 1810);

        context.fillStyle = "#ffffff";
        context.fillRect(85, 85, 910, 1750);

        context.fillStyle = "#31487a";
        context.font = "bold 34px sans-serif";
        context.textAlign = "center";
        context.fillText("PERSONALITY QUIZ", 540, 230);

        context.fillStyle = "#26384d";
        context.font = "bold 150px sans-serif";
        context.fillText(result.emoji, 540, 600);

        context.fillStyle = "#1a2637";
        context.font = "bold 100px sans-serif";
        context.fillText(result.name, 540, 830, 820);

        context.fillStyle = "#5274a8";
        context.font = "bold 42px sans-serif";
        context.fillText(result.english, 540, 920);

        context.fillStyle = "#26384d";
        context.font = "bold 48px sans-serif";
        context.fillText(result.headline, 540, 1120, 820);

        context.fillStyle = "#5d6878";
        context.font = "36px sans-serif";

        const words = result.description.split("");
        let line = "";
        let y = 1230;

        words.forEach((character) => {
            const testLine = line + character;

            if (context.measureText(testLine).width > 790 && line) {
                context.fillText(line, 540, y);
                line = character;
                y += 58;
            } else {
                line = testLine;
            }
        });

        if (line) {
            context.fillText(line, 540, y);
        }

        context.fillStyle = "#31487a";
        context.font = "bold 32px sans-serif";
        context.fillText("WHAT TYPE ARE YOU?", 540, 1690);

        context.fillStyle = "#8998ad";
        context.font = "26px sans-serif";
        context.fillText("POWER UP! · PERSONALITY QUIZ", 540, 1750);

        return canvas;
    }

    function downloadResult() {
        if (!resultType) return;

        const canvas = createResultCanvas();
        const link = document.createElement("a");

        link.download = `personality-${resultType}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }

    async function shareResult() {
        if (!resultType) return;

        const canvas = createResultCanvas();

        if (navigator.share && navigator.canShare) {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    downloadResult();
                    return;
                }

                const file = new File(
                    [blob],
                    `personality-${resultType}.png`,
                    { type: "image/png" }
                );

                try {
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: "My Personality Type",
                            files: [file]
                        });
                    } else {
                        downloadResult();
                    }
                } catch (error) {
                    if (error.name !== "AbortError") {
                        downloadResult();
                    }
                }
            }, "image/png");
        } else {
            downloadResult();
        }
    }

    function restartQuiz() {
        currentQuestion = 0;
        answers = {};
        resultType = "";
        questionOrder = [];

        showQuizPage("home");
    }

    function setupQuiz() {
    console.log("Quiz setup started");

    if (!getElement("home") || !getElement("quiz") || !getElement("questionText")) {
        console.error("ไม่พบ HTML element ของ Quiz");
        return;
    }

    const startButton = getElement("startBtn");

    if (!startButton) {
        console.error("ไม่พบปุ่ม startBtn");
        return;
    }

    startButton.addEventListener("click", () => {
        console.log("Start Quiz clicked!");
        startQuiz();
    });

    getElement("nextBtn")?.addEventListener("click", () => {
    console.log("Next button clicked");
    const question = questionOrder[currentQuestion];
    if (!question || !answers[question.id]) return;
    if (currentQuestion < questionOrder.length - 1) {
        currentQuestion++;
        renderQuestion();
    } else {
        calculateResult();
    }
    });

    getElement("backBtn")?.addEventListener("click", () => {
        if (currentQuestion > 0) {
            currentQuestion--;
            renderQuestion();
        }
    });

    getElement("restartBtn")?.addEventListener("click", restartQuiz);
    getElement("downloadBtn")?.addEventListener("click", downloadResult);
    getElement("shareBtn")?.addEventListener("click", shareResult);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupQuiz);
    } else {
        setupQuiz();
    }
})();
