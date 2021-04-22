let listFolders = new Array();
let listMessages = new Array(); //Array of array of object with folder name
let fromGit = new Array();

start();

async function start() {    
    let getStorage = await browser.storage.local.get('folders');
    let foldersName = new Array();
    listFolders = getStorage.folders;
    if (listFolders !== undefined) {
        for (var folder of listFolders) {
            let messages = await listMessagesFromFolder(folder);
            listMessages = listMessages.concat(messages);
            foldersName.push({
                folderName: folder.name
            });
        }
        for (var msg of listMessages) {
            let res = await getHeaderFromIdMessage(msg.id);
            let header = res[0];
            if (header.hasOwnProperty("x-github-recipient-address")) {
                let date = new Date(msg.date);
                let tmpDate = date.getDate() + '/' + date.getMonth()+1 + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
                fromGit.push({
                    id: msg.id,
                    subject: msg.subject,
                    author: msg.author,
                    date: tmpDate
                });
            }
        }
        fillTemplate("template-listFolders", foldersName, "folders ul");
        fillTemplate("template-listMessages", fromGit, "messages-list tbody");
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