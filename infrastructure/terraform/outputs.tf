# Output variables for Habit Tracking Application Infrastructure
# AWS Provider Version: ~> 4.0

# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
  sensitive   = false
}

output "private_subnet_ids" {
  description = "List of private subnet IDs for EKS and RDS deployment"
  value       = module.vpc.private_subnet_ids
  sensitive   = false
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for load balancers"
  value       = module.vpc.public_subnet_ids
  sensitive   = false
}

# EKS Cluster Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint for EKS cluster access"
  value       = module.eks.cluster_endpoint
  sensitive   = false
}

output "eks_cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  value       = module.eks.cluster_security_group_id
  sensitive   = false
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
  sensitive   = false
}

output "eks_cluster_version" {
  description = "Kubernetes version of the EKS cluster"
  value       = module.eks.cluster_version
  sensitive   = false
}

# Database Outputs
output "rds_endpoint" {
  description = "Endpoint for RDS PostgreSQL instance"
  value       = module.rds.endpoint
  sensitive   = true # Marked sensitive as it contains connection information
}

output "rds_port" {
  description = "Port number for RDS PostgreSQL instance"
  value       = module.rds.port
  sensitive   = true
}

# Cache Outputs
output "redis_endpoint" {
  description = "Endpoint for Redis cluster"
  value       = module.elasticache.endpoint
  sensitive   = true # Marked sensitive as it contains connection information
}

output "redis_port" {
  description = "Port number for Redis cluster"
  value       = module.elasticache.port
  sensitive   = true
}

# CDN Outputs
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.cloudfront.distribution_id
  sensitive   = false
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.cloudfront.domain_name
  sensitive   = false
}

# DNS Outputs
output "route53_zone_id" {
  description = "ID of the Route53 hosted zone"
  value       = module.route53.zone_id
  sensitive   = false
}

output "application_domain" {
  description = "Domain name for the application"
  value       = var.domain_name
  sensitive   = false
}

# Monitoring Outputs
output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group for application logs"
  value       = module.monitoring.log_group_name
  sensitive   = false
}

output "prometheus_endpoint" {
  description = "Endpoint for Prometheus monitoring"
  value       = module.monitoring.prometheus_endpoint
  sensitive   = true
}

# High Availability Information
output "availability_zones" {
  description = "List of availability zones used by the infrastructure"
  value       = data.aws_availability_zones.available.names
  sensitive   = false
}

output "environment" {
  description = "Current deployment environment"
  value       = var.environment
  sensitive   = false
}

# Tags Output
output "common_tags" {
  description = "Common tags applied to all resources"
  value       = var.tags
  sensitive   = false
}