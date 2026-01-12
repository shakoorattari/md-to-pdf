/**
 * md2pdf-mermaid - Logger utility
 * Provides colored console output for CLI
 */

import chalk from 'chalk';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

/**
 * Logger class for consistent output formatting
 */
export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * Enable or disable verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Debug message (only shown in verbose mode)
   */
  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray(`  ${message}`));
    }
  }

  /**
   * Info message
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ') + ' ' + message);
  }

  /**
   * Success message
   */
  success(message: string): void {
    console.log(chalk.green('✔') + ' ' + message);
  }

  /**
   * Warning message
   */
  warn(message: string): void {
    console.log(chalk.yellow('⚠') + ' ' + chalk.yellow(message));
  }

  /**
   * Error message
   */
  error(message: string): void {
    console.error(chalk.red('✖') + ' ' + chalk.red(message));
  }

  /**
   * Blank line
   */
  blank(): void {
    console.log('');
  }

  /**
   * Print a header banner
   */
  banner(text: string): void {
    console.log('');
    console.log(chalk.bold.cyan(text));
    console.log(chalk.cyan('─'.repeat(text.length)));
    console.log('');
  }

  /**
   * Print a divider line
   */
  divider(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Print progress
   */
  progress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    const bar = this.createProgressBar(percentage);
    process.stdout.write(`\r${bar} ${percentage}% ${message}`);
    if (current === total) {
      console.log('');
    }
  }

  /**
   * Create a progress bar string
   */
  private createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 5);
    const empty = 20 - filled;
    return (
      chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
    );
  }

  /**
   * Log with a specific level
   */
  log(level: LogLevel, message: string): void {
    switch (level) {
      case 'debug':
        this.debug(message);
        break;
      case 'info':
        this.info(message);
        break;
      case 'success':
        this.success(message);
        break;
      case 'warn':
        this.warn(message);
        break;
      case 'error':
        this.error(message);
        break;
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(verbose = false): Logger {
  return new Logger(verbose);
}
