# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from PySide2.QtWidgets import QApplication
from PySide2.QtQuick import QQuickView
from PySide2.QtCore import QUrl

import signal
# This will allow us to close the app on the terminal with Ctrl+C
signal.signal(signal.SIGINT, signal.SIG_DFL)

app = QApplication([])
view = QQuickView()
url = QUrl("main.qml")

view.setSource(url)
view.show()
app.exec_()
