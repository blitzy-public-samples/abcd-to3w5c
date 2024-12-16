# AWS S3 Configuration for Habit Tracking Application
# Version: ~> 4.0 (AWS Provider)

# Static Assets Bucket
resource "aws_s3_bucket" "static_assets" {
  bucket = "${var.environment}-${var.domain_name}-static-assets"

  tags = {
    Environment = var.environment
    Purpose     = "Static assets hosting"
    ManagedBy   = "Terraform"
    Service     = "HabitTracker"
  }
}

resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# User Uploads Bucket
resource "aws_s3_bucket" "user_uploads" {
  bucket = "${var.environment}-${var.domain_name}-user-uploads"

  tags = {
    Environment    = var.environment
    Purpose       = "User uploaded content"
    ManagedBy     = "Terraform"
    Service       = "HabitTracker"
    DataRetention = "730days"
  }
}

resource "aws_s3_bucket_public_access_block" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  rule {
    id     = "user_content_lifecycle"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "INTELLIGENT_TIERING"
    }

    expiration {
      days = 730
    }
  }
}

# Backup Storage Bucket
resource "aws_s3_bucket" "backups" {
  bucket = "${var.environment}-${var.domain_name}-backups"

  tags = {
    Environment    = var.environment
    Purpose       = "Database and application backups"
    ManagedBy     = "Terraform"
    Service       = "HabitTracker"
    DataRetention = "365days"
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "backup_lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 365
    }
  }
}

# Output values for other modules
output "static_assets_bucket_id" {
  description = "ID of the static assets S3 bucket"
  value       = aws_s3_bucket.static_assets.id
}

output "user_uploads_bucket_id" {
  description = "ID of the user uploads S3 bucket"
  value       = aws_s3_bucket.user_uploads.id
}

output "backup_bucket_id" {
  description = "ID of the backup storage S3 bucket"
  value       = aws_s3_bucket.backups.id
}