# Contributing

Thank you for your interest in contributing to @sylphx/cat!

## Getting Started

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm
- Git

### Clone Repository

```bash
git clone https://github.com/SylphxAI/cat.git
cd cat
```

### Install Dependencies

```bash
bun install
# or
npm install
```

### Run Tests

```bash
bun test
# or
npm test
```

### Build

```bash
bun run build
# or
npm run build
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bugfix
```

### 2. Make Changes

Edit files in `src/`:
- `src/core/` - Core logger implementation
- `src/formatters/` - Log formatters
- `src/transports/` - Log transports
- `src/plugins/` - Plugins
- `src/serializers/` - Serializers
- `src/tracing/` - W3C Trace Context

### 3. Write Tests

Add tests in `tests/`:
```typescript
import { describe, it, expect } from 'bun:test'
import { createLogger } from '../src'

describe('MyFeature', () => {
  it('works correctly', () => {
    const logger = createLogger()
    logger.info('Test')
    expect(true).toBe(true)
  })
})
```

### 4. Run Tests

```bash
bun test
```

### 5. Build

```bash
bun run build
```

### 6. Commit

```bash
git add .
git commit -m "feat: add new feature"
```

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `chore:` - Build/tooling changes

### 7. Push and Create PR

```bash
git push origin feature/my-feature
```

Then create a pull request on GitHub.

## Code Style

### TypeScript

- Use TypeScript strict mode
- Export types for public API
- Avoid `any`, use `unknown` instead
- Use interfaces for object shapes

```typescript
// ✅ Good
interface LogEntry {
  level: LogLevel
  timestamp: number
  message: string
  data?: Record<string, unknown>
}

// ❌ Bad
type LogEntry = {
  level: any
  timestamp: any
  message: any
  data?: any
}
```

### Formatting

We use Prettier for code formatting:

```bash
bun run format
```

### Linting

We use ESLint:

```bash
bun run lint
```

## Testing

### Unit Tests

Test individual functions:

```typescript
import { generateTraceId } from '../src/tracing/context'

describe('generateTraceId', () => {
  it('generates valid trace ID', () => {
    const traceId = generateTraceId()
    expect(traceId).toMatch(/^[0-9a-f]{32}$/)
  })
})
```

### Integration Tests

Test full workflows:

```typescript
import { createLogger, otlpTransport } from '../src'

describe('OTLP integration', () => {
  it('sends logs to OTLP endpoint', async () => {
    const logger = createLogger({
      transports: [otlpTransport({ endpoint: 'http://localhost:4318/v1/logs' })]
    })

    logger.info('Test')
    await logger.flush()

    // Verify log was sent
  })
})
```

### Test Coverage

Aim for >90% code coverage:

```bash
bun test --coverage
```

## Documentation

### Code Comments

Add JSDoc comments for public API:

```typescript
/**
 * Create a new logger instance
 * @param options - Logger configuration options
 * @returns Logger instance
 */
export function createLogger(options?: LoggerOptions): Logger {
  // ...
}
```

### Markdown Docs

Update documentation in `docs/`:
- `docs/guide/` - User guides
- `docs/api/` - API reference
- `docs/examples/` - Examples

### Examples

Add examples in `examples/`:

```typescript
// examples/my-feature.ts
import { createLogger } from '../src'

const logger = createLogger()
logger.info('Example')
```

## Performance

### Benchmarks

Add benchmarks for performance-critical code:

```typescript
import { bench, run } from 'mitata'

bench('createLogger', () => {
  createLogger()
})

run()
```

### Profiling

Profile your changes:

```bash
node --prof examples/my-feature.ts
node --prof-process isolate-*.log
```

## Pull Request Guidelines

### PR Title

Use conventional commit format:
```
feat: add OTLP compression support
fix: correct trace ID validation
docs: update migration guide
```

### PR Description

Include:
- What changed
- Why it changed
- How to test it
- Breaking changes (if any)

### Checklist

- [ ] Tests pass
- [ ] Code is formatted
- [ ] Documentation updated
- [ ] Examples added (if applicable)
- [ ] No breaking changes (or documented)

## Areas to Contribute

### High Priority

- Additional transports (Syslog, CloudWatch, etc.)
- Performance optimizations
- Bug fixes
- Documentation improvements

### Medium Priority

- New plugins
- Enhanced formatters
- Additional serializers
- Test coverage improvements

### Low Priority

- Examples
- Tooling improvements
- Refactoring

## Community

### Discord

Join our Discord: https://discord.gg/sylphx

### Issues

Report bugs: https://github.com/SylphxAI/cat/issues

### Discussions

Ask questions: https://github.com/SylphxAI/cat/discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

Be respectful and constructive. We're all here to make @sylphx/cat better!

Thank you for contributing! 🐱
