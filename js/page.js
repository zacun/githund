const Mails = {}; // Main object
let Threads = [];

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
                } else addToMails(-1, null, message, folder.name);
            }
        }
        fillTemplate("template-listFolders", getStorage.folders, "folders ul");
        fillMailsTemplate();
        $(document).on('click','.message-subject', async function(){
            let threadId = $(this).data().threadid;
            let folder = $(this).data().folder;
            let messages = await getMessagesFromThread(threadId, folder);
            fillTemplate("template-thread", messages, "thread");
            let owner = Threads[threadId].owner;
            let repo = Threads[threadId].repo;
            let event = Threads[threadId].event;
            let eventId = Threads[threadId].eventId;
            $('#message-info #unsubscribe').click(async (e) => {
                let id = Mails[folder][threadId].mails[0].id;
                let link = await getLinkFromMessage(id);
                let mail = `${link}?subject=Unsubscribe ${event} ${eventId} from repository ${repo}`;
                window.location = mail;
            });
            $('#message-info #close').click((e) => {                
                closeEvent(owner, repo, event, eventId);
            });
            $('#message-info #open').click((e) => {
                openEvent(owner, repo, event, eventId);
            });
        });
        $('.th-date').click(function (e) {
            if ($(this).data().sort == "0") {
                Threads.sort((a,b) => {
                    if (a.realDate < b.realDate) return 1;
                    else if (a.realDate > b.realDate) return -1;
                    else return 0;
                });
                $(".table tbody tr").remove();
                fillMailsTemplate();
                $(this).data("sort", "1");
            } else {
                Threads.sort((a,b) => {
                    if (a.realDate < b.realDate) return -1;
                    else if (a.realDate > b.realDate) return 1;
                    else return 0;
                });
                $(".table tbody tr").remove();
                fillMailsTemplate();
                $(this).data("sort", "0");
            }
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
    for (let thread of Threads) {        
        Mails[thread.folderName][thread.threadId].mails.forEach(mail => {
            if (!firstMsg.includes(thread.threadId)) {
                let formatedDate = formateDate(Mails[thread.folderName][thread.threadId].data.date);
                let rendered = Mustache.render(template, {...mail, folder: thread.folderName, threadid: thread.threadId, realdate: formatedDate});
                $(`#messages-list tbody`).append(rendered);
                firstMsg.push(thread.threadId);
            }
        });
    }
}

async function getLinkFromMessage(id) {
    let headers = await getHeaderFromIdMessage(id);
    let fullLink = headers[0]["list-unsubscribe"][0];
    fullLink = fullLink.split(",")[0];
    let link = fullLink.slice(1, fullLink.length-1);
    return link;
}

async function getMessagesFromThread(threadId, folder) {
    let tmp = null;
    let res = [];
    for (let thread in Mails[folder]) {
        if (Mails[folder][thread].data && Mails[folder][thread].data.threadId == threadId) {
            tmp = Mails[folder][thread].mails;
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
        return [header[3], header[1], header[2], header[0]]; // number & repo & event
    } 
    if (index > -1 && header[2] == 'pull') {
        let id = header[3];
        if (id.length > 1) {
            id = id.slice(0,1);
        }
        return [id, header[1], header[2]+"s", header[0]]; 
    }
    return null;
}

function closeEvent(owner, repo, event, eventId) {
    fetch(`https://api.github.com/repos/${owner}/${repo}/${event}/${eventId}`, {
        method: "PATCH",
        headers: { Authorization: "token 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" },
        body: JSON.stringify({ state: "closed" }),
    })
    .then((response) => {
        console.log(response);
    })
    .catch((error) => {
        console.log("Erreur : ", error);
    });
}

function openEvent(owner, repo, event, eventId) {
    fetch(`https://api.github.com/repos/${owner}/${repo}/${event}/${eventId}`, {
        method: "PATCH",
        headers: { Authorization: "token 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" },
        body: JSON.stringify({ state: "open" }),
    })
    .then((response) => {
        console.log(response);
    })
    .catch((error) => {
        console.log("Erreur : ", error);
    });
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
        let owner = tabEvent[3];
        if (Threads.length > 0) {
            for (let t of Threads) {
                // Thread already exist
                if (t.repo == repo && t.event == event && t.eventId == eventId) {
                    if (message.date > t.realDate) {
                        t.realDate = message.date;
                    }
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
                threadId: Threads.length,
                owner: owner
            });
        } else {
            // No threads yet
            Threads[0] = {
                repo: repo,
                event: event,
                eventId: eventId,
                folderName: message.folder.name,
                realDate: message.date,
                threadId: 0,
                owner: owner
            };
        }
        return Threads.length-1;
    }
    return null;
}

function addToMails(threadId, data, message, folder) {
    if (threadId > -1) {
        if (Mails[folder] == undefined) Mails[folder] = {};
        for (let thread in Mails[folder]) {
            if (thread == threadId) {     
                if (message.date > Mails[folder][thread].data.date) {
                    Mails[folder][thread].data.date = message.date;
                }    
                Mails[folder][thread].mails.unshift({
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
}