// JS/crm.js
// Responsável pela Esteira de Orçamentos (CRM Comercial)

/* 
 * Função principal que captura os dados da aba de orçamentos,
 * soma os valores e prepara um objeto temporário para impressão.
 */
function gerarOrcamentoCRM() {
    const cliente = document.getElementById('crmCliente').value;
    const desc = document.getElementById('crmDescricao').value;
    const solucao = document.getElementById('crmSolucao').value;
    const vPecas = parseFloat(document.getElementById('crmPecas').value) || 0;
    const vObra = parseFloat(document.getElementById('crmObra').value) || 0;
    const validade = document.getElementById('crmValidade').value || "5 Dias Úteis";

    if(!cliente) {
        alert("Por favor, insira o nome do cliente para gerar o Orçamento.");
        return;
    }

    const total = vPecas + vObra;

    // Criamos um objeto "Fake OS" apenas para injetar no visualizador de PDF existente
    // Isso evita salvar dados incompletos no banco de dados antes da aprovação
    const dadosOrcamento = {
        os: "ORÇAMENTO",
        cliente: cliente,
        equip: "Em Análise",
        defeito: desc,
        laudo: "ANÁLISE E PROPOSTA COMERCIAL",
        servicos: solucao,
        vPecas: vPecas,
        vObra: vObra,
        vDesc: 0,
        total: total,
        faltaPagar: total,
        garP: "-",
        garO: "-",
        dataPrev: validade,
        data: new Date().toLocaleDateString('pt-BR'),
        isOrcamento: true // Sinalizador especial para o preparador de impressão
    };

    prepararImpressaoOrcamento(dadosOrcamento);
}

/* 
 * Função responsável por injetar os dados no HTML de impressão,
 * alterando os títulos para não confundir com uma Ordem de Serviço definitiva.
 */
function prepararImpressaoOrcamento(d) {
    // Altera os títulos principais para Orçamento
    document.getElementById('docTituloPrincipal').innerText = "PROPOSTA COMERCIAL";
    document.getElementById('resOS').innerText = "ORÇAMENTO";
    
    // Injeta os dados capturados
    document.getElementById('resCliente').innerText = d.cliente;
    document.getElementById('resEquip').innerText = d.equip;
    document.getElementById('resDefeito').innerText = d.defeito;
    document.getElementById('resLaudo').innerText = d.laudo;
    document.getElementById('resServicos').innerText = d.servicos;
    document.getElementById('resPecas').innerText = d.vPecas.toFixed(2);
    document.getElementById('resObra').innerText = d.vObra.toFixed(2);
    document.getElementById('resTotal').innerText = "R$ " + d.total.toFixed(2);
    document.getElementById('resFaltaPagar').innerText = "R$ " + d.total.toFixed(2);
    document.getElementById('resDataPrev').innerText = d.dataPrev;
    
    // Esconde campos desnecessários num orçamento inicial (inspeção de bancada, empréstimo, etc.)
    document.getElementById('rowInspecao').style.display = 'none';
    document.getElementById('rowEmprestimo').style.display = 'none';
    document.getElementById('rowMetodosPagamento').style.display = 'none';
    
    // Substitui o termo jurídico padrão pelo termo de aprovação comercial
    document.getElementById('termoJuridico').innerHTML = `
        <strong>TERMO DE APROVAÇÃO:</strong> Este documento é uma estimativa de custos com validade de ${d.dataPrev}. 
        Para aprovar a execução deste serviço, por favor, envie uma mensagem para o nosso WhatsApp confirmando. 
        Após a aprovação, este orçamento será convertido em uma Ordem de Serviço (OS) vinculativa.
    `;

    // Oculta o sistema principal e exibe apenas a tela de documento para o PDF
    document.getElementById('conteinerPrincipal').style.display = 'none'; 
    document.getElementById('telaDocumento').style.display = 'block'; 
    window.scrollTo(0, 0);
}

/* 
 * Função utilitária para automatizar a conversão.
 * Pode ser chamada quando o cliente envia o "Ok" pelo WhatsApp.
 */
function converterCRMparaOS() {
    // Copia os dados da aba CRM para os campos da aba Nova OS
    document.getElementById('cliente').value = document.getElementById('crmCliente').value;
    document.getElementById('defeito').value = document.getElementById('crmDescricao').value;
    document.getElementById('servicos').value = document.getElementById('crmSolucao').value;
    document.getElementById('vPecas').value = document.getElementById('crmPecas').value;
    document.getElementById('vObra').value = document.getElementById('crmObra').value;
    
    // Redireciona o utilizador para a primeira aba
    mudarAba('abaNovaOS');
    alert("Dados transferidos com sucesso! Preencha o restante (Equipamento, Endereço, etc) e clique em GERAR OS.");
}
