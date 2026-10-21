// ==========================================
// 1. IMPORTAÇÕES DO FIREBASE
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
// 2. CONFIGURAÇÃO DO FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAdwwjbpyvTU5afvNzcHaBm-T-ShueHicU",
  authDomain: "neo-flux-c91c8.firebaseapp.com",
  projectId: "neo-flux-c91c8",
  storageBucket: "neo-flux-c91c8.firebasestorage.app",
  messagingSenderId: "6686219198",
  appId: "1:6686219198:web:e2f0b16808e5f3d251b7ef",
  measurementId: "G-FR4TF3VMBB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variável global para guardar qual subsite está aberto no momento
let subsiteAtualId = "";

// ==========================================
// 3. REGRAS DE NEGÓCIO E TEXTOS
// ==========================================
const termosPlanos = {
    start: `<h3>Plano Start — R$ 49,99 mensais</h3><p>A assinatura Start concede...</p><p class="destaque-aviso"><strong>IMPORTANTE: Caso tenha atualização do site, o aviso será enviado APENAS pelo nosso Instagram oficial!</strong></p>`,
    pro: `<h3>Plano Pro — R$ 79,99 mensais</h3><p>O plano Pro disponibiliza...</p><p class="destaque-aviso"><strong>IMPORTANTE: Caso tenha atualização do site, o aviso será enviado APENAS pelo nosso Instagram oficial!</strong></p>`,
    elite: `<h3>Plano Elite — R$ 99,99 mensais</h3><p>O plano Elite disponibiliza...</p><p class="destaque-aviso"><strong>IMPORTANTE: Caso tenha atualização do site, o aviso será enviado APENAS pelo nosso Instagram oficial!</strong></p>`,
    elite_premium: `<h3>Plano Elite Premium — R$ 149,99 mensais</h3><p>O plano Elite Premium inclui todas as ferramentas do Elite, mais o Gerador de Contratos exclusivo...</p><p class="destaque-aviso"><strong>IMPORTANTE: Caso tenha atualização do site, o aviso será enviado APENAS pelo nosso Instagram oficial!</strong></p>`
};

const limitesPlanos = {
    start: 1, pro: 1, elite: 999, elite_premium: 9999 
};

const recursosPlanos = {
    start: { contratos: false, relatorios: false },
    pro: { contratos: false, relatorios: true },
    elite: { contratos: false, relatorios: true },
    elite_premium: { contratos: true, relatorios: true }
};

// ==========================================
// 4. CONTROLE DE TELAS
// ==========================================
let dadosCliente = { nome: "", documento: "", aceitouTermos: false, plano: "" };
const todasAsTelas = document.querySelectorAll('.tela');
const msgStatus = document.getElementById('mensagem-status');

function mostrarTela(idDaTela) {
    todasAsTelas.forEach(tela => tela.classList.remove('ativa'));
    const telaAlvo = document.getElementById(idDaTela);
    if (telaAlvo) telaAlvo.classList.add('ativa');
    if (msgStatus) { msgStatus.textContent = ""; msgStatus.className = "mensagem"; }
    window.scrollTo(0, 0);
}

// Navegação Básica
document.getElementById('btn-comecar')?.addEventListener('click', () => mostrarTela('tela-planos'));
document.getElementById('voltar-inicio')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-boas-vindas'); });
document.getElementById('ir-para-login')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-login'); });
document.getElementById('voltar-para-cadastro')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-boas-vindas'); });
document.getElementById('ir-para-recuperar')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-recuperar'); });
document.getElementById('voltar-login-rec')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-login'); });
document.getElementById('btn-ir-para-login')?.addEventListener('click', () => mostrarTela('tela-login'));
document.getElementById('btn-voltar-cliente')?.addEventListener('click', () => mostrarTela('tela-cliente'));

// ==========================================
// 5. SELEÇÃO DE PLANO, TERMOS E CADASTRO
// ==========================================
document.querySelectorAll('.btn-selecionar-plano').forEach(botao => {
    botao.addEventListener('click', (e) => {
        const card = e.target.closest('.card-plano');
        dadosCliente.plano = card.getAttribute('data-plano');
        const nomePlano = card.querySelector('h3').textContent;
        document.getElementById('titulo-termos').textContent = `Termos e Condições - ${nomePlano}`;
        document.getElementById('texto-termos').innerHTML = termosPlanos[dadosCliente.plano] || "<p>Termos em atualização.</p>";
        mostrarTela('tela-termos');
    });
});

document.getElementById('form-termos')?.addEventListener('submit', (e) => {
    e.preventDefault();
    dadosCliente.nome = document.getElementById('nome-cliente').value;
    dadosCliente.documento = document.getElementById('doc-cliente').value;
    dadosCliente.aceitouTermos = document.getElementById('aceite-termos').checked;
    document.getElementById('resumo-plano-conta').textContent = dadosCliente.plano.toUpperCase();
    mostrarTela('tela-criar-conta');
});

document.getElementById('form-cadastro-final')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-cadastro').value;
    const senha = document.getElementById('senha-cadastro').value;
    const btn = e.target.querySelector('button');

    try {
        btn.textContent = "Criando...";
        btn.disabled = true;
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        await updateProfile(userCredential.user, { displayName: dadosCliente.nome });
        await sendEmailVerification(userCredential.user);
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
            nome: dadosCliente.nome, documento: dadosCliente.documento, email: email,
            planoPreferido: dadosCliente.plano, aceitouTermos: dadosCliente.aceitouTermos,
            statusPagamento: "pendente", criadoEm: new Date()
        });
        document.getElementById('resumo-plano-pagamento').textContent = dadosCliente.plano.toUpperCase();
        document.getElementById('resumo-nome-pagamento').textContent = dadosCliente.nome;
        mostrarTela('tela-pagamento');
    } catch (error) {
        alert("Erro ao cadastrar: " + error.message);
    } finally {
        btn.textContent = "Criar minha conta";
        btn.disabled = false;
    }
});

// Login e Recuperação
document.getElementById('btn-ja-verifiquei')?.addEventListener('click', async () => {
    if (auth.currentUser) {
        await auth.currentUser.reload(); 
        if (auth.currentUser.emailVerified) {
            carregarDadosCliente(auth.currentUser.uid);
            mostrarTela('tela-cliente');
        } else { alert("E-mail ainda não verificado."); }
    }
});

document.getElementById('btn-reenviar-email')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (auth.currentUser) {
        try { await sendEmailVerification(auth.currentUser); alert("E-mail reenviado!"); } 
        catch (error) { alert("Aguarde para reenviar."); }
    }
});

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, document.getElementById('email-login').value, document.getElementById('senha-login').value);
        if (!userCredential.user.emailVerified) {
            mostrarTela('tela-verificacao');
            alert("Verifique seu e-mail antes de entrar.");
        } else {
            carregarDadosCliente(userCredential.user.uid);
            mostrarTela('tela-cliente');
        }
    } catch (error) { alert("E-mail ou senha incorretos."); }
});

document.getElementById('form-recuperar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await sendPasswordResetEmail(auth, document.getElementById('email-recuperar').value);
        alert("Link de recuperação enviado!");
    } catch (error) { alert("Erro ao enviar."); }
});

// ==========================================
// 6. ÁREA DO CLIENTE E SUBSITES
// ==========================================
async function carregarDadosCliente(uid) {
    try {
        const docSnap = await getDoc(doc(db, "usuarios", uid));
        if (docSnap.exists()) {
            const dados = docSnap.data();
            document.getElementById('cliente-nome').textContent = dados.nome;
            document.getElementById('cliente-email').textContent = dados.email;
            document.getElementById('cliente-plano').textContent = dados.planoPreferido.toUpperCase();
            
            const statusEl = document.getElementById('cliente-status');
            if (dados.statusPagamento === "pendente") { statusEl.textContent = "Pendente (Aguardando Pagamento)"; statusEl.style.color = "#ff9800"; }
            else if (dados.statusPagamento === "upgrade_pendente") { statusEl.textContent = "Upgrade em Análise"; statusEl.style.color = "#00d2ff"; }
            else { statusEl.textContent = "Ativo (Pagamento Confirmado)"; statusEl.style.color = "#00c853"; }

            const limite = limitesPlanos[dados.planoPreferido] || 1;
            document.getElementById('limite-subsites').textContent = limite === 9999 ? "ilimitados" : limite;

            carregarSubsites(uid, limite);
        }
    } catch (error) { console.error(error); }
}

document.getElementById('btn-pedir-upgrade')?.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    if (confirm("Você deseja solicitar um upgrade de plano?\n\nNossa equipe verificará o pagamento.")) {
        await updateDoc(doc(db, "usuarios", auth.currentUser.uid), { statusPagamento: "upgrade_pendente" });
        alert("Solicitação enviada!");
        carregarDadosCliente(auth.currentUser.uid);
    }
});

async function carregarSubsites(uidDono, limite) {
    const lista = document.getElementById('lista-subsites');
    const btnCriar = document.getElementById('btn-criar-subsite');
    const inputTitulo = document.getElementById('titulo-subsite');
    if (!lista) return;
    
    try {
        const querySnapshot = await getDocs(query(collection(db, "subsites"), where("idDono", "==", uidDono)));
        lista.innerHTML = ""; 

        if (querySnapshot.size >= limite) {
            btnCriar.disabled = true; btnCriar.textContent = "Limite Atingido"; btnCriar.style.background = "#555";
            inputTitulo.disabled = true;
        } else {
            btnCriar.disabled = false; btnCriar.textContent = "Criar Subsite"; btnCriar.style.background = "";
            inputTitulo.disabled = false;
        }

        querySnapshot.forEach((docSnap) => {
            const subsite = docSnap.data();
            const li = document.createElement('li');
            li.style.cssText = "border: 1px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: #0a0a0a;";

            li.innerHTML = `
                <div>
                    <strong style="font-size: 1.1rem; color: var(--cor-azul);">${subsite.titulo}</strong> <br>
                    <small style="color: #888;">Criado em: ${subsite.criadoEm.toDate().toLocaleDateString()}</small>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-acessar-subsite" data-id="${docSnap.id}" style="background: #00d2ff; color: #000; border: none; padding: 8px; border-radius: 6px; cursor: pointer;"><i data-lucide="external-link" style="width: 18px; height: 18px;"></i></button>
                    <button class="btn-editar-subsite" data-id="${docSnap.id}" data-titulo="${subsite.titulo}" style="background: #f39c12; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer;"><i data-lucide="edit" style="width: 18px; height: 18px;"></i></button>
                    <button class="btn-apagar-subsite" data-id="${docSnap.id}" style="background: #e74c3c; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer;"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></button>
                </div>
            `;
            lista.appendChild(li);
        });

        if (querySnapshot.size === 0) lista.innerHTML = "<li>Você ainda não criou nenhum subsite.</li>";
        
        adicionarEventosSubsite(uidDono, limite);
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) { console.error(error); }
}

document.getElementById('btn-criar-subsite')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    const input = document.getElementById('titulo-subsite');
    const titulo = input.value.trim();
    if (!user || titulo === "") return;

    try {
        await addDoc(collection(db, "subsites"), { idDono: user.uid, titulo: titulo, criadoEm: new Date() });
        input.value = ""; 
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        carregarSubsites(user.uid, limitesPlanos[userDoc.data().planoPreferido] || 1); 
    } catch (error) { alert("Erro ao criar."); }
});

function adicionarEventosSubsite(uidDono, limite) {
    document.querySelectorAll('.btn-apagar-subsite').forEach(btn => btn.addEventListener('click', async (e) => {
        if (confirm("Apagar subsite?")) {
            await deleteDoc(doc(db, "subsites", e.target.closest('button').getAttribute('data-id')));
            carregarSubsites(uidDono, limite);
        }
    }));

    document.querySelectorAll('.btn-editar-subsite').forEach(btn => btn.addEventListener('click', async (e) => {
        const botao = e.target.closest('button');
        const novo = prompt("Novo título:", botao.getAttribute('data-titulo'));
        if (novo && novo.trim() !== "") {
            await updateDoc(doc(db, "subsites", botao.getAttribute('data-id')), { titulo: novo.trim() });
            carregarSubsites(uidDono, limite);
        }
    }));

    // Evento Acessar (Gatekeeping)
    document.querySelectorAll('.btn-acessar-subsite').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.target.closest('button').getAttribute('data-id');
        subsiteAtualId = id; // Salva o ID global

        const docSnap = await getDoc(doc(db, "subsites", id));
        if (docSnap.exists()) {
            document.getElementById('nome-do-subsite').textContent = docSnap.data().titulo;
            
            const userDoc = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
            const regras = recursosPlanos[userDoc.data().planoPreferido] || recursosPlanos.start;

            // Contratos (Apenas Premium)
            const btnContrato = document.getElementById('btn-gerador-contrato');
            if (regras.contratos) {
                btnContrato.disabled = false; btnContrato.textContent = "Acessar"; btnContrato.style.background = "var(--gradiente-neo)";
            } else {
                btnContrato.disabled = true; btnContrato.innerHTML = "🔒 Elite Premium"; btnContrato.style.background = "#333";
            }

            // Relatórios (Pro pra cima)
            const btnRelatorios = document.getElementById('btn-relatorios');
            const txtRelatorio = document.getElementById('txt-relatorio');
            if (regras.relatorios) {
                btnRelatorios.disabled = false; btnRelatorios.textContent = "Ver Relatório"; btnRelatorios.style.background = "var(--gradiente-neo)";
                txtRelatorio.textContent = "Vendas mensais.";
            } else {
                btnRelatorios.disabled = true; btnRelatorios.innerHTML = "🔒 Pro ou superior"; btnRelatorios.style.background = "#333";
                txtRelatorio.textContent = "Indisponível no Start.";
            }

            carregarFestas(id); // Busca os cards de festas
            mostrarTela('tela-subsite');
        }
    }));
}

// ==========================================
// 7. LÓGICA DE FESTAS E CATÁLOGO (MODAIS)
// ==========================================
async function carregarFestas(idSubsite) {
    const container = document.getElementById('lista-festas-criadas');
    container.innerHTML = "<p style='color: #888;'>Buscando festas...</p>";
    
    try {
        const q = query(collection(db, "festas"), where("idSubsite", "==", idSubsite));
        const snap = await getDocs(q);
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p style='color: #888;'>Nenhuma festa agendada ainda.</p>";
            return;
        }

        snap.forEach(doc => {
            const festa = doc.data();
            const card = document.createElement('div');
            card.style.cssText = "background: #121212; border: 1px solid #333; border-radius: 8px; padding: 15px; text-align: left;";
            card.innerHTML = `
                <h4 style="color: var(--cor-azul); margin: 0 0 10px 0;">${festa.nome}</h4>
                <p style="font-size: 0.8rem; margin: 3px 0; color: #ccc;"><b>Data:</b> ${festa.data.split('-').reverse().join('/')}</p>
                <p style="font-size: 0.8rem; margin: 3px 0; color: #ccc;"><b>Tema:</b> ${festa.tema}</p>
                <p style="font-size: 0.8rem; margin: 3px 0; color: #ccc;"><b>Local:</b> ${festa.local}</p>
                <p style="font-size: 0.8rem; margin: 3px 0; color: #ccc;"><b>Tel:</b> ${festa.telefone}</p>
            `;
            container.appendChild(card);
        });
    } catch (error) { console.error(error); }
}

document.getElementById('btn-agendar-festa')?.addEventListener('click', () => {
    document.getElementById('modal-agendar-festa').style.display = 'flex';
});
document.getElementById('btn-fechar-modal-festa')?.addEventListener('click', () => {
    document.getElementById('modal-agendar-festa').style.display = 'none';
});

document.getElementById('form-agendar-festa')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = "Agendando..."; btn.disabled = true;

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
            criadoEm: new Date()
        });
        document.getElementById('form-agendar-festa').reset();
        document.getElementById('modal-agendar-festa').style.display = 'none';
        carregarFestas(subsiteAtualId);
    } catch (error) { alert("Erro ao agendar."); }
    finally { btn.textContent = "Agendar"; btn.disabled = false; }
});

document.getElementById('btn-abrir-catalogo')?.addEventListener('click', () => {
    document.getElementById('modal-catalogo').style.display = 'flex';
    carregarCatalogo(subsiteAtualId);
});
document.getElementById('btn-fechar-modal-catalogo')?.addEventListener('click', () => {
    document.getElementById('modal-catalogo').style.display = 'none';
});

document.getElementById('btn-add-item')?.addEventListener('click', async () => {
    const nome = document.getElementById('cat-nome').value;
    const cat = document.getElementById('cat-categoria').value;
    if (!nome) return alert("Digite o nome do item");

    await addDoc(collection(db, "catalogo"), {
        idSubsite: subsiteAtualId, nome: nome, categoria: cat, criadoEm: new Date()
    });
    
    document.getElementById('cat-nome').value = "";
    document.getElementById('cat-categoria').value = "";
    carregarCatalogo(subsiteAtualId);
});

async function carregarCatalogo(idSubsite) {
    const lista = document.getElementById('lista-catalogo');
    lista.innerHTML = "<li>Carregando...</li>";
    try {
        const q = query(collection(db, "catalogo"), where("idSubsite", "==", idSubsite));
        const snap = await getDocs(q);
        lista.innerHTML = "";
        if (snap.empty) { lista.innerHTML = "<li>Nenhum item no catálogo.</li>"; return; }
        
        snap.forEach(doc => {
            const item = doc.data();
            const li = document.createElement('li');
            li.style.cssText = "background: #000; padding: 10px; margin-bottom: 5px; border-radius: 6px; display: flex; justify-content: space-between; border: 1px solid #333;";
            li.innerHTML = `<span><b>${item.nome}</b> <span style="color: #888; font-size: 0.8rem;">(${item.categoria})</span></span>`;
            lista.appendChild(li);
        });
    } catch (error) { console.error(error); }
}

// ==========================================
// 8. OBSERVADOR DE ESTADO
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (!user.emailVerified) mostrarTela('tela-verificacao');
        else { carregarDadosCliente(user.uid); mostrarTela('tela-cliente'); }
    } else {
        mostrarTela('tela-boas-vindas');
    }
});
