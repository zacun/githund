let folders = new Array();
//let clearStorage = browser.storage.local.clear();
//clearStorage.then(onCleared, onError);
async function createTab() {
    browser.tabs.create({url: "../html/page.html"}).then(res => {
        console.log("Création du nouvel onglet.");
    });
}

browser.browserAction.onClicked.addListener(createTab);
browser.menus.create({
    contexts: ["folder_pane"],
    title: "Add folder to Githund",
    async onclick(info) {
        let folder = info.selectedFolder;
        let foldersStorage = await browser.storage.local.get('folders');
        let length = Object.keys(foldersStorage).length;  // Taille du storage    
        if (length == 0) {
            folders.push(folder);
            browser.storage.local.set({
                folders: folders
            });
        } else {
            let inclu = false;
            for (let f of foldersStorage.folders) {
                if (JSON.stringify(f) == JSON.stringify(folder)) {
                    inclu = true;
                    break;
                }
            }
            if (!inclu) {
                folders.push(folder);
                browser.storage.local.set({
                    folders: folders
                });
            }
        }
    } 
});
/*
function onCleared() {
    console.log("OK");
}

function onError(e) {
    console.log(e);
}*/