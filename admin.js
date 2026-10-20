// ==========================================
// 1. IMPORTAÇÕES E CONFIGURAÇÃO
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// SUAS CHAVES DO FIREBASE
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
// 2. CONTROLE DE TELAS
// ==========================================
const todasAsTelas = document.querySelectorAll('.tela');
const msgStatus = document.getElementById('mensagem-status');

function mostrarTela(idDaTela) {
    todasAsTelas.forEach(tela => tela.classList.remove('ativa'));
    document.getElementById(idDaTela).classList.add('ativa');
    msgStatus.textContent = "";
}

function mostrarMensagem(texto, tipo) {
    msgStatus.textContent = texto;
    msgStatus.className = `mensagem ${tipo}`;
}

// ==========================================
// 3. LOGIN DO ADMIN
// ==========================================
document.getElementById('form-admin-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const senha = document.getElementById('admin-senha').value;

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        // O onAuthStateChanged vai cuidar de mudar a tela
    } catch (error) {
        mostrarMensagem("Erro ao logar. Verifique o e-mail e senha.", "erro");
    }
});

document.getElementById('btn-admin-sair').addEventListener('click', async () => {
    await signOut(auth);
});

// ==========================================
// 4. BUSCAR CLIENTES NO FIREBASE
// ==========================================
async function carregarClientes() {
    const tabela = document.getElementById('lista-clientes');
    tabela.innerHTML = '<tr><td colspan="5">Buscando clientes...</td></tr>';

    try {
        // Pega todos os documentos da coleção "usuarios"
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        
        tabela.innerHTML = ""; // Limpa a tabela

        if (querySnapshot.empty) {
            tabela.innerHTML = '<tr><td colspan="5">Nenhum cliente cadastrado ainda.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const cliente = docSnap.data();
            const idCliente = docSnap.id;
            
            const tr = document.createElement('tr');
            
            // Define o status e o botão
            const statusClass = cliente.statusPagamento === "pendente" ? "status-pendente" : "status-ativo";
            const statusTexto = cliente.statusPagamento === "pendente" ? "Pendente" : "Ativo";
            
            const botaoAcao = cliente.statusPagamento === "pendente" 
                ? `<button class="btn-liberar" data-id="${idCliente}">Liberar Acesso</button>` 
                : "Já liberado";

            tr.innerHTML = `
                <td>${cliente.nome}</td>
                <td>${cliente.email}</td>
                <td>${cliente.planoPreferido.toUpperCase()}</td>
                <td class="${statusClass}">${statusTexto}</td>
                <td>${botaoAcao}</td>
            `;
            
            tabela.appendChild(tr);
        });

        // Adiciona o evento de clique nos botões "Liberar Acesso"
        document.querySelectorAll('.btn-liberar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                e.target.textContent = "Liberando...";
                e.target.disabled = true;

                try {
                    // Atualiza o status para ativo no banco de dados
                    await updateDoc(doc(db, "usuarios", id), {
                        statusPagamento: "ativo"
                    });
                    // Recarrega a tabela para mostrar o novo status
                    carregarClientes();
                } catch (error) {
                    alert("Erro ao liberar: " + error.message);
                }
            });
        });

    } catch (error) {
        console.error(error);
        tabela.innerHTML = '<tr><td colspan="5" style="color:red;">Erro ao carregar dados (Verifique se você é o admin).</td></tr>';
    }
}

// ==========================================
// 5. OBSERVADOR DE ESTADO (MANTÉM LOGADO)
// ==========================================
onAuthStateChanged(auth, (user) => {
    // ⚠️ TROQUE AQUI PELO SEU E-MAIL DE ADMINISTRADOR ⚠️
    const emailAdmin = "neoflux2012@gmail.com"; 

    if (user && user.email === emailAdmin) {
        mostrarTela('tela-admin-painel');
        carregarClientes();
    } else if (user) {
        // Se logar com um e-mail que não é o admin, desloga
        signOut(auth);
        mostrarMensagem("Acesso negado. Você não é o administrador.", "erro");
    } else {
        mostrarTela('tela-admin-login');
    }
});
