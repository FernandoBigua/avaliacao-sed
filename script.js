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
        case "1_1": // Contaminação Física
            return n === 0 ? 15 : n === 1 ? 10 : n === 2 ? 5 : 0;
        case "1_2":
            return n === 0 ? 15 : n <= 3 ? 10 : n <= 9 ? 5 : 0;
        case "1_3":
        case "1_4":
            return n === 0 ? 10 : n <= 3 ? 5 : n <= 5 ? 3 : 0;
        case "1_5":
            return n < 4 ? 5 : n <= 10 ? 4 : n <= 19 ? 2 : 0;
        case "1_6":
            return n === 0 ? 5 : n <= 3 ? 4 : n <= 9 ? 2 : 0;
        case "2_1":
        case "2_2":
            return n <= 3 ? 12 : n <= 6 ? 8 : n <= 9 ? 4 : 0;
        case "2_3":
            return n < 2 ? 6 : n < 4 ? 4 : n === 4 ? 2 : 0;
        case "2_4":
            return n < 2 ? 4 : n <= 6 ? 3 : n <= 10 ? 2 : 0;
        case "2_5":
        case "2_6":
            return n === 0 ? 3 : n <= 3 ? 2 : n <= 5 ? 1 : 0;
        default:
            return 0;
    }
}

// === Enviar formulário ===
// === Enviar formulário ===
document.getElementById("imr-form").addEventListener("submit", function (e) {
    document.getElementById("loader").style.display = "block";
    document.getElementById("status-msg").innerText = ""; // limpa mensagem anterior

    e.preventDefault();

    const form = new FormData(e.target);
    const dados = {
        email: userEmail,
        empresa: form.get("empresa"),
        cre: form.get("cre"),
        escola: form.get("escola"),
        gestor: form.get("gestor"),
        mes: form.get("mes"),
        data: new Date().toLocaleString()
    };
    console.log("Dados Enviados:", dados)

    let totalInd1 = 0, totalInd2 = 0;

    // Calcula pontuações e guarda nos dados
    for (let i = 1; i <= 6; i++) {
        const valor1 = form.get(`oc_1_${i}`);
        const valor2 = form.get(`oc_2_${i}`);
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

    // Função global que vai receber a resposta do Apps Script (callback JSONP)
    window.handleAppsScriptResponse = function(response) {
        if (response.status === 'success') {
            document.getElementById("loader").style.display = "none";
            document.getElementById("status-msg").innerText = "Avaliação enviada com sucesso!";
            document.getElementById("submit-btn").style.display = "none"; // Oculta o botão
            mostrarMensagemAvaliacao(dados.total_geral, dados.gestor, dados.empresa);
            e.target.reset();
        } else {
            document.getElementById("loader").style.display = "none";
            document.getElementById("status-msg").innerText = "Erro ao enviar: " + response.message;
            console.error("Erro do Apps Script:", response.message);
        }
    };

    // Monta URL com os dados codificados + callback
    const encodedData = encodeURIComponent(JSON.stringify(dados));
    const url = `${APPS_SCRIPT_URL}?data=${encodedData}&callback=handleAppsScriptResponse`;

    // Cria script dinâmico para chamar o Apps Script via JSONP
    const script = document.createElement('script');
    script.src = url;
    document.body.appendChild(script);
});
let dadosCRE = [];

// Carrega o arquivo JSON com CREs e Escolas
fetch("cre_escolas.json")
  .then(response => response.json())
  .then(data => {
    dadosCRE = data;

    // Extrai CREs únicas e preenche o select
    const cresUnicas = [...new Set(data.map(item => item.CRE))];
    const creSelect = document.getElementById("cre-select");

    cresUnicas.forEach(cre => {
      const option = document.createElement("option");
      option.value = cre;
      option.textContent = cre;
      creSelect.appendChild(option);
    });
  })
  .catch(error => console.error("Erro ao carregar JSON:", error));

// Atualiza as escolas com base na CRE selecionada
document.getElementById("cre-select").addEventListener("change", function () {
  const creSelecionada = this.value;
  const escolaSelect = document.getElementById("escola-select");

  // Limpa opções anteriores
  escolaSelect.innerHTML = '<option value="">Selecione</option>';

  if (!creSelecionada) return;

  // Filtra e adiciona as escolas correspondentes
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
function mostrarMensagemAvaliacao(nota, gestor, empresa) {
    const mensagem = document.getElementById('popup-message');
    const modal = document.getElementById('popup-modal');

    let texto = "";

    if (nota < 70) {
        texto = `Olá ${gestor}, a empresa ${empresa}, <strong>obteve ${nota} pontos </strong>e deverá ser notificada formalmente. Se esta for a primeira avaliação. Em caso de reincidência, serão aplicadas penalidades conforme previsto em contrato.`;
    } else if (nota >= 70 && nota <= 95) {
        texto = `Olá ${gestor}, a empresa ${empresa}, <strong>obteve ${nota} pontos,</strong> portanto deverá emitir uma justificativa formal. Que comprove a excepcionalidade da ocorrência, resultante exclusivamente de fatores imprevisíveis e alheios ao controle.`;
    } else {
        texto = `Parabéns ${gestor}! A empresa ${empresa} obteve excelente desempenho com <strong>${nota} pontos.</strong>`;
    }

    mensagem.innerHTML = texto;
    modal.style.display = 'block';
}

// Fecha o modal ao clicar no X
document.addEventListener("DOMContentLoaded", function () {
    const closeBtn = document.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('popup-modal').style.display = 'none';
        });
    }

    // Opcional: fecha o modal se clicar fora dele
    window.addEventListener("click", function (event) {
        const modal = document.getElementById("popup-modal");
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
});




