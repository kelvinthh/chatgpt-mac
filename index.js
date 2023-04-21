const { menubar } = require("menubar");
const {
  app,
  nativeImage,
  Tray,
  Menu,
  globalShortcut,
  shell,
} = require("electron");
const contextMenu = require("electron-context-menu");
const path = require("path");

// Create Tray object using the menubar icon image
async function createTray() {
  const image = nativeImage.createFromPath(
    path.join(__dirname, `images/newiconTemplate.png`)
  );
  const tray = new Tray(image);

  return { tray, image };
}

// Set up the context menu items and behavior
function createContextMenu(tray, window) {
  const contextMenuTemplate = [
    {
      label: "Quit",
      accelerator: "Command+Q",
      click: () => {
        app.quit();
      },
    },
    {
      label: "Reload",
      accelerator: "Command+R",
      click: () => {
        window.reload();
      },
    },
    {
      label: "Open in browser",
      click: () => {
        shell.openExternal("https://chat.openai.com/chat");
      },
    },
    {
      type: "separator",
    },
    {
      label: "View on GitHub",
      click: () => {
        shell.openExternal("https://github.com/kelvinthh/chatgpt-mac");
      },
    },
  ];

  // Set up the tray context menu behavior
  tray.on("right-click", () => {
    tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate));
  });

  tray.on("click", (e) => {
    e.ctrlKey || e.metaKey
      ? tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate))
      : null;
  });
}

// Register the global shortcut to show/hide the menubar window
function registerGlobalShortcut(window) {
  globalShortcut.register("CommandOrControl+Shift+g", () => {
    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
      if (process.platform == "darwin") {
        app.show();
      }
      app.focus();
    }
  });
}

app.on("ready", async () => {
  const { tray, image } = await createTray();

  const mb = menubar({
    browserWindow: {
      icon: image,
      transparent: path.join(__dirname, `images/iconApp.png`),
      webPreferences: {
        webviewTag: true,
      },
      width: 450,
      height: 550,
    },
    tray,
    showOnAllWorkspaces: true,
    preloadWindow: true,
    showDockIcon: false,
    icon: image,
  });

  mb.on("ready", () => {
    const { window } = mb;

    // Your setup code goes here
    if (process.platform !== "darwin") {
      window.setSkipTaskbar(true);
    } else {
      app.dock.hide();
    }

    createContextMenu(tray, window);
    registerGlobalShortcut(window);

    // Set up the application menu
    const menu = new Menu();
    Menu.setApplicationMenu(menu);

    // Set up web contents event listener for webview tag
    app.on("web-contents-created", (e, contents) => {
      if (contents.getType() == "webview") {
        // Open links with external browser in webview
        contents.on("new-window", (e, url) => {
          e.preventDefault();
          shell.openExternal(url);
        });

        // Set context menu in webview
        contextMenu({
          window: contents,
        });

        // Register cmd+c/cmd+v events
        contents.on("before-input-event", (event, input) => {
          const { control, meta, key } = input;
          if (!control && !meta) return;
          if (key === "c") contents.copy();
          if (key === "v") contents.paste();
          if (key === "a") contents.selectAll();
          if (key === "z") contents.undo();
          if (key === "y") contents.redo();
          if (key === "q") app.quit();
          if (key === "r") contents.reload();
        });
      }
    });

    // Restore focus to previous app on hiding
    if (process.platform == "darwin") {
      mb.on("after-hide", () => {
        mb.app.hide();
      });
    }

    // Prevent background flickering
    app.commandLine.appendSwitch(
      "disable-backgrounding-occluded-windows",
      "true"
    );

    console.log("Menubar app is ready.");
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
