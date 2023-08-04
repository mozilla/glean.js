/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import QtQuick 2.0
import QtQuick.Controls 2.0

import org.mozilla.Glean 2.0
import generated 2.0

Rectangle {
  id: screen

  property int displayText: 0

  Button {
    id: record
    objectName: "record"
    text: "Record"
    anchors.horizontalCenter: ping.horizontalCenter
    anchors.bottom: ping.bottom
    anchors.bottomMargin: 80
    palette.buttonText: "black"
    palette.button: "#f1f1f1"
    font.bold: true
    onClicked: () => {
      Sample.buttonClicked.add();
    }
  }

  Button {
    id: ping
    objectName: "ping"
    text: "Submit ping"
    anchors.centerIn: parent
    palette.buttonText: "white"
    palette.button: "#ff5000"
    font.bold: true
    onClicked: () => {
      screen.displayText = 1;
      Pings.submission.submit();
    }
  }

  Text {
    id: consoleWarn
    text: "A ping should have been submitted, please check you terminal for logs."
    visible: displayText
    anchors.top: ping.bottom
    anchors.topMargin: 30
    anchors.horizontalCenter: ping.horizontalCenter
  }

  Component.onCompleted: {
    // Glean.setDebugViewTag("");
    Glean.setLogPings(true);
    Glean.initialize("qt-qml-app", true);
    Sample.appStarted.set();
  }
}
