import type { NestJSReferenceConfiguration } from '@scalar/nestjs-api-reference';

export const scalarThemeConfig: Partial<NestJSReferenceConfiguration> = {
  theme: 'default' as const,
  layout: 'modern' as const,
  darkMode: false,
  favicon: '/favicon.ico',
  metaData: {
    title: 'Raco API Documentation',
    description: 'E-commerce Ordering & Payment System — API Reference',
  },
  persistAuth: true,
  searchHotKey: 'k',
  showSidebar: true,
  hideModels: false,
  customCss: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    * {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }

    code, pre, .mono, .cm-content, .cm-editor {
      font-family: 'JetBrains Mono', 'Monaco', 'Cascadia Code', 'Fira Code', monospace !important;
    }

    :root {
      --scalar-primary: #465fff;
      --scalar-primary-dark: #3641f5;
      --scalar-background-1: #ffffff;
      --scalar-background-2: #f8fafc;
      --scalar-background-3: #f1f5f9;
      --scalar-border: #e2e8f0;
      --scalar-text-1: #0f172a;
      --scalar-text-2: #475569;
      --scalar-text-3: #64748b;
      --scalar-scrollbar-color: #cbd5e1;
    }

    /* Sidebar styling */
    .sidebar {
      background: #ffffff !important;
      border-right: 1px solid #e2e8f0 !important;
    }

    /* HTTP method badge colors */
    .scalar-get    { --scalar-color-accent: #16a34a; --scalar-color-accent-bg: #f0fdf4; }
    .scalar-post   { --scalar-color-accent: #2563eb; --scalar-color-accent-bg: #eff6ff; }
    .scalar-put    { --scalar-color-accent: #d97706; --scalar-color-accent-bg: #fffbeb; }
    .scalar-delete { --scalar-color-accent: #dc2626; --scalar-color-accent-bg: #fef2f2; }
    .scalar-patch  { --scalar-color-accent: #7c3aed; --scalar-color-accent-bg: #f5f3ff; }

    /* Tag section headings */
    .section-header h2 {
      font-size: 1.25rem !important;
      font-weight: 700 !important;
      color: #0f172a !important;
    }

    /* Operation cards */
    .section-flattened-item {
      border: 1px solid #e2e8f0 !important;
      border-radius: 0.75rem !important;
      margin-bottom: 0.5rem !important;
      transition: box-shadow 0.15s ease !important;
    }

    .section-flattened-item:hover {
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05) !important;
    }

    /* Authorize button */
    .scalar-button.authorize {
      background: #465fff !important;
      color: white !important;
      border-radius: 0.5rem !important;
      font-weight: 600 !important;
    }

    /* Response codes */
    .response-code-200 { color: #16a34a !important; }
    .response-code-201 { color: #16a34a !important; }
    .response-code-400 { color: #d97706 !important; }
    .response-code-401 { color: #dc2626 !important; }
    .response-code-403 { color: #dc2626 !important; }
    .response-code-404 { color: #dc2626 !important; }
    .response-code-409 { color: #d97706 !important; }
  `,
};
