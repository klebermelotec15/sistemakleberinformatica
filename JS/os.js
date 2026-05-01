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

async function salvarVendaPDV(imprimirRecibo) {
    const desc = document.getElementById('pdvProduto').value;
    const venda = parseFloat(document.getElementById('pdvVenda').value) || 0;
    const descPDV = parseFloat(document.getElementById('pdvDesc').value) || 0;
    
    const pix = parseFloat(document.getElementById('pdvPix').value) || 0;
    const din = parseFloat(document.getElementById('pdvDin').value) || 0;
    const cred = parseFloat(document.getElementById('pdvCred').value) || 0;
    const deb = parseFloat(document.getElementById('pdvDeb').value) || 0;
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
        tipo: 'RECIBO'
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

    const totalOS = (vp + vo) - vd;

    const dados = {
        os: numOS, categoria: 'SERVICO', status: document.getElementById('status').value,
        cliente: document.getElementById('cliente').value, cpf: document.getElementById('cpf').value,
        rg: document.getElementById('rg').value, whatsapp: document.getElementById('whatsapp').value,
        endCliente: document.getElementById('endCliente').value, bairro: document.getElementById('bairro').value,
        cep: document.getElementById('cep').value, equip: document.getElementById('equip').value,
        modelo: document.getElementById('modelo').value, serie: document.getElementById('serie').value,
        chkList: chkArr.join(', '), 
        aces: document.getElementById('aces').value,
        inspecao: {
            liga: document.getElementById('insLiga').value,
            imagem: document.getElementById('insImagem').value,
            barulho: document.getElementById('insBarulho').value,
            temp: document.getElementById('insTemp').value,
            led: document.getElementById('insLed').value
        },
        emprestimo: document.getElementById('emprestimo').value,
        defeito: document.getElementById('defeito').value,
        laudo: document.getElementById('laudo').value, servicos: document.getElementById('servicos').value,
        vPecas: vp, vCustoPecas: vcusto, vObra: vo, vDesc: vd, vSinal: totalPago, total: totalOS, faltaPagar: totalOS - totalPago,
        pagamentos: { pix, din, cred, deb },
        garP: document.getElementById('garPecas').value, garO: document.getElementById('garObra').value,
        data: dataFormatada, dataPrev: dataPrevFormatada, tipo: tipoDoc
    };

    if(!dados.cliente) return alert("Digite o nome do cliente!");

    if(dados.cliente) {
        let nomeKey = dados.cliente.toUpperCase().trim();
        db.collection("clientes").doc(nomeKey).set({
            nome: dados.cliente, zap: dados.whatsapp, cpf: dados.cpf,
            rg: dados.rg, cep: dados.cep, end: dados.endCliente, bairro: dados.bairro
        }).then(() => carregarClientesDaNuvem()); 
    }

    if(editandoId) {
        await db.collection("servicos").doc(editandoId).update(dados);
        limparFormularioOS();
        mudarAba('abaHistorico'); 
    } else {
        await db.collection("servicos").add(dados);
        prepararImpressao(dados);
        limparFormularioOS();
    }
    carregarHistorico();
}

function salvarEdicao() { salvarOS(tipoDocOriginal); }

function limparFormularioOS() {
    editandoId = null;
    document.getElementById('avisoEdicao').style.display = 'none';
    document.getElementById('botoesCriar').style.display = 'flex';
    document.getElementById('botaoSalvarEdicao').style.display = 'none';
    document.querySelectorAll('#abaNovaOS input[type=text], #abaNovaOS input[type=number], #abaNovaOS textarea, #abaNovaOS input[type=date]').forEach(el => el.value = '');
    
    document.querySelectorAll('.chk-item').forEach(el => el.checked = false);
    
    document.getElementById('insLiga').value = "-";
    document.getElementById('insImagem').value = "-";
    document.getElementById('insBarulho').value = "-";
    document.getElementById('insTemp').value = "-";
    document.getElementById('insLed').value = "-";

    document.getElementById('status').value = "1. Falta Orçar";
    document.getElementById('garObra').value = "90 Dias";
    document.getElementById('garPecas').value = "3 meses";
    document.getElementById('dataEntrada').value = new Date().toISOString().split('T')[0];
}

async function imprimirOS(id) {
    try {
        const doc = await db.collection("servicos").doc(id).get();
        if (doc.exists) {
            prepararImpressao(doc.data());
        } else {
            alert("Erro: OS não encontrada no banco de dados.");
        }
    } catch (e) {
        alert("Erro ao conectar com o servidor para impressão.");
        console.error(e);
    }
}

function prepararImpressao(d) {
    if(configGlobais.logo) { document.getElementById('docLogo').src = configGlobais.logo; document.getElementById('docLogo').style.display = 'inline-block'; }
    document.getElementById('docEnd').innerText = configGlobais.end || ""; document.getElementById('docTel').innerText = configGlobais.tel || "";
    document.getElementById('resOS').innerText = String(d.os).padStart(4, '0');
    document.getElementById('qrCode').src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=OS:${d.os}-Cliente:${encodeURIComponent(d.cliente || '')}`;

    let vd = parseFloat(d.vDesc) || 0;
    let vpec = parseFloat(d.vPecas) || 0;
    let vobr = parseFloat(d.vObra) || 0;
    let vtot = parseFloat(d.total) || 0;
    let vfal = parseFloat(d.faltaPagar) || 0;
    let vsin = parseFloat(d.vSinal) || 0;

    let s = String(d.status).trim();
    if (s === '5. Devolvido sem reparo') {
        document.getElementById('alertaDevolvidoPDF').style.display = 'block';
    } else {
        document.getElementById('alertaDevolvidoPDF').style.display = 'none';
    }

    if(d.categoria === 'VENDA_BALCAO') {
        document.getElementById('secEquipamento').style.display = 'none'; document.getElementById('tituloTecnico').innerText = "PRODUTOS VENDIDOS";
        document.getElementById('lblDefeito').innerText = "Descrição dos Itens"; document.getElementById('boxLaudo').style.display = 'none';
        document.getElementById('termoJuridico').style.display = 'none'; document.getElementById('rowGarantias').style.display = 'none';
        document.getElementById('lblObra').innerText = "Valor da Venda (R$)"; document.getElementById('lblPecas').innerText = "Outros Custos"; document.getElementById('resPecas').innerText = "-";
        document.getElementById('lblDesc').innerText = "Desconto (R$)"; document.getElementById('resDesc').innerText = vd ? vd.toFixed(2) : "0.00";
    } else {
        document.getElementById('secEquipamento').style.display = 'block'; document.getElementById('tituloTecnico').innerText = "3. DETALHES TÉCNICOS DO ATENDIMENTO";
        document.getElementById('lblDefeito').innerText = "3.1. Defeito Relatado / Produto"; document.getElementById('boxLaudo').style.display = 'block';
        document.getElementById('termoJuridico').style.display = 'block'; document.getElementById('rowGarantias').style.display = 'flex';
        document.getElementById('lblObra').innerText = "Mão de Obra (R$)"; document.getElementById('lblPecas').innerText = "Peças (R$)";
        document.getElementById('resPecas').innerText = vpec ? vpec.toFixed(2) : "0.00";
        document.getElementById('lblDesc').innerText = "Desconto (R$)"; document.getElementById('resDesc').innerText = vd ? vd.toFixed(2) : "0.00";
    }

    document.getElementById('resCliente').innerText = d.cliente || ""; document.getElementById('resCpf').innerText = d.cpf || ""; document.getElementById('resRg').innerText = d.rg || "";
    document.getElementById('resEndCli').innerText = d.endCliente || ""; document.getElementById('resBairro').innerText = d.bairro || "";
    document.getElementById('resCep').innerText = d.cep || ""; document.getElementById('resZap').innerText = d.whatsapp || "";
    document.getElementById('resEquip').innerText = d.equip || ""; document.getElementById('resModelo').innerText = d.modelo || ""; document.getElementById('resSerie').innerText = d.serie || ""; 
    
    let acesArr = []; if (d.chkList) acesArr.push(d.chkList); else { if (d.chkFonte === "Sim") acesArr.push("Fonte"); if (d.chkCapa === "Sim") acesArr.push("Capa"); }
    if (d.aces) acesArr.push(d.aces); document.getElementById('resAcesFull').innerText = acesArr.join(' | ') || "Nenhum acessório";

    document.getElementById('resInsLiga').innerText = d.inspecao?.liga || "-"; document.getElementById('resInsImagem').innerText = d.inspecao?.imagem || "-";
    document.getElementById('resInsBarulho').innerText = d.inspecao?.barulho || "-"; document.getElementById('resInsTemp').innerText = d.inspecao?.temp || "-"; document.getElementById('resInsLed').innerText = d.inspecao?.led || "-";

    if(d.emprestimo) { document.getElementById('rowEmprestimo').style.display = 'flex'; document.getElementById('resEmprestimo').innerText = d.emprestimo; } 
    else { document.getElementById('rowEmprestimo').style.display = 'none'; }

    document.getElementById('resDefeito').innerText = d.defeito || ""; document.getElementById('resLaudo').innerText = d.laudo || ""; document.getElementById('resServicos').innerText = d.servicos || "";
    document.getElementById('resObra').innerText = vobr ? vobr.toFixed(2) : "0.00"; 
    document.getElementById('resTotal').innerText = "R$ " + (vtot ? vtot.toFixed(2) : "0.00");
    document.getElementById('resSinal').innerText = vsin ? "R$ " + vsin.toFixed(2) : "R$ 0.00"; 
    document.getElementById('resFaltaPagar').innerText = vfal ? "R$ " + vfal.toFixed(2) : "R$ 0.00";
    document.getElementById('resGarO').innerText = d.garO || ""; document.getElementById('resGarP').innerText = d.garP || ""; document.getElementById('resDataPrev').innerText = d.dataPrev || "Sem previsão";
    
    let cidadeLocal = configGlobais.cidade || "Sua Cidade";
    if(document.getElementById('resLocalData')) {
        document.getElementById('resLocalData').innerText = cidadeLocal;
    }
    
    document.getElementById('resData').innerText = d.data || new Date().toLocaleDateString('pt-BR');

    let pagText = [];
    if(d.pagamentos) {
        let vPix = parseFloat(d.pagamentos.pix) || 0;
        let vDin = parseFloat(d.pagamentos.din) || 0;
        let vCred = parseFloat(d.pagamentos.cred) || 0;
        let vDeb = parseFloat(d.pagamentos.deb) || 0;
        
        if(vPix > 0) pagText.push(`PIX: R$ ${vPix.toFixed(2)}`); 
        if(vDin > 0) pagText.push(`DIN: R$ ${vDin.toFixed(2)}`);
        if(vCred > 0) pagText.push(`CRÉD: R$ ${vCred.toFixed(2)}`); 
        if(vDeb > 0) pagText.push(`DÉB: R$ ${vDeb.toFixed(2)}`);
    }
    if(pagText.length > 0) { document.getElementById('rowMetodosPagamento').style.display = 'flex'; document.getElementById('resMeiosPag').innerText = pagText.join(' | '); } 
    else { document.getElementById('rowMetodosPagamento').style.display = 'none'; }

    document.getElementById('conteinerPrincipal').style.display = 'none'; 
    document.getElementById('telaDocumentoMEI').style.display = 'none';
    document.getElementById('telaDocumento').style.display = 'block'; 
    window.scrollTo(0, 0);
}

async function carregarHistorico() {
    try {
        const snap = await db.collection("servicos").orderBy("os", "desc").get();
        processarInteligencia(snap); 
        renderizarKanban(snap);
    } catch (e) {
        console.error("Erro ao carregar banco de dados:", e);
    }
}

function processarInteligencia(snap) {
    try {
        clientesFieis.clear(); mapaGarantias.clear();
        
        let lucroPecas = 0, totalObra = 0, totalPDV = 0, descontosAplicados = 0, abandonados = 0;
        
        let docs = []; snap.forEach(d => docs.push(d.data()));
        let docsCronologicos = [...docs].reverse(); 
        
        docsCronologicos.forEach(d => {
            if(d.categoria !== 'VENDA_BALCAO' && d.serie) {
                mapaGarantias.set(String(d.serie).trim(), { os: d.os, data: d.data });
            }
            let s = d.status || "";
            let finalizado = (s === '4. Entregue com sucesso de reparo' || s === 'Entregue ao Cliente' || s === '5. Devolvido sem reparo');
            if(finalizado && d.cliente) {
                let nomeKey = String(d.cliente).toUpperCase().trim();
                clientesFieis.set(nomeKey, (clientesFieis.get(nomeKey) || 0) + 1);
            }
        });

        docs.forEach(d => {
            let s = d.status || "";
            let finalizado = (s === '4. Entregue com sucesso de reparo' || s === 'Entregue ao Cliente' || s === '5. Devolvido sem reparo');

            if(finalizado) { 
                if (d.categoria === 'VENDA_BALCAO') {
                    totalPDV += parseFloat(d.total) || 0; 
                } else {
                    let vp = parseFloat(d.vPecas) || 0;
                    let vc = parseFloat(d.vCustoPecas) || 0; 
                    let vo = parseFloat(d.vObra) || 0;
                    let vd = parseFloat(d.vDesc) || 0;

                    lucroPecas += (vp - vc);
                    totalObra += vo;
                    descontosAplicados += vd;
                }
            } 
            else if (calcularDias(d.data) > 180 && d.categoria !== 'VENDA_BALCAO') { 
                abandonados++; 
            }
        });

        let totalGeral = (lucroPecas + totalObra - descontosAplicados) + totalPDV;

        document.getElementById('dashLucroPecas').innerText = "R$ " + lucroPecas.toFixed(2);
        document.getElementById('dashObra').innerText = "R$ " + totalObra.toFixed(2);
        document.getElementById('dashPDV').innerText = "R$ " + totalPDV.toFixed(2);
        document.getElementById('dashTotal').innerText = "R$ " + totalGeral.toFixed(2);
        
        if(abandonados > 0) { 
            document.getElementById('qtdAbandonados').innerText = abandonados; 
            document.getElementById('alertaAbandono').style.display = 'block'; 
        } else { 
            document.getElementById('alertaAbandono').style.display = 'none'; 
        }
    } catch (error) {
        console.error("Ignorando erro de dados antigos na Inteligência:", error);
    }
}

function renderizarKanban(snap, filtroText = "") {
    let htmlOrcar = "", htmlExec = "", htmlConc = "", htmlEntr = "", htmlDevolv = "";
    let cOrcar = 0, cExec = 0, cConc = 0, cEntr = 0, cDevolv = 0;

    snap.forEach(doc => {
        try {
            const d = doc.data();
            let searchTarget = `${d.cliente || ""} ${d.os || ""} ${d.equip || ""} ${d.defeito || ""}`.toUpperCase();
            if (filtroText && !searchTarget.includes(filtroText)) return;

            let tagExtra = "", garantiaTag = "", fidelidadeTag = "";
            let dias = calcularDias(d.data);
            
            if(d.cliente) {
                let nomeKey = String(d.cliente).toUpperCase().trim();
                if (clientesFieis.get(nomeKey) >= 5) {
                    fidelidadeTag = `<span class="tag" style="background:#ffc107; color:#000;">⭐ Fiel</span>`;
                }
            }

            let stat = String(d.status).trim();
            let finalizadoComSucesso = (stat === '4. Entregue com sucesso de reparo' || stat === 'Entregue ao Cliente');
            let finalizadoSemReparo = (stat === '5. Devolvido sem reparo');

            if(d.serie && d.categoria !== 'VENDA_BALCAO') {
                let serieKey = String(d.serie).trim();
                let ultimaDaSerie = mapaGarantias.get(serieKey);
                if(ultimaDaSerie && ultimaDaSerie.os !== d.os) {
                    let diffDiasAnterior = calcularDias(ultimaDaSerie.data);
                    if(diffDiasAnterior <= 90 && !finalizadoComSucesso && !finalizadoSemReparo) {
                        garantiaTag = `<br><span class="tag" style="background:#dc3545;">⚠️ POSSÍVEL RETORNO/GARANTIA</span>`;
                    }
                }
            }

            if(d.categoria === 'VENDA_BALCAO') { 
                tagExtra = `<span class="tag" style="background:#6c757d;">🛒 VENDA</span>`; 
            } else if(finalizadoComSucesso) {
                let gO = converterParaDias(d.garO); 
                let gP = converterParaDias(d.garP);
                let obraAtiva = gO > 0 && dias <= gO;
                let pecasAtiva = gP > 0 && dias <= gP;

                if (obraAtiva && pecasAtiva) tagExtra = `<span class="tag" style="background:#28a745;">🛡️ Garantia: AMBAS</span>`;
                else if (obraAtiva && !pecasAtiva) tagExtra = `<span class="tag" style="background:#17a2b8;">🛡️ Garantia: MÃO DE OBRA</span>`;
                else if (!obraAtiva && pecasAtiva) tagExtra = `<span class="tag" style="background:#6f42c1;">🛡️ Garantia: PEÇAS</span>`;
                else tagExtra = `<span class="tag" style="background:#6c757d;">❌ GARANTIA EXPIRADA</span>`;
            } else if(finalizadoSemReparo) {
                tagExtra = `<span class="tag" style="background:#000;">⚫ SEM REPARO</span>`;
            } else if(dias > 180) { 
                tagExtra = `<span class="tag" style="background:red;">🚨 ABANDONADO</span>`; 
            }
            
            let previsaoTag = "";
            if(d.dataPrev && stat !== '3. Concluída' && stat !== 'Concluída' && !finalizadoComSucesso && !finalizadoSemReparo) {
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
                    <div>${tagExtra} ${previsaoTag} ${garantiaTag}</div>
                </div>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button class="btn-dark btn-small" style="padding:4px;" onclick="imprimirOS('${doc.id}')">🖨️ PDF</button>
                    <button class="btn-blue btn-small" style="padding:4px;" onclick="editarOS('${doc.id}')">✏️ Editar</button>
                    <button class="btn-red btn-small" style="padding:4px; flex:none;" onclick="excluirOS('${doc.id}')">🗑️</button>
                </div>
            </div>`;

            if (stat === '1. Falta Orçar' || stat === 'Falta Orçar') { htmlOrcar += card; cOrcar++; }
            else if (stat === '2. Executando' || stat === 'Executando') { htmlExec += card; cExec++; }
            else if (stat === '3. Concluída' || stat === 'Concluída') { htmlConc += card; cConc++; }
            else if (finalizadoComSucesso) { htmlEntr += card; cEntr++; }
            else if (finalizadoSemReparo) { htmlDevolv += card; cDevolv++; }

        } catch (err) {
            console.error("OS ignorada na renderização por erro de formato:", doc.id, err);
        }
    });

    if(document.getElementById('kb-orcar')) {
        document.getElementById('kb-orcar').innerHTML = htmlOrcar; document.getElementById('countOrcar').innerText = cOrcar;
        document.getElementById('kb-exec').innerHTML = htmlExec; document.getElementById('countExec').innerText = cExec;
        document.getElementById('kb-conc').innerHTML = htmlConc; document.getElementById('countConc').innerText = cConc;
        document.getElementById('kb-entr').innerHTML = htmlEntr; document.getElementById('countEntr').innerText = cEntr;
        document.getElementById('kb-devolv').innerHTML = htmlDevolv; document.getElementById('countDevolv').innerText = cDevolv;
    }
}

async function buscar() {
    const t = document.getElementById('busca').value.toUpperCase();
    const snap = await db.collection("servicos").orderBy("os", "desc").get();
    renderizarKanban(snap, t);
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
    
    document.getElementById('cliente').value = d.cliente || "";
    document.getElementById('cpf').value = d.cpf || ""; document.getElementById('rg').value = d.rg || "";
    document.getElementById('whatsapp').value = d.whatsapp || ""; document.getElementById('endCliente').value = d.endCliente || "";
    document.getElementById('bairro').value = d.bairro || ""; document.getElementById('cep').value = d.cep || "";
    document.getElementById('equip').value = d.equip || ""; document.getElementById('modelo').value = d.modelo || ""; document.getElementById('serie').value = d.serie || ""; 
    
    document.querySelectorAll('.chk-item').forEach(el => el.checked = false);
    if(d.chkList) { d.chkList.split(', ').forEach(item => { const cb = document.querySelector(`.chk-item[value="${item}"]`); if(cb) cb.checked = true; }); }
    if(d.chkFonte === "Sim") { const cb = document.querySelector(`.chk-item[value="Fonte/Carregador"]`); if(cb) cb.checked = true; }
    if(d.chkCapa === "Sim") { const cb = document.querySelector(`.chk-item[value="Capa/Case"]`); if(cb) cb.checked = true; }
    
    document.getElementById('aces').value = d.aces || "";
    document.getElementById('insLiga').value = d.inspecao?.liga || "-"; document.getElementById('insImagem').value = d.inspecao?.imagem || "-";
    document.getElementById('insBarulho').value = d.inspecao?.barulho || "-"; document.getElementById('insTemp').value = d.inspecao?.temp || "-"; document.getElementById('insLed').value = d.inspecao?.led || "-";
    
    document.getElementById('defeito').value = d.defeito || ""; document.getElementById('laudo').value = d.laudo || ""; document.getElementById('servicos').value = d.servicos || "";
    document.getElementById('emprestimo').value = d.emprestimo || "";
    document.getElementById('vPecas').value = d.vPecas || ""; 
    document.getElementById('vCustoPecas').value = d.vCustoPecas || ""; 
    document.getElementById('vObra').value = d.vObra || ""; 
    document.getElementById('vDesc').value = d.vDesc || "";
    document.getElementById('osPix').value = d.pagamentos?.pix || ""; document.getElementById('osDin').value = d.pagamentos?.din || "";
    document.getElementById('osCred').value = d.pagamentos?.cred || ""; document.getElementById('osDeb').value = d.pagamentos?.deb || "";
    document.getElementById('garPecas').value = d.garP || ""; document.getElementById('garObra').value = d.garO || "";
    
    if(d.data) { const [dia, mes, ano] = d.data.split('/'); document.getElementById('dataEntrada').value = `${ano}-${mes}-${dia}`; }
    if(d.dataPrev) { const [dp, mp, yp] = d.dataPrev.split('/'); document.getElementById('dataPrev').value = `${yp}-${mp}-${dp}`; } else { document.getElementById('dataPrev').value = ""; }

    document.getElementById('idEdicao').innerText = String(d.os).padStart(4, '0');
    document.getElementById('avisoEdicao').style.display = 'block'; document.getElementById('botoesCriar').style.display = 'none';
    document.getElementById('botaoSalvarEdicao').style.display = 'flex'; mudarAba('abaNovaOS');
}
