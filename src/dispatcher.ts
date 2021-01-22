/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// The possible states a dispatcher instance can be in.
const enum DispatcherState {
  // The dispatcher has not been initialized yet.
  //
  // When the dispatcher is in this state it will not enqueue
  // more than `maxPreInitQueueSize` tasks.
  Uninitialized,
  // There are no commands queued and the dispatcher is idle.
  Idle,
  // The dispatcher is currently processing queued tasks.
  Processing,
  // The dispatcher is blocked, tasks queued will not be immediatelly processed.
  Blocked,
}

// The possible commands to be processed by the dispatcher.
const enum Commands {
  Task,
  Block,
}

// A task the dispatcher knows how to execute.
type Task = () => Promise<void>;

// An executable command.
type Command = {
  task: Task,
  command: Commands.Task
} | {
  command: Commands.Block
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

  constructor(readonly maxPreInitQueueSize = 100) {
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
   * Enqueues a Block command at the start of the queue.
   */
  private block(): void {
    this.queue.unshift({ command: Commands.Block });
  }

  /**
   * Executes all the commands in the queue, from oldest to newest.
   *
   * Stops on case a `Block` command is encountered.
   */
  private async execute(): Promise<void> {
    let nextCommand = this.getNextCommand();
    while(nextCommand) {
      if (nextCommand.command === Commands.Block) {
        break;
      }

      try {
        await nextCommand.task();
      } catch(e) {
        console.error("Error executing task:", e);
      }

      nextCommand = this.getNextCommand();
    }
  }

  /**
   * Triggers the execution of enqueued command
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
   * Launches a task on this dispatchers queue.
   * Kickstarts the execution of the queue in case it is currently Idle.
   *
   * # Note
   *
   * Will not enqueue in case the dispatcher has not been initialized yet (i.e. `flushInit` has not been called yet)
   * and the queues length will exceed `maxPreInitQueueSize`.
   *
   * @param task The task to enqueue.
   *
   * @returns Whether or not the task was succesfully enqueued.
   */
  launch(task: Task): boolean {
    if (this.state === DispatcherState.Uninitialized) {
      if (this.queue.length >= this.maxPreInitQueueSize) {
        console.warn("Unable to enqueue task, pre init queue is full.");
        return false;
      }
    }

    this.queue.push({
      task,
      command: Commands.Task
    });
    this.triggerExecution();
    return true;
  }

  /**
   * Flushes the tasks enqueued while the dispatcher was uuninitialized.
   *
   * This is a no-op in case the dispatcher is not in an uninitialized state.
   */
  flushInit(): void {
    if (this.state !== DispatcherState.Uninitialized) {
      console.warn("Attempted to initialize the Dispatcher, but it is already initialized. Ignoring.");
      return;
    }

    this.state = DispatcherState.Idle;
    this.triggerExecution();
  }

  /**
   * Blocks the current job and clears the tasks queue.
   *
   * @returns A promise which resolves once the current job has been succesfully stopped and the queue was emptied.
   */
  async clear(): Promise<void> {
    this.block();
    await this.blockOnQueue();
    this.queue = [];
    this.state = DispatcherState.Idle;
  }

  /**
   * Returns a promise that resolves once the current task execution in finished.
   *
   * @returns The promise.
   */
  async blockOnQueue(): Promise<void> {
    return this.currentJob && await this.currentJob;
  }
}

export default Dispatcher;
