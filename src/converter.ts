/**
 * md2pdf-mermaid - Main converter module
 * Orchestrates the full conversion from markdown to PDF with Mermaid support
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';
import * as tmp from 'tmp-promise';
import chokidar from 'chokidar';
import {
  ConversionOptions,
  ConversionResult,
  BatchConversionOptions,
  BatchConversionResult,
  WatchOptions,
} from './types';
import { MermaidProcessor, createMermaidProcessor } from './mermaid-processor';
import { PdfGenerator, createPdfGenerator } from './pdf-generator';
import { Logger } from './logger';

/**
 * Main Converter class
 */
export class Converter {
  private logger: Logger;
  private mermaidProcessor: MermaidProcessor;
  private pdfGenerator: PdfGenerator;

  constructor(private options: Partial<ConversionOptions> = {}) {
    this.logger = new Logger(options.verbose ?? false);
    this.mermaidProcessor = createMermaidProcessor(options.mermaid);
    this.pdfGenerator = createPdfGenerator(options.pdf, options.style);
  }

  /**
   * Convert a single markdown file to PDF
   */
  async convert(inputPath: string, outputPath?: string): Promise<ConversionResult> {
    const startTime = Date.now();
    const resolvedInput = path.resolve(inputPath);

    // Determine output path
    const resolvedOutput = outputPath
      ? path.resolve(outputPath)
      : resolvedInput.replace(/\.md$/i, '.pdf');

    this.logger.info(`Converting: ${path.basename(resolvedInput)}`);

    try {
      // Verify input file exists
      if (!(await fs.pathExists(resolvedInput))) {
        throw new Error(`Input file not found: ${resolvedInput}`);
      }

      // Read markdown content
      const content = await fs.readFile(resolvedInput, 'utf-8');

      // Create temp directory for processing
      const tmpDir = await tmp.dir({ unsafeCleanup: true });
      const workDir = tmpDir.path;

      // Copy input file to temp directory
      const tempInputPath = path.join(workDir, path.basename(resolvedInput));
      const baseFileName = path.basename(resolvedInput, path.extname(resolvedInput));

      // Process Mermaid diagrams
      this.logger.debug('Processing Mermaid diagrams...');
      const { processedContent, diagramCount, errors } =
        await this.mermaidProcessor.processMarkdown(content, workDir, baseFileName);

      if (errors.length > 0) {
        this.logger.warn(`Diagram warnings: ${errors.join(', ')}`);
      }

      this.logger.info(`Processed ${diagramCount} diagram(s)`);

      // Write processed markdown to temp file
      await fs.writeFile(tempInputPath, processedContent, 'utf-8');

      // Copy any local images referenced in the original markdown
      const inputDir = path.dirname(resolvedInput);
      await this.copyLocalAssets(content, inputDir, workDir);

      // Generate PDF
      this.logger.debug('Generating PDF...');
      const result = await this.pdfGenerator.generate(tempInputPath, resolvedOutput);

      if (!result.success) {
        throw new Error(result.error ?? 'PDF generation failed');
      }

      // Cleanup temp directory unless keeping intermediate files
      if (!this.options.keepIntermediate) {
        await tmpDir.cleanup();
      } else {
        this.logger.info(`Intermediate files kept at: ${workDir}`);
      }

      const duration = Date.now() - startTime;
      this.logger.success(`Created: ${path.basename(resolvedOutput)} (${duration}ms)`);

      return {
        success: true,
        inputFile: resolvedInput,
        outputFile: resolvedOutput,
        duration,
        diagramCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to convert ${path.basename(resolvedInput)}: ${errorMessage}`);

      return {
        success: false,
        inputFile: resolvedInput,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    } finally {
      await this.mermaidProcessor.cleanup();
    }
  }

  /**
   * Copy local assets (images) to the working directory
   */
  private async copyLocalAssets(
    content: string,
    sourceDir: string,
    targetDir: string
  ): Promise<void> {
    // Match markdown image syntax: ![alt](path)
    const imageRegex = /!\[.*?\]\(([^)]+)\)/g;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      const imagePath = match[1];
      if (!imagePath) continue;

      // Skip URLs and data URIs
      if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
        continue;
      }

      const sourcePath = path.resolve(sourceDir, imagePath);
      const targetPath = path.join(targetDir, path.basename(imagePath));

      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, targetPath);
        this.logger.debug(`Copied asset: ${path.basename(imagePath)}`);
      }
    }
  }

  /**
   * Batch convert multiple files
   */
  async batchConvert(options: BatchConversionOptions): Promise<BatchConversionResult> {
    const startTime = Date.now();
    const patterns = Array.isArray(options.patterns) ? options.patterns : [options.patterns];

    // Find all matching files
    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { absolute: true });
      files.push(...matches);
    }

    // Remove duplicates
    const uniqueFiles = [...new Set(files)];

    this.logger.info(`Found ${uniqueFiles.length} file(s) to convert`);

    const results: ConversionResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process files with concurrency limit
    const concurrency = options.concurrency ?? 3;
    const chunks = this.chunkArray(uniqueFiles, concurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (file) => {
          const outputPath = options.outputDir
            ? path.join(
                options.outputDir,
                path.basename(file).replace(/\.md$/i, '.pdf')
              )
            : undefined;

          return this.convert(file, outputPath);
        })
      );

      for (const result of chunkResults) {
        results.push(result);
        if (result.success) {
          successful++;
        } else {
          failed++;
          if (!options.continueOnError) {
            break;
          }
        }
      }

      if (!options.continueOnError && failed > 0) {
        break;
      }
    }

    const totalDuration = Date.now() - startTime;
    this.logger.info(
      `Batch complete: ${successful} succeeded, ${failed} failed (${totalDuration}ms)`
    );

    return {
      total: uniqueFiles.length,
      successful,
      failed,
      results,
      totalDuration,
    };
  }

  /**
   * Watch files for changes and auto-convert
   */
  watch(options: WatchOptions): {
    close: () => Promise<void>;
  } {
    const patterns = Array.isArray(options.patterns) ? options.patterns : [options.patterns];
    const debounce = options.debounce ?? 500;
    const timers = new Map<string, NodeJS.Timeout>();

    this.logger.info(`Watching for changes: ${patterns.join(', ')}`);

    const watcher = chokidar.watch(patterns, {
      persistent: true,
      ignoreInitial: true,
    });

    const handleChange = (filePath: string) => {
      // Debounce changes
      const existing = timers.get(filePath);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(async () => {
        timers.delete(filePath);
        this.logger.info(`File changed: ${path.basename(filePath)}`);

        const outputPath = options.outputDir
          ? path.join(
              options.outputDir,
              path.basename(filePath).replace(/\.md$/i, '.pdf')
            )
          : undefined;

        await this.convert(filePath, outputPath);
      }, debounce);

      timers.set(filePath, timer);
    };

    watcher.on('change', handleChange);
    watcher.on('add', handleChange);

    return {
      close: async () => {
        await watcher.close();
        for (const timer of timers.values()) {
          clearTimeout(timer);
        }
        timers.clear();
        this.logger.info('Stopped watching');
      },
    };
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Factory function to create a Converter instance
 */
export function createConverter(options?: Partial<ConversionOptions>): Converter {
  return new Converter(options);
}

/**
 * Convenience function for quick single-file conversion
 */
export async function convertMarkdownToPdf(
  inputPath: string,
  outputPath?: string,
  options?: Partial<ConversionOptions>
): Promise<ConversionResult> {
  const converter = createConverter(options);
  return converter.convert(inputPath, outputPath);
}
