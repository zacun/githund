/********************
 ********************
 *** Define Functions
 ********************
 ********************/

async function getMessagesFromThread(threadId, folder) {
    let tmp = Mails[folder][threadId].mails;
    let res = [];
    if (tmp != null) {
        for (let msg of tmp) {
            let fullMessage = await browser.messages.getFull(msg.id);
            let data = {
                id: msg.id,
                author: (msg.author).split(" ")[0],
                date: msg.date,
            };
            if (fullMessage.parts[0].body != null) data.content = fullMessage.parts[0].body;
            else data.content = fullMessage.parts[0].parts[1].body;
            res.push(data);
        }
    }
    return res;
}

async function getUnsubscribeLinkFromMessage(id) {
    let headers = await getHeaderFromMessageId(id);
    let fullLink = headers[0]["list-unsubscribe"][0];
    fullLink = fullLink.split(",")[0];
    let link = fullLink.slice(1, fullLink.length-1);
    return link;
}

// Return thread infos object from Thread
function getThreadInfos(threadId) {    
    for (let thread of Threads) {
        if (thread.threadId == threadId) return thread;
    }
    return null;
}

// Click event function for element on template (get removed or added to DOM)
function clickEventTemplate(elementSelector, callback) {
    $(document).on("click", `${elementSelector}`, callback);
}

async function getState(owner, repo, event, eventId) {
    let url;
    if (event == "pull") url = `https://api.github.com/repos/${owner}/${repo}/${event}s/${eventId}`;
    else url = `https://api.github.com/repos/${owner}/${repo}/${event}/${eventId}`;
    let response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `token ${token}`, 
            Accept: "application/vnd.github.v3+json"
        },
    });
    if (!response.ok) {
        throw new Error("Error:", response.status);
    }
    let data = await response.json();
    let merged = data.merged === undefined ? false : data.merged;
    return [data.state, merged];
}

function closeEvent(owner, repo, event, eventId) {
    let url;
    if (event == "pull") url = `https://api.github.com/repos/${owner}/${repo}/${event}s/${eventId}`;
    else url = `https://api.github.com/repos/${owner}/${repo}/${event}/${eventId}`;
    fetch(url, {
        method: "PATCH",
        headers: {Authorization: `token ${token}`},
        body: JSON.stringify({state: "closed"}),
    })
    .then((response) => {
        console.log(response);
    })
    .catch((error) => {
        console.log("Error:", error);
    });
}

function openEvent(owner, repo, event, eventId) {
    let url;
    if (event == "pull") url = `https://api.github.com/repos/${owner}/${repo}/${event}s/${eventId}`;
    else url = `https://api.github.com/repos/${owner}/${repo}/${event}/${eventId}`;
    fetch(url, {
        method: "PATCH",
        headers: {Authorization: `token ${token}`},
        body: JSON.stringify({state: "open"}),
    })
    .then((response) => {
        console.log(response);
    })
    .catch((error) => {
        console.log("Erreur : ", error);
    });
}

/********************
 ********************
 * Calls To Functions
 ********************
 ********************/

// Fills #threads-panel when a .thread-summary element is clicked
clickEventTemplate(".thread-summary", async (e) => {
    let threadId = e.currentTarget.attributes["data-threadid"].value;
    let folder = e.currentTarget.attributes["data-folder"].value;
    let messages = await getMessagesFromThread(threadId, folder);
    fillTemplate("template-thread-actions", {
        threadid: threadId,
        folder: folder,
        author: Mails[folder][threadId].mails[0].author,
        subject: Mails[folder][threadId].mails[0].subject,
        date: formateDate(Mails[folder][threadId].data.date)
    }, "thread-actions");
    fillTemplate("template-thread-messages", messages, "thread-messages-content");
});

// Unsubscribe from thread through sending mail
clickEventTemplate("#unsub-thread", async (e) => {
    let threadId = $("#thread-infos").data().threadid;
    let thread = getThreadInfos(threadId);
    let id = Mails[thread.folderName][threadId].mails[0].id;
    let link = await getUnsubscribeLinkFromMessage(id);
    let mail = `${link}?subject=Unsubscribe ${thread.event} ${thread.eventId} from repository ${thread.repo}`;
    window.location = mail;
});

// Close an issue
clickEventTemplate("#close-thread", (e) => {
    let threadId = $("#thread-infos").data().threadid;
    let thread = getThreadInfos(threadId);
    closeEvent(thread.owner, thread.repo, thread.event, thread.eventId);
});

// Open an issue
clickEventTemplate("#open-thread", (e) => {
    let threadId = $("#thread-infos").data().threadid;
    let thread = getThreadInfos(threadId);
    openEvent(thread.owner, thread.repo, thread.event, thread.eventId);
});

// Go to the issue on GitHub website
clickEventTemplate("#visit-thread", (e) => {
    let threadId = $("#thread-infos").data().threadid;
    let thread = getThreadInfos(threadId);
    browser.windows.openDefaultBrowser(`https://github.com/${thread.owner}/${thread.repo}/${thread.event}/${thread.eventId}`);
});

// Delete a thread & all mails belonging to it
clickEventTemplate("#delete-thread", async (e) => {
    let threadId = $("#thread-infos").data().threadid;
    let folder = $("#thread-infos").data().folder;
    let messagesId = [];
    for (let mail of Mails[folder][threadId].mails) {
        messagesId.push(mail.id);
    }
    // Delete mails from thunderbird (go to trash bin)
    await browser.messages.delete(messagesId);
    // Remove associated elements from DOM
    let threadsList = Array.from(document.querySelectorAll(".thread-summary"));
    threadsList.forEach((el) => {        
        if (el.attributes["data-threadid"].value == threadId) el.remove();        
    });
    document.getElementById("thread-messages-container").remove();
    document.getElementById("thread-infos").remove();
    document.getElementById("thread-buttons").remove();
    // Removes associated objects from Mails & Threads objects
    Mails[folder][threadId] = null;
    for (let thread of Threads) {
        if (thread.threadId == threadId) thread = null;
    }
});

// Delete a mail from a thread
clickEventTemplate(".delete-mail", async (e) => {
    let id = parseInt(e.currentTarget.attributes["data-id"].value, 10);
    let threadId = $("#thread-infos").data().threadid;
    let folder = $("#thread-infos").data().folder;
    // Delete mail from thunderbird (goes to trash bin)
    await browser.messages.delete([id]);
    // Remove associated elements from DOM
    let messageNodes = Array.from(document.querySelectorAll(".msg"));
    messageNodes.forEach((el) => {
        if (el.attributes["data-id"].value == id) el.remove();
    });
    // Removes associated objects from Mails object
    for (let mail of Mails[folder][threadId].mails) {
        if (mail.id = id) mail = null;
    }
});

clickEventTemplate("#archive-thread", async (e) => {
    let threadId = $("#thread-infos").data().threadid;
    let folder = $("#thread-infos").data().folder;
    let messagesId = [];
    for (let mail of Mails[folder][threadId].mails) {
        messagesId.push(mail.id);
    }
    // Delete mails from thunderbird
    await browser.messages.archive(messagesId);
    // Remove associated elements from DOM
    let threadsList = Array.from(document.querySelectorAll(".thread-summary"));
    threadsList.forEach((el) => {
        if (el.attributes["data-threadid"].value == threadId) el.remove(); 
    });
    document.getElementById("thread-messages-container").remove();
    document.getElementById("thread-infos").remove();
    document.getElementById("thread-buttons").remove();
    /*
    // Removes associated objects from Mails & Threads objects
    Mails[folder][threadId] = null;
    for (let thread of Threads) {
        if (thread.threadId == threadId) thread = null;
    }
    */
});

// Sort threads list by date
$('.th-date').click(function (e) {
    if ($(this).data().sort == "0") {
        Threads.sort((a, b) => {
            if (a.realDate < b.realDate) return 1;
            else if (a.realDate > b.realDate) return -1;
            else return 0;
        });
        $(".table tbody tr").remove();
        fillMailsTemplate();
        $(this).data("sort", "1");
    } else {
        Threads.sort((a, b) => {
            if (a.realDate < b.realDate) return -1;
            else if (a.realDate > b.realDate) return 1;
            else return 0;
        });
        $(".table tbody tr").remove();
        fillMailsTemplate();
        $(this).data("sort", "0");
    }
});