# Glean.js - Qt/QML app sample

This sample contains a Qt/QML app that will initialize Glean.js when opened.

The app will display a button that when clicked should trigger Glean.js events.

## How to run this sample


1. Build Glean.js for Qt.

```bash
npm run build:qt
```

2. Whithin this sample directory, run the command to create a Python 3 virtual environment.

```bash
python3 -m venv .venv
```

2. Install the dependencies.

```bash
.venv/bin/pip3 install -r requirements.txt
```

3. Generate metrics and pings files.

```bash
.venv/bin/python3 -m glean_parser translate metrics.yaml pings.yaml -f javascript -o generated \
--option platform=qt --option version="0.15";
```

4. Run the application.

```bash
.venv/bin/python3 main.py
```

> *Important*: if running the application fails, turn on Qt debugging by setting the `QT_DEBUG_PLUGINS` environment variable to `1`, e.g. `export QT_DEBUG_PLUGINS=1`.
