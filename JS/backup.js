function atualizarPainelProximoBackup() {
    const hoje = new Date(); hoje.setHours(0,0,0,0); const dataHojeStr = hoje.toLocaleDateString('pt-BR');
    const ultimoBackupStr = configGlobais.ultimoBackupData; let diaAtual = hoje.getDay(); 
    if ((diaAtual === 1 || diaAtual === 4) && ultimoBackupStr !== dataHojeStr) { document.getElementById('dataProximoBackup').innerHTML = "<strong style='color: #28a745;'>Hoje (Automático)</strong>"; return; }
    let proximo = new Date(hoje); proximo.setDate(proximo.getDate() + 1);
    while (proximo.getDay() !== 1 && proximo.getDay() !== 4) { proximo.setDate(proximo.getDate() + 1); }
    const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    document.getElementById('dataProximoBackup').innerHTML = `<strong>${diasSemana[proximo.getDay()]}, ${proximo.toLocaleDateString('pt-BR')}</strong>`;
}

function gatilhoInteligenteBackup() {
    const ultimoBackupStr = configGlobais.ultimoBackupData; const hoje = new Date(); hoje.setHours(0,0,0,0);
    let precisaFazer = false;
    if (!ultimoBackupStr) precisaFazer = true; 
    else {
        const partes = ultimoBackupStr.split('/'); const dataUltimo = new Date(partes[2], partes[1] - 1, partes[0]); dataUltimo.setHours(0,0,0,0);
        let tempDate = new Date(dataUltimo); tempDate.setDate(tempDate.getDate() + 1); 
        while (tempDate <= hoje) { if (tempDate.getDay() === 1 || tempDate.getDay() === 4) { precisaFazer = true; break; } tempDate.setDate(tempDate.getDate() + 1); }
    }
    if (precisaFazer) {
        const clientId = configGlobais.gapiClientId;
        if(clientId) {
            document.getElementById('alertaBackupInteligente').style.display = 'block'; document.getElementById('alertaBackupInteligente').innerHTML = "<strong>⚙️ Backup Automático:</strong> Iniciando envio..."; iniciarBackupDrive(true);
        } else {
            document.getElementById('alertaBackupInteligente').style.display = 'block'; document.getElementById('alertaBackupInteligente').innerHTML = "<strong>⚙️ Backup Automático:</strong> Baixando localmente (Drive não configurado)."; setTimeout(() => { baixarBackupLocalManual(true); }, 3000); 
        }
    }
}

async function baixarBackupLocalManual(silencioso = false) {
    const snap = await db.collection("servicos").get(); let dados = []; snap.forEach(doc => dados.push(doc.data()));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dados, null, 2));
    const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_kleber_os_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
    await registarDataBackupNuvem();
    if(!silencioso) document.getElementById('statusBackup').innerText = "✅ Backup Local Concluído!";
    else setTimeout(() => { document.getElementById('alertaBackupInteligente').style.display = 'none'; }, 6000);
}

let tokenClient;
async function iniciarBackupDrive(silencioso = false) {
    const clientId = configGlobais.gapiClientId;
    if(!clientId) { if(!silencioso) alert("Insira o Google Client ID nas Configurações."); return; }
    if(!silencioso) document.getElementById('statusBackup').innerText = "⏳ Autenticando no Drive...";
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId, scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => { if (tokenResponse && tokenResponse.access_token) executarFluxoDrive(tokenResponse.access_token, silencioso); }
    }); tokenClient.requestAccessToken();
}

async function executarFluxoDrive(token, silencioso = false) {
    const status = document.getElementById('statusBackup');
    try {
        if(!silencioso) status.innerText = "🔍 Buscando pasta...";
        let res = await fetch('https://www.googleapis.com/drive/v3/files?q=name="backup Sistema OS" and mimeType="application/vnd.google-apps.folder" and trashed=false', { headers: { Authorization: `Bearer ${token}` } });
        let folderResult = await res.json(); let folderId = folderResult.files && folderResult.files.length > 0 ? folderResult.files[0].id : null;
        if(!folderId) {
            let cf = await fetch('https://www.googleapis.com/drive/v3/files', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'backup Sistema OS', mimeType: 'application/vnd.google-apps.folder' }) });
            let folderCreated = await cf.json(); folderId = folderCreated.id;
        }
        const snap = await db.collection("servicos").get(); let lista = []; snap.forEach(d => lista.push(d.data()));
        const blob = new Blob([JSON.stringify(lista, null, 2)], {type: 'application/json'});
        const meta = { name: `Backup_OS_${new Date().toISOString().split('T')[0]}.json`, parents: [folderId] };
        const form = new FormData(); form.append('metadata', new Blob([JSON.stringify(meta)], {type: 'application/json'})); form.append('file', blob);
        let uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
        
        if(uploadRes.ok) {
            const hoje = new Date().toLocaleDateString('pt-BR'); configGlobais.ultimoBackupData = hoje;
            await db.collection('configuracoes').doc('gerais').update({ ultimoBackupData: hoje });
            atualizarPainelProximoBackup();
            if(silencioso) { document.getElementById('alertaBackupInteligente').innerHTML = "<strong>✅ Backup Automático:</strong> Sincronizado!"; setTimeout(() => { document.getElementById('alertaBackupInteligente').style.display = 'none'; }, 5000); } 
            else { status.innerText = "✅ Sucesso! Backup salvo."; }
        } else throw new Error("Falha");
    } catch(e) {
        if(silencioso) document.getElementById('alertaBackupInteligente').innerHTML = "<strong>❌ Erro no Backup Automático.</strong> Faça manual.";
        else status.innerHTML = "<span style='color:red;'>❌ Erro. Marque a permissão do Drive no Google.</span>";
    }
}
