# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-14

### Added

- Initial release of @kylezhu/logger
- Core logger implementation with level system (trace, debug, info, warn, error, fatal)
- Fast-path level filtering for optimal performance
- JSON formatter for structured logging
- Pretty formatter with colors and timestamps
- Console transport for output
- File transport for persistent logs
- Stream transport for custom streams
- Context plugin for adding metadata
- Sampling plugin for reducing log volume
- Child logger support with context inheritance
- Batching support for high-throughput scenarios
- Full TypeScript support with type definitions
- Comprehensive test suite (18 tests)
- Performance benchmarks
- Examples (basic and advanced)
- CI/CD with GitHub Actions
- Changesets for version management

### Performance

- Filtered logs: ~26 ns/iter
- Basic logging: ~117 ns/iter
- Logging with data: ~150 ns/iter
- JSON formatter: ~169 ns/iter
- Pretty formatter: ~303 ns/iter

[0.1.0]: https://github.com/kylezhu/logger/releases/tag/v0.1.0
