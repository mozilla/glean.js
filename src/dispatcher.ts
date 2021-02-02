/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// The possible states a dispatcher instance can be in.
export const enum DispatcherState {
  // The dispatcher has not been initialized yet.
  //
  // When the dispatcher is in this state it will not enqueue
  // more than `maxPreInitQueueSize` tasks.
  Uninitialized,
  // There are no commands queued and the dispatcher is idle.
  Idle,
  // The dispatcher is currently processing queued tasks.
  Processing,
  // The dispatcher is stopped, tasks queued will not be immediatelly processed.
  Stopped,
}

// The possible commands to be processed by the dispatcher.
const enum Commands {
  // The dispatcher must enqueue a new task.
  //
  // This command is always followed by a concrete task for the dispatcher to execute.
  Task,
  // The dispatcher should stop executing the queued tasks.
  Stop,
}

// A task the dispatcher knows how to execute.
export type Task = () => Promise<void>;

// An executable command.
type Command = {
  task: Task,
  command: Commands.Task
} | {
  command: Commands.Stop
};

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
  // A promise contianing the current execution promise.
  //
  // This is `undefined` in case there is no ongoing execution of tasks.
  private currentJob?: Promise<void>;
  // Whether or not the dispatcher is currently operating in synchronous execution mode.
  //
  // When this is the case, tasks are enqueued in a separate sync queue.
  private syncMode: boolean;
  // An array of tasks to execute in sync mode.
  private syncQueue: Task[];

  constructor(readonly maxPreInitQueueSize = 100) {
    this.queue = [];
    this.state = DispatcherState.Uninitialized;

    this.syncMode = false;
    this.syncQueue = [];
  }

  /**
   * Executes a task in a safe way, if the task throws the error is caught and logged.
   *
   * @param task The task to execute.
   */
  private async executeTask(task: Task): Promise<void> {
    try {
      await task();
    } catch(e) {
      console.error("Error executing task:", e);
    }
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
   * Executes all the commands in the queue, from oldest to newest.
   *
   * Stops on case a `Stop` command is encountered.
   */
  private async execute(): Promise<void> {
    let nextCommand = this.getNextCommand();
    while(nextCommand) {
      if (nextCommand.command === Commands.Stop) {
        break;
      }

      await this.executeTask(nextCommand.task);

      nextCommand = this.getNextCommand();
    }
  }

  /**
   * Triggers the execution of enqueued commands
   * in case the dispatcher is currently Idle.
   */
  private async triggerExecution(): Promise<void> {
    if (this.state === DispatcherState.Idle && this.queue.length > 0) {
      this.state = DispatcherState.Processing;
      this.currentJob = this.execute();
      await this.currentJob;
      this.currentJob = undefined;
      this.state = DispatcherState.Idle;
    }
  }

  /**
   * Executes all tasks in the sync queue.
   */
  private async executeSyncTasks(): Promise<void> {
    for (const task of this.syncQueue) {
      await this.executeTask(task);
    }

    this.syncQueue = [];
  }

  /**
   * Launches a task on this dispatchers queue.
   * Kickstarts the execution of the queue in case it is currently Idle.
   *
   * # Note
   *
   * Will not enqueue in case the dispatcher has not been initialized yet
   * and the queues length exceeds `maxPreInitQueueSize`.
   *
   * @param task The task to enqueue.
   */
  launch(task: Task): void {
    if (this.syncMode) {
      this.syncQueue.push(task);
      return;
    }

    if (this.state === DispatcherState.Uninitialized) {
      if (this.queue.length >= this.maxPreInitQueueSize) {
        console.warn("Unable to enqueue task, pre init queue is full.");
        return;
      }
    }

    this.queue.push({
      task,
      command: Commands.Task
    });

    // Even though triggerExecution is async we don't want to block on it.
    // The point of the dispatcher is to execute the async functions
    // in a deterministic order without having to wait for them.
    this.triggerExecution();
  }

  /**
   * Flushes the tasks enqueued while the dispatcher was uninitialized.
   *
   * This is a no-op in case the dispatcher is not in an uninitialized state.
   */
  flushInit(): void {
    if (this.state !== DispatcherState.Uninitialized) {
      console.warn("Attempted to initialize the Dispatcher, but it is already initialized. Ignoring.");
      return;
    }

    this.state = DispatcherState.Idle;

    // Even though triggerExecution is async we don't want to block on it.
    // The point of the dispatcher is to execute the async functions
    // in a deterministic order without having to wait for them.
    this.triggerExecution();
  }

  /**
   * Stops the current job and clears the tasks queue.
   *
   * @returns A promise which resolves once the current job
   *          has been succesfully stopped and the queue was emptied.
   */
  async clear(): Promise<void> {
    await this.stop();
    this.queue = [];
    this.state = DispatcherState.Idle;
  }

  /**
   * Any sync call to  this instances`dispatcher.launch` inside this block
   * will be executed immediatelly in a separate sync queue.
   *
   * The dispatcher state makes no difference on the execution of sync tasks,
   * if it is stopped or uninitialized the tasks will still be executed.
   *
   * # Important
   *
   * It is essential that all dispatcher calls inside `fn` are done synchronously.
   * Otherwise they won't be called in sync mode.
   *
   * This is ok:
   *
   * ```js
   * dispatcher.executeSynchronously(() => {
   *   dispatcher.launch(task);
   * });
   * ```
   *
   * This is not ok:
   *
   * ```js
   * dispatcher.executeSynchronously(() => {
   *   new Promise(resolve => {
   *      dispatcher.launch(task);
   *      resolve();
   *   });
   * });
   * ```
   *
   * @param fn A function inside which any synchronous dispatcher call is executed immediatelly.
   *
   * @returns A promise which resolves once all tasks launched inside the block are resolved.
   */
  executeSynchronously(fn: () => void): Promise<void> {
    // This works only if the dispatcher.lauch calls inside `fn` happen synchronously
    // i.e. not inside promises or as callbacks for functions such as setTimeout and what not..
    this.syncMode = true;
    fn();
    this.syncMode = false;
    return this.executeSyncTasks();
  }

  /**
   * Sets the state of this dispatcher to "Stopped" and stops any ongoing task processing.
   *
   * @returns A promise which resolves once the current job
   *          has been succesfully stopped.
   */
  async stop(): Promise<void> {
    if (this.state === DispatcherState.Uninitialized) {
      console.warn("Attempted to stop the dispatcher but it has not been initialized yet. Ignoring.");
      return;
    }

    if (this.state === DispatcherState.Processing) {
      this.queue.unshift({ command: Commands.Stop });
      await this.testBlockOnQueue();
    }

    this.state = DispatcherState.Stopped;
  }

  /**
   * **Test-Only API**
   *
   * Returns a promise that resolves once the current task execution in finished.
   *
   * @returns The promise.
   */
  async testBlockOnQueue(): Promise<void> {
    return this.currentJob && await this.currentJob;
  }

  /**
   * **Test-Only API**
   *
   * Returns the dispatcher back to an uninitialized state.
   *
   * This will also stop ongoing tasks and clear the queue.
   */
  async testUninitialize(): Promise<void> {
    await this.clear();
    this.state = DispatcherState.Uninitialized;
  }

  /**
   * Launches a task in test mode.
   *
   * @param task The task to launch.
   *
   * @returns A promise that resolves once the task is processed.
   */
  async testLaunch(task: Task): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return new Promise(resolve => {
      this.launch(async () => {
        await task();
        resolve();
      });
    });
  }
}

export default Dispatcher;
