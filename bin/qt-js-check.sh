#!/bin/bash

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

set -eo pipefail

cd samples/qt-qml-app

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
glean_parser translate metrics.yaml pings.yaml -f javascript -o generated

export QT_DEBUG_PLUGINS=1
sudo apt-get install xvfb
sudo apt-get install libxcb-icccm4 libxcb-image0 libdbus-1-3 libxcb-xfixes0 libxkbcommon-x11-0 libxcb-xkb1 libxcb-xinerama0 libxcb-keysyms1 libxcb-randr0 libxcb-shape0 libxrender1 libxcb-render-util0
xvfb-run python main.py &> qml.log &

sleep 10

if ! grep -q "Initialized Glean succesfully." "qml.log"; then
  echo "\n\n\033[1;91m** Failed to initialize Glean in Qt! See more logs below. **\033[0m\n\n"
  cat qml.log
  exit 1
fi
