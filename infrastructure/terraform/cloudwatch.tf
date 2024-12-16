# AWS CloudWatch Configuration for Habit Tracking Application
# Version: ~> 4.0

# Import required provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# KMS key for CloudWatch log encryption
resource "aws_kms_key" "cloudwatch" {
  description             = "KMS key for CloudWatch logs encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
    Project     = "habit-tracker"
    ManagedBy   = "terraform"
  }
}

resource "aws_kms_alias" "cloudwatch" {
  name          = "alias/cloudwatch-${var.environment}"
  target_key_id = aws_kms_key.cloudwatch.key_id
}

# Main application log group with encryption
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/habit-tracker/${var.environment}"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = {
    Environment = var.environment
    Project     = "habit-tracker"
    ManagedBy   = "terraform"
  }
}

# EKS cluster monitoring alarms
resource "aws_cloudwatch_metric_alarm" "eks_cpu" {
  alarm_name          = "eks-cpu-utilization-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "CPUUtilization"
  namespace          = "AWS/EKS"
  period             = 300
  statistic          = "Average"
  threshold          = 80
  alarm_description  = "EKS cluster CPU utilization is too high"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = data.aws_eks_cluster.cluster.name
  }

  tags = {
    Environment = var.environment
    Project     = "habit-tracker"
  }
}

resource "aws_cloudwatch_metric_alarm" "eks_memory" {
  alarm_name          = "eks-memory-utilization-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "MemoryUtilization"
  namespace          = "AWS/EKS"
  period             = 300
  statistic          = "Average"
  threshold          = 85
  alarm_description  = "EKS cluster memory utilization is too high"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = data.aws_eks_cluster.cluster.name
  }

  tags = {
    Environment = var.environment
    Project     = "habit-tracker"
  }
}

# API Gateway performance monitoring
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "api-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name        = "Latency"
  namespace          = "AWS/ApiGateway"
  period             = 300
  extended_statistic = "p95"
  threshold          = 1000
  alarm_description  = "API Gateway P95 latency is too high"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  tags = {
    Environment = var.environment
    Project     = "habit-tracker"
  }
}

# RDS monitoring
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "rds-cpu-utilization-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = 300
  statistic          = "Average"
  threshold          = 80
  alarm_description  = "RDS CPU utilization is too high"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = data.aws_db_instance.database.id
  }

  tags = {
    Environment = var.environment
    Project     = "habit-tracker"
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "habit-tracker-alerts-${var.environment}"
  kms_master_key_id = aws_kms_key.cloudwatch.id

  tags = {
    Environment = var.environment
    Project     = "habit-tracker"
  }
}

# Comprehensive monitoring dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "habit-tracker-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        x    = 0
        y    = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/EKS", "CPUUtilization", "ClusterName", data.aws_eks_cluster.cluster.name],
            ["AWS/EKS", "MemoryUtilization", "ClusterName", data.aws_eks_cluster.cluster.name]
          ]
          period = 300
          stat   = "Average"
          region = "us-west-2"
          title  = "EKS Cluster Performance"
        }
      },
      {
        type = "metric"
        x    = 12
        y    = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", data.aws_db_instance.database.id],
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", data.aws_db_instance.database.id]
          ]
          period = 300
          stat   = "Average"
          region = "us-west-2"
          title  = "RDS Performance"
        }
      },
      {
        type = "metric"
        x    = 0
        y    = 6
        width = 24
        height = 6
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Latency", "Stage", var.environment],
            ["AWS/ApiGateway", "5XXError", "Stage", var.environment]
          ]
          period = 300
          stat   = "Average"
          region = "us-west-2"
          title  = "API Gateway Performance"
        }
      }
    ]
  })
}

# Data sources for existing resources
data "aws_eks_cluster" "cluster" {
  name = "habit-tracker-cluster-${var.environment}"
}

data "aws_db_instance" "database" {
  db_instance_identifier = "habit-tracker-${var.environment}"
}

# Outputs
output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.app_logs.name
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "alarm_arns" {
  description = "List of CloudWatch alarm ARNs"
  value = [
    aws_cloudwatch_metric_alarm.eks_cpu.arn,
    aws_cloudwatch_metric_alarm.eks_memory.arn,
    aws_cloudwatch_metric_alarm.api_latency.arn,
    aws_cloudwatch_metric_alarm.rds_cpu.arn
  ]
}