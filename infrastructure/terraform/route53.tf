# AWS Route53 DNS Configuration for Habit Tracking Application
# Provider version: ~> 4.0

# Primary Route53 hosted zone for the application domain
resource "aws_route53_zone" "main" {
  name          = var.domain_name
  comment       = "Managed by Terraform - Habit Tracker Application"
  force_destroy = false # Prevent accidental deletion of DNS records

  tags = merge(
    local.common_tags,
    {
      Name = "habit-tracker-zone-${var.environment}"
    }
  )
}

# Primary A record for the application domain pointing to CloudFront
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web_distribution.domain_name
    zone_id               = aws_cloudfront_distribution.web_distribution.hosted_zone_id
    evaluate_target_health = true # Enable health checks for high availability
  }
}

# ACM certificate validation records for HTTPS support
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.resource_record_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]
}

# Health check for the main application endpoint
resource "aws_route53_health_check" "main" {
  fqdn              = var.domain_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"

  tags = merge(
    local.common_tags,
    {
      Name = "habit-tracker-healthcheck-${var.environment}"
    }
  )
}

# DNS failover record for high availability
resource "aws_route53_record" "failover" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  failover_routing_policy {
    type = "PRIMARY"
  }

  alias {
    name                   = aws_cloudfront_distribution.web_distribution.domain_name
    zone_id               = aws_cloudfront_distribution.web_distribution.hosted_zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.main.id
  set_identifier  = "primary"
}

# Wildcard record for subdomains
resource "aws_route53_record" "wildcard" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web_distribution.domain_name
    zone_id               = aws_cloudfront_distribution.web_distribution.hosted_zone_id
    evaluate_target_health = true
  }
}

# Export the zone ID for cross-module reference
output "route53_zone_id" {
  description = "The Route53 zone ID for DNS record management"
  value       = aws_route53_zone.main.zone_id
}

# Export the name servers for domain registrar configuration
output "route53_name_servers" {
  description = "The name servers for the Route53 zone"
  value       = aws_route53_zone.main.name_servers
}

# Local variables for common tags
locals {
  common_tags = {
    Environment = var.environment
    Project     = "habit-tracker"
    ManagedBy   = "terraform"
  }
}