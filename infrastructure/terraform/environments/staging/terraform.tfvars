# Staging Environment Configuration
# Version: 1.0.0
# Purpose: Defines infrastructure parameters for pre-production testing environment

# Environment Identifier
environment = "staging"

# Network Configuration
vpc_cidr = "10.0.0.0/16"  # Dedicated CIDR range for staging environment

# EKS Cluster Configuration
cluster_name = "habit-tracker-staging"
eks_node_groups = {
  general = {
    instance_types = ["t3.large"]  # Production-like instance type for testing
    min_size      = 3             # Minimum nodes for high availability
    max_size      = 7             # Maximum nodes for scalability testing
    desired_size  = 3             # Initial node count
    disk_size     = 50            # Storage per node in GB
  }
}

# Database Configuration
db_instance_class    = "db.t3.large"     # Moderate performance instance for testing production loads
db_allocated_storage = 50                # Sufficient storage for comprehensive testing
multi_az            = true              # Enable Multi-AZ for high availability testing

# Redis Cache Configuration
redis_node_type       = "cache.t3.medium"  # Balanced performance for staging workloads
redis_num_cache_nodes = 3                  # Minimum nodes for HA testing

# Domain Configuration
domain_name = "staging.habit-tracker.com"  # Staging-specific subdomain

# State Management
terraform_state_bucket = "habit-tracker-terraform-state-staging"
terraform_lock_table   = "habit-tracker-terraform-lock-staging"

# Backup Configuration
backup_retention_period = 7  # Weekly backup retention for staging

# Resource Tags
tags = {
  Environment = "staging"
  Project     = "habit-tracker"
  ManagedBy   = "terraform"
  Team        = "platform"
  Purpose     = "pre-production"
  CostCenter  = "engineering"
}