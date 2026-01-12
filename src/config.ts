/**
 * md2pdf-mermaid - Configuration loader
 * Handles loading and merging configuration from files and CLI
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { ConfigFile, ConversionOptions } from './types';

/**
 * Configuration file names to search for
 */
const CONFIG_FILE_NAMES = [
  'md2pdf.config.json',
  'md2pdf.config.js',
  '.md2pdfrc',
  '.md2pdfrc.json',
];

/**
 * Load configuration from file
 */
export async function loadConfig(
  configPath?: string,
  searchDir?: string
): Promise<ConfigFile | null> {
  // If specific path provided, load it directly
  if (configPath) {
    const resolvedPath = path.resolve(configPath);
    if (await fs.pathExists(resolvedPath)) {
      return loadConfigFile(resolvedPath);
    }
    return null;
  }

  // Search for config file in directory hierarchy
  const startDir = searchDir ? path.resolve(searchDir) : process.cwd();
  let currentDir = startDir;

  while (true) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = path.join(currentDir, fileName);
      if (await fs.pathExists(filePath)) {
        return loadConfigFile(filePath);
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Reached root
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * Load a specific config file
 */
async function loadConfigFile(filePath: string): Promise<ConfigFile> {
  const ext = path.extname(filePath);

  if (ext === '.js') {
    // Load JavaScript config
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(filePath);
  }

  // Load JSON config
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Merge configuration sources (defaults, file config, CLI options)
 */
export function mergeConfig(
  fileConfig: ConfigFile | null,
  cliOptions: Partial<ConversionOptions>
): Partial<ConversionOptions> {
  const merged: Partial<ConversionOptions> = {};

  // Start with file config
  if (fileConfig) {
    if (fileConfig.pdf) {
      merged.pdf = fileConfig.pdf;
    }
    if (fileConfig.mermaid) {
      merged.mermaid = fileConfig.mermaid;
    }
    if (fileConfig.style) {
      merged.style = fileConfig.style;
    }
  }

  // Override with CLI options
  if (cliOptions.pdf) {
    merged.pdf = { ...merged.pdf, ...cliOptions.pdf };
  }
  if (cliOptions.mermaid) {
    merged.mermaid = { ...merged.mermaid, ...cliOptions.mermaid };
  }
  if (cliOptions.style) {
    merged.style = { ...merged.style, ...cliOptions.style };
  }

  // Copy other options
  if (cliOptions.input) {
    merged.input = cliOptions.input;
  }
  if (cliOptions.output) {
    merged.output = cliOptions.output;
  }
  if (cliOptions.verbose !== undefined) {
    merged.verbose = cliOptions.verbose;
  }
  if (cliOptions.keepIntermediate !== undefined) {
    merged.keepIntermediate = cliOptions.keepIntermediate;
  }
  if (cliOptions.workingDir) {
    merged.workingDir = cliOptions.workingDir;
  }

  return merged;
}

/**
 * Create a default config file
 */
export async function createDefaultConfig(
  outputPath: string
): Promise<void> {
  const defaultConfig: ConfigFile = {
    pdf: {
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      printBackground: true,
      landscape: false,
    },
    mermaid: {
      theme: 'default',
      backgroundColor: 'transparent',
      width: 800,
      outputFormat: 'png',
    },
    style: {
      highlightTheme: 'github',
    },
  };

  const filePath = path.resolve(outputPath, 'md2pdf.config.json');
  await fs.writeJson(filePath, defaultConfig, { spaces: 2 });
}

/**
 * Validate configuration
 */
export function validateConfig(config: ConfigFile): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate PDF format
  const validFormats = [
    'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
    'Letter', 'Legal', 'Tabloid', 'Ledger',
  ];
  if (config.pdf?.format && !validFormats.includes(config.pdf.format)) {
    errors.push(`Invalid PDF format: ${config.pdf.format}`);
  }

  // Validate Mermaid theme
  const validThemes = ['default', 'forest', 'dark', 'neutral', 'base'];
  if (config.mermaid?.theme && !validThemes.includes(config.mermaid.theme)) {
    errors.push(`Invalid Mermaid theme: ${config.mermaid.theme}`);
  }

  // Validate scale
  if (config.pdf?.scale !== undefined) {
    if (config.pdf.scale < 0.1 || config.pdf.scale > 2) {
      errors.push('PDF scale must be between 0.1 and 2');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
