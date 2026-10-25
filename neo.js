// ==========================================
// 1. IMPORTAÇÕES
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, updateProfile, sendEmailVerification,
    signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged,
    setPersistence, browserLocalPersistence
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

setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Erro ao configurar persistência do login:", error);
});

let subsiteAtualId = "";
let planoAtual = "";
let festasGlobais = [];
let kitsDoSubsite = []; 

window.neoflux_planoFVM = null;

// ==========================================
// 3. REGRAS E TEXTOS
// ==========================================
const termosPlanos = {
    start: `<h3>Plano Start</h3><p>Ideal para começar. Inclui 1 subsite, 1 login por subsite e armazenamento local.</p>`,
    pro: `<h3>Plano Pro</h3><p>Para quem quer crescer. Inclui 1 subsite, até 2 logins, armazenamento em nuvem e agendamento de reuniões.</p>`,
    elite: `<h3>Plano Elite</h3><p>A experiência completa. Múltiplos subsites, múltiplos logins, nuvem completa e reuniões ilimitadas.</p>`,
    elite_premium: `<h3>Plano Elite Premium</h3><p>Todas as ferramentas do Elite + Gerador de Contratos exclusivo.</p>`,
    fvm_start: `<h3>Plano FVM Start</h3><p><strong>Faça Você Mesmo</strong> — versão de entrada. Mesmos recursos do Start (com limite de Kits).</p>`,
    fvm_pro: `<h3>Plano FVM Pro</h3><p><strong>Faça Você Mesmo</strong> — intermediário. Mesmos recursos do Pro.</p>`,
    fvm_elite: `<h3>Plano FVM Elite</h3><p><strong>Faça Você Mesmo</strong> — completo. Mesmos recursos do Elite.</p>`,
    fvm_elite_premium: `<h3>Plano FVM Elite Premium</h3><p><strong>Faça Você Mesmo</strong> — avançado. Tudo do Elite, sem contratos.</p>`
};

const limitesPlanosBase = { start: 1, pro: 1, elite: 999, elite_premium: 9999 };
const recursosPlanosBase = {
    start:         { kits: false, relatorios: false, assistente: true,  valores: false, contratos: false, sugestaoMensagem: false, analista: false },
    pro:           { kits: true,  relatorios: true,  assistente: true,  valores: true,  contratos: false, sugestaoMensagem: true,  analista: false },
    elite:         { kits: true,  relatorios: true,  assistente: true,  valores: true,  contratos: false, sugestaoMensagem: true,  analista: true  },
    elite_premium: { kits: true,  relatorios: true,  assistente: true,  valores: true,  contratos: true,  sugestaoMensagem: true,  analista: true  }
};

function getRecursos(plano) {
    if (plano.startsWith('fvm_')) {
        const planoBase = plano.replace('fvm_', '');
        
        if (planoBase === 'start') {
            return { kits: true, maxKits: 3, relatorios: false, assistente: true, valores: false, contratos: false, sugestaoMensagem: false, analista: false };
        }
        
        const regrasBase = recursosPlanosBase[planoBase] || recursosPlanosBase.start;
        return { ...regrasBase, maxKits: 999, contratos: false };
    }
    
    const regrasBase = recursosPlanosBase[plano] || recursosPlanosBase.start;
    return { ...regrasBase, maxKits: 999 };
}

function getLimite(plano) {
    if (plano.startsWith('fvm_')) {
        const planoBase = plano.replace('fvm_', '');
        return limitesPlanosBase[planoBase] || 1;
    }
    return limitesPlanosBase[plano] || 1;
}

const nomesPlanos = {
    start: "Start", pro: "Pro", elite: "Elite", elite_premium: "Elite Premium",
    fvm_start: "FVM Start", fvm_pro: "FVM Pro", fvm_elite: "FVM Elite", fvm_elite_premium: "FVM Elite Premium"
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
        
        const resumoConta = document.getElementById('resumo-plano-conta');
        if (resumoConta) resumoConta.textContent = nomesPlanos[planoAtual] || nomePlano;
        
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

        if (window.neoflux_planoFVM && window.neoflux_planoFVM.startsWith('fvm_')) {
            planoAtual = window.neoflux_planoFVM;
        }

        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await updateProfile(cred.user, { displayName: nome });
        await sendEmailVerification(cred.user);
        await setDoc(doc(db, "usuarios", cred.user.uid), { nome: nome, email: email, planoPreferido: planoAtual, statusPagamento: "pendente" });
        
        document.getElementById('resumo-nome-pagamento').textContent = nome;
        
        const resumoPlanoPag = document.getElementById('resumo-plano-pagamento');
        if (resumoPlanoPag) resumoPlanoPag.textContent = nomesPlanos[planoAtual] || planoAtual;

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
            document.getElementById('cliente-plano').textContent = (nomesPlanos[planoAtual] || planoAtual).toUpperCase();
            document.getElementById('cliente-status').textContent = dados.statusPagamento;
            
            const btnTestar = document.getElementById('btn-testar-plano');
            if (btnTestar) {
                btnTestar.style.display = (auth.currentUser?.email === "neoflux2012@gmail.com") ? 'inline-block' : 'none';
            }

            const isAdmin = auth.currentUser?.email === "neoflux2012@gmail.com";
            const limite = isAdmin ? 9999 : getLimite(planoAtual);
            
            await carregarSubsites(uid, limite);
        }
    } catch (error) { console.error(error); } finally { carregar(false); }
}

async function carregarSubsites(uid, limite) {
    const lista = document.getElementById('lista-subsites'); if(!lista) return;
    lista.innerHTML = "";
    const snap = await getDocs(query(collection(db, "subsites"), where("idDono", "==", uid)));
    
    const btnCriar = document.getElementById('btn-criar-subsite'); 
    const inputTitulo = document.getElementById('titulo-subsite');
    
    if (btnCriar && inputTitulo) {
        if (snap.size >= limite) { 
            btnCriar.disabled = true; 
            inputTitulo.disabled = true; 
            btnCriar.textContent = "Limite Atingido";
            btnCriar.style.opacity = "0.5";
        } else { 
            btnCriar.disabled = false; 
            inputTitulo.disabled = false; 
            btnCriar.textContent = "Criar";
            btnCriar.style.opacity = "1";
        }
    }
    
    snap.forEach(doc => {
        const sub = doc.data();
        const li = document.createElement('li');
        li.style.cssText = "border: 1px solid #333; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; background: #0a0a0a; border-radius: 8px;";
        li.innerHTML = `<strong>${sub.titulo}</strong><div style="display: flex; gap: 8px;"><button class="btn-acessar" data-id="${doc.id}" style="background: #00d2ff; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; color: #000;">Acessar</button><button class="btn-apagar" data-id="${doc.id}" style="background: #e74c3c; padding: 6px 12px; border: none; border-radius: 4px; color: white; cursor: pointer; font-weight: bold;">X</button></div>`;
        lista.appendChild(li);
    });
    
    document.querySelectorAll('.btn-acessar').forEach(btn => btn.addEventListener('click', (e) => abrirSubsite(e.target.getAttribute('data-id'))));
    document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async (e) => {
        if(confirm("Tem certeza que deseja apagar este subsite? Todos os dados dele serão perdidos.")) { 
            carregar(true);
            try {
                await deleteDoc(doc(db, "subsites", e.target.getAttribute('data-id'))); 
                await carregarDadosCliente(auth.currentUser.uid); 
            } catch (err) {
                alert("Erro ao apagar: " + err.message);
            } finally {
                carregar(false);
            }
        }
    }));
}
document.getElementById('btn-criar-subsite')?.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo-subsite').value.trim();
    if (!titulo) return alert("Digite um título para o subsite.");
    
    const isAdmin = auth.currentUser?.email === "neoflux2012@gmail.com";
    const limite = isAdmin ? 9999 : getLimite(planoAtual);
    
    carregar(true);
    try {
        const snap = await getDocs(query(collection(db, "subsites"), where("idDono", "==", auth.currentUser.uid)));
        
        if (snap.size >= limite) {
            return alert(`Você atingiu o limite de ${limite} subsite(s) do seu plano (${nomesPlanos[planoAtual] || planoAtual}).`);
        }

        await addDoc(collection(db, "subsites"), { 
            idDono: auth.currentUser.uid, 
            titulo: titulo, 
            criadoEm: new Date() 
        });
        
        document.getElementById('titulo-subsite').value = "";
        await carregarDadosCliente(auth.currentUser.uid);
    } catch (e) {
        alert("Erro ao criar subsite: " + e.message);
    } finally {
        carregar(false);
    }
});

async function abrirSubsite(id) {
    subsiteAtualId = id;
    const snap = await getDoc(doc(db, "subsites", id));
    const dadosSubsite = snap.data();
    document.getElementById('nome-do-subsite').textContent = dadosSubsite.titulo;
    
    if (planoAtual.startsWith('fvm_')) {
        if (dadosSubsite.configFVM) {
            window.aplicarTraducaoFVM(dadosSubsite.configFVM);
        } else {
            window.abrirModalNicho(id);
        }
    } else {
        window.resetarTraducaoFVM();
    }

    const regras = getRecursos(planoAtual);

    const btnKits = document.getElementById('btn-abrir-kits');
    if(btnKits) { btnKits.disabled = !regras.kits; btnKits.style.background = regras.kits ? "var(--gradiente-neo)" : "#333"; }
    const btnRel = document.getElementById('btn-relatorios');
    if(btnRel) { btnRel.disabled = !regras.relatorios; btnRel.style.background = regras.relatorios ? "var(--gradiente-neo)" : "#333"; }
    const btnContratos = document.getElementById('btn-abrir-contratos');
    if(btnContratos) { btnContratos.disabled = !regras.contratos; btnContratos.style.background = regras.contratos ? "#e67e22" : "#333"; }
    const btnNeo = document.getElementById('btn-neo-wave');
    if(btnNeo) btnNeo.style.display = regras.assistente ? 'flex' : 'none';

    const cardContratos = document.getElementById('card-contratos');
    if (cardContratos) {
        cardContratos.style.display = planoAtual.startsWith('fvm_') ? 'none' : 'block';
    }

    const cardAnalista = document.getElementById('card-analista');
    if (cardAnalista) cardAnalista.style.display = regras.analista ? 'block' : 'none';

    const datalist = document.getElementById('lista-kits-salvos');
    if(datalist) {
        datalist.innerHTML = "";
        const snapKits = await getDocs(query(collection(db, "kits"), where("idSubsite", "==", id)));
        snapKits.forEach(k => { const opt = document.createElement('option'); opt.value = k.data().nome; datalist.appendChild(opt); });
    }
    
    await carregarPecasNoSelect();
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

async function carregarFestas(id) {
    const container = document.getElementById('lista-festas-criadas'); if(!container) return;
    const containerPastas = document.getElementById('lista-pastas-container');
    container.innerHTML = ""; 
    if (containerPastas) containerPastas.innerHTML = "";
    festasGlobais = [];
    
    const regras = getRecursos(planoAtual);
    
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
                    <span style="background: rgba(138,43,226,0.2); color: #b57bff; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">${pasta.festas ? pasta.festas.length : 0} itens</span>
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
                <div style="background: rgba(0, 210, 255, 0.1); padding: 8px; border-radius: 8px;"><i data-lucide="party-popper" style="color: #00d2ff; width: 20px; height: 20px;"></i></div>
                <div><h4 style="color: white; margin: 0; font-size: 1.1rem;">${festa.nome}</h4><small style="color: #888;">Evento #${festa.id.substring(0, 4)}</small></div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="background: rgba(255, 152, 0, 0.2); color: #ff9800; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; border: 1px solid #ff9800;">PENDENTE</span>
                <button onclick="this.closest('.card-festa').classList.toggle('minimizado'); this.querySelector('i').setAttribute('data-lucide', this.closest('.card-festa').classList.contains('minimizado') ? 'chevron-down' : 'chevron-up'); lucide.createIcons();" style="background: rgba(255,255,255,0.05); border: 1px solid #333; color: #ccc; cursor: pointer; padding: 6px 8px; border-radius: 6px;"><i data-lucide="chevron-up" style="width: 18px;"></i></button>
            </div>
        </div>
        <div class="card-conteudo" style="display: block;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div><p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="calendar" style="width: 16px;"></i> Data</p><p style="color: white; font-weight: bold; margin: 0; font-size: 1.1rem;">${festa.data.split('-').reverse().join('/')}</p></div>
                    <div><p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="credit-card" style="width: 16px;"></i> CPF</p><p style="color: white; font-weight: bold; margin: 0; font-size: 1.1rem;">${festa.cpf || '—'}</p></div>
                    <div><p style="color: #888; font-size: 0.9rem; margin: 0 0 4px 0; display: flex; align-items: center; gap: 5px;"><i data-lucide="palette" style="width: 16px;"></i> Tema</p><p style="color: #00d2ff; font-weight: bold; margin: 0; font-size: 1.1rem;">${festa.tema}</p></div>
                </div>
                ${blocoValores}
            </div>
            ${blocoPecas}
            ${regras.valores ? `<div style="text-align: right; border-top: 1px dashed #333; padding-top: 10px; margin-top: 10px; margin-bottom: 15px;"><span style="color: #888; font-size: 0.8rem;">Falta Pagar: </span><span style="color: #e74c3c; font-weight: bold; font-size: 1rem;">${valorFaltaFormatado}</span></div>` : ''}
            ${areaDevolucao ? `<div style="margin-top: 10px; margin-bottom: 15px;">${areaDevolucao}</div>` : ''}
            <div style="display: flex; gap: 8px; border-top: 1px solid #222; padding-top: 15px; margin-top: 10px; flex-wrap: wrap;">
                ${botaoContrato}
                <button onclick="window.editarFesta('${festa.id}')" style="flex: 1; min-width: 100px; padding: 10px; background: rgba(52, 152, 219, 0.1); color: #3498db; border: 1px solid #3498db; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 5px;"><i data-lucide="edit" style="width: 16px;"></i> Editar</button>
                <button onclick="window.apagarFesta('${festa.id}')" style="flex: 1; min-width: 100px; padding: 10px; background: rgba(231, 76, 60, 0.1); color: #e74c3c; border: 1px solid #e74c3c; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 5px;"><i data-lucide="trash-2" style="width: 16px;"></i> Apagar</button>
            </div>
        </div>`;
    return card;
}

if (!document.getElementById('style-card-minimizado')) {
    const style = document.createElement('style');
    style.id = 'style-card-minimizado';
    style.innerHTML = `.card-festa.minimizado .card-conteudo { display: none !important; }`;
    document.head.appendChild(style);
}

window.registrarDevolucao = async function(idFesta) {
    if (!confirm("Tem certeza que deseja registrar a devolução? O estoque das peças será reposto automaticamente.")) return;
    try {
        const festa = festasGlobais.find(f => f.id === idFesta);
        if (!festa || !festa.pecas || festa.pecas.length === 0) return alert("Esta festa não tem peças para devolver.");
        carregar(true);

        await updateDoc(doc(db, "festas", idFesta), { itensDevolvidos: true, dataDevolucao: new Date() });

        for (const nomePeca of festa.pecas) {
            const q = query(collection(db, "catalogo"), where("idSubsite", "==", subsiteAtualId), where("nome", "==", nomePeca));
            const snapCat = await getDocs(q);
            if (!snapCat.empty) {
                const pecaDoc = snapCat.docs[0];
                const qtdAtual = parseInt(pecaDoc.data().quantidade) || 0;
                const qtdUsada = parseInt(festa.pecasQtd && festa.pecasQtd[nomePeca] ? festa.pecasQtd[nomePeca] : 1);
                await updateDoc(doc(db, "catalogo", pecaDoc.id), { quantidade: qtdAtual + qtdUsada });
            }
        }
        alert("✅ Devolução registrada e estoque atualizado!");
        carregarFestas(subsiteAtualId);
    } catch (e) {
        console.error(e);
        alert("Erro ao registrar devolução: " + e.message);
    } finally {
        carregar(false);
    }
};

document.getElementById('btn-abrir-modal-pasta')?.addEventListener('click', () => {
    const modal = document.getElementById('modal-criar-pasta');
    const containerCheck = document.getElementById('lista-checkboxes-festas');
    containerCheck.innerHTML = "";
    
    festasGlobais.forEach(f => {
        const label = document.createElement('label');
        label.style.cssText = "display: flex; align-items: center; gap: 10px; cursor: pointer; color: #ccc; padding: 5px 0; font-size: 0.9rem;";
        label.innerHTML = `<input type="checkbox" value="${f.id}" class="chk-festa-pasta" style="width: 18px; height: 18px; accent-color: #8a2be2;"> ${f.nome} - ${f.data.split('-').reverse().join('/')}`;
        containerCheck.appendChild(label);
    });
    modal.style.display = 'flex';
});

document.getElementById('btn-cancelar-pasta')?.addEventListener('click', () => {
    document.getElementById('modal-criar-pasta').style.display = 'none';
});

document.getElementById('btn-salvar-pasta')?.addEventListener('click', async () => {
    const nome = document.getElementById('nome-nova-pasta').value.trim();
    if (!nome) return alert("Digite o nome da pasta.");
    
    const selecionadas = [];
    document.querySelectorAll('.chk-festa-pasta:checked').forEach(cb => selecionadas.push(cb.value));
    if (selecionadas.length === 0) return alert("Selecione pelo menos uma festa.");

    carregar(true);
    try {
        await addDoc(collection(db, "pastas"), {
            idSubsite: subsiteAtualId,
            nome: nome,
            festas: selecionadas,
            criadoEm: new Date()
        });
        alert("✅ Pasta criada com sucesso!");
        document.getElementById('modal-criar-pasta').style.display = 'none';
        document.getElementById('nome-nova-pasta').value = "";
        carregarFestas(subsiteAtualId);
    } catch (e) {
        console.error(e);
        alert("Erro ao criar pasta: " + e.message);
    } finally {
        carregar(false);
    }
});

window.apagarPasta = async function(idPasta, idSubsite) {
    if (confirm("Apagar esta pasta? As festas voltarão para a lista normal.")) {
        try {
            await deleteDoc(doc(db, "pastas", idPasta));
            carregarFestas(idSubsite);
        } catch (e) {
            alert("Erro ao apagar pasta: " + e.message);
        }
    }
};
// ==========================================
// 8. RESTO DO ARQUIVO (ORÇAMENTOS, KITS, ETC)
// ==========================================

window.apagarFesta = async function(id) { if(confirm("Tem certeza que deseja apagar esta festa?")) { await deleteDoc(doc(db, "festas", id)); carregarFestas(subsiteAtualId); } };

window.editarFesta = function(id) {
    const festa = festasGlobais.find(f => f.id === id); if(!festa) return;
    document.getElementById('festa-id-edicao').value = id; document.getElementById('titulo-modal-festa').textContent = "Editar Festa";
    document.getElementById('festa-nome').value = festa.nome || ""; document.getElementById('festa-cpf').value = festa.cpf || ""; document.getElementById('festa-telefone').value = festa.telefone || "";
    document.getElementById('festa-data').value = festa.data || ""; document.getElementById('festa-tema').value = festa.tema || ""; document.getElementById('festa-local').value = festa.local || "";
    document.getElementById('festa-obs').value = festa.obs || ""; document.getElementById('festa-total').value = festa.total || "0.00"; document.getElementById('festa-sinal').value = festa.sinal || "0.00";
    const selectPecas = document.getElementById('festa-pecas');
    if (selectPecas && festa.pecas) { for (let i = 0; i < selectPecas.options.length; i++) { selectPecas.options[i].selected = festa.pecas.includes(selectPecas.options[i].value); } }
    document.getElementById('modal-agendar-festa').style.display = 'flex';
};

function calcularFrete() {
    const km = parseFloat(document.getElementById('frete-km').value) || 0; const preco = parseFloat(document.getElementById('frete-preco').value) || 0;
    const consumo = parseFloat(document.getElementById('frete-consumo').value) || 1; const multiplicador = parseFloat(document.getElementById('frete-ida-volta').value) || 2; 
    const total = (km * multiplicador / consumo) * preco;
    document.getElementById('total-frete').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}
['frete-km', 'frete-preco', 'frete-consumo', 'frete-ida-volta'].forEach(id => { document.getElementById(id)?.addEventListener('input', calcularFrete); });
document.getElementById('frete-ida-volta')?.addEventListener('change', calcularFrete);

document.getElementById('form-agendar-festa')?.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    carregar(true);
    
    const idEdicao = document.getElementById('festa-id-edicao').value;
    const dataFesta = document.getElementById('festa-data').value;
    const nomeCliente = document.getElementById('festa-nome').value;

    if (!idEdicao) {
        const festasNoMesmoDia = festasGlobais.filter(f => f.data === dataFesta);
        if (festasNoMesmoDia.length > 0) {
            let nomes = festasNoMesmoDia.map(f => f.nome).join(", ");
            const continuar = confirm(`⚠️ ATENÇÃO: Já existe(m) festa(s) agendada(s) para o dia ${dataFesta.split('-').reverse().join('/')}.\n\nCliente(s): ${nomes}\n\nDeseja continuar agendando mesmo assim?`);
            if (!continuar) { carregar(false); return; }
        }
    }

    const selectPecas = document.getElementById('festa-pecas'); 
    const pecasSelecionadas = [];
    if (selectPecas) { for (let i = 0; i < selectPecas.options.length; i++) { if (selectPecas.options[i].selected) pecasSelecionadas.push(selectPecas.options[i].value); } }

    const dadosFesta = {
        idSubsite: subsiteAtualId, 
        nome: nomeCliente, 
        cpf: document.getElementById('festa-cpf').value,
        telefone: document.getElementById('festa-telefone').value, 
        data: dataFesta, 
        tema: document.getElementById('festa-tema').value,
        local: document.getElementById('festa-local').value, 
        obs: document.getElementById('festa-obs').value, 
        frete: document.getElementById('total-frete').textContent.replace('R$ ', ''),
        total: document.getElementById('festa-total').value, 
        sinal: document.getElementById('festa-sinal').value, 
        pecas: pecasSelecionadas
    };

    try {
        if (idEdicao) { await updateDoc(doc(db, "festas", idEdicao), dadosFesta); alert("Festa atualizada!"); } 
        else { await addDoc(collection(db, "festas"), dadosFesta); alert("Festa agendada!"); }
        document.getElementById('form-agendar-festa').reset(); 
        document.getElementById('festa-id-edicao').value = "";
        document.getElementById('titulo-modal-festa').textContent = "Agendar Nova Festa"; 
        document.getElementById('modal-agendar-festa').style.display = 'none';
        carregarFestas(subsiteAtualId);
    } catch (error) { alert("Erro ao salvar: " + error.message); } finally { carregar(false); }
});

document.getElementById('btn-abrir-catalogo')?.addEventListener('click', () => { document.getElementById('modal-catalogo').style.display = 'flex'; carregarCatalogo(); });

document.getElementById('btn-abrir-kits')?.addEventListener('click', async () => {
    const regras = getRecursos(planoAtual);
    if (regras.kits && regras.maxKits < 999) {
        const snap = await getDocs(query(collection(db, "kits"), where("idSubsite", "==", subsiteAtualId)));
        if (snap.size >= regras.maxKits) {
            return alert(`Seu plano (${nomesPlanos[planoAtual]}) permite apenas ${regras.maxKits} kits. Faça upgrade para liberar mais!`);
        }
    }
    document.getElementById('modal-kits').style.display = 'flex';
});

document.getElementById('btn-agendar-festa')?.addEventListener('click', () => {
    const regras = getRecursos(planoAtual);
    document.getElementById('area-financeira-festa').style.display = regras.valores ? 'block' : 'none';
    document.getElementById('modal-agendar-festa').style.display = 'flex';
});

document.getElementById('btn-relatorios')?.addEventListener('click', () => {
    document.getElementById('modal-relatorios').style.display = 'flex';
    const tbody = document.getElementById('tabela-relatorio'); tbody.innerHTML = "";
    const hoje = new Date(); const mesAtual = hoje.getMonth(); const anoAtual = hoje.getFullYear(); let totalMes = 0;
    festasGlobais.forEach(f => {
        const dataFesta = new Date(f.data + 'T00:00:00');
        if (dataFesta.getMonth() === mesAtual && dataFesta.getFullYear() === anoAtual) {
            tbody.innerHTML += `<tr style="border-bottom: 1px solid #333;"><td style="padding: 10px;">${f.nome}</td><td style="padding: 10px;">${f.tema}</td><td style="padding: 10px;">${f.data.split('-').reverse().join('/')}</td></tr>`;
            totalMes += parseFloat(f.total) || 0;
        }
    });
    if (tbody.innerHTML === "") tbody.innerHTML = "<tr><td colspan='3' style='padding: 10px; text-align: center; color: #888;'>Nenhuma festa agendada para este mês.</td></tr>";
    document.getElementById('total-mes').textContent = `R$ ${totalMes.toFixed(2).replace('.', ',')}`;
});

document.getElementById('form-kit')?.addEventListener('submit', async (e) => {
    e.preventDefault(); carregar(true);
    const nome = document.getElementById('kit-nome').value; const modelo = document.getElementById('kit-modelo').value;
    const preco = parseFloat(document.getElementById('kit-preco').value) || 0; const fileInput = document.getElementById('kit-imagem');
    let base64Imagem = "";
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        base64Imagem = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX_WIDTH = 500; canvas.width = MAX_WIDTH; canvas.height = img.height * (MAX_WIDTH / img.width); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; img.src = ev.target.result; };
            reader.readAsDataURL(file);
        });
    }
    try {
        await addDoc(collection(db, "kits"), { idSubsite: subsiteAtualId, nome: nome, modelo: modelo, preco: preco, imagem: base64Imagem });
        alert("Kit salvo!"); document.getElementById('form-kit').reset(); document.getElementById('modal-kits').style.display = 'none'; abrirSubsite(subsiteAtualId); 
    } catch (error) { alert("Erro ao salvar kit: " + error.message); } finally { carregar(false); }
});

document.getElementById('btn-abrir-contratos')?.addEventListener('click', () => { document.getElementById('modal-contratos').style.display = 'flex'; carregarContratos(); });
document.getElementById('form-contrato')?.addEventListener('submit', async (e) => {
    e.preventDefault(); carregar(true);
    const nome = document.getElementById('contrato-nome').value; const fileInputArquivo = document.getElementById('contrato-arquivo'); const fileInputLogo = document.getElementById('contrato-logo');
    let base64Arquivo = ""; let base64Logo = "";
    if (fileInputArquivo.files.length > 0) { const file = fileInputArquivo.files[0]; base64Arquivo = await new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(file); }); }
    if (fileInputLogo.files.length > 0) {
        const fileLogo = fileInputLogo.files[0];
        base64Logo = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX_WIDTH = 400; canvas.width = MAX_WIDTH; canvas.height = img.height * (MAX_WIDTH / img.width); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/png')); }; img.src = ev.target.result; };
            reader.readAsDataURL(fileLogo);
        });
    }
    try { await addDoc(collection(db, "contratos"), { idSubsite: subsiteAtualId, nome: nome, arquivo: base64Arquivo, tipo: fileInputArquivo.files[0].type, logo: base64Logo }); alert("Contrato salvo!"); document.getElementById('form-contrato').reset(); carregarContratos(); } 
    catch (error) { alert("Erro: " + error.message); } finally { carregar(false); }
});
async function carregarContratos() {
    const lista = document.getElementById('lista-contratos'); if(!lista) return;
    lista.innerHTML = "<li>Carregando...</li>";
    const snap = await getDocs(query(collection(db, "contratos"), where("idSubsite", "==", subsiteAtualId)));
    lista.innerHTML = ""; if (snap.empty) return lista.innerHTML = "<li style='color:#888;'>Nenhum contrato cadastrado.</li>";
    snap.forEach(doc => { const item = doc.data(); const li = document.createElement('li'); li.style.cssText = "background: #0a0a0a; padding: 10px; margin-bottom: 5px; border-radius: 6px; border: 1px solid #333; display: flex; justify-content: space-between; align-items: center;"; li.innerHTML = `<span><i data-lucide="file" style="width: 16px; vertical-align: middle; margin-right: 5px;"></i> ${item.nome}</span><button onclick="window.apagarContrato('${doc.id}')" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; padding: 5px 10px; border-radius: 4px; cursor: pointer;"><i data-lucide="trash-2" style="width: 14px;"></i></button>`; lista.appendChild(li); });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.apagarContrato = async function(id) { if(confirm("Tem certeza que deseja apagar este modelo de contrato?")) { await deleteDoc(doc(db, "contratos", id)); carregarContratos(); } };

document.querySelectorAll('[id^="btn-fechar-modal"]').forEach(btn => { btn.addEventListener('click', (e) => { e.target.closest('[id^="modal-"]').style.display = 'none'; }); });
document.getElementById('btn-fechar-relatorios')?.addEventListener('click', () => document.getElementById('modal-relatorios').style.display = 'none');

// ==========================================
// 🔹 MÓDULO DE REUNIÕES
// ==========================================

const btnAbrirReuniao = document.getElementById('btn-abrir-reuniao');
const btnFecharReuniao = document.getElementById('btn-fechar-modal-reuniao');
const modalReuniao = document.getElementById('modal-reuniao');

if (btnAbrirReuniao && modalReuniao) {
    btnAbrirReuniao.addEventListener('click', () => {
        modalReuniao.style.display = 'flex';
    });
}

if (btnFecharReuniao && modalReuniao) {
    btnFecharReuniao.addEventListener('click', () => {
        modalReuniao.style.display = 'none';
    });
}

document.getElementById('form-reuniao')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    carregar(true);
    
    const nome = document.getElementById('reuniao-nome').value;
    const data = document.getElementById('reuniao-data').value;
    const hora = document.getElementById('reuniao-hora').value;
    const local = document.getElementById('reuniao-local').value;
    const obs = document.getElementById('reuniao-obs').value;

    try {
        await addDoc(collection(db, "reunioes"), {
            idSubsite: subsiteAtualId,
            nome: nome,
            data: data,
            hora: hora,
            local: local,
            obs: obs,
            criadoEm: new Date()
        });
        
        alert("✅ Reunião agendada!");
        document.getElementById('form-reuniao').reset();
        modalReuniao.style.display = 'none';
    } catch (error) {
        alert("Erro: " + error.message);
    } finally {
        carregar(false);
    }
});

// ==========================================
// 10. OBSERVADOR DE ESTADO E ADMIN
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (!user.emailVerified) { 
            mostrarTela('tela-verificacao'); 
        } else {
            getDoc(doc(db, "usuarios", user.uid)).then(snap => {
                const dados = snap.exists() ? snap.data() : { statusPagamento: "pendente" };
                const isAdmin = (user.email === "neoflux2012@gmail.com");

                if (!isAdmin && dados.statusPagamento !== "ativo") {
                    document.getElementById('resumo-nome-pagamento').textContent = dados.nome || user.displayName || "Cliente";
                    const resumoPlanoPag = document.getElementById('resumo-plano-pagamento');
                    if (resumoPlanoPag) resumoPlanoPag.textContent = nomesPlanos[dados.planoPreferido] || dados.planoPreferido || "—";
                    
                    mostrarTela('tela-pagamento');
                    alert("Sua conta está com pagamento pendente. Pague o Pix e envie o comprovante para liberar o acesso.");
                } else {
                    if (isAdmin) {
                        document.getElementById('btn-neo-wave').style.display = 'none';
                        mostrarTela('tela-escolha-admin');
                    } else {
                        const btnVoltar = document.getElementById('btn-voltar-escolha-admin');
                        if (btnVoltar) btnVoltar.style.display = 'none';
                        
                        carregarDadosCliente(user.uid); 
                        mostrarTela('tela-cliente');
                    }
                }
            });
        }
    } else {
        const telaAtual = document.querySelector('.tela.ativa');
        if (telaAtual && !['tela-login', 'tela-criar-conta', 'tela-recuperar', 'tela-boas-vindas', 'tela-termos', 'tela-pagamento', 'tela-planos'].includes(telaAtual.id)) {
            mostrarTela('tela-boas-vindas');
        }
    }
});

// ==========================================
// 🔹 ADMIN MASTER: TESTAR PLANOS FACILMENTE
// ==========================================
const ADMIN_EMAIL = "neoflux2012@gmail.com";

window.adminTestarPlano = function() {
    if (auth.currentUser?.email !== ADMIN_EMAIL) return;
    
    const planos = ['start', 'pro', 'elite', 'elite_premium', 'fvm_start', 'fvm_pro', 'fvm_elite', 'fvm_elite_premium'];
    const atual = planoAtual || 'start';
    
    const novo = prompt(`🎭 MODO TESTE (Admin Master)\n\nDigite o plano que deseja simular:\n${planos.join(', ')}\n\nPlano atual: ${atual.toUpperCase()}`, atual);
    
    if (!novo) return;
    const novoLimpo = novo.toLowerCase().trim();
    
    if (!planos.includes(novoLimpo)) return alert("Plano inválido! Digite exatamente como na lista.");
    
    planoAtual = novoLimpo;
    
    const nomeBonito = nomesPlanos[planoAtual] || planoAtual.toUpperCase();
    const clientePlano = document.getElementById('cliente-plano');
    if (clientePlano) clientePlano.textContent = nomeBonito.toUpperCase();
    
    alert(`✅ Interface atualizada para o plano: ${nomeBonito}\n\nEntre em um subsite para ver os recursos liberados!`);
    
    if (subsiteAtualId) {
        abrirSubsite(subsiteAtualId);
    }
};

window.entrarComoClienteAdmin = async function() {
    const adminUid = auth.currentUser.uid;
    carregar(true);
    try {
        await carregarDadosCliente(adminUid);
        
        const btnVoltar = document.getElementById('btn-voltar-escolha-admin');
        if (btnVoltar) btnVoltar.style.display = 'block';
        
        mostrarTela('tela-cliente');
    } catch (e) {
        alert("Erro ao carregar visão de cliente.");
    } finally {
        carregar(false);
    }
};

document.getElementById('btn-voltar-escolha-admin')?.addEventListener('click', () => {
    const btnVoltar = document.getElementById('btn-voltar-escolha-admin');
    if (btnVoltar) btnVoltar.style.display = 'none';
    mostrarTela('tela-escolha-admin');
});

document.getElementById('btn-logout-admin-escolha')?.addEventListener('click', async () => {
    await signOut(auth);
    mostrarTela('tela-boas-vindas');
});

// ==========================================
// 11. ORÇAMENTO INTELIGENTE E HISTÓRICO
// ==========================================
async function carregarKitsDoSubsite(idSubsite) {
    kitsDoSubsite = []; const select = document.getElementById('orc-kit');
    if (select) select.innerHTML = '<option value="">Carregando kits...</option>';
    try {
        const snap = await getDocs(query(collection(db, "kits"), where("idSubsite", "==", idSubsite)));
        snap.forEach(d => { kitsDoSubsite.push({ id: d.id, ...d.data() }); });
        if (select) {
            select.innerHTML = '<option value="">— Selecione um kit —</option>';
            if (kitsDoSubsite.length === 0) select.innerHTML = '<option value="">Nenhum kit cadastrado</option>';
            kitsDoSubsite.forEach(k => { const opt = document.createElement('option'); opt.value = k.id; opt.textContent = k.nome || 'Sem nome'; select.appendChild(opt); });
        }
    } catch (err) { if (select) select.innerHTML = '<option value="">Erro ao carregar kits</option>'; }
}

document.getElementById('btn-abrir-orcamento-inteligente')?.addEventListener('click', () => {
    const regras = getRecursos(planoAtual);
    if (!regras.kits) return alert("O módulo Kits está disponível a partir do plano Pro.");
    document.getElementById('orc-cliente').value = ''; document.getElementById('orc-valor').value = '';
    document.getElementById('orc-obs').value = ''; document.getElementById('orc-mensagem').value = '';
    document.getElementById('orc-preview-kit').style.display = 'none'; document.getElementById('orc-aviso-preco').style.display = 'none';
    const bloqueio = document.getElementById('orc-bloqueio-plano'); const btnGerar = document.getElementById('btn-gerar-orcamento');
    if (!regras.sugestaoMensagem) { bloqueio.style.display = 'block'; btnGerar.innerHTML = '<i data-lucide="file-text" style="width: 16px; vertical-align: middle;"></i> Gerar Orçamento (manual)'; } 
    else { bloqueio.style.display = 'none'; btnGerar.innerHTML = '<i data-lucide="sparkles" style="width: 16px; vertical-align: middle;"></i> Gerar Orçamento'; }
    carregarKitsDoSubsite(subsiteAtualId);
    document.getElementById('modal-orcamento-inteligente').style.display = 'flex';
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

['btn-fechar-modal-orcamento', 'btn-fechar-modal-orcamento-footer'].forEach(id => { document.getElementById(id)?.addEventListener('click', () => { document.getElementById('modal-orcamento-inteligente').style.display = 'none'; }); });

document.getElementById('orc-kit')?.addEventListener('change', (e) => {
    const id = e.target.value; const preview = document.getElementById('orc-preview-kit'); const aviso = document.getElementById('orc-aviso-preco'); const inputValor = document.getElementById('orc-valor');
    if (!id) { preview.style.display = 'none'; aviso.style.display = 'none'; inputValor.value = ''; return; }
    const kit = kitsDoSubsite.find(k => k.id === id); if (!kit) return;
    document.getElementById('orc-preview-nome').textContent = kit.nome || '—'; document.getElementById('orc-preview-modelo').textContent = kit.modelo || 'Itens conforme cadastro';
    const precoKit = parseFloat(kit.preco) || 0; document.getElementById('orc-preview-preco').textContent = precoKit > 0 ? `R$ ${precoKit.toFixed(2).replace('.', ',')}` : 'Não cadastrado';
    preview.style.display = 'block';
    if (precoKit > 0) { inputValor.value = precoKit.toFixed(2); aviso.style.display = 'none'; } else { inputValor.value = ''; aviso.style.display = 'block'; }
});

function gerarTextoOrcamento(estilo, cliente, kit, valor, obs) {
    const nomeKit = kit.nome || 'Kit'; const itens = kit.modelo || 'Itens conforme cadastro';
    const precoFmt = valor > 0 ? `R$ ${valor.toFixed(2).replace('.', ',')}` : 'a combinar'; const obsTxt = obs ? `\nObservações: ${obs}` : '';
    if (estilo === 'carinhoso') return `Olá, ${cliente}! Tudo bem? 💜\n\nSomos da Neo Flux e preparamos seu orçamento com muito carinho!\n\n🎉 Kit: ${nomeKit}\n✨ Itens inclusos: ${itens}\n💰 Valor: ${precoFmt}${obsTxt}\n\nSerá um prazer fazer parte desse momento especial! Estamos à disposição para qualquer dúvida.`;
    if (estilo === 'direto') return `Olá, ${cliente}.\n\nKit: ${nomeKit}\nItens: ${itens}\nValor: ${precoFmt}${obsTxt}\n\nPodemos confirmar?`;
    return `Olá, ${cliente}.\n\nSegue o orçamento referente ao ${nomeKit}.\nItens inclusos: ${itens}.\nValor total: ${precoFmt}.${obsTxt}\n\nFicamos à disposição para esclarecimentos.`;
}

document.getElementById('btn-gerar-orcamento')?.addEventListener('click', async () => {
    const cliente = document.getElementById('orc-cliente').value.trim(); const idKit = document.getElementById('orc-kit').value;
    const valor = parseFloat(document.getElementById('orc-valor').value) || 0; const obs = document.getElementById('orc-obs').value.trim(); const estilo = document.getElementById('orc-estilo').value;
    if (!cliente) return alert("Informe o nome do cliente."); if (!idKit) return alert("Selecione um kit.");
    const kit = kitsDoSubsite.find(k => k.id === idKit); if (!kit) return alert("Kit não encontrado.");
    if (!valor || valor <= 0) return alert("Informe o valor do orçamento antes de gerar.");
    const regras = getRecursos(planoAtual);
    if (!regras.sugestaoMensagem) {
        const textoManual = `Olá, ${cliente}.\n\nKit: ${kit.nome || 'Kit'}\nItens: ${kit.modelo || 'Itens conforme cadastro'}\nValor: R$ ${valor.toFixed(2).replace('.', ',')}${obs ? '\nObservações: ' + obs : ''}`;
        document.getElementById('orc-mensagem').value = textoManual; document.getElementById('orc-mensagem').readOnly = false;
        salvarOrcamentoHistorico(cliente, kit.nome, valor, textoManual, estilo); return;
    }
    const texto = gerarTextoOrcamento(estilo, cliente, kit, valor, obs);
    const textarea = document.getElementById('orc-mensagem'); textarea.value = texto; textarea.readOnly = false;
    salvarOrcamentoHistorico(cliente, kit.nome, valor, texto, estilo);
});

async function salvarOrcamentoHistorico(cliente, nomeKit, valor, mensagem, estilo) {
    try { await addDoc(collection(db, "historico_orcamentos"), { idSubsite: subsiteAtualId, cliente: cliente, kit: nomeKit, valor: valor, mensagem: mensagem, estilo: estilo, criadoEm: new Date() }); } 
    catch (err) { console.error("Erro ao salvar no histórico:", err); }
}

document.getElementById('btn-copiar-orcamento')?.addEventListener('click', async () => {
    const texto = document.getElementById('orc-mensagem').value; if (!texto.trim()) return alert("Gere o orçamento antes de copiar.");
    try { await navigator.clipboard.writeText(texto); alert("✅ Mensagem copiada!"); } catch (e) { const ta = document.getElementById('orc-mensagem'); ta.select(); document.execCommand('copy'); alert("✅ Mensagem copiada!"); }
});

document.getElementById('btn-whatsapp-orcamento')?.addEventListener('click', () => {
    const texto = document.getElementById('orc-mensagem').value; if (!texto.trim()) return alert("Gere o orçamento antes de abrir o WhatsApp.");
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
});

document.getElementById('btn-abrir-historico-orcamento')?.addEventListener('click', () => { document.getElementById('modal-historico-orcamento').style.display = 'flex'; carregarHistoricoOrcamentos(); });
['btn-fechar-modal-historico', 'btn-fechar-modal-historico-footer'].forEach(id => { document.getElementById(id)?.addEventListener('click', () => { document.getElementById('modal-historico-orcamento').style.display = 'none'; }); });

async function carregarHistoricoOrcamentos() {
    const container = document.getElementById('lista-historico-orcamento'); if (!container) return;
    container.innerHTML = '<p style="color: #888; text-align: center;">Buscando histórico...</p>';
    try {
        const dataCorte = new Date(); dataCorte.setDate(dataCorte.getDate() - 30);
        const q = query(collection(db, "historico_orcamentos"), where("idSubsite", "==", subsiteAtualId));
        const snap = await getDocs(q); let orcamentos = []; let idsParaDeletar = [];
        snap.forEach(doc => {
            const data = doc.data(); const dataCriacao = data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date(data.criadoEm);
            if (dataCriacao >= dataCorte) { orcamentos.push({ id: doc.id, ...data, dataFormatada: dataCriacao.toLocaleDateString('pt-BR') }); } else { idsParaDeletar.push(doc.id); }
        });
        if (idsParaDeletar.length > 0) { idsParaDeletar.forEach(async (id) => { try { await deleteDoc(doc(db, "historico_orcamentos", id)); } catch(e) {} }); }
        orcamentos.sort((a, b) => { const dA = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(a.criadoEm); const dB = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(b.criadoEm); return dB - dA; });
        if (orcamentos.length === 0) { container.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">Nenhum orçamento gerado nos últimos 30 dias.</p>'; return; }
        container.innerHTML = '';
        orcamentos.forEach(orc => {
            const valorFmt = parseFloat(orc.valor).toFixed(2).replace('.', ',');
            const card = document.createElement('div'); card.style.cssText = "background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; gap: 8px;";
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;"><strong style="color: white; font-size: 1rem;">${orc.cliente}</strong><span style="color: #888; font-size: 0.8rem;">${orc.dataFormatada}</span></div>
                <div style="font-size: 0.85rem; color: #ccc;">🎁 <b>Kit:</b> ${orc.kit} <br>💰 <b>Valor:</b> <span style="color: #00c853; font-weight: bold;">R$ ${valorFmt}</span></div>
                <div style="background: #121212; padding: 10px; border-radius: 6px; font-size: 0.8rem; color: #aaa; white-space: pre-wrap; max-height: 100px; overflow-y: auto; border: 1px solid #222; margin-top: 4px;">${orc.mensagem}</div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button onclick="window.copiarMensagemHistorico('${orc.id}')" style="flex: 1; padding: 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">📋 Copiar</button>
                    <button onclick="window.enviarWhatsHistorico('${orc.id}')" style="flex: 1; padding: 8px; background: #25D366; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">📱 WhatsApp</button>
                    <button onclick="window.apagarOrcamentoHistorico('${orc.id}')" style="padding: 8px 12px; background: rgba(231,76,60,0.2); color: #e74c3c; border: 1px solid #e74c3c; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">🗑️</button>
                </div>`;
            container.appendChild(card);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) { container.innerHTML = '<p style="color: #e74c3c; text-align: center;">Erro ao carregar o histórico.</p>'; }
}
window.copiarMensagemHistorico = async function(id) { try { const docSnap = await getDoc(doc(db, "historico_orcamentos", id)); if (docSnap.exists()) { await navigator.clipboard.writeText(docSnap.data().mensagem); alert("✅ Mensagem copiada!"); } } catch (e) { alert("Erro ao copiar."); } };
window.enviarWhatsHistorico = async function(id) { try { const docSnap = await getDoc(doc(db, "historico_orcamentos", id)); if (docSnap.exists()) { window.open(`https://wa.me/?text=${encodeURIComponent(docSnap.data().mensagem)}`, '_blank'); } } catch (e) { alert("Erro ao abrir WhatsApp."); } };
window.apagarOrcamentoHistorico = async function(id) { if (confirm("Apagar este orçamento do histórico?")) { try { await deleteDoc(doc(db, "historico_orcamentos", id)); carregarHistoricoOrcamentos(); } catch (e) { alert("Erro ao apagar."); } } };

// ==========================================
// 12. NEO WAVE ANALISTA (DASHBOARD ELITE)
// ==========================================
let chartPicoInstance = null; let chartKitsInstance = null;

document.getElementById('btn-abrir-analista')?.addEventListener('click', async () => { 
    document.getElementById('modal-analista').style.display = 'flex'; 
    await gerarRelatorioAnalista(); 
    await carregarFestasParaRecibo();
});
['btn-fechar-modal-analista', 'btn-fechar-modal-analista-footer'].forEach(id => { document.getElementById(id)?.addEventListener('click', () => { document.getElementById('modal-analista').style.display = 'none'; }); });

async function gerarRelatorioAnalista() {
    const hoje = new Date(); const mesAtual = hoje.getMonth(); const anoAtual = hoje.getFullYear();
    let faturamentoTotal = 0; let qtdFestas = 0; let faturamentoPorDia = {}; let kitsContagem = {};

    try {
        const snap = await getDocs(query(collection(db, "festas"), where("idSubsite", "==", subsiteAtualId)));
        snap.forEach(doc => {
            const festa = doc.data(); if (!festa.data) return;
            const dataFesta = new Date(festa.data + 'T00:00:00');
            if (dataFesta.getMonth() === mesAtual && dataFesta.getFullYear() === anoAtual) {
                const valorTotal = (parseFloat(festa.total) || 0) + (parseFloat(festa.frete) || 0);
                faturamentoTotal += valorTotal; qtdFestas++;
                const dia = festa.data; if (!faturamentoPorDia[dia]) faturamentoPorDia[dia] = 0; faturamentoPorDia[dia] += valorTotal;
                const nomeKit = festa.kit || festa.tema || "Não informado"; if (!kitsContagem[nomeKit]) kitsContagem[nomeKit] = 0; kitsContagem[nomeKit]++;
            }
        });
        document.getElementById('analista-total-mes').textContent = `R$ ${faturamentoTotal.toFixed(2).replace('.', ',')}`;
        document.getElementById('analista-qtd-festas').textContent = qtdFestas;
        let kitTop = "—"; let maxVendas = 0;
        for (const [kit, qtd] of Object.entries(kitsContagem)) { if (qtd > maxVendas) { maxVendas = qtd; kitTop = kit; } }
        document.getElementById('analista-kit-top').textContent = kitTop;

        // Gráfico 1
        const ctxPico = document.getElementById('graficoPicoVendas').getContext('2d');
        if (chartPicoInstance) chartPicoInstance.destroy();
        const diasOrdenados = Object.keys(faturamentoPorDia).sort();
        const dadosPico = diasOrdenados.map(d => faturamentoPorDia[d]);
        const labelsPico = diasOrdenados.map(d => { const [ano, mes, dia] = d.split('-'); return `${dia}/${mes}`; });
        chartPicoInstance = new Chart(ctxPico, {
            type: 'line', data: { labels: labelsPico.length > 0 ? labelsPico : ['Sem dados'], datasets: [{ label: 'Faturamento (R$)', data: dadosPico.length > 0 ? dadosPico : [0], borderColor: '#00d2ff', backgroundColor: 'rgba(0, 210, 255, 0.1)', borderWidth: 3, pointBackgroundColor: '#8a2be2', pointBorderColor: '#fff', pointRadius: 5, fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return ` R$ ${context.parsed.y.toFixed(2).replace('.', ',')}`; } } } }, scales: { y: { beginAtZero: true, grid: { color: '#222' }, ticks: { color: '#888' } }, x: { grid: { display: false }, ticks: { color: '#888' } } } }
        });

        // Gráfico 2
        const ctxKits = document.getElementById('graficoKitsVendidos').getContext('2d');
        if (chartKitsInstance) chartKitsInstance.destroy();
        const kitsOrdenados = Object.entries(kitsContagem).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const labelsKits = kitsOrdenados.map(k => k[0]); const dadosKits = kitsOrdenados.map(k => k[1]);
        chartKitsInstance = new Chart(ctxKits, {
            type: 'bar', data: { labels: labelsKits.length > 0 ? labelsKits : ['Sem dados'], datasets: [{ label: 'Qtd. de Vendas', data: dadosKits.length > 0 ? dadosKits : [0], backgroundColor: '#8a2be2', borderRadius: 6, hoverBackgroundColor: '#9d4ee8' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return ` ${context.parsed.y} venda(s)`; } } } }, scales: { y: { beginAtZero: true, grid: { color: '#222' }, ticks: { stepSize: 1, color: '#888' } }, x: { grid: { display: false }, ticks: { color: '#888' } } } }
        });
    } catch (err) { console.error("Erro ao gerar análise:", err); alert("Erro ao carregar os dados do analista."); }
}

// ==========================================
// 13. GERADOR DE RECIBO
// ==========================================
async function carregarFestasParaRecibo() {
    const select = document.getElementById('recibo-festa-select');
    if (!select) return;
    select.innerHTML = '<option value="">— Selecione uma festa —</option>';
    
    try {
        const snap = await getDocs(query(collection(db, "festas"), where("idSubsite", "==", subsiteAtualId)));
        const festas = [];
        snap.forEach(doc => festas.push({ id: doc.id, ...doc.data() }));
        festas.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        festas.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = `${f.nome} - ${f.data.split('-').reverse().join('/')}`;
            select.appendChild(opt);
        });
    } catch (err) { console.error("Erro ao carregar festas para recibo:", err); }
}

document.getElementById('recibo-festa-select')?.addEventListener('change', atualizarPreviewRecibo);
document.getElementById('recibo-tipo')?.addEventListener('change', atualizarPreviewRecibo);

async function atualizarPreviewRecibo() {
    const idFesta = document.getElementById('recibo-festa-select').value;
    const tipo = document.getElementById('recibo-tipo').value;
    const preview = document.getElementById('recibo-preview');
    
    if (!idFesta) { preview.style.display = 'none'; return; }

    try {
        const docSnap = await getDoc(doc(db, "festas", idFesta));
        if (!docSnap.exists()) return;
        
        const festa = docSnap.data();
        const valorTotal = (parseFloat(festa.total) || 0) + (parseFloat(festa.frete) || 0);
        const sinal = parseFloat(festa.sinal) || 0;
        
        let valorRecibo = tipo === 'sinal' ? sinal : valorTotal;
        let referente = tipo === 'sinal' ? 'Sinal / Entrada' : 'Quitação Total do Evento';

        document.getElementById('recibo-valor').textContent = `R$ ${valorRecibo.toFixed(2).replace('.', ',')}`;
        document.getElementById('recibo-cliente').textContent = festa.nome || '—';
        document.getElementById('recibo-referente').textContent = referente;
        document.getElementById('recibo-data-evento').textContent = festa.data ? festa.data.split('-').reverse().join('/') : '—';
        
        preview.style.display = 'block';
    } catch (err) { console.error("Erro ao gerar preview do recibo:", err); }
}

document.getElementById('btn-gerar-recibo')?.addEventListener('click', () => {
    const idFesta = document.getElementById('recibo-festa-select').value;
    if (!idFesta) return alert("Selecione uma festa para gerar o recibo.");
    atualizarPreviewRecibo();
});

document.getElementById('btn-imprimir-recibo')?.addEventListener('click', () => {
    const idFesta = document.getElementById('recibo-festa-select').value;
    if (!idFesta) return alert("Selecione e gere o recibo primeiro.");
    
    const preview = document.getElementById('recibo-preview');
    const conteudo = preview.innerHTML;
    
    const janela = window.open('', '_blank');
    janela.document.write(`
        <html>
        <head>
            <title>Recibo - Neo Flux</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; background: #fff; }
                h4 { color: #000; font-size: 20px; margin-bottom: 5px; }
                .recibo-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                .recibo-linha { margin-bottom: 10px; font-size: 14px; }
                .recibo-linha b { color: #000; }
                .recibo-valor { font-size: 18px; font-weight: bold; color: #00c853; margin: 15px 0; }
                .recibo-footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                .assinatura { margin-top: 50px; border-top: 1px solid #333; width: 60%; margin-left: auto; margin-right: auto; padding-top: 5px; text-align: center; font-size: 13px; }
            </style>
        </head>
        <body>
            <div class="recibo-header">
                <h4>RECIBO DE PAGAMENTO</h4>
                <div style="font-size: 12px; color: #666;">Neo Flux - Gestão de Eventos</div>
            </div>
            ${conteudo.replace(/background: #0a0a0a;/g, 'background: #fff;').replace(/color: #ccc;/g, 'color: #333;').replace(/color: #888;/g, 'color: #666;').replace(/color: white;/g, 'color: #000;').replace(/border: 1px solid #00c853;/g, 'border: none;')}
            <div class="recibo-footer">
                Este recibo é válido como comprovante de pagamento.
            </div>
        </body>
        </html>
    `);
    janela.document.close();
    setTimeout(() => { janela.print(); }, 500);
});

// ==========================================
// 14. VERIFICAÇÃO DE ESTOQUE POR DATA
// ==========================================
async function verificarEstoquePorData() {
    const dataFesta = document.getElementById('festa-data').value;
    const selectPecas = document.getElementById('festa-pecas');
    if (!selectPecas) return;

    if (!dataFesta) {
        await carregarPecasNoSelect();
        return;
    }

    carregar(true);
    try {
        const qFestas = query(
            collection(db, "festas"), 
            where("idSubsite", "==", subsiteAtualId), 
            where("data", "==", dataFesta)
        );
        const snapFestas = await getDocs(qFestas);

        const pecasUsadas = {};
        snapFestas.forEach(doc => {
            const festa = doc.data();
            if (festa.itensDevolvidos) return; 

            if (festa.pecas && Array.isArray(festa.pecas)) {
                festa.pecas.forEach(nomePeca => {
                    const qtd = (festa.pecasQtd && festa.pecasQtd[nomePeca]) ? parseInt(festa.pecasQtd[nomePeca]) : 1;
                    if (!pecasUsadas[nomePeca]) pecasUsadas[nomePeca] = 0;
                    pecasUsadas[nomePeca] += qtd;
                });
            }
        });

        const qCatalogo = query(collection(db, "catalogo"), where("idSubsite", "==", subsiteAtualId));
        const snapCat = await getDocs(qCatalogo);

        selectPecas.innerHTML = ""; 
        snapCat.forEach(doc => {
            const item = doc.data();
            const nome = item.nome;
            const estoqueTotal = parseInt(item.quantidade) || 1;
            
            const usadaNestaData = pecasUsadas[nome] || 0;
            const disponivel = estoqueTotal - usadaNestaData;

            const opt = document.createElement("option");
            opt.value = nome;
            
            if (disponivel <= 0) {
                opt.textContent = `${nome} (❌ ESGOTADO nesta data)`;
                opt.disabled = true;
                opt.style.color = "#e74c3c";
            } else {
                opt.textContent = `${nome} (${disponivel} disp.)`;
            }
            selectPecas.appendChild(opt);
        });

    } catch (error) {
        console.error("Erro ao verificar estoque por data:", error);
    } finally {
        carregar(false);
    }
}

document.getElementById('festa-data')?.addEventListener('change', verificarEstoquePorData);

// ==========================================
// 15. MÓDULO FVM (FAÇA VOCÊ MESMO)
// ==========================================

window.abrirModalNicho = function(idSubsite) {
    subsiteAtualId = idSubsite;
    const modal = document.getElementById('modal-nicho-fvm');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('grid-nichos-fvm').style.display = 'grid';
        document.getElementById('area-personalizar-nicho').style.display = 'none';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

window.selecionarNichoFVM = function(nicho) {
    const mapNomes = {
        alimentacao: { c1: 'Pedidos de Hoje', c2: 'Cardápio Digital', c3: 'Combos Fechados', c4: 'Calculadora de Vendas' },
        artesanato: { c1: 'Encomendas', c2: 'Meus Produtos', c3: 'Kits de Materiais', c4: 'Orçamentos' },
        beleza: { c1: 'Agendamentos', c2: 'Serviços', c3: 'Combos de Tratamento', c4: 'Orçamentos' },
        servicos: { c1: 'Ordens de Serviço', c2: 'Materiais', c3: 'Pacotes de Serviço', c4: 'Orçamentos' },
        moda: { c1: 'Pedidos / Encomendas', c2: 'Minhas Peças', c3: 'Combos / Looks', c4: 'Orçamentos' }
    };

    const nomes = mapNomes[nicho];
    if (!nomes) return;

    const config = { nicho: nicho, card1: nomes.c1, card2: nomes.c2, card3: nomes.c3, card4: nomes.c4 };
    
    window.aplicarTraducaoFVM(config);
    window.salvarNichoNoBanco(config);
};

window.abrirPersonalizacaoNicho = function() {
    document.getElementById('grid-nichos-fvm').style.display = 'none';
    document.getElementById('area-personalizar-nicho').style.display = 'block';
};

window.voltarGridNichos = function() {
    document.getElementById('grid-nichos-fvm').style.display = 'grid';
    document.getElementById('area-personalizar-nicho').style.display = 'none';
};

window.salvarNichoPersonalizado = async function() {
    const nomeNicho = document.getElementById('custom-nicho-nome').value.trim();
    const c1 = document.getElementById('custom-card-1').value.trim() || 'Projetos';
    const c2 = document.getElementById('custom-card-2').value.trim() || 'Catálogo';
    const c3 = document.getElementById('custom-card-3').value.trim() || 'Kits';
    const c4 = document.getElementById('custom-card-4').value.trim() || 'Orçamentos';

    if (!nomeNicho) return alert("Dê um nome ao seu nicho.");

    const config = { nicho: nomeNicho, card1: c1, card2: c2, card3: c3, card4: c4 };

    window.aplicarTraducaoFVM(config);
    await window.salvarNichoNoBanco(config);
};

window.salvarNichoNoBanco = async function(config) {
    carregar(true);
    try {
        await updateDoc(doc(db, "subsites", subsiteAtualId), { configFVM: config });
        alert("✅ Painel personalizado com sucesso!");
        document.getElementById('modal-nicho-fvm').style.display = 'none';
    } catch (e) {
        alert("Erro ao salvar a personalização: " + e.message);
    } finally {
        carregar(false);
    }
};

window.aplicarTraducaoFVM = function(config) {
    // 1. Traduzir os Cards
    document.getElementById('titulo-card-1').textContent = config.card1 || 'Projetos';
    document.getElementById('titulo-card-2').textContent = config.card2 || 'Catálogo';
    document.getElementById('titulo-card-3').textContent = config.card3 || 'Kits';
    document.getElementById('titulo-card-4').textContent = config.card4 || 'Orçamento';
    document.getElementById('titulo-lista-festas').textContent = config.card1 || 'Projetos';
    document.getElementById('btn-agendar-festa').textContent = `Novo(a) ${config.card1 || 'Projeto'}`;

    // Tradução do Card de Reunião
    const tituloReuniao = document.getElementById('titulo-card-reuniao');
    if (tituloReuniao) {
        if (config.nicho === 'alimentacao') tituloReuniao.textContent = 'Degustações';
        else if (config.nicho === 'servicos') tituloReuniao.textContent = 'Visitas Técnicas';
        else if (config.nicho === 'artesanato') tituloReuniao.textContent = 'Reuniões com Clientes';
        else tituloReuniao.textContent = 'Reuniões';
    }

    // 2. Traduzir os Modais (se não for festa)
    if (config.nicho !== 'festa') {
        document.getElementById('div-festa-cpf').style.display = 'none';
        document.getElementById('festa-cpf').required = false;
        document.getElementById('festa-cpf').value = "";

        document.getElementById('label-festa-tema').textContent = "O que ele pediu? (Descrição)";
        document.getElementById('label-festa-local').textContent = "Endereço de Entrega / Local";
        document.getElementById('label-festa-pecas').textContent = "Itens do Pedido (Selecione no Catálogo)";
        document.getElementById('btn-salvar-festa').textContent = "Salvar Pedido";

        document.getElementById('titulo-modal-kit').textContent = `Gerador de ${config.card3 || 'Combo'}`;
        document.getElementById('label-kit-nome').textContent = `Nome do ${config.card3 || 'Combo'}`;
        document.getElementById('label-kit-modelo').textContent = "O que vai incluso?";
        document.getElementById('label-orc-kit').textContent = `Selecione um(a) ${config.card3 || 'Combo'} cadastrado(a):`;

        const tituloOrc = document.getElementById('titulo-modal-orcamento');
        if (tituloOrc) tituloOrc.innerHTML = `<i data-lucide="sparkles" style="color: #8a2be2; width: 26px;"></i> ${config.card4 || 'Orçamento'}`;
        
        const textoAjudaOrc = document.getElementById('texto-ajuda-orcamento');
        if (textoAjudaOrc) textoAjudaOrc.innerHTML = `<i data-lucide="bot" style="width: 14px; vertical-align: middle; color: #8a2be2;"></i> O <strong>Neo Wave</strong> vai montar uma mensagem pronta com os dados reais do(a) ${config.card3 || 'item'} escolhido(a).`;
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

window.resetarTraducaoFVM = function() {
    document.getElementById('titulo-card-1').textContent = 'Festas';
    document.getElementById('titulo-card-2').textContent = 'Catálogo';
    document.getElementById('titulo-card-3').textContent = 'Kits';
    document.getElementById('titulo-card-4').textContent = 'Orçamento Inteligente';
    document.getElementById('titulo-lista-festas').textContent = 'Próximas Festas';
    document.getElementById('btn-agendar-festa').textContent = 'Agendar Festa';

    const tituloReuniao = document.getElementById('titulo-card-reuniao');
    if (tituloReuniao) tituloReuniao.textContent = 'Reuniões';

    document.getElementById('div-festa-cpf').style.display = 'block';
    document.getElementById('festa-cpf').required = true;
    document.getElementById('label-festa-tema').textContent = "Tema (ou escolha um Kit salvo):";
    document.getElementById('label-festa-local').textContent = "Localização:";
    document.getElementById('label-festa-pecas').textContent = "Peças (Selecione no Catálogo):";
    document.getElementById('btn-salvar-festa').textContent = "Agendar";

    document.getElementById('titulo-modal-kit').textContent = "Gerador de Kit";
    document.getElementById('label-kit-nome').textContent = "Nome do Kit:";
    document.getElementById('label-kit-modelo').textContent = "Modelo do Kit:";
    document.getElementById('label-orc-kit').textContent = "Selecione um kit cadastrado:";

    const tituloOrcReset = document.getElementById('titulo-modal-orcamento');
    if (tituloOrcReset) tituloOrcReset.innerHTML = `<i data-lucide="sparkles" style="color: #8a2be2; width: 26px;"></i> Orçamento Inteligente`;
    
    const textoAjudaOrcReset = document.getElementById('texto-ajuda-orcamento');
    if (textoAjudaOrcReset) textoAjudaOrcReset.innerHTML = `<i data-lucide="bot" style="width: 14px; vertical-align: middle; color: #8a2be2;"></i> O <strong>Neo Wave</strong> vai montar uma mensagem pronta com os dados reais do kit escolhido.`;
};
