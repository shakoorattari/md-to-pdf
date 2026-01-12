#!/usr/bin/env node
/**
 * md2pdf-mermaid - CLI Entry Point
 * A production-ready CLI tool for converting Markdown to PDF with Mermaid support
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import ora from 'ora';
import { createConverter } from './converter';
import { loadConfig, mergeConfig, createDefaultConfig } from './config';
import { createLogger } from './logger';
import { PdfFormat, ConversionOptions } from './types';

// Package info
const pkg = {
  name: 'md2pdf-mermaid',
  version: '1.0.0',
  description: 'Convert Markdown with Mermaid diagrams to PDF',
};

const program = new Command();

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version);

/**
 * Main convert command
 */
program
  .command('convert <input>')
  .alias('c')
  .description('Convert a markdown file to PDF')
  .option('-o, --output <path>', 'Output PDF path')
  .option('-f, --format <format>', 'Page format (A4, Letter, etc.)', 'A4')
  .option('--landscape', 'Use landscape orientation')
  .option('--margin-top <size>', 'Top margin (e.g., 20mm)', '20mm')
  .option('--margin-bottom <size>', 'Bottom margin', '20mm')
  .option('--margin-left <size>', 'Left margin', '15mm')
  .option('--margin-right <size>', 'Right margin', '15mm')
  .option('--theme <theme>', 'Mermaid theme (default, forest, dark, neutral)', 'default')
  .option('--css <path>', 'Custom CSS file path')
  .option('-c, --config <path>', 'Config file path')
  .option('--keep-intermediate', 'Keep intermediate files for debugging')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (input: string, options) => {
    const logger = createLogger(options.verbose);
    const spinner = ora({ text: 'Initializing...', isSilent: !process.stdout.isTTY });

    try {
      spinner.start();

      // Load config file
      const fileConfig = await loadConfig(options.config);

      // Build CLI options
      const cliOptions: Partial<ConversionOptions> = {
        input,
        output: options.output,
        verbose: options.verbose,
        keepIntermediate: options.keepIntermediate,
        pdf: {
          format: options.format as PdfFormat,
          landscape: options.landscape,
          margin: {
            top: options.marginTop,
            bottom: options.marginBottom,
            left: options.marginLeft,
            right: options.marginRight,
          },
        },
        mermaid: {
          theme: options.theme,
        },
        style: options.css ? { cssFile: options.css } : undefined,
      };

      // Merge configs
      const mergedOptions = mergeConfig(fileConfig, cliOptions);

      spinner.text = 'Converting...';

      // Create converter and run
      const converter = createConverter(mergedOptions);
      const result = await converter.convert(input, options.output);

      if (result.success) {
        spinner.succeed(`PDF created: ${path.basename(result.outputFile ?? '')}`);
        if (result.diagramCount && result.diagramCount > 0) {
          logger.info(`Processed ${result.diagramCount} Mermaid diagram(s)`);
        }
        logger.info(`Time: ${result.duration}ms`);
      } else {
        spinner.fail(`Conversion failed: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

/**
 * Batch convert command
 */
program
  .command('batch <patterns...>')
  .alias('b')
  .description('Convert multiple markdown files')
  .option('-o, --output-dir <dir>', 'Output directory for PDFs')
  .option('--concurrency <num>', 'Max concurrent conversions', '3')
  .option('--continue-on-error', 'Continue even if some files fail')
  .option('-f, --format <format>', 'Page format', 'A4')
  .option('--theme <theme>', 'Mermaid theme', 'default')
  .option('-c, --config <path>', 'Config file path')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (patterns: string[], options) => {
    const logger = createLogger(options.verbose);

    try {
      logger.banner('MD2PDF Batch Conversion');

      // Load config file
      const fileConfig = await loadConfig(options.config);

      // Build options
      const mergedOptions = mergeConfig(fileConfig, {
        verbose: options.verbose,
        pdf: { format: options.format as PdfFormat },
        mermaid: { theme: options.theme },
      });

      const converter = createConverter(mergedOptions);

      const result = await converter.batchConvert({
        patterns,
        outputDir: options.outputDir,
        concurrency: parseInt(options.concurrency, 10),
        continueOnError: options.continueOnError,
      });

      logger.divider();
      logger.info(`Total: ${result.total}`);
      logger.success(`Successful: ${result.successful}`);
      if (result.failed > 0) {
        logger.error(`Failed: ${result.failed}`);
      }
      logger.info(`Time: ${result.totalDuration}ms`);

      if (result.failed > 0 && !options.continueOnError) {
        process.exit(1);
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

/**
 * Watch command
 */
program
  .command('watch <patterns...>')
  .alias('w')
  .description('Watch files and auto-convert on changes')
  .option('-o, --output-dir <dir>', 'Output directory for PDFs')
  .option('-d, --debounce <ms>', 'Debounce delay in milliseconds', '500')
  .option('-f, --format <format>', 'Page format', 'A4')
  .option('--theme <theme>', 'Mermaid theme', 'default')
  .option('-c, --config <path>', 'Config file path')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (patterns: string[], options) => {
    const logger = createLogger(options.verbose);

    try {
      logger.banner('MD2PDF Watch Mode');
      logger.info('Press Ctrl+C to stop');
      logger.blank();

      // Load config file
      const fileConfig = await loadConfig(options.config);

      // Build options
      const mergedOptions = mergeConfig(fileConfig, {
        verbose: options.verbose,
        pdf: { format: options.format as PdfFormat },
        mermaid: { theme: options.theme },
      });

      const converter = createConverter(mergedOptions);

      const watcher = converter.watch({
        patterns,
        outputDir: options.outputDir,
        debounce: parseInt(options.debounce, 10),
      });

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        logger.blank();
        await watcher.close();
        process.exit(0);
      });
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

/**
 * Init command - create config file
 */
program
  .command('init')
  .description('Create a default configuration file')
  .option('-d, --dir <path>', 'Directory to create config in', '.')
  .action(async (options) => {
    const logger = createLogger(true);

    try {
      const configPath = path.resolve(options.dir, 'md2pdf.config.json');

      if (await fs.pathExists(configPath)) {
        logger.warn('Config file already exists: md2pdf.config.json');
        return;
      }

      await createDefaultConfig(options.dir);
      logger.success('Created: md2pdf.config.json');
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Parse and execute
program.parse();
