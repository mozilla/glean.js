export var UploadTaskTypes;
(function (UploadTaskTypes) {
    UploadTaskTypes["Done"] = "done";
    UploadTaskTypes["Wait"] = "wait";
    UploadTaskTypes["Upload"] = "upload";
})(UploadTaskTypes || (UploadTaskTypes = {}));
export default {
    done: () => ({
        type: "done"
    }),
    wait: (remainingTime) => ({
        type: "wait",
        remainingTime,
    }),
    upload: (ping) => ({
        type: "upload",
        ping,
    }),
};
