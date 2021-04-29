let listFolders = new Array();
let listMessages = new Object(); //Array of array of object with folder name
let fromGit = new Array();
let isEvent = new Object();
let eventInfo = new Object();

start();

async function start() {    
    let getStorage = await browser.storage.local.get('folders');
    let foldersName = new Array();
    listFolders = getStorage.folders;
    if (listFolders !== undefined) {
        for (let folder of listFolders) {
            let messages = await listMessagesFromFolder(folder);
            listMessages[folder.name] = messages;
            foldersName.push({
                folderName: folder.name
            });
        }
        console.log("ListMessages : ",listMessages);
        for (let arr in listMessages) {
            for (let msg of listMessages[arr]) {  
                let res = await getHeaderFromIdMessage(msg.id);
                let header = res[0];
                if (header.hasOwnProperty("x-github-recipient-address")) {                
                    let tabIssue = getIdEvent(msg);
                    if (tabIssue != -1) {
                        fromGit.push(msg);
                        let idEvent = tabIssue[0];
                        let repo = tabIssue[1];
                        let event = tabIssue[2];
                        if (isEvent[repo] == null) {
                            let data = new Array();
                            data.push({
                                repo: repo,
                                event: event,
                                idEvent: idEvent,
                                message: msg
                            });
                            isEvent[repo] = data                    
                        } else {
                            isEvent[repo].push({
                                repo: repo,
                                event: event,
                                idEvent: idEvent,
                                message: msg
                            });
                        }                                    
                    } else {
                        fromGit.push(msg);
                    }
                }
            }
            
        }
        fillTemplate("template-listFolders", foldersName, "folders ul");
        fillTemplate("template-listMessages", fromGit, "preview ul");
        $('#preview ul li').click(async function (e) {
            let id = $(this).data().id;
            let fullMessage = await browser.messages.getFull(id);
            console.log(fullMessage);
            let str;
            if (fullMessage.parts[0].body != null) {
                str = fullMessage.parts[0].body;
            } else {
                str = fullMessage.parts[0].parts[0].body + fullMessage.parts[0].parts[1].body;
                
            }
            $('#messages p').html(str);
        });
        $('#btnThread').click(function (e) {
            for (var msg of fromGit) {
                let data = new Array();
                Object.keys(isEvent).forEach(function(key) {
                    isEvent[key].forEach((elem) => {                        
                        if (elem.message.id == msg.id) {
                            let obj = {
                                repo: elem.repo,
                                event: elem.event,
                                idEvent: elem.idEvent
                            };
                            $(`#preview ul li[data-id=${msg.id}]`)[0].innerHTML += " / Thread";
                            $(`#preview ul li[data-id=${msg.id}]`).off('click').on('click', function (e) {
                                Object.keys(isEvent).forEach(function (k) {
                                    isEvent[key].forEach((e) => {
                                        if (e.repo == obj.repo && e.event == obj.event && e.idEvent == obj.idEvent) {                                            
                                            data.push(msg);                                            
                                        }
                                    });
                                });
                                fillTemplate("template-listMessages", data, "preview ul li");
                            });
                        }
                    })                    
                });
            }
        });
    } else {
        $('#folders').hide();
        $('#preview').hide();
        $('#messages').hide();
        $('#error').show();
    }
}

function fillTemplate(idTemplate, data, idElem) {
    let template = $(`#${idTemplate}`).html();
    Mustache.parse(template);
    let rendered = Mustache.render(template, data);
    $(`#${idElem}`).html(rendered);
}

async function listMessagesFromFolder(folder) {
    let messages = new Array();
    let page = await browser.messages.list(folder);
    messages = page.messages;
    while (page.id) {
        page = await browser.messages.continueList(page.id);
        messages = messages.concat(page.messages);
    }
    return new Promise((resolve, reject) => {
        resolve(messages);
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
        return -1;
    }
}