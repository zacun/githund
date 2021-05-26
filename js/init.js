const Mails = {}; // Main object
const Threads = [];
let token;

async function start() {
    let getToken = await browser.storage.local.get('token');
    if (getToken.token !== undefined) {
        token = getToken.token;
    } else {
        token = prompt("Please enter your generated Github token");
        while (token == null || token == '') {
            token = prompt("Please enter your valid generated Github token");
        }
        browser.storage.local.set({token: token});
    }
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
    } else {
        $("#main").hide();
        $("#error").show();
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
        let headers = await getHeaderFromMessageId(msg.id);
        let header = headers[0];
        if (header.hasOwnProperty("x-github-recipient-address")) {
            res.push(msg);
        }
    }
    return res;       
}

async function getHeaderFromMessageId(id) {
    let tab = [];
    let messages = await browser.messages.getFull(id);
    let headers = messages.headers;
    tab.push(headers);
    return tab;
}

function getEventId(message) {    
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
        return [id, header[1], header[2], header[0]]; 
    }
    return null;
}

function isThreaded(message) {    
    let tabEvent = getEventId(message);
    return tabEvent != null ? true : false;
}

function formateDate(_date) {
    let date = new Date(_date);
    return date.getDate() + '/' + (date.getMonth()+1) + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
}

function addToThreads(message) {    
    let tabEvent = getEventId(message);
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

start();