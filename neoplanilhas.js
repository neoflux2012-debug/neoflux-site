
import { auth, db } from "./firebase-config.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// NEO FLUX - PLANILHAS INTELIGENTES
// ==========================================

const el = id => document.getElementById(id);

const money = valor =>
    Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

const planosPermitidos = new Set([
    "pro",
    "elite",
    "elite_premium",
    "fvm_pro",
    "fvm_elite",
    "fvm_elite_premium"
]);

let linhas = [];
let linhasAutomaticas = [];
let modo = "automatica";
let contexto = null;

function mensagem(texto) {
    const elemento = el("planilhas-mensagem");

    if (elemento) {
        elemento.textContent = texto;
    }
}

function linhaVazia() {
    return {
        data: "",
        descricao: "",
        tipo: "receita",
        valor: 0
    };
}

// ==========================================
// VERIFICAR PERMISSÕES
// ==========================================

function validarAcesso() {
    contexto = window.neoPlanilhasContexto;

    const permitido =
        auth.currentUser &&
        contexto?.subsiteId &&
        contexto.permitido === true &&
        planosPermitidos.has(contexto.plano);

    if (!permitido) {
        alert(
            "Planilhas disponíveis a partir do Plano Pro."
        );
        return false;
    }

    return true;
}

// ==========================================
// CRIAR CÉLULAS
// ==========================================

function criarCelula(
    tr,
    campo,
    valor,
    tipo = "text",
    bloqueado = false
) {
    const td = document.createElement("td");
    const input = document.createElement("input");

    input.type = tipo;
    input.value = valor ?? "";
    input.disabled = bloqueado;

    if (tipo === "number") {
        input.step = "0.01";
        input.min = "0";
    }

    input.addEventListener("change", () => {
        if (bloqueado) return;

        const indice = Number(tr.dataset.indice);

        linhas[indice][campo] =
            campo === "valor"
                ? Number(input.value) || 0
                : input.value;

        atualizarResumo();
    });

    td.appendChild(input);
    tr.appendChild(td);
}

// ==========================================
// DESENHAR PLANILHA
// ==========================================

function renderizar() {
    const corpo = el("planilhas-linhas");

    if (!corpo) return;

    corpo.replaceChildren();

    const lista = modo === "automatica"
        ? [...linhasAutomaticas, ...linhas]
        : linhas;

    lista.forEach((item, indice) => {
        const automatico =
            modo === "automatica" &&
            indice < linhasAutomaticas.length;

        const indiceManual = automatico
            ? -1
            : indice - (
                modo === "automatica"
                    ? linhasAutomaticas.length
                    : 0
            );

        const tr = document.createElement("tr");
        tr.dataset.indice = indiceManual;

        criarCelula(
            tr,
            "data",
            item.data,
            "date",
            automatico
        );

        criarCelula(
            tr,
            "descricao",
            item.descricao,
            "text",
            automatico
        );

        const tdTipo = document.createElement("td");
        const seletor = document.createElement("select");

        seletor.disabled = automatico;

        [
            ["receita", "Receita"],
            ["despesa", "Despesa"],
            ["imposto", "Imposto"]
        ].forEach(([valor, titulo]) => {
            const opcao = document.createElement("option");
            opcao.value = valor;
            opcao.textContent = titulo;
            seletor.appendChild(opcao);
        });

        seletor.value = item.tipo;

        seletor.addEventListener("change", () => {
            if (automatico) return;

            linhas[indiceManual].tipo = seletor.value;
            atualizarResumo();
        });

        tdTipo.appendChild(seletor);
        tr.appendChild(tdTipo);

        criarCelula(
            tr,
            "valor",
            item.valor,
            "number",
            automatico
        );

        const tdAcoes = document.createElement("td");

        if (automatico) {
            tdAcoes.textContent = "Automático";
        } else {
            const excluir = document.createElement("button");

            excluir.type = "button";
            excluir.textContent = "Excluir";

            excluir.addEventListener("click", () => {
                linhas.splice(indiceManual, 1);
                renderizar();
            });

            tdAcoes.appendChild(excluir);
        }

        tr.appendChild(tdAcoes);
        corpo.appendChild(tr);
    });

    atualizarResumo();
}

// ==========================================
// CALCULAR RECEITAS, DESPESAS E IMPOSTOS
// ==========================================

function atualizarResumo() {
    const lista = modo === "automatica"
        ? [...linhasAutomaticas, ...linhas]
        : linhas;

    const somar = tipo =>
        lista
            .filter(item => item.tipo === tipo)
            .reduce(
                (total, item) =>
                    total + Number(item.valor || 0),
                0
            );

    const receitas = somar("receita");
    const despesas = somar("despesa");
    const impostos = somar("imposto");

    const resultado = receitas - despesas - impostos;

    el("planilhas-resumo").textContent =
        `Receitas: ${money(receitas)} · ` +
        `Despesas: ${money(despesas)} · ` +
        `Impostos: ${money(impostos)} · ` +
        `Resultado estimado: ${money(resultado)}`;
}

// ==========================================
// BUSCAR FESTAS AUTOMATICAMENTE
// ==========================================

async function carregarAutomatico() {
    linhasAutomaticas = [];

    if (modo !== "automatica") {
        el("planilhas-info-auto").textContent = "";
        return;
    }

    const consulta = query(
        collection(db, "festas"),
        where("idSubsite", "==", contexto.subsiteId)
    );

    const resultado = await getDocs(consulta);

    resultado.forEach(documento => {
        const festa = documento.data();

        const valor =
            (Number(festa.total) || 0) +
            (Number(festa.frete) || 0);

        linhasAutomaticas.push({
            data: festa.data || "",
            descricao:
                "Festa: " +
                (festa.nome || festa.tema || documento.id),
            tipo: "receita",
            valor
        });
    });

    el("planilhas-info-auto").textContent =
        `${linhasAutomaticas.length} festa(s) carregada(s). ` +
        "Esses valores representam contratos, " +
        "não necessariamente pagamentos recebidos.";
}

// ==========================================
// ABRIR PLANILHAS
// ==========================================

async function abrirPlanilhas() {
    if (!validarAcesso()) return;

    try {
        const subsite = await getDoc(
            doc(db, "subsites", contexto.subsiteId)
        );

        if (
            !subsite.exists() ||
            subsite.data().idDono !== auth.currentUser.uid
        ) {
            alert("Subsite não autorizado.");
            return;
        }

        el("modal-planilhas").style.display = "flex";

        modo = "automatica";
        linhas = [];

        el("planilhas-modo").value = modo;

        await carregarAutomatico();
        renderizar();

        mensagem(
            "Planilha aberta. Use a engrenagem para alterar o modo."
        );

    } catch (erro) {
        console.error(erro);
        mensagem("Erro ao abrir: " + erro.message);
    }
}

// ==========================================
// IDENTIFICAR PLANILHA
// ==========================================

function identificarPlanilha() {
    const nome = el("planilhas-nome").value.trim();

    if (!nome || nome.length > 70) {
        throw new Error(
            "Informe um nome de até 70 caracteres."
        );
    }

    return {
        nome,
        id: encodeURIComponent(nome).replace(/%/g, "_")
    };
}

// ==========================================
// SALVAR NO FIREBASE
// ==========================================

async function salvarPlanilha() {
    if (!validarAcesso()) return;

    try {
        const { nome, id } = identificarPlanilha();

        await setDoc(
            doc(
                db,
                "subsites",
                contexto.subsiteId,
                "planilhas",
                id
            ),
            {
                nome,
                modo,
                linhas,
                atualizadoEm: new Date().toISOString(),
                dono: auth.currentUser.uid
            }
        );

        mensagem("Planilha salva na nuvem!");

    } catch (erro) {
        mensagem("Erro ao salvar: " + erro.message);
    }
}

// ==========================================
// CARREGAR PLANILHA SALVA
// ==========================================

async function carregarPlanilha() {
    if (!validarAcesso()) return;

    try {
        const { id } = identificarPlanilha();

        const resultado = await getDoc(
            doc(
                db,
                "subsites",
                contexto.subsiteId,
                "planilhas",
                id
            )
        );

        if (!resultado.exists()) {
            mensagem("Nenhuma planilha com esse nome.");
            return;
        }

        const dados = resultado.data();

        modo = dados.modo === "manual"
            ? "manual"
            : "automatica";

        linhas = Array.isArray(dados.linhas)
            ? dados.linhas
            : [];

        el("planilhas-modo").value = modo;

        await carregarAutomatico();
        renderizar();

        mensagem("Planilha carregada!");

    } catch (erro) {
        mensagem("Erro ao carregar: " + erro.message);
    }
}

// ==========================================
// EXPORTAR CSV
// ==========================================

function exportarCSV() {
    const lista = modo === "automatica"
        ? [...linhasAutomaticas, ...linhas]
        : linhas;

    const escapar = valor =>
        '"' + String(valor ?? "").replace(/"/g, '""') + '"';

    const tabela = [
        ["Data", "Descrição", "Tipo", "Valor"],
        ...lista.map(item => [
            item.data,
            item.descricao,
            item.tipo,
            item.valor
        ])
    ];

    const csv =
        "\ufeff" +
        tabela
            .map(linha =>
                linha.map(escapar).join(";")
            )
            .join("\r\n");

    const arquivo = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(arquivo);

    const link = document.createElement("a");
    link.href = url;
    link.download = "neo-planilha.csv";
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ==========================================
// IMPORTAR CSV
// ==========================================

function interpretarCSV(texto) {
    const linhasCSV = texto
        .replace(/^\ufeff/, "")
        .trim()
        .split(/\r?\n/);

    const separador =
        linhasCSV[0]?.includes(";") ? ";" : ",";

    function lerLinha(textoLinha) {
        const resultado = [];
        let valor = "";
        let entreAspas = false;

        for (let i = 0; i < textoLinha.length; i++) {
            const caractere = textoLinha[i];

            if (caractere === '"') {
                if (
                    entreAspas &&
                    textoLinha[i + 1] === '"'
                ) {
                    valor += '"';
                    i++;
                } else {
                    entreAspas = !entreAspas;
                }
            } else if (
                caractere === separador &&
                !entreAspas
            ) {
                resultado.push(valor);
                valor = "";
            } else {
                valor += caractere;
            }
        }

        resultado.push(valor);
        return resultado;
    }

    return linhasCSV
        .slice(1)
        .map(lerLinha)
        .filter(linha => linha.length >= 4)
        .map(linha => ({
            data: linha[0],
            descricao: linha[1],
            tipo: ["receita", "despesa", "imposto"]
                .includes(linha[2])
                ? linha[2]
                : "receita",
            valor:
                Number(
                    String(linha[3]).replace(",", ".")
                ) || 0
        }));
}

async function importarCSV(evento) {
    const arquivo = evento.target.files?.[0];

    if (!arquivo) return;

    try {
        if (!arquivo.name.toLowerCase().endsWith(".csv")) {
            throw new Error(
                "Nesta versão, importe arquivos CSV."
            );
        }

        const novasLinhas = interpretarCSV(
            await arquivo.text()
        );

        if (novasLinhas.length > 1000) {
            throw new Error(
                "Limite de 1000 linhas por importação."
            );
        }

        linhas.push(...novasLinhas);
        renderizar();

        mensagem(
            `${novasLinhas.length} linha(s) importada(s). ` +
            "Confira os valores antes de salvar."
        );

    } catch (erro) {
        mensagem("Erro ao importar: " + erro.message);
    } finally {
        evento.target.value = "";
    }
}

// ==========================================
// EVENTOS DOS BOTÕES
// ==========================================

el("btn-planilhas-analista")?.addEventListener(
    "click",
    abrirPlanilhas
);

el("btn-planilhas-pro")?.addEventListener(
    "click",
    abrirPlanilhas
);

el("planilhas-fechar")?.addEventListener(
    "click",
    () => {
        el("modal-planilhas").style.display = "none";
    }
);

el("planilhas-config")?.addEventListener(
    "click",
    () => {
        const opcoes = el("planilhas-opcoes");

        opcoes.hidden = !opcoes.hidden;

        el("planilhas-config").setAttribute(
            "aria-expanded",
            String(!opcoes.hidden)
        );
    }
);

el("planilhas-modo")?.addEventListener(
    "change",
    async evento => {
        modo = evento.target.value;

        try {
            await carregarAutomatico();
            renderizar();
        } catch (erro) {
            mensagem(
                "Erro ao carregar dados: " + erro.message
            );
        }
    }
);

el("planilhas-adicionar")?.addEventListener(
    "click",
    () => {
        linhas.push(linhaVazia());
        renderizar();
    }
);

el("planilhas-salvar")?.addEventListener(
    "click",
    salvarPlanilha
);

el("planilhas-carregar")?.addEventListener(
    "click",
    carregarPlanilha
);

el("planilhas-exportar")?.addEventListener(
    "click",
    exportarCSV
);

el("planilhas-importar")?.addEventListener(
    "change",
    importarCSV
);
