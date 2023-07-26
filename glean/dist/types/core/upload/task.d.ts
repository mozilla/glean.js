import type { QueuedPing } from "./manager/shared.js";
export declare const enum UploadTaskTypes {
    Done = "done",
    Wait = "wait",
    Upload = "upload"
}
export declare type Done_UploadTask = {
    type: UploadTaskTypes.Done;
};
export declare type Wait_UploadTask = {
    type: UploadTaskTypes.Wait;
    remainingTime: number;
};
export declare type Upload_UploadTask = {
    type: UploadTaskTypes.Upload;
    ping: QueuedPing;
};
export declare type UploadTask = Done_UploadTask | Wait_UploadTask | Upload_UploadTask;
declare const _default: {
    done: () => Done_UploadTask;
    wait: (remainingTime: number) => Wait_UploadTask;
    upload: (ping: QueuedPing) => Upload_UploadTask;
};
export default _default;
