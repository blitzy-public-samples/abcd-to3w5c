# AWS ElastiCache Redis Configuration for Habit Tracking Application
# Version: ~> 4.0

# Redis subnet group for cluster placement
resource "aws_elasticache_subnet_group" "redis" {
  name        = "habit-tracker-redis-${var.environment}"
  subnet_ids  = var.private_subnet_ids
  description = "Subnet group for Redis cluster in ${var.environment} environment"

  tags = {
    Name        = "habit-tracker-redis-subnet-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Redis parameter group for performance optimization
resource "aws_elasticache_parameter_group" "redis" {
  family      = "redis6.x"
  name        = "habit-tracker-redis-params-${var.environment}"
  description = "Redis parameter group for ${var.environment} environment"

  # Performance and reliability parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Least Recently Used eviction policy
  }

  parameter {
    name  = "timeout"
    value = "300"  # Connection timeout in seconds
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"  # TCP keepalive interval
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"  # Sample size for LRU eviction
  }

  tags = {
    Name        = "habit-tracker-redis-params-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Redis replication group for high availability
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "habit-tracker-redis-${var.environment}"
  description         = "Redis cluster for habit tracking application"
  
  # Node configuration
  node_type           = var.redis_node_type
  num_cache_clusters  = var.redis_num_cache_nodes
  port                = 6379

  # Network configuration
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]

  # High availability settings
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Engine configuration
  engine                = "redis"
  engine_version        = "6.x"
  
  # Security settings
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  
  # Maintenance and backup
  maintenance_window         = "sun:05:00-sun:09:00"
  snapshot_window           = "00:00-04:00"
  snapshot_retention_limit  = 7
  
  # Update settings
  apply_immediately         = false
  auto_minor_version_upgrade = true

  tags = {
    Name        = "habit-tracker-redis-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Security group for Redis cluster
resource "aws_security_group" "redis" {
  name        = "habit-tracker-redis-sg-${var.environment}"
  description = "Security group for Redis cluster"
  vpc_id      = aws_vpc.main.id

  # Inbound rule for Redis port
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Redis port access from VPC"
  }

  # Outbound rule
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "habit-tracker-redis-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Output the Redis endpoint for application configuration
output "redis_endpoint" {
  description = "Redis cluster endpoint for application connection"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

# Output the Redis port for application configuration
output "redis_port" {
  description = "Redis cluster port number"
  value       = aws_elasticache_replication_group.redis.port
}