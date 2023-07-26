# Glean.js - C++ Qt/QML app sample

This sample contains a Qt/QML app that will initialize Glean.js when opened.

The app will display a button that when clicked should trigger Glean.js events.

## Requirement

- Qt 5.15.2 ([Qt Online Installer](https://www.qt.io/download-qt-installer))

## How to run this sample


1. Build Glean.js for Qt. Inside the `glean/` folder, run:

```bash
npm run build:qt
```

2. Within this sample directory, copy the Glean.js library:

```bash
cp -r ../../glean/dist/qt/org/ src/App/org/
```

3. Install glean_parser, we suggest doing this inside a virtual environment:

```bash
python3 -m venv .venv # Create a virtualenv
source .venv/bin/activate # Activate it
pip3 install -r requirements.txt # Install glean_parser
```

4. Generate metrics and pings files:

> **Note**: The version number below should match the last [released version](https://github.com/mozilla/glean.js/releases) number (minus the trailing `.0`). If the version numbers are different you will run into issues with QML code compilation. To resolve these errors you have to adjust the versions manually in the QML files

```bash
glean_parser translate src/App/metrics.yaml src/App/pings.yaml -f javascript -o src/App/generated \
--option platform=qt --option version="2.0.0-alpha"
```

5. Build the app:

```bash
qmake -r # Configure both the app and the tests
make # Build moth the app and the tests
```

> **Note**: How to run the app will depend on the platform targeted during build.

6. (EXTRA) Run tests:

```bash
make check
```
