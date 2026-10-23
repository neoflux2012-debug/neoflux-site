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
let kitsDoSubsite = []; 

// ==========================================
// 3. REGRAS E TEXTOS
// ==========================================
const termosPlanos = {
    start: `<h3>Plano Start</h3><p>Ideal para começar. Inclui 1 subsite, 1 login por subsite e armazenamento em nuvem básico.</p>`,
    pro: `<h3>Plano Pro</h3><p>Para quem quer crescer. Inclui 1 subsite, até 2 logins, armazenamento em nuvem e agendamento de reuniões.</p>`,
    elite: `<h3>Plano Elite</h3><p>A experiência completa. Múltiplos subsites, múltiplos logins, nuvem completa e reuniões ilimitadas.</p>`,
    elite_premium: `<h3>Plano Elite Premium</h3><p>Todas as ferramentas do Elite + Gerador de Contratos exclusivo.</p>`
};

const limitesPlanos = { start: 1, pro: 1, elite: 999, elite_premium: 9999 };

const recursosPlanos = {
    start:         { kits: false, relatorios: false, assistente: true,  valores: false, contratos: false, sugestaoMensagem: false, analista: false },
    pro:           { kits: true,  relatorios: true,  assistente: true,  valores: true,  contratos: false, sugestaoMensagem: true,  analista: false },
    elite:         { kits: true,  relatorios: true,  assistente: true,  valores: true,  contratos: false, sugestaoMensagem: true,  analista: true  },
    elite_premium: { kits: true,  relatorios: true,  assistente: true,  valores: true,  contratos: true,  sugestaoMensagem: true,  analista: true  }
};

// ==========================================
// 4. CONTROLE DE TELAS E LOADING
// ==========================================
const todasAsTelas = document.querySelectorAll('.tela');

function mostrarTela(id) {
    todasAsTelas.forEach(t => t.classList.remove('ativa'));
    const tela = document.getElementById(id);
    if (tela) tela.classList.add('ativa');

    if (id === 'tela-pagamento') {
        const imgQr = document.getElementById('img-qrcode');
        if (imgQr) imgQr.src = `./qrcode.png?t=${new Date().getTime()}`;
    }
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

document.getElementById('btn-comparar-planos')?.addEventListener('click', () => { document.getElementById('modal-comparar').style.display = 'flex'; });
document.getElementById('btn-fechar-modal-comparar')?.addEventListener('click', () => { document.getElementById('modal-comparar').style.display = 'none'; });
document.getElementById('btn-fechar-modal-comparar-footer')?.addEventListener('click', () => { document.getElementById('modal-comparar').style.display = 'none'; });

document.getElementById('btn-logout')?.addEventListener('click', async () => { await signOut(auth); mostrarTela('tela-boas-vindas'); });

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

document.getElementById('form-termos')?.addEventListener('submit', (e) => { e.preventDefault(); mostrarTela('tela-criar-conta'); });

document.getElementById('form-cadastro-final')?.addEventListener('submit', async (e) => {
    e.preventDefault(); carregar(true);
    try {
        const email = document.getElementById('email-cadastro').value;
        const senha = document.getElementById('senha-cadastro').value;
        const nome = document.getElementById('nome-cliente').value;
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await updateProfile(cred.user, { displayName: nome });
        await sendEmailVerification(cred.user);
        await setDoc(doc(db, "usuarios", cred.user.uid), { nome: nome, email: email, planoPreferido: planoAtual, statusPagamento: "pendente" });
        document.getElementById('resumo-nome-pagamento').textContent = nome;
        mostrarTela('tela-pagamento');
    } catch (error) { alert("Erro ao cadastrar: " + error.message); } finally { carregar(false); }
});

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault(); carregar(true);
    try { await signInWithEmailAndPassword(auth, document.getElementById('email-login').value, document.getElementById('senha-login').value); } 
    catch (error) { alert("E-mail ou senha incorretos."); } finally { carregar(false); }
});

document.getElementById('form-recuperar')?.addEventListener('submit', async (e) => {
    e.preventDefault(); carregar(true);
    try { await sendPasswordResetEmail(auth, document.getElementById('email-recuperar').value); alert("Link de recuperação enviado!"); } 
    catch (error) { alert("Erro ao enviar e-mail."); } finally { carregar(false); }
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
            await carregarSubsites(uid, limite);
        }
    } catch (error) { console.error(error); } finally { carregar(false); }
}

async function carregarSubsites(uid, limite) {
    const lista = document.getElementById('lista-subsites'); if(!lista) return;
    lista.innerHTML = "";
    const snap = await getDocs(query(collection(db, "subsites"), where("idDono", "==", uid)));
    const btnCriar = document.getElementById('btn-criar-subsite'); const inputTitulo = document.getElementById('titulo-subsite');
    if (btnCriar && inputTitulo) {
        if (snap.size >= limite) { btnCriar.disabled = true; inputTitulo.disabled = true; } else { btnCriar.disabled = false; inputTitulo.disabled = false; }
    }
    snap.forEach(doc => {
        const sub = doc.data();
        const li = document.createElement('li');
        li.style.cssText = "border: 1px solid #333; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; background: #0a0a0a;";
        li.innerHTML = `<strong>${sub.titulo}</strong><div><button class="btn-acessar" data-id="${doc.id}" style="background: #00d2ff; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">Acessar</button><button class="btn-apagar" data-id="${doc.id}" style="background: #e74c3c; padding: 5px 10px; border: none; border-radius: 4px; color: white; cursor: pointer;">X</button></div>`;
        lista.appendChild(li);
    });
    document.querySelectorAll('.btn-acessar').forEach(btn => btn.addEventListener('click', (e) => abrirSubsite(e.target.getAttribute('data-id'))));
    document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async (e) => {
        if(confirm("Apagar?")) { await deleteDoc(doc(db, "subsites", e.target.getAttribute('data-id'))); carregarDadosCliente(auth.currentUser.uid); }
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
    if(btnKits) { btnKits.disabled = !regras.kits; btnKits.style.background = regras.kits ? "var(--gradiente-neo)" : "#333"; }
    const btnRel = document.getElementById('btn-relatorios');
    if(btnRel) { btnRel.disabled = !regras.relatorios; btnRel.style.background = regras.relatorios ? "var(--gradiente-neo)" : "#333"; }
    const btnContratos = document.getElementById('btn-abrir-contratos');
    if(btnContratos) { btnContratos.disabled = !regras.contratos; btnContratos.style.background = regras.contratos ? "#e67e22" : "#333"; }
    const btnNeo = document.getElementById('btn-neo-wave');
    if(btnNeo) btnNeo.style.display = regras.assistente ? 'flex' : 'none';

    const cardAnalista = document.getElementById('card-analista');
    if (cardAnalista) cardAnalista.style.display = regras.analista ? 'block' : 'none';

    const datalist = document.getElementById('lista-kits-salvos');
    if(datalist) {
        datalist.innerHTML = "";
        const snapKits = await getDocs(query(collection(db, "kits"), where("idSubsite", "==", id)));
        snapKits.forEach(k => { const opt = document.createElement('option'); opt.value = k.data().nome; datalist.appendChild(opt); });
    }
    
    await carregarPecasNoSelect(); // Carrega as peças inicialmente
    carregarFestas(id);
    carregarContratos();
    carregarKitsDoSubsite(id); 
    mostrarTela('tela-subsite');
}

async function carregarPecasNoSelect() {
    const selectPecas = document.getElementById('festa-pecas');
    if(!selectPecas) return;
    selectPecas.innerHTML = "";
    const snapCat = await getDocs(query(collection(db, "catalogo"), where("idSubsite", "==", subsiteAtualId)));
    snapCat.forEach(c => { 
        const item = c.data(); 
        const opt = document.createElement('option'); 
        opt.value = item.nome; 
        opt.textContent = `${item.nome} (${item.categoria})`; 
        selectPecas.appendChild(opt); 
    });
}

// ==========================================
// 7. FESTAS, FRETE, DEVOLUÇÃO E PASTAS
// ==========================================
async function carregarFestas(id) {
    const container = document.getElementById('lista-festas-criadas'); if(!container) return;
    const containerPastas = document.getElementById('lista-pastas-container');
    container.innerHTML = ""; 
    if (containerPastas) containerPastas.innerHTML = "";
    festasGlobais = [];
    
    const regras = recursosPlanos[planoAtual] || recursosPlanos.start;
    
    const snap = await getDocs(query(collection(db, "festas"), where("idSubsite", "==", id)));
    snap.forEach(doc => {
        const festa = doc.data(); 
        festa.id = doc.id; 
        festasGlobais.push(festa);
    });

    let pastas = [];
    const snapPastas = await getDocs(query(collection(db, "pastas"), where("idSubsite", "==", id)));
    snapPastas.forEach(doc => {
        pastas.push({ id: doc.id, ...doc.data() });
    });

    let idsFestasAgrupadas = [];
    pastas.forEach(p => { if (p.festas) idsFestasAgrupadas = idsFestasAgrupadas.concat(p.festas); });

    if (containerPastas) {
        pastas.forEach(pasta => {
            const divPasta = document.createElement('div');
            divPasta.style.cssText = "background: #0a0a0a; border: 1px solid #8a2be2; border-radius: 12px; padding: 15px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(138,43,226,0.1);";
            
            const header = document.createElement('div');
            header.style.cssText = "display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding-bottom: 10px;";
            header.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i data-lucide="folder" style="color: #b57bff; width: 24px;"></i>
                    <h4 style="color: white; margin: 0; font-size: 1.1rem;">${pasta.nome}</h4>
                    <span style="background: rgba(138,43,226,0.2); color: #b57bff; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">${pasta.festas ? pasta.festas.length : 0} festas</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="event.stopPropagation(); window.apagarPasta('${pasta.id}', '${id}')" style="background: rgba(231,76,60,0.1); border: 1px solid #e74c3c; color: #e74c3c; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem;"><i data-lucide="trash-2" style="width: 14px; vertical-align: middle;"></i></button>
                    <button class="btn-toggle-pasta" style="background: rgba(138,43,226,0.2); border: 1px solid #8a2be2; color: white; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem;"><i data-lucide="chevron-down" style="width: 14px; vertical-align: middle;"></i></button>
                </div>
            `;
            divPasta.appendChild(header);

            const conteudo = document.createElement('div');
            conteudo.style.cssText = "margin-top: 15px; display: none; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;";
            
            if (pasta.festas) {
                pasta.festas.forEach(idFesta => {
                    const f = festasGlobais.find(x => x.id === idFesta);
                    if (f) conteudo.appendChild(renderizarCardFesta(f, regras));
                });
            }
            divPasta.appendChild(conteudo);

            const btnToggle = header.querySelector('.btn-toggle-pasta');
            btnToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = conteudo.style.display === 'none';
                conteudo.style.display = isHidden ? 'grid' : 'none';
                btnToggle.innerHTML = isHidden ? '<i data-lucide="chevron-up" style="width: 14px; vertical-align: middle;"></i>' : '<i data-lucide="chevron-down" style="width: 14px; vertical-align: middle;"></i>';
                lucide.createIcons();
            });

            containerPastas.appendChild(divPasta);
        });
    }

    const festasNormais = festasGlobais.filter(f => !idsFestasAgrupadas.includes(f.id));
    festasNormais.forEach(festa => {
        container.appendChild(renderizarCardFesta(festa, regras));
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();

    const inputPesquisa = document.getElementById('pesquisa-festas');
    if (inputPesquisa) {
        inputPesquisa.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            container.querySelectorAll('.card-festa').forEach(card => {
                card.style.display = card.innerText.toLowerCase().includes(termo) ? 'block' : 'none';
            });
        });
    }
}

function renderizarCardFesta(festa, regras) {
    const total = parseFloat(festa.total) || 0; 
    const sinal = parseFloat(festa.sinal) || 0;
    const falta = total - sinal;
    const valorFaltaFormatado = falta > 0 ? `R$ ${falta.toFixed(2).replace('.', ',')}` : 'Pago';

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const dataFesta = new Date(festa.data + 'T00:00:00');
    const dataPassou = dataFesta < hoje;

    const blocoValores = regras.valores ? `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <div><p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="truck" style="width: 16px;"></i> Frete</p><p style="color: #00c853; font-weight: bold; margin: 0; font-size: 1.1rem;">R$ ${festa.frete || '0,00'}</p></div>
            <div><p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="dollar-sign" style="width: 16px;"></i> Total</p><p style="color: white; font-weight: bold; margin: 0; font-size: 1.1rem;">R$ ${festa.total || '0,00'}</p></div>
            <div><p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="wallet" style="width: 16px;"></i> Sinal</p><p style="color: white; font-weight: bold; margin: 0; font-size: 1.1rem;">R$ ${festa.sinal || '0,00'}</p></div>
        </div>` : `<div><p style="color: #888; font-size: 0.8rem;">Valores disponíveis no plano Pro ou superior.</p></div>`;

    const botaoContrato = regras.contratos ? `<button onclick="window.gerarContrato('${festa.id}')" style="flex: 1; min-width: 100px; padding: 10px; background: rgba(230, 126, 34, 0.1); color: #e67e22; border: 1px solid #e67e22; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 5px;"><i data-lucide="file-text" style="width: 16px;"></i> Contrato</button>` : '';

    const pecasStr = festa.pecas && festa.pecas.length > 0 ? festa.pecas.join(", ") : "Nenhuma";
    const blocoPecas = festa.pecas && festa.pecas.length > 0 ? `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #333;"><p style="color: #888; font-size: 0.8rem; margin: 0 0 4px 0;"><i data-lucide="package" style="width: 14px; vertical-align: middle;"></i> Peças:</p><p style="color: #00d2ff; font-size: 0.85rem; margin: 0;">${pecasStr}</p></div>` : '';

    let areaDevolucao = "";
    if (festa.itensDevolvidos) {
        areaDevolucao = `<div style="width: 100%; padding: 12px; background: rgba(0,200,83,0.1); border: 1px solid #00c853; color: #00c853; border-radius: 6px; text-align: center; font-weight: bold; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;"><i data-lucide="check-circle" style="width: 18px;"></i> Devolução Registrada</div>`;
    } else if (dataPassou && festa.pecas && festa.pecas.length > 0) {
        areaDevolucao = `<button onclick="window.registrarDevolucao('${festa.id}')" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #8a2be2, #9b59b6); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.3s; box-shadow: 0 4px 10px rgba(138,43,226,0.3);"><i data-lucide="package-check" style="width: 18px;"></i> Registrar Devolução</button>`;
    }

    const card = document.createElement('div');
    card.className = 'card-festa';
    card.style.cssText = "background: #0a0a0a; border: 1px solid #333; border-radius: 12px; padding: 20px; text-align: left; position: relative; transition: 0.3s;";
    
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 10px;">
