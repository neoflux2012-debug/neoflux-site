// ==========================================
// 1. IMPORTAÇÕES DO FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    updateProfile,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 2. CONFIGURAÇÃO DO FIREBASE (SUAS CHAVES)
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
// 3. TEXTOS DOS TERMOS
// ==========================================
const termosPlanos = {
    start: `<h3>Plano Start — R$ 49,99 mensais</h3><p>A assinatura Start concede ao contratante acesso aos recursos da plataforma Neo Flux previstos neste documento...</p><p class="destaque-aviso"><strong>IMPORTANTE: Caso tenha atualização do site, o aviso será enviado APENAS pelo nosso Instagram oficial!</strong></p>`,
    pro: `<h3>Plano Pro — R$ 79,99 mensais</h3><p>O plano Pro disponibiliza recursos de gestão de festas e eventos...</p><p class="destaque-aviso"><strong>IMPORTANTE: Caso tenha atualização do site, o aviso será enviado APENAS pelo nosso Instagram oficial!</strong></p>`,
    elite: `<h3>Plano Elite — R$ 99,99 mensais</h3><p>O plano Elite disponibiliza os recursos avançados...</p><p class="destaque-aviso"><strong>IMPORTANTE: Caso tenha atualização do site, o aviso será enviado APENAS pelo nosso Instagram oficial!</strong></p>`
};

// ==========================================
// 4. VARIÁVEIS GLOBAIS E CONTROLE DE TELAS
// ==========================================
let dadosCliente = { nome: "", documento: "", aceitouTermos: false, plano: "" };
const todasAsTelas = document.querySelectorAll('.tela');
const msgStatus = document.getElementById('mensagem-status');

function mostrarTela(idDaTela) {
    todasAsTelas.forEach(tela => tela.classList.remove('ativa'));
    document.getElementById(idDaTela).classList.add('ativa');
    msgStatus.textContent = "";
    msgStatus.className = "mensagem";
    window.scrollTo(0, 0);
}

function mostrarMensagem(texto, tipo) {
    msgStatus.textContent = texto;
    msgStatus.className = `mensagem ${tipo}`;
}

// Navegação
document.getElementById('btn-comecar').addEventListener('click', () => mostrarTela('tela-planos'));
document.getElementById('voltar-inicio').addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-boas-vindas'); });
document.getElementById('ir-para-login').addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-login'); });
document.getElementById('voltar-para-cadastro').addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-boas-vindas'); });
document.getElementById('ir-para-recuperar').addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-recuperar'); });
document.getElementById('voltar-login-rec').addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-login'); });

// ==========================================
// 5. LÓGICA DE SELEÇÃO DE PLANO
// ==========================================
document.querySelectorAll('.btn-selecionar-plano').forEach(botao => {
    botao.addEventListener('click', (e) => {
        const card = e.target.closest('.card-plano');
        dadosCliente.plano = card.getAttribute('data-plano');
        
        const nomePlano = dadosCliente.plano.charAt(0).toUpperCase() + dadosCliente.plano.slice(1);
        document.getElementById('titulo-termos').textContent = `Termos e Condições - Plano ${nomePlano}`;
        document.getElementById('texto-termos').innerHTML = termosPlanos[dadosCliente.plano];
        
        mostrarTela('tela-termos');
    });
});

document.getElementById('form-termos').addEventListener('submit', (e) => {
    e.preventDefault();
    dadosCliente.nome = document.getElementById('nome-cliente').value;
    dadosCliente.documento = document.getElementById('doc-cliente').value;
    dadosCliente.aceitouTermos = document.getElementById('aceite-termos').checked;

    const nomePlano = dadosCliente.plano.charAt(0).toUpperCase() + dadosCliente.plano.slice(1);
    document.getElementById('resumo-plano-conta').textContent = nomePlano;
    mostrarTela('tela-criar-conta');
});

// ==========================================
// 6. CRIAÇÃO DE CONTA (FIREBASE)
// ==========================================
document.getElementById('form-cadastro-final').addEventListener('submit', async (e) => {
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

        mostrarTela('tela-verificacao');

    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') mostrarMensagem("Este e-mail já está cadastrado.", "erro");
        else if (error.code === 'auth/weak-password') mostrarMensagem("A senha precisa ter no mínimo 6 caracteres.", "erro");
        else mostrarMensagem("Erro ao cadastrar: " + error.message, "erro");
    } finally {
        btn.textContent = "Criar minha conta";
        btn.disabled = false;
    }
});

// ==========================================
// 7. VERIFICAÇÃO DE E-MAIL
// ==========================================
document.getElementById('btn-ja-verifiquei').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user) {
        await user.reload(); // Pede ao Firebase para atualizar os dados do usuário
        if (user.emailVerified) {
            carregarDadosCliente(user.uid);
            mostrarTela('tela-cliente');
        } else {
            mostrarMensagem("E-mail ainda não verificado. Verifique sua caixa de entrada.", "erro");
        }
    }
});

document.getElementById('btn-reenviar-email').addEventListener('click', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user) {
        try {
            await sendEmailVerification(user);
            mostrarMensagem("Novo e-mail de verificação enviado!", "sucesso");
        } catch (error) {
            mostrarMensagem("Aguarde alguns minutos antes de reenviar.", "erro");
        }
    }
});

// ==========================================
// 8. LOGIN
// ==========================================
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-login').value;
    const senha = document.getElementById('senha-login').value;
    const btn = e.target.querySelector('button');

    try {
        btn.textContent = "Entrando...";
        btn.disabled = true;

        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        if (!user.emailVerified) {
            mostrarTela('tela-verificacao');
            mostrarMensagem("Por favor, verifique seu e-mail antes de entrar.", "info");
        } else {
            carregarDadosCliente(user.uid);
            mostrarTela('tela-cliente');
        }
    } catch (error) {
        console.error(error);
        mostrarMensagem("E-mail ou senha incorretos.", "erro");
    } finally {
        btn.textContent = "Entrar";
        btn.disabled = false;
    }
});

// ==========================================
// 9. RECUPERAR SENHA
// ==========================================
document.getElementById('form-recuperar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-recuperar').value;
    
    try {
        await sendPasswordResetEmail(auth, email);
        mostrarMensagem("Link de recuperação enviado para o seu e-mail!", "sucesso");
        document.getElementById('form-recuperar').reset();
    } catch (error) {
        mostrarMensagem("Erro ao enviar. Verifique o e-mail digitado.", "erro");
    }
});

// ==========================================
// 10. ÁREA DO CLIENTE E LOGOUT
// ==========================================
async function carregarDadosCliente(uid) {
    try {
        const docRef = doc(db, "usuarios", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            document.getElementById('cliente-nome').textContent = dados.nome;
            document.getElementById('cliente-email').textContent = dados.email;
            document.getElementById('cliente-plano').textContent = dados.planoPreferido.toUpperCase();
            document.getElementById('cliente-status').textContent = dados.statusPagamento === "pendente" ? "Pendente (Aguardando Pagamento)" : "Ativo";
        }
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
    }
}

document.getElementById('btn-logout').addEventListener('click', async () => {
    await signOut(auth);
    mostrarTela('tela-boas-vindas');
});

document.getElementById('btn-simular-pagamento').addEventListener('click', () => {
    alert("Simulação de pagamento! No futuro, isso ativará o plano via backend.");
});

// ==========================================
// 11. OBSERVADOR DE ESTADO (MANTÉM LOGADO)
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (!user.emailVerified) {
            mostrarTela('tela-verificacao');
        } else {
            carregarDadosCliente(user.uid);
            mostrarTela('tela-cliente');
        }
    } else {
        mostrarTela('tela-boas-vindas');
    }
});
