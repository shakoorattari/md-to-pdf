# Sample Document with Mermaid Diagrams

This is a sample markdown document demonstrating the md2pdf-mermaid converter.

## Flowchart Example

```mermaid
flowchart TD
    A["Start"] --> B{"Is it working?"}
    B -->|Yes| C["Great!"]
    B -->|No| D["Debug"]
    D --> B
    C --> E["End"]
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant C as CLI
    participant M as Mermaid
    participant P as PDF Generator

    U->>C: Run convert command
    C->>M: Extract diagrams
    M->>M: Render to PNG
    M-->>C: Return processed markdown
    C->>P: Generate PDF
    P-->>C: PDF created
    C-->>U: Success!
```

## Class Diagram

```mermaid
classDiagram
    class Converter {
        +convert(input, output)
        +batchConvert(options)
        +watch(patterns)
    }
    class MermaidProcessor {
        +extractDiagrams(content)
        +renderDiagram(code, path)
        +processMarkdown(content)
    }
    class PdfGenerator {
        +generate(markdown, output)
        +loadCustomStyles()
    }
    
    Converter --> MermaidProcessor
    Converter --> PdfGenerator
```

## Code Example

Here's some TypeScript code:

```typescript
import { convertMarkdownToPdf } from 'md2pdf-mermaid';

async function main() {
  const result = await convertMarkdownToPdf('document.md', 'output.pdf', {
    pdf: { format: 'A4' },
    mermaid: { theme: 'forest' },
  });
  
  console.log(`Success: ${result.success}`);
}

main();
```

## Table Example

| Feature | Status |
|---------|--------|
| Flowcharts | ✅ |
| Sequence Diagrams | ✅ |
| Class Diagrams | ✅ |
| Custom CSS | ✅ |
| Watch Mode | ✅ |

## Conclusion

This document demonstrates the capabilities of md2pdf-mermaid for converting markdown with diagrams to PDF.
