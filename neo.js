// ==========================================
// 1. IMPORTAÇÕES
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification,
    signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs,
    deleteDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 2. CONFIGURAÇÃO
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAdwwjbpyvTU5afvNzcHaBm-T-ShueHicU", authDomain: "neo-flux-c91c8.firebaseapp.com", projectId: "neo-flux-c91c8", storageBucket: "neo-flux-c91c8.firebasestorage.app", messagingSenderId: "6686219198", appId: "1:6686219198:web:e2f0b16808e5f3d251b7ef"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let subsiteAtualId = "";
let planoAtual = "";
let festasGlobais = [];

// ==========================================
// 3. REGRAS E TEXTOS
// ==========================================
const termosPlanos = {
    start: `<h3>Plano Start</h3><p>...</p>`, pro: `<h3>Plano Pro</h3><p>...</p>`, elite: `<h3>Plano Elite</h3><p>...</p>`, elite_premium: `<h3>Elite Premium</h3><p>...</p>`
};

const limitesPlanos = { start: 1, pro: 1, elite: 999, elite_premium: 9999 };

const recursosPlanos = {
    start: { kits: false, relatorios: false, assistente: false },
    pro: { kits: true, relatorios: true, assistente: false },
    elite: { kits: true, relatorios: true, assistente: true },
    elite_premium: { kits: true, relatorios: true, assistente: true }
};

// ==========================================
// 4. CONTROLE DE TELAS
// ==========================================
const todasAsTelas = document.querySelectorAll('.tela');
function mostrarTela(id) {
    todasAsTelas.forEach(t => t.classList.remove('ativa'));
    const tela = document.getElementById(id);
    if (tela) tela.classList.add('ativa');
    window.scrollTo(0, 0);
}
function carregar(ativo) {
    document.getElementById('loading-overlay').style.display = ativo ? 'flex' : 'none';
}

// ==========================================
// 5. NAVEGAÇÃO E CADASTRO
// ==========================================
document.getElementById('btn-comecar')?.addEventListener('click', () => mostrarTela('tela-planos'));
document.getElementById('voltar-inicio')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-boas-vindas'); });
document.getElementById('ir-para-login')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-login'); });
document.getElementById('btn-voltar-cliente')?.addEventListener('click', () => mostrarTela('tela-cliente'));

document.querySelectorAll('.btn-selecionar-plano').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const card = e.target.closest('.card-plano');
        planoAtual = card.getAttribute('data-plano');
        document.getElementById('texto-termos').innerHTML = termosPlanos[planoAtual] || "";
        mostrarTela('tela-termos');
    });
});

document.getElementById('form-termos')?.addEventListener('submit', (e) => { e.preventDefault(); mostrarTela('tela-criar-conta'); });

document.getElementById('form-cadastro-final')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    try {
        const email = document.getElementById('email-cadastro').value;
        const senha = document.getElementById('senha-cadastro').value;
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await sendEmailVerification(cred.user);
        await setDoc(doc(db, "usuarios", cred.user.uid), {
            nome: document.getElementById('nome-cliente').value, email: email, planoPreferido: planoAtual, statusPagamento: "pendente"
        });
        mostrarTela('tela-pagamento');
    } catch (error) { alert("Erro: " + error.message); }
    finally { carregar(false); }
});

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('email-login').value, document.getElementById('senha-login').value);
    } catch (error) { alert("Erro ao logar."); }
    finally { carregar(false); }
});

// ==========================================
// 6. ÁREA DO CLIENTE E SUBSITES
// ==========================================
async function carregarDadosCliente(uid) {
    carregar(true);
    try {
        const snap = await getDoc(doc(db, "usuarios", uid));
        if (snap.exists()) {
            const dados = snap.data();
            planoAtual = dados.planoPreferido;
            document.getElementById('cliente-nome').textContent = dados.nome;
            document.getElementById('cliente-plano').textContent = dados.planoPreferido.toUpperCase();
            document.getElementById('cliente-status').textContent = dados.statusPagamento;
            
            const limite = limitesPlanos[planoAtual] || 1;
            carregarSubsites(uid, limite);
        }
    } catch (error) { console.error(error); }
    finally { carregar(false); }
}

async function carregarSubsites(uid, limite) {
    const lista = document.getElementById('lista-subsites');
    lista.innerHTML = "";
    const snap = await getDocs(query(collection(db, "subsites"), where("idDono", "==", uid)));
    
    if (snap.size >= limite) {
        document.getElementById('btn-criar-subsite').disabled = true;
        document.getElementById('titulo-subsite').disabled = true;
    } else {
        document.getElementById('btn-criar-subsite').disabled = false;
        document.getElementById('titulo-subsite').disabled = false;
    }

    snap.forEach(doc => {
        const sub = doc.data();
        const li = document.createElement('li');
        li.style.cssText = "border: 1px solid #333; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; background: #0a0a0a;";
        li.innerHTML = `
            <strong>${sub.titulo}</strong>
            <div>
                <button class="btn-acessar" data-id="${doc.id}" style="background: #00d2ff; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">Acessar</button>
                <button class="btn-apagar" data-id="${doc.id}" style="background: #e74c3c; padding: 5px 10px; border: none; border-radius: 4px; color: white; cursor: pointer;">X</button>
            </div>
        `;
        lista.appendChild(li);
    });

    document.querySelectorAll('.btn-acessar').forEach(btn => btn.addEventListener('click', (e) => abrirSubsite(e.target.getAttribute('data-id'))));
    document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async (e) => {
        if(confirm("Apagar?")) { await deleteDoc(doc(db, "subsites", e.target.getAttribute('data-id'))); carregarDadosCliente(auth.currentUser.uid); }
    }));
}

document.getElementById('btn-criar-subsite')?.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo-subsite').value;
    if (!titulo) return;
    await addDoc(collection(db, "subsites"), { idDono: auth.currentUser.uid, titulo: titulo, criadoEm: new Date() });
    document.getElementById('titulo-subsite').value = "";
    carregarDadosCliente(auth.currentUser.uid);
});

async function abrirSubsite(id) {
    subsiteAtualId = id;
    const snap = await getDoc(doc(db, "subsites", id));
    document.getElementById('nome-do-subsite').textContent = snap.data().titulo;

    const regras = recursosPlanos[planoAtual] || recursosPlanos.start;

    document.getElementById('btn-abrir-kits').disabled = !regras.kits;
    document.getElementById('btn-abrir-kits').style.background = regras.kits ? "var(--gradiente-neo)" : "#333";
    
    document.getElementById('btn-relatorios').disabled = !regras.relatorios;
    document.getElementById('btn-relatorios').style.background = regras.relatorios ? "var(--gradiente-neo)" : "#333";

    document.getElementById('btn-neo-wave').style.display = regras.assistente ? 'flex' : 'none';

    carregarFestas(id);
    mostrarTela('tela-subsite');
}

// ==========================================
// 7. FESTAS, FRETE E RELATÓRIOS
// ==========================================
async function carregarFestas(id) {
    const container = document.getElementById('lista-festas-criadas');
    container.innerHTML = "";
    festasGlobais = [];
    
    const snap = await getDocs(query(collection(db, "festas"), where("idSubsite", "==", id)));
    snap.forEach(doc => {
        const festa = doc.data();
        festasGlobais.push(festa);
        const card = document.createElement('div');
        card.style.cssText = "background: #121212; border-left: 4px solid var(--cor-azul); border-radius: 8px; padding: 20px; text-align: left;";
        card.innerHTML = `
            <h4 style="color: white; margin: 0 0 10px 0;">${festa.nome}</h4>
            <p style="font-size: 0.85rem; color: #aaa; margin: 5px 0;"><b>Data:</b> ${festa.data.split('-').reverse().join('/')}</p>
            <p style="font-size: 0.85rem; color: #aaa; margin: 5px 0;"><b>Tema:</b> ${festa.tema}</p>
            <p style="font-size: 0.85rem; color: #aaa; margin: 5px 0;"><b>Local:</b> ${festa.local}</p>
            <p style="font-size: 0.85rem; color: #00c853; margin: 5px 0;"><b>Frete:</b> R$ ${festa.frete || "0,00"}</p>
        `;
        container.appendChild(card);
    });
}

document.getElementById('frete-km')?.addEventListener('input', () => {
    const km = parseFloat(document.getElementById('frete-km').value) || 0;
    const preco = parseFloat(document.getElementById('frete-preco').value) || 8.00;
    const total = (km * 2 / 9) * preco;
    document.getElementById('total-frete').textContent = `R$ ${total.toFixed(2)}`;
});
document.getElementById('frete-preco')?.addEventListener('input', () => {
    document.getElementById('frete-km').dispatchEvent(new Event('input'));
});

document.getElementById('form-agendar-festa')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    try {
        await addDoc(collection(db, "festas"), {
            idSubsite: subsiteAtualId,
            nome: document.getElementById('festa-nome').value,
            cpf: document.getElementById('festa-cpf').value,
            telefone: document.getElementById('festa-telefone').value,
            data: document.getElementById('festa-data').value,
            tema: document.getElementById('festa-tema').value,
            local: document.getElementById('festa-local').value,
            obs: document.getElementById('festa-obs').value,
            frete: document.getElementById('total-frete').textContent.replace('R$ ', '')
        });
        document.getElementById('form-agendar-festa').reset();
        document.getElementById('modal-agendar-festa').style.display = 'none';
        carregarFestas(subsiteAtualId);
    } catch (error) { alert("Erro ao salvar."); }
    finally { carregar(false); }
});

document.getElementById('btn-relatorios')?.addEventListener('click', () => {
    document.getElementById('modal-relatorios').style.display = 'flex';
    const tbody = document.getElementById('tabela-relatorio');
    tbody.innerHTML = "";
    festasGlobais.forEach(f => {
        tbody.innerHTML += `<tr style="border-bottom: 1px solid #222;"><td style="padding: 10px;">${f.nome}</td><td style="padding: 10px;">${f.tema}</td><td style="padding: 10px;">${f.data.split('-').reverse().join('/')}</td></tr>`;
    });
});

// ==========================================
// 8. MODAIS DE CATÁLOGO E KITS
// ==========================================
document.getElementById('btn-abrir-catalogo')?.addEventListener('click', () => document.getElementById('modal-catalogo').style.display = 'flex');
document.getElementById('btn-abrir-kits')?.addEventListener('click', () => document.getElementById('modal-kits').style.display = 'flex');
document.getElementById('btn-agendar-festa')?.addEventListener('click', () => document.getElementById('modal-agendar-festa').style.display = 'flex');

document.getElementById('btn-neo-wave')?.addEventListener('click', () => document.getElementById('neo-wave-chat').style.display = 'flex');
document.getElementById('btn-fechar-neo-wave')?.addEventListener('click', () => document.getElementById('neo-wave-chat').style.display = 'none');

document.getElementById('btn-neo-wave-enviar')?.addEventListener('click', () => {
    const input = document.getElementById('neo-wave-input');
    const body = document.getElementById('neo-wave-body');
    if(!input.value) return;

    body.innerHTML += `<div class="msg-user">${input.value}</div>`;
    const msg = input.value.toLowerCase();
    input.value = "";

    setTimeout(() => {
        let resposta = "Ainda estou aprendendo a responder isso. Tente falar sobre 'agendar', 'kits' ou 'catálogo'.";
        if (msg.includes('agendar') || msg.includes('festa')) resposta = "Para agendar, clique no botão 'Agendar Festa'. Lá você preenche os dados e a calculadora de frete já faz o cálculo!";
        if (msg.includes('kit')) resposta = "O Gerador de Kits está disponível para planos Pro pra cima. Clique no card 'Kits'!";
        if (msg.includes('relatorio') || msg.includes('relatório')) resposta = "A planilha de relatórios fica no card 'Relatórios' e mostra todas as festas do mês.";
        
        body.innerHTML += `<div class="msg-bot">${resposta}</div>`;
        body.scrollTop = body.scrollHeight;
    }, 800);
});

document.querySelectorAll('[id^="btn-fechar-modal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('[id^="modal-"]').style.display = 'none';
    });
});
document.getElementById('btn-fechar-relatorios')?.addEventListener('click', () => document.getElementById('modal-relatorios').style.display = 'none');

// ==========================================
// 9. OBSERVADOR DE ESTADO
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (!user.emailVerified) mostrarTela('tela-verificacao');
        else { carregarDadosCliente(user.uid); mostrarTela('tela-cliente'); }
    } else {
        mostrarTela('tela-boas-vindas');
    }
});
