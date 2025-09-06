# Contributing to myCobot Node.js Controller

Thank you for your interest in contributing to the myCobot Node.js Controller! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
- Use GitHub Issues to report bugs or request features
- Search existing issues before creating a new one
- Provide clear reproduction steps for bugs
- Include system information (Node.js version, OS, robot model)

### Submitting Changes
1. **Fork** the repository
2. **Create a branch** for your feature/fix
3. **Make your changes** following our coding standards
4. **Test your changes** with a real robot if possible
5. **Submit a pull request** with a clear description

## 🏗️ Development Setup

### Prerequisites
- Node.js 16.0.0 or higher
- npm or yarn package manager  
- myCobot 280 M5 robot (for testing)
- TypeScript knowledge

### Local Development
```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/mycobot-controller.git
cd mycobot-controller

# Install dependencies
npm install

# Build the project
npm run build

# Run examples (requires robot connection)
npm run demo
npm run detect-port
npm run test-connection
```

### Development Workflow
```bash
# Watch mode for development
npm run build:watch

# Type checking
npm run type-check

# Linting
npm run lint

# Clean build
npm run clean && npm run build
```

## 📋 Coding Standards

### Code Style
- Follow the existing code style (AirBnB TypeScript configuration)
- Use meaningful variable and function names
- Write JSDoc comments for public APIs
- Prefer explicit typing over `any`

### File Structure
```
src/
  lib/           # Core library code
  examples/      # Usage examples
  
dist/           # Compiled JavaScript (generated)
.github/        # GitHub Actions workflows
```

### TypeScript Guidelines
- Use strict TypeScript configuration
- Export types for public APIs
- Avoid `any` type usage
- Use readonly arrays for immutable data

## 🧪 Testing

### Manual Testing
- Test with actual myCobot 280 M5 hardware
- Verify all movement commands work correctly
- Test error handling scenarios
- Check cross-platform compatibility

### Before Submitting
- [ ] Code builds without errors (`npm run build`)
- [ ] TypeScript compiles cleanly (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Examples run successfully
- [ ] Documentation is updated if needed

## 📖 Documentation

### Code Documentation
- Use JSDoc comments for all public methods
- Include parameter descriptions and examples
- Document error conditions and exceptions

### README Updates
- Update usage examples if API changes
- Add new features to the feature list
- Update compatibility information

## 🔧 Hardware-Specific Contributions

### Robot Testing
- Test on actual myCobot 280 M5 hardware when possible
- Verify M5Stack firmware compatibility
- Document any firmware-specific behaviors

### Serial Protocol
- Changes to command IDs must match official protocol
- Test with different firmware versions if available
- Document protocol deviations or extensions

## 🚀 Release Process

### Version Management
- Use semantic versioning (semver)
- Update CHANGELOG.md for all changes
- Use conventional commit messages

### Publishing
- Maintainers handle npm publishing via GitHub Actions
- Releases are created automatically on merge to main
- Version bumps trigger new publications

## 🤔 Questions?

### Getting Help
- Check existing documentation first
- Search closed issues for similar questions
- Open a GitHub Discussion for general questions
- Open an Issue for specific bugs or features

### Communication
- Be respectful and constructive
- Provide context and examples
- Help others when possible

## 📜 License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

## 🙏 Recognition

Contributors will be recognized in:
- Git commit history
- GitHub contributors list
- Release notes for significant contributions

Thank you for helping make this project better! 🤖✨
