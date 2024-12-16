# Provider configuration for Habit Tracking Application Infrastructure
# Version: 1.0.0

# AWS Provider Configuration
# AWS Provider Version: ~> 4.0
provider "aws" {
  region = var.region

  # Enhanced retry configuration for improved reliability
  retry_mode  = "standard"
  max_retries = 3

  # Default tags applied to all resources for better resource management
  default_tags {
    tags = {
      Environment        = var.environment
      Project           = "habit-tracker"
      ManagedBy         = "terraform"
      SecurityLevel     = "high"
      BackupEnabled     = "true"
      MonitoringEnabled = "true"
      LastUpdated       = timestamp()
    }
  }

  # Additional provider settings for enhanced security and monitoring
  assume_role_duration_seconds = 3600
  default_tags_enabled        = true
}

# Data sources for EKS cluster authentication
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = var.cluster_name
}

# Kubernetes Provider Configuration
# Kubernetes Provider Version: ~> 2.0
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token

  # Enhanced exec configuration for AWS EKS authentication
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      var.cluster_name
    ]
  }

  # Timeouts and retry configuration for reliability
  experiments {
    manifest_resource = true
  }
}

# Helm Provider Configuration
# Helm Provider Version: ~> 2.0
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token

    # Enhanced exec configuration for AWS EKS authentication
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        var.cluster_name
      ]
    }
  }

  # Repository configuration for enhanced security and reliability
  registry {
    timeout = 30
    url     = "https://charts.helm.sh/stable"
  }
}

# Required Terraform configuration
terraform {
  # Enforce minimum Terraform version for security and feature compatibility
  required_version = ">= 1.0.0"

  # Required providers with strict version constraints
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

  # Backend configuration placeholder - should be configured per environment
  backend "s3" {}
}