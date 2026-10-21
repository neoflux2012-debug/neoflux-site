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
    start: 1,
    pro: 1,
    elite: 999,
    elite_premium: 9999 
};

// O CÉREBRO DO SISTEMA (Baseado na sua imagem)
const recursosPlanos = {
    start: { reunioes: false, historico: "1 mês", assistente: false },
    pro: { reunioes: "Até 10", historico: "2 meses", assistente: true },
    elite: { reunioes: "Ilimitadas", historico: "Mais de 2 meses", assistente: true },
    elite_premium: { reunioes: "Ilimitadas", historico: "Ilimitado", assistente: true }
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

function mostrarMensagem(texto, tipo) {
    if (msgStatus) { msgStatus.textContent = texto; msgStatus.className = `mensagem ${tipo}`; }
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
// 5. SELEÇÃO DE PLANO E TERMOS
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

// ==========================================
// 6. CRIAÇÃO DE CONTA
// ==========================================
document.getElementById('form-cadastro-final')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-cadastro').value;
    const senha = document.getElementById('senha-cadastro').value;
    const btn = e.target.querySelector('button');

    try {
        btn.textContent = "Criando...";
        btn.disabled = true;
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;
        await updateProfile(user, { displayName: dadosCliente.nome });
        await sendEmailVerification(user);
        await setDoc(doc(db, "usuarios", user.uid), {
            nome: dadosCliente.nome,
            documento: dadosCliente.documento,
            email: email,
            planoPreferido: dadosCliente.plano,
            aceitouTermos: dadosCliente.aceitouTermos,
            statusPagamento: "pendente", 
            criadoEm: new Date()
        });
        document.getElementById('resumo-plano-pagamento').textContent = dadosCliente.plano.toUpperCase();
        document.getElementById('resumo-nome-pagamento').textContent = dadosCliente.nome;
        mostrarTela('tela-pagamento');
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') mostrarMensagem("Este e-mail já está cadastrado.", "erro");
        else if (error.code === 'auth/weak-password') mostrarMensagem("A senha precisa ter no mínimo 6 caracteres.", "erro");
        else mostrarMensagem("Erro: " + error.message, "erro");
    } finally {
        btn.textContent = "Criar minha conta";
        btn.disabled = false;
    }
});

// ==========================================
// 7. VERIFICAÇÃO, LOGIN E RECUPERAÇÃO
// ==========================================
document.getElementById('btn-ja-verifiquei')?.addEventListener('click', async () => {
    if (auth.currentUser) {
        await auth.currentUser.reload(); 
        if (auth.currentUser.emailVerified) {
            carregarDadosCliente(auth.currentUser.uid);
            mostrarTela('tela-cliente');
        } else { mostrarMensagem("E-mail ainda não verificado.", "erro"); }
    }
});

document.getElementById('btn-reenviar-email')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (auth.currentUser) {
        try { await sendEmailVerification(auth.currentUser); mostrarMensagem("E-mail reenviado!", "sucesso"); } 
        catch (error) { mostrarMensagem("Aguarde para reenviar.", "erro"); }
    }
});

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-login').value;
    const senha = document.getElementById('senha-login').value;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        if (!userCredential.user.emailVerified) {
            mostrarTela('tela-verificacao');
            mostrarMensagem("Verifique seu e-mail antes de entrar.", "info");
        } else {
            carregarDadosCliente(userCredential.user.uid);
            mostrarTela('tela-cliente');
        }
    } catch (error) { mostrarMensagem("E-mail ou senha incorretos.", "erro"); }
});

document.getElementById('form-recuperar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await sendPasswordResetEmail(auth, document.getElementById('email-recuperar').value);
        mostrarMensagem("Link de recuperação enviado!", "sucesso");
    } catch (error) { mostrarMensagem("Erro ao enviar.", "erro"); }
});

// ==========================================
// 8. ÁREA DO CLIENTE E SUBSITES
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
            if (dados.statusPagamento === "pendente") {
                statusEl.textContent = "Pendente (Aguardando Pagamento)";
                statusEl.style.color = "#ff9800";
            } else if (dados.statusPagamento === "upgrade_pendente") {
                statusEl.textContent = "Upgrade em Análise";
                statusEl.style.color = "#00d2ff";
            } else {
                statusEl.textContent = "Ativo (Pagamento Confirmado)";
                statusEl.style.color = "#00c853";
            }

            const limite = limitesPlanos[dados.planoPreferido] || 1;
            const labelLimite = document.getElementById('limite-subsites');
            if (labelLimite) labelLimite.textContent = limite === 9999 ? "ilimitados" : limite;

            carregarSubsites(uid, limite);
        }
    } catch (error) { console.error("Erro ao buscar dados:", error); }
}

// Evento para pedir Upgrade de Plano
document.getElementById('btn-pedir-upgrade')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const confirmar = confirm("Você deseja solicitar um upgrade de plano?\n\nNossa equipe verificará o pagamento e liberará o novo plano no seu painel.");
    if (!confirmar) return;

    try {
        await updateDoc(doc(db, "usuarios", user.uid), { statusPagamento: "upgrade_pendente" });
        alert("Solicitação enviada! Aguarde a aprovação da nossa equipe.");
        carregarDadosCliente(user.uid);
    } catch (error) {
        console.error(error);
        alert("Erro ao solicitar upgrade.");
    }
});

async function carregarSubsites(uidDono, limite) {
    const lista = document.getElementById('lista-subsites');
    const btnCriar = document.getElementById('btn-criar-subsite');
    const inputTitulo = document.getElementById('titulo-subsite');
    if (!lista) return;
    
    try {
        const q = query(collection(db, "subsites"), where("idDono", "==", uidDono));
        const querySnapshot = await getDocs(q);
        lista.innerHTML = ""; 

        if (querySnapshot.size >= limite) {
            if(btnCriar) { btnCriar.disabled = true; btnCriar.textContent = "Limite Atingido"; btnCriar.style.background = "#555"; }
            if(inputTitulo) inputTitulo.disabled = true;
        } else {
            if(btnCriar) { btnCriar.disabled = false; btnCriar.textContent = "Criar Subsite"; btnCriar.style.background = ""; }
            if(inputTitulo) inputTitulo.disabled = false;
        }

        querySnapshot.forEach((docSnap) => {
            const subsite = docSnap.data();
            const idSubsite = docSnap.id;
            const li = document.createElement('li');
            li.style.cssText = "border: 1px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: #0a0a0a;";

            li.innerHTML = `
                <div>
                    <strong style="font-size: 1.1rem; color: var(--cor-azul);">${subsite.titulo}</strong> <br>
                    <small style="color: #888;">Criado em: ${subsite.criadoEm.toDate().toLocaleDateString()}</small>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-acessar-subsite" data-id="${idSubsite}" style="background: #00d2ff; color: #000; border: none; padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Acessar Subsite">
                        <i data-lucide="external-link" style="width: 18px; height: 18px;"></i>
                    </button>
                    <button class="btn-editar-subsite" data-id="${idSubsite}" data-titulo="${subsite.titulo}" style="background: #f39c12; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="edit" style="width: 18px; height: 18px;"></i>
                    </button>
                    <button class="btn-apagar-subsite" data-id="${idSubsite}" style="background: #e74c3c; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
                    </button>
                </div>
            `;
            lista.appendChild(li);
        });

        if (querySnapshot.size === 0) { lista.innerHTML = "<li>Você ainda não criou nenhum subsite.</li>"; }
        adicionarEventosBotoesSubsite(uidDono, limite);
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        console.error("Erro ao carregar subsites:", error);
        lista.innerHTML = "<li>Erro ao carregar subsites.</li>";
    }
}

document.getElementById('btn-criar-subsite')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    const inputTitulo = document.getElementById('titulo-subsite');
    const titulo = inputTitulo ? inputTitulo.value.trim() : "";
    if (!user || titulo === "") return;

    const btn = document.getElementById('btn-criar-subsite');
    btn.textContent = "Criando...";
    btn.disabled = true;

    try {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        const limite = limitesPlanos[userDoc.data().planoPreferido] || 1;
        await addDoc(collection(db, "subsites"), { idDono: user.uid, titulo: titulo, criadoEm: new Date() });
        if (inputTitulo) inputTitulo.value = ""; 
        carregarSubsites(user.uid, limite); 
    } catch (error) {
        alert("Erro ao criar subsite: " + error.message);
        btn.textContent = "Criar Subsite";
        btn.disabled = false;
    }
});

function adicionarEventosBotoesSubsite(uidDono, limite) {
    document.querySelectorAll('.btn-apagar-subsite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const botao = e.target.closest('.btn-apagar-subsite');
            const id = botao.getAttribute('data-id');
            if (confirm("Tem certeza que deseja apagar este subsite?")) {
                try {
                    await deleteDoc(doc(db, "subsites", id));
                    carregarSubsites(uidDono, limite);
                } catch (error) { alert("Erro ao apagar: " + error.message); }
            }
        });
    });

    document.querySelectorAll('.btn-editar-subsite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const botao = e.target.closest('.btn-editar-subsite');
            const id = botao.getAttribute('data-id');
            const tituloAtual = botao.getAttribute('data-titulo');
            const novoTitulo = prompt("Edite o título do subsite:", tituloAtual);
            if (novoTitulo && novoTitulo.trim() !== "" && novoTitulo !== tituloAtual) {
                try {
                    await updateDoc(doc(db, "subsites", id), { titulo: novoTitulo.trim() });
                    carregarSubsites(uidDono, limite);
                } catch (error) { alert("Erro ao editar: " + error.message); }
            }
        });
    });

    // Evento Acessar (Lógica de Gatekeeping)
    document.querySelectorAll('.btn-acessar-subsite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const botao = e.target.closest('.btn-acessar-subsite');
            const id = botao.getAttribute('data-id');
            try {
                const docRef = doc(db, "subsites", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const dadosSubsite = docSnap.data();
                    const userDoc = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
                    const planoUsuario = userDoc.data().planoPreferido;
                    
                    // Puxa as regras do plano atual
                    const regras = recursosPlanos[planoUsuario] || recursosPlanos.start;

                    document.getElementById('titulo-subsite-visualizacao').textContent = `Visualizando: ${dadosSubsite.titulo}`;
                    document.getElementById('nome-do-subsite').textContent = dadosSubsite.titulo;

                    // --- 1. VALIDANDO CONTRATOS ---
                    const btnContrato = document.getElementById('btn-gerador-contrato');
                    if (planoUsuario === 'elite_premium') {
                        btnContrato.disabled = false;
                        btnContrato.textContent = "Gerar Contrato Agora";
                        btnContrato.style.background = "var(--gradiente-neo)";
                        btnContrato.style.cursor = "pointer";
                    } else {
                        btnContrato.disabled = true;
                        btnContrato.innerHTML = "🔒 Bloqueado (Elite Premium)";
                        btnContrato.style.background = "#333";
                        btnContrato.style.cursor = "not-allowed";
                    }

                    // --- 2. VALIDANDO REUNIÕES ---
                    const btnReunioes = document.getElementById('btn-reunioes');
                    const txtReunioes = document.getElementById('txt-reunioes');
                    if (regras.reunioes) {
                        btnReunioes.disabled = false;
                        btnReunioes.textContent = "Agendar Reunião";
                        btnReunioes.style.background = "var(--gradiente-neo)";
                        btnReunioes.style.cursor = "pointer";
                        txtReunioes.textContent = "Limite: " + regras.reunioes;
                    } else {
                        btnReunioes.disabled = true;
                        btnReunioes.innerHTML = "🔒 Bloqueado (Pro ou superior)";
                        btnReunioes.style.background = "#333";
                        btnReunioes.style.cursor = "not-allowed";
                    }

                    // --- 3. VALIDANDO HISTÓRICO ---
                    const btnPontos = document.getElementById('btn-pontos');
                    const txtPontos = document.getElementById('txt-pontos');
                    btnPontos.disabled = false;
                    btnPontos.textContent = "Ver Histórico";
                    btnPontos.style.background = "var(--gradiente-neo)";
                    btnPontos.style.cursor = "pointer";
                    txtPontos.textContent = "Histórico de: " + regras.historico;

                    mostrarTela('tela-subsite');
                }
            } catch (error) {
                console.error("Erro ao acessar subsite:", error);
            }
        });
    });
}

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
