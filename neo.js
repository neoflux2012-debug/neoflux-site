// ==========================================
// 1. IMPORTAÇÕES
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

let subsiteAtualId = "";
let planoAtual = "";
let festasGlobais = [];

// ==========================================
// 3. REGRAS E TEXTOS
// ==========================================
const termosPlanos = {
    start: `<h3>Plano Start</h3><p>Ideal para começar. Inclui 1 subsite, 1 login por subsite e armazenamento local.</p>`,
    pro: `<h3>Plano Pro</h3><p>Para quem quer crescer. Inclui 1 subsite, até 2 logins, armazenamento em nuvem e agendamento de reuniões.</p>`,
    elite: `<h3>Plano Elite</h3><p>A experiência completa. Múltiplos subsites, múltiplos logins, nuvem completa e reuniões ilimitadas.</p>`,
    elite_premium: `<h3>Elite Premium</h3><p>Todas as ferramentas do Elite + Gerador de Contratos exclusivo.</p>`
};

const limitesPlanos = { start: 1, pro: 1, elite: 999, elite_premium: 9999 };

const recursosPlanos = {
    start: { kits: false, relatorios: false, assistente: false, valores: false, contratos: false },
    pro: { kits: true, relatorios: true, assistente: false, valores: true, contratos: false },
    elite: { kits: true, relatorios: true, assistente: true, valores: true, contratos: false },
    elite_premium: { kits: true, relatorios: true, assistente: true, valores: true, contratos: true }
};

// ==========================================
// 4. CONTROLE DE TELAS E LOADING
// ==========================================
const todasAsTelas = document.querySelectorAll('.tela');

function mostrarTela(id) {
    todasAsTelas.forEach(t => t.classList.remove('ativa'));
    const tela = document.getElementById(id);
    if (tela) tela.classList.add('ativa');
    window.scrollTo(0, 0);
}

function carregar(ativo) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = ativo ? 'flex' : 'none';
}

// ==========================================
// 5. NAVEGAÇÃO E CADASTRO
// ==========================================
document.getElementById('btn-comecar')?.addEventListener('click', () => mostrarTela('tela-planos'));
document.getElementById('voltar-inicio')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-boas-vindas'); });
document.getElementById('ir-para-login')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-login'); });
document.getElementById('voltar-para-cadastro')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-boas-vindas'); });
document.getElementById('ir-para-recuperar')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-recuperar'); });
document.getElementById('voltar-login-rec')?.addEventListener('click', (e) => { e.preventDefault(); mostrarTela('tela-login'); });
document.getElementById('btn-voltar-cliente')?.addEventListener('click', () => mostrarTela('tela-cliente'));
document.getElementById('btn-ir-para-login')?.addEventListener('click', () => mostrarTela('tela-login'));

document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await signOut(auth);
    mostrarTela('tela-boas-vindas');
});

document.querySelectorAll('.btn-selecionar-plano').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const card = e.target.closest('.card-plano');
        planoAtual = card.getAttribute('data-plano');
        
        const nomePlano = card.querySelector('h3').textContent;
        document.getElementById('titulo-termos').textContent = `Termos e Condições - ${nomePlano}`;
        document.getElementById('texto-termos').innerHTML = termosPlanos[planoAtual] || "";
        
        mostrarTela('tela-termos');
    });
});

document.getElementById('form-termos')?.addEventListener('submit', (e) => { 
    e.preventDefault(); 
    mostrarTela('tela-criar-conta'); 
});

document.getElementById('form-cadastro-final')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    try {
        const email = document.getElementById('email-cadastro').value;
        const senha = document.getElementById('senha-cadastro').value;
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await updateProfile(cred.user, { displayName: document.getElementById('nome-cliente').value });
        await sendEmailVerification(cred.user);
        await setDoc(doc(db, "usuarios", cred.user.uid), {
            nome: document.getElementById('nome-cliente').value, 
            email: email, 
            planoPreferido: planoAtual, 
            statusPagamento: "pendente"
        });
        mostrarTela('tela-pagamento');
    } catch (error) { alert("Erro: " + error.message); }
    finally { carregar(false); }
});

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('email-login').value, document.getElementById('senha-login').value);
    } catch (error) { alert("E-mail ou senha incorretos."); }
    finally { carregar(false); }
});

document.getElementById('form-recuperar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    try {
        await sendPasswordResetEmail(auth, document.getElementById('email-recuperar').value);
        alert("Link de recuperação enviado!");
    } catch (error) { alert("Erro ao enviar e-mail."); }
    finally { carregar(false); }
});

// ==========================================
// 6. ÁREA DO CLIENTE E SUBSITES
// ==========================================
async function carregarDadosCliente(uid) {
    carregar(true);
    try {
        const snap = await getDoc(doc(db, "usuarios", uid));
        if (snap.exists()) {
            const dados = snap.data();
            planoAtual = dados.planoPreferido;
            document.getElementById('cliente-nome').textContent = dados.nome;
            document.getElementById('cliente-plano').textContent = dados.planoPreferido.toUpperCase();
            document.getElementById('cliente-status').textContent = dados.statusPagamento;
            
            const limite = limitesPlanos[planoAtual] || 1;
            carregarSubsites(uid, limite);
        }
    } catch (error) { console.error(error); }
    finally { carregar(false); }
}

async function carregarSubsites(uid, limite) {
    const lista = document.getElementById('lista-subsites');
    if(!lista) return;
    lista.innerHTML = "";
    const snap = await getDocs(query(collection(db, "subsites"), where("idDono", "==", uid)));
    
    const btnCriar = document.getElementById('btn-criar-subsite');
    const inputTitulo = document.getElementById('titulo-subsite');
    
    if (btnCriar && inputTitulo) {
        if (snap.size >= limite) {
            btnCriar.disabled = true; inputTitulo.disabled = true;
        } else {
            btnCriar.disabled = false; inputTitulo.disabled = false;
        }
    }

    snap.forEach(doc => {
        const sub = doc.data();
        const li = document.createElement('li');
        li.style.cssText = "border: 1px solid #333; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; background: #0a0a0a;";
        li.innerHTML = `
            <strong>${sub.titulo}</strong>
            <div>
                <button class="btn-acessar" data-id="${doc.id}" style="background: #00d2ff; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">Acessar</button>
                <button class="btn-apagar" data-id="${doc.id}" style="background: #e74c3c; padding: 5px 10px; border: none; border-radius: 4px; color: white; cursor: pointer;">X</button>
            </div>
        `;
        lista.appendChild(li);
    });

    document.querySelectorAll('.btn-acessar').forEach(btn => btn.addEventListener('click', (e) => abrirSubsite(e.target.getAttribute('data-id'))));
    document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async (e) => {
        if(confirm("Apagar?")) { 
            await deleteDoc(doc(db, "subsites", e.target.getAttribute('data-id'))); 
            carregarDadosCliente(auth.currentUser.uid); 
        }
    }));
}

document.getElementById('btn-criar-subsite')?.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo-subsite').value;
    if (!titulo) return;
    await addDoc(collection(db, "subsites"), { idDono: auth.currentUser.uid, titulo: titulo, criadoEm: new Date() });
    document.getElementById('titulo-subsite').value = "";
    carregarDadosCliente(auth.currentUser.uid);
});

async function abrirSubsite(id) {
    subsiteAtualId = id;
    const snap = await getDoc(doc(db, "subsites", id));
    document.getElementById('nome-do-subsite').textContent = snap.data().titulo;

    const regras = recursosPlanos[planoAtual] || recursosPlanos.start;

    const btnKits = document.getElementById('btn-abrir-kits');
    if(btnKits) {
        btnKits.disabled = !regras.kits;
        btnKits.style.background = regras.kits ? "var(--gradiente-neo)" : "#333";
    }
    
    const btnRel = document.getElementById('btn-relatorios');
    if(btnRel) {
        btnRel.disabled = !regras.relatorios;
        btnRel.style.background = regras.relatorios ? "var(--gradiente-neo)" : "#333";
    }

    const btnContratos = document.getElementById('btn-abrir-contratos');
    if(btnContratos) {
        btnContratos.disabled = !regras.contratos;
        btnContratos.style.background = regras.contratos ? "#e67e22" : "#333";
    }

    const btnNeo = document.getElementById('btn-neo-wave');
    if(btnNeo) btnNeo.style.display = regras.assistente ? 'flex' : 'none';

    carregarFestas(id);
    carregarContratos();
    carregarPonto();
    mostrarTela('tela-subsite');
}

// ==========================================
// 7. FESTAS, FRETE E RELATÓRIOS
// ==========================================
async function carregarFestas(id) {
    const container = document.getElementById('lista-festas-criadas');
    if(!container) return;
    container.innerHTML = "";
    festasGlobais = [];
    
    const regras = recursosPlanos[planoAtual] || recursosPlanos.start;
    const snap = await getDocs(query(collection(db, "festas"), where("idSubsite", "==", id)));
    
    snap.forEach(doc => {
        const festa = doc.data();
        festa.id = doc.id;
        festasGlobais.push(festa);

        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        const dataFesta = new Date(festa.data + 'T00:00:00');
        const dataPassou = dataFesta < hoje;

        const botaoDevolucao = (dataPassou && festa.status === "pendente") ? 
            `<button onclick="window.registrarDevolucao('${festa.id}')" style="width: 100%; margin-bottom: 15px; padding: 10px; background: rgba(39, 174, 96, 0.2); color: #27ae60; border: 1px solid #27ae60; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 5px;">
                <i data-lucide="check-circle" style="width: 16px;"></i> Registrar Devolução
             </button>` : 
             (festa.status === "devolvido" ? `<div style="text-align: center; color: #27ae60; font-weight: bold; font-size: 0.8rem; margin-bottom: 15px;">✓ Itens Devolvidos</div>` : '');

        const total = parseFloat(festa.total) || 0;
        const sinal = parseFloat(festa.sinal) || 0;
        const falta = total - sinal;
        const valorFaltaFormatado = falta > 0 ? `R$ ${falta.toFixed(2).replace('.', ',')}` : 'Pago';
        
        const blocoValores = regras.valores ? `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                    <p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="truck" style="width: 16px;"></i> Frete</p>
                    <p style="color: #00c853; font-weight: bold; margin: 0; font-size: 1.1rem;">R$ ${festa.frete || '0,00'}</p>
                </div>
                <div>
                    <p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="dollar-sign" style="width: 16px;"></i> Total</p>
                    <p style="color: white; font-weight: bold; margin: 0; font-size: 1.1rem;">R$ ${festa.total || '0,00'}</p>
                </div>
                <div>
                    <p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="wallet" style="width: 16px;"></i> Sinal</p>
                    <p style="color: white; font-weight: bold; margin: 0; font-size: 1.1rem;">R$ ${festa.sinal || '0,00'}</p>
                </div>
            </div>
        ` : `<div><p style="color: #888; font-size: 0.8rem;">Valores disponíveis no plano Pro ou superior.</p></div>`;

        const botaoContrato = regras.contratos ? 
            `<button onclick="window.gerarContrato('${festa.id}')" style="flex: 1; padding: 10px; background: rgba(230, 126, 34, 0.1); color: #e67e22; border: 1px solid #e67e22; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 5px;"><i data-lucide="file-text" style="width: 16px;"></i> Contrato</button>` : '';

        const pecasStr = festa.pecas && festa.pecas.length > 0 ? festa.pecas.join(", ") : "Nenhuma";
        const blocoPecas = festa.pecas && festa.pecas.length > 0 ? 
            `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #333;">
                <p style="color: #888; font-size: 0.8rem; margin: 0 0 4px 0;"><i data-lucide="package" style="width: 14px; vertical-align: middle;"></i> Peças:</p>
                <p style="color: #00d2ff; font-size: 0.85rem; margin: 0;">${pecasStr}</p>
            </div>` : '';

        const card = document.createElement('div');
        card.style.cssText = "background: #0a0a0a; border: 1px solid #333; border-radius: 12px; padding: 20px; text-align: left; position: relative;";
        
        card.innerHTML = `
            ${botaoDevolucao}
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="background: rgba(0, 210, 255, 0.1); padding: 8px; border-radius: 8px;">
                        <i data-lucide="party-popper" style="color: #00d2ff; width: 20px; height: 20px;"></i>
                    </div>
                    <div>
                        <h4 style="color: white; margin: 0; font-size: 1.1rem;">${festa.nome}</h4>
                        <small style="color: #888;">Evento #${festa.id.substring(0, 4)}</small>
                    </div>
                </div>
                <span style="background: rgba(255, 152, 0, 0.2); color: #ff9800; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; border: 1px solid #ff9800;">PENDENTE</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="calendar" style="width: 16px;"></i> Data / Hora</p>
                        <p style="color: white; font-weight: bold; margin: 0; font-size: 1.1rem;">${festa.data.split('-').reverse().join('/')} às ${festa.horario || '--:--'}</p>
                    </div>
                    <div>
                        <p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="credit-card" style="width: 16px;"></i> CPF</p>
                        <p style="color: white; font-weight: bold; margin: 0; font-size: 1.1rem;">${festa.cpf || '—'}</p>
                    </div>
                    <div>
                        <p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="palette" style="width: 16px;"></i> Tema</p>
                        <p style="color: #00d2ff; font-weight: bold; margin: 0; font-size: 1.1rem;">${festa.tema}</p>
                    </div>
                </div>
                ${blocoValores}
            </div>

            ${blocoPecas}

            ${regras.valores ? `
            <div style="text-align: right; border-top: 1px dashed #333; padding-top: 10px; margin-top: 10px; margin-bottom: 15px;">
                <span style="color: #888; font-size: 0.8rem;">Falta Pagar: </span>
                <span style="color: #e74c3c; font-weight: bold; font-size: 1rem;">${valorFaltaFormatado}</span>
            </div>` : ''}

            <div style="display: flex; gap: 8px; border-top: 1px solid #222; padding-top: 15px; margin-top: 10px;">
                ${botaoContrato}
                <button onclick="window.editarFesta('${festa.id}')" style="flex: 1; padding: 10px; background: rgba(52, 152, 219, 0.1); color: #3498db; border: 1px solid #3498db; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 5px;">
                    <i data-lucide="edit" style="width: 16px;"></i> Editar
                </button>
                <button onclick="window.apagarFesta('${festa.id}')" style="flex: 1; padding: 10px; background: rgba(231, 76, 60, 0.1); color: #e74c3c; border: 1px solid #e74c3c; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 5px;">
                    <i data-lucide="trash-2" style="width: 16px;"></i> Apagar
                </button>
            </div>
        `;
        container.appendChild(card);
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const inputPesquisa = document.getElementById('pesquisa-festas');
    if (inputPesquisa) {
        inputPesquisa.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const cards = container.querySelectorAll('div');
            cards.forEach(card => {
                const texto = card.innerText.toLowerCase();
                card.style.display = texto.includes(termo) ? 'block' : 'none';
            });
        });
    }
}

window.apagarFesta = async function(id) {
    if(confirm("Tem certeza que deseja apagar esta festa?")) {
        await deleteDoc(doc(db, "festas", id));
        carregarFestas(subsiteAtualId);
    }
};

window.editarFesta = function(id) {
    const festa = festasGlobais.find(f => f.id === id);
    if(!festa) return;
    document.getElementById('festa-id-edicao').value = id;
    document.getElementById('titulo-modal-festa').textContent = "Editar Festa";
    document.getElementById('festa-nome').value = festa.nome || "";
    document.getElementById('festa-cpf').value = festa.cpf || "";
    document.getElementById('festa-telefone').value = festa.telefone || "";
    document.getElementById('festa-data').value = festa.data || "";
    document.getElementById('festa-horario').value = festa.horario || "";
    document.getElementById('festa-tema').value = festa.tema || "";
    document.getElementById('festa-local').value = festa.local || "";
    document.getElementById('festa-obs').value = festa.obs || "";
    document.getElementById('festa-total').value = festa.total || "0.00";
    document.getElementById('festa-sinal').value = festa.sinal || "0.00";
    
    document.getElementById('btn-agendar-festa').dispatchEvent(new Event('click')); // Recarrega as peças
    document.getElementById('modal-agendar-festa').style.display = 'flex';

    const selectPecas = document.getElementById('festa-pecas');
    if (selectPecas && festa.pecas) {
        setTimeout(() => {
            for (let i = 0; i < selectPecas.options.length; i++) {
                selectPecas.options[i].selected = festa.pecas.includes(selectPecas.options[i].value);
            }
        }, 500);
    }
};

window.gerarContrato = async function(idFesta) {
    const festa = festasGlobais.find(f => f.id === idFesta);
    if (!festa) return;

    const snap = await getDocs(query(collection(db, "contratos"), where("idSubsite", "==", subsiteAtualId)));
    if (snap.empty) {
        alert("Você ainda não cadastrou nenhum modelo de contrato. Vá em 'Contratos' no painel e cadastre um.");
        return;
    }

    let opcoes = ""; let index = 1; const contratos = [];
    snap.forEach(doc => {
        const c = doc.data(); c.id = doc.id; contratos.push(c);
        opcoes += `[${index}] ${c.nome}\n`; index++;
    });

    const escolha = prompt(`Qual modelo usar para ${festa.nome}?\n\n${opcoes}\nDigite o número:`);
    const indexEscolhido = parseInt(escolha) - 1;
    if (isNaN(indexEscolhido) || indexEscolhido < 0 || indexEscolhido >= contratos.length) return;

    const contrato = contratos[indexEscolhido];
    const janela = window.open('', '_blank');
    
    const logoNeoFlux = "https://neoflux2012-debug.github.io/neoflux-site/logo.png";

    janela.document.write(`
        <html>
        <head>
            <title>Contrato - ${festa.nome}</title>
            <style>
                body { margin: 0; padding: 0; background: #e0e0e0; display: flex; flex-direction: column; min-height: 100vh; }
                .header-print { background: white; text-align: center; padding: 20px; border-bottom: 1px solid #ccc; }
                .header-print img { max-height: 80px; max-width: 200px; }
                .content-print { flex: 1; }
                .content-print iframe { width: 100%; height: 100%; border: none; min-height: 800px; }
                .footer-print { background: white; text-align: center; padding: 20px; position: relative; border-top: 1px solid #ccc; }
                .footer-print img { max-height: 40px; opacity: 0.3; }
                
                @media print {
                    body { background: white; }
                    .header-print { position: fixed; top: 0; width: 100%; border: none; }
                    .footer-print { position: fixed; bottom: 0; width: 100%; border: none; }
                    .content-print iframe { margin-top: 100px; margin-bottom: 80px; }
                }
            </style>
        </head>
        <body>
            <div class="header-print">
                ${contrato.logo ? `<img src="${contrato.logo}" alt="Logo Empresa">` : `<h3 style="color:#333; margin:0;">${festa.nome}</h3>`}
            </div>

            <div class="content-print">
                <iframe src="${contrato.arquivo}"></iframe>
            </div>

            <div class="footer-print">
                <img src="${logoNeoFlux}" alt="Neo Flux">
                <p style="margin: 5px 0 0 0; font-size: 10px; color: #888;">Gerado por Neo Flux</p>
            </div>
        </body>
        </html>
    `);
};

window.registrarDevolucao = async function(idFesta) {
    if(!confirm("Registrar devolução de todas as peças desta festa?")) return;
    const festa = festasGlobais.find(f => f.id === idFesta);
    if(!festa) return;

    carregar(true);
    try {
        await updateDoc(doc(db, "festas", idFesta), { status: "devolvido" });

        if (festa.pecas && festa.pecas.length > 0) {
            for (const nomePeca of festa.pecas) {
                const snapCat = await getDocs(query(collection(db, "catalogo"), where("idSubsite", "==", subsiteAtualId), where("nome", "==", nomePeca)));
                snapCat.forEach(async (docCat) => {
                    const peca = docCat.data();
                    const novaQtd = (parseInt(peca.qtdDisponivel) || 0) + 1; 
                    await updateDoc(doc(db, "catalogo", docCat.id), { qtdDisponivel: novaQtd });
                });
            }
        }

        alert("Devolução registrada! Estoque atualizado.");
        carregarFestas(subsiteAtualId);
    } catch (error) {
        console.error(error);
        alert("Erro ao registrar devolução.");
    } finally {
        carregar(false);
    }
};

function calcularFrete() {
    const km = parseFloat(document.getElementById('frete-km').value) || 0;
    const preco = parseFloat(document.getElementById('frete-preco').value) || 0;
    const consumo = parseFloat(document.getElementById('frete-consumo').value) || 1; 
    const multiplicador = parseFloat(document.getElementById('frete-ida-volta').value) || 2; 
    const total = (km * multiplicador / consumo) * preco;
    document.getElementById('total-frete').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

['frete-km', 'frete-preco', 'frete-consumo', 'frete-ida-volta'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calcularFrete);
});
document.getElementById('frete-ida-volta')?.addEventListener('change', calcularFrete);

document.getElementById('form-agendar-festa')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    const idEdicao = document.getElementById('festa-id-edicao').value;
    
    const selectPecas = document.getElementById('festa-pecas');
    const pecasSelecionadas = [];
    if (selectPecas) {
        for (let i = 0; i < selectPecas.options.length; i++) {
            if (selectPecas.options[i].selected) pecasSelecionadas.push(selectPecas.options[i].value);
        }
    }

    const dadosFesta = {
        idSubsite: subsiteAtualId,
        nome: document.getElementById('festa-nome').value,
        cpf: document.getElementById('festa-cpf').value,
        telefone: document.getElementById('festa-telefone').value,
        data: document.getElementById('festa-data').value,
        horario: document.getElementById('festa-horario').value,
        tema: document.getElementById('festa-tema').value,
        local: document.getElementById('festa-local').value,
        obs: document.getElementById('festa-obs').value,
        frete: document.getElementById('total-frete').textContent.replace('R$ ', ''),
        total: document.getElementById('festa-total').value,
        sinal: document.getElementById('festa-sinal').value,
        pecas: pecasSelecionadas,
        status: idEdicao ? undefined : "pendente" 
    };

    try {
        if (idEdicao) {
            delete dadosFesta.status;
            await updateDoc(doc(db, "festas", idEdicao), dadosFesta);
            alert("Festa atualizada!");
        } else {
            await addDoc(collection(db, "festas"), dadosFesta);
            alert("Festa agendada!");
        }
        document.getElementById('form-agendar-festa').reset();
        document.getElementById('festa-id-edicao').value = "";
        document.getElementById('titulo-modal-festa').textContent = "Agendar Nova Festa";
        document.getElementById('modal-agendar-festa').style.display = 'none';
        carregarFestas(subsiteAtualId);
    } catch (error) { alert("Erro ao salvar: " + error.message); }
    finally { carregar(false); }
});

// ==========================================
// 8. MODAIS DE CATÁLOGO, KITS E CONTRATOS
// ==========================================
document.getElementById('btn-abrir-catalogo')?.addEventListener('click', () => {
    document.getElementById('modal-catalogo').style.display = 'flex';
    carregarCatalogo();
});

document.getElementById('btn-add-item')?.addEventListener('click', async () => {
    const nome = document.getElementById('cat-nome').value;
    const cat = document.getElementById('cat-categoria').value;
    const modelo = document.getElementById('cat-modelo').value;
    const qtd = parseInt(document.getElementById('cat-quantidade').value) || 1;
    
    if (!nome) return alert("Digite o nome do item.");
    
    await addDoc(collection(db, "catalogo"), { 
        idSubsite: subsiteAtualId, 
        nome: nome, 
        categoria: cat,
        modelo: modelo,
        quantidade: qtd,
        qtdDisponivel: qtd 
    });
    
    document.getElementById('cat-nome').value = "";
    document.getElementById('cat-categoria').value = "";
    document.getElementById('cat-modelo').value = "";
    document.getElementById('cat-quantidade').value = "1";
    carregarCatalogo();
});

async function carregarCatalogo() {
    const lista = document.getElementById('lista-catalogo');
    if(!lista) return;
    lista.innerHTML = "<li>Carregando...</li>";
    const snap = await getDocs(query(collection(db, "catalogo"), where("idSubsite", "==", subsiteAtualId)));
    lista.innerHTML = "";
    if (snap.empty) return lista.innerHTML = "<li style='color:#888;'>Nenhum item adicionado.</li>";
    
    snap.forEach(doc => {
        const item = doc.data();
        const li = document.createElement('li');
        li.style.cssText = "background: #0a0a0a; padding: 10px; margin-bottom: 5px; border-radius: 6px; border: 1px solid #333; display: flex; justify-content: space-between; align-items: center;";
        li.innerHTML = `
            <div>
                <strong>${item.nome}</strong> <small style="color:#888;">(${item.categoria} - ${item.modelo})</small><br>
                <small style="color: #00c853;">Disponível: ${item.qtdDisponivel} un.</small>
            </div>
        `;
        lista.appendChild(li);
    });
}

document.getElementById('btn-abrir-kits')?.addEventListener('click', () => document.getElementById('modal-kits').style.display = 'flex');
document.getElementById('btn-agendar-festa')?.addEventListener('click', async () => {
    const regras = recursosPlanos[planoAtual] || recursosPlanos.start;
    document.getElementById('area-financeira-festa').style.display = regras.valores ? 'block' : 'none';
    
    const selectPecas = document.getElementById('festa-pecas');
    if(selectPecas) {
        selectPecas.innerHTML = "";
        const snapCat = await getDocs(query(collection(db, "catalogo"), where("idSubsite", "==", subsiteAtualId)));
        snapCat.forEach(c => {
            const item = c.data();
            const opt = document.createElement('option');
            opt.value = item.nome;
            opt.textContent = `${item.nome} (${item.categoria}) - Disp: ${item.qtdDisponivel || 0}`;
            selectPecas.appendChild(opt);
        });
    }

    const datalist = document.getElementById('lista-kits-salvos');
    if(datalist) {
        datalist.innerHTML = "";
        const snapKits = await getDocs(query(collection(db, "kits"), where("idSubsite", "==", subsiteAtualId)));
        snapKits.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k.data().nome;
            datalist.appendChild(opt);
        });
    }

    document.getElementById('modal-agendar-festa').style.display = 'flex';
});

document.getElementById('btn-relatorios')?.addEventListener('click', () => {
    document.getElementById('modal-relatorios').style.display = 'flex';
    const tbody = document.getElementById('tabela-relatorio');
    tbody.innerHTML = "";
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    let totalMes = 0;

    festasGlobais.forEach(f => {
        const dataFesta = new Date(f.data + 'T00:00:00');
        if (dataFesta.getMonth() === mesAtual && dataFesta.getFullYear() === anoAtual) {
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #333;">
                    <td style="padding: 10px;">${f.nome}</td>
                    <td style="padding: 10px;">${f.tema}</td>
                    <td style="padding: 10px;">${f.data.split('-').reverse().join('/')}</td>
                </tr>`;
            
            totalMes += parseFloat(f.total) || 0;
        }
    });

    if (tbody.innerHTML === "") {
        tbody.innerHTML = "<tr><td colspan='3' style='padding: 10px; text-align: center; color: #888;'>Nenhuma festa agendada para este mês.</td></tr>";
    }

    document.getElementById('total-mes').textContent = `R$ ${totalMes.toFixed(2).replace('.', ',')}`;
});

document.getElementById('form-kit')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    const nome = document.getElementById('kit-nome').value;
    const modelo = document.getElementById('kit-modelo').value;
    const fileInput = document.getElementById('kit-imagem');

    let base64Imagem = "";
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        base64Imagem = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * (MAX_WIDTH / img.width);
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    try {
        await addDoc(collection(db, "kits"), { idSubsite: subsiteAtualId, nome: nome, modelo: modelo, imagem: base64Imagem });
        alert("Kit salvo!");
        document.getElementById('form-kit').reset();
        document.getElementById('modal-kits').style.display = 'none';
        abrirSubsite(subsiteAtualId); 
    } catch (error) { alert("Erro ao salvar kit: " + error.message); }
    finally { carregar(false); }
});

// CONTRATOS
document.getElementById('btn-abrir-contratos')?.addEventListener('click', () => {
    document.getElementById('modal-contratos').style.display = 'flex';
    carregarContratos();
});

document.getElementById('form-contrato')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    const nome = document.getElementById('contrato-nome').value;
    const fileInputArquivo = document.getElementById('contrato-arquivo');
    const fileInputLogo = document.getElementById('contrato-logo');

    let base64Arquivo = "";
    let base64Logo = "";

    if (fileInputArquivo.files.length > 0) {
        const file = fileInputArquivo.files[0];
        base64Arquivo = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    if (fileInputLogo.files.length > 0) {
        const fileLogo = fileInputLogo.files[0];
        base64Logo = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 400;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * (MAX_WIDTH / img.width);
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(fileLogo);
        });
    }

    try {
        await addDoc(collection(db, "contratos"), { 
            idSubsite: subsiteAtualId, nome: nome, arquivo: base64Arquivo,
            tipo: fileInputArquivo.files[0].type, logo: base64Logo
        });
        alert("Contrato salvo!");
        document.getElementById('form-contrato').reset();
        carregarContratos();
    } catch (error) { alert("Erro: " + error.message); }
    finally { carregar(false); }
});

async function carregarContratos() {
    const lista = document.getElementById('lista-contratos');
    if(!lista) return;
    lista.innerHTML = "<li>Carregando...</li>";
    const snap = await getDocs(query(collection(db, "contratos"), where("idSubsite", "==", subsiteAtualId)));
    lista.innerHTML = "";
    if (snap.empty) return lista.innerHTML = "<li style='color:#888;'>Nenhum contrato cadastrado.</li>";
    
    snap.forEach(doc => {
        const item = doc.data();
        const li = document.createElement('li');
        li.style.cssText = "background: #0a0a0a; padding: 10px; margin-bottom: 5px; border-radius: 6px; border: 1px solid #333; display: flex; justify-content: space-between; align-items: center;";
        li.innerHTML = `
            <span><i data-lucide="file" style="width: 16px; vertical-align: middle; margin-right: 5px;"></i> ${item.nome}</span>
            <button onclick="window.apagarContrato('${doc.id}')" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; padding: 5px 10px; border-radius: 4px; cursor: pointer;"><i data-lucide="trash-2" style="width: 14px;"></i></button>
        `;
        lista.appendChild(li);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.apagarContrato = async function(id) {
    if(confirm("Tem certeza que deseja apagar este modelo de contrato?")) {
        await deleteDoc(doc(db, "contratos", id));
        carregarContratos();
    }
};

// ==========================================
// REGISTRO DE PONTO (Entrada/Saída)
// ==========================================
async function carregarPonto() {
    const user = auth.currentUser;
    if(!user || !subsiteAtualId) return;
    
    const hoje = new Date().toLocaleDateString('pt-BR');
    const docRef = doc(db, "pontos", `${subsiteAtualId}_${hoje}`);
    const docSnap = await getDoc(docRef);
    
    const txtPonto = document.getElementById('txt-ponto-hoje');
    if(docSnap.exists()) {
        const dados = docSnap.data();
        txtPonto.innerHTML = `Entrada: <b style="color:#00c853">${dados.entrada || '--:--'}</b> | Saída: <b style="color:#e74c3c">${dados.saida || '--:--'}</b>`;
    } else {
        txtPonto.textContent = "Nenhum registro hoje.";
    }
}

document.getElementById('btn-bater-entrada')?.addEventListener('click', async () => {
    if (!subsiteAtualId) {
        alert("Erro: O subsite não foi carregado corretamente. Volte e acesse o subsite novamente.");
        return;
    }

    const horaAtual = new Date().toLocaleTimeString('pt-BR');
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    try {
        await setDoc(doc(db, "pontos", `${subsiteAtualId}_${hoje}`), { entrada: horaAtual }, { merge: true });
        alert("Entrada registrada às " + horaAtual);
        carregarPonto();
    } catch (error) {
        alert("Erro ao registrar ponto: " + error.message);
    }
});

document.getElementById('btn-bater-saida')?.addEventListener('click', async () => {
    if (!subsiteAtualId) {
        alert("Erro: O subsite não foi carregado corretamente. Volte e acesse o subsite novamente.");
        return;
    }

    const horaAtual = new Date().toLocaleTimeString('pt-BR');
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    try {
        await setDoc(doc(db, "pontos", `${subsiteAtualId}_${hoje}`), { saida: horaAtual }, { merge: true });
        alert("Saída registrada às " + horaAtual);
        carregarPonto();
    } catch (error) {
        alert("Erro ao registrar ponto: " + error.message);
    }
});

// ==========================================
// 9. BOTÕES DE FECHAR MODAIS E NEO WAVE
// ==========================================
document.querySelectorAll('[id^="btn-fechar-modal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('[id^="modal-"]').style.display = 'none';
    });
});
document.getElementById('btn-fechar-relatorios')?.addEventListener('click', () => document.getElementById('modal-relatorios').style.display = 'none');

document.getElementById('btn-neo-wave')?.addEventListener('click', () => document.getElementById('neo-wave-chat').style.display = 'flex');
document.getElementById('btn-fechar-neo-wave')?.addEventListener('click', () => document.getElementById('neo-wave-chat').style.display = 'none');

document.getElementById('btn-neo-wave-enviar')?.addEventListener('click', () => {
    const input = document.getElementById('neo-wave-input');
    const body = document.getElementById('neo-wave-body');
    if(!input.value) return;
    body.innerHTML += `<div class="msg-user">${input.value}</div>`;
    const msg = input.value.toLowerCase();
    input.value = "";
    setTimeout(() => {
        let resposta = "Ainda estou aprendendo. Tente falar sobre 'agendar', 'kits', 'contratos' ou 'relatórios'.";
        if (msg.includes('agendar')) resposta = "Clique em 'Agendar Festa'!";
        if (msg.includes('kit')) resposta = "O gerador de kits está no card roxo.";
        if (msg.includes('contrato')) resposta = "Você pode cadastrar seus contratos no card laranja.";
        if (msg.includes('relatorio')) resposta = "Clique em 'Ver Planilha' para ver suas vendas.";
        body.innerHTML += `<div class="msg-bot">${resposta}</div>`;
        body.scrollTop = body.scrollHeight;
    }, 600);
});

// ==========================================
// 10. OBSERVADOR DE ESTADO
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (!user.emailVerified) mostrarTela('tela-verificacao');
        else { carregarDadosCliente(user.uid); mostrarTela('tela-cliente'); }
    } else {
        mostrarTela('tela-boas-vindas');
    }
});
