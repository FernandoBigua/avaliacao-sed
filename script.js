// === Firebase Config (substitua pelos seus dados do Firebase) ===
const firebaseConfig = {
    apiKey: "AIzaSyBVS6zh2HIMnfvDdlP3kfYUTdB6r8UlJso",
    authDomain: "avaliacao-d3fe4.firebaseapp.com",
    projectId: "avaliacao-d3fe4",
    storageBucket: "avaliacao-d3fe4.firebasestorage.app",
    messagingSenderId: "96679836690",
    appId: "1:96679836690:web:48b7889976d11ada1c6ccb"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
let userEmail = "";

// === Login com Google ===
function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            userEmail = result.user.email;
            document.getElementById("login-area").style.display = "none";
            document.getElementById("imr-form").style.display = "block";
        })
        .catch(error => alert("Erro no login: " + error.message));
}

// O URL do seu Apps Script (Certifique-se de que é a URL da implantação do doGet!)
const APPS_SCRIPT_URL = "https://script.google.com/a/macros/sed.sc.gov.br/s/AKfycbzauiSSPVV_bBVo4Snv0WlvF8NJnpshYusS0zU52Q_U9akFfKUfLKRHqEKGNHerxhFPlQ/exec"; // O SEU URL atual

// === Mapeamento de regras por item ===
function calcularPontuacao(item, ocorrencias) {
    const n = parseInt(ocorrencias);
    switch (item) {
        case "1_1": return n === 0 ? 15 : n === 1 ? 10 : n === 2 ? 5 : 0;
        case "1_2": return n === 0 ? 15 : n <= 3 ? 10 : n <= 9 ? 5 : 0;
        case "1_3":
        case "1_4": return n === 0 ? 10 : n <= 3 ? 5 : n <= 5 ? 3 : 0;
        case "1_5": return n < 4 ? 5 : n <= 10 ? 4 : n <= 19 ? 2 : 0;
        case "1_6": return n === 0 ? 5 : n <= 3 ? 4 : n <= 9 ? 2 : 0;
        case "2_1":
        case "2_2": return n <= 3 ? 12 : n <= 6 ? 8 : n <= 9 ? 4 : 0;
        case "2_3": return n < 2 ? 6 : n < 4 ? 4 : n === 4 ? 2 : 0;
        case "2_4": return n < 2 ? 4 : n <= 6 ? 3 : n <= 10 ? 2 : 0;
        case "2_5":
        case "2_6": return n === 0 ? 3 : n <= 3 ? 2 : n <= 5 ? 1 : 0;
        default: return 0;
    }
}

// === Dados de CREs e escolas ===
let dadosCRE = [];

fetch("cre_escolas.json")
    .then(res => res.json())
    .then(data => {
        dadosCRE = data;

        // Popula empresas
        const empresasUnicas = [...new Set(data.map(item => item.EMPRESA))];
        const empresaSelect = document.querySelector('select[name="empresa"]');
        empresaSelect.innerHTML = '<option value="">Selecione</option>';
        empresasUnicas.forEach(empresa => {
            const option = document.createElement("option");
            option.value = empresa;
            option.textContent = empresa;
            empresaSelect.appendChild(option);
        });
    })
    .catch(err => console.error("Erro ao carregar JSON:", err));

// Atualiza CREs ao selecionar empresa
document.querySelector('select[name="empresa"]').addEventListener("change", function () {
    const empresaSelecionada = this.value;
    const creSelect = document.getElementById("cre-select");
    const escolaSelect = document.getElementById("escola-select");

    creSelect.innerHTML = '<option value="">Selecione</option>';
    escolaSelect.innerHTML = '<option value="">Selecione</option>';

    if (!empresaSelecionada) return;

    const cresFiltradas = dadosCRE
        .filter(item => item.EMPRESA === empresaSelecionada)
        .map(item => item.CRE);

    const cresUnicas = [...new Set(cresFiltradas)].sort();
    cresUnicas.forEach(cre => {
        const option = document.createElement("option");
        option.value = cre;
        option.textContent = cre;
        creSelect.appendChild(option);
    });
});

// Atualiza escolas ao selecionar CRE
document.getElementById("cre-select").addEventListener("change", function () {
    const creSelecionada = this.value;
    const escolaSelect = document.getElementById("escola-select");

    escolaSelect.innerHTML = '<option value="">Selecione</option>';
    if (!creSelecionada) return;

    const escolasFiltradas = dadosCRE
        .filter(item => item.CRE === creSelecionada)
        .map(item => item["UNIDADE ESCOLAR"])
        .sort();

    escolasFiltradas.forEach(escola => {
        const option = document.createElement("option");
        option.value = escola;
        option.textContent = escola;
        escolaSelect.appendChild(option);
    });
});

// === Modal de revisão ===
const formEl = document.getElementById("imr-form");
const reviewModal = document.getElementById("review-modal");
const reviewList = document.getElementById("review-list");
const backBtn = document.getElementById("back-btn");
const confirmBtn = document.getElementById("confirm-btn");
const closeReviewBtn = document.getElementById("close-review");

let pendingFormData = null;

formEl.addEventListener("submit", function (e) {
    e.preventDefault(); // bloqueia envio direto
    pendingFormData = new FormData(formEl);

    reviewList.innerHTML = "";
    formEl.querySelectorAll("label").forEach(label => {
        const input = label.querySelector("input, select");
        if (input) {
            let valor = input.value || "(não preenchido)";
            let texto = label.childNodes[0].textContent.trim();
            reviewList.innerHTML += `<p><strong>${texto}</strong> ${valor}</p>`;
        }
    });

    reviewModal.style.display = "block";
});

// Botão voltar
backBtn.addEventListener("click", () => reviewModal.style.display = "none");
// Fechar modal pelo X
closeReviewBtn.addEventListener("click", () => reviewModal.style.display = "none");

// Confirmar e enviar
confirmBtn.addEventListener("click", () => {
    confirmBtn.classList.add("loading"); // ativa loader
    enviarFormulario(pendingFormData);
});

// === Função de envio JSONP ===
function enviarFormulario(formData) {
    const dados = {
        email: userEmail,
        empresa: formData.get("empresa"),
        cre: formData.get("cre"),
        escola: formData.get("escola"),
        gestor: formData.get("gestor").toUpperCase(),
        mes: formData.get("mes"),
        data: new Date().toLocaleString()
    };

    let totalInd1 = 0, totalInd2 = 0;
    for (let i = 1; i <= 6; i++) {
        const valor1 = formData.get(`oc_1_${i}`);
        const valor2 = formData.get(`oc_2_${i}`);
        const p1 = calcularPontuacao(`1_${i}`, valor1);
        const p2 = calcularPontuacao(`2_${i}`, valor2);
        dados[`item_1_${i}`] = p1;
        dados[`item_2_${i}`] = p2;
        totalInd1 += p1;
        totalInd2 += p2;
    }
    dados.total_indicador_1 = totalInd1;
    dados.total_indicador_2 = totalInd2;
    dados.total_geral = totalInd1 + totalInd2;

    // Callback JSONP
    window.handleAppsScriptResponse = function(response) {
        confirmBtn.classList.remove("loading");
        reviewModal.style.display = "none";
        if (response.status === 'success') {
            document.getElementById("loader").style.display = "none";
            document.getElementById("status-msg").innerText = "Avaliação enviada com sucesso!";
            document.getElementById("submit-btn").style.display = "none";
            mostrarMensagemAvaliacao(dados.total_geral, dados.gestor, dados.empresa);
            formEl.reset();
        } else {
            document.getElementById("loader").style.display = "none";
            document.getElementById("status-msg").innerText = "Erro ao enviar: " + response.message;
            console.error("Erro do Apps Script:", response.message);
        }
    };

    const encodedData = encodeURIComponent(JSON.stringify(dados));
    const script = document.createElement('script');
    script.src = `${APPS_SCRIPT_URL}?data=${encodedData}&callback=handleAppsScriptResponse`;
    document.body.appendChild(script);
}

// === Modal de resultado existente ===
function mostrarMensagemAvaliacao(nota, gestor, empresa) {
    const mensagem = document.getElementById('popup-message');
    const modal = document.getElementById('popup-modal');

    let texto = "";
    if (nota < 70) {
        texto = `Olá ${gestor}, a empresa ${empresa}, <strong>obteve ${nota} pontos </strong>e deverá ser notificada formalmente.`;
    } else if (nota >= 70 && nota <= 95) {
        texto = `Olá ${gestor}, a empresa ${empresa}, <strong>obteve ${nota} pontos,</strong> portanto deverá emitir uma justificativa formal.`;
    } else {
        texto = `Parabéns ${gestor}! A empresa ${empresa} obteve excelente desempenho com <strong>${nota} pontos.</strong>`;
    }

    mensagem.innerHTML = texto;
    modal.style.display = 'block';
}

// Fecha o modal de resultado
document.addEventListener("DOMContentLoaded", function () {
    const closeBtn = document.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('popup-modal').style.display = 'none';
        });
    }
    window.addEventListener("click", function (event) {
        const modal = document.getElementById("popup-modal");
        if (event.target === modal) modal.style.display = "none";
    });
});



