if(document.getElementById('meiAno')) document.getElementById('meiAno').value = new Date().getFullYear();

function formatCur(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcMEI() {
    let v1 = parseFloat(document.getElementById('mei1').value) || 0;
    let v2 = parseFloat(document.getElementById('mei2').value) || 0;
    let v3 = v1 + v2;
    document.getElementById('mei3').innerText = v3.toFixed(2);

    let v4 = parseFloat(document.getElementById('mei4').value) || 0;
    let v5 = parseFloat(document.getElementById('mei5').value) || 0;
    let v6 = v4 + v5;
    document.getElementById('mei6').innerText = v6.toFixed(2);

    let v7 = parseFloat(document.getElementById('mei7').value) || 0;
    let v8 = parseFloat(document.getElementById('mei8').value) || 0;
    let v9 = v7 + v8;
    document.getElementById('mei9').innerText = v9.toFixed(2);

    let v10 = v3 + v6 + v9;
    document.getElementById('mei10').innerText = v10.toFixed(2);
}

async function salvarMEI() {
    let mes = document.getElementById('meiMes').value;
    let ano = document.getElementById('meiAno').value;
    if(!ano) return alert("Por favor, digite o ano.");
    
    let idDoc = `${ano}-${mes}`;
    let dados = {
        v1: parseFloat(document.getElementById('mei1').value) || 0,
        v2: parseFloat(document.getElementById('mei2').value) || 0,
        v4: parseFloat(document.getElementById('mei4').value) || 0,
        v5: parseFloat(document.getElementById('mei5').value) || 0,
        v7: parseFloat(document.getElementById('mei7').value) || 0,
        v8: parseFloat(document.getElementById('mei8').value) || 0
    };
    
    try {
        await db.collection('relatoriosMEI').doc(idDoc).set(dados);
        alert(`Relatório de ${mes}/${ano} salvo na nuvem com sucesso!`);
    } catch(e) {
        alert("Erro ao salvar na nuvem.");
        console.error(e);
    }
}

async function carregarMEI() {
    if(!document.getElementById('meiMes') || !document.getElementById('meiAno')) return;
    let mes = document.getElementById('meiMes').value;
    let ano = document.getElementById('meiAno').value;
    if(!ano) return;
    
    let idDoc = `${ano}-${mes}`;
    try {
        const doc = await db.collection('relatoriosMEI').doc(idDoc).get();
        if(doc.exists) {
            let d = doc.data();
            document.getElementById('mei1').value = d.v1 || "";
            document.getElementById('mei2').value = d.v2 || "";
            document.getElementById('mei4').value = d.v4 || "";
            document.getElementById('mei5').value = d.v5 || "";
            document.getElementById('mei7').value = d.v7 || "";
            document.getElementById('mei8').value = d.v8 || "";
        } else {
            document.getElementById('mei1').value = "";
            document.getElementById('mei2').value = "";
            document.getElementById('mei4').value = "";
            document.getElementById('mei5').value = "";
            document.getElementById('mei7').value = "";
            document.getElementById('mei8').value = "";
        }
        calcMEI();
    } catch (e) {
        console.error("Erro ao carregar dados do MEI", e);
    }
}

function imprimirMEI() {
    document.getElementById('docMeiCnpj').innerText = configGlobais.cnpj || "NÃO CONFIGURADO NA ABA CONFIG";
    document.getElementById('docMeiRazao').innerText = configGlobais.razao || "NÃO CONFIGURADO";
    
    let mes = document.getElementById('meiMes').value;
    let ano = document.getElementById('meiAno').value;
    document.getElementById('docMeiPeriodo').innerText = `${mes} DE ${ano}`;

    document.getElementById('docMei1').innerText = formatCur(parseFloat(document.getElementById('mei1').value) || 0);
    document.getElementById('docMei2').innerText = formatCur(parseFloat(document.getElementById('mei2').value) || 0);
    document.getElementById('docMei3').innerText = formatCur(parseFloat(document.getElementById('mei3').innerText) || 0);

    document.getElementById('docMei4').innerText = formatCur(parseFloat(document.getElementById('mei4').value) || 0);
    document.getElementById('docMei5').innerText = formatCur(parseFloat(document.getElementById('mei5').value) || 0);
    document.getElementById('docMei6').innerText = formatCur(parseFloat(document.getElementById('mei6').innerText) || 0);

    document.getElementById('docMei7').innerText = formatCur(parseFloat(document.getElementById('mei7').value) || 0);
    document.getElementById('docMei8').innerText = formatCur(parseFloat(document.getElementById('mei8').value) || 0);
    document.getElementById('docMei9').innerText = formatCur(parseFloat(document.getElementById('mei9').innerText) || 0);

    document.getElementById('docMei10').innerText = formatCur(parseFloat(document.getElementById('mei10').innerText) || 0);

    let dataHoje = new Date().toLocaleDateString('pt-BR');
    let cidade = configGlobais.cidade || "Sua Cidade";
    document.getElementById('docMeiLocalData').innerText = `${cidade}, ${dataHoje}`;

    document.getElementById('conteinerPrincipal').style.display = 'none';
    document.getElementById('telaDocumentoMEI').style.display = 'block';
    window.scrollTo(0, 0);
}
