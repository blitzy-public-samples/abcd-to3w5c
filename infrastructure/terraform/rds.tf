# AWS RDS Configuration for Habit Tracking Application
# Version: ~> 4.0

# Random password generation for RDS admin user
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store the database password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "habit-tracker-db-password-${var.environment}"
  description = "RDS database password for Habit Tracking application"
  
  tags = {
    Name        = "habit-tracker-db-password-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# RDS subnet group for multi-AZ deployment
resource "aws_db_subnet_group" "main" {
  name        = "habit-tracker-${var.environment}"
  description = "Database subnet group for Habit Tracker RDS"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name        = "habit-tracker-db-subnet-group-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# RDS parameter group for PostgreSQL 14 optimization
resource "aws_db_parameter_group" "postgres14" {
  family = "postgres14"
  name   = "habit-tracker-postgres14-${var.environment}"
  description = "Custom parameter group for Habit Tracker PostgreSQL 14"

  parameter {
    name  = "max_connections"
    value = "1000"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}MB"
  }

  parameter {
    name  = "work_mem"
    value = "16MB"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "128MB"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory/2}MB"
  }

  parameter {
    name  = "checkpoint_timeout"
    value = "900"
  }

  tags = {
    Name        = "habit-tracker-db-params-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "habit-tracker-rds-monitoring-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "habit-tracker-rds-monitoring-role-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Security group for RDS instance
resource "aws_security_group" "rds" {
  name        = "habit-tracker-rds-${var.environment}"
  description = "Security group for Habit Tracker RDS instance"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks.id]
    description     = "PostgreSQL access from EKS cluster"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "habit-tracker-rds-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Main RDS instance
resource "aws_db_instance" "main" {
  identifier     = "habit-tracker-${var.environment}"
  engine         = "postgres"
  engine_version = "14"
  
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  
  # Storage autoscaling
  max_allocated_storage = var.db_allocated_storage * 2
  storage_type          = "gp3"
  storage_encrypted     = true
  
  # Database configuration
  db_name  = "habit_tracker"
  username = "admin"
  password = random_password.db_password.result
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az              = true

  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.postgres14.name

  # Backup configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  
  # Snapshot configuration
  skip_final_snapshot       = false
  final_snapshot_identifier = "habit-tracker-final-${var.environment}"
  copy_tags_to_snapshot    = true

  # Monitoring and logging
  monitoring_interval             = 60
  monitoring_role_arn            = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  # Additional configuration
  auto_minor_version_upgrade = true
  deletion_protection       = true
  apply_immediately         = false

  tags = {
    Name        = "habit-tracker-db-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# CloudWatch alarms for RDS monitoring
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "habit-tracker-rds-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors RDS CPU utilization"
  alarm_actions      = [aws_sns_topic.rds_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = {
    Name        = "habit-tracker-rds-cpu-alarm-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# SNS topic for RDS alerts
resource "aws_sns_topic" "rds_alerts" {
  name = "habit-tracker-rds-alerts-${var.environment}"
  
  tags = {
    Name        = "habit-tracker-rds-alerts-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Outputs for other modules
output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "rds_port" {
  description = "The port number for the RDS instance"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "The name of the default database"
  value       = aws_db_instance.main.db_name
}