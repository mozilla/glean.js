/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import log, { LoggingLevel } from "./log.js";

const LOG_TAG = "core.Dispatcher";

// The possible states a dispatcher instance can be in.
export const enum DispatcherState {
  // The dispatcher has not been initialized yet.
  //
  // When the dispatcher is in this state it will not enqueue
  // more than `maxPreInitQueueSize` tasks.
  Uninitialized = "Uninitialized",
  // There are no commands queued and the dispatcher is idle.
  Idle = "Idle",
  // The dispatcher is currently processing queued tasks.
  Processing = "Processing",
  // The dispatcher is stopped, tasks queued will not be immediatelly processed.
  Stopped = "Stopped",
  // The dispatcher is shutdown, attempting to queue tasks while in this state is a no-op.
  //
  // This state is irreversible.
  Shutdown = "Shutdown",
}

// The possible commands to be processed by the dispatcher.
const enum Commands {
  // The dispatcher will enqueue a new task.
  //
  // This command is always followed by a concrete task for the dispatcher to execute.
  Task = "Task",
  // Same as the `Task` command,
  // but the task enqueued by this command is not cleared by the `Clear` command.
  //
  // # Note
  //
  // `Shutdown` will still clear these tasks.
  //
  // Unless unavoidable, prefer using the normal `Task`.
  PersistentTask = "PersistentTask",
  // The dispatcher should stop executing the queued tasks.
  Stop = "Stop",
  // The dispatcher should stop executing the queued tasks and clear the queue.
  Clear = "Clear",
  // The dispatcher will clear the queue and go into the Shutdown state.
  Shutdown = "Shutdown",
  // Exactly like a normal Task, but spawned for tests.
  TestTask = "TestTask",
}

// A task the dispatcher knows how to execute.
type Task = () => Promise<void>;

interface BaseCommand {
  // The actual command to be executed.
  command: Commands,
  // A tag to use when logging the execution of the given command.
  debugTag?: string,
}

interface TaskCommand extends BaseCommand {
  task: Task,
  command: Commands.Task | Commands.PersistentTask,
}

interface TestTaskCommand extends BaseCommand {
  resolver: (value: void | PromiseLike<void>) => void,
  task: Task,
  command: Commands.TestTask,
}

interface InternalCommand extends BaseCommand {
  command: Exclude<Commands, Commands.Task | Commands.TestTask | Commands.PersistentTask>,
}

// An executable command.
type Command = TaskCommand | TestTaskCommand | InternalCommand;

/**
 * A task dispatcher for async tasks.
 *
 * Will make sure tasks are execute in order.
 */
class Dispatcher {
  // A FIFO queue of tasks to execute.
  private queue: Command[];
  // The current state of this dispatcher.
  private state: DispatcherState;
  // Whether or not the dispatcher is currently in the process of shutting down
  // i.e. a Shutdown command is in the queue.
  private shuttingDown = false;
  // A promise containing the current execution promise.
  private currentJob = Promise.resolve();

  constructor(readonly maxPreInitQueueSize = 100, readonly logTag = LOG_TAG) {
    this.queue = [];
    this.state = DispatcherState.Uninitialized;
  }

  /**
   * Gets the oldest command added to the queue.
   *
   * @returns The oldest command or `undefined` if the queue is empty.
   */
  private getNextCommand(): Command | undefined {
    return this.queue.shift();
  }

  /**
   * Executes a task safely, catching any errors.
   *
   * @param task The task to execute.
   * @param debugTag A tag identifiying the current task for debugging purposes.
   */
  private async executeTask(task: Task, debugTag?: string): Promise<void> {
    try {
      await task();
      log(
        this.logTag,
        [
          "Done executing task in Task command:",
          debugTag ? `[${debugTag}]` : "[unidentified]"
        ]
      );
    } catch(e) {
      log(this.logTag, ["Error executing task:", JSON.stringify(e)], LoggingLevel.Error);
    }
  }

  /**
   * Resolve all test resolvers.
   *
   * Used before clearing the queue in on a `Shutdown` or `Clear` command.
   */
  private unblockTestResolvers(): void {
    this.queue.forEach(c => {
      if (c.command === Commands.TestTask) {
        c.resolver();
      }
    });
  }

  /**
   * Executes all the commands in the queue, from oldest to newest.
   */
  private async execute(): Promise<void> {
    let nextCommand = this.getNextCommand();
    while(nextCommand) {
      log(
        this.logTag,
        [
          `Executing dispatched ${nextCommand.command} command:`,
          nextCommand.debugTag ? `[${nextCommand.debugTag}]` : "[unidentified]"
        ]
      );
      switch(nextCommand.command) {
      case(Commands.Stop):
        this.state = DispatcherState.Stopped;
        return;
      case(Commands.Shutdown):
        this.unblockTestResolvers();
        this.queue = [];
        this.state = DispatcherState.Shutdown;
        this.shuttingDown = false;
        return;
      case(Commands.Clear):
        this.unblockTestResolvers();
        this.queue = this.queue.filter(c =>
          [Commands.PersistentTask, Commands.Shutdown].includes(c.command)
        );
        nextCommand = this.getNextCommand();
        continue;
      case (Commands.TestTask):
        await this.executeTask(nextCommand.task, nextCommand.debugTag);
        nextCommand.resolver();
        nextCommand = this.getNextCommand();
        continue;
      case(Commands.PersistentTask):
      case(Commands.Task):
        await this.executeTask(nextCommand.task, nextCommand.debugTag);
        nextCommand = this.getNextCommand();
      }

      if (nextCommand) {
        log(this.logTag, ["Getting the next command...", nextCommand.command]);
      }
    }
  }

  /**
   * Triggers the execution of enqueued command
   * in case the dispatcher is currently Idle.
   */
  private triggerExecution(): void {
    if (this.state === DispatcherState.Idle && this.queue.length > 0) {
      this.state = DispatcherState.Processing;
      this.currentJob = this.execute();

      // We decide against using `await` here, so that this function does not return a promise and
      // no one feels compelled to wait on execution of tasks.
      //
      // That should be avoided as much as possible,
      // because it will cause a deadlock in case you wait inside a task
      // that was launched inside another task.
      this.currentJob
        .then(() => {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          const that = this;
          if (this.state === DispatcherState.Processing) {
            that.state = DispatcherState.Idle;
          }
          log(
            this.logTag,
            `Done executing tasks, the dispatcher is now in the ${this.state} state.`
          );
        })
        .catch(error => {
          log(
            this.logTag,
            [
              "IMPOSSIBLE: Something went wrong while the dispatcher was executing the tasks queue.",
              error
            ],
            LoggingLevel.Error
          );
        });
    }
  }

  /**
   * Internal method to launch a task and trigger execution.
   *
   * Allows enqueueing of any valid command.
   *
   * Allows proritization of tasks, to add tasks at the front of the queue.
   * When a task is marked as a `priorityTask` it will be enqueued
   * regardless of the `maxPreInitQueueSize being overflown.
   *
   * @param command The command to enqueue.
   * @param priorityTask Whether or not this task is a priority task
   *        and should be enqueued at the front of the queue.
   * @returns Wheter or not the task was queued.
   */
  private launchInternal(command: Command, priorityTask = false): boolean {
    if (this.state === DispatcherState.Shutdown) {
      log(
        this.logTag,
        "Attempted to enqueue a new task but the dispatcher is shutdown. Ignoring.",
        LoggingLevel.Warn
      );
      return false;
    }

    if (!priorityTask && this.state === DispatcherState.Uninitialized) {
      if (this.queue.length >= this.maxPreInitQueueSize) {
        log(
          this.logTag,
          "Unable to enqueue task, pre init queue is full.",
          LoggingLevel.Warn
        );
        return false;
      }
    }

    if (priorityTask) {
      this.queue.unshift(command);
    } else {
      this.queue.push(command);
    }

    this.triggerExecution();

    return true;
  }

  /**
   * Adds a task to the end of this dispatchers queue.
   *
   * Kickstarts the execution of the queue in case the dispatcher currently Idle.
   *
   * # Note
   *
   * Will not enqueue in case the dispatcher has not been initialized yet
   * and the queues length exceeds `maxPreInitQueueSize`.
   *
   * @param task The task to enqueue.
   * @param debugTag A tag identifiying the current task for debugging purposes.
   */
  launch(task: Task, debugTag?: string): void {
    this.launchInternal({
      task,
      debugTag,
      command: Commands.Task
    });
  }

  /**
   * Works exactly like {@link launch},
   * but enqueues a persistent task which is not cleared by the Clear command.
   *
   * @param task The task to enqueue.
   * @param debugTag A tag identifiying the current task for debugging purposes.
   */
  launchPersistent(task: Task, debugTag?: string): void {
    this.launchInternal({
      task,
      debugTag,
      command: Commands.PersistentTask
    });
  }

  /**
   * Flushes the tasks enqueued while the dispatcher was uninitialized.
   *
   * This is a no-op in case the dispatcher is not in an uninitialized state.
   *
   * @param task Optional task to execute before any of the tasks enqueued prior to init.
   * @param debugTag A tag identifiying the current task for debugging purposes.
   */
  flushInit(task?: Task, debugTag?: string): void {
    if (this.state !== DispatcherState.Uninitialized) {
      log(
        this.logTag,
        "Attempted to initialize the Dispatcher, but it is already initialized. Ignoring.",
        LoggingLevel.Warn
      );
      return;
    }

    if (task) {
      this.launchInternal({
        task,
        debugTag,
        command: Commands.Task
      }, true);
    }

    this.state = DispatcherState.Idle;
    this.triggerExecution();
  }

  /**
   * Enqueues a Clear command at the front of the queue and triggers execution.
   *
   * The Clear command will remove all other tasks
   * except for persistent tasks or shutdown tasks.
   *
   * # Note
   *
   * Even if the dispatcher is stopped this command will be executed.
   *
   * @param priorityTask Whether or not to launch the clear command as a priority task.
   */
  clear(priorityTask = true): void {
    this.launchInternal({ command: Commands.Clear }, priorityTask);
    this.resume();
  }

  /**
   * Enqueues a Stop command at the front of the queue and triggers execution.
   *
   * The Stop command will stop execution of current tasks
   * and put the Dispatcher in a Stopped state.
   *
   * While stopped the dispatcher will still enqueue tasks but won't execute them.
   *
   * In order to re-start the dispatcher, call the `resume` method.
   *
   * # Note
   *
   * In case a Shutdown command has been launched before this command,
   * this command will result in the queue being cleared.
   *
   * @param priorityTask Whether or not to launch the clear command as a priority task.
   * This is `true` by default.
   */
  stop(priorityTask = true): void {
    if (this.shuttingDown) {
      this.clear(priorityTask);
    } else {
      this.launchInternal({ command: Commands.Stop }, priorityTask);
    }
  }

  /**
   * Resumes execution os tasks if the dispatcher is stopped.
   *
   * This is a no-op if the dispatcher is not stopped.
   */
  resume(): void {
    if (this.state === DispatcherState.Stopped) {
      this.state = DispatcherState.Idle;
      this.triggerExecution();
    }
  }

  /**
   * Shutsdown the dispatcher.
   *
   * 1. Executes all tasks launched prior to this one.
   * 2. Clears the queue of any tasks launched after this one (even persistent tasks).
   * 3. Puts the dispatcher in the `Shutdown` state.
   *
   * # Note
   *
   * - This is a command like any other, if the dispatcher is uninitialized
   *   it will get executed when the dispatcher is initialized.
   * - If the dispatcher is stopped, it is resumed and all pending tasks are executed.
   *
   * @returns A promise which resolves once shutdown is complete.
   */
  shutdown(): Promise<void> {
    this.shuttingDown = true;
    this.launchInternal({ command: Commands.Shutdown });
    this.resume();
    return this.currentJob;
  }

  /**
   * Test-Only API**
   *
   * Returns a promise that resolves once the current task execution in finished.
   *
   * Use this with caution.
   * If called inside a task launched inside another task, it will cause a deadlock.
   *
   * @returns The promise.
   */
  async testBlockOnQueue(): Promise<void> {
    return await this.currentJob;
  }

  /**
   * Test-Only API**
   *
   * Returns the dispatcher back to an uninitialized state.
   *
   * This will also stop ongoing tasks and clear the queue.
   *
   * If the dispatcher is already in an uninitialized state, this is no-op.
   */
  async testUninitialize(): Promise<void> {
    if (this.state === DispatcherState.Uninitialized) {
      return;
    }

    // Clear queue.
    this.clear();
    // Wait for the clear command and any persistent tasks that may still be in the queue.
    await this.shutdown();
    this.state = DispatcherState.Uninitialized;
  }

  /**
   * Launches a task in test mode.
   *
   * # Note
   *
   * This function will resume the execution of tasks if the dispatcher was stopped
   * and return the dispatcher back to an idle state.
   *
   * This is important in order not to hang forever in case the dispatcher is stopped.
   *
   * # Errors
   *
   * This function will reject in case the task is not launched.
   * Make sure the dispatcher is initialized or is not shutdown in these cases.
   *
   * @param task The task to launch.
   * @returns A promise which only resolves once the task is done being executed
   *          or is guaranteed to not be executed ever i.e. if the queue gets cleared.
   */
  testLaunch(task: Task): Promise<void> {
    return new Promise((resolver, reject) => {
      this.resume();
      const wasLaunched = this.launchInternal({
        resolver,
        task,
        command: Commands.TestTask
      });

      if (!wasLaunched) {
        reject();
      }
    });
  }
}

export default Dispatcher;
