# AWS IAM Configuration for Habit Tracking Application
# Version: ~> 4.0
# Purpose: Defines IAM roles and policies with enhanced security controls

# Required provider and data sources
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Current AWS account and region data
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# EKS Cluster IAM Role
resource "aws_iam_role" "eks_cluster" {
  name = "${var.cluster_name}-cluster-role-${var.environment}"
  
  # Enhanced assume role policy with security conditions
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
        ArnLike = {
          "aws:SourceArn" = "arn:aws:eks:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:cluster/*"
        }
      }
    }]
  })

  # Compliance and security tags
  tags = {
    Name             = "${var.cluster_name}-cluster-role-${var.environment}"
    Environment      = var.environment
    ManagedBy        = "terraform"
    SecurityLevel    = "high"
    ComplianceScope  = "pci-dss"
    LastReviewed     = timestamp()
  }
}

# EKS Node Group IAM Role
resource "aws_iam_role" "eks_node" {
  name = "${var.cluster_name}-node-role-${var.environment}"
  
  # Enhanced assume role policy with environment-based conditions
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
        StringLike = {
          "aws:PrincipalTag/Environment" = var.environment
        }
      }
    }]
  })

  # Compliance and security tags
  tags = {
    Name             = "${var.cluster_name}-node-role-${var.environment}"
    Environment      = var.environment
    ManagedBy        = "terraform"
    SecurityLevel    = "high"
    ComplianceScope  = "pci-dss"
    LastReviewed     = timestamp()
  }
}

# EKS Cluster IAM Role Policy Attachments
resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster.name
}

# EKS Node Group IAM Role Policy Attachments
resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "ecr_read_only" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node.name
}

resource "aws_iam_role_policy_attachment" "ssm_managed_instance" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  role       = aws_iam_role.eks_node.name
}

# Custom policy for enhanced security logging
resource "aws_iam_role_policy" "security_logging" {
  name = "${var.cluster_name}-security-logging-${var.environment}"
  role = aws_iam_role.eks_cluster.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:CreateLogGroup"
        ]
        Resource = [
          "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/eks/${var.cluster_name}-${var.environment}*"
        ]
      }
    ]
  })
}

# Outputs for cross-module reference
output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role"
  value       = aws_iam_role.eks_cluster.arn
}

output "eks_node_role_arn" {
  description = "ARN of the EKS node group IAM role"
  value       = aws_iam_role.eks_node.arn
}

# Deny policy for enhanced security controls
resource "aws_iam_role_policy" "explicit_deny" {
  name = "${var.cluster_name}-explicit-deny-${var.environment}"
  role = aws_iam_role.eks_node.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Action = [
          "iam:*",
          "ec2:CreateVpc",
          "ec2:DeleteVpc",
          "eks:DeleteCluster"
        ]
        Resource = "*"
      }
    ]
  })
}