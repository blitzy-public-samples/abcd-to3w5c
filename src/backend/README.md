# Habit Tracking System - Backend Services

<!-- toc generated using markdown-toc@1.2.0 -->

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Services](#services)
  * [API Gateway (Port 3000)](#api-gateway-port-3000)
  * [Auth Service (Port 3001)](#auth-service-port-3001)
  * [Habit Service (Port 3002)](#habit-service-port-3002)
  * [Analytics Service (Port 3003)](#analytics-service-port-3003)
  * [Notification Service (Port 3004)](#notification-service-port-3004)
- [Database](#database)
- [Caching](#caching)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Overview

The Habit Tracking System backend is built on a modern microservices architecture using Node.js 18.x LTS with TypeScript. The system is designed for scalability, maintainability, and high performance, featuring:

- RESTful API architecture with microservices design
- JWT-based authentication with OAuth 2.0 support
- PostgreSQL for persistent storage with Redis caching
- Comprehensive testing and monitoring setup
- Docker-based development and deployment workflow

## Prerequisites

- Node.js 18.x LTS
- npm 8.x or higher
- Docker Desktop 20.x or higher
- Docker Compose 2.x
- PostgreSQL 14.x (containerized)
- Redis 6.x (containerized)

## Project Structure

```
src/backend/
├── services/
│   ├── api-gateway/       # Central API routing and management
│   ├── auth-service/      # Authentication and authorization
│   ├── habit-service/     # Core habit tracking functionality
│   ├── analytics-service/ # Data processing and insights
│   └── notification-service/ # User notifications
├── shared/
│   ├── types/            # Shared TypeScript interfaces
│   ├── utils/            # Common utility functions
│   └── constants/        # Shared constants
├── docker/
│   ├── development/      # Development Docker configurations
│   └── production/       # Production Docker configurations
├── scripts/             # Build and deployment scripts
├── docker-compose.yml   # Local development orchestration
└── package.json         # Workspace and dependency management
```

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd src/backend
```

2. Install dependencies:
```bash
npm install
npm run bootstrap
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development environment:
```bash
docker-compose up
```

5. Verify the setup:
```bash
curl http://localhost:3000/health
```

## Development

### Local Development Workflow

1. Start services in development mode:
```bash
npm run dev
```

2. Watch for changes:
```bash
npm run dev:watch
```

3. Run tests:
```bash
npm run test
npm run test:watch
```

### Code Standards

- Follow TypeScript best practices
- Maintain 80% or higher test coverage
- Use ESLint and Prettier for code formatting
- Follow conventional commits specification

## Services

### API Gateway (Port 3000)

Central entry point for all client requests, providing:
- Request routing
- Rate limiting
- Authentication verification
- API documentation (Swagger)
- Response caching

### Auth Service (Port 3001)

Handles all authentication and authorization:
- JWT token management
- OAuth 2.0 integration
- Role-based access control
- MFA support
- Session management

### Habit Service (Port 3002)

Core business logic service:
- Habit CRUD operations
- Progress tracking
- Streak management
- Data validation
- PostgreSQL integration

### Analytics Service (Port 3003)

Data processing and insights:
- Progress calculations
- Trend analysis
- Achievement tracking
- Caching strategy
- Real-time updates

### Notification Service (Port 3004)

User communication management:
- Email notifications
- Achievement alerts
- Reminder system
- Template management
- Queue processing

## Database

### PostgreSQL Setup

- Connection pooling configuration
- Migration management
- Backup automation
- Replication setup
- Performance optimization

### Schema Management

- Version-controlled migrations
- Rollback procedures
- Data seeding
- Index optimization
- Audit logging

## Caching

### Redis Configuration

- Session storage
- Query caching
- Rate limiting
- Real-time updates
- Cache invalidation

### Caching Strategies

- Cache-aside pattern
- TTL configuration
- Cache warming
- Memory optimization
- Error handling

## Testing

### Test Types

- Unit tests (Jest)
- Integration tests
- API tests (Supertest)
- Load tests (Artillery)
- Security tests

### Coverage Requirements

- Minimum 80% code coverage
- Critical path testing
- Error scenario coverage
- Performance benchmarks
- Security scanning

## Deployment

### Environment Setup

- Production configuration
- Staging environment
- CI/CD pipeline
- Monitoring setup
- Backup procedures

### Deployment Process

1. Build services:
```bash
npm run build:all
```

2. Run security checks:
```bash
npm run security-check
```

3. Deploy services:
```bash
npm run deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes following conventional commits
4. Submit a pull request
5. Ensure CI checks pass

### Pull Request Guidelines

- Include test coverage
- Update documentation
- Follow code standards
- Add changelog entry
- Request code review

For detailed contribution guidelines, see CONTRIBUTING.md

---

For additional information or support, please contact the development team.