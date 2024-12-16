# Terraform variables for Habit Tracking Application Infrastructure
# Version: ~> 1.0

# Environment Configuration
variable "environment" {
  description = "Deployment environment (dev/staging/prod) with strict validation"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC network isolation"
  type        = string
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block"
  }
}

# EKS Cluster Configuration
variable "cluster_name" {
  description = "Name of the EKS cluster with environment prefix"
  type        = string
  default     = "habit-tracker-cluster"
}

variable "eks_node_groups" {
  description = "EKS node group configurations for high availability"
  type        = map(any)
  default = {
    general = {
      instance_types = ["t3.medium"]
      min_size      = 3
      max_size      = 10
      desired_size  = 3
      disk_size     = 50
    }
  }
  
  validation {
    condition     = alltrue([for k, v in var.eks_node_groups : v.min_size >= 3])
    error_message = "Node groups must have a minimum size of 3 for high availability"
  }
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance type for PostgreSQL database"
  type        = string
  default     = "db.t3.medium"
  
  validation {
    condition     = can(regex("^db\\.", var.db_instance_class))
    error_message = "DB instance class must start with 'db.'"
  }
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB (20-100)"
  type        = number
  default     = 20
  
  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 100
    error_message = "DB storage must be between 20 and 100 GB"
  }
}

# Redis Cache Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type for caching"
  type        = string
  default     = "cache.t3.medium"
  
  validation {
    condition     = can(regex("^cache\\.", var.redis_node_type))
    error_message = "Redis node type must start with 'cache.'"
  }
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster (3-5)"
  type        = number
  default     = 3
  
  validation {
    condition     = var.redis_num_cache_nodes >= 3 && var.redis_num_cache_nodes <= 5
    error_message = "Redis cluster must have 3-5 nodes for HA"
  }
}

# Domain Configuration
variable "domain_name" {
  description = "Domain name for the application (required)"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid DNS name"
  }
}

# Additional Tags
variable "tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default = {
    Project     = "habit-tracker"
    ManagedBy   = "terraform"
    Environment = "dev"
  }
}

# Backup Configuration
variable "backup_retention_period" {
  description = "Number of days to retain database backups (7-35)"
  type        = number
  default     = 7
  
  validation {
    condition     = var.backup_retention_period >= 7 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 7 and 35 days"
  }
}

# Multi-AZ Configuration
variable "multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}