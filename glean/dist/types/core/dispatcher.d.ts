export declare const enum DispatcherState {
    Uninitialized = "Uninitialized",
    Idle = "Idle",
    Processing = "Processing",
    Stopped = "Stopped",
    Shutdown = "Shutdown"
}
declare type Task = () => Promise<void>;
/**
 * A task dispatcher for async tasks.
 *
 * Will make sure tasks are execute in order.
 */
declare class Dispatcher {
    readonly maxPreInitQueueSize: number;
    readonly logTag: string;
    private queue;
    private state;
    private shuttingDown;
    private currentJob;
    constructor(maxPreInitQueueSize?: number, logTag?: string);
    /**
     * Gets the oldest command added to the queue.
     *
     * @returns The oldest command or `undefined` if the queue is empty.
     */
    private getNextCommand;
    /**
     * Executes a task safely, catching any errors.
     *
     * @param task The  task to execute.
     * @returns Whether or not the task was executed successfully.
     */
    private executeTask;
    /**
     * Resolve all test resolvers.
     *
     * Used before clearing the queue in on a `Shutdown` or `Clear` command.
     */
    private unblockTestResolvers;
    /**
     * Executes all the commands in the queue, from oldest to newest.
     */
    private execute;
    /**
     * Triggers the execution of enqueued command
     * in case the dispatcher is currently Idle.
     */
    private triggerExecution;
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
    private launchInternal;
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
     */
    launch(task: Task): void;
    /**
     * Works exactly like {@link launch},
     * but enqueues a persistent task which is not cleared by the Clear command.
     *
     * @param task The task to enqueue.
     */
    launchPersistent(task: Task): void;
    /**
     * Flushes the tasks enqueued while the dispatcher was uninitialized.
     *
     * This is a no-op in case the dispatcher is not in an uninitialized state.
     *
     * @param task Optional task to execute before any of the tasks enqueued prior to init.
     *        Note: if this task throws, the dispatcher will be shutdown and no other tasks will be executed.
     */
    flushInit(task?: Task): void;
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
    clear(priorityTask?: boolean): void;
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
    stop(priorityTask?: boolean): void;
    /**
     * Resumes execution os tasks if the dispatcher is stopped.
     *
     * This is a no-op if the dispatcher is not stopped.
     */
    resume(): void;
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
    shutdown(): Promise<void>;
    /**
     * Test-only API
     *
     * Returns a promise that resolves once the current task execution in finished.
     *
     * Use this with caution.
     * If called inside a task launched inside another task, it will cause a deadlock.
     *
     * @returns The promise.
     */
    testBlockOnQueue(): Promise<void>;
    /**
     * Test-only API
     *
     * Returns the dispatcher back to an uninitialized state.
     *
     * This will also stop ongoing tasks and clear the queue.
     *
     * If the dispatcher is already in an uninitialized state, this is no-op.
     */
    testUninitialize(): Promise<void>;
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
    testLaunch(task: Task): Promise<void>;
}
export default Dispatcher;
