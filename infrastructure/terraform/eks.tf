# AWS EKS Cluster Configuration for Habit Tracking Application
# Provider version: ~> 4.0

# Data source for AWS availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# KMS key for EKS cluster encryption
resource "aws_kms_key" "eks" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation    = true

  tags = {
    Name        = "${var.cluster_name}-${var.environment}-eks-encryption"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# EKS Cluster Security Group
resource "aws_security_group" "eks_cluster" {
  name_prefix = "${var.cluster_name}-${var.environment}-cluster-sg"
  description = "Security group for EKS cluster control plane"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  tags = {
    Name        = "${var.cluster_name}-${var.environment}-cluster-sg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Allow all outbound traffic
resource "aws_security_group_rule" "cluster_egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.eks_cluster.id
}

# Allow inbound traffic from worker nodes
resource "aws_security_group_rule" "cluster_ingress_nodes" {
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.eks_nodes.id
  security_group_id        = aws_security_group.eks_cluster.id
}

# EKS Node Security Group
resource "aws_security_group" "eks_nodes" {
  name_prefix = "${var.cluster_name}-${var.environment}-node-sg"
  description = "Security group for EKS worker nodes"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  tags = {
    Name        = "${var.cluster_name}-${var.environment}-node-sg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Main EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "${var.cluster_name}-${var.environment}"
  role_arn = data.terraform_remote_state.iam.outputs.eks_cluster_role_arn
  version  = "1.24"

  vpc_config {
    subnet_ids              = data.terraform_remote_state.vpc.outputs.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.eks_cluster.id]
  }

  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  tags = {
    Name        = "${var.cluster_name}-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  depends_on = [
    aws_security_group_rule.cluster_egress,
    aws_security_group_rule.cluster_ingress_nodes
  ]
}

# EKS Node Groups
resource "aws_eks_node_group" "main" {
  for_each = var.eks_node_groups

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${each.key}-${var.environment}"
  node_role_arn   = data.terraform_remote_state.iam.outputs.eks_node_role_arn
  subnet_ids      = data.terraform_remote_state.vpc.outputs.private_subnet_ids

  instance_types = each.value.instance_types

  scaling_config {
    desired_size = each.value.desired_size
    max_size     = each.value.max_size
    min_size     = each.value.min_size
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    role        = each.key
    environment = var.environment
  }

  # Node group taints
  taint {
    key    = "dedicated"
    value  = each.key
    effect = "NO_SCHEDULE"
  }

  tags = {
    Name         = "${each.key}-node-group-${var.environment}"
    Environment  = var.environment
    ManagedBy    = "terraform"
    AutoScaling  = "enabled"
    NodeGroupType = each.key
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes       = [scaling_config[0].desired_size]
  }
}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster endpoint for kubectl access"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data for cluster authentication"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_security_group.eks_cluster.id
}

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_version" {
  description = "Kubernetes version of the EKS cluster"
  value       = aws_eks_cluster.main.version
}