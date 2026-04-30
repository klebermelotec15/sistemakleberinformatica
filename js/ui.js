// BUSCA DE CEP (VIACEP)
async function buscarCEP() {
    let cep = document.getElementById('cep').value.replace(/\D/g, '');
    if (cep.length === 8) {
        try {
            let res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            let data = await res.json();
            if (!data.erro) {
                document.getElementById('endCliente').value = data.logradouro;
                document.getElementById('bairro').value = data.bairro;
            }
        } catch(e) { console.log("Erro na busca de CEP"); }
    }
}

// CARREGAR CLIENTES (CADASTRO AUTOMÁTICO)
async function carregarClientesDaNuvem() {
    try {
        const snap = await db.collection("clientes").get();
        listaClientesGlobais = [];
        snap.forEach(doc => {
            listaClientesGlobais.push({ id: doc.id, ...doc.data() });
        });
    } catch(e) { console.error("Erro ao carregar clientes", e); }
}

function abrirBuscaCliente() {
    document.getElementById('modalBuscaCliente').style.display = 'flex';
    document.getElementById('inputBuscaCliente').value = '';
    filtrarClientesModal();
    document.getElementById('inputBuscaCliente').focus();
}

function fecharBuscaCliente() {
    document.getElementById('modalBuscaCliente').style.display = 'none';
}

function filtrarClientesModal() {
    const t = document.getElementById('inputBuscaCliente').value.toUpperCase();
    let html = "";
    let cont = 0;
    listaClientesGlobais.forEach(c => {
        if(c.nome && c.nome.toUpperCase().includes(t)) {
            html += `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer; background:#fff; transition:0.2s;" onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='#fff'" onclick="selecionarCliente('${c.id}')">
                        <strong style="color:var(--primary); font-size:14px;">${c.nome}</strong> <br>
                        <span style="font-size:11px; color:#666;">WhatsApp: ${c.zap || 'N/A'} | CPF: ${c.cpf || 'N/A'}</span>
                     </div>`;
            cont++;
        }
    });
    if(cont === 0) html = "<div style='padding:15px; color:#666; text-align:center;'>Nenhum cliente encontrado.</div>";
    document.getElementById('listaClientesModal').innerHTML = html;
}

function selecionarCliente(id) {
    const c = listaClientesGlobais.find(x => x.id === id);
    if(c) {
        document.getElementById('cliente').value = c.nome || "";
        document.getElementById('whatsapp').value = c.zap || "";
        document.getElementById('cpf').value = c.cpf || "";
        document.getElementById('rg').value = c.rg || "";
        document.getElementById('cep').value = c.cep || "";
        document.getElementById('endCliente').value = c.end || "";
        document.getElementById('bairro').value = c.bairro || "";
    }
    fecharBuscaCliente();
}

function mudarAba(idAba) {
    ultimaAbaAberta = idAba;
    document.querySelectorAll('.aba').forEach(el => el.classList.remove('ativa'));
    document.querySelectorAll('.navbar button').forEach(el => el.classList.remove('ativo'));
    document.getElementById(idAba).classList.add('ativa');
    document.getElementById('btn-' + idAba).classList.add('ativo');
    
    document.getElementById('telaDocumento').style.display = 'none';
    document.getElementById('telaDocumentoMEI').style.display = 'none';
    document.getElementById('conteinerPrincipal').style.display = 'block';
    
    if(idAba === 'abaConfig') {
        atualizarPainelProximoBackup();
    }
}

function cancelarEdicao() {
    limparFormularioOS();
    mudarAba('abaHistorico');
}

function fecharImpressao() {
    document.getElementById('telaDocumento').style.display = 'none';
    document.getElementById('telaDocumentoMEI').style.display = 'none';
    document.getElementById('conteinerPrincipal').style.display = 'block';
    mudarAba(ultimaAbaAberta);
}

function aplicarConfiguracoesNaTela() {
    if(document.getElementById('lojaEnd')) document.getElementById('lojaEnd').value = configGlobais.end || "";
    if(document.getElementById('lojaTel')) document.getElementById('lojaTel').value = configGlobais.tel || "";
    if(document.getElementById('configSenha')) document.getElementById('configSenha').value = configGlobais.senhaAdmin || "123456";
    if(document.getElementById('configClientId')) document.getElementById('configClientId').value = configGlobais.gapiClientId || "";
    if(document.getElementById('configLembretes')) document.getElementById('configLembretes').value = configGlobais.lembretes || "";
    if(document.getElementById('configCnpj')) document.getElementById('configCnpj').value = configGlobais.cnpj || "";
    if(document.getElementById('configRazao')) document.getElementById('configRazao').value = configGlobais.razao || "";
    if(document.getElementById('configCidade')) document.getElementById('configCidade').value = configGlobais.cidade || "";
    
    if (configGlobais.logo && document.getElementById('navLogo')) {
        document.getElementById('navLogo').src = configGlobais.logo;
        document.getElementById('navLogo').style.display = 'block';
    }
}
