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
document.getElementById('form-admin-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('admin-email').value, document.getElementById('admin-senha').value);
    } catch (error) {
        alert("Erro ao logar. Verifique o e-mail e senha.");
    }
});

document.getElementById('btn-admin-sair')?.addEventListener('click', async () => {
    await signOut(auth);
});

// ==========================================
// 3. CARREGAR DADOS (CLIENTES E UPGRADES)
// ==========================================
async function carregarClientes() {
    const tabela = document.getElementById('lista-clientes');
    const tabelaUpgrades = document.getElementById('lista-upgrades');
    if(!tabela || !tabelaUpgrades) return;

    tabela.innerHTML = '<tr><td colspan="4" class="admin-tabela-vazia">Buscando clientes...</td></tr>';
    tabelaUpgrades.innerHTML = '<tr><td colspan="3" class="admin-tabela-vazia">Buscando pedidos...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        
        tabela.innerHTML = ""; 
        tabelaUpgrades.innerHTML = "";
        let temUpgrade = false;

        if (querySnapshot.empty) {
            tabela.innerHTML = '<tr><td colspan="4" class="admin-tabela-vazia">Nenhum cliente.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const cliente = docSnap.data();
            const idCliente = docSnap.id;
            
            // 1. LISTA NORMAL DE CLIENTES
            const tr = document.createElement('tr');
            
            // Configura a Badge de Status
            let badgeClass = "badge-ativo";
            let statusTexto = "Ativo";
            
            if (cliente.statusPagamento === "pendente") {
                badgeClass = "badge-pendente"; statusTexto = "Pendente";
            } else if (cliente.statusPagamento === "upgrade_pendente") {
                badgeClass = "badge-pendente"; statusTexto = "Upgrade Solicitado";
            }

            let botaoAcao = "";
            if (cliente.statusPagamento === "pendente") {
                botaoAcao = `<button class="btn-acao btn-pago btn-liberar" data-id="${idCliente}">✅ Liberar</button>`;
            } else if (cliente.statusPagamento === "upgrade_pendente") {
                botaoAcao = `<span class="badge-status badge-pendente">Aguardando</span>`;
            } else {
                botaoAcao = `<span style="color: #888; font-size: 0.85rem;">Já liberado</span>`;
            }

            tr.innerHTML = `
                <td data-label="Cliente">
                    <span class="cliente-nome">${cliente.nome}</span>
                    <span class="cliente-email">${cliente.email}</span>
                </td>
                <td data-label="Plano">
                    <span class="cliente-plano">${(cliente.planoPreferido || '').toUpperCase()}</span>
                </td>
                <td data-label="Status">
                    <span class="badge-status ${badgeClass}">${statusTexto}</span>
                </td>
                <td data-label="Ação" class="texto-centro">
                    ${botaoAcao}
                </td>
            `;
            tabela.appendChild(tr);

            // 2. LISTA DE UPGRADES
            if (cliente.statusPagamento === "upgrade_pendente") {
                temUpgrade = true;
                const trUp = document.createElement('tr');
                trUp.innerHTML = `
                    <td data-label="Cliente">
                        <span class="cliente-nome">${cliente.nome}</span>
                        <span class="cliente-email">${cliente.email}</span>
                    </td>
                    <td data-label="Plano Solicitado">
                        <span class="cliente-plano">ELITE PREMIUM</span>
                    </td>
                    <td data-label="Ação" class="texto-centro">
                        <button class="btn-acao btn-pago btn-aprovar-upgrade" data-id="${idCliente}">✅ Aprovar</button>
                    </td>
                `;
                tabelaUpgrades.appendChild(trUp);
            }
        });

        if (!temUpgrade) {
            tabelaUpgrades.innerHTML = '<tr><td colspan="3" class="admin-tabela-vazia">Nenhum pedido de upgrade no momento.</td></tr>';
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
        tabela.innerHTML = '<tr><td colspan="4" class="admin-tabela-vazia" style="color:red;">Erro ao carregar.</td></tr>';
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
