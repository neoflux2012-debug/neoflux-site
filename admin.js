
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    updateDoc,
    setDoc,
    getDoc,
    deleteDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const todasAsTelas = document.querySelectorAll(".tela");
const emailAdmin = "neoflux2012@gmail.com";

let clientesAdminGlobais = [];
let modoAusenteAtivo = false;

function mostrarTela(id) {
    todasAsTelas.forEach(t => t.classList.remove("ativa"));
    document.getElementById(id)?.classList.add("ativa");
}

// LOGIN E LOGOUT

document.getElementById("form-admin-login")?.addEventListener("submit", async e => {
    e.preventDefault();

    try {
        await signInWithEmailAndPassword(
            auth,
            document.getElementById("admin-email").value,
            document.getElementById("admin-senha").value
        );
    } catch (e) {
        console.error(e);
        alert("Erro ao entrar. Verifique o e-mail e a senha.");
    }
});

document.getElementById("btn-admin-sair")?.addEventListener("click", async () => {
    await signOut(auth);
});

// CLIENTES

async function carregarClientes() {
    const tabela = document.getElementById("lista-admin-clientes");
    const upgrades = document.getElementById("lista-upgrades");

    if (!tabela || !upgrades) return;

    tabela.innerHTML = '<tr><td colspan="5">Buscando clientes...</td></tr>';
    upgrades.innerHTML = '<tr><td colspan="3">Buscando pedidos...</td></tr>';

    try {
        const snapshot = await getDocs(collection(db, "usuarios"));

        clientesAdminGlobais = snapshot.docs.map(s => ({
            ...s.data(),
            id: s.id
        }));

        renderizarTabelaAdmin();

        upgrades.replaceChildren();

        const pendentes = clientesAdminGlobais.filter(
            c => c.statusPagamento === "upgrade_pendente"
        );

        for (const cliente of pendentes) {
            const tr = document.createElement("tr");

            const tdCliente = document.createElement("td");
            tdCliente.textContent = `${cliente.nome || "Cliente"} — ${cliente.email || ""}`;

            const tdPlano = document.createElement("td");
            tdPlano.textContent = "ELITE PREMIUM";

            const tdAcao = document.createElement("td");
            const btn = document.createElement("button");

            btn.className = "btn-acao btn-pago";
            btn.textContent = "Aprovar";

            btn.addEventListener("click", async () => {
                if (!confirm("Confirmar upgrade para Elite Premium?")) return;

                try {
                    await updateDoc(doc(db, "usuarios", cliente.id), {
                        statusPagamento: "ativo",
                        planoPreferido: "elite_premium"
                    });

                    alert("Upgrade aprovado!");
                    await carregarClientes();
                } catch (e) {
                    alert("Erro: " + e.message);
                }
            });

            tdAcao.append(btn);
            tr.append(tdCliente, tdPlano, tdAcao);
            upgrades.append(tr);
        }

        if (!pendentes.length) {
            upgrades.innerHTML = '<tr><td colspan="3">Nenhum pedido de upgrade.</td></tr>';
        }

        atualizarMonitorAdmin();
        await carregarEstadoAutopilot();

    } catch (e) {
        console.error("Erro ao carregar clientes:", e);
        tabela.innerHTML = '<tr><td colspan="5">Erro ao carregar clientes.</td></tr>';
    }
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);
}

function renderizarTabelaAdmin() {
    const tbody = document.getElementById("lista-admin-clientes");
    if (!tbody) return;

    const busca = document.getElementById("admin-busca-cliente")
        ?.value.toLowerCase() || "";

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    tbody.replaceChildren();

    const filtrados = clientesAdminGlobais.filter(c =>
        (c.nome || "").toLowerCase().includes(busca) ||
        (c.email || "").toLowerCase().includes(busca)
    );

    if (!filtrados.length) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum cliente encontrado.</td></tr>';
        return;
    }

    for (const c of filtrados) {
        let vencimento = "—";
        let badgeClass = "badge-pendente";
        let badgeText = "Pendente";

        if (c.vencimento) {
            vencimento = c.vencimento.split("-").reverse().join("/");

            const data = new Date(c.vencimento + "T00:00:00");
            const dias = Math.ceil((data - hoje) / 86400000);

            if (c.statusPagamento === "suspenso") {
                badgeClass = "badge-suspenso";
                badgeText = "Suspenso";
            } else if (dias < 0) {
                badgeClass = "badge-vencido";
                badgeText = "Vencido";
            } else if (c.statusPagamento === "ativo") {
                badgeClass = "badge-ativo";
                badgeText = "Ativo";
            }
        } else if (c.statusPagamento === "suspenso") {
            badgeClass = "badge-suspenso";
            badgeText = "Suspenso";
        }

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td data-label="Cliente">
                <span class="cliente-nome">${escaparHTML(c.nome || "Sem nome")}</span>
                <span class="cliente-email">${escaparHTML(c.email || "")}</span>
            </td>
            <td data-label="Plano">
                <span class="cliente-plano">${escaparHTML((c.planoPreferido || "").toUpperCase())}</span>
            </td>
            <td data-label="Vencimento">${escaparHTML(vencimento)}</td>
            <td data-label="Status">
                <span class="badge-status ${badgeClass}">${badgeText}</span>
            </td>
            <td data-label="Ações" class="texto-centro"></td>
        `;

        const acoes = tr.lastElementChild;

        const botoes = [
            ["Pago", "btn-pago", () => adminConfirmarPagamento(c.id)],
            ["Suspender", "btn-suspender", () => adminSuspender(c.id)],
            ["Plano", "btn-plano", () => adminAlterarPlano(c.id)],
            ["Excluir", "btn-excluir", () => adminExcluirConta(c.id)]
        ];

        for (const [texto, classe, acao] of botoes) {
            const btn = document.createElement("button");
            btn.className = `btn-acao ${classe}`;
            btn.textContent = texto;
            btn.addEventListener("click", acao);
            acoes.append(btn);
        }

        tbody.append(tr);
    }
}

document.getElementById("admin-busca-cliente")
    ?.addEventListener("input", renderizarTabelaAdmin);

async function adminConfirmarPagamento(uid) {
    const cliente = clientesAdminGlobais.find(c => c.id === uid);
    if (!cliente) return;

    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 30);

    const vencimento = [
        novaData.getFullYear(),
        String(novaData.getMonth() + 1).padStart(2, "0"),
        String(novaData.getDate()).padStart(2, "0")
    ].join("-");

    if (!confirm(`Confirmar pagamento de ${cliente.nome}?`)) return;

    try {
        await updateDoc(doc(db, "usuarios", uid), {
            statusPagamento: "ativo",
            vencimento
        });

        alert("Pagamento confirmado!");
        await carregarClientes();
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

async function adminSuspender(uid) {
    const cliente = clientesAdminGlobais.find(c => c.id === uid);
    if (!cliente) return;

    if (!confirm(`Suspender ${cliente.nome}?`)) return;

    try {
        await updateDoc(doc(db, "usuarios", uid), {
            statusPagamento: "suspenso"
        });

        alert("Cliente suspenso.");
        await carregarClientes();
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

async function adminAlterarPlano(uid) {
    const cliente = clientesAdminGlobais.find(c => c.id === uid);
    if (!cliente) return;

    const novo = prompt(
        "Digite o plano: start, pro, elite, elite_premium, fvm_start, fvm_pro, fvm_elite ou fvm_elite_premium",
        cliente.planoPreferido || ""
    );

    if (!novo) return;

    const plano = novo.trim().toLowerCase();

    const validos = [
        "start", "pro", "elite", "elite_premium",
        "fvm_start", "fvm_pro", "fvm_elite", "fvm_elite_premium"
    ];

    if (!validos.includes(plano)) {
        alert("Plano inválido.");
        return;
    }

    try {
        await updateDoc(doc(db, "usuarios", uid), {
            planoPreferido: plano
        });

        alert("Plano alterado!");
        await carregarClientes();
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

async function adminExcluirConta(uid) {
    const cliente = clientesAdminGlobais.find(c => c.id === uid);
    if (!cliente) return;

    if (!confirm(`Excluir o cadastro de ${cliente.nome}? O login do Firebase Auth não será excluído.`)) return;

    try {
        await deleteDoc(doc(db, "usuarios", uid));
        alert("Cadastro excluído do Firestore.");
        await carregarClientes();
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

// NEO WAVE MONITOR

function diasAteVencimento(vencimento) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return Math.round(
        (new Date(vencimento + "T00:00:00") - hoje) / 86400000
    );
}

function atualizarMonitorAdmin() {
    let hoje = 0;
    let seteDias = 0;
    let atrasados = 0;

    for (const c of clientesAdminGlobais) {
        if (c.statusPagamento === "suspenso" || !c.vencimento) continue;

        const dias = diasAteVencimento(c.vencimento);

        if (dias < 0) atrasados++;
        else if (dias === 0) hoje++;
        else if (dias <= 7) seteDias++;
    }

    document.getElementById("monitor-vencem-hoje").textContent = hoje;
    document.getElementById("monitor-vencem-7").textContent = seteDias;
    document.getElementById("monitor-atrasados").textContent = atrasados;
}

document.getElementById("btn-monitor-whatsapp")
    ?.addEventListener("click", async () => {
        let lista = "Neo Wave Monitor - Cobranças\n\n";

        for (const c of clientesAdminGlobais) {
            if (c.statusPagamento === "suspenso" || !c.vencimento) continue;

            const dias = diasAteVencimento(c.vencimento);
            if (dias > 7) continue;

            const situacao = dias < 0
                ? `Vencido há ${Math.abs(dias)} dia(s)`
                : dias === 0
                    ? "Vence hoje"
                    : `Vence em ${dias} dia(s)`;

            lista += `${c.nome || "Cliente"} - ${situacao} - Plano ${(c.planoPreferido || "—").toUpperCase()}\n`;
        }

        try {
            await navigator.clipboard.writeText(lista);
            alert("Lista copiada!");
        } catch (e) {
            alert("Não foi possível copiar.");
        }
    });

// NEO WAVE AUTOPILOT

async function carregarEstadoAutopilot() {
    try {
        const snap = await getDoc(
            doc(db, "config_admin", "autopilot")
        );

        modoAusenteAtivo = snap.exists()
            ? snap.data().ativo === true
            : false;

        atualizarBotaoAusente();

    } catch (e) {
        console.error(
            "Erro ao carregar o Neo Wave Autopilot:",
            e.code,
            e.message
        );
    }
}

function atualizarBotaoAusente() {
    const btn = document.getElementById("btn-toggle-ausente");
    const painel = document.getElementById("painel-despacho");

    if (!btn || !painel) return;

    if (modoAusenteAtivo) {
        btn.style.background = "#f39c12";
        btn.style.color = "#000";
        btn.textContent = "Modo Ausente ATIVO";
        painel.style.display = "block";
        gerarAcoesAutopilot();
    } else {
        btn.style.background = "#333";
        btn.style.color = "#ccc";
        btn.textContent = "Ativar Modo Ausente";
        painel.style.display = "none";
    }
}

document.getElementById("btn-toggle-ausente")
    ?.addEventListener("click", async () => {
        const novoEstado = !modoAusenteAtivo;

        try {
            await setDoc(
                doc(db, "config_admin", "autopilot"),
                {
                    ativo: novoEstado,
                    atualizadoEm: new Date()
                }
            );

            modoAusenteAtivo = novoEstado;
            atualizarBotaoAusente();

        } catch (e) {
            console.error("Erro ao salvar Autopilot:", e);
            alert("Erro ao ativar Autopilot: " + e.message);
        }
    });

function gerarAcoesAutopilot() {
    const container = document.getElementById("lista-despacho");
    const tabela = document.getElementById("tabela-vencimentos-corpo");

    if (!container || !tabela) return;

    container.replaceChildren();
    tabela.replaceChildren();

    const vencimentos = clientesAdminGlobais
        .filter(c => c.vencimento && c.statusPagamento !== "suspenso")
        .map(c => ({
            cliente: c,
            dias: diasAteVencimento(c.vencimento)
        }))
        .sort((a, b) => a.dias - b.dias);

    for (const item of vencimentos) {
        const c = item.cliente;
        const dias = item.dias;

        const tr = document.createElement("tr");

        const situacao = dias < 0
            ? `Atrasado ${Math.abs(dias)} dia(s)`
            : dias === 0
                ? "Vence hoje"
                : `Faltam ${dias} dias`;

        for (const valor of [
            c.nome || "Cliente",
            (c.planoPreferido || "—").toUpperCase(),
            c.vencimento.split("-").reverse().join("/"),
            situacao
        ]) {
            const td = document.createElement("td");
            td.textContent = valor;
            tr.append(td);
        }

        tabela.append(tr);

        if (dias > 7) continue;

        const mensagem = dias < 0
            ? `Olá, ${c.nome}! Seu plano ${(c.planoPreferido || "").toUpperCase()} na Neo Flux venceu há ${Math.abs(dias)} dia(s). Podemos ajudar com a renovação?`
            : dias === 0
                ? `Olá, ${c.nome}! Seu plano Neo Flux vence hoje. Podemos ajudar com a renovação?`
                : `Olá, ${c.nome}! Seu plano Neo Flux vence em ${dias} dia(s). Passando para lembrar da renovação!`;

        const card = document.createElement("div");
        card.className = "admin-item-despacho";

        const descricao = document.createElement("p");
        descricao.textContent = `${c.nome || "Cliente"} — ${situacao}`;

        const botao = document.createElement("button");
        botao.textContent = "Enviar WhatsApp";
        botao.className = "botao-principal";

        botao.addEventListener("click", () => {
            window.enviarCobrancaAutopilot(c.id, mensagem);
        });

        card.append(descricao, botao);
        container.append(card);
    }

    if (!container.children.length) {
        const p = document.createElement("p");
        p.textContent = "Tudo em ordem!";
        container.append(p);
    }
}

window.enviarCobrancaAutopilot = async function(uid, mensagem) {
    window.open(
        `https://wa.me/?text=${encodeURIComponent(mensagem)}`,
        "_blank",
        "noopener,noreferrer"
    );

    const hoje = new Date().toISOString().split("T")[0];

    try {
        await setDoc(
            doc(db, "historico_cobrancas", `${uid}_${hoje}`),
            {
                uid,
                data: hoje,
                enviadoEm: new Date()
            }
        );
    } catch (e) {
        console.warn("Erro ao registrar cobrança:", e);
    }
};

// MARKETPLACE ADMIN

const marketAdminAutorizado = () =>
    auth.currentUser?.email === emailAdmin &&
    auth.currentUser?.emailVerified === true;

function marketEl(tag, texto = "") {
    const el = document.createElement(tag);
    el.textContent = String(texto ?? "");
    return el;
}

function marketStatus(texto) {
    const el = document.getElementById("market-admin-status");
    if (el) el.textContent = texto;
}

function marketData(valor) {
    return valor?.toDate
        ? valor.toDate().toLocaleString("pt-BR")
        : "—";
}

async function carregarMarketplaceAdmin() {
    if (!marketAdminAutorizado()) {
        marketStatus("Confirme o e-mail do administrador para acessar a moderação.");
        return;
    }

    const pedidos = document.getElementById("market-admin-pedidos");
    const denuncias = document.getElementById("market-admin-denuncias");
    const suspensoes = document.getElementById("market-admin-suspensoes");

    if (!pedidos || !denuncias || !suspensoes) return;

    marketStatus("Carregando dados do Marketplace...");

    try {
        const [p, d, s] = await Promise.all([
            getDocs(collection(db, "marketplaceBoosterPedidos")),
            getDocs(collection(db, "marketplaceDenuncias")),
            getDocs(collection(db, "marketplaceSuspensoes"))
        ]);

        pedidos.replaceChildren();
        denuncias.replaceChildren();
        suspensoes.replaceChildren();

        const totalPedidos = document.getElementById("market-total-pedidos");
        const totalDenuncias = document.getElementById("market-total-denuncias");
        const totalSuspensoes = document.getElementById("market-total-suspensoes");

        if (totalPedidos) {
            totalPedidos.textContent = p.docs.filter(
                x => x.data().status === "pendente"
            ).length;
        }

        if (totalDenuncias) {
            totalDenuncias.textContent = d.docs.filter(
                x => x.data().status === "pendente"
            ).length;
        }

        if (totalSuspensoes) {
            totalSuspensoes.textContent = s.docs.filter(
                x => x.data().ativo === true
            ).length;
        }

        // SOLICITAÇÕES DE BOOSTER

        const pedidosOrdenados = [...p.docs].sort(
            (a, b) =>
                (b.data().criadoEm?.toMillis?.() || 0) -
                (a.data().criadoEm?.toMillis?.() || 0)
        );

        for (const snap of pedidosOrdenados) {
            const item = snap.data();
            const card = marketEl("article");

            card.append(
                marketEl("strong", item.nomeVitrine || item.idSubsite || "Vitrine"),
                marketEl(
                    "p",
                    `${item.nomeCliente || "Cliente"} • ${item.status || "—"} • R$ ${((item.valorCentavos || 1000) / 100).toFixed(2)} • ${item.dias || 14} dias • ${marketData(item.criadoEm)}`
                )
            );

            if (item.status === "pendente") {
                const aprovar = marketEl("button", "Confirmar Pix e ativar");

                aprovar.addEventListener("click", async () => {
                    if (!marketAdminAutorizado()) return;

                    if (!confirm("Você conferiu o Pix no banco? Ativar Booster por 14 dias?")) return;

                    aprovar.disabled = true;

                    try {
                        if (!item.idSubsite) {
                            throw new Error("ID da vitrine não informado.");
                        }

                        const refVitrine = doc(
                            db,
                            "marketplacePublicos",
                            item.idSubsite
                        );

                        const vitrine = await getDoc(refVitrine);

                        if (!vitrine.exists()) {
                            throw new Error("Vitrine não está publicada.");
                        }

                        const inicio = new Date();
                        const fim = new Date(inicio.getTime() + 14 * 86400000);

                        const batch = writeBatch(db);

                        batch.update(refVitrine, {
                            boosterAte: fim
                        });

                        batch.update(snap.ref, {
                            status: "aprovado",
                            aprovadoEm: inicio,
                            expiraEm: fim
                        });

                        await batch.commit();
                        await carregarMarketplaceAdmin();

                    } catch (e) {
                        alert("Falha ao aprovar: " + e.message);
                        aprovar.disabled = false;
                    }
                });

                const recusar = marketEl("button", "Recusar");

                recusar.addEventListener("click", async () => {
                    if (!confirm("Recusar solicitação?")) return;

                    try {
                        await updateDoc(snap.ref, {
                            status: "recusado"
                        });

                        await carregarMarketplaceAdmin();
                    } catch (e) {
                        alert("Erro: " + e.message);
                    }
                });

                card.append(aprovar, recusar);
            }

            pedidos.append(card);
        }

        if (!p.size) {
            pedidos.append(marketEl("p", "Nenhuma solicitação de Booster."));
        }

        // DENÚNCIAS

        for (const snap of d.docs) {
            const item = snap.data();
            const card = marketEl("article");

            card.append(
                marketEl(
                    "strong",
                    `Vitrine: ${item.idVitrine || "—"} • ${item.status || "—"}`
                ),
                marketEl("p", `Motivo: ${item.motivo || "—"}`)
            );

            if (item.status === "pendente") {
                const resolver = async suspender => {
                    if (!confirm(
                        suspender
                            ? "Suspender a vitrine pública?"
                            : "Rejeitar denúncia?"
                    )) return;

                    try {
                        const batch = writeBatch(db);

                        if (suspender) {
                            if (!item.idVitrine) {
                                throw new Error("ID da vitrine não informado.");
                            }

                            batch.set(
                                doc(db, "marketplaceSuspensoes", item.idVitrine),
                                {
                                    ativo: true,
                                    motivo: item.motivo || "",
                                    criadoEm: new Date()
                                }
                            );

                            batch.delete(
                                doc(db, "marketplacePublicos", item.idVitrine)
                            );
                        }

                        batch.update(snap.ref, {
                            status: suspender ? "suspensa" : "rejeitada",
                            analisadoEm: new Date()
                        });

                        await batch.commit();
                        await carregarMarketplaceAdmin();

                    } catch (e) {
                        alert("Erro: " + e.message);
                    }
                };

                const suspender = marketEl("button", "Suspender vitrine");
                suspender.addEventListener("click", () => resolver(true));

                const rejeitar = marketEl("button", "Rejeitar denúncia");
                rejeitar.addEventListener("click", () => resolver(false));

                card.append(suspender, rejeitar);
            }

            denuncias.append(card);
        }

        if (!d.size) {
            denuncias.append(marketEl("p", "Nenhuma denúncia recebida."));
        }

        // VITRINES SUSPENSAS

        const suspensas = s.docs.filter(x => x.data().ativo === true);

        for (const snap of suspensas) {
            const item = snap.data();
            const card = marketEl("article");

            card.append(
                marketEl("strong", `Vitrine: ${snap.id}`),
                marketEl(
                    "p",
                    `Motivo: ${item.motivo || "—"} • ${marketData(item.criadoEm)}`
                ),
                marketEl(
                    "p",
                    "Suspensão ativa. A reativação exige revisão antes de republicar."
                )
            );

            suspensoes.append(card);
        }

        if (!suspensas.length) {
            suspensoes.append(marketEl("p", "Nenhuma vitrine suspensa."));
        }

        marketStatus("Dados atualizados. Confira os pagamentos no banco.");

    } catch (e) {
        console.error("Erro ao carregar Marketplace:", e);
        marketStatus("Erro ao carregar Marketplace: " + e.message);
    }
}

document.getElementById("market-admin-atualizar")
    ?.addEventListener("click", carregarMarketplaceAdmin);


// CONFIGURACOES DE PRECOS E PROMOCOES (somente admin)
const PRECOS_PLANOS = [
  ['start','Start',49.99],['pro','Pro',79.99],['elite','Elite',99.99],
  ['elite_premium','Elite Premium',149.99],['fvm_start','FVM Start',49.99],
  ['fvm_pro','FVM Pro',79.99],['fvm_elite','FVM Elite',99.99],
  ['fvm_elite_premium','FVM Elite Premium',149.99]
];
const PRECOS_DOC = doc(db, 'config_admin', 'precos_promocoes');
const precosAutorizado = () => auth.currentUser?.email === emailAdmin && auth.currentUser?.emailVerified === true;
function campoPreco(rotulo, nome, valor, tipo='number', extra='') {
  const label=document.createElement('label'); label.textContent=rotulo;
  const input=document.createElement('input'); input.name=nome; input.type=tipo;
  if(tipo==='number'){input.min='0';input.step=nome==='dias'?'1':'0.01';}
  if(extra) input.placeholder=extra;
  input.value=valor ?? '';
  label.append(input);return label;
}
function campoSelect(rotulo,nome,opcoes,valor){
  const label=document.createElement('label');label.textContent=rotulo;
  const select=document.createElement('select');select.name=nome;
  for(const [id,txt] of opcoes){const o=document.createElement('option');o.value=id;o.textContent=txt;select.append(o);}
  select.value=valor||opcoes[0][0];label.append(select);return label;
}
function montarCardPreco(id,titulo,dados,precoPadrao,booster=false){
  const card=document.createElement('div');card.className='admin-precos-item';card.dataset.id=id;
  const h=document.createElement('h4');h.textContent=titulo;card.append(h);
  card.append(campoPreco('Preço normal (R$)','normal',dados.normal ?? precoPadrao));
  card.append(campoPreco('Preço promocional (R$)','promocional',dados.promocional ?? ''));
  const label=document.createElement('label');label.className='admin-precos-check';
  const check=document.createElement('input');check.type='checkbox';check.name='ativo';check.checked=dados.ativo===true;
  label.append(check,document.createTextNode('Ativar promoção'));card.append(label);
  card.append(campoPreco('Início da promoção','inicio',dados.inicio||'','date'));
  card.append(campoPreco('Fim da promoção','fim',dados.fim||'','date'));
  if(booster){card.append(campoPreco('Duração do anúncio (dias)','dias',dados.dias ?? 14));}
  else card.append(campoSelect('Condição da oferta','aplicacao',[
    ['primeira_mensalidade','Somente primeira mensalidade'],
    ['recorrente','Preço recorrente para novos contratos']
  ],dados.aplicacao));
  return card;
}
async function carregarPrecosAdmin(){
  const status=document.getElementById('precos-status');
  if(!precosAutorizado()){if(status)status.textContent='Acesso requer administrador com e-mail verificado.';return;}
  try{
    const snap=await getDoc(PRECOS_DOC),config=snap.exists()?snap.data():{};
    const grid=document.getElementById('precos-planos-grid');
    const boost=document.getElementById('precos-booster-grid');
    grid.replaceChildren();boost.replaceChildren();
    for(const [id,nome,preco] of PRECOS_PLANOS)grid.append(montarCardPreco(id,nome,config.planos?.[id]||{},preco));
    boost.append(montarCardPreco('booster','Booster Marketplace',config.booster||{},10,true));
    if(status)status.textContent='Configurações carregadas. Valores públicos ainda não estão integrados.';
  }catch(e){console.error(e);if(status)status.textContent='Erro ao carregar: '+e.message;}
}
function lerCardPreco(card){
  const pegar=n=>card.querySelector(`[name="${n}"]`);
  const normal=Number(pegar('normal').value);
  const strPromo=pegar('promocional').value;
  const promocional=strPromo===''?null:Number(strPromo);
  const ativo=pegar('ativo').checked;
  const inicio=pegar('inicio').value,fim=pegar('fim').value;
  if(!Number.isFinite(normal)||normal<0||normal>100000)throw Error('Preço normal inválido em '+card.dataset.id);
  if(promocional!==null&&(!Number.isFinite(promocional)||promocional<0||promocional>=normal))throw Error('Preço promocional deve ser menor que o normal em '+card.dataset.id);
  if(ativo&&(!inicio||!fim||promocional===null))throw Error('Preencha preço e datas da promoção em '+card.dataset.id);
  if(inicio&&fim&&fim<inicio)throw Error('Data final anterior à inicial em '+card.dataset.id);
  const out={normal,promocional,ativo,inicio,fim};
  if(card.dataset.id==='booster'){
    const dias=Number(pegar('dias').value);
    if(!Number.isInteger(dias)||dias<1||dias>365)throw Error('Duração do Booster deve ser de 1 a 365 dias');
    out.dias=dias;
  }else out.aplicacao=pegar('aplicacao').value;
  return out;
}
document.getElementById('btn-salvar-precos')?.addEventListener('click',async()=>{
  const status=document.getElementById('precos-status'),btn=document.getElementById('btn-salvar-precos');
  if(!precosAutorizado()){alert('Administrador não autorizado ou e-mail não verificado.');return;}
  try{
    const planos={};
    for(const card of document.querySelectorAll('#precos-planos-grid .admin-precos-item'))planos[card.dataset.id]=lerCardPreco(card);
    const booster=lerCardPreco(document.querySelector('#precos-booster-grid .admin-precos-item'));
    if(!confirm('Salvar configurações no Firebase? Isso ainda não muda os preços mostrados aos clientes.'))return;
    btn.disabled=true;
    await setDoc(PRECOS_DOC,{planos,booster,atualizadoEm:new Date(),atualizadoPor:auth.currentUser.uid});
    status.textContent='Configurações salvas no Firebase. Integração pública pendente.';
  }catch(e){console.error(e);alert('Erro ao salvar: '+e.message);}
  finally{btn.disabled=false;}
});

// OBSERVADOR DE LOGIN

onAuthStateChanged(auth, user => {
    if (user && user.email === emailAdmin) {
        mostrarTela("tela-admin-painel");
        carregarClientes();
        carregarMarketplaceAdmin();
        carregarPrecosAdmin();

    } else if (user) {
        mostrarTela("tela-admin-login");
        signOut(auth);
        alert("Acesso negado. Você não é o administrador.");

    } else {
        mostrarTela("tela-admin-login");
    }
});
// ==========================================
// NEO FLUX ADMIN 2.0 - MENU LATERAL
// ==========================================

function iniciarNavegacaoAdmin() {
    const conteudo = document.querySelector(".neo-admin-conteudo");
    const botoes = document.querySelectorAll("[data-admin-aba]");

    if (!conteudo || !botoes.length) return;

    const grupos = {
        inicio: [".admin-header"],
        planos: ["#admin-precos-painel"],
        clientes: [".admin-caixa-clientes"],
        wave: [".admin-card-monitor", ".admin-card-autopilot"],
        marketplace: [".admin-marketplace:not(#admin-precos-painel)"]
    };

    const secoes = [];

    for (const [aba, seletores] of Object.entries(grupos)) {
        for (const seletor of seletores) {
            conteudo.querySelectorAll(seletor).forEach(elemento => {
                if (elemento.parentElement !== conteudo) return;

                elemento.dataset.adminSecao = aba;
                secoes.push(elemento);
            });
        }
    }

    function abrirAba(aba) {
        botoes.forEach(botao => {
            const ativo = botao.dataset.adminAba === aba;
            botao.classList.toggle("ativo", ativo);
            botao.setAttribute("aria-pressed", String(ativo));
        });

        secoes.forEach(secao => {
            secao.classList.toggle(
                "neo-secao-ativa",
                secao.dataset.adminSecao === aba
            );
        });
    }

    botoes.forEach(botao => {
        botao.addEventListener("click", () => {
            abrirAba(botao.dataset.adminAba);
        });
    });

    abrirAba("inicio");
}

iniciarNavegacaoAdmin();
