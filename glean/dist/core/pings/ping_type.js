var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _inner;
import { DELETION_REQUEST_PING_NAME } from "../constants.js";
import { generateUUIDv4, testOnlyCheck } from "../utils.js";
import collectAndStorePing from "../pings/maker/async.js";
import collectAndStorePingSync from "../pings/maker/sync.js";
import { Context } from "../context.js";
import log, { LoggingLevel } from "../log.js";
const LOG_TAG = "core.Pings.PingType";
function isDeletionRequest(name) {
    return name === DELETION_REQUEST_PING_NAME;
}
export class InternalPingType {
    constructor(meta) {
        var _a;
        this.name = meta.name;
        this.includeClientId = meta.includeClientId;
        this.sendIfEmpty = meta.sendIfEmpty;
        this.reasonCodes = (_a = meta.reasonCodes) !== null && _a !== void 0 ? _a : [];
    }
    submit(reason) {
        if (Context.isPlatformSync()) {
            this.submitSync(reason);
        }
        else {
            this.submitAsync(reason);
        }
    }
    submitAsync(reason) {
        if (this.testCallback) {
            this.testCallback(reason)
                .then(() => {
                this.internalSubmit(reason, this.resolveTestPromiseFunction);
            })
                .catch((e) => {
                log(LOG_TAG, [`There was an error validating "${this.name}" (${reason !== null && reason !== void 0 ? reason : "no reason"}):`, e], LoggingLevel.Error);
                this.internalSubmit(reason, this.rejectTestPromiseFunction);
            });
        }
        else {
            this.internalSubmit(reason);
        }
    }
    internalSubmit(reason, testResolver) {
        Context.dispatcher.launch(async () => {
            await this.submitUndispatched(reason, testResolver);
        });
    }
    async submitUndispatched(reason, testResolver) {
        if (!Context.initialized) {
            log(LOG_TAG, "Glean must be initialized before submitting pings.", LoggingLevel.Info);
            return;
        }
        if (!Context.uploadEnabled && !isDeletionRequest(this.name)) {
            log(LOG_TAG, "Glean disabled: not submitting pings. Glean may still submit the deletion-request ping.", LoggingLevel.Info);
            return;
        }
        let correctedReason = reason;
        if (reason && !this.reasonCodes.includes(reason)) {
            log(LOG_TAG, `Invalid reason code ${reason} from ${this.name}. Ignoring.`, LoggingLevel.Warn);
            correctedReason = undefined;
        }
        const identifier = generateUUIDv4();
        await collectAndStorePing(identifier, this, correctedReason);
        if (testResolver) {
            testResolver();
            this.resolveTestPromiseFunction = undefined;
            this.rejectTestPromiseFunction = undefined;
            this.testCallback = undefined;
        }
    }
    submitSync(reason) {
        if (this.testCallback) {
            this.testCallback(reason)
                .then(() => {
                this.internalSubmitSync(reason, this.resolveTestPromiseFunction);
            })
                .catch((e) => {
                log(LOG_TAG, [`There was an error validating "${this.name}" (${reason !== null && reason !== void 0 ? reason : "no reason"}):`, e], LoggingLevel.Error);
                this.internalSubmitSync(reason, this.rejectTestPromiseFunction);
            });
        }
        else {
            this.internalSubmitSync(reason);
        }
    }
    internalSubmitSync(reason, testResolver) {
        if (!Context.initialized) {
            log(LOG_TAG, "Glean must be initialized before submitting pings.", LoggingLevel.Info);
            return;
        }
        if (!Context.uploadEnabled && !isDeletionRequest(this.name)) {
            log(LOG_TAG, "Glean disabled: not submitting pings. Glean may still submit the deletion-request ping.", LoggingLevel.Info);
            return;
        }
        let correctedReason = reason;
        if (reason && !this.reasonCodes.includes(reason)) {
            log(LOG_TAG, `Invalid reason code ${reason} from ${this.name}. Ignoring.`, LoggingLevel.Warn);
            correctedReason = undefined;
        }
        const identifier = generateUUIDv4();
        collectAndStorePingSync(identifier, this, correctedReason);
        if (testResolver) {
            testResolver();
            this.resolveTestPromiseFunction = undefined;
            this.rejectTestPromiseFunction = undefined;
            this.testCallback = undefined;
        }
    }
    async testBeforeNextSubmit(callbackFn) {
        if (testOnlyCheck("testBeforeNextSubmit", LOG_TAG)) {
            if (this.testCallback) {
                log(LOG_TAG, `There is an existing test call for ping "${this.name}". Ignoring.`, LoggingLevel.Error);
                return;
            }
            return new Promise((resolve, reject) => {
                this.resolveTestPromiseFunction = resolve;
                this.rejectTestPromiseFunction = reject;
                this.testCallback = callbackFn;
            });
        }
    }
}
export default class {
    constructor(meta) {
        _inner.set(this, void 0);
        __classPrivateFieldSet(this, _inner, new InternalPingType(meta), "f");
    }
    submit(reason) {
        __classPrivateFieldGet(this, _inner, "f").submit(reason);
    }
    async testBeforeNextSubmit(callbackFn) {
        return __classPrivateFieldGet(this, _inner, "f").testBeforeNextSubmit(callbackFn);
    }
}
_inner = new WeakMap();
