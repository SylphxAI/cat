# Contributing to @sylphx/logger

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) (latest version)
- Git

### Installation

```bash
git clone https://github.com/SylphxAi/logger.git
cd logger
bun install
```

## Development Workflow

### Commands

```bash
# Run tests
bun test

# Run benchmarks
bun run bench

# Check code quality (format + lint)
bun run check

# Format code
bun run format

# Lint code
bun run lint

# Build library
bun run build
```

### Project Structure

```
logger/
├── src/
│   ├── core/           # Core logger implementation
│   │   ├── types.ts    # Type definitions
│   │   └── logger.ts   # Logger class
│   ├── formatters/     # Log formatters
│   │   ├── json.ts     # JSON formatter
│   │   └── pretty.ts   # Pretty formatter
│   ├── transports/     # Output transports
│   │   ├── console.ts  # Console transport
│   │   ├── file.ts     # File transport
│   │   └── stream.ts   # Stream transport
│   └── plugins/        # Logger plugins
│       ├── context.ts  # Context plugin
│       └── sampling.ts # Sampling plugin
├── tests/              # Test files
├── benchmarks/         # Performance benchmarks
└── examples/           # Usage examples
```

## Code Guidelines

### Style

We use Biome for formatting and linting. Code is automatically checked in CI.

- Use tabs for indentation
- Use double quotes for strings
- Prefer `const` over `let`
- Use template literals for string interpolation

### TypeScript

- Prefer explicit types for public APIs
- Use type inference for internal implementation
- Export types alongside implementations

### Performance

- Minimize object allocations in hot paths
- Use fast-path filtering (check level before processing)
- Avoid string concatenation in favor of template literals
- Consider batching for high-throughput scenarios

### Testing

- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Test edge cases and error conditions

## Pull Request Process

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow code guidelines
   - Add tests
   - Update documentation

4. **Run checks**
   ```bash
   bun run check
   bun test
   bun run build
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: your feature description"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New features
   - `fix:` Bug fixes
   - `docs:` Documentation changes
   - `perf:` Performance improvements
   - `refactor:` Code refactoring
   - `test:` Test updates
   - `chore:` Build/tooling changes

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Describe your changes
   - Reference related issues
   - Ensure CI passes

## Adding Features

### New Formatter

1. Create `src/formatters/your-formatter.ts`
2. Implement `Formatter` interface
3. Export factory function
4. Add tests in `tests/formatters.test.ts`
5. Update `src/index.ts` exports
6. Add example in `examples/`

### New Transport

1. Create `src/transports/your-transport.ts`
2. Implement `Transport` interface
3. Export factory function
4. Add tests
5. Update exports
6. Add documentation

### New Plugin

1. Create `src/plugins/your-plugin.ts`
2. Implement `Plugin` interface
3. Export factory function
4. Add tests in `tests/plugins.test.ts`
5. Update exports
6. Document usage

## Release Process

We use Changesets for version management:

1. **Create a changeset**
   ```bash
   bun run changeset
   ```

2. **Version packages** (maintainers only)
   ```bash
   bun run version
   ```

3. **Publish** (maintainers only)
   ```bash
   bun run release
   ```

## Performance Benchmarks

When making performance-related changes, run benchmarks:

```bash
bun run bench
```

Expected baseline performance (M1 Pro):
- Filtered logs: ~26 ns/iter
- Basic logging: ~117 ns/iter
- With data: ~150 ns/iter

Ensure changes don't significantly regress performance.

## Questions?

- Open an issue for bug reports
- Start a discussion for feature requests
- Check existing issues before creating new ones

Thank you for contributing! 🎉
