# AWS Provider configuration
# Version: ~> 4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Data source for available AZs in the region
data "aws_availability_zones" "available" {
  state = "available"
}

# Main VPC resource
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "habit-tracker-vpc-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Private subnets for EKS nodes and RDS instances
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                                           = "private-subnet-${count.index}-${var.environment}"
    Environment                                    = var.environment
    "kubernetes.io/role/internal-elb"             = "1"
    "kubernetes.io/cluster/habit-tracker-${var.environment}" = "shared"
  }
}

# Public subnets for load balancers and NAT gateways
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index + 3)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                           = "public-subnet-${count.index}-${var.environment}"
    Environment                                    = var.environment
    "kubernetes.io/role/elb"                      = "1"
    "kubernetes.io/cluster/habit-tracker-${var.environment}" = "shared"
  }
}

# Internet Gateway for public internet access
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "habit-tracker-igw-${var.environment}"
    Environment = var.environment
  }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = 3
  vpc   = true

  tags = {
    Name        = "habit-tracker-nat-eip-${count.index}-${var.environment}"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways for private subnet internet access
resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name        = "habit-tracker-nat-${count.index}-${var.environment}"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

# Route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "habit-tracker-public-rt-${var.environment}"
    Environment = var.environment
  }
}

# Route tables for private subnets
resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name        = "habit-tracker-private-rt-${count.index}-${var.environment}"
    Environment = var.environment
  }
}

# Route table associations for public subnets
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route table associations for private subnets
resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# VPC Flow Logs for network monitoring
resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.vpc_flow_log.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = {
    Name        = "habit-tracker-vpc-flow-log-${var.environment}"
    Environment = var.environment
  }
}

# CloudWatch Log Group for VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_log" {
  name              = "/aws/vpc/habit-tracker-${var.environment}/flow-log"
  retention_in_days = 30

  tags = {
    Name        = "habit-tracker-vpc-flow-log-group-${var.environment}"
    Environment = var.environment
  }
}

# IAM Role for VPC Flow Logs
resource "aws_iam_role" "vpc_flow_log" {
  name = "habit-tracker-vpc-flow-log-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "habit-tracker-vpc-flow-log-role-${var.environment}"
    Environment = var.environment
  }
}

# IAM Policy for VPC Flow Logs
resource "aws_iam_role_policy" "vpc_flow_log" {
  name = "habit-tracker-vpc-flow-log-policy-${var.environment}"
  role = aws_iam_role.vpc_flow_log.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Outputs for use in other Terraform configurations
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = aws_nat_gateway.main[*].id
}