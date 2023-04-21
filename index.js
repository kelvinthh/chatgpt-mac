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

// When app is ready, set up the menubar and context menu
app.on("ready", () => {
  // Create Tray object using the menubar icon image
  const image = nativeImage.createFromPath(
    path.join(__dirname, `images/newiconTemplate.png`)
  );
  const tray = new Tray(image);

  // Set up menubar object
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

  // When menubar is ready, set up its behavior
  mb.on("ready", () => {
    // Get a reference to the menubar window
    const { window } = mb;

    // Hide the window from the taskbar on Windows and Linux
    if (process.platform !== "darwin") {
      window.setSkipTaskbar(true);
    } else {
      // Hide the dock icon on macOS
      app.dock.hide();
    }

    // Set up the context menu items
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
      // {
      //   label: "Author on Twitter",
      //   click: () => {
      //     shell.openExternal("https://twitter.com/vincelwt");
      //   },
      // },
    ];

    // Set up the tray context menu behavior
    tray.on("right-click", () => {
      mb.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate));
    });

    tray.on("click", (e) => {
      // Check if ctrl or meta key is pressed while clicking
      e.ctrlKey || e.metaKey
        ? mb.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate))
        : null;
    });

    // Set up the global shortcut to show/hide the menubar window
    globalShortcut.register("CommandOrControl+Shift+g", () => {
      if (window.isVisible()) {
        mb.hideWindow();
      } else {
        mb.showWindow();
        if (process.platform == "darwin") {
          mb.app.show();
        }
        mb.app.focus();
      }
    });

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
