import log, { LoggingLevel } from "./log.js";
const LOG_TAG = "core.Dispatcher";
export var DispatcherState;
(function (DispatcherState) {
    DispatcherState["Uninitialized"] = "Uninitialized";
    DispatcherState["Idle"] = "Idle";
    DispatcherState["Processing"] = "Processing";
    DispatcherState["Stopped"] = "Stopped";
    DispatcherState["Shutdown"] = "Shutdown";
})(DispatcherState || (DispatcherState = {}));
var Commands;
(function (Commands) {
    Commands["Task"] = "Task";
    Commands["PersistentTask"] = "PersistentTask";
    Commands["InitTask"] = "InitTask";
    Commands["Stop"] = "Stop";
    Commands["Clear"] = "Clear";
    Commands["Shutdown"] = "Shutdown";
    Commands["TestTask"] = "TestTask";
})(Commands || (Commands = {}));
class Dispatcher {
    constructor(maxPreInitQueueSize = 100, logTag = LOG_TAG) {
        this.maxPreInitQueueSize = maxPreInitQueueSize;
        this.logTag = logTag;
        this.shuttingDown = false;
        this.currentJob = Promise.resolve();
        this.queue = [];
        this.state = "Uninitialized";
    }
    getNextCommand() {
        return this.queue.shift();
    }
    async executeTask(task) {
        try {
            await task();
            return true;
        }
        catch (e) {
            log(this.logTag, `Error executing Glean task${e ? `: ${e}` : ". There might be more error logs above."}`, LoggingLevel.Error);
            return false;
        }
    }
    unblockTestResolvers() {
        this.queue.forEach(c => {
            if (c.command === "TestTask") {
                c.resolver();
            }
        });
    }
    async execute() {
        let nextCommand = this.getNextCommand();
        while (nextCommand) {
            switch (nextCommand.command) {
                case ("Stop"):
                    this.state = "Stopped";
                    return;
                case ("Shutdown"):
                    this.unblockTestResolvers();
                    this.queue = [];
                    this.state = "Shutdown";
                    this.shuttingDown = false;
                    return;
                case ("Clear"):
                    this.unblockTestResolvers();
                    this.queue = this.queue.filter(c => ["PersistentTask", "Shutdown"].includes(c.command));
                    break;
                case ("TestTask"):
                    await this.executeTask(nextCommand.task);
                    nextCommand.resolver();
                    break;
                case ("InitTask"):
                    const result = await this.executeTask(nextCommand.task);
                    if (!result) {
                        log(this.logTag, [
                            "Error initializing dispatcher, won't execute anything further.",
                            "There might be more error logs above."
                        ], LoggingLevel.Error);
                        this.clear();
                        void this.shutdown();
                    }
                    break;
                case ("PersistentTask"):
                case ("Task"):
                    await this.executeTask(nextCommand.task);
                    break;
            }
            nextCommand = this.getNextCommand();
        }
    }
    triggerExecution() {
        if (this.state === "Idle" && this.queue.length > 0) {
            this.state = "Processing";
            this.currentJob = this.execute();
            this.currentJob
                .then(() => {
                const that = this;
                if (this.state === "Processing") {
                    that.state = "Idle";
                }
            })
                .catch(error => {
                log(this.logTag, [
                    "IMPOSSIBLE: Something went wrong while the dispatcher was executing the tasks queue.",
                    error
                ], LoggingLevel.Error);
            });
        }
    }
    launchInternal(command, priorityTask = false) {
        if (this.state === "Shutdown") {
            log(this.logTag, "Attempted to enqueue a new task but the dispatcher is shutdown. Ignoring.", LoggingLevel.Warn);
            return false;
        }
        if (!priorityTask && this.state === "Uninitialized") {
            if (this.queue.length >= this.maxPreInitQueueSize) {
                log(this.logTag, "Unable to enqueue task, pre init queue is full.", LoggingLevel.Warn);
                return false;
            }
        }
        if (priorityTask) {
            this.queue.unshift(command);
        }
        else {
            this.queue.push(command);
        }
        this.triggerExecution();
        return true;
    }
    launch(task) {
        this.launchInternal({
            task,
            command: "Task"
        });
    }
    launchPersistent(task) {
        this.launchInternal({
            task,
            command: "PersistentTask"
        });
    }
    flushInit(task) {
        if (this.state !== "Uninitialized") {
            log(this.logTag, "Attempted to initialize the Dispatcher, but it is already initialized. Ignoring.", LoggingLevel.Warn);
            return;
        }
        if (task) {
            this.launchInternal({
                task,
                command: "InitTask"
            }, true);
        }
        this.state = "Idle";
        this.triggerExecution();
    }
    clear(priorityTask = true) {
        this.launchInternal({ command: "Clear" }, priorityTask);
        this.resume();
    }
    stop(priorityTask = true) {
        if (this.shuttingDown) {
            this.clear(priorityTask);
        }
        else {
            this.launchInternal({ command: "Stop" }, priorityTask);
        }
    }
    resume() {
        if (this.state === "Stopped") {
            this.state = "Idle";
            this.triggerExecution();
        }
    }
    shutdown() {
        this.shuttingDown = true;
        this.launchInternal({ command: "Shutdown" });
        this.resume();
        return this.currentJob;
    }
    async testBlockOnQueue() {
        return await this.currentJob;
    }
    async testUninitialize() {
        if (this.state === "Uninitialized") {
            return;
        }
        this.clear();
        await this.shutdown();
        this.state = "Uninitialized";
    }
    testLaunch(task) {
        return new Promise((resolver, reject) => {
            this.resume();
            const wasLaunched = this.launchInternal({
                resolver,
                task,
                command: "TestTask"
            });
            if (!wasLaunched) {
                reject();
            }
        });
    }
}
export default Dispatcher;
