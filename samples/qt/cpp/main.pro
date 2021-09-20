TEMPLATE = app

CONFIG += declarative_debug
CONFIG += qml_debug

QT += quick qml
SOURCES += main.cpp
RESOURCES += main.qrc

# Necessary for the Glean.js storage to work
QT += sql
ios:QTPLUGIN += qsqlite

target.path = $$PWD
INSTALLS += target
