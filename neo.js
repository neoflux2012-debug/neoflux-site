// ==========================================
// 1. IMPORTAÇÕES DO FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification,
    signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 2. CONFIGURAÇÃO
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAdwwjbpyvTU5afvNzcHaBm-T-ShueHicU",
  authDomain: "neo-flux-c91c8.firebaseapp.com",
  projectId: "neo-flux-c91c8",
  storageBucket: "neo-flux-c91c8.firebasestorage.app",
  messagingSenderId: "6686219198",
  appId: "1:6686219198:web:e2f0b16808e5f3d251b7ef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 3. TEXTOS DOS TERMOS
// ==========================================
const termosPlanos = {
    start: `<h3>Plano Start</h3><p>...</p>`,
    pro: `<h3>Plano Pro</h3><p>...</p>`,
    elite: `<h3>Plano Elite</h3><p>...</p>`,
    elite_premium: `<h3>Plano Elite Premium</h3><p>O plano definitivo com gerador de contratos...</p>`
};

// NOVO: Adicionando o Elite Premium
const limitesPlanos = {
    start: 1,
    pro: 1,
    elite: 999,
    elite_premium: 9999 // Praticamente ilimitado
};

// ==========================================
// 4. VARIÁVEIS GLOBAIS E CONTROLE DE TELAS
// ==========================================
let dadosCliente = { nome: "", documento: "", aceitouTermos: false, plano: "" };
const todasAsTelas = document.querySelectorAll('.tela');
const msgStatus = document.getElementById('mensagem-status');

function mostrarTela(idDaTela) {
    todasAsTelas.forEach(tela => tela.classList.remove('ativa'));
    const telaAlvo = document.getElementById(idDaTela);
    if (telaAlvo) telaAlvo.classList.add('ativa');
    
    if (msgStatus) {
        msgStatus.textContent = "";
        msgStatus.className = "mensagem";
    }
    window.scrollTo(0, 0);
}

function mostrarMensagem(texto, tipo) {
    if (msgStatus) {
        msgStatus.textContent = texto;
        msgStatus.className = `mensagem ${tipo}`;
    } else {
        console.warn("Elemento de mensagem não encontrado:", texto);
    }
}

// Navegação (Protegida com verificação para não quebrar se o botão não existir)
const btnComecar = document.getElementById('btn-comecar');
if (btnComecar) btnComecar.addEventListener('click', () => mostrarTela('tela-planos'));

const voltarInicio = document.getElementById('voltar-inicio');
if (voltarInicio) voltarInicio.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-boas-vindas'); });

const irParaLogin = document.getElementById('ir-para-login');
if (irParaLogin) irParaLogin.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-login'); });

const voltarCadastro = document.getElementById('voltar-para-cadastro');
if (voltarCadastro) voltarCadastro.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-boas-vindas'); });

const irParaRecuperar = document.getElementById('ir-para-recuperar');
if (irParaRecuperar) irParaRecuperar.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-recuperar'); });

const voltarLoginRec = document.getElementById('voltar-login-rec');
if (voltarLoginRec) voltarLoginRec.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-login'); });

const btnIrParaLogin = document.getElementById('btn-ir-para-login');
if (btnIrParaLogin) btnIrParaLogin.addEventListener('click', () => mostrarTela('tela-login'));


// ==========================================
// 5. SELEÇÃO DE PLANO E TERMOS
// ==========================================
document.querySelectorAll('.btn-selecionar-plano').forEach(botao => {
    botao.addEventListener('click', (e) => {
        const card = e.target.closest('.card-plano');
        dadosCliente.plano = card.getAttribute('data-plano');
        
        // Pega o nome bonitinho
        const nomePlano = card.querySelector('h3').textContent;
        document.getElementById('titulo-termos').textContent = `Termos e Condições - ${nomePlano}`;
        document.getElementById('texto-termos').innerHTML = termosPlanos[dadosCliente.plano] || "<p>Termos em atualização.</p>";
        
        mostrarTela('tela-termos');
    });
});

document.getElementById('form-termos').addEventListener('submit', (e) => {
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
        } else {
            mostrarMensagem("E-mail ainda não verificado.", "erro");
        }
    }
});

document.getElementById('btn-reenviar-email')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (auth.currentUser) {
        try {
            await sendEmailVerification(auth.currentUser);
            mostrarMensagem("E-mail reenviado!", "sucesso");
        } catch (error) { mostrarMensagem("Aguarde para reenviar.", "erro"); }
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
    } catch (error) {
        mostrarMensagem("E-mail ou senha incorretos.", "erro");
    }
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
            
            if (dados.statusPagamento === "pendente") {
                document.getElementById('cliente-status').textContent = "Pendente (Aguardando Pagamento)";
            } else {
                document.getElementById('cliente-status').textContent = "Ativo (Pagamento Confirmado)";
            }

            const limite = limitesPlanos[dados.planoPreferido] || 1;
            const labelLimite = document.getElementById('limite-subsites');
            if (labelLimite) labelLimite.textContent = limite === 9999 ? "ilimitados" : limite;

            carregarSubsites(uid, limite);
        }
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
    }
}

async function carregarSubsites(uidDono, limite) {
    const lista = document.getElementById('lista-subsites');
    const btnCriar = document.getElementById('btn-criar-subsite');
    const inputTitulo = document.getElementById('titulo-subsite');
    if(!lista) return;
    
    try {
        const q = query(collection(db, "subsites"), where("idDono", "==", uidDono));
        const querySnapshot = await getDocs(q);
        
        lista.innerHTML = ""; 

        if (querySnapshot.size >= limite) {
            btnCriar.disabled = true;
            inputTitulo.disabled = true;
            btnCriar.textContent = "Limite Atingido";
            btnCriar.style.background = "#555";
        } else {
            btnCriar.disabled = false;
            inputTitulo.disabled = false;
            btnCriar.textContent = "Criar Subsite";
            btnCriar.style.background = "";
        }

        querySnapshot.forEach((docSnap) => {
            const subsite = docSnap.data();
            const li = document.createElement('li');
            li.style.borderBottom = "1px solid #333";
            li.style.padding = "10px 0";
            li.innerHTML = `<strong>${subsite.titulo}</strong> <br><small>Criado em: ${subsite.criadoEm.toDate().toLocaleDateString()}</small>`;
            lista.appendChild(li);
        });

        if (querySnapshot.size === 0) {
            lista.innerHTML = "<li>Você ainda não criou nenhum subsite.</li>";
        }

    } catch (error) {
        console.error("Erro ao carregar subsites:", error);
        lista.innerHTML = "<li>Erro ao carregar subsites.</li>";
    }
}

document.getElementById('btn-criar-subsite')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    const inputTitulo = document.getElementById('titulo-subsite');
    const titulo = inputTitulo ? inputTitulo.value.trim() : "";

    if (!user) return;
    if (titulo === "") {
        alert("Digite um título para o subsite!");
        return;
    }

    const btn = document.getElementById('btn-criar-subsite');
    btn.textContent = "Criando...";
    btn.disabled = true;

    try {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        const plano = userDoc.data().planoPreferido;
        const limite = limitesPlanos[plano] || 1;

        await addDoc(collection(db, "subsites"), {
            idDono: user.uid,
            titulo: titulo,
            criadoEm: new Date()
        });

        if (inputTitulo) inputTitulo.value = ""; 
        carregarSubsites(user.uid, limite); 

    } catch (error) {
        alert("Erro ao criar subsite: " + error.message);
        btn.textContent = "Criar Subsite";
        btn.disabled = false;
    }
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await signOut(auth);
    mostrarTela('tela-boas-vindas');
});

// ==========================================
// 9. OBSERVADOR DE ESTADO
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
