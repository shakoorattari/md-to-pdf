/**
 * Tests for MermaidProcessor
 */

import * as tmp from 'tmp-promise';
import { MermaidProcessor, createMermaidProcessor } from '../mermaid-processor';

describe('MermaidProcessor', () => {
  let processor: MermaidProcessor;
  let tmpDir: tmp.DirectoryResult;

  beforeEach(async () => {
    processor = createMermaidProcessor();
    tmpDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await processor.cleanup();
    await tmpDir.cleanup();
  });

  describe('extractDiagrams', () => {
    it('should extract diagrams with code fence syntax', () => {
      const content = `
# Test Document

Some text here.

\`\`\`mermaid
flowchart TD
    A --> B
\`\`\`

More text.
`;

      const diagrams = processor.extractDiagrams(content);
      expect(diagrams).toHaveLength(1);
      expect(diagrams[0]?.code).toContain('flowchart TD');
    });

    it('should extract diagrams with triple-colon syntax', () => {
      const content = `
# Test Document

:::mermaid
sequenceDiagram
    A->>B: Hello
:::

More text.
`;

      const diagrams = processor.extractDiagrams(content);
      expect(diagrams).toHaveLength(1);
      expect(diagrams[0]?.code).toContain('sequenceDiagram');
    });

    it('should extract multiple diagrams', () => {
      const content = `
\`\`\`mermaid
flowchart TD
    A --> B
\`\`\`

Some text.

:::mermaid
sequenceDiagram
    A->>B: Hello
:::
`;

      const diagrams = processor.extractDiagrams(content);
      expect(diagrams).toHaveLength(2);
    });

    it('should return empty array for content without diagrams', () => {
      const content = `
# Just Markdown

No diagrams here.
`;

      const diagrams = processor.extractDiagrams(content);
      expect(diagrams).toHaveLength(0);
    });
  });

  describe('processMarkdown', () => {
    it('should process markdown and replace diagrams with images', async () => {
      const content = `
# Test

\`\`\`mermaid
flowchart TD
    A["Start"] --> B["End"]
\`\`\`
`;

      const result = await processor.processMarkdown(
        content,
        tmpDir.path,
        'test'
      );

      expect(result.diagramCount).toBe(1);
      expect(result.processedContent).toContain('![Diagram 1]');
      expect(result.processedContent).not.toContain('```mermaid');
    }, 30000);

    it('should handle content with no diagrams', async () => {
      const content = '# No diagrams here';

      const result = await processor.processMarkdown(
        content,
        tmpDir.path,
        'test'
      );

      expect(result.diagramCount).toBe(0);
      expect(result.processedContent).toBe(content);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('createMermaidProcessor', () => {
  it('should create processor with default options', () => {
    const processor = createMermaidProcessor();
    expect(processor).toBeInstanceOf(MermaidProcessor);
  });

  it('should create processor with custom options', () => {
    const processor = createMermaidProcessor({
      theme: 'forest',
      width: 1024,
    });
    expect(processor).toBeInstanceOf(MermaidProcessor);
  });
});
