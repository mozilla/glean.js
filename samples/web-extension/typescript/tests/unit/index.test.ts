/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as assert from 'assert';
import Glean from "@mozilla/glean/webext";

import * as sample from "../../src/generated/sample.js";

describe('webext', () => {
    const testAppId = `webext.js.test.${this.title}`;

    beforeEach(async () => {
        await Glean.testResetGlean(testAppId);
    });
    
    describe('sample test', () => {
        it('a metric recording works', async () => {
            
        }
    });
});