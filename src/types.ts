/**
 * md2pdf-mermaid - Core conversion types and interfaces
 */

/**
 * PDF page format options
 */
export type PdfFormat =
  | 'A0'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'Letter'
  | 'Legal'
  | 'Tabloid'
  | 'Ledger';

/**
 * Page margin configuration
 */
export interface PageMargins {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

/**
 * Mermaid diagram rendering options
 */
export interface MermaidOptions {
  /** Theme for Mermaid diagrams */
  theme?: 'default' | 'forest' | 'dark' | 'neutral' | 'base';
  /** Background color for diagrams */
  backgroundColor?: string;
  /** Width of the rendered diagram (default: 800) */
  width?: number;
  /** Height of the rendered diagram (optional) */
  height?: number;
  /** Output format for intermediate diagram images */
  outputFormat?: 'png' | 'svg';
  /** Puppeteer configuration for rendering */
  puppeteerConfig?: PuppeteerConfig;
}

/**
 * Puppeteer configuration for headless browser
 */
export interface PuppeteerConfig {
  headless?: boolean | 'new';
  args?: string[];
  executablePath?: string;
}

/**
 * PDF generation options
 */
export interface PdfOptions {
  /** Page format (default: A4) */
  format?: PdfFormat;
  /** Page margins */
  margin?: PageMargins;
  /** Print background graphics */
  printBackground?: boolean;
  /** Page orientation */
  landscape?: boolean;
  /** Header template HTML */
  headerTemplate?: string;
  /** Footer template HTML */
  footerTemplate?: string;
  /** Display header and footer */
  displayHeaderFooter?: boolean;
  /** Scale of the webpage rendering (0.1 - 2) */
  scale?: number;
  /** Paper width (overrides format) */
  width?: string;
  /** Paper height (overrides format) */
  height?: string;
  /** Page ranges to print, e.g., '1-5, 8, 11-13' */
  pageRanges?: string;
  /** Prefer CSS page size over format */
  preferCSSPageSize?: boolean;
}

/**
 * Custom styling options
 */
export interface StyleOptions {
  /** Path to custom CSS file */
  cssFile?: string;
  /** Inline CSS string */
  css?: string;
  /** Highlight.js theme for code blocks */
  highlightTheme?: string;
  /** Custom body class */
  bodyClass?: string;
}

/**
 * Main conversion options
 */
export interface ConversionOptions {
  /** Input markdown file path */
  input: string;
  /** Output PDF file path (optional, defaults to input with .pdf extension) */
  output?: string;
  /** PDF options */
  pdf?: PdfOptions;
  /** Mermaid diagram options */
  mermaid?: MermaidOptions;
  /** Styling options */
  style?: StyleOptions;
  /** Keep intermediate files (for debugging) */
  keepIntermediate?: boolean;
  /** Working directory for relative paths */
  workingDir?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Batch conversion options
 */
export interface BatchConversionOptions {
  /** Glob pattern(s) for input files */
  patterns: string | string[];
  /** Output directory (optional, defaults to same directory as input) */
  outputDir?: string;
  /** Common conversion options applied to all files */
  options?: Omit<ConversionOptions, 'input' | 'output'>;
  /** Maximum concurrent conversions */
  concurrency?: number;
  /** Continue on error */
  continueOnError?: boolean;
}

/**
 * Watch mode options
 */
export interface WatchOptions extends Omit<ConversionOptions, 'input' | 'output'> {
  /** Glob pattern(s) to watch */
  patterns: string | string[];
  /** Output directory (optional) */
  outputDir?: string;
  /** Debounce delay in milliseconds */
  debounce?: number;
}

/**
 * Conversion result
 */
export interface ConversionResult {
  /** Whether conversion was successful */
  success: boolean;
  /** Input file path */
  inputFile: string;
  /** Output file path */
  outputFile?: string;
  /** Error message if failed */
  error?: string;
  /** Time taken in milliseconds */
  duration?: number;
  /** Number of diagrams processed */
  diagramCount?: number;
}

/**
 * Batch conversion result
 */
export interface BatchConversionResult {
  /** Total files processed */
  total: number;
  /** Successful conversions */
  successful: number;
  /** Failed conversions */
  failed: number;
  /** Individual results */
  results: ConversionResult[];
  /** Total time taken in milliseconds */
  totalDuration: number;
}

/**
 * Configuration file schema
 */
export interface ConfigFile {
  /** Default PDF options */
  pdf?: PdfOptions;
  /** Default Mermaid options */
  mermaid?: MermaidOptions;
  /** Default style options */
  style?: StyleOptions;
  /** Default output directory */
  outputDir?: string;
  /** Patterns to ignore */
  ignore?: string[];
}
