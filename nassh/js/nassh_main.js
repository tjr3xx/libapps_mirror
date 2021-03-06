// Copyright (c) 2012 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

lib.rtdep('lib.f', 'hterm');

// CSP means that we can't kick off the initialization from the html file,
// so we do it like this instead.
window.onload = function() {
  var app;

  if (!nassh.v2) {
    var updateNotification = document.querySelector('#update-notification');
    updateNotification.title = nassh.msg('UPDATE_AVAILABLE_TOOLTIP');
    updateNotification.addEventListener('click', function() {
        updateNotification.style.display = 'none';
      });
  }

  var execNaSSH = function() {
    var profileName = lib.f.parseQuery(document.location.search)['profile'];

    hterm.zoomWarningMessage = nassh.msg('ZOOM_WARNING');
    hterm.notifyCopyMessage = nassh.msg('NOTIFY_COPY');

    var terminal = new hterm.Terminal(profileName);
    terminal.decorate(document.querySelector('#terminal'));
    const runNassh = function() {
      terminal.setCursorPosition(0, 0);
      terminal.setCursorVisible(true);
      terminal.runCommandClass(nassh.CommandInstance,
                               document.location.hash.substr(1));
    };
    terminal.onTerminalReady = function() {
      if (window.chrome && chrome.accessibilityFeatures &&
          chrome.accessibilityFeatures.spokenFeedback) {
        chrome.accessibilityFeatures.spokenFeedback.onChange.addListener(
            (details) => terminal.setAccessibilityEnabled(details.value));
        chrome.accessibilityFeatures.spokenFeedback.get({}, function(details) {
          terminal.setAccessibilityEnabled(details.value);
          runNassh();
        });
      } else {
        runNassh();
      }
    };

    terminal.contextMenu.setItems([
      [nassh.msg('TERMINAL_CLEAR_MENU_LABEL'),
       function() { terminal.wipeContents(); }],
      [nassh.msg('TERMINAL_RESET_MENU_LABEL'),
       function() { terminal.reset(); }],
      [nassh.msg('NEW_WINDOW_MENU_LABEL'),
       function() {
         lib.f.openWindow(lib.f.getURL('/html/nassh.html'), '',
                          'chrome=no,close=yes,resize=yes,scrollbars=yes,' +
                          `minimizable=yes,width=${window.innerWidth},` +
                          `height=${window.innerHeight}`);
       }],
      [nassh.msg('FAQ_MENU_LABEL'),
       function() { lib.f.openWindow('https://goo.gl/muppJj', '_blank'); }],
      [nassh.msg('CLEAR_KNOWN_HOSTS_MENU_LABEL'),
       function() { terminal.command.removeAllKnownHosts(); }],
      [nassh.msg('OPTIONS_BUTTON_LABEL'),
       function() { nassh.openOptionsPage(); }],
    ]);

    // Useful for console debugging.
    window.term_ = terminal;
    console.log(nassh.msg(
        'CONSOLE_NASSH_OPTIONS_NOTICE',
        [lib.f.getURL('/html/nassh_preferences_editor.html')]));
  };

  if (!nassh.v2) {
    var onUpdateAvailable = function() {
      updateNotification.style.display = '';
    };

    window.onunload = function() {
      if (app)
        app.onUpdateAvailable.removeListener(onUpdateAvailable);
    };
  }

  chrome.runtime.getBackgroundPage(function(bg) {
    if (!bg)
      return;

    app = bg.app;

    // Exported for console debugging.
    window.app_ = app;

    // If the background page hasn't finished initializing yet (i.e. bg.app
    // is undefined), just skip the update check.
    if (!nassh.v2 && app) {
      app.onUpdateAvailable.addListener(onUpdateAvailable);
      if (app.updateAvailable)
        onUpdateAvailable();
    }

    nassh.disableTabDiscarding();
    lib.init(execNaSSH, console.log.bind(console));
  });
};
