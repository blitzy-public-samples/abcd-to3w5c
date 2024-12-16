# AWS Certificate Manager (ACM) Configuration
# Version: ~> 4.0 (AWS Provider)
# Purpose: Manages SSL/TLS certificates for secure HTTPS communication

# Import required provider and data sources
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Local variables for common resource tagging
locals {
  common_tags = {
    Environment         = var.environment
    Project            = "habit-tracker"
    ManagedBy          = "terraform"
    SecurityCompliance = "high"
    AutoRenewal       = "enabled"
  }
}

# ACM Certificate resource for the main domain and wildcard subdomains
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"
  
  # Enable certificate transparency logging for enhanced security
  options {
    certificate_transparency_logging_preference = "ENABLED"
  }

  # Ensure new certificate is created before destroying the old one
  lifecycle {
    create_before_destroy = true
  }

  tags = merge(
    local.common_tags,
    {
      Name = "habit-tracker-${var.environment}-cert"
    }
  )
}

# Certificate validation using DNS records
resource "aws_acm_certificate_validation" "main" {
  certificate_arn = aws_acm_certificate.main.arn
  
  # Reference validation record FQDNs created by Route53
  validation_record_fqdns = aws_route53_record.cert_validation[*].fqdn

  # Set timeout for validation to complete
  timeouts {
    create = "45m"
  }
}

# Output the certificate ARN for use in other resources
output "acm_certificate_arn" {
  description = "ARN of the validated ACM certificate"
  value       = aws_acm_certificate.main.arn
}

# Output certificate status for monitoring
output "acm_certificate_status" {
  description = "Validation status of the ACM certificate"
  value       = aws_acm_certificate.main.status
  sensitive   = false
}

# Output certificate domain validation options for DNS records
output "certificate_validation_options" {
  description = "Domain validation options for the ACM certificate"
  value       = aws_acm_certificate.main.domain_validation_options
  sensitive   = true
}