const Mails = {}; // Main object
let Threads = [];
let listFolders = [];

start();

async function start() {
    let getThreadFolder = await browser.storage.local.get('threads');
    if (getThreadFolder.threads !== undefined) Threads = getThreadFolder.threads;
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
                }
            }
        }
        console.log("Mails : ", Mails);
        fillTemplate("template-listFolders", getStorage.folders, "folders ul");
        fillMailsTemplate();
        $('.message-subject').click(async function (e) {
            let threadId = $(this).data().threadid;
            if (threadId == -1) {
                let id = $(this).data().id;
                let fullMessage = await browser.messages.getFull(id);
                let str;
                if (fullMessage.parts[0].body != null) {
                    str = fullMessage.parts[0].body;
                } else {
                    str = fullMessage.parts[0].parts[1].body;
                }
                $('#msg').html(str);
            } else {
                let messages = await getMessagesFromThread(threadId);
                fillTemplate("template-thread", messages, "msg");
            }
        });
        $('.th-date').click(function (e) {
            Threads.sort((a,b) => {            
                if (a.realDate < b.realDate) {
                    return 1;
                } else {
                    return 0;
                }                        
            });
            
            $(".table tbody tr").remove();
            fillMailsTemplate();
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
    let firstMsg = [];
    let template = $(`#template-listMessages`).html();
    Mustache.parse(template);
    for (let folder in Mails) {
        for (let thread in Mails[folder]) {
            Mails[folder][thread].mails.forEach(mail => {
                let threadId;
                threadId = Mails[folder][thread].data.threadId;
                if (!firstMsg.includes(threadId)) {
                    let realDate = formateDate(Mails[folder][thread].data.date);
                    let rendered = Mustache.render(template, {...mail, folder: folder, threadid: threadId, realdate: realDate});
                    $(`#messages-list tbody`).append(rendered);
                    firstMsg.push(threadId);
                }
            });
        };
    }
}

async function getMessagesFromThread(threadId) {
    let tmp = null;
    let res = [];
    for (let folder in Mails) {
        for (let thread in Mails[folder]) {
            if (Mails[folder][thread].data && Mails[folder][thread].data.threadId == threadId) {
                tmp = Mails[folder][thread].mails;
            }
        }
    }
    if (tmp != null) {
        for (let msg of tmp) {
            let fullMessage = await browser.messages.getFull(msg.id);
            if (fullMessage.parts[0].body != null) {
                res = res.concat(fullMessage.parts[0].body);
            } else {
                res = res.concat(fullMessage.parts[0].parts[1].body);
            }
        }
    }
    return res;
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
}

async function getHeaderFromIdMessage(id) {
    let tab = [];
    let messages = await browser.messages.getFull(id);        
    let headers = messages.headers;
    tab.push(headers);
    return tab;
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

function formateDate(_date) {
    let date = new Date(_date);
    return date.getDate() + '/' + (date.getMonth()+1) + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
}

function addToThreads(message) {    
    let tabEvent = getIdEvent(message);
    if (tabEvent) {
        let eventId = tabEvent[0];
        let repo = tabEvent[1];
        let event = tabEvent[2];
        if (Threads.length > 0) {
            for (let t of Threads) {
                // Thread already exist
                if (t.repo == repo && t.event == event && t.eventId == eventId) {
                    return parseInt(t.threadId);
                }
            }
            // Thread does not exist
            Threads.push({
                repo: repo,
                event: event,
                eventId: eventId,
                folderName: message.folder.name,
                realDate: message.date,
                threadId: Threads.length
            });
        } else {
            // No threads yet
            Threads[0] = {
                repo: repo,
                event: event,
                eventId: eventId,
                folderName: message.folder.name,
                realDate: message.date,
                threadId: 0
            };
        }
        return Threads.length-1;
    }
    return null;
}

function addToMails(threadId, data, message, folder) {
    if (Mails[folder] == undefined) Mails[folder] = {};
    for (let thread in Mails[folder]) {
        if (thread == threadId) {     
            if (message.date > Mails[folder][thread].data.date) {
                Mails[folder][thread].data.date = message.date;
            }    
            Mails[folder][thread].mails.push({
                id: message.id,
                subject: message.subject,
                author: message.author,
                date: formateDate(message.date),
                realDate: message.date,
                folder: folder,
                threadId: threadId,  
            });
            return;
        }
    }
    Mails[folder][threadId] = {
        data: {
            ...data,
            date: message.date
        },
        mails: [{
            id: message.id,
            subject: message.subject,
            author: message.author,
            date: formateDate(message.date),
            realDate: message.date,
            folder: folder,
            threadId: threadId,  
        }]
    };   
}