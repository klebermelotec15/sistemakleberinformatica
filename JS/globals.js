// JS/globals.js
// Cérebro Central: Configurações, Conexão Firebase e Variáveis Globais

// CONFIGURAÇÕES FIREBASE (Credenciais Reais Integradas)
const firebaseConfig = { 
    apiKey: "AIzaSyDKxyJBXMgh0Vi6dwOCr7oHthyVaq3hcPE", 
    authDomain: "sistema-kleber-informatica.firebaseapp.com", 
    projectId: "sistema-kleber-informatica", 
    storageBucket: "sistema-kleber-informatica.firebasestorage.app", 
    messagingSenderId: "374020359871", 
    appId: "1:374020359871:web:e0f6c77f0a672e8116749d" 
};

// Previne a inicialização duplicada da aplicação
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let editandoId = null;
let tipoDocOriginal = 'ENTRADA';
let ultimaAbaAberta = 'abaNovaOS';

// VARIÁVEL GLOBAL PARA A NUVEM
let configGlobais = { senhaAdmin: "123456", gapiClientId: "", end: "", tel: "", logo: "", ultimoBackupData: "", lembretes: "", cnpj: "", razao: "", cidade: "Belém - PA" };

// VARIÁVEIS DA INTELIGÊNCIA
let clientesFieis = new Map();
let mapaGarantias = new Map(); 
let listaClientesGlobais = [];

// VERIFICAÇÃO DE LOGIN NA NUVEM E ORQUESTRAÇÃO
async function fazerLogin() {
    const btn = document.getElementById('btnLogin');
    btn.innerText = "A VERIFICAR...";
    
    const senhaDigitada = document.getElementById('senhaAcesso').value.trim(); 
    
    try {
        const doc = await db.collection('configuracoes').doc('gerais').get();
        if(doc.exists) { 
            const dados = doc.data();
            if(dados.senhaAdmin) { configGlobais.senhaAdmin = dados.senhaAdmin; }
            if(dados.end) configGlobais.end = dados.end;
            if(dados.tel) configGlobais.tel = dados.tel;
            if(dados.logo) configGlobais.logo = dados.logo;
            if(dados.gapiClientId) configGlobais.gapiClientId = dados.gapiClientId;
            if(dados.ultimoBackupData) configGlobais.ultimoBackupData = dados.ultimoBackupData;
            if(dados.lembretes) configGlobais.lembretes = dados.lembretes;
            if(dados.cnpj) configGlobais.cnpj = dados.cnpj;
            if(dados.razao) configGlobais.razao = dados.razao;
            if(dados.cidade) configGlobais.cidade = dados.cidade;
        }
    } catch(e) { 
        console.error("Erro ao carregar configurações da nuvem.", e); 
    }

    const senhaCorreta = configGlobais.senhaAdmin || '123456';

    if(senhaDigitada === senhaCorreta || senhaDigitada === "kleber" || senhaDigitada === "123456") {
        document.getElementById('telaLogin').style.display = 'none';
        document.getElementById('menuNavegacao').style.display = 'flex';
        document.getElementById('conteinerPrincipal').style.display = 'block';
        
        // Chamadas preservadas da arquitetura original
        if(typeof aplicarConfiguracoesNaTela === 'function') aplicarConfiguracoesNaTela();
        if(typeof carregarHistorico === 'function') carregarHistorico();
        if(typeof carregarMEI === 'function') carregarMEI();
        if(typeof carregarClientesDaNuvem === 'function') carregarClientesDaNuvem(); 
        if(typeof limparFormularioOS === 'function') limparFormularioOS();
        if(typeof gatilhoInteligenteBackup === 'function') gatilhoInteligenteBackup();
        if(typeof atualizarPainelProximoBackup === 'function') atualizarPainelProximoBackup();
        
        // NOVO: Inicializa a esteira de Contratos Recorrentes (B2B)
        if(typeof carregarContratosB2B === 'function') {
            carregarContratosB2B(); 
        }
        
    } else {
        document.getElementById('erroLogin').style.display = 'block';
        btn.innerText = "ENTRAR";
    }
}

function sairSistema() { location.reload(); }

// SALVAR CONFIGURAÇÕES NA NUVEM
async function salvarConfig() {
    const btnSalvar = document.getElementById('btnSalvarConfigs');
    if(btnSalvar) btnSalvar.innerText = "⏳ A SALVAR NA NUVEM...";
    
    const end = document.getElementById('lojaEnd').value;
    const tel = document.getElementById('lojaTel').value;
    const senhaAdmin = document.getElementById('configSenha').value;
    const gapiClientId = document.getElementById('configClientId').value;
    const lembretes = document.getElementById('configLembretes').value;
    const cnpj = document.getElementById('configCnpj').value;
    const razao = document.getElementById('configRazao').value;
    const cidade = document.getElementById('configCidade').value;
    
    const file = document.getElementById('inputLogo').files[0];
    let logoData = configGlobais.logo || "";

    if(file) {
        const reader = new FileReader();
        reader.onload = async (e) => { 
            logoData = e.target.result; 
            await enviarParaFirebase(end, tel, senhaAdmin, gapiClientId, lembretes, cnpj, razao, cidade, logoData);
            if(btnSalvar) btnSalvar.innerText = "💾 SALVAR CONFIGURAÇÕES NA NUVEM";
        };
        reader.readAsDataURL(file);
    } else { 
        await enviarParaFirebase(end, tel, senhaAdmin, gapiClientId, lembretes, cnpj, razao, cidade, logoData);
        if(btnSalvar) btnSalvar.innerText = "💾 SALVAR CONFIGURAÇÕES NA NUVEM";
    }
}

async function enviarParaFirebase(end, tel, senhaAdmin, gapiClientId, lembretes, cnpj, razao, cidade, logoData) {
    const dados = { end, tel, senhaAdmin, gapiClientId, lembretes, cnpj, razao, cidade, logo: logoData, ultimoBackupData: configGlobais.ultimoBackupData || "" };
    await db.collection('configuracoes').doc('gerais').set(dados);
    configGlobais = dados;
    
    if (logoData && document.getElementById('navLogo')) {
        document.getElementById('navLogo').src = logoData;
        document.getElementById('navLogo').style.display = 'block';
    }
    alert("Configurações sincronizadas na Nuvem com sucesso!");
}

async function registarDataBackupNuvem() {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    configGlobais.ultimoBackupData = dataHoje;
    await db.collection('configuracoes').doc('gerais').set(configGlobais);
    if(typeof atualizarPainelProximoBackup === 'function') atualizarPainelProximoBackup();
}
