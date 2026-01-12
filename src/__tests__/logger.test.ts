/**
 * Tests for Logger
 */

import { Logger, createLogger } from '../logger';

describe('Logger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('debug', () => {
    it('should not log in non-verbose mode', () => {
      const logger = new Logger(false);
      logger.debug('test message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log in verbose mode', () => {
      const logger = new Logger(true);
      logger.debug('test message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      const logger = new Logger();
      logger.info('test info');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('test info')
      );
    });
  });

  describe('success', () => {
    it('should log success messages', () => {
      const logger = new Logger();
      logger.success('test success');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('test success')
      );
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      const logger = new Logger();
      logger.warn('test warning');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error messages to stderr', () => {
      const logger = new Logger();
      logger.error('test error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('setVerbose', () => {
    it('should enable verbose mode', () => {
      const logger = new Logger(false);
      logger.setVerbose(true);
      logger.debug('test');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('should route to correct method based on level', () => {
      const logger = new Logger(true);

      logger.log('debug', 'debug msg');
      logger.log('info', 'info msg');
      logger.log('success', 'success msg');
      logger.log('warn', 'warn msg');
      logger.log('error', 'error msg');

      expect(consoleSpy.log).toHaveBeenCalledTimes(4);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });
});

describe('createLogger', () => {
  it('should create logger with default verbose false', () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should create logger with verbose true', () => {
    const logger = createLogger(true);
    expect(logger).toBeInstanceOf(Logger);
  });
});
