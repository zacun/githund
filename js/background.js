let folders = [];
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
        let getFoldersStorage = await browser.storage.local.get('folders');
        let foldersStorage = getFoldersStorage.folders;
        if ((foldersStorage === undefined) || (foldersStorage.length == 0)) {
            folders.push(folder);
            browser.storage.local.set({
                folders: folders
            });
        } else {
            let inclu = false;
            for (let f of foldersStorage) {
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
