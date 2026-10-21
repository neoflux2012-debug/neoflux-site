// ==========================================
// 1. IMPORTAÇÕES
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAdwwjbpyvTU5afvNzcHaBm-T-ShueHicU", authDomain: "neo-flux-c91c8.firebaseapp.com", projectId: "neo-flux-c91c8", storageBucket: "neo-flux-c91c8.firebasestorage.app", messagingSenderId: "6686219198", appId: "1:6686219198:web:e2f0b16808e5f3d251b7ef"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const todasAsTelas = document.querySelectorAll('.tela');

function mostrarTela(id) {
    todasAsTelas.forEach(t => t.classList.remove('ativa'));
    const tela = document.getElementById(id);
    if (tela) tela.classList.add('ativa');
}

// ==========================================
// 2. LOGIN E LOGOUT
// ==========================================
document.getElementById('form-admin-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('admin-email').value, document.getElementById('admin-senha').value);
    } catch (error) {
        alert("Erro ao logar. Verifique o e-mail e senha.");
    }
});

document.getElementById('btn-admin-sair').addEventListener('click', async () => {
    await signOut(auth);
});

// ==========================================
// 3. CARREGAR DADOS (CLIENTES E UPGRADES)
// ==========================================
async function carregarClientes() {
    const tabela = document.getElementById('lista-clientes');
    const tabelaUpgrades = document.getElementById('lista-upgrades');
    if(!tabela || !tabelaUpgrades) return;

    tabela.innerHTML = '<tr><td colspan="5">Buscando clientes...</td></tr>';
    tabelaUpgrades.innerHTML = '<tr><td colspan="4">Buscando pedidos...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        
        tabela.innerHTML = ""; 
        tabelaUpgrades.innerHTML = "";
        let temUpgrade = false;

        if (querySnapshot.empty) {
            tabela.innerHTML = '<tr><td colspan="5">Nenhum cliente.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const cliente = docSnap.data();
            const idCliente = docSnap.id;
            
            // 1. LISTA NORMAL DE CLIENTES
            const tr = document.createElement('tr');
            const statusClass = cliente.statusPagamento === "pendente" ? "status-pendente" : "status-ativo";
            let statusTexto = cliente.statusPagamento === "pendente" ? "Pendente" : (cliente.statusPagamento === "ativo" ? "Ativo" : "Upgrade Pendente");

            let botaoAcao = "";
            if (cliente.statusPagamento === "pendente") {
                botaoAcao = `<button class="btn-liberar" data-id="${idCliente}" style="background: #00c853; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">Liberar</button>`;
            } else if (cliente.statusPagamento === "upgrade_pendente") {
                botaoAcao = `<span style="color:#00d2ff; font-weight:bold;">Aguardando</span>`;
            } else {
                botaoAcao = "Já liberado";
            }

            tr.innerHTML = `
                <td>${cliente.nome}</td>
                <td>${cliente.email}</td>
                <td>${cliente.planoPreferido.toUpperCase()}</td>
                <td class="${statusClass}">${statusTexto}</td>
                <td>${botaoAcao}</td>
            `;
            tabela.appendChild(tr);

            // 2. LISTA DE UPGRADES
            if (cliente.statusPagamento === "upgrade_pendente") {
                temUpgrade = true;
                const trUp = document.createElement('tr');
                trUp.innerHTML = `
                    <td>${cliente.nome}</td>
                    <td>${cliente.email}</td>
                    <td>${cliente.planoPreferido.toUpperCase()}</td>
                    <td><button class="btn-aprovar-upgrade" data-id="${idCliente}" style="background: #00c853; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">Aprovar</button></td>
                `;
                tabelaUpgrades.appendChild(trUp);
            }
        });

        if (!temUpgrade) {
            tabelaUpgrades.innerHTML = '<tr><td colspan="4">Nenhum pedido de upgrade no momento.</td></tr>';
        }

        // Eventos de Liberar Normal
        document.querySelectorAll('.btn-liberar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await updateDoc(doc(db, "usuarios", id), { statusPagamento: "ativo" });
                carregarClientes();
            });
        });

        // Eventos de Aprovar Upgrade
        document.querySelectorAll('.btn-aprovar-upgrade').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm("Confirmar upgrade para Elite Premium?")) {
                    await updateDoc(doc(db, "usuarios", id), { statusPagamento: "ativo", planoPreferido: "elite_premium" });
                    alert("Upgrade aprovado!");
                    carregarClientes();
                }
            });
        });

    } catch (error) {
        console.error(error);
        tabela.innerHTML = '<tr><td colspan="5" style="color:red;">Erro ao carregar.</td></tr>';
    }
}

// ==========================================
// 4. OBSERVADOR DE ESTADO (SEGURANÇA)
// ==========================================
onAuthStateChanged(auth, (user) => {
    const emailAdmin = "neoflux2012@gmail.com"; 

    if (user && user.email === emailAdmin) {
        mostrarTela('tela-admin-painel');
        carregarClientes();
    } else if (user) {
        signOut(auth);
        alert("Acesso negado. Você não é o administrador.");
    } else {
        mostrarTela('tela-admin-login');
    }
});
