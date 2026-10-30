// ==========================================
// NEOWAVE.JS - Chat, Comandos, Quebra e Tutorial
// ==========================================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = getApps().length ? getApps()[0] : initializeApp({});
const db = getFirestore(app);

let subsiteAtualIdWave = "";

// 🔹 1. LIGAR OS BOTÕES E INICIAR TUTORIAL
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-acessar')) {
        subsiteAtualIdWave = e.target.getAttribute('data-id');
        
        setTimeout(() => {
            const btnChat = document.getElementById('btn-neo-wave');
            const btnComandos = document.getElementById('btn-comandos-neo-wave');
            if (btnChat) btnChat.style.display = 'flex';
            if (btnComandos) btnComandos.style.display = 'flex';

            // 🔹 DISPARA O TUTORIAL
            iniciarTutorial();
        }, 500);
    }
});

// 🔹 2. FUNÇÃO DO TUTORIAL (Só aparece 1 vez por navegador)

/* ==========================================
   2. TUTORIAL INTERATIVO NEO WAVE
   ========================================== */

let etapasTutorialWave = [];
let etapaAtualWave = 0;
let elementoDestacadoWave = null;

function chaveTutorialWave() {
    return `neowave_tutorial_v2_${subsiteAtualIdWave}`;
}

function localizarElementoWave(seletores) {
    for (const seletor of seletores) {
        const elemento = document.querySelector(seletor);

        if (elemento &&
            elemento.getClientRects().length > 0 &&
            getComputedStyle(elemento).visibility !== "hidden") {
            return elemento;
        }
    }

    return null;
}

function iniciarTutorial() {
    if (!subsiteAtualIdWave) return;

    if (localStorage.getItem(chaveTutorialWave()) === "true") {
        return;
    }

    // O plano precisa ser informado pelo sistema principal.
    // Sem essa informação, mostramos somente recursos gerais.
    const plano = window.planoAtualNeoWave || "";

    const ehStart = ["start", "fvm_start"].includes(plano);

    const temPro = [
        "pro", "elite", "elite_premium",
        "fvm_pro", "fvm_elite", "fvm_elite_premium"
    ].includes(plano);

    const temElite = [
        "elite", "elite_premium",
        "fvm_elite", "fvm_elite_premium"
    ].includes(plano);

    const temPremium = [
        "elite_premium", "fvm_elite_premium"
    ].includes(plano);

    etapasTutorialWave = [
        {
            titulo: "💜 Bem-vindo à Neo Flux!",
            texto: "Eu sou o Neo Wave! Vou te apresentar os principais recursos do seu sistema. Vamos começar?",
            seletores: []
        },
        {
            titulo: "📅 Festas e pedidos",
            texto: "Aqui você começa a organizar seus eventos e pedidos.",
            seletores: [
                "#btn-agendar-festa"
            ]
        },
        {
            titulo: "🤖 Seu assistente",
            texto: "Este sou eu! Clique aqui sempre que precisar de ajuda para usar a Neo Flux.",
            seletores: [
                "#btn-neo-wave"
            ]
        }
    ];

    if (temPro) {
        etapasTutorialWave.push({
            titulo: "🎁 Kits",
            texto: "Nos planos com acesso a Kits, você pode organizar combinações de peças para suas locações.",
            seletores: [
                "#btn-gerenciar-kits",
                "#btn-kits"
            ]
        });

        etapasTutorialWave.push({
            titulo: "💰 Orçamento inteligente",
            texto: "Aqui você pode acessar as ferramentas de orçamento disponíveis no seu plano.",
            seletores: [
                "#btn-abrir-orcamento-inteligente"
            ]
        });
    }

    if (temElite) {
        etapasTutorialWave.push({
            titulo: "📊 Análise do negócio",
            texto: "Nos planos com acesso ao Analista, você pode acompanhar informações do seu negócio.",
            seletores: [
                "#btn-abrir-analista",
                "#btn-analista"
            ]
        });
    }

    if (temPremium) {
        etapasTutorialWave.push({
            titulo: "✍️ Contratos",
            texto: "Seu plano também inclui o módulo de contratos.",
            seletores: [
                "#btn-contratos",
                "#btn-gerenciar-contratos"
            ]
        });
    }

    if (ehStart) {
        etapasTutorialWave.push({
            titulo: "✨ Seu plano Start",
            texto: "Você já pode começar a organizar sua empresa! Alguns recursos avançados ficam disponíveis nos planos superiores.",
            seletores: []
        });
    }

    etapasTutorialWave.push({
        titulo: "🤫 Um segredinho...",
        texto: "Está vendo o botão de terminal >_? Ele guarda comandos especiais! Você também pode voltar aqui e reiniciar este tutorial quando quiser.",
        seletores: [
            "#btn-comandos-neo-wave"
        ]
    });

    etapasTutorialWave.push({
        titulo: "🚀 Tudo pronto!",
        texto: "Agora é com você! Explore sua empresa e, quando precisar, pode chamar o Neo Wave. 💜",
        seletores: []
    });

    etapaAtualWave = 0;

    // Fecha o chat para não cobrir o tutorial
    const chat = document.getElementById("neo-wave-chat");
    if (chat) chat.style.display = "none";

    mostrarEtapaTutorialWave();
}

function mostrarEtapaTutorialWave() {
    document.getElementById("neo-wave-tour-overlay")?.remove();

    if (elementoDestacadoWave) {
        elementoDestacadoWave.classList.remove("neo-wave-tour-destaque");
        elementoDestacadoWave = null;
    }

    const etapa = etapasTutorialWave[etapaAtualWave];
    if (!etapa) return;

    const alvo = localizarElementoWave(etapa.seletores);

    if (alvo) {
        alvo.scrollIntoView({
            behavior: "instant",
            block: "center"
        });

        alvo.classList.add("neo-wave-tour-destaque");
        elementoDestacadoWave = alvo;
    }

    const overlay = document.createElement("div");
    overlay.id = "neo-wave-tour-overlay";

    const caixa = document.createElement("div");
    caixa.className = "neo-wave-tour-caixa";

    const progresso = document.createElement("p");
    progresso.className = "neo-wave-tour-progresso";
    progresso.textContent =
        `Etapa ${etapaAtualWave + 1} de ${etapasTutorialWave.length}`;

    const titulo = document.createElement("h3");
    titulo.textContent = etapa.titulo;

    const descricao = document.createElement("p");
    descricao.textContent = etapa.texto;

    const botoes = document.createElement("div");
    botoes.className = "neo-wave-tour-botoes";

    const pular = document.createElement("button");
    pular.textContent = "Pular";
    pular.onclick = finalizarTutorialWave;

    const voltar = document.createElement("button");
    voltar.textContent = "Voltar";
    voltar.disabled = etapaAtualWave === 0;
    voltar.onclick = () => {
        etapaAtualWave--;
        mostrarEtapaTutorialWave();
    };

    const proximo = document.createElement("button");
    proximo.className = "neo-wave-tour-proximo";

    const ultimaEtapa =
        etapaAtualWave === etapasTutorialWave.length - 1;

    proximo.textContent = ultimaEtapa ? "Concluir 💜" : "Próximo";

    proximo.onclick = () => {
        if (ultimaEtapa) {
            finalizarTutorialWave();
        } else {
            etapaAtualWave++;
            mostrarEtapaTutorialWave();
        }
    };

    botoes.append(pular, voltar, proximo);
    caixa.append(progresso, titulo, descricao, botoes);
    
overlay.appendChild(caixa);
document.body.appendChild(overlay);

// Posiciona a explicação sem cobrir o botão destacado
if (alvo) {
    const rect = alvo.getBoundingClientRect();
    const larguraCaixa = caixa.offsetWidth;
    const alturaCaixa = caixa.offsetHeight;
    const margem = 16;

    // Prefere mostrar abaixo do botão
    let top = rect.bottom + margem;

    // Se não couber abaixo, mostra acima
    if (top + alturaCaixa > window.innerHeight - margem) {
        top = rect.top - alturaCaixa - margem;
    }

    // Se também não couber acima, procura o espaço maior
    if (top < margem) {
        const espacoAcima = rect.top;
        const espacoAbaixo = window.innerHeight - rect.bottom;

        top = espacoAbaixo >= espacoAcima
            ? rect.bottom + margem
            : margem;
    }

    const left = Math.max(
        margem,
        Math.min(
            rect.left,
            window.innerWidth - larguraCaixa - margem
        )
    );

    caixa.style.position = "fixed";
    caixa.style.left = `${left}px`;
    caixa.style.top = `${top}px`;
    caixa.style.margin = "0";
}
    
function finalizarTutorialWave() {
    document.getElementById("neo-wave-tour-overlay")?.remove();

    if (elementoDestacadoWave) {
        elementoDestacadoWave.classList.remove("neo-wave-tour-destaque");
        elementoDestacadoWave = null;
    }

    if (subsiteAtualIdWave) {
        localStorage.setItem(chaveTutorialWave(), "true");
    }
}

// 🔹 3. ABRIR/FECHAR O CHAT
const btnAbrirChat = document.getElementById('btn-neo-wave');
const btnFecharChat = document.getElementById('btn-fechar-neo-wave');
const caixaChat = document.getElementById('neo-wave-chat');

if (btnAbrirChat) btnAbrirChat.addEventListener('click', () => caixaChat.style.display = 'flex');
if (btnFecharChat) btnFecharChat.addEventListener('click', () => caixaChat.style.display = 'none');

// 🔹 4. LÓGICA DAS RESPOSTAS DO CHAT
document.getElementById('btn-neo-wave-enviar')?.addEventListener('click', () => {
    const input = document.getElementById('neo-wave-input'); 
    const body = document.getElementById('neo-wave-body');
    if(!input.value.trim()) return;
    
    body.innerHTML += `<div class="msg-user">${input.value}</div>`;
    const msg = input.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    input.value = "";
    
    const idTyping = "typing-" + Date.now();
    body.innerHTML += `<div class="msg-bot" id="${idTyping}" style="opacity: 0.6;">Digitando...</div>`; 
    body.scrollTop = body.scrollHeight;

    setTimeout(() => {
        const typingEl = document.getElementById(idTyping); if (typingEl) typingEl.remove();
        
        const plano = window.planoAtual || 'start';
        const ehStart = (plano === 'start' || plano === 'fvm_start');
        
        let resposta = "Ainda estou aprendendo, mas posso te ajudar com: Orçamento, Kits, Contratos, Relatórios, Histórico, Analista e Planos. O que você precisa?";

        if (msg.includes('quebra') || msg.includes('quebrou')) {
            resposta = "Para registrar uma peça quebrada, clique no botão de Comandos (o ícone de terminal `>_`) que fica acima do meu botão de chat. Lá tem a opção 'Registrar Quebra'! 🛠️";
        }
        else if (msg.includes('orcamento')) {
            if (ehStart) resposta = "🔒 O **Orçamento Inteligente** está disponível a partir do plano **Pro**. No Start, eu só tiro dúvidas básicas.";
            else resposta = "O **Orçamento Inteligente** está no card roxo! Lá você escolhe o cliente, seleciona um Kit e eu monto a mensagem perfeita. 💜";
        }
        else if (msg.includes('analista') || msg.includes('grafico')) {
            if (ehStart || plano === 'pro' || plano === 'fvm_pro') resposta = "🔒 O **Neo Wave Analista** é exclusivo para planos **Elite e Elite Premium**.";
            else resposta = "O **Neo Wave Analista** é o card laranja. Ele te mostra o faturamento do mês e os kits mais vendidos! 📊✨";
        }
        else if (msg.includes('contrato')) {
            if (ehStart || plano === 'pro' || plano === 'elite' || plano === 'fvm_pro' || plano === 'fvm_elite') resposta = "🔒 O módulo **Contratos** está disponível apenas no plano **Elite Premium**.";
            else resposta = "Para gerar contratos, vá no card **Contratos** (laranja). Você pode subir o PDF e a logo da sua empresa. ✍️";
        }
        else if (msg.includes('kit')) {
            if (ehStart) resposta = "🔒 O módulo **Kits** está disponível a partir do plano **Pro**.";
            else resposta = "No card **Kits**, você pode cadastrar novos modelos com nome, foto e preço! 🎁";
        }
        else if (msg.includes('reuniao') || msg.includes('reunião')) {
            resposta = "Para agendar uma reunião, clique no card de **Reuniões** (ícone de calendário azul). Eu te aviso 30 minutos antes quando estiver chegando a hora! ⏰";
        }
        else if (msg.includes('ola') || msg.includes('oi') || msg.includes('bom dia')) {
            resposta = "Olá! Tudo bem? 💜 Eu sou o Neo Wave. Clique no botão de Comandos `>_` para ver atalhos rápidos ou me pergunte qualquer coisa!";
        }
        
        body.innerHTML += `<div class="msg-bot">${resposta}</div>`; 
        body.scrollTop = body.scrollHeight;
    }, 700);
});

// 🔹 5. ABRIR O MODAL DE COMANDOS
document.getElementById('btn-comandos-neo-wave')?.addEventListener('click', () => {
    document.getElementById('modal-comandos-neo-wave').style.display = 'flex';
});

// 🔹 6. PREENCHER O SELECT DE QUEBRA QUANDO O MODAL ABRIR
document.querySelector('button[onclick*="modal-registrar-quebra"]')?.addEventListener('click', async () => {
    const select = document.getElementById('quebra-peca-select');
    const idParaBuscar = subsiteAtualIdWave || document.querySelector('#nome-do-subsite').getAttribute('data-id');
    
    select.innerHTML = '<option value="">Carregando peças...</option>';
    try {
        const snap = await getDocs(query(collection(db, "catalogo"), where("idSubsite", "==", idParaBuscar)));
        select.innerHTML = '<option value="">-- Selecione a peça --</option>';
        snap.forEach(doc => {
            const item = doc.data();
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = item.nome;
            select.appendChild(opt);
        });
    } catch(e) {
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
});

// 🔹 7. CONFIRMAR QUEBRA (DAR BAIXA NO ESTOQUE)
window.confirmarQuebra = async function() {
    const idPeca = document.getElementById('quebra-peca-select').value;
    const qtd = parseInt(document.getElementById('quebra-quantidade').value) || 1;
    
    if (!idPeca) return alert("Selecione uma peça.");
    if (qtd < 1) return alert("Quantidade inválida.");

    if (!confirm(`Tem certeza que deseja dar baixa de ${qtd} unidade(s) desta peça no estoque?`)) return;

    try {
        const pecaRef = doc(db, "catalogo", idPeca);
        const pecaSnap = await getDoc(pecaRef);
        
        if (pecaSnap.exists()) {
            const dados = pecaSnap.data();
            const qtdAtual = parseInt(dados.quantidade) || 0;
            const novaQtd = Math.max(0, qtdAtual - qtd);
            
            await updateDoc(pecaRef, { quantidade: novaQtd });
            
            alert(`✅ Baixa realizada! O estoque de "${dados.nome}" agora é ${novaQtd}.`);
            document.getElementById('modal-registrar-quebra').style.display = 'none';
            document.getElementById('quebra-quantidade').value = 1;
        }
    } catch (e) {
        alert("Erro ao dar baixa: " + e.message);
    }
};

/* ==========================================
   REINICIAR TUTORIAL NEO WAVE
   ========================================== */

window.reiniciarTutorialNeoWave = function() {

    if (!subsiteAtualIdWave) {
        alert("Abra uma empresa primeiro!");
        return;
    }

    const chaveTutorial =
        `neowave_tutorial_v2_${subsiteAtualIdWave}`;

    localStorage.removeItem(chaveTutorial);

    const modal = document.getElementById(
        "modal-comandos-neo-wave"
    );

    if (modal) {
        modal.style.display = "none";
    }

    iniciarTutorial();
};

