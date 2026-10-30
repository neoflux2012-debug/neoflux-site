// ==========================================
// NEOWAVE.JS - Chat, Comandos, Quebra e Tutorial
// ==========================================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = getApps().length ? getApps()[0] : initializeApp({});
const db = getFirestore(app);

let subsiteAtualIdWave = "";


/* ==========================================
   1 E 2. TUTORIAL INTERATIVO NEO WAVE
   ========================================== */
let etapasTutorialWave = [];
let etapaAtualWave = 0;
let elementoDestacadoWave = null;

function obterPlanoWave() {
    return window.planoAtualNeoWave || "start";
}

function obterRecursosWave() {
   const plano = obterPlanoWave();

    const permissoes = {
        start: { kits: true, maxKits: 3, relatorios: false, analista: false, contratos: false },
        pro: { kits: true, relatorios: true, analista: false, contratos: false },
        elite: { kits: true, relatorios: true, analista: true, contratos: false },
        elite_premium: { kits: true, relatorios: true, analista: true, contratos: true },
        fvm_start: { kits: true, maxKits: 3, relatorios: false, analista: false, contratos: false },
        fvm_pro: { kits: true, relatorios: true, analista: false, contratos: false },
        fvm_elite: { kits: true, relatorios: true, analista: true, contratos: false },
        fvm_elite_premium: { kits: true, relatorios: true, analista: true, contratos: true }
    };

    return permissoes[plano] || permissoes.start;
}

function localizarElementoWave(seletores) {
    for (const seletor of seletores) {
        const elemento = document.querySelector(seletor);

        if (
            elemento &&
            elemento.getClientRects().length > 0 &&
            getComputedStyle(elemento).visibility !== "hidden"
        ) {
            return elemento;
        }
    }

    return null;
}

function iniciarTutorial() {
    if (!subsiteAtualIdWave) return;

    const chave = `neowave_tutorial_v2_${subsiteAtualIdWave}`;

    if (localStorage.getItem(chave) === "true") return;

    const plano = obterPlanoWave();
    const recursos = obterRecursosWave();

    etapasTutorialWave = [
        {
            titulo: "💜 Bem-vindo à Neo Flux!",
            texto: "Eu sou o Neo Wave! Vou te apresentar seu sistema.",
            seletores: []
        },
        {
            titulo: "📅 Festas e pedidos",
            texto: "Aqui você agenda e organiza suas festas.",
            seletores: ["#btn-agendar-festa"]
        },
        {
            titulo: "📦 Catálogo",
            texto: "Aqui você cadastra as peças do seu acervo.",
            seletores: ["#btn-abrir-catalogo"]
        }
    ];

  
if (recursos.kits) {
    etapasTutorialWave.push({
        titulo: "🎁 Kits",
        texto: plano === "start" || plano === "fvm_start"
            ? "Seu plano Start permite cadastrar até 3 kits."
            : "Aqui você organiza seus kits de locação.",
        seletores: ["#btn-abrir-kits"]
    });
}

    if (recursos.relatorios) {
        etapasTutorialWave.push({
            titulo: "📊 Relatórios",
            texto: "Acompanhe os relatórios da sua empresa.",
            seletores: ["#btn-relatorios"]
        });
    }

if (recursos.relatorios) {
    etapasTutorialWave.push({
        titulo: "💰 Orçamento Inteligente",
        texto: "Aqui você pode preparar orçamentos e agilizar o atendimento aos seus clientes!",
        seletores: [
            "#btn-abrir-orcamento-inteligente",
            "#btn-gerar-orcamento"
        ]
    });
}

    if (recursos.analista) {
        etapasTutorialWave.push({
            titulo: "📈 Neo Wave Analista",
            texto: "Acompanhe indicadores e análises do negócio.",
            seletores: ["#card-analista"]
        });
    }

    if (recursos.contratos) {
        etapasTutorialWave.push({
            titulo: "✍️ Contratos",
            texto: "Aqui você acessa o módulo de contratos.",
            seletores: ["#btn-abrir-contratos"]
        });
    }

    if (plano.startsWith("fvm_")) {
        etapasTutorialWave.push({
            titulo: "🛠️ Plano FVM",
            texto: "Você está utilizando a versão Faça Você Mesmo da Neo Flux.",
            seletores: []
        });
    }

    etapasTutorialWave.push(
        {
            titulo: "🤖 Neo Wave",
            texto: "Clique aqui sempre que precisar da minha ajuda!",
            seletores: ["#btn-neo-wave"]
        },
        {
            titulo: "⌨️ Comandos especiais",
            texto: "O botão >_ abre os comandos especiais e permite reiniciar este tutorial.",
            seletores: ["#btn-comandos-neo-wave"]
        },
        {
            titulo: "🚀 Tudo pronto!",
            texto: "Agora você já pode explorar sua empresa. Conte comigo! 💜",
            seletores: []
        }
    );

    etapaAtualWave = 0;

    document.getElementById("neo-wave-chat")?.style.setProperty(
        "display", "none"
    );

    mostrarEtapaTutorialWave();
}

function mostrarEtapaTutorialWave() {
    document.getElementById("neo-wave-tour-overlay")?.remove();

    if (elementoDestacadoWave) {
        elementoDestacadoWave.classList.remove(
            "neo-wave-tour-destaque"
        );
        elementoDestacadoWave = null;
    }

    const etapa = etapasTutorialWave[etapaAtualWave];
    if (!etapa) return;

    const alvo = localizarElementoWave(etapa.seletores);

    if (alvo) {
        alvo.scrollIntoView({
            behavior: "instant",
            block: "nearest"
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

    const ultima =
        etapaAtualWave === etapasTutorialWave.length - 1;

    proximo.textContent = ultima ? "Concluir 💜" : "Próximo";

    proximo.onclick = () => {
        if (ultima) {
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

    // Posiciona a caixa longe do botão destacado
    if (alvo) {
        const rect = alvo.getBoundingClientRect();
        const largura = caixa.offsetWidth;
        const altura = caixa.offsetHeight;
        const margem = 16;

        const opcoes = [
            {
                x: rect.left,
                y: rect.bottom + margem
            },
            {
                x: rect.left,
                y: rect.top - altura - margem
            },
            {
                x: rect.right + margem,
                y: rect.top
            },
            {
                x: rect.left - largura - margem,
                y: rect.top
            }
        ];

        const cabe = opcoes.find(p =>
            p.x >= margem &&
            p.y >= margem &&
            p.x + largura <= window.innerWidth - margem &&
            p.y + altura <= window.innerHeight - margem
        );

        if (cabe) {
            caixa.style.position = "fixed";
            caixa.style.left = `${cabe.x}px`;
            caixa.style.top = `${cabe.y}px`;
            caixa.style.transform = "none";
        }
    }
}

function finalizarTutorialWave() {
    document.getElementById("neo-wave-tour-overlay")?.remove();

    if (elementoDestacadoWave) {
        elementoDestacadoWave.classList.remove(
            "neo-wave-tour-destaque"
        );
        elementoDestacadoWave = null;
    }

    if (subsiteAtualIdWave) {
        localStorage.setItem(
            `neowave_tutorial_v2_${subsiteAtualIdWave}`,
            "true"
        );
    }
}

document.addEventListener("click", e => {
    const botao = e.target.closest(".btn-acessar");
    if (!botao) return;

    subsiteAtualIdWave = botao.getAttribute("data-id");

    setTimeout(() => {
        document.getElementById("btn-neo-wave")
            ?.style.setProperty("display", "flex");

        document.getElementById("btn-comandos-neo-wave")
            ?.style.setProperty("display", "flex");

        iniciarTutorial();
    }, 700);
});

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
        
       
const plano = obterPlanoWave();
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
    if (plano === 'start' || plano === 'fvm_start') {
        resposta = "🎁 Seu plano permite cadastrar até 3 kits! Acesse o card Kits para começar.";
    } else {
        resposta = "🎁 No card Kits, você pode cadastrar seus modelos com nome, foto e preço!";
    }
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

