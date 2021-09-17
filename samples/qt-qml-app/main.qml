/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import QtQuick 2.0
import QtQuick.Controls 2.0
import QtGraphicalEffects 1.15

import org.mozilla.Glean 0.20;
import generated 0.20;

Rectangle {
  id: screen
  width: 490
  height: 490

  property int displayText: 0

  Button {
    id: record
    text: "Record"
    anchors.horizontalCenter: ping.horizontalCenter
    anchors.bottom: ping.bottom
    anchors.bottomMargin: 80
    palette.buttonText: "black"
    palette.button: "#f1f1f1"
    font.bold: true
    onClicked: () => {
      console.log("Adding to the `button_clicked` metric.");
      Sample.buttonClicked.add();
    }
  }

  Button {
    id: ping
    text: "Submit ping"
    anchors.centerIn: parent
    palette.buttonText: "white"
    palette.button: "#ff5000"
    font.bold: true
    onClicked: () => {
      screen.displayText = 1;
      Pings.custom.submit();
    }
  }

  DropShadow {
    anchors.fill: ping
    horizontalOffset: 7
    verticalOffset: -7
    radius: 0
    color: "#0059ab"
    source: ping
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
    // Initialize Glean.
    Glean.initialize("qt-qml-app", true, { debug: { logPings: true }});
    Sample.appStarted.set();
    // !IMPORTANT!
    // If this message is changed the check in bin/qt-js-check **must** be updated.
    console.log("Initialized Glean succesfully.");
  }
}
