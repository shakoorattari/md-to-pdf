/**
 * Tests for Config module
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import * as tmp from 'tmp-promise';
import {
  loadConfig,
  mergeConfig,
  createDefaultConfig,
  validateConfig,
} from '../config';
import { ConfigFile, ConversionOptions } from '../types';

describe('Config', () => {
  let tmpDir: tmp.DirectoryResult;

  beforeEach(async () => {
    tmpDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tmpDir.cleanup();
  });

  describe('loadConfig', () => {
    it('should load config from specified path', async () => {
      const config: ConfigFile = {
        pdf: { format: 'Letter' },
      };
      const configPath = path.join(tmpDir.path, 'test-config.json');
      await fs.writeJson(configPath, config);

      const loaded = await loadConfig(configPath);
      expect(loaded?.pdf?.format).toBe('Letter');
    });

    it('should return null for non-existent config', async () => {
      const loaded = await loadConfig('/non/existent/path.json');
      expect(loaded).toBeNull();
    });

    it('should search for config file in directory', async () => {
      const config: ConfigFile = {
        mermaid: { theme: 'forest' },
      };
      const configPath = path.join(tmpDir.path, 'md2pdf.config.json');
      await fs.writeJson(configPath, config);

      const loaded = await loadConfig(undefined, tmpDir.path);
      expect(loaded?.mermaid?.theme).toBe('forest');
    });
  });

  describe('mergeConfig', () => {
    it('should merge file config with CLI options', () => {
      const fileConfig: ConfigFile = {
        pdf: { format: 'A4', landscape: false },
        mermaid: { theme: 'default' },
      };

      const cliOptions: Partial<ConversionOptions> = {
        pdf: { landscape: true },
        verbose: true,
      };

      const merged = mergeConfig(fileConfig, cliOptions);

      expect(merged.pdf?.format).toBe('A4'); // From file
      expect(merged.pdf?.landscape).toBe(true); // Overridden by CLI
      expect(merged.mermaid?.theme).toBe('default'); // From file
      expect(merged.verbose).toBe(true); // From CLI
    });

    it('should handle null file config', () => {
      const cliOptions: Partial<ConversionOptions> = {
        input: 'test.md',
        output: 'test.pdf',
      };

      const merged = mergeConfig(null, cliOptions);

      expect(merged.input).toBe('test.md');
      expect(merged.output).toBe('test.pdf');
    });
  });

  describe('createDefaultConfig', () => {
    it('should create a default config file', async () => {
      await createDefaultConfig(tmpDir.path);

      const configPath = path.join(tmpDir.path, 'md2pdf.config.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.pdf).toBeDefined();
      expect(config.mermaid).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      const config: ConfigFile = {
        pdf: { format: 'A4', scale: 1 },
        mermaid: { theme: 'forest' },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid PDF format', () => {
      const config: ConfigFile = {
        pdf: { format: 'InvalidFormat' as any },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid PDF format: InvalidFormat');
    });

    it('should detect invalid Mermaid theme', () => {
      const config: ConfigFile = {
        mermaid: { theme: 'invalid' as any },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid Mermaid theme: invalid');
    });

    it('should detect invalid scale', () => {
      const config: ConfigFile = {
        pdf: { scale: 5 },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PDF scale must be between 0.1 and 2');
    });
  });
});
