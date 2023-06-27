/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import { KnownOperatingSystems } from "../../../../../src/core/platform_info/shared";
import PlatformInfo from "../../../../../src/platform/browser/web/platform_info";

describe("PlatformInfo/browser/web", function () {
  it("expected OS is returned for known user agent strings", function () {
    // Examples come from: https://developers.whatismybrowser.com/useragents/explore/operating_system_name/
    const expected: Record<string, string[]> = {
      [KnownOperatingSystems.Windows]: [
        "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)",
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36",
        "Mozilla/4.0 (compatible; MSIE 6.0; Windows 98)",
      ],
      [KnownOperatingSystems.TvOS]: [
        "PTVApp-tvOS/24 CFNetwork/1220.1 Darwin/20.3.0",
        "hulu/6.8.2 (tvos 13.3; en_us; appletv5\,3; 17k449)",
      ],
      [KnownOperatingSystems.WatchOS]: [
        "server-bag [Watch OS,6.3,17U208,Watch2,3]",
      ],
      [KnownOperatingSystems.iOS]: [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 12_1_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16D57",
        "Mozilla/5.0 (iPad; CPU OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1",
      ],
      [KnownOperatingSystems.MacOS]: [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/603.3.8 (KHTML, like Gecko) Version/10.1.2 Safari/603.3.8",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:45.0) Gecko/20100101 Firefox/45.0",
        "MacOutlook/14.6.9.160926 (Intel Mac OS X 10.9.6)",
      ],
      [KnownOperatingSystems.Android]: [
        "Mozilla/5.0 (Linux; U; Android 2.2) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
      ],
      [KnownOperatingSystems.ChromeOS]: [
        "Mozilla/5.0 (X11; CrOS x86_64 13597.105.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.208 Safari/537.36"
      ],
      [KnownOperatingSystems.WebOS]: [
        "Mozilla/5.0 (webOS/1.4.5; U; en-US) AppleWebKit/532.2 (KHTML, like Gecko) Version/1.0 Safari/532.2 Pixi/1.",
        "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.34 Safari/537.36 DMOST/1.0.1 (; LGE; webOSTV; WEBOS4.6.0 03.60.02; W4_k5lp;",
      ],
      [KnownOperatingSystems.Linux]: [
        "Thunderstorm/1.0 (Linux)",
        "BrightSign/8.2.55.5 (XT1144)Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.12.3 Chrome/69.0.3497.128 Safari/537.36",
      ],
      [KnownOperatingSystems.OpenBSD]: [
        "Mozilla/5.0 (X11; OpenBSD amd64; rv:43.0) Gecko/20100101 Firefox/43.0",
        "Opera/9.22 (X11; OpenBSD i386; U; en)",
      ],
      [KnownOperatingSystems.FreeBSD]: [
        "Mozilla/5.0 (X11; FreeBSD i386) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.125 Safari/537.36",
      ],
      [KnownOperatingSystems.NetBSD]: [
        "Mozilla/5.0 (X11; NetBSD) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36",
        "Mozilla/5.0 (X11; U; NetBSD i386; en-US; rv:1.8.0.1) Gecko/20060303 Firefox/1.5.0.1",
      ],
      [KnownOperatingSystems.SunOS]: [
        "Mozilla/5.0 (X11; SunOS i86pc; rv:78.0) Gecko/20100101 Firefox/78.0",
        "Mozilla/5.0 (MSIE 7.0; Macintosh; U; SunOS; X11; gu; SV1; InfoPath.2; .NET CLR 3.0.04506.30; .NET CLR 3.0.04506.648)",
      ],
      [KnownOperatingSystems.AIX]: [
        "Mozilla/3.0 (X11; I; AIX 2)",
        "Mozilla/5.0 (X11; U; AIX 0048013C4C00; en-US; rv:1.0.1) Gecko/20021009 Netscape/7.0",
        "PicoBrowser/5.0 (X11; U; AIX 5.3; en-US; rv:1.7.12) Gecko/20051025",
      ],
      [KnownOperatingSystems.Unknown]: [
        "",
        "something else"
      ]
    };

    for (const expectedOS in expected) {
      for (const ua of expected[expectedOS]) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        navigator.__defineGetter__("userAgent", () => ua);
        assert.strictEqual(
          PlatformInfo.os(),
          expectedOS,
          `Expected "${ua}" User-Agent string to yield the "${expectedOS}" OS.`
        );
      }
    }
  });
});
