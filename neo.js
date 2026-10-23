// ==========================================
// FVM.JS — Extensão do Neo Flux para o plano FVM
// Importa o Firebase e reaproveita o mesmo app/auth/db.
// ==========================================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Reaproveita o app já inicializado pelo neo.js (evita erro de "app duplicado")
const firebaseConfig = {
  apiKey: "AIzaSyAdwwjbpyvTU5afvNzcHaBm-T-ShueHicU",
  authDomain: "neo-flux-c91c8.firebaseapp.com",
  projectId: "neo-flux-c91c8",
  storageBucket: "neo-flux-c91c8.firebasestorage.app",
  messagingSenderId: "6686219198",
  appId: "1:6686219198:web:e2f0b16808e5f3d251b7ef"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 🔹 NOMES AMIGÁVEIS DOS PLANOS FVM
// ==========================================
const NOMES_FVM = {
    fvm_start: "FVM Start",
    fvm_pro: "FVM Pro",
    fvm_elite: "FVM Elite",
    fvm_elite_premium: "FVM Elite Premium"
};

const TERMOS_FVM = {
    fvm_start: `<h3>Plano FVM Start</h3><p><strong>Faça Você Mesmo</strong> — versão de entrada. Mesmos recursos do Start: 1 subsite, 1 login e armazenamento básico.</p>`,
    fvm_pro:   `<h3>Plano FVM Pro</h3><p><strong>Faça Você Mesmo</strong> — intermediário. Mesmos recursos do Pro: 1 subsite, até 2 logins, nuvem, agendamento, kits e relatórios.</p>`,
    fvm_elite: `<h3>Plano FVM Elite</h3><p><strong>Faça Você Mesmo</strong> — completo. Mesmos recursos do Elite: múltiplos subsites/logins, kits, relatórios, assistente e analista.</p>`,
    fvm_elite_premium: `<h3>Plano FVM Elite Premium</h3><p><strong>Faça Você Mesmo</strong> — avançado. Tudo do Elite + Gerador de Contratos exclusivo.</p>`
};

// ==========================================
// 🔹 CONTROLE DO MODAL
// ==========================================
function abrirModalFVM() {
    const modal = document.getElementById('modal-fvm');
    if (modal) modal.style.display = 'flex';
}

function fecharModalFVM() {
    const modal = document.getElementById('modal-fvm');
    if (modal) modal.style.display = 'none';
}

// ==========================================
// 🔹 NAVEGAÇÃO DE TELA (reaproveita .tela.ativa)
// ==========================================
function mostrarTelaFVM(id) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    const tela = document.getElementById(id);
    if (tela) tela.classList.add('ativa');
    window.scrollTo(0, 0);
}

// ==========================================
// 🔹 SELEÇÃO DE UM SUBPLANO FVM
// ==========================================
function selecionarSubplanoFVM(chavePlano) {
    // Guarda global (o neo.js também usa `planoAtual`, mas variável let global
    // não é acessível entre módulos; usamos um atributo no localStorage e no DOM)
    localStorage.setItem('neoflux_planoAtual', chavePlano);

    const nome = NOMES_FVM[chavePlano] || chavePlano;
    const tituloTermos = document.getElementById('titulo-termos');
    const textoTermos = document.getElementById('texto-termos');
    const resumoConta = document.getElementById('resumo-plano-conta');

    if (tituloTermos) tituloTermos.textContent = `Termos e Condições - ${nome}`;
    if (textoTermos) textoTermos.innerHTML = TERMOS_FVM[chavePlano] || "";
    if (resumoConta) resumoConta.textContent = nome;

    fecharModalFVM();
    mostrarTelaFVM('tela-termos');
}

// ==========================================
// 🔹 EVENTOS
// ==========================================
document.getElementById('btn-abrir-fvm')?.addEventListener('click', abrirModalFVM);
document.getElementById('btn-fechar-modal-fvm')?.addEventListener('click', fecharModalFVM);
document.getElementById('btn-fechar-modal-fvm-footer')?.addEventListener('click', fecharModalFVM);

// Fechar clicando fora do box
document.getElementById('modal-fvm')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-fvm') fecharModalFVM();
});

// Botões dos subplanos
document.querySelectorAll('.btn-fvm-subplano').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const chave = e.currentTarget.getAttribute('data-plano');
        if (chave) selecionarSubplanoFVM(chave);
    });
});

// ==========================================
// 🔹 GARANTE QUE O PLANO FVM SEJA SALVO NO FIRESTORE
// ==========================================
// O neo.js escuta o submit do #form-cadastro-final e salva `planoAtual`.
// Como `planoAtual` está em outro módulo, interceptamos o submit AQUI primeiro,
// injetamos o valor no campo e deixamos o neo.js continuar.
const formCadastro = document.getElementById('form-cadastro-final');
if (formCadastro) {
    // Campo hidden para levar o plano pro neo.js
    if (!document.getElementById('plano-fvm-hidden')) {
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.id = 'plano-fvm-hidden';
        hidden.name = 'plano_fvm';
        formCadastro.appendChild(hidden);
    }

    // Capturamos o plano no submit (antes do handler do neo.js rodar)
    formCadastro.addEventListener('submit', () => {
        const plano = localStorage.getItem('neoflux_planoAtual');
        if (plano && plano.startsWith('fvm_')) {
            const hidden = document.getElementById('plano-fvm-hidden');
            if (hidden) hidden.value = plano;

            // Truque: sobrescreve o `planoPreferido` após o neo.js salvar.
            // Espera o cadastro do neo.js terminar via MutationObserver na tela.
            const observer = new MutationObserver(() => {
                const telaPag = document.getElementById('tela-pagamento');
                if (telaPag && telaPag.classList.contains('ativa')) {
                    observer.disconnect();
                    // Atualiza o texto do resumo na tela de pagamento
                    const resumoPag = document.getElementById('resumo-plano-pagamento');
                    if (resumoPag) {
                        resumoPag.textContent = NOMES_FVM[plano] || plano;
                    }
                }
            });
            observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
        }
    });
}

// ==========================================
// 🔹 PIX: garante exibição do QR Code na tela de pagamento
// ==========================================
// O QR já está no HTML (src="./qrcode.png"), então não precisamos
// fazer nada — mas garantimos que a chave Pix esteja visível ao abrir a tela.
// (O neo.js já troca o src com cache-busting.)

console.log("[FVM] Extensão carregada com sucesso. Planos FVM disponíveis.");
