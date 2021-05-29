# Githund
Thunderbird add-on for GitHub notification mails (university project).

It's an add-on used to manage GitHub notification mails (from issues and pull requests) more easily. The extension will go through all your mails in the chosen folders and will only keep those sent by GitHub (thanks to a mail header). Then, it will group the mails by threads (all mails coming from a same issue will be grouped for instance).

The extension is mainly executed in a new tab on ThunderBird and therefore use HTML5/CSS3 for the interface (gui) ans JavaScript for the scripts.

You will have access to a few features :

- Sort by date & search input on subjects and correspondents
- View and read all mails of a same thread
- Open or close an issue
- Unsubscribe from a thread by sending a mail
- Go the thread's github page
- Delete or archive thread (all mails linked to it)
- Visual information on which issue is open or closed and if a pull request is merged or not.
- Refresh mails
- Toggle light/dark mode

# Authors
Paulin BAT & Léo HENINI

# How to use it ?
The extension is currently in development. Bugs will appear.

It's, for now, not available in Thunderbird extensions store.

## As Developer

- Download the sources files
- Open thunderbird for developers
- Go to "Add-ons" (add-ons manager) -> "Extensions" -> click on the button "Tools for all add-ons" -> "Debug Add-ons"
- Then on the temporary extension part click on "Load Temporary Add-on..." then go to the source code and select the `manifest.json` file.
- Once the extension has been loaded, right-click on your mails folders containing your github mails and choose the "Add folder to Githund" option.
- Click on the "Open Githund" button on the upper right of Thunderbird.

## As user

- Download githund.zip file
- Open Thunderbird and manually add the .zip file as an add-on
- Right click on the folders where your GitHub mails are and select "Add fodler to Githund"
- Click on the "Open Githund" button on the upper right of Thunderbird

## Github Token

In order to use some features, Githund will make a few calls to the GitHub API, as such you need a few rights to make these requests. We still have not implemented an authentication system with OAuth, as such you need to generate a token with GitHub and give it to the extension. The token is stored in the Thunderbird [local storage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local "local storage API").

To generate a personal access token :

- Go to [github.com/settings/tokens](https://github.com/settings/tokens)
- Click on "generate new token"
- Check at least the following check boxes :
  - repo
  - notifications
  - user



