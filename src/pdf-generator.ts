/**
 * md2pdf-mermaid - PDF Generator
 * Handles the conversion of processed markdown to PDF
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { mdToPdf } from 'md-to-pdf';
import { PdfOptions, StyleOptions } from './types';

/**
 * Default PDF options
 */
const DEFAULT_PDF_OPTIONS: PdfOptions = {
  format: 'A4',
  margin: {
    top: '20mm',
    right: '15mm',
    bottom: '20mm',
    left: '15mm',
  },
  printBackground: true,
  landscape: false,
  displayHeaderFooter: false,
  scale: 1,
};

/**
 * Default CSS styles for the PDF
 */
const DEFAULT_STYLES = `
/* Base styles */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  max-width: 100%;
  padding: 0;
  margin: 0;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
  color: #1a1a1a;
}

h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
h3 { font-size: 1.25em; }
h4 { font-size: 1em; }

/* Paragraphs and text */
p {
  margin-top: 0;
  margin-bottom: 1em;
}

/* Links */
a {
  color: #0366d6;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Lists */
ul, ol {
  margin-top: 0;
  margin-bottom: 1em;
  padding-left: 2em;
}

li {
  margin-bottom: 0.25em;
}

/* Code */
code {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  font-size: 0.9em;
  padding: 0.2em 0.4em;
  background-color: #f6f8fa;
  border-radius: 3px;
}

pre {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  font-size: 0.85em;
  padding: 1em;
  overflow-x: auto;
  background-color: #f6f8fa;
  border-radius: 6px;
  line-height: 1.45;
}

pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}

/* Tables */
table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

th {
  background-color: #f6f8fa;
  font-weight: 600;
}

tr:nth-child(even) {
  background-color: #fafbfc;
}

/* Blockquotes */
blockquote {
  margin: 0 0 1em;
  padding: 0.5em 1em;
  border-left: 4px solid #ddd;
  color: #666;
  background-color: #f9f9f9;
}

blockquote p:last-child {
  margin-bottom: 0;
}

/* Horizontal rules */
hr {
  border: 0;
  border-top: 1px solid #eee;
  margin: 2em 0;
}

/* Images (including Mermaid diagrams) */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

/* Page breaks */
.page-break {
  page-break-after: always;
}

/* Print-specific styles */
@media print {
  body {
    font-size: 12pt;
  }
  
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  a {
    color: #000;
    text-decoration: underline;
  }
}
`;

/**
 * PdfGenerator class for converting markdown to PDF
 */
export class PdfGenerator {
  private pdfOptions: PdfOptions;
  private styleOptions: StyleOptions;
  private customCss: string;

  constructor(pdfOptions?: PdfOptions, styleOptions?: StyleOptions) {
    this.pdfOptions = { ...DEFAULT_PDF_OPTIONS, ...pdfOptions };
    this.styleOptions = styleOptions ?? {};
    this.customCss = DEFAULT_STYLES;
  }

  /**
   * Load custom CSS from file or inline
   */
  async loadCustomStyles(): Promise<void> {
    if (this.styleOptions.cssFile) {
      const cssPath = path.resolve(this.styleOptions.cssFile);
      if (await fs.pathExists(cssPath)) {
        const customCss = await fs.readFile(cssPath, 'utf-8');
        this.customCss = DEFAULT_STYLES + '\n' + customCss;
      }
    }

    if (this.styleOptions.css) {
      this.customCss = this.customCss + '\n' + this.styleOptions.css;
    }
  }

  /**
   * Generate PDF from markdown content
   */
  async generate(
    markdownPath: string,
    outputPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.loadCustomStyles();

      // Write CSS to temp file if it's custom
      let cssFilePath: string | undefined;
      if (this.customCss !== DEFAULT_STYLES) {
        const tmp = require('tmp-promise');
        const cssFile = await tmp.file({ postfix: '.css' });
        await fs.writeFile(cssFile.path, this.customCss, 'utf-8');
        cssFilePath = cssFile.path;
      }

      const pdf = await mdToPdf(
        { path: markdownPath },
        {
          dest: outputPath,
          pdf_options: {
            format: this.pdfOptions.format,
            margin: this.pdfOptions.margin,
            printBackground: this.pdfOptions.printBackground,
            landscape: this.pdfOptions.landscape,
            displayHeaderFooter: this.pdfOptions.displayHeaderFooter,
            headerTemplate: this.pdfOptions.headerTemplate,
            footerTemplate: this.pdfOptions.footerTemplate,
            scale: this.pdfOptions.scale,
            pageRanges: this.pdfOptions.pageRanges,
            preferCSSPageSize: this.pdfOptions.preferCSSPageSize,
          },
          stylesheet: cssFilePath ? [cssFilePath] : undefined,
          body_class: this.styleOptions.bodyClass ? [this.styleOptions.bodyClass] : undefined,
          highlight_style: this.styleOptions.highlightTheme ?? 'github',
          launch_options: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          },
        }
      );

      // Clean up temp CSS file
      if (cssFilePath) {
        await fs.remove(cssFilePath);
      }

      if (pdf && pdf.filename) {
        return { success: true };
      }

      // If no filename but we have content, write it manually
      if (pdf && pdf.content) {
        await fs.writeFile(outputPath, pdf.content);
        return { success: true };
      }

      return { success: false, error: 'PDF generation returned no content' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Generate PDF from markdown string (not file)
   */
  async generateFromString(
    content: string,
    outputPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.loadCustomStyles();

      // Write CSS to temp file if it's custom
      let cssFilePath: string | undefined;
      if (this.customCss !== DEFAULT_STYLES) {
        const tmp = require('tmp-promise');
        const cssFile = await tmp.file({ postfix: '.css' });
        await fs.writeFile(cssFile.path, this.customCss, 'utf-8');
        cssFilePath = cssFile.path;
      }

      const pdf = await mdToPdf(
        { content },
        {
          dest: outputPath,
          pdf_options: {
            format: this.pdfOptions.format,
            margin: this.pdfOptions.margin,
            printBackground: this.pdfOptions.printBackground,
            landscape: this.pdfOptions.landscape,
            displayHeaderFooter: this.pdfOptions.displayHeaderFooter,
            headerTemplate: this.pdfOptions.headerTemplate,
            footerTemplate: this.pdfOptions.footerTemplate,
            scale: this.pdfOptions.scale,
            pageRanges: this.pdfOptions.pageRanges,
            preferCSSPageSize: this.pdfOptions.preferCSSPageSize,
          },
          stylesheet: cssFilePath ? [cssFilePath] : undefined,
          body_class: this.styleOptions.bodyClass ? [this.styleOptions.bodyClass] : undefined,
          highlight_style: this.styleOptions.highlightTheme ?? 'github',
          launch_options: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          },
        }
      );

      // Clean up temp CSS file
      if (cssFilePath) {
        await fs.remove(cssFilePath);
      }

      if (pdf && pdf.filename) {
        return { success: true };
      }

      if (pdf && pdf.content) {
        await fs.writeFile(outputPath, pdf.content);
        return { success: true };
      }

      return { success: false, error: 'PDF generation returned no content' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
}

/**
 * Factory function to create a PdfGenerator instance
 */
export function createPdfGenerator(
  pdfOptions?: PdfOptions,
  styleOptions?: StyleOptions
): PdfGenerator {
  return new PdfGenerator(pdfOptions, styleOptions);
}
