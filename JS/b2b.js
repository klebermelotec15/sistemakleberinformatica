// JS/b2b.js
// Responsável pelos Contratos de Recorrência e Automação de SLA (B2B)

/*
 * Função para capturar os dados do formulário e salvar a empresa
 * na coleção 'contratos_b2b' do Firebase.
 */
async function salvarContratoB2B() {
    const empresa = document.getElementById('b2bEmpresa').value.trim();
    const cnpj = document.getElementById('b2bCnpj').value;
    const sla = document.getElementById('b2bSLA').value;
    const valor = parseFloat(document.getElementById('b2bValor').value) || 0;
    const status = document.getElementById('b2bStatus').value;

    if(!empresa) {
        alert("Digite a Razão Social da Empresa para cadastrar o contrato.");
        return;
    }

    const dadosContrato = {
        empresa: empresa,
        cnpj: cnpj,
        sla_horas: sla,
        valor_mensal: valor,
        status: status,
        data_cadastro: new Date().toLocaleDateString('pt-BR')
    };

    try {
        // Usa o nome da empresa em maiúsculas como ID do documento para evitar duplicados
        await db.collection("contratos_b2b").doc(empresa.toUpperCase()).set(dadosContrato);
        alert("Contrato B2B Registrado com Sucesso!");
        
        // Limpa os campos após salvar
        document.getElementById('b2bEmpresa').value = "";
        document.getElementById('b2bCnpj').value = "";
        document.getElementById('b2bSLA').value = "";
        document.getElementById('b2bValor').value = "";
        
        carregarContratosB2B();
    } catch (e) {
        console.error("Erro ao salvar Contrato B2B: ", e);
        alert("Erro ao conectar com a nuvem.");
    }
}

/*
 * Função que busca todos os contratos no banco e exibe uma lista
 * visual na aba de Contratos B2B.
 */
async function carregarContratosB2B() {
    try {
        const divLista = document.getElementById('listaContratos');
        if(!divLista) return;
        divLista.innerHTML = "Carregando contratos da nuvem...";
        
        const snap = await db.collection("contratos_b2b").get();
        let html = "";
        
        snap.forEach(doc => {
            let c = doc.data();
            // Define a cor de fundo com base no status do contrato
            let corStatus = c.status === 'Ativo' ? '#d4edda' : '#f8d7da';
            
            html += `
            <div style="background:${corStatus}; border:1px solid #ccc; padding:10px; border-radius:6px; font-size:13px; color:#333;">
                <strong style="font-size:14px;">🏢 ${c.empresa}</strong> (SLA: ${c.sla_horas}h úteis)<br>
                Valor Mensal: R$ ${c.valor_mensal.toFixed(2)} | Status: <strong>${c.status}</strong><br>
                <span style="font-size:11px; color:#666;">Registado em: ${c.data_cadastro}</span>
            </div>`;
        });
        
        divLista.innerHTML = html || "<p style='color:#666;'>Nenhum contrato ativo registado no sistema.</p>";
        
        // Chama o robô que verifica se é dia de gerar faturas automáticas
        verificarMensalidades(); 
    } catch (e) {
        console.error("Erro ao carregar a lista de contratos: ", e);
    }
}

/*
 * A Mágica da Previsibilidade Financeira:
 * Verifica se estamos nos primeiros 5 dias do mês e gera as OS automáticas.
 */
async function verificarMensalidades() {
    const hoje = new Date();
    // Cria uma string única para o mês e ano atual (Ex: "5-2026")
    const mesAno = `${hoje.getMonth() + 1}-${hoje.getFullYear()}`;
    
    // O robô só atua do dia 1 ao dia 5 de cada mês
    if (hoje.getDate() >= 1 && hoje.getDate() <= 5) {
        try {
            const controleRef = db.collection("controle_sistema").doc("faturas_geradas");
            const docControle = await controleRef.get();
            
            // Verifica na nuvem se este mês já foi processado
            let gerados = docControle.exists ? docControle.data().meses || [] : [];
            
            // Se o mês atual NÃO estiver na lista, inicia a geração
            if (!gerados.includes(mesAno)) {
                // Busca APENAS os contratos que estão ativos
                const contratos = await db.collection("contratos_b2b").where("status", "==", "Ativo").get();
                
                let gerouAlgo = false;

                contratos.forEach(async (c) => {
                    let d = c.data();
                    let numOS = await obterProximaOS(); // Reutiliza a função já existente no os.js
                    
                    let osFatura = {
                        os: numOS, 
                        categoria: 'SERVICO_B2B', 
                        status: '1. Falta Orçar', // Fica como 'Falta Orçar' para servir de aviso visual de cobrança no Kanban
                        cliente: d.empresa,
                        equip: "Contrato de Suporte Mensal B2B",
                        defeito: `Mensalidade Ref. ${mesAno} | SLA: ${d.sla_horas}h`,
                        laudo: "Fatura gerada automaticamente pelo sistema.",
                        vPecas: 0, vCustoPecas: 0, vObra: d.valor_mensal, vDesc: 0, 
                        total: d.valor_mensal, faltaPagar: d.valor_mensal, vSinal: 0,
                        data: new Date().toLocaleDateString('pt-BR')
                    };
                    
                    await db.collection("servicos").add(osFatura);
                    gerouAlgo = true;
                });
                
                // Grava no banco de dados que este mês já foi gerado para impedir duplicações amanhã
                gerados.push(mesAno);
                await controleRef.set({ meses: gerados });
                
                if (gerouAlgo) {
                    alert("🤖 Robô do ERP: As Faturas dos Contratos B2B deste mês foram geradas automaticamente no seu Kanban!");
                    carregarHistorico(); // Atualiza a tela visualmente
                }
            }
        } catch (e) {
            console.error("Erro na rotina de mensalidades automáticas B2B: ", e);
        }
    }
}
