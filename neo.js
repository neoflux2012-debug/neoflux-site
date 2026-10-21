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
    start: `<h3>Plano Start</h3><p>...</p>`,
    pro: `<h3>Plano Pro</h3><p>...</p>`,
    elite: `<h3>Plano Elite</h3><p>...</p>`,
    elite_premium: `<h3>Elite Premium</h3><p>...</p>`
};

const limitesPlanos = { start: 1, pro: 1, elite: 999, elite_premium: 9999 };

const recursosPlanos = {
    start: { kits: false, relatorios: false, assistente: false },
    pro: { kits: true, relatorios: true, assistente: false },
    elite: { kits: true, relatorios: true, assistente: true },
    elite_premium: { kits: true, relatorios: true, assistente: true }
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

document.querySelectorAll('.btn-selecionar-plano').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const card = e.target.closest('.card-plano');
        planoAtual = card.getAttribute('data-plano');
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

    const btnNeo = document.getElementById('btn-neo-wave');
    if(btnNeo) btnNeo.style.display = regras.assistente ? 'flex' : 'none';

    carregarFestas(id);
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

        const botaoContrato = regras.contratos ? 
            `<button onclick="window.gerarContrato('${festa.id}')" style="flex: 2; padding: 11px; background: #e67e22; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">📝 Gerar Contrato</button>` : '';

        const card = document.createElement('div');
        // Estilo do card inspirado no que você mostrou
        card.style.cssText = "background: #ffffff; border: 1px solid #ddd; border-left: 6px solid var(--cor-azul); border-radius: 12px; padding: 22px; text-align: left; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); color: #333;";
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                <h4 style="color: #333; margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">
                    👶 ${festa.nome}
                </h4>
                <span style="background: #e67e22; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">PENDENTE</span>
            </div>
            
            <p style="font-size: 0.9rem; color: #555; margin-bottom: 8px;">📅 <b>Data:</b> ${festa.data.split('-').reverse().join('/')}</p>
            <p style="font-size: 0.9rem; color: #555; margin-bottom: 8px;">🆔 <b>CPF:</b> ${festa.cpf || '—'}</p>
            <p style="font-size: 0.9rem; color: #555; margin-bottom: 8px;">🎨 <b>Tema:</b> <span style="color: var(--cor-azul); font-weight: bold;">${festa.tema}</span></p>
            <p style="font-size: 0.9rem; color: #555; margin-bottom: 8px;">🚚 <b>Frete:</b> R$ ${festa.frete || '0,00'}</p>
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc;">
                <p style="font-size: 0.9rem; color: #333; margin-bottom: 5px;">💰 <b>Total:</b> R$ ${festa.total || '0,00'}</p>
                <p style="font-size: 0.9rem; color: #333; margin-bottom: 5px;">💵 <b>Sinal:</b> R$ ${festa.sinal || '0,00'}</p>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 20px;">
                ${botaoContrato}
                <button onclick="window.editarFesta('${festa.id}')" style="flex: 1; padding: 11px; background: #3498db; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">✏️ Editar</button>
                <button onclick="window.apagarFesta('${festa.id}')" style="flex: 1; padding: 11px; background: #e74c3c; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">🗑️</button>
            </div>
        `;
        container.appendChild(card);
    });
    
    // Filtro de pesquisa em tempo real
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

// Ações dos botões do card
window.apagarFesta = async function(id) {
    if(confirm("Tem certeza que deseja apagar esta festa?")) {
        await deleteDoc(doc(db, "festas", id));
        carregarFestas(subsiteAtualId);
    }
};

window.editarFesta = function(id) {
    alert("Função de editar festa será implementada em breve!");
};

window.gerarContrato = function(id) {
    alert("O Gerador de Contrato (Elite Premium) será implementado aqui!");
};

// Calculadora de Frete
function calcularFrete() {
    const km = parseFloat(document.getElementById('frete-km').value) || 0;
    const preco = parseFloat(document.getElementById('frete-preco').value) || 0;
    const consumo = parseFloat(document.getElementById('frete-consumo').value) || 1; 
    const multiplicador = parseFloat(document.getElementById('frete-ida-volta').value) || 2; 

    const kmTotal = km * multiplicador;
    const litros = kmTotal / consumo;
    const total = litros * preco;

    document.getElementById('total-frete').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

['frete-km', 'frete-preco', 'frete-consumo', 'frete-ida-volta'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calcularFrete);
});
document.getElementById('frete-ida-volta')?.addEventListener('change', calcularFrete);

// Salvar Festa
document.getElementById('form-agendar-festa')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    try {
        await addDoc(collection(db, "festas"), {
            idSubsite: subsiteAtualId,
            nome: document.getElementById('festa-nome').value,
            cpf: document.getElementById('festa-cpf').value,
            telefone: document.getElementById('festa-telefone').value,
            data: document.getElementById('festa-data').value,
            tema: document.getElementById('festa-tema').value,
            local: document.getElementById('festa-local').value,
            obs: document.getElementById('festa-obs').value,
            frete: document.getElementById('total-frete').textContent.replace('R$ ', ''),
            total: document.getElementById('festa-total').value,
            sinal: document.getElementById('festa-sinal').value
        });
        document.getElementById('form-agendar-festa').reset();
        document.getElementById('modal-agendar-festa').style.display = 'none';
        carregarFestas(subsiteAtualId);
    } catch (error) { alert("Erro ao salvar."); }
    finally { carregar(false); }
});

// Relatórios
document.getElementById('btn-relatorios')?.addEventListener('click', () => {
    document.getElementById('modal-relatorios').style.display = 'flex';
    const tbody = document.getElementById('tabela-relatorio');
    tbody.innerHTML = "";
    festasGlobais.forEach(f => {
        tbody.innerHTML += `<tr style="border-bottom: 1px solid #222;"><td style="padding: 10px;">${f.nome}</td><td style="padding: 10px;">${f.tema}</td><td style="padding: 10px;">${f.data.split('-').reverse().join('/')}</td></tr>`;
    });
});

// ==========================================
// 8. MODAIS DE CATÁLOGO E KITS
// ==========================================
document.getElementById('btn-abrir-catalogo')?.addEventListener('click', () => {
    document.getElementById('modal-catalogo').style.display = 'flex';
    carregarCatalogo();
});

document.getElementById('btn-add-item')?.addEventListener('click', async () => {
    const nome = document.getElementById('cat-nome').value;
    const cat = document.getElementById('cat-categoria').value;
    if (!nome) return alert("Digite o nome do item.");

    await addDoc(collection(db, "catalogo"), { idSubsite: subsiteAtualId, nome: nome, categoria: cat });
    document.getElementById('cat-nome').value = "";
    document.getElementById('cat-categoria').value = "";
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
        li.style.cssText = "background: #0a0a0a; padding: 10px; margin-bottom: 5px; border-radius: 6px; border: 1px solid #333; display: flex; justify-content: space-between;";
        li.innerHTML = `<span>${item.nome} <small style="color:#888;">(${item.categoria})</small></span>`;
        lista.appendChild(li);
    });
}

document.getElementById('btn-abrir-kits')?.addEventListener('click', () => document.getElementById('modal-kits').style.display = 'flex');
document.getElementById('btn-agendar-festa')?.addEventListener('click', () => document.getElementById('modal-agendar-festa').style.display = 'flex');

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
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    try {
        await addDoc(collection(db, "kits"), { 
            idSubsite: subsiteAtualId, nome: nome, modelo: modelo, imagem: base64Imagem 
        });
        alert("Kit salvo com sucesso!");
        document.getElementById('form-kit').reset();
        document.getElementById('modal-kits').style.display = 'none';
    } catch (error) {
        alert("Erro ao salvar o kit.");
    } finally {
        carregar(false);
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
        let resposta = "Ainda estou aprendendo. Tente falar sobre 'agendar', 'kits' ou 'relatórios'.";
        if (msg.includes('agendar')) resposta = "Clique em 'Agendar Festa' para abrir o formulário!";
        if (msg.includes('kit')) resposta = "O gerador de kits está no card roxo.";
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
