# Production Environment Configuration
# Version: 1.0.0
# Last Updated: 2024

# Environment Identifier
environment = "prod"

# Network Configuration
vpc_cidr = "10.0.0.0/16"  # Allows for up to 65,536 IP addresses

# EKS Cluster Configuration
cluster_name = "habit-tracker-prod"
eks_node_groups = {
  general = {
    instance_types = ["t3.xlarge"]  # Production-grade instance type for high performance
    min_size      = 3               # Minimum 3 nodes for high availability
    max_size      = 10              # Scale up to 10 nodes for peak loads
    desired_size  = 5               # Initial cluster size for production workload
    disk_size     = 100            # 100GB disk space per node
    
    # Node group specific tags
    labels = {
      "role"        = "general"
      "environment" = "prod"
    }
    
    # Taints to ensure critical workloads land on appropriate nodes
    taints = []
  }
}

# Database Configuration
db_instance_class    = "db.t3.xlarge"     # Production-grade instance for high performance
db_allocated_storage = 100                 # 100GB storage for production data
multi_az            = true                # Enable Multi-AZ for high availability

# Redis Cache Configuration
redis_node_type       = "cache.t3.large"   # Production-grade cache instances
redis_num_cache_nodes = 3                  # 3-node cluster for HA
redis_params = {
  maxmemory_policy = "volatile-lru"       # Eviction policy for production
  timeout          = 300                  # Connection timeout in seconds
}

# Domain Configuration
domain_name = "habit-tracker.com"

# Backup Configuration
backup_retention_period = 35               # Maximum retention for production backups

# State Management
terraform_state_bucket = "habit-tracker-terraform-state-prod"
terraform_lock_table   = "habit-tracker-terraform-lock-prod"

# Resource Tags
tags = {
  Environment     = "prod"
  Project         = "habit-tracker"
  ManagedBy       = "terraform"
  Team            = "platform"
  CostCenter      = "prod-infrastructure"
  BackupSchedule  = "daily"
  SecurityZone    = "production"
  ComplianceLevel = "high"
  DataClass       = "confidential"
}

# Performance & Monitoring
monitoring_retention_days = 90             # CloudWatch logs retention
enable_detailed_monitoring = true          # Enhanced EC2 monitoring
enable_performance_insights = true         # RDS performance insights

# Security Configuration
enable_encryption        = true            # Enable encryption at rest
enable_ssl_termination  = true            # Enable SSL termination at load balancer
enable_waf              = true            # Enable WAF for production

# High Availability Configuration
availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]  # Multi-AZ deployment