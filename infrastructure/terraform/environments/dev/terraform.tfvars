# Environment Identifier
# Version: 1.0.0
environment = "dev"

# Network Configuration
vpc_cidr = "10.0.0.0/16"

# EKS Cluster Configuration
cluster_name = "habit-tracker-dev"

# Development-optimized EKS node group with cost-effective settings
eks_node_groups = {
  general = {
    instance_types = ["t3.medium"]  # Cost-effective instance type for development
    min_size      = 2               # Reduced redundancy for dev environment
    max_size      = 5               # Allow for testing scaling scenarios
    desired_size  = 2               # Minimal running nodes for cost optimization
    disk_size     = 20             # Minimal storage for development workloads
  }
}

# RDS Database Configuration - Development Optimized
db_instance_class    = "db.t3.medium"     # Cost-effective instance for development
db_allocated_storage = 20                 # Minimal storage for development data

# Redis Cache Configuration - Development Optimized
redis_node_type       = "cache.t3.micro"  # Minimal cache instance for development
redis_num_cache_nodes = 2                 # Reduced redundancy for development

# Domain Configuration
domain_name = "dev.habit-tracker.com"

# Backup Configuration - Reduced for Development
backup_retention_period = 3               # Minimal backup retention for dev environment

# Monitoring Configuration
monitoring_interval = 60                  # Standard monitoring interval for development

# Additional Tags
tags = {
  Project     = "habit-tracker"
  ManagedBy   = "terraform"
  Environment = "dev"
  Purpose     = "development"
  CostCenter  = "engineering"
}

# Development-specific settings
multi_az = false                         # Disable Multi-AZ for cost savings in development