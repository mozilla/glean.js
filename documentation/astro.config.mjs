import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  site: 'https://mozilla.github.io/glean.js/',
  integrations: [starlight({
    title: 'Glean.js',
    components: {
      // Override the default `PageTitle` component.
      PageTitle: './src/components/CustomPageTitle.astro'
    },
    social: {
      github: 'https://github.com/mozilla/glean.js'
    },
    sidebar: [{
      label: 'Introduction',
      items: [
      // Each item here is one entry in the navigation menu.
      {
        label: 'Overview',
        link: '/'
      }, {
        label: 'Interactive playground',
        link: '/playground'
      }, {
        label: 'Roadmap 🔒',
        link: 'https://docs.google.com/document/d/1vqu9O9VRGRiuptQbGPY5UX-cH2gkUSVj4EoZizQtHGM/edit#heading=h.m18zbbjlaigo',
        attrs: {
          target: '_blank',
          style: 'font-style: italic'
        }
      }]
    }, {
      label: 'Getting Started',
      items: [{
        label: 'Platforms',
        link: '/getting_started/platforms'
      }, {
        label: 'Installation',
        link: '/getting_started/installation'
      }, {
        label: 'Setting up Glean',
        link: '/getting_started/setup'
      }, {
        label: 'Integration guide',
        link: 'https://mozilla.github.io/glean/book/user/adding-glean-to-your-project/index.html',
        attrs: {
          target: '_blank',
          style: 'font-style: italic'
        }
      }]
    }, {
      label: 'Automatic Events',
      items: [{
        label: 'Page load events',
        link: '/automatic_instrumentation/page_load_events'
      }, {
        label: 'Click events',
        link: '/automatic_instrumentation/click_events'
      }]
    }, {
      label: 'Debugging',
      items: [{
        label: 'Options',
        link: '/debugging/options'
      }, {
        label: 'Browser debugging',
        link: '/debugging/browser'
      }]
    }, {
      // This auto generates a list for all md files in the
      // `/documentation/src/content/docs/reference` directory.
      label: 'Reference',
      autogenerate: {
        directory: 'reference'
      }
    }]
  }), svelte()]
});
