// ==========================================
// 1. IMPORTAÇÕES
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAdwwjbpyvTU5afvNzcHaBm-T-ShueHicU", authDomain: "neo-flux-c91c8.firebaseapp.com", projectId: "neo-flux-c91c8", storageBucket: "neo-flux-c91c8.firebasestorage.app", messagingSenderId: "6686219198", appId: "1:6686219198:web:e2f0b16808e5f3d251b7ef"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const todasAsTelas = document.querySelectorAll('.tela');
let clientesAdminGlobais = [];
let modoAusenteAtivo = false;

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
// 3. CARREGAR DADOS
// ==========================================
async function carregarClientes() {
    const tabela = document.getElementById('lista-admin-clientes');
    const tabelaUpgrades = document.getElementById('lista-upgrades');
    if(!tabela || !tabelaUpgrades) return;

    tabela.innerHTML = '<tr><td colspan="5" class="admin-tabela-vazia">Buscando clientes...</td></tr>';
    tabelaUpgrades.innerHTML = '<tr><td colspan="3" class="admin-tabela-vazia">Buscando pedidos...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        clientesAdminGlobais = [];
        
        tabela.innerHTML = ""; 
        tabelaUpgrades.innerHTML = "";
        let temUpgrade = false;

        if (querySnapshot.empty) {
            tabela.innerHTML = '<tr><td colspan="5" class="admin-tabela-vazia">Nenhum cliente.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const cliente = docSnap.data();
            cliente.id = docSnap.id;
            clientesAdminGlobais.push(cliente);
        });

        // Renderiza a tabela principal (usando a função que criamos)
        renderizarTabelaAdmin();
        
        // Verifica Upgrades e renderiza
        clientesAdminGlobais.forEach(cliente => {
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
                        <button class="btn-acao btn-pago btn-aprovar-upgrade" data-id="${cliente.id}">✅ Aprovar</button>
                    </td>
                `;
                tabelaUpgrades.appendChild(trUp);
            }
        });

        if (!temUpgrade) {
            tabelaUpgrades.innerHTML = '<tr><td colspan="3" class="admin-tabela-vazia">Nenhum pedido de upgrade no momento.</td></tr>';
        }

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

        // Inicializa Monitor e Autopilot
        atualizarMonitorAdmin();
        await carregarEstadoAutopilot();

    } catch (error) {
        console.error(error);
        tabela.innerHTML = '<tr><td colspan="5" class="admin-tabela-vazia" style="color:red;">Erro ao carregar.</td></tr>';
    }
}

// ==========================================
// 4. RENDERIZAR TABELA PRINCIPAL E AÇÕES
// ==========================================
function renderizarTabelaAdmin() {
    const tbody = document.getElementById('lista-admin-clientes');
    if (!tbody) return;

    const busca = document.getElementById('admin-busca-cliente')?.value.toLowerCase() || "";
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    tbody.innerHTML = "";
    let filtrados = clientesAdminGlobais.filter(c => {
        const nome = (c.nome || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        return nome.includes(busca) || email.includes(busca);
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="admin-tabela-vazia">Nenhum cliente encontrado.</td></tr>';
        return;
    }

    filtrados.forEach(c => {
        const tr = document.createElement('tr');
        
        let vencStr = "—"; 
        let badgeClass = "badge-pendente";
        let badgeText = "Pendente";
        
        if (c.vencimento) {
            vencStr = c.vencimento.split('-').reverse().join('/');
            const v = new Date(c.vencimento + 'T00:00:00');
            const diffDias = Math.ceil((v - hoje) / (1000 * 60 * 60 * 24));
            
            if (c.statusPagamento === 'suspenso') {
                badgeClass = "badge-suspenso"; badgeText = "Suspenso";
            } else if (diffDias < 0) {
                badgeClass = "badge-vencido"; badgeText = "Vencido";
            } else if (c.statusPagamento === 'ativo') {
                badgeClass = "badge-ativo"; badgeText = "Ativo";
            }
        } else if (c.statusPagamento === 'suspenso') {
            badgeClass = "badge-suspenso"; badgeText = "Suspenso";
        }

        tr.innerHTML = `
            <td data-label="Cliente">
                <span class="cliente-nome">${c.nome || 'Sem nome'}</span>
                <span class="cliente-email">${c.email}</span>
            </td>
            <td data-label="Plano">
                <span class="cliente-plano">${(c.planoPreferido || '').toUpperCase()}</span>
            </td>
            <td data-label="Vencimento">
                ${vencStr}
            </td>
            <td data-label="Status">
                <span class="badge-status ${badgeClass}">${badgeText}</span>
            </td>
            <td data-label="Ações" class="texto-centro">
                <button onclick="window.adminConfirmarPagamento('${c.id}')" class="btn-acao btn-pago">✅ Pago</button>
                <button onclick="window.adminSuspender('${c.id}')" class="btn-acao btn-suspender">🛑 Suspender</button>
                <button onclick="window.adminAlterarPlano('${c.id}')" class="btn-acao btn-plano">🔄 Plano</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

document.getElementById('admin-busca-cliente')?.addEventListener('input', renderizarTabelaAdmin);

window.adminConfirmarPagamento = async function(uid) {
    const cliente = clientesAdminGlobais.find(c => c.id === uid); if (!cliente) return;
    const novaData = new Date(); novaData.setDate(novaData.getDate() + 30);
    const vencFormatado = novaData.toISOString().split('T')[0];
    if (!confirm(`Confirmar pagamento de ${cliente.nome}?\n\nNovo vencimento: ${vencFormatado.split('-').reverse().join('/')}`)) return;
    try { await updateDoc(doc(db, "usuarios", uid), { statusPagamento: "ativo", vencimento: vencFormatado }); alert("✅ Pagamento confirmado!"); carregarClientes(); } 
    catch (e) { alert("Erro: " + e.message); }
};

window.adminSuspender = async function(uid) {
    const cliente = clientesAdminGlobais.find(c => c.id === uid); if (!cliente) return;
    if (!confirm(`Suspender o acesso de ${cliente.nome}?`)) return;
    try { await updateDoc(doc(db, "usuarios", uid), { statusPagamento: "suspenso" }); alert("🛑 Cliente suspenso."); carregarClientes(); } 
    catch (e) { alert("Erro: " + e.message); }
};

window.adminAlterarPlano = async function(uid) {
    const cliente = clientesAdminGlobais.find(c => c.id === uid); if (!cliente) return;
    const novoPlano = prompt(`Alterar plano de ${cliente.nome}:\n\nDigite: start, pro, elite ou elite_premium`, cliente.planoPreferido);
    if (!novoPlano) return;
    const planoLimpo = novoPlano.toLowerCase().trim();
    if (!['start', 'pro', 'elite', 'elite_premium'].includes(planoLimpo)) return alert("Plano inválido.");
    try { await updateDoc(doc(db, "usuarios", uid), { planoPreferido: planoLimpo }); alert(`✅ Plano alterado para ${planoLimpo.toUpperCase()}`); carregarClientes(); } 
    catch (e) { alert("Erro: " + e.message); }
};

// ==========================================
// 5. NEO WAVE MONITOR E AUTOPILOT
// ==========================================
function atualizarMonitorAdmin() {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    let vencemHoje = 0; let vencem7 = 0; let atrasados = 0;

    clientesAdminGlobais.forEach(c => {
        if (c.statusPagamento === 'suspenso' || !c.vencimento) return;
        const dataVenc = new Date(c.vencimento + 'T00:00:00');
        const diffDias = Math.ceil((dataVenc - hoje) / (1000 * 60 * 60 * 24));
        if (diffDias < 0) atrasados++;
        else if (diffDias === 0) vencemHoje++;
        else if (diffDias <= 7) vencem7++;
    });

    document.getElementById('monitor-vencem-hoje').textContent = vencemHoje;
    document.getElementById('monitor-vencem-7').textContent = vencem7;
    document.getElementById('monitor-atrasados').textContent = atrasados;
}

document.getElementById('btn-monitor-whatsapp')?.addEventListener('click', () => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    let lista = "🔔 *Neo Wave Monitor - Cobranças*\n\n"; let tem = false;
    clientesAdminGlobais.forEach(c => {
        if (c.statusPagamento === 'suspenso' || !c.vencimento) return;
        const v = new Date(c.vencimento + 'T00:00:00'); const diff = Math.ceil((v - hoje) / (1000 * 60 * 60 * 24));
        if (diff < 0) { lista += `🔴 *${c.nome}* - VENCIDO há ${Math.abs(diff)} dia(s) (Plano ${c.planoPreferido.toUpperCase()})\n`; tem = true; } 
        else if (diff === 0) { lista += `🟠 *${c.nome}* - Vence HOJE (Plano ${c.planoPreferido.toUpperCase()})\n`; tem = true; } 
        else if (diff <= 7) { lista += `🟡 *${c.nome}* - Vence em ${diff} dia(s) (Plano ${c.planoPreferido.toUpperCase()})\n`; tem = true; }
    });
    if (!tem) return alert("Nenhuma cobrança pendente. 🎉");
    navigator.clipboard.writeText(lista).then(() => alert("✅ Lista copiada!")).catch(() => alert("Erro ao copiar."));
});

async function carregarEstadoAutopilot() {
    try {
        const snap = await getDoc(doc(db, "config_admin", "autopilot"));
        if (snap.exists()) { modoAusenteAtivo = snap.data().ativo || false; atualizarBotaoAusente(); }
    } catch (e) { console.warn("Config autopilot não encontrada."); }
}

function atualizarBotaoAusente() {
    const btn = document.getElementById('btn-toggle-ausente');
    const painel = document.getElementById('painel-despacho');
    if (!btn) return;

    if (modoAusenteAtivo) {
        btn.style.background = '#f39c12'; btn.style.color = '#000';
        btn.innerHTML = '<i data-lucide="zap" style="width: 16px; vertical-align: middle;"></i> Modo Ausente ATIVO';
        painel.style.display = 'block'; gerarAcoesAutopilot();
    } else {
        btn.style.background = '#333'; btn.style.color = '#ccc';
        btn.innerHTML = '<i data-lucide="power" style="width: 16px; vertical-align: middle;"></i> Ativar Modo Ausente';
        painel.style.display = 'none';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

document.getElementById('btn-toggle-ausente')?.addEventListener('click', async () => {
    modoAusenteAtivo = !modoAusenteAtivo;
    try { await setDoc(doc(db, "config_admin", "autopilot"), { ativo: modoAusenteAtivo, atualizadoEm: new Date() }); atualizarBotaoAusente(); } 
    catch (e) { alert("Erro: " + e.message); modoAusenteAtivo = !modoAusenteAtivo; }
});

function gerarAcoesAutopilot() {
    const container = document.getElementById('lista-despacho');
    const tbodyVenc = document.getElementById('tabela-vencimentos-corpo');
    if (!container || !tbodyVenc) return;

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    let acoes = []; let vencimentos = [];

    clientesAdminGlobais.forEach(c => {
        if (c.statusPagamento === 'suspenso' || !c.vencimento) return;
        const v = new Date(c.vencimento + 'T00:00:00');
        const diff = Math.ceil((v - hoje) / (1000 * 60 * 60 * 24));

        vencimentos.push({ nome: c.nome, plano: (c.planoPreferido || '—').toUpperCase(), data: c.vencimento.split('-').reverse().join('/'), dias: diff, status: diff < 0 ? 'vencido' : (diff === 0 ? 'hoje' : (diff <= 7 ? 'proximo' : 'ok')) });

        if (diff < 0) acoes.push({ cliente: c, tipo: 'vencido', dias: Math.abs(diff), mensagem: `Olá, ${c.nome}! Tudo bem? 💜\n\nNotamos que seu plano *${c.planoPreferido.toUpperCase()}* na Neo Flux venceu há ${Math.abs(diff)} dia(s).\n\nPara continuar tendo acesso, basta renovar. Qualquer dúvida, estamos por aqui! 🚀` });
        else if (diff === 0) acoes.push({ cliente: c, tipo: 'hoje', dias: 0, mensagem: `Olá, ${c.nome}! Tudo bem? 💜\n\nPassando para avisar que seu plano *${c.planoPreferido.toUpperCase()}* na Neo Flux vence *hoje*. Renove agora! 🚀` });
        else if (diff <= 7) acoes.push({ cliente: c, tipo: 'proximo', dias: diff, mensagem: `Olá, ${c.nome}! Tudo bem? 💜\n\nSeu plano *${c.planoPreferido.toUpperCase()}* na Neo Flux vence em ${diff} dia(s). Fica o lembrete carinhoso! 💜` });
    });

    if (acoes.length === 0) container.innerHTML = '<p style="color: #00c853; text-align: center; padding: 15px;">✅ Tudo em ordem!</p>';
    else {
        container.innerHTML = "";
        acoes.forEach(acao => {
            const c = acao.cliente;
            const cor = acao.tipo === 'vencido' ? '#e74c3c' : (acao.tipo === 'hoje' ? '#ff9800' : '#00d2ff');
            const emoji = acao.tipo === 'vencido' ? '🔴' : (acao.tipo === 'hoje' ? '🟠' : '🟡');
            const div = document.createElement('div');
            div.style.cssText = `background: #121212; border-left: 4px solid ${cor}; padding: 12px 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;`;
            div.innerHTML = `<div><strong style="color: white;">${emoji} ${c.nome}</strong><p style="margin: 2px 0 0 0; color: #888; font-size: 0.8rem;">${acao.tipo === 'vencido' ? `Atrasado ${acao.dias} dia(s)` : (acao.tipo === 'hoje' ? 'Vence hoje' : `Vence em ${acao.dias} dia(s)`)}</p></div><button onclick="window.enviarCobrancaAutopilot('${c.id}', '${acao.mensagem.replace(/'/g, "\\'")}')" style="padding: 8px 15px; background: #25D366; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">Enviar</button>`;
            container.appendChild(div);
        });
    }

    vencimentos.sort((a, b) => a.dias - b.dias);
    if (vencimentos.length === 0) tbodyVenc.innerHTML = '<tr><td colspan="4" class="admin-tabela-vazia">Nenhum vencimento cadastrado.</td></tr>';
    else {
        tbodyVenc.innerHTML = "";
        vencimentos.forEach(v => {
            let badgeClass = "badge-ativo";
            let texto = `Em ${v.dias} dias`;
            
            if (v.status === 'vencido') { badgeClass = "badge-vencido"; texto = `Atrasado ${Math.abs(v.dias)} dia(s)`; } 
            else if (v.status === 'hoje') { badgeClass = "badge-pendente"; texto = "Vence HOJE"; } 
            else if (v.status === 'proximo') { badgeClass = "badge-pendente"; texto = `Faltam ${v.dias} dias`; }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Cliente"><span class="cliente-nome">${v.nome}</span></td>
                <td data-label="Plano"><span class="cliente-plano">${v.plano}</span></td>
                <td data-label="Vencimento">${v.data}</td>
                <td data-label="Situação" class="texto-direita">
                    <span class="badge-status ${badgeClass}">${texto}</span>
                </td>`;
            tbodyVenc.appendChild(tr);
        });
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.enviarCobrancaAutopilot = function(uid, mensagem) {
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank');
    const hoje = new Date().toISOString().split('T')[0];
    setDoc(doc(db, "historico_cobrancas", `${uid}_${hoje}`), { uid: uid, data: hoje, enviadoEm: new Date() }).catch(e => console.warn(e));
};

// ==========================================
// 6. OBSERVADOR DE ESTADO (SEGURANÇA)
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
