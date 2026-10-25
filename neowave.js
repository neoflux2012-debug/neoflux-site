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
function iniciarTutorial() {
    const jaViuTutorial = localStorage.getItem('neowave_tutorial_visto');
    const caixaChat = document.getElementById('neo-wave-chat');
    const body = document.getElementById('neo-wave-body');
    
    if (!jaViuTutorial && caixaChat && body) {
        // Abre o chat automaticamente
        caixaChat.style.display = 'flex';
        body.innerHTML = ""; // Limpa a mensagem padrão

        const plano = window.planoAtual || 'start';
        const ehStart = (plano === 'start' || plano === 'fvm_start');

        // Mensagem 1: Boas vindas
        setTimeout(() => {
            body.innerHTML += `<div class="msg-bot">Olá! Seja muito bem-vindo(a) à Neo Flux! 💜</div>`;
            body.scrollTop = body.scrollHeight;
        }, 500);

        // Mensagem 2: Tutorial Básico
        setTimeout(() => {
            body.innerHTML += `<div class="msg-bot">Vou te dar um tour rápido. Aqui no painel você tem:<br><br>📅 <b>Festas/Pedidos:</b> Onde você agenda os eventos.<br>📦 <b>Catálogo:</b> Seus produtos e estoques.<br>🎁 <b>Kits:</b> Os combos prontos.<br>💰 <b>Orçamento:</b> Onde eu monto as mensagens pra você!</div>`;
            body.scrollTop = body.scrollHeight;
        }, 2000);

        // Mensagem 3: Aviso do Start ou Dica Geral
        setTimeout(() => {
            if (ehStart) {
                body.innerHTML += `<div class="msg-bot">⚠️ <b>Aviso do seu Plano Start:</b> Eu estou aqui para tirar suas dúvidas básicas! Porém, ferramentas como Orçamento Inteligente, Kits e Relatórios precisam de um upgrade para o Pro. Se precisar, é só chamar no WhatsApp!</div>`;
            } else {
                body.innerHTML += `<div class="msg-bot">✨ E lembre-se: sempre que precisar de um atalho rápido, clique no botão de <b>Comandos (>_)</b> aqui do lado, onde você pode registrar quebras de estoque e gerar orçamentos!</div>`;
            }
            body.scrollTop = body.scrollHeight;
        }, 4000);

        // Salva no navegador para não repetir na próxima vez
        localStorage.setItem('neowave_tutorial_visto', 'true');
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
