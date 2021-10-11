TEMPLATE = app

CONFIG += declarative_debug
CONFIG += qml_debug

QT += quick qml
SOURCES += main.cpp

RESOURCES += \
    App.qml \
    $$files(org/mozilla/Glean/*) \
    $$files(generated/*)

# Necessary for the Glean.js storage to work
QT += sql
ios:QTPLUGIN += qsqlite
