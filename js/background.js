let folders = new Array();
let clearStorage = browser.storage.local.clear();
clearStorage.then(onCleared, onError);
async function createTab() {
    browser.tabs.create({url: "../html/page.html"}).then(res => {
        console.log("Création du nouvel onglet.");
    });
}

browser.browserAction.onClicked.addListener(createTab);
browser.menus.create({
    contexts: ["folder_pane"],
    title: "Add folder to Githund",
    onclick(info) {
        let folder = info.selectedFolder;
        folders.push(folder);
        browser.storage.local.set({
            folders: folders
        });
    } 
});

function onCleared() {
    console.log("OK");
}

function onError(e) {
    console.log(e);
}