import type { NestJSReferenceConfiguration } from '@scalar/nestjs-api-reference';

export const scalarThemeConfig: Partial<NestJSReferenceConfiguration> = {
  theme: 'default' as const,
  layout: 'modern' as const,
  darkMode: false,
  favicon: '/favicon.ico',
  metaData: {
    title: '🛒 Raco API Documentation',
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

    code, pre, .mono {
      font-family: 'JetBrains Mono', 'Monaco', 'Cascadia Code', monospace !important;
    }

    body {
      background: #f8fafc !important;
    }

    :root {
      --scalar-primary: #465fff;
      --scalar-primary-dark: #3641f5;
      --scalar-background-1: #ffffff;
      --scalar-background-2: #f8fafc;
      --scalar-border: #e4e7ec;
      --scalar-text-1: #101828;
      --scalar-text-2: #475467;
      --scalar-text-3: #667085;
    }

    .scalar-get    { --scalar-color-accent: #12b76a; --scalar-color-accent-bg: #ecfdf3; }
    .scalar-post   { --scalar-color-accent: #465fff; --scalar-color-accent-bg: #ecf3ff; }
    .scalar-put    { --scalar-color-accent: #f79009; --scalar-color-accent-bg: #fffaeb; }
    .scalar-delete { --scalar-color-accent: #f04438; --scalar-color-accent-bg: #fef3f2; }
    .scalar-patch  { --scalar-color-accent: #7a5af8; --scalar-color-accent-bg: #f4f3ff; }

    .scalar-card {
      background: white;
      border: 1px solid #e4e7ec;
      border-radius: 1rem;
      box-shadow: 0 1px 2px 0 rgba(16, 24, 40, 0.05);
      transition: all 0.2s ease;
    }

    .scalar-card:hover {
      box-shadow: 0 4px 8px -2px rgba(16, 24, 40, 0.1), 0 2px 4px -2px rgba(16, 24, 40, 0.06);
      border-color: #d0d5dd;
    }

    .scalar-operation.get    { border-left: 4px solid #12b76a; }
    .scalar-operation.post   { border-left: 4px solid #465fff; }
    .scalar-operation.put    { border-left: 4px solid #f79009; }
    .scalar-operation.delete { border-left: 4px solid #f04438; }
    .scalar-operation.patch  { border-left: 4px solid #7a5af8; }
  `,
};
