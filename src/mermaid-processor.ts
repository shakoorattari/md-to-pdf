/**
 * md2pdf-mermaid - Mermaid diagram processor
 * Handles extraction and rendering of Mermaid diagrams from markdown
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp-promise';
import { MermaidOptions } from './types';

const execAsync = promisify(exec);

/**
 * Regex patterns for Mermaid code blocks
 */
const MERMAID_PATTERNS = {
  // Standard markdown code fence
  codeFence: /```mermaid\s*\n([\s\S]*?)```/g,
  // Azure DevOps/GitHub wiki format
  tripleColon: /:::mermaid\s*\n([\s\S]*?):::/g,
};

/**
 * Represents a found Mermaid diagram in the markdown
 */
interface MermaidDiagram {
  /** Full match including delimiters */
  fullMatch: string;
  /** Diagram code only */
  code: string;
  /** Start index in the original text */
  startIndex: number;
  /** End index in the original text */
  endIndex: number;
}

/**
 * MermaidProcessor class for handling Mermaid diagrams
 */
export class MermaidProcessor {
  private options: Required<MermaidOptions>;
  private tempDir: string | null = null;

  constructor(options: MermaidOptions = {}) {
    this.options = {
      theme: options.theme ?? 'default',
      backgroundColor: options.backgroundColor ?? 'transparent',
      width: options.width ?? 800,
      height: options.height ?? 600,
      outputFormat: options.outputFormat ?? 'png',
      puppeteerConfig: options.puppeteerConfig ?? {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    };
  }

  /**
   * Extract all Mermaid diagrams from markdown content
   */
  extractDiagrams(content: string): MermaidDiagram[] {
    const diagrams: MermaidDiagram[] = [];

    // Process both patterns
    for (const [, pattern] of Object.entries(MERMAID_PATTERNS)) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(content)) !== null) {
        diagrams.push({
          fullMatch: match[0],
          code: match[1]?.trim() ?? '',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    // Sort by start index
    diagrams.sort((a, b) => a.startIndex - b.startIndex);

    return diagrams;
  }

  /**
   * Create Mermaid CLI configuration file
   */
  private async createMermaidConfig(configPath: string): Promise<void> {
    const config = {
      theme: this.options.theme,
      backgroundColor: this.options.backgroundColor,
    };

    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  /**
   * Create Puppeteer configuration file
   */
  private async createPuppeteerConfig(configPath: string): Promise<void> {
    const config = {
      headless: this.options.puppeteerConfig.headless ?? 'new',
      args: this.options.puppeteerConfig.args ?? [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    };

    if (this.options.puppeteerConfig.executablePath) {
      (config as Record<string, unknown>).executablePath =
        this.options.puppeteerConfig.executablePath;
    }

    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  /**
   * Render a single Mermaid diagram to an image file
   */
  async renderDiagram(
    code: string,
    outputPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create temp directory if not exists
      if (!this.tempDir) {
        const tmpResult = await tmp.dir({ unsafeCleanup: true });
        this.tempDir = tmpResult.path;
      }

      // Write diagram code to temp file
      const inputPath = path.join(this.tempDir, `diagram-${Date.now()}.mmd`);
      await fs.writeFile(inputPath, code, 'utf-8');

      // Create config files
      const mermaidConfigPath = path.join(this.tempDir, 'mermaid-config.json');
      const puppeteerConfigPath = path.join(
        this.tempDir,
        'puppeteer-config.json'
      );
      await this.createMermaidConfig(mermaidConfigPath);
      await this.createPuppeteerConfig(puppeteerConfigPath);

      // Build mmdc command
      const args = [
        '-i',
        inputPath,
        '-o',
        outputPath,
        '-c',
        mermaidConfigPath,
        '-p',
        puppeteerConfigPath,
        '-w',
        String(this.options.width),
        '-b',
        this.options.backgroundColor,
      ];

      if (this.options.outputFormat === 'svg') {
        args.push('-e', 'svg');
      }

      const command = `npx mmdc ${args.map((a) => `"${a}"`).join(' ')}`;

      await execAsync(command, {
        timeout: 60000, // 60 second timeout
      });

      // Verify output was created
      if (await fs.pathExists(outputPath)) {
        return { success: true };
      } else {
        return { success: false, error: 'Output file was not created' };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process markdown content, replacing Mermaid diagrams with images
   */
  async processMarkdown(
    content: string,
    outputDir: string,
    baseFileName: string
  ): Promise<{
    processedContent: string;
    diagramCount: number;
    errors: string[];
  }> {
    const diagrams = this.extractDiagrams(content);
    const errors: string[] = [];
    let processedContent = content;
    let offset = 0;

    for (let i = 0; i < diagrams.length; i++) {
      const diagram = diagrams[i];
      if (!diagram) continue;

      const imageName = `${baseFileName}-diagram-${i + 1}.${this.options.outputFormat}`;
      const imagePath = path.join(outputDir, imageName);

      const result = await this.renderDiagram(diagram.code, imagePath);

      if (result.success) {
        // Replace diagram with image reference
        const imageMarkdown = `![Diagram ${i + 1}](./${imageName})`;
        const adjustedStart = diagram.startIndex + offset;
        const adjustedEnd = diagram.endIndex + offset;

        processedContent =
          processedContent.substring(0, adjustedStart) +
          imageMarkdown +
          processedContent.substring(adjustedEnd);

        offset += imageMarkdown.length - diagram.fullMatch.length;
      } else {
        errors.push(`Diagram ${i + 1}: ${result.error}`);
      }
    }

    return {
      processedContent,
      diagramCount: diagrams.length,
      errors,
    };
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    if (this.tempDir && (await fs.pathExists(this.tempDir))) {
      await fs.remove(this.tempDir);
      this.tempDir = null;
    }
  }
}

/**
 * Factory function to create a MermaidProcessor instance
 */
export function createMermaidProcessor(
  options?: MermaidOptions
): MermaidProcessor {
  return new MermaidProcessor(options);
}
