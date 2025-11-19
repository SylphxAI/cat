import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@sylphx/cat',
  description: 'The fastest, lightest, and most extensible logger for all JavaScript runtimes',

  ignoreDeadLinks: true,

  head: [
    // Favicons
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],

    // Theme
    ['meta', { name: 'theme-color', content: '#646cff' }],

    // Primary Meta Tags
    ['meta', { name: 'title', content: '@sylphx/cat - Ultra-fast, lightweight logger for JavaScript' }],
    ['meta', { name: 'description', content: 'The fastest, lightest, and most extensible logger for all JavaScript runtimes. 82% smaller than Pino, zero dependencies, full TypeScript support.' }],
    ['meta', { name: 'keywords', content: 'logger, logging, javascript, typescript, bun, nodejs, pino, winston, opentelemetry, w3c-trace-context, observability' }],
    ['meta', { name: 'author', content: 'Kyle Zhu, SylphX' }],

    // Open Graph / Facebook
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://cat.sylphx.com/' }],
    ['meta', { property: 'og:title', content: '@sylphx/cat - Ultra-fast, lightweight logger for JavaScript' }],
    ['meta', { property: 'og:description', content: 'The fastest, lightest, and most extensible logger for all JavaScript runtimes. 82% smaller than Pino, zero dependencies, full TypeScript support.' }],
    ['meta', { property: 'og:image', content: 'https://cat.sylphx.com/og-image.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:site_name', content: '@sylphx/cat' }],
    ['meta', { property: 'og:locale', content: 'en' }],

    // Twitter
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:url', content: 'https://cat.sylphx.com/' }],
    ['meta', { name: 'twitter:title', content: '@sylphx/cat - Ultra-fast, lightweight logger for JavaScript' }],
    ['meta', { name: 'twitter:description', content: 'The fastest, lightest, and most extensible logger for all JavaScript runtimes. 82% smaller than Pino, zero dependencies, full TypeScript support.' }],
    ['meta', { name: 'twitter:image', content: 'https://cat.sylphx.com/og-image.png' }],

    // Canonical
    ['link', { rel: 'canonical', href: 'https://cat.sylphx.com/' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
      {
        text: 'v0.2.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/SylphxAI/cat/blob/main/CHANGELOG.md' },
          { text: 'Contributing', link: '/guide/contributing' },
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is @sylphx/cat?', link: '/guide/what-is-cat' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Why Cat?', link: '/guide/why-cat' },
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Loggers', link: '/guide/loggers' },
            { text: 'Formatters', link: '/guide/formatters' },
            { text: 'Transports', link: '/guide/transports' },
            { text: 'Plugins', link: '/guide/plugins' },
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'Error Serialization', link: '/guide/error-serialization' },
            { text: 'W3C Trace Context', link: '/guide/tracing' },
            { text: 'OTLP Export', link: '/guide/otlp' },
            { text: 'Redaction & Security', link: '/guide/redaction' },
            { text: 'Tail-Based Sampling', link: '/guide/tail-sampling' },
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Performance', link: '/guide/performance' },
            { text: 'Best Practices', link: '/guide/best-practices' },
            { text: 'Migration Guide', link: '/guide/migration' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          ]
        },
        {
          text: 'Development',
          items: [
            { text: 'Contributing', link: '/guide/contributing' },
            { text: 'Architecture', link: '/guide/architecture' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Logger', link: '/api/logger' },
            { text: 'Formatters', link: '/api/formatters' },
            { text: 'Transports', link: '/api/transports' },
            { text: 'Plugins', link: '/api/plugins' },
            { text: 'Serializers', link: '/api/serializers' },
            { text: 'Types', link: '/api/types' },
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Basic Usage', link: '/examples/basic' },
            { text: 'Production Setup', link: '/examples/production' },
            { text: 'Microservices', link: '/examples/microservices' },
            { text: 'OTLP Integration', link: '/examples/otlp' },
            { text: 'Security & Redaction', link: '/examples/redaction' },
            { text: 'Cost Optimization', link: '/examples/tail-sampling' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/SylphxAI/cat' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@sylphx/cat' },
      { icon: 'discord', link: 'https://discord.gg/sylphx' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Kyle Zhu'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/SylphxAI/cat/edit/main/docs/:path'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    codeTransformers: [
      {
        postprocess(code) {
          return code.replace(/\[!code/g, '[\\!code')
        }
      }
    ]
  }
})
