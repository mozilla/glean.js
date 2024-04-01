import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  integrations: [starlight({
    title: 'Glean.js',
    components: {
      // Override the default `SocialIcons` component.
      PageTitle: './src/components/CustomPageTitle.astro'
    },
    social: {
      github: 'https://github.com/mozilla/glean.js'
    },
    sidebar: [{
      label: 'About',
      items: [
      // Each item here is one entry in the navigation menu.
      {
        label: 'Overview',
        link: '/overview'
      }, {
        label: 'Demo',
        link: '/demo'
      }, {
        label: 'FAQ',
        link: '/faq'
      }, {
        label: 'Roadmap',
        link: 'https://docs.google.com/document/d/1vqu9O9VRGRiuptQbGPY5UX-cH2gkUSVj4EoZizQtHGM/edit#heading=h.m18zbbjlaigo',
        attrs: {
          target: '_blank',
          style: 'font-style: italic'
        }
      }]
    }, {
      label: 'Getting Started',
      items: [{
        label: 'Adding Glean to your project',
        link: 'https://mozilla.github.io/glean/book/user/adding-glean-to-your-project/index.html',
        attrs: {
          target: '_blank',
          style: 'font-style: italic'
        }
      }, {
        label: 'Integration Guide',
        link: '/guides/integration'
      }]
    }, {
      label: 'Reference',
      autogenerate: {
        directory: 'reference'
      }
    }]
  }), svelte()]
});