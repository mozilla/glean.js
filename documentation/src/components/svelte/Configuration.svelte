<script>
  import { onMount } from 'svelte';

  import Toastify from 'toastify-js';
  import 'toastify-js/src/toastify.css';

  import Highlight from 'svelte-highlight';
  import javascript from 'svelte-highlight/languages/javascript';
  import codeStyle from 'svelte-highlight/styles/atom-one-dark';

  import Glean from '@mozilla/glean/web';
  import GleanMetrics from '@mozilla/glean/metrics';

  let debugTag = 'gleanjs-docs';
  let sessionDuration = 30;
  let uploadEnabled = true;
  let pageLoads = false;
  let clicks = false;
  let initialized = false;

  let clickId = '';
  let clickType = '';
  let clickLabel = '';

  let url = '';
  let referrer = '';
  let title = '';

  let configCode = generateConfigCode();

  /**
   * Runs when the component loads. Sets all the previous values from session
   * storage if they exist.
   */
  onMount(() => {
    // Hide the right sidebar to avoid unnecessary outline.
    const elements = document.getElementsByClassName('right-sidebar-container');
    if (elements.length > 0) {
      elements[0].style.display = 'none';
    }

    const gleanConfig = sessionStorage.getItem('glean-config');
    if (gleanConfig) {
      const parsedConfig = JSON.parse(gleanConfig);
      debugTag = parsedConfig.debugTag ?? 'gleanjs-docs';
      sessionDuration = parsedConfig.sessionDuration ?? 30;
      uploadEnabled = parsedConfig.uploadEnabled ?? true;
      pageLoads = parsedConfig.pageLoads ?? false;
      clicks = parsedConfig.clicks ?? false;

      initializeGlean();
    }
  });

  /**
   * Calls `Glean.initialize` with all values from the configuration form.
   */
  function initializeGlean() {
    initialized = true;

    Glean.setLogPings(true);
    Glean.setDebugViewTag(debugTag);
    Glean.initialize('gleanjs-docs', uploadEnabled, {
      enableAutoPageLoadEvents: pageLoads,
      enableAutoElementClickEvents: clicks,
      sessionLengthInMinutesOverride: sessionDuration
    });

    // Save this data to session storage
    const gleanConfig = {
      debugTag,
      sessionDuration,
      uploadEnabled,
      pageLoads,
      clicks,
      initialized
    };
    sessionStorage.setItem('glean-config', JSON.stringify(gleanConfig));

    configCode = generateConfigCode();

    Toastify({
      text: "Glean.js is initialized, let's collect some data!",
      duration: 2000
    }).showToast();
  }

  /**
   * Clears all values from session storage and reloads the page.
   */
  function clearSessionStorage() {
    sessionStorage.clear();
    location.reload();
  }

  /**
   * Records a page load event with manual overrides.
   */
  function gleanPageLoadEvent() {
    GleanMetrics.pageLoad({
      url,
      referrer,
      title
    });
  }

  /**
   * Records a click event with manual overrides.
   */
  function gleanClickEvent() {
    GleanMetrics.recordElementClick({
      id: clickId,
      type: clickType,
      label: clickLabel
    });
  }

  /**
   * Reload the page to trigger a page load event.
   */
  function reloadWindow() {
    location.reload();
  }

  /**
   * Create the copy-able configuration code based on the user's specified
   * configuration in the UI.
   */
  function generateConfigCode() {
    let code =
`import Glean from '@mozilla/glean/web';

Glean.initialize("${debugTag}", ${uploadEnabled}, {
  enableAutoPageLoadEvents: ${pageLoads},
  enableAutoElementClickEvents: ${clicks},
  sessionLengthInMinutesOverride: ${sessionDuration}
});`
    code = code.trim();
    return code;
  }

  /**
   * Override the `console.info` function to listen for pings being sent.
   */
  (function(){
    let originalInfo = console.info;
    console.info = function(txt) {
      let message = "";
      for (var i = 0; i < arguments.length; i++) {
        message += arguments[i];

        if (i < arguments.length - 1) {
          message += " ";
        }
      }
      // Show a toast if a built-in glean event was recorded.
      if (/"name": "element_click"/.test(message)) {
        Toastify({
          text: 'glean.element_click event submitted!',
          duration: 2000
        }).showToast();
      } else if (/"name": "page_load"/.test(message)) {
        Toastify({
          text: 'glean.page_load event submitted!',
          duration: 2000
        }).showToast();
      }

      // Run the original `console.info` command.
      originalInfo.apply(console, arguments);
    }
  })();
</script>

<svelte:head>
  {@html codeStyle}
</svelte:head>

<div>
  <h3 class="config-header">Configuration</h3>
  <br />
  <label for="debug_tag">Debug Tag:</label>
  <input name="debug_tag" bind:value={debugTag} placeholder="Enter a debug tag" disabled={initialized} />
  <br />
  <label for="session_duration">Session Duration (in minutes):</label> 
  <input name="session_duration" bind:value={sessionDuration} placeholder="Session Duration (default is 30)" disabled={initialized} />
  <br />
  <input type="checkbox" bind:checked={uploadEnabled} id="upload_enabled" name="upload_enabled" disabled={initialized} />
  <label for="upload_enabled">Upload Enabled</label>
  <br />
  <input type="checkbox" bind:checked={pageLoads} id="page_loads" name="page_loads" disabled={initialized}>
  <label for="page_loads">Automatic Page Load Events</label>
  <br />
  <input type="checkbox" bind:checked={clicks} id="clicks" name="clicks" disabled={initialized}>
  <label for="clicks">Automatic Click Events</label>
  <br />
  {#if initialized}
    <p>
      <strong>Click "Reset Glean" to make configuration changes.</strong>
    </p>
  {/if}
  <button disabled={initialized} on:click={initializeGlean}>Initialize</button>
  <button on:click={clearSessionStorage}>Reset Glean</button>
  <br />
  <br />
  <hr />
  <h3>Demo</h3>
  <p>
    For the best demo experience open your browser console. All pings are sent
    to the Debug Ping Viewer. Data from this page is sent in real-time. You can
    see <a href="https://debug-ping-preview.firebaseapp.com/pings/{debugTag}" target="_blank">Pings</a> or the <a href="https://debug-ping-preview.firebaseapp.com/stream/{debugTag}" target="_blank">Event Stream</a>.
  </p>
  <h4>Page Loads</h4>
  <p>Record a page load event by reloading this page.</p>
  <button on:click={reloadWindow} disabled={!pageLoads}>Reload Page</button>
  {#if !pageLoads}
    <p><em>Automatic page load events are not enabled. Refreshing the page will not record an event.</em></p>
  {/if}
  <br />
  <br />
  <p>Record a page load event using the manual override API: <code>GleanMetrics.pageLoad</code>.</p>
  <label for="url">URL:</label>
  <input name="url" bind:value={url} placeholder="Enter a URL" />
  <br />
  <label for="referrer">Referrer:</label>
  <input name="referrer" bind:value={referrer} placeholder="Enter a referrer" />
  <br />
  <label for="title">Title:</label>
  <input name="title" bind:value={title} placeholder="Enter a title" />
  <br />
  <button on:click={gleanPageLoadEvent}>Record Manual Page Load Event</button>
  <br />
  <br />
  <h4>Click Events</h4>
  <p>Record a click event using the <code>data-glean-*</code> html attributes.</p>
  <button data-glean-id='click-event' data-glean-label='Record Click Event' data-glean-type='telemetry-click' disabled={!clicks}>
    Record Click Event
  </button>
  {#if !clicks}
    <p><em>Automatic click events are not enabled. Clicking this button will not record an event.</em></p>
  {/if}
  <br />
  <br />
  <p>Record a click event using the manual override API: <code>GleanMetrics.recordElementClick</code>.</p>
  <label for="click_id">ID:</label>
  <input name="click_id" bind:value={clickId} placeholder="Enter a click ID" />
  <br />
  <label for="click_type">Type:</label>
  <input name="click_type" bind:value={clickType} placeholder="Enter a click type" />
  <br />
  <label for="click_label">Label:</label>
  <input name="click_label" bind:value={clickLabel} placeholder="Enter a click label" />
  <br />
  <button on:click={gleanClickEvent}>Record Manual Click Event</button>
  <br />
  <br />
  <hr />
  <h3>Generated Glean.js Configuration</h3>
  <p>
    A Glean.js configuration that you can copy and paste into your app. To
    update the configuration object, make changes above and click
    "Initialize".
  </p>
  <Highlight language={javascript} code={configCode} langtag />
</div>

<style is:global>
  .config-header {
    margin-top: 1rem;
  }

  br {
    margin-top: 0 !important;
  }
</style>
