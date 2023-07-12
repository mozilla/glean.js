import { CompactEncrypt, importJWK, calculateJwkThumbprint } from "jose";
import Plugin from "./index.js";
import CoreEvents from "../core/events/async.js";
const JWE_ALGORITHM = "ECDH-ES";
const JWE_CONTENT_ENCODING = "A256GCM";
class PingEncryptionPlugin extends Plugin {
    constructor(jwk) {
        super(CoreEvents["afterPingCollection"].name, "pingEncryptionPlugin");
        this.jwk = jwk;
    }
    async action(payload) {
        const key = await importJWK(this.jwk, JWE_ALGORITHM);
        const encoder = new TextEncoder();
        const encodedPayload = await new CompactEncrypt(encoder.encode(JSON.stringify(payload)))
            .setProtectedHeader({
            kid: await calculateJwkThumbprint(this.jwk),
            alg: JWE_ALGORITHM,
            enc: JWE_CONTENT_ENCODING,
            typ: "JWE"
        })
            .encrypt(key);
        return { payload: encodedPayload };
    }
}
export default PingEncryptionPlugin;
