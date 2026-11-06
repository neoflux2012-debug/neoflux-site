
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// NEO SECRETÁRIO - CONFIGURAÇÃO
// ==========================================

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const planosPermitidos = new Set([
    "elite_premium",
    "fvm_elite_premium"
]);

const modal = document.getElementById(
    "modal-neo-secretario"
);

const resultado = document.getElementById(
    "neo-secretario-resultado"
);

const botao = document.getElementById(
    "btn-neo-secretario"
);

let festas = [];

// ==========================================
// UTILITÁRIOS
// ==========================================

function criarElemento(tag, texto, estilo = "") {
    const el = document.createElement(tag);

    el.textContent = texto;

    if (estilo) {
        el.style.cssText = estilo;
    }

    return el;
}

function dataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function dataBR(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data || "")) {
        return "Data não informada";
    }

    return data.split("-").reverse().join("/");
}

function dinheiro(valor) {
    if (typeof valor === "number") {
        return valor;
    }

    const texto = String(valor ?? "0")
        .replace(/R\$|\s/g, "");

    const normalizado = texto.includes(",")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto;

    return Number(normalizado) || 0;
}

function formatarDinheiro(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ==========================================
// RESULTADOS
// ==========================================

function limparResultado() {
    resultado.replaceChildren();
}

function mostrarAviso(texto) {
    limparResultado();

    resultado.append(
        criarElemento("p", texto)
    );
}

function mostrarLista(titulo, registros, detalhe) {
    limparResultado();

    resultado.append(
        criarElemento(
            "h3",
            titulo,
            "color:#c9a5ff;"
        )
    );

    resultado.append(
        criarElemento(
            "p",
            `${registros.length} registro(s) encontrado(s).`,
            "color:#aaa;"
        )
    );

    if (!registros.length) {
        resultado.append(
            criarElemento(
                "p",
                "Nenhuma ocorrência neste período."
            )
        );

        return;
    }

    for (const festa of registros) {
        const bloco = criarElemento(
            "div",
            "",
            `
                border:1px solid #333;
                background:#191919;
                border-radius:10px;
                padding:12px;
                margin:9px 0;
            `
        );

        bloco.append(
            criarElemento(
                "strong",
                `${dataBR(festa.data)} · ${festa.nome || "Cliente sem nome"}`
            )
        );

        bloco.append(
            criarElemento(
                "div",
                detalhe(festa),
                "font-size:.9rem;color:#bbb;"
            )
        );

        resultado.append(bloco);
    }
}

// ==========================================
// COMANDOS DO SECRETÁRIO
// ==========================================

function executarComando(acao) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const hojeISO = dataISO(hoje);

    if (acao === "hoje") {
        const registros = festas.filter(
            festa => festa.data === hojeISO
        );

        mostrarLista(
            "☀️ Compromissos de hoje",
            registros,
            festa =>
                `Tema: ${festa.tema || "Não informado"} · ` +
                `Local: ${festa.local || "Não informado"}`
        );
    }

    else if (acao === "semana") {
        const fim = new Date(hoje);

        fim.setDate(fim.getDate() + 6);

        const fimISO = dataISO(fim);

        const registros = festas
            .filter(festa =>
                festa.data >= hojeISO &&
                festa.data <= fimISO
            )
            .sort((a, b) =>
                a.data.localeCompare(b.data)
            );

        mostrarLista(
            "📅 Próximos 7 dias",
            registros,
            festa =>
                `Tema: ${festa.tema || "Não informado"} · ` +
                `Local: ${festa.local || "Não informado"}`
        );
    }

    else if (acao === "pendencias") {
        const registros = festas
            .filter(festa =>
                festa.data >= hojeISO &&
                dinheiro(festa.total) > dinheiro(festa.sinal)
            )
            .sort((a, b) =>
                a.data.localeCompare(b.data)
            );

        mostrarLista(
            "🔔 Possíveis saldos pendentes",
            registros,
            festa => {
                const saldo =
                    dinheiro(festa.total) -
                    dinheiro(festa.sinal);

                return (
                    `Saldo estimado: ${formatarDinheiro(saldo)}. ` +
                    "Confira pagamentos posteriores no contrato."
                );
            }
        );
    }
}

// ==========================================
// ABRIR SECRETÁRIO
// ==========================================

async function abrirSecretario() {
    if (!modal || !resultado) return;

    mostrarAviso(
        "Conferindo seu acesso e carregando os compromissos..."
    );

    modal.hidden = false;
    modal.style.display = "flex";

    const modalComandos = document.getElementById(
        "modal-comandos-neo-wave"
    );

    if (modalComandos) {
        modalComandos.style.display = "none";
    }

    try {
        const usuario = auth.currentUser;

        const subsiteId =
            window.neoSecretarioContexto?.subsiteId;

        if (!usuario || !subsiteId) {
            throw new Error(
                "Entre na sua conta e abra um subsite."
            );
        }

        const [usuarioSnap, subsiteSnap] =
            await Promise.all([
                getDoc(
                    doc(db, "usuarios", usuario.uid)
                ),
                getDoc(
                    doc(db, "subsites", subsiteId)
                )
            ]);

        if (!usuarioSnap.exists() || !subsiteSnap.exists()) {
            throw new Error(
                "Conta ou subsite não encontrado."
            );
        }

        const dados = usuarioSnap.data();
        const subsite = subsiteSnap.data();

        if (!planosPermitidos.has(dados.planoPreferido)) {
            throw new Error(
                "Recurso exclusivo do Elite Premium e FVM Elite Premium."
            );
        }

        if (dados.statusPagamento !== "ativo") {
            throw new Error(
                "A assinatura precisa estar ativa."
            );
        }

        if (subsite.idDono !== usuario.uid) {
            throw new Error(
                "Você não possui acesso a este subsite."
            );
        }

        const consulta = query(
            collection(db, "festas"),
            where("idSubsite", "==", subsiteId)
        );

        const snapshot = await getDocs(consulta);

        festas = snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        executarComando("hoje");

    } catch (erro) {
        console.error("Neo Secretário:", erro);

        mostrarAviso(
            "Não foi possível abrir: " + erro.message
        );
    }
}

// ==========================================
// EVENTOS
// ==========================================

botao?.addEventListener(
    "click",
    abrirSecretario
);

document.getElementById(
    "neo-secretario-fechar"
)?.addEventListener("click", () => {
    modal.hidden = true;
    modal.style.display = "none";
});

document.querySelectorAll(
    "[data-secretario-acao]"
).forEach(botaoAcao => {
    botaoAcao.addEventListener("click", () => {
        executarComando(
            botaoAcao.dataset.secretarioAcao
        );
    });
});
