// JS/os.js
// Cérebro Financeiro e Lógico (Versão Blindada Anti-Crash com Filtro MEI e Kanban Completo)

let cacheServicos = []; 
let mapaGarantias = new Map();
let clientesFieis = new Map();

function calcularDias(dataStr) {
    if(!dataStr || typeof dataStr !== 'string') return 0;
    const partes = dataStr.split('/');
    if(partes.length !== 3) return 0;
    const dataOS = new Date(partes[2], partes[1] - 1, partes[0]);
    const diffTempo = Math.abs(new Date() - dataOS);
    return Math.floor(diffTempo / (1000 * 60 * 60 * 24));
}

function converterParaDias(texto) {
    if (!texto) return 0;
    let t = String(texto).toLowerCase().trim();
    let numero = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
    if (t.includes('mês') || t.includes('mes')) return numero * 30;
    if (t.includes('ano')) return numero * 365;
    return numero; 
}

function converterParaDataObj(dataStr) {
    if(!dataStr || typeof dataStr !== 'string') return null;
    const partes = dataStr.split('/');
    if(partes.length !== 3) return null;
    return new Date(partes[2], partes[1] - 1, partes[0]);
}

async function obterProximaOS() {
    const snap = await db.collection("servicos").orderBy("os", "desc").limit(1).get();
    return snap.empty ? 1 : snap.docs[0].data().os + 1;
}

// ----------------------------------------------------------------------
// INTEGRAÇÃO COM BRASIL API E HISTÓRICO LOCAL
// ----------------------------------------------------------------------
async function buscarCpfCnpj() {
    let docInput = document.getElementById('cpf').value;
    let numLimpo = docInput.replace(/\D/g, ''); 

    if (numLimpo.length < 11) return; 

    try {
        let snapshot = await db.collection("clientes").where("cpf", "==", docInput).get();
        if (snapshot.empty && docInput !== numLimpo) {
            snapshot = await db.collection("clientes").where("cpf", "==", numLimpo).get();
        }
        
        if (!snapshot.empty) {
            let clienteDados = snapshot.docs[0].data();
            document.getElementById('cliente').value = clienteDados.nome || "";
            document.getElementById('whatsapp').value = clienteDados.zap || "";
            document.getElementById('rg').value = clienteDados.rg || "";
            document.getElementById('cep').value = clienteDados.cep || "";
            document.getElementById('endCliente').value = clienteDados.end || "";
            document.getElementById('bairro').value = clienteDados.bairro || "";
            alert("✅ Dados do Cliente preenchidos automaticamente com base no seu histórico!");
            return; 
        }
    } catch (error) { console.error("Falha ao procurar documento na nuvem.", error); }

    if (numLimpo.length === 14) {
        try {
            let response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numLimpo}`);
            if (response.ok) {
                let dados = await response.json();
                document.getElementById('cliente').value = dados.razao_social || "";
                document.getElementById('whatsapp').value = dados.ddd_telefone_1 || "";
                document.getElementById('cep').value = dados.cep || "";
                let endCompleto = dados.logradouro;
                if (dados.numero) endCompleto += ", " + dados.numero;
                if (dados.complemento) endCompleto += " - " + dados.complemento;
                document.getElementById('endCliente').value = endCompleto;
                document.getElementById('bairro').value = dados.bairro || "";
                alert("✅ Empresa nova detectada! Dados preenchidos via Receita Federal.");
            }
        } catch (error) { console.error("Falha API Externa.", error); }
    }
}

// ----------------------------------------------------------------------
// SALVAR DADOS (PDV E OS)
// ----------------------------------------------------------------------
async function salvarVendaPDV(imprimirRecibo) {
    const desc = document.getElementById('pdvProduto').value;
    const venda = parseFloat(document.getElementById('pdvVenda').value) || 0;
    const descPDV = parseFloat(document.getElementById('pdvDesc').value) || 0;
    
    const pix = parseFloat(document.getElementById('pdvPix').value) || 0;
    const din = parseFloat(document.getElementById('pdvDin').value) || 0;
    const cred = parseFloat(document.getElementById('osCred').value) || 0;
    const deb = parseFloat(document.getElementById('osDeb').value) || 0;
    const totalPago = pix + din + cred + deb;

    if(!desc) return alert("Digite o produto vendido.");
    
    const numOS = await obterProximaOS();
    const totalVenda = venda - descPDV;

    const dados = {
        os: numOS, categoria: 'VENDA_BALCAO', status: '4. Entregue com sucesso de reparo',
        cliente: document.getElementById('pdvCliente').value,
        defeito: desc, 
        vPecas: 0, vCustoPecas: 0, vObra: venda, vDesc: descPDV, total: totalVenda, faltaPagar: totalVenda - totalPago, vSinal: totalPago,
        pagamentos: { pix, din, cred, deb },
        data: new Date().toLocaleDateString('pt-BR'),
        tipo: 'RECIBO_PAGAMENTO'
    };

    await db.collection("servicos").add(dados);
    alert("Venda registada com sucesso!");
    
    document.getElementById('pdvProduto').value = ""; document.getElementById('pdvVenda').value = "";
    document.getElementById('pdvDesc').value = ""; document.getElementById('pdvPix').value = ""; 
    document.getElementById('pdvDin').value = ""; document.getElementById('pdvCred').value = ""; 
    document.getElementById('pdvDeb').value = "";

    if(imprimirRecibo) { prepararImpressao(dados); } else { carregarHistorico(); }
}

async function salvarOS(tipoDoc) {
    const vp = parseFloat(document.getElementById('vPecas').value) || 0;
    const vcusto = parseFloat(document.getElementById('vCustoPecas').value) || 0;
    const vo = parseFloat(document.getElementById('vObra').value) || 0;
    const vVisita = parseFloat(document.getElementById('vVisita').value) || 0; 
    const vd = parseFloat(document.getElementById('vDesc').value) || 0;
    
    const pix = parseFloat(document.getElementById('osPix').value) || 0;
    const din = parseFloat(document.getElementById('osDin').value) || 0;
    const cred = parseFloat(document.getElementById('osCred').value) || 0;
    const deb = parseFloat(document.getElementById('osDeb').value) || 0;
    const totalPago = pix + din + cred + deb;

    const dataInput = document.getElementById('dataEntrada').value;
    const dataFormatada = dataInput ? dataInput.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
    let dataPrevFormatada = document.getElementById('dataPrev').value ? document.getElementById('dataPrev').value.split('-').reverse().join('/') : "";

    let chkArr = [];
    document.querySelectorAll('.chk-item:checked').forEach(el => chkArr.push(el.value));

    let numOS = editandoId ? parseInt(document.getElementById('idEdicao').innerText) : await obterProximaOS();
    const totalOS = (vp + vo + vVisita) - vd;

    const dados = {
        os: numOS, categoria: 'SERVICO', 
        status: document.getElementById('status').value,
        classificacao: document.getElementById('classificacao').value,
        osOrigem: document.getElementById('osOrigem').value,
        modalidade: document.getElementById('modalidade').value, 
        cliente: document.getElementById('cliente').value, cpf: document.getElementById('cpf').value,
        rg: document.getElementById('rg').value, whatsapp: document.getElementById('whatsapp').value,
        endCliente: document.getElementById('endCliente').value, bairro: document.getElementById('bairro').value,
        cep: document.getElementById('cep').value, equip: document.getElementById('equip').value,
        modelo: document.getElementById('modelo').value, serie: document.getElementById('serie').value,
        chkList: chkArr.join(', '), aces: document.getElementById('aces').value,
        inspecao: { liga: document.getElementById('insLiga').value, imagem: document.getElementById('insImagem').value, barulho: document.getElementById('insBarulho').value, temp: document.getElementById('insTemp').value, led: document.getElementById('insLed').value },
        emprestimo: document.getElementById('emprestimo').value, defeito: document.getElementById('defeito').value,
        laudo: document.getElementById('laudo').value, servicos: document.getElementById('servicos').value,
        diarioBordo: document.getElementById('diarioBordo').value, 
        vPecas: vp, vCustoPecas: vcusto, vObra: vo, vVisita: vVisita, vDesc: vd, 
        vSinal: totalPago, total: totalOS, faltaPagar: totalOS - totalPago, pagamentos: { pix, din, cred, deb },
        garP: document.getElementById('garPecas').value, garO: document.getElementById('garObra').value,
        data: dataFormatada, dataPrev: dataPrevFormatada, tipo: tipoDoc
    };

    if(!dados.cliente) return alert("Digite o nome do cliente!");

    if(dados.cliente) {
        let nomeKey = dados.cliente.toUpperCase().trim();
        db.collection("clientes").doc(nomeKey).set({ nome: dados.cliente, zap: dados.whatsapp, cpf: dados.cpf, rg: dados.rg, cep: dados.cep, end: dados.endCliente, bairro: dados.bairro }).then(() => carregarClientesDaNuvem()); 
    }

    if(editandoId) {
        await db.collection("servicos").doc(editandoId).update(dados);
        if (tipoDoc !== 'RECIBO_PAGAMENTO') limparFormularioOS();
        if (tipoDoc !== 'RECIBO_PAGAMENTO') mudarAba('abaHistorico'); 
    } else {
        await db.collection("servicos").add(dados);
        if (tipoDoc !== 'RECIBO_PAGAMENTO') limparFormularioOS();
    }
    
    carregarHistorico();
    if (tipoDoc === 'SAIDA' || tipoDoc === 'ENTRADA' || tipoDoc === 'RECIBO_PAGAMENTO') prepararImpressao(dados);
}

function salvarEdicao(tipo) { salvarOS(tipo || tipoDocOriginal); }

function limparFormularioOS() {
    editandoId = null;
    document.getElementById('avisoEdicao').style.display = 'none';
    document.getElementById('botoesCriar').style.display = 'flex';
    document.getElementById('botaoSalvarEdicao').style.display = 'none';
    document.querySelectorAll('#abaNovaOS input[type=text], #abaNovaOS input[type=number], #abaNovaOS textarea, #abaNovaOS input[type=date]').forEach(el => el.value = '');
    document.querySelectorAll('.chk-item').forEach(el => el.checked = false);
    
    document.getElementById('classificacao').value = "Novo Serviço";
    document.getElementById('osOrigem').value = "";
    document.getElementById('modalidade').value = "Realizado na Loja";
    document.getElementById('insLiga').value = "-"; document.getElementById('insImagem').value = "-"; document.getElementById('insBarulho').value = "-"; document.getElementById('insTemp').value = "-"; document.getElementById('insLed').value = "-";
    document.getElementById('status').value = "1. Falta Orçar";
    document.getElementById('garObra').value = "90 Dias"; document.getElementById('garPecas').value = "3 meses";
    document.getElementById('dataEntrada').value = new Date().toISOString().split('T')[0];
}

// ----------------------------------------------------------------------
// INTEGRAÇÃO FINANCEIRA, MEI E INTELIGÊNCIA KANBAN (BLINDADOS CONTRA CRASH)
// ----------------------------------------------------------------------
async function carregarHistorico() {
    try {
        const snap = await db.collection("servicos").orderBy("os", "desc").get();
        cacheServicos = [];
        snap.forEach(doc => { 
            // Injeção segura na memória local
            cacheServicos.push({ id: doc.id, ...doc.data() }); 
        });

        // Tenta ajustar o mês do Financeiro, mas se o HTML faltar, o sistema NÃO QUEBRA.
        try {
            const date = new Date();
            const mesesStr = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
            let finMesEl = document.getElementById('finMes');
            let finAnoEl = document.getElementById('finAno');
            
            if (finMesEl && finAnoEl && !finMesEl.dataset.loaded) {
                finMesEl.value = mesesStr[date.getMonth()];
                finAnoEl.value = date.getFullYear();
                finMesEl.dataset.loaded = "true";
            }
        } catch(e) { console.error("Aviso: Filtros de Mês/Ano não encontrados no HTML.", e); }

        processarInteligenciaMensal(); 
        renderizarKanban(cacheServicos);
    } catch (e) { console.error("Erro fatal ao carregar banco de dados do Firebase:", e); }
}

function processarInteligenciaMensal() {
    try {
        // Se os elementos não existirem, abortamos o cálculo financeiro, mas permitimos que o Kanban carregue
        let finMesEl = document.getElementById('finMes');
        let finAnoEl = document.getElementById('finAno');
        if(!finMesEl || !finAnoEl) return;

        let mesSel = finMesEl.value;
        let anoSel = String(finAnoEl.value);
        let mesesMap = {"JANEIRO":"01", "FEVEREIRO":"02", "MARÇO":"03", "ABRIL":"04", "MAIO":"05", "JUNHO":"06", "JULHO":"07", "AGOSTO":"08", "SETEMBRO":"09", "OUTUBRO":"10", "NOVEMBRO":"11", "DEZEMBRO":"12"};
        let numMes = mesesMap[mesSel];

        clientesFieis.clear(); mapaGarantias.clear();
        let lucroPecas = 0, totalObra = 0, totalPDV = 0, descontosAplicados = 0, abandonados = 0;
        let receitaBrutaComercio = 0, receitaBrutaServicos = 0;

        let docsCronologicos = [...cacheServicos].reverse(); 
        docsCronologicos.forEach(d => {
            if(d.categoria !== 'VENDA_BALCAO' && d.serie) { mapaGarantias.set(String(d.serie).trim(), { os: d.os, data: d.data }); }
            let s = d.status || "";
            let finalizado = (s.includes('4') || s.includes('Entregue') || s.includes('5') || s.includes('Devolvido'));
            if(finalizado && d.cliente) { let nomeKey = String(d.cliente).toUpperCase().trim(); clientesFieis.set(nomeKey, (clientesFieis.get(nomeKey) || 0) + 1); }
        });

        cacheServicos.forEach(d => {
            let s = d.status || "";
            let finalizado = (s.includes('4') || s.includes('Entregue') || s.includes('5') || s.includes('Devolvido'));
            
            if (!finalizado && calcularDias(d.data) > 180 && d.categoria !== 'VENDA_BALCAO') abandonados++;

            if(finalizado && d.data) { 
                let partes = String(d.data).split('/');
                if(partes.length === 3 && partes[1] === numMes && partes[2] === anoSel) {
                    if (d.categoria === 'VENDA_BALCAO') { 
                        totalPDV += parseFloat(d.total) || 0; 
                        receitaBrutaComercio += parseFloat(d.total) || 0; 
                    } else {
                        let vp = parseFloat(d.vPecas) || 0; let vc = parseFloat(d.vCustoPecas) || 0; 
                        let vo = parseFloat(d.vObra) || 0; let vd = parseFloat(d.vDesc) || 0;
                        let vvis = parseFloat(d.vVisita) || 0; 

                        lucroPecas += (vp - vc);
                        totalObra += (vo + vvis);
                        descontosAplicados += vd;

                        receitaBrutaComercio += vp; 
                        receitaBrutaServicos += (vo + vvis); 
                    }
                }
            }
        });

        let totalGeral = (lucroPecas + totalObra - descontosAplicados) + totalPDV;
        
        if(document.getElementById('dashLucroPecas')) document.getElementById('dashLucroPecas').innerText = "R$ " + lucroPecas.toFixed(2); 
        if(document.getElementById('dashObra')) document.getElementById('dashObra').innerText = "R$ " + totalObra.toFixed(2);
        if(document.getElementById('dashPDV')) document.getElementById('dashPDV').innerText = "R$ " + totalPDV.toFixed(2); 
        if(document.getElementById('dashTotal')) document.getElementById('dashTotal').innerText = "R$ " + totalGeral.toFixed(2);
        
        let elAbandonados = document.getElementById('alertaAbandono');
        if(elAbandonados) {
            if(abandonados > 0) { 
                if(document.getElementById('qtdAbandonados')) document.getElementById('qtdAbandonados').innerText = abandonados; 
                elAbandonados.style.display = 'block'; 
            } else { elAbandonados.style.display = 'none'; }
        }

        // AUTO-PREENCHIMENTO DO MEI COM A RECEITA BRUTA
        if(document.getElementById('meiMes')) document.getElementById('meiMes').value = mesSel;
        if(document.getElementById('meiAno')) document.getElementById('meiAno').value = anoSel;
        if(document.getElementById('mei1')) document.getElementById('mei1').value = receitaBrutaComercio.toFixed(2);
        if(document.getElementById('mei7')) document.getElementById('mei7').value = receitaBrutaServicos.toFixed(2);

        if(typeof window.calcMEI === 'function') {
            window.calcMEI();
        } else {
            let m1 = receitaBrutaComercio;
            let m2 = parseFloat(document.getElementById('mei2')?.value) || 0;
            if(document.getElementById('mei3')) document.getElementById('mei3').innerText = (m1 + m2).toFixed(2);

            let m7 = receitaBrutaServicos;
            let m8 = parseFloat(document.getElementById('mei8')?.value) || 0;
            if(document.getElementById('mei9')) document.getElementById('mei9').innerText = (m7 + m8).toFixed(2);

            let m4 = parseFloat(document.getElementById('mei4')?.value) || 0;
            let m5 = parseFloat(document.getElementById('mei5')?.value) || 0;
            if(document.getElementById('mei6')) document.getElementById('mei6').innerText = (m4 + m5).toFixed(2);

            if(document.getElementById('mei10')) document.getElementById('mei10').innerText = ((m1+m2) + (m4+m5) + (m7+m8)).toFixed(2);
        }
    } catch(err) { console.error("Erro ignorado no processamento financeiro.", err); }
}

function renderizarKanban(dadosArray, filtroText = "") {
    let htmlOrcar = "", htmlExec = "", htmlConc = "", htmlEntr = "", htmlDevolv = "";
    let cOrcar = 0, cExec = 0, cConc = 0, cEntr = 0, cDevolv = 0;

    dadosArray.forEach(d => {
        try {
            let searchTarget = `${d.cliente || ""} ${d.os || ""} ${d.equip || ""} ${d.defeito || ""}`.toUpperCase();
            if (filtroText && !searchTarget.includes(filtroText)) return;

            let tagExtra = "", garantiaTag = "", fidelidadeTag = "";
            let dias = calcularDias(d.data);
            
            if(d.classificacao === 'Retorno em Garantia') {
                tagExtra += ` <span class="tag" style="background:#dc3545; color:white; font-weight:bold;">🚨 RETORNO</span>`;
            }

            if(d.cliente) {
                let nomeKey = String(d.cliente).toUpperCase().trim();
                if (clientesFieis.get(nomeKey) >= 5) { fidelidadeTag = `<span class="tag" style="background:#ffc107; color:#000;">⭐ Fiel</span>`; }
            }

            let stat = String(d.status).trim();
            let finalizadoComSucesso = (stat.includes('4.') || stat.includes('Entregue'));
            let finalizadoSemReparo = (stat.includes('5.') || stat.includes('Devolvido'));

            if(d.serie && d.categoria !== 'VENDA_BALCAO') {
                let serieKey = String(d.serie).trim();
                let ultimaDaSerie = mapaGarantias.get(serieKey);
                if(ultimaDaSerie && ultimaDaSerie.os !== d.os) {
                    let diffDiasAnterior = calcularDias(ultimaDaSerie.data);
                    if(diffDiasAnterior <= 90 && !finalizadoComSucesso && !finalizadoSemReparo && d.classificacao !== 'Retorno em Garantia') {
                        garantiaTag = `<br><span class="tag" style="background:#dc3545;">⚠️ ALERTA: SÉRIE JÁ ATENDIDA RECENTEMENTE</span>`;
                    }
                }
            }

            if(d.categoria === 'VENDA_BALCAO') { tagExtra += ` <span class="tag" style="background:#6c757d;">🛒 VENDA</span>`; } 
            else if(finalizadoComSucesso) {
                let gO = converterParaDias(d.garO); let gP = converterParaDias(d.garP);
                let obraAtiva = gO > 0 && dias <= gO; let pecasAtiva = gP > 0 && dias <= gP;
                if (obraAtiva && pecasAtiva) tagExtra += ` <span class="tag" style="background:#28a745;">🛡️ Garantia: AMBAS</span>`;
                else if (obraAtiva && !pecasAtiva) tagExtra += ` <span class="tag" style="background:#17a2b8;">🛡️ Garantia: MÃO DE OBRA</span>`;
                else if (!obraAtiva && pecasAtiva) tagExtra += ` <span class="tag" style="background:#6f42c1;">🛡️ Garantia: PEÇAS</span>`;
                else tagExtra += ` <span class="tag" style="background:#6c757d;">❌ GARANTIA EXPIRADA</span>`;
            } else if(finalizadoSemReparo) { tagExtra += ` <span class="tag" style="background:#000;">⚫ SEM REPARO</span>`; } 
            else if(dias > 180) { tagExtra += ` <span class="tag" style="background:red;">🚨 ABANDONADO</span>`; }
            
            let previsaoTag = "";
            if(d.dataPrev && !stat.includes('3.') && !finalizadoComSucesso && !finalizadoSemReparo) {
                let dataObj = converterParaDataObj(d.dataPrev);
                if (dataObj) {
                    let diasParaEntrega = Math.floor((dataObj - new Date()) / (1000 * 60 * 60 * 24));
                    if(diasParaEntrega < 0) previsaoTag = `<span class="tag" style="background:#dc3545;">⏰ ATRASADO!</span>`;
                    else if(diasParaEntrega === 0) previsaoTag = `<span class="tag" style="background:#ffc107; color:black;">⏰ ENTREGA HOJE</span>`;
                    else previsaoTag = `<span class="tag" style="background:#17a2b8;">⏳ Prev: ${d.dataPrev}</span>`;
                }
            }

            let card = `
            <div class="os-card">
                <div style="margin-bottom:8px;">
                    <strong style="font-size:14px;">#${String(d.os).padStart(4, '0')} - ${d.cliente || "Sem Nome"}</strong> ${fidelidadeTag} <br>
                    <span style="color:#666;">${d.equip || "Balcão"} | ${d.data || ""}</span>
                    <div style="margin-top:5px;">${tagExtra} ${previsaoTag} ${garantiaTag}</div>
                </div>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button class="btn-dark btn-small" style="padding:4px;" onclick="imprimirOS('${d.id}')">🖨️ PDF</button>
                    <button class="btn-blue btn-small" style="padding:4px;" onclick="editarOS('${d.id}')">✏️ Editar</button>
                    <button class="btn-red btn-small" style="padding:4px; flex:none;" onclick="excluirOS('${d.id}')">🗑️</button>
                </div>
            </div>`;

            if (stat.includes('1.') || stat === 'Falta Orçar') { htmlOrcar += card; cOrcar++; }
            else if (stat.includes('2.') || stat === 'Executando') { htmlExec += card; cExec++; }
            else if (stat.includes('3.') || stat === 'Concluída') { htmlConc += card; cConc++; }
            else if (stat.includes('4.') || stat.includes('Entregue')) { htmlEntr += card; cEntr++; }
            else { htmlDevolv += card; cDevolv++; }

        } catch (err) { console.error("OS corrompida ignorada no Kanban.", err); }
    });

    // 🛡️ Injeção Segura: Se uma caixa não for encontrada, o sistema não quebra
    let eOrcar = document.getElementById('kb-orcar');
    if(eOrcar) {
        eOrcar.innerHTML = htmlOrcar; 
        if(document.getElementById('countOrcar')) document.getElementById('countOrcar').innerText = cOrcar;
        
        let eExec = document.getElementById('kb-exec');
        if(eExec) eExec.innerHTML = htmlExec; 
        if(document.getElementById('countExec')) document.getElementById('countExec').innerText = cExec;
        
        let eConc = document.getElementById('kb-conc');
        if(eConc) eConc.innerHTML = htmlConc; 
        if(document.getElementById('countConc')) document.getElementById('countConc').innerText = cConc;
        
        let eEntr = document.getElementById('kb-entr');
        if(eEntr) eEntr.innerHTML = htmlEntr; 
        if(document.getElementById('countEntr')) document.getElementById('countEntr').innerText = cEntr;
        
        let eDevolv = document.getElementById('kb-devolv');
        if(eDevolv) eDevolv.innerHTML = htmlDevolv; 
        if(document.getElementById('countDevolv')) document.getElementById('countDevolv').innerText = cDevolv;
    }
}

async function buscar() {
    const t = document.getElementById('busca').value.toUpperCase();
    renderizarKanban(cacheServicos, t);
}

async function excluirOS(id) { if(confirm("Excluir permanentemente?")) { await db.collection("servicos").doc(id).delete(); carregarHistorico(); } }

async function editarOS(id) {
    const doc = await db.collection("servicos").doc(id).get(); const d = doc.data();
    if(d.categoria === 'VENDA_BALCAO') return alert("Vendas de balcão não podem ser editadas, exclua e refaça.");
    tipoDocOriginal = d.tipo || 'ENTRADA'; editandoId = id;
    
    let s = d.status || "1. Falta Orçar";
    if(s === "Falta Orçar") s = "1. Falta Orçar";
    if(s === "Executando") s = "2. Executando";
    if(s === "Concluída") s = "3. Concluída";
    if(s === "Entregue ao Cliente") s = "4. Entregue com sucesso de reparo";
    document.getElementById('status').value = s; 
    
    document.getElementById('classificacao').value = d.classificacao || "Novo Serviço";
    document.getElementById('osOrigem').value = d.osOrigem || "";
    document.getElementById('modalidade').value = d.modalidade || "Realizado na Loja";
    
    document.getElementById('cliente').value = d.cliente || ""; document.getElementById('cpf').value = d.cpf || ""; document.getElementById('rg').value = d.rg || "";
    document.getElementById('whatsapp').value = d.whatsapp || ""; document.getElementById('endCliente').value = d.endCliente || ""; document.getElementById('bairro').value = d.bairro || ""; document.getElementById('cep').value = d.cep || "";
    document.getElementById('equip').value = d.equip || ""; document.getElementById('modelo').value = d.modelo || ""; document.getElementById('serie').value = d.serie || ""; 
    
    document.querySelectorAll('.chk-item').forEach(el => el.checked = false);
    if(d.chkList) { d.chkList.split(', ').forEach(item => { const cb = document.querySelector(`.chk-item[value="${item}"]`); if(cb) cb.checked = true; }); }
    if(d.chkFonte === "Sim") { const cb = document.querySelector(`.chk-item[value="Fonte/Carregador"]`); if(cb) cb.checked = true; }
    if(d.chkCapa === "Sim") { const cb = document.querySelector(`.chk-item[value="Capa/Case"]`); if(cb) cb.checked = true; }
    
    document.getElementById('aces').value = d.aces || "";
    document.getElementById('insLiga').value = d.inspecao?.liga || "-"; document.getElementById('insImagem').value = d.inspecao?.imagem || "-"; document.getElementById('insBarulho').value = d.inspecao?.barulho || "-"; document.getElementById('insTemp').value = d.inspecao?.temp || "-"; document.getElementById('insLed').value = d.inspecao?.led || "-";
    
    document.getElementById('defeito').value = d.defeito || ""; document.getElementById('laudo').value = d.laudo || ""; document.getElementById('servicos').value = d.servicos || ""; document.getElementById('diarioBordo').value = d.diarioBordo || ""; document.getElementById('emprestimo').value = d.emprestimo || "";
    
    document.getElementById('vPecas').value = d.vPecas || ""; document.getElementById('vCustoPecas').value = d.vCustoPecas || ""; document.getElementById('vObra').value = d.vObra || ""; document.getElementById('vVisita').value = d.vVisita || ""; document.getElementById('vDesc').value = d.vDesc || "";
    document.getElementById('osPix').value = d.pagamentos?.pix || ""; document.getElementById('osDin').value = d.pagamentos?.din || ""; document.getElementById('osCred').value = d.pagamentos?.cred || ""; document.getElementById('osDeb').value = d.pagamentos?.deb || "";
    document.getElementById('garPecas').value = d.garP || ""; document.getElementById('garObra').value = d.garO || "";
    
    if(d.data) { const [dia, mes, ano] = d.data.split('/'); document.getElementById('dataEntrada').value = `${ano}-${mes}-${dia}`; }
    if(d.dataPrev) { const [dp, mp, yp] = d.dataPrev.split('/'); document.getElementById('dataPrev').value = `${yp}-${mp}-${dp}`; } else { document.getElementById('dataPrev').value = ""; }

    document.getElementById('idEdicao').innerText = String(d.os).padStart(4, '0');
    document.getElementById('avisoEdicao').style.display = 'block'; document.getElementById('botoesCriar').style.display = 'none';
    document.getElementById('botaoSalvarEdicao').style.display = 'flex'; mudarAba('abaNovaOS');
}

async function imprimirOS(id) {
    try {
        const doc = await db.collection("servicos").doc(id).get();
        if (doc.exists) prepararImpressao(doc.data());
        else alert("Erro: OS não encontrada no banco de dados.");
    } catch (e) { alert("Erro ao conectar com o banco.", e); }
}

// ----------------------------------------------------------------------
// BLINDAGEM DE IMPRESSÃO - GARANTE QUE O MEI NÃO VAZE PARA A TELA DA OS
// ----------------------------------------------------------------------
function prepararImpressao(d) {
    let tMei = document.getElementById('telaDocumentoMEI');
    let cPrincipal = document.getElementById('conteinerPrincipal');
    let mNavegacao = document.getElementById('menuNavegacao');
    
    if(tMei) tMei.setAttribute('style', 'display: none !important;');
    if(cPrincipal) cPrincipal.setAttribute('style', 'display: none !important;');
    if(mNavegacao) mNavegacao.setAttribute('style', 'display: none !important;');
    
    document.getElementById('telaDocumento').style.display = 'block';

    if(configGlobais.logo) { document.getElementById('docLogo').src = configGlobais.logo; document.getElementById('docLogo').style.display = 'inline-block'; }
    document.getElementById('docEnd').innerText = configGlobais.end || ""; document.getElementById('docTel').innerText = configGlobais.tel || "";
    document.getElementById('resOS').innerText = String(d.os).padStart(4, '0');
    document.getElementById('qrCode').src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=OS:${d.os}-Cliente:${encodeURIComponent(d.cliente || '')}`;

    if(d.osOrigem) { document.getElementById('boxOsOrigem').style.display = 'block'; document.getElementById('resOsOrigem').innerText = d.osOrigem; } 
    else { document.getElementById('boxOsOrigem').style.display = 'none'; }

    let vd = parseFloat(d.vDesc) || 0; let vpec = parseFloat(d.vPecas) || 0; let vobr = parseFloat(d.vObra) || 0; let vvis = parseFloat(d.vVisita) || 0; 
    let vtot = parseFloat(d.total) || 0; let vfal = parseFloat(d.faltaPagar) || 0; let vsin = parseFloat(d.vSinal) || 0;

    let s = String(d.status).trim();
    if (s.includes('5.') || s.includes('Devolvido')) { document.getElementById('alertaDevolvidoPDF').style.display = 'block'; } 
    else { document.getElementById('alertaDevolvidoPDF').style.display = 'none'; }

    document.getElementById('boxLaudo').style.display = 'block'; document.getElementById('secEquipamento').style.display = 'block';
    document.getElementById('termoJuridico').style.display = 'block'; document.getElementById('rowGarantias').style.display = 'flex';

    if(d.categoria === 'VENDA_BALCAO') {
        document.getElementById('secEquipamento').style.display = 'none'; document.getElementById('tituloTecnico').innerText = "PRODUTOS VENDIDOS";
        document.getElementById('lblDefeito').innerText = "Descrição dos Itens"; document.getElementById('boxLaudo').style.display = 'none';
        document.getElementById('termoJuridico').style.display = 'none'; document.getElementById('rowGarantias').style.display = 'none';
        document.getElementById('lblObra').innerText = "Valor da Venda (R$)"; document.getElementById('lblPecas').innerText = "Outros Custos"; 
        document.getElementById('resPecas').innerText = "-"; document.getElementById('lblDesc').innerText = "Desconto (R$)"; document.getElementById('resDesc').innerText = vd ? vd.toFixed(2) : "0.00";
    } else {
        document.getElementById('tituloTecnico').innerText = "3. DETALHES TÉCNICOS DO ATENDIMENTO"; document.getElementById('lblDefeito').innerText = "3.1. Defeito Relatado / Produto"; 
        document.getElementById('lblObra').innerText = "Mão de Obra (R$)"; document.getElementById('lblPecas').innerText = "Peças (R$)";
        document.getElementById('resPecas').innerText = vpec ? vpec.toFixed(2) : "0.00"; document.getElementById('lblDesc').innerText = "Desconto (R$)"; document.getElementById('resDesc').innerText = vd ? vd.toFixed(2) : "0.00";
        
        if (d.tipo === 'RECIBO_PAGAMENTO') {
            document.getElementById('docTituloPrincipal').innerText = "RECIBO DE PAGAMENTO"; document.getElementById('rowInspecao').style.display = 'none'; document.getElementById('boxLaudo').style.display = 'none'; 
            document.getElementById('termoJuridico').innerHTML = `<strong>TERMO DE QUITAÇÃO:</strong> Declaramos que os valores descritos neste documento referentes à prestação de serviços foram recebidos, dando plena e total quitação.`;
        } else if (d.classificacao === 'Retorno em Garantia') {
            document.getElementById('docTituloPrincipal').innerText = "RETORNO EM GARANTIA"; document.getElementById('rowInspecao').style.display = 'flex';
            document.getElementById('termoJuridico').innerHTML = `<strong>AVISO IMPORTANTE:</strong> Documento gerado eletronicamente para acionamento de garantia. O equipamento será avaliado tecnicamente para confirmação do defeito na peça ou serviço previamente executado.`;
        } else {
            document.getElementById('docTituloPrincipal').innerText = "ORDEM DE SERVIÇO"; document.getElementById('rowInspecao').style.display = 'flex';
            document.getElementById('termoJuridico').innerHTML = `<strong>AVISO IMPORTANTE:</strong> Documento gerado eletronicamente. Orçamentos têm validade de 5 dias úteis a partir da emissão. Em caso de abandono de equipamento sem retirada após 180 dias, o mesmo será tratado como sucata para abatimento dos custos, isentando a empresa de obrigações legais.`;
        }
    }

    document.getElementById('resCliente').innerText = d.cliente || ""; document.getElementById('resCpf').innerText = d.cpf || ""; document.getElementById('resRg').innerText = d.rg || "";
    document.getElementById('resEndCli').innerText = d.endCliente || ""; document.getElementById('resBairro').innerText = d.bairro || "";
    document.getElementById('resCep').innerText = d.cep || ""; document.getElementById('resZap').innerText = d.whatsapp || "";
    document.getElementById('resModalidade').innerText = d.modalidade || "Realizado na Loja"; document.getElementById('resVisita').innerText = vvis ? vvis.toFixed(2) : "0.00";
    document.getElementById('resEquip').innerText = d.equip || ""; document.getElementById('resModelo').innerText = d.modelo || ""; document.getElementById('resSerie').innerText = d.serie || ""; 
    
    let acesArr = []; if (d.chkList) acesArr.push(d.chkList); else { if (d.chkFonte === "Sim") acesArr.push("Fonte"); if (d.chkCapa === "Sim") acesArr.push("Capa"); }
    if (d.aces) acesArr.push(d.aces); document.getElementById('resAcesFull').innerText = acesArr.join(' | ') || "Nenhum acessório";

    document.getElementById('resInsLiga').innerText = d.inspecao?.liga || "-"; document.getElementById('resInsImagem').innerText = d.inspecao?.imagem || "-";
    document.getElementById('resInsBarulho').innerText = d.inspecao?.barulho || "-"; document.getElementById('resInsTemp').innerText = d.inspecao?.temp || "-"; document.getElementById('resInsLed').innerText = d.inspecao?.led || "-";

    if(d.emprestimo) { document.getElementById('rowEmprestimo').style.display = 'flex'; document.getElementById('resEmprestimo').innerText = d.emprestimo; } 
    else { document.getElementById('rowEmprestimo').style.display = 'none'; }

    document.getElementById('resDefeito').innerText = d.defeito || ""; document.getElementById('resLaudo').innerText = d.laudo || ""; document.getElementById('resServicos').innerText = d.servicos || "";
    
    if(d.diarioBordo && d.categoria !== 'VENDA_BALCAO') { document.getElementById('boxDiario').style.display = 'block'; document.getElementById('resDiario').innerText = d.diarioBordo; } 
    else { document.getElementById('boxDiario').style.display = 'none'; }

    document.getElementById('resObra').innerText = vobr ? vobr.toFixed(2) : "0.00"; document.getElementById('resTotal').innerText = "R$ " + (vtot ? vtot.toFixed(2) : "0.00");
    document.getElementById('resSinal').innerText = vsin ? "R$ " + vsin.toFixed(2) : "R$ 0.00"; document.getElementById('resFaltaPagar').innerText = vfal ? "R$ " + vfal.toFixed(2) : "R$ 0.00";
    document.getElementById('resGarO').innerText = d.garO || ""; document.getElementById('resGarP').innerText = d.garP || ""; document.getElementById('resDataPrev').innerText = d.dataPrev || "Sem previsão";
    
    let cidadeLocal = configGlobais.cidade || "Sua Cidade";
    if(document.getElementById('resLocalData')) { document.getElementById('resLocalData').innerText = cidadeLocal; }
    document.getElementById('resData').innerText = d.data || new Date().toLocaleDateString('pt-BR');

    let pagText = [];
    if(d.pagamentos) {
        let vPix = parseFloat(d.pagamentos.pix) || 0; let vDin = parseFloat(d.pagamentos.din) || 0; let vCred = parseFloat(d.pagamentos.cred) || 0; let vDeb = parseFloat(d.pagamentos.deb) || 0;
        if(vPix > 0) pagText.push(`PIX: R$ ${vPix.toFixed(2)}`); if(vDin > 0) pagText.push(`DIN: R$ ${vDin.toFixed(2)}`); if(vCred > 0) pagText.push(`CRÉD: R$ ${vCred.toFixed(2)}`); if(vDeb > 0) pagText.push(`DÉB: R$ ${vDeb.toFixed(2)}`);
    }
    if(pagText.length > 0) { document.getElementById('rowMetodosPagamento').style.display = 'flex'; document.getElementById('resMeiosPag').innerText = pagText.join(' | '); } 
    else { document.getElementById('rowMetodosPagamento').style.display = 'none'; }

    window.scrollTo(0, 0);
}

function fecharImpressao() {
    document.getElementById('telaDocumento').style.display = 'none';
    let cPrincipal = document.getElementById('conteinerPrincipal');
    let tMei = document.getElementById('telaDocumentoMEI');
    let mNavegacao = document.getElementById('menuNavegacao');
    
    if(cPrincipal) cPrincipal.setAttribute('style', 'display: block !important;');
    if(tMei) tMei.setAttribute('style', 'display: none !important;');
    if(mNavegacao) mNavegacao.setAttribute('style', 'display: flex !important;');
}
