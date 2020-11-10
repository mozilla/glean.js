/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import QtQuick 2.0
import QtQuick.Controls 2.0
import QtGraphicalEffects 1.15

import "../../dist/glean.js" as Glean;

Rectangle {
  id: screen
  width: 490
  height: 490

  property int displayText: 0

  Button {
    id: glean
    text: "PUSH 👏 THIS 👏 BUTTON"
    anchors.centerIn: parent
    palette.buttonText: "white"
    palette.button: "#ff5000"
    font.bold: true
    onClicked: () => {
      screen.displayText = 1;
      console.info("Nothing will happen. Glean.js is not yet implemented.");
    }
  }

  DropShadow {
    anchors.fill: glean
    horizontalOffset: 7
    verticalOffset: -7
    radius: 0
    color: "#0059ab"
    source: glean
  }

  Text {
    id: consoleWarn
    text: "Now, take a look at the logs on your terminal."
    visible: displayText
    anchors.top: glean.bottom
    anchors.topMargin: 30
    anchors.horizontalCenter: glean.horizontalCenter
  }

  Component.onCompleted: {
      // Initialize Glean when the application starts.
      try {
        Glean.Glean.initialize("qt-qml-app", true);
      } catch(err) {
        console.error(`Some Javascript error occured.\n${err}`);
      }
  }
}
