# Version: ~> 1.3
# Purpose: Configures Terraform backend for state management using AWS S3 and DynamoDB
# This ensures safe concurrent operations and state persistence across team members

terraform {
  # Configure the S3 backend for state storage
  backend "s3" {
    # S3 bucket for storing Terraform state files
    bucket = "habit-tracker-terraform-state"
    
    # Dynamic state file path based on environment
    # This allows separation of state between different environments (dev/staging/prod)
    key = "${var.environment}/terraform.tfstate"
    
    # AWS region where the S3 bucket and DynamoDB table are located
    region = "us-west-2"
    
    # Enable encryption at rest for state files
    encrypt = true
    
    # DynamoDB table for state locking to prevent concurrent modifications
    dynamodb_table = "habit-tracker-terraform-locks"
    
    # AWS credentials profile to use
    profile = "default"
  }
}