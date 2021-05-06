const Mails = {}; // Main object
const Threads = {};
Threads.nbThreads = 0;

let listFolders = [];

start();

async function start() {
    let getStorage = await browser.storage.local.get('folders');
    if (getStorage.folders !== undefined) {
        for (let folder of getStorage.folders) {
            let messages = await getGitMessagesFromFolder(folder);
            for (let message of messages) {
                if (isThreaded(message)) {
                    let threadId = addToThreads(message);
                    let data = {
                        threadId: threadId,
                        eventId: Threads[threadId].eventId,
                        event: Threads[threadId].event,
                        repo: Threads[threadId].repo,
                    };
                    addToMails(threadId, data, message, folder.name);                    
                } else addToMails(-1, null, message, folder.name);
            }
        }
        fillTemplate("template-listFolders", getStorage.folders, "folders ul");
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
    let messages = [];
    let res = [];
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
    return res;
    /*
    return new Promise((resolve, reject) => {
        resolve(res);
    });   
    */        
}

async function getHeaderFromIdMessage(id) {
    let tab = [];
    let messages = await browser.messages.getFull(id);        
    let headers = messages.headers;
    tab.push(headers);
    return tab;
    /*
    return new Promise((resolve, reject) => {
        resolve(tab);
    });
    */
}

function getIdEvent(message) {    
    let header = message.headerMessageId;
    let index = header.indexOf("@github.com");
    header = header.split('/');
    if (index > -1 && header[2] == 'issues') {
        return [header[3], header[1], header[2]]; // number & repo & event
    } 
    if (index > -1 && header[2] == 'pull') {
        let id = header[3];
        if (id.length > 1) {
            id = id.slice(0,1);
        }
        return [id, header[1], header[2]]; 
    }
    return null;
}

function isThreaded(message) {    
    let tabEvent = getIdEvent(message);
    return tabEvent != null ? true : false;
}

function computeDate(_date) {
    let date = new Date(_date);
    return date.getDate() + '/' + date.getMonth()+1 + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
}

function addToThreads(message) {    
    let tabEvent = getIdEvent(message);
    if (tabEvent) {
        let eventId = tabEvent[0];
        let repo = tabEvent[1];
        let event = tabEvent[2];
        if (Threads.nbThreads > 0) {
            for (let t in Threads) {
                // Thread already exist
                if (Threads[t].repo == repo && Threads[t].event == event && Threads[t].eventId == eventId) {
                    return parseInt(t);
                    /*
                    return {
                        threadId: parseInt(t),
                        event: Threads[t].event,
                        eventId: Threads[t].eventId,
                        repo: Threads[t].repo,
                    };
                    */
                }
            }
            // Thread does not exist
            Threads[Threads.nbThreads] = {
                repo: repo,
                event: event,
                eventId: eventId,
                folderName: message.folder.name
            }
        } else {
            // No threads yet
            Threads[0] = {
                repo: repo,
                event: event,
                eventId: eventId,
                folderName: message.folder.name
            }
        }
        Threads.nbThreads++;
        return Threads.nbThreads - 1
        /*
        return {
            threadId: Threads.nbThreads - 1,
            event: event,
            eventId: eventId,
            repo: repo,
        };
        */
    }
    return null;
}

function addToMails(threadId, data, message, folder) {
    if (threadId === -1) { // Not a thread
        if (Mails[folder] == undefined) Mails[folder] = [];
        Mails[folder].push({
            data: data,
            mails: [{
                id: message.id,
                subject: message.subject,
                author: message.author,
                date: computeDate(message.date),
            }],
        });
    } else { // Belongs to a thread
        if (Mails[folder] == undefined) Mails[folder] = [];
        for (let thread of Mails[folder]) {
            if (thread.data.threadId == threadId) {         
                thread.mails.push({
                    id: message.id,
                    subject: message.subject,
                    author: message.author,
                    date: computeDate(message.date),
                });
                return;
            }
        }
        Mails[folder].push({
            data: data,
            mails: [{
                id: message.id,
                subject: message.subject,
                author: message.author,
                date: computeDate(message.date),
            }]
        });
    }    
}