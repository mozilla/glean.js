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

2. Whithin this sample directory, copy the Glean.js library:

```bash
cp -r ../../../glean/dist/qt/org/ org/
```

3. Install glean_parser, we suggest doing this inside a virtual environment:

```bash
python3 -m venv .venv # Create a virtualenv
source .venv/bin/activate # Activate it
pip3 install -r requirements.txt # Install glean_parser
```

4. Generate metrics and pings files.

```bash
glean_parser translate metrics.yaml pings.yaml -f javascript -o generated \
--option platform=qt --option version="0.19";
```

5. Build the app

```bash
qmake
```

> **Note**: How to run the app will depend on the platform targeted during build.
