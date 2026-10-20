async function carregarClientes() {
    const tabela = document.getElementById('lista-clientes');
    const tabelaUpgrades = document.getElementById('lista-upgrades');
    if(!tabela || !tabelaUpgrades) return;

    tabela.innerHTML = '<tr><td colspan="5">Buscando clientes...</td></tr>';
    tabelaUpgrades.innerHTML = '<tr><td colspan="4">Buscando pedidos de upgrade...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        
        tabela.innerHTML = ""; 
        tabelaUpgrades.innerHTML = "";
        let temUpgrade = false;

        if (querySnapshot.empty) {
            tabela.innerHTML = '<tr><td colspan="5">Nenhum cliente.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const cliente = docSnap.data();
            const idCliente = docSnap.id;
            
            // ---- 1. LISTA NORMAL DE CLIENTES ----
            const tr = document.createElement('tr');
            const statusClass = cliente.statusPagamento === "pendente" ? "status-pendente" : "status-ativo";
            let statusTexto = cliente.statusPagamento === "pendente" ? "Pendente" : (cliente.statusPagamento === "ativo" ? "Ativo" : cliente.statusPagamento);

            // Botão de Liberar normal (se não for upgrade pendente)
            let botaoAcao = "";
            if (cliente.statusPagamento === "pendente") {
                botaoAcao = `<button class="btn-liberar" data-id="${idCliente}">Liberar Acesso</button>`;
            } else if (cliente.statusPagamento === "upgrade_pendente") {
                botaoAcao = `<span style="color:#00d2ff; font-weight:bold;">Aguardando Aprovação</span>`;
            } else {
                botaoAcao = "Já liberado";
            }

            tr.innerHTML = `
                <td>${cliente.nome}</td>
                <td>${cliente.email}</td>
                <td>${cliente.planoPreferido.toUpperCase()}</td>
                <td class="${statusClass}">${statusTexto}</td>
                <td>${botaoAcao}</td>
            `;
            tabela.appendChild(tr);

            // ---- 2. LISTA DE UPGRADES ----
            if (cliente.statusPagamento === "upgrade_pendente") {
                temUpgrade = true;
                const trUp = document.createElement('tr');
                trUp.innerHTML = `
                    <td>${cliente.nome}</td>
                    <td>${cliente.email}</td>
                    <td>${cliente.planoPreferido.toUpperCase()}</td>
                    <td><button class="btn-aprovar-upgrade" data-id="${idCliente}" style="background: #00c853; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">✅ Aprovar Upgrade</button></td>
                `;
                tabelaUpgrades.appendChild(trUp);
            }
        });

        if (!temUpgrade) {
            tabelaUpgrades.innerHTML = '<tr><td colspan="4">Nenhum pedido de upgrade no momento.</td></tr>';
        }

        // Eventos de Liberar Normal
        document.querySelectorAll('.btn-liberar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await updateDoc(doc(db, "usuarios", id), { statusPagamento: "ativo" });
                carregarClientes(); // Recarrega
            });
        });

        // Eventos de Aprovar Upgrade
        document.querySelectorAll('.btn-aprovar-upgrade').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const confirmar = confirm("Confirmar que o cliente pagou a diferença e deseja mudar de plano?");
                
                if (confirmar) {
                    // Aqui você pode mudar o plano dele para Elite Premium (ou o que ele pediu)
                    // Para simplificar, vamos mudar para o status "ativo" e o plano para "elite_premium"
                    await updateDoc(doc(db, "usuarios", id), { 
                        statusPagamento: "ativo",
                        planoPreferido: "elite_premium" 
                    });
                    alert("Upgrade aprovado!");
                    carregarClientes(); // Recarrega a lista
                }
            });
        });

    } catch (error) {
        console.error(error);
        tabela.innerHTML = '<tr><td colspan="5" style="color:red;">Erro ao carregar dados.</td></tr>';
    }
}
