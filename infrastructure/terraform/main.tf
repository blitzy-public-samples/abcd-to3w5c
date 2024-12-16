# Main Terraform configuration for Habit Tracking Application
# Version: 1.0.0

# Required provider configurations
terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket         = "habit-tracker-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# VPC Module - Network Infrastructure
module "vpc" {
  source = "./vpc"

  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]
  
  enable_flow_logs    = true
  enable_nat_gateway  = true
  
  tags = merge(var.tags, {
    Component = "networking"
  })
}

# EKS Module - Kubernetes Cluster
module "eks" {
  source = "./eks"

  cluster_name        = var.cluster_name
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  node_groups        = var.eks_node_groups
  kubernetes_version = "1.24"
  
  enable_cluster_autoscaler = true
  enable_metrics_server     = true
  
  tags = merge(var.tags, {
    Component = "container-orchestration"
  })
}

# RDS Module - Database
module "rds" {
  source = "./rds"

  environment            = var.environment
  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.private_subnet_ids
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  multi_az             = var.multi_az
  backup_retention_period = var.backup_retention_period
  
  enable_performance_insights = true
  storage_encrypted         = true
  
  tags = merge(var.tags, {
    Component = "database"
  })
}

# ElastiCache Module - Redis Cluster
module "elasticache" {
  source = "./elasticache"

  environment               = var.environment
  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnet_ids
  node_type                = var.redis_node_type
  num_cache_nodes          = var.redis_num_cache_nodes
  automatic_failover_enabled = true
  multi_az_enabled         = true
  
  tags = merge(var.tags, {
    Component = "cache"
  })
}

# Route53 Module - DNS Management
module "route53" {
  source = "./route53"

  domain_name         = var.domain_name
  environment         = var.environment
  enable_health_checks = true
  enable_dnssec       = true
  
  tags = merge(var.tags, {
    Component = "dns"
  })
}

# CloudFront Module - CDN
module "cloudfront" {
  source = "./cloudfront"

  domain_name = var.domain_name
  environment = var.environment
  enable_waf  = true
  price_class = "PriceClass_200"
  
  tags = merge(var.tags, {
    Component = "cdn"
  })
}

# Outputs for other configurations
output "eks_cluster_endpoint" {
  description = "Endpoint for EKS cluster"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "rds_endpoint" {
  description = "Endpoint for RDS instance"
  value       = module.rds.endpoint
  sensitive   = true
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

output "cloudfront_distribution_id" {
  description = "ID of CloudFront distribution"
  value       = module.cloudfront.distribution_id
}

output "redis_endpoint" {
  description = "Endpoint for Redis cluster"
  value       = module.elasticache.endpoint
  sensitive   = true
}