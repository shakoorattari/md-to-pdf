/**
 * md2pdf-mermaid - Main entry point for the library
 * 
 * @packageDocumentation
 * @module md2pdf-mermaid
 * 
 * @example
 * ```typescript
 * import { convertMarkdownToPdf } from 'md2pdf-mermaid';
 * 
 * // Simple conversion
 * await convertMarkdownToPdf('document.md');
 * 
 * // With options
 * await convertMarkdownToPdf('document.md', 'output.pdf', {
 *   pdf: { format: 'A4', landscape: true },
 *   mermaid: { theme: 'forest' }
 * });
 * ```
 */

// Export types
export * from './types';

// Export main converter
export {
  Converter,
  createConverter,
  convertMarkdownToPdf,
} from './converter';

// Export processors
export {
  MermaidProcessor,
  createMermaidProcessor,
} from './mermaid-processor';

export {
  PdfGenerator,
  createPdfGenerator,
} from './pdf-generator';

// Export utilities
export { Logger, createLogger } from './logger';

export {
  loadConfig,
  mergeConfig,
  createDefaultConfig,
  validateConfig,
} from './config';
