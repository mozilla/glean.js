import QtQuick 2.0
import QtTest 1.0

import org.mozilla.Glean 0.26
import generated 0.26

import App 1.0

App {
    id: app

    TestCase {
        id: util

        /**
         * This function will block until a given promise is fulfilled.
         *
         * Note: This needs to be insdie a TestCase element,
         * because `tryVerify` is a test only API.
         */
        function awaitOn(promise) {
            // Whether or not the promise fulfilled, doesn't matter if resolved or rejected.
            let promiseFulfilled = false;
            // Whether or not the promise resolved succesfully.
            let promiseResolved = false;
            // The result of the resolved promise;
            let promiseData = undefined;

            promise
                .then(data => {
                    promiseResolved = true;
                    promiseFulfilled = true;
                    promiseData = data;
                })
                .catch(() => promiseFulfilled = true);

            // This will block waiting for the promise to fulfill.
            tryVerify(
                () => promiseFulfilled,
                5000,
                `Timed out while waiting for promise to fulfill.`
            );

            return {
                resolved: promiseResolved,
                data: promiseData
            }
        }

        /**
         * Asserts no errors were recorded for either metric.
         */
        function checkForRecordingErrors() {
            // Verify no errors were recorded for either metric.
            const { data: appStartedErrors } = util.awaitOn(
                Sample.appStarted.testGetNumRecordedErrors(Glean.ErrorType.InvalidValue)
            );
            compare(appStartedErrors, 0);
            const { data: buttonClickErrors } = util.awaitOn(
                Sample.buttonClicked.testGetNumRecordedErrors(Glean.ErrorType.InvalidValue)
            );
            compare(buttonClickErrors, 0);
        }

        /**
         * Get the recording and submission button from the App view.
         */
        function getRecordAndSubmitButtons() {
            return {
                recordButton: findChild(app, "record"),
                submitButton: findChild(app, "ping"),
            }
        }
    }

    // Test reset needs to happen _before_ Glean is initialized by the app (see: Bug 1734635)
    // but the tests need to run _after_ that happens, that is why we use two
    // different test cases which are triggered each in a different moment.
    TestCase {
        name: "BeforeInit"

        function initTestCase() {
            util.awaitOn(Glean.testResetGlean("qt-sample-test", true));
        }
    }

    TestCase {
        name: "MainTests"
        when: windowShown

        /**
         * Verified metrics are recorded as expected.
         */
        function case_metric_recording() {
            const { recordButton } = util.getRecordAndSubmitButtons();

            const expectedClickCount = 10;
            for (let i = 0; i < expectedClickCount; i++) {
                recordButton.clicked();
            }

            // Check there is some value in the app started metric,
            // it should have been recorded when the app component was completed.
            const { data: appStartedData } = util.awaitOn(Sample.appStarted.testGetValue());
            verify(appStartedData !== undefined);

            // Check the value in the buttonClicked metric is as expected.
            const { data: buttonClickData } = util.awaitOn(Sample.buttonClicked.testGetValue());
            compare(buttonClickData, expectedClickCount);

            util.checkForRecordingErrors();
        }

        /**
         * Verified metrics are cleared as expected.
         */
        function case_metric_clearing() {
            const { submitButton } = util.getRecordAndSubmitButtons();

            // Click the button that submits the ping,
            // note that we are not resetting Glean in between test runs,
            // so the pings should be sent with the data gathered on the test above `case_metric_recording`.
            submitButton.clicked();

            // Check metrics were cleared as expected.
            const { data: appStartedData } = util.awaitOn(Sample.appStarted.testGetValue());
            compare(appStartedData, undefined);
            const { data: buttonClickData } = util.awaitOn(Sample.buttonClicked.testGetValue());
            compare(buttonClickData, undefined);

            util.checkForRecordingErrors();
        }

        /**
         * Verified metrics errors are recorded as expected.
         */
        function case_metric_error_recording() {
            const { recordButton, submitButton } = util.getRecordAndSubmitButtons();

            Sample.buttonClicked.add(-1);

            const expectedClickCount = 10;
            for (let i = 0; i < expectedClickCount; i++) {
                recordButton.clicked();
            }

            Sample.buttonClicked.add(-1);

            // Check the value in the buttonClicked metric is as expected.
            const { data: buttonClickData } = util.awaitOn(Sample.buttonClicked.testGetValue());
            compare(buttonClickData, expectedClickCount);

            const { data: buttonClickErrors } = util.awaitOn(
                Sample.buttonClicked.testGetNumRecordedErrors(Glean.ErrorType.InvalidValue)
            );
            compare(buttonClickErrors, 2);

            // Click the button that submits the ping.
            submitButton.clicked();
            // Over zealous check that error metrics were also cleared.
            util.checkForRecordingErrors();
        }

        function test_main() {
            // This guarantees tests are run in sequence.
            case_metric_recording();
            case_metric_clearing();
            case_metric_error_recording();
        }
    }
}
