let listFolders = new Array();
const Mails = new Object();
const Threads = { nbThreads: 0, };

start();

async function start() {
    let getStorage = await browser.storage.local.get('folders');
    let foldersName = new Array();
    listFolders = getStorage.folders;
    if (listFolders !== undefined) {
        for (let folder of listFolders) {
            let messages = await getGitMessagesFromFolder(folder);
            for (let message of messages) {
                let date = new Date(message.date);
                let tmpDate = date.getDate() + '/' + date.getMonth()+1 + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
                if(isThreaded(message)) {
                    let dataThread = addToThreads(message);                    
                    let data = {
                        idThread: dataThread.idThread,
                        event: dataThread.event,
                        idEvent: dataThread.idEvent,
                        repo: dataThread.repo,
                    };
                    addToMails(dataThread.idThread, data, message, tmpDate, null);                    
                } else {
                    let data = {
                        id: message.id,
                        subject: message.subject,
                        author: message.author,
                        date: tmpDate,
                    };
                    addToMails(-1, data, message, tmpDate, folder.name);
                }
            }
            foldersName.push({ folderName: folder.name });
        }
        fillTemplate("template-listFolders", foldersName, "folders ul");
        fillMailsTemplate();
        $('.message-subject').click(async function (e) {
            let id = $(this).data().id;
            let fullMessage = await browser.messages.getFull(id);
            let str;
            if (fullMessage.parts[0].body != null) {
                str = fullMessage.parts[0].body;
            } else {
                str = fullMessage.parts[0].parts[1].body;
            }
            $('#msg').html(str);
        });
    } else {
        $('#folders').hide();
        $('#messages-list').hide();
        $('#messages-content').hide();
        $('#error').show();
    }
}

function fillTemplate(idTemplate, data, idElem) {
    let template = $(`#${idTemplate}`).html();
    Mustache.parse(template);
    let rendered = Mustache.render(template, data);
    $(`#${idElem}`).html(rendered);
}

function fillMailsTemplate() {
    let template = $(`#template-listMessages`).html();
    Mustache.parse(template);
    for (let folder in Mails) {
        Mails[folder].forEach(thread => {
            thread.mails.forEach(mail => {
                let rendered = Mustache.render(template, {...mail, folder: folder});
                $(`#messages-list tbody`).append(rendered);
            });
        });
    }
}

async function getGitMessagesFromFolder(folder) {
    let messages = new Array();
    let res = new Array();
    let page = await browser.messages.list(folder);
    messages = page.messages;
    while (page.id) {
        page = await browser.messages.continueList(page.id);
        messages = messages.concat(page.messages);
    }
    for (let msg of messages) {
        let headers = await getHeaderFromIdMessage(msg.id);
        let header = headers[0];
        if (header.hasOwnProperty("x-github-recipient-address")) {
            res.push(msg);
        }
    }
    return new Promise((resolve, reject) => {
        resolve(res);
    });           
}

async function getHeaderFromIdMessage(id) {
    let tab = [];
    let messages = await browser.messages.getFull(id);        
    let headers = messages.headers;
    tab.push(headers);
    return promise = new Promise((resolve, reject) => {
        resolve(tab);
    });
}

function getIdEvent(message) {    
    let header = message.headerMessageId;
    let index = header.indexOf("@github.com");
    header = header.split('/');
    if (index > -1 && header[2] == 'issues') {
        return [header[3], header[1], header[2]];     //Numéro & repo & event
    } else if (index > -1 && header[2] == 'pull') {
        let id = header[3];
        if (id.length > 1) {
            id = id.slice(0,1);
        }
        return [id, header[1], header[2]]; 
    } else {
        return null;
    }
}

function isThreaded(message) {    
    let tabEvent = getIdEvent(message);
    return tabEvent != null ? true : false;
}

function addToThreads(message) {    
    let tabEvent = getIdEvent(message);
    if (tabEvent != null) {
        let idEvent = tabEvent[0];
        let repo = tabEvent[1];
        let event = tabEvent[2];
        if (Threads.nbThreads != 0) {
            for (let t in Threads) {
                if (Threads[t].repo == repo && Threads[t].event == event && Threads[t].idEvent == idEvent) {
                    return {
                        idThread: parseInt(t),
                        event: Threads[t].event,
                        idEvent: Threads[t].idEvent,
                        repo: Threads[t].repo,
                    };
                }
            }
            Threads[Threads.nbThreads] = {
                repo: repo,
                event: event,
                idEvent: idEvent,
                folderName: message.folder.name
            }
        } else {
            Threads[0] = {
                repo: repo,
                event: event,
                idEvent: idEvent,
                folderName: message.folder.name
            }
        }
        Threads.nbThreads++;
        return {
            idThread: Threads.nbThreads - 1,
            event: event,
            idEvent: idEvent,
            repo: repo,
        };     
    } else {
        return null;
    }
}

function addToMails(idThread, data, message, tmpDate, folder) {
    if (idThread == -1) { //Cas où c'est pas un thread
        if (Mails[folder] == undefined) {
            Mails[folder] = [];
        }
        Mails[folder].push({
            data: data,
            mails: [{
                id: message.id,
                subject: message.subject,
                author: message.author,
                date: tmpDate,
            }],
        });
    } else { //Thread
        if (Mails[Threads[idThread].folderName] == undefined) {
            Mails[Threads[idThread].folderName] = [];
        }
        for (let m of Mails[Threads[idThread].folderName]) {
            if (m.data.idThread == idThread) {
                let newMail = {
                    id: message.id,
                    subject: message.subject,
                    author: message.author,
                    date: tmpDate,
                }           
                m.mails.push(newMail);
                return;
            }
        }
        Mails[Threads[idThread].folderName].push({
            data: data,
            mails: [{
                id: message.id,
                subject: message.subject,
                author: message.author,
                date: tmpDate,
            }]
        });
    }    
}