# Terraform and provider version constraints for Habit Tracking application infrastructure
# Ensures consistent versions across deployments and team members

terraform {
  # Core Terraform version constraint
  # Using ~> 1.3.0 to match technical specification requirement for Terraform 1.3.x
  # This ensures compatibility with all infrastructure modules while preventing unexpected updates
  required_version = "~> 1.3.0"

  # Required provider versions with specific constraints to ensure compatibility
  required_providers {
    # AWS provider for core infrastructure components:
    # - EKS cluster management
    # - RDS PostgreSQL instances
    # - ElastiCache Redis clusters
    # - S3 buckets
    # - Route53 DNS management
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }

    # Kubernetes provider for EKS configuration:
    # - Node groups
    # - Pod deployments
    # - Service accounts
    # - Network policies
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }

    # Helm provider for managing Kubernetes resources:
    # - Monitoring stack (Prometheus/Grafana)
    # - Ingress controllers
    # - Certificate management
    # - Application deployments
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}