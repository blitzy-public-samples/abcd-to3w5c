# AWS CloudFront Configuration for Habit Tracking Application
# Version: ~> 4.0 (AWS Provider)
# Purpose: Global content delivery and edge caching configuration

# Required provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  s3_origin_id = "${var.environment}-${var.domain_name}-static-origin"
  tags = {
    Environment = var.environment
    Purpose     = "Content delivery and caching"
    ManagedBy   = "Terraform"
    Service     = "HabitTracker"
  }
}

# CloudFront Origin Access Identity for S3 bucket access
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "Origin Access Identity for ${var.environment} static assets"
}

# Main CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  http_version       = "http2and3"
  price_class        = "PriceClass_100"
  comment            = "Habit Tracker ${var.environment} distribution"
  default_root_object = "index.html"
  aliases            = [var.domain_name, "www.${var.domain_name}"]
  
  # Origin configuration for S3 static assets
  origin {
    domain_name = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id   = local.s3_origin_id
    origin_path = "/current"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }

    custom_header {
      name  = "X-Environment"
      value = var.environment
    }
  }

  # Default cache behavior settings
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    # Cache and origin request policies
    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600    # 1 hour
    max_ttl                = 86400   # 24 hours
    compress               = true

    # Security headers
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 10
  }

  # SSL/TLS Configuration
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Geo-restriction settings (none for global access)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Web Application Firewall integration
  web_acl_id = aws_wafv2_web_acl.main.id

  # Standard tags
  tags = local.tags

  # Ensure proper dependency ordering
  depends_on = [
    aws_acm_certificate_validation.main
  ]
}

# Security Headers Policy
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.environment}-security-headers"
  comment = "Security headers for ${var.environment} environment"

  security_headers_config {
    content_security_policy {
      content_security_policy = "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
      override = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }
}

# Outputs for other modules
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}