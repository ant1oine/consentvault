variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "consentvault"
}

variable "environment" {
  description = "Environment name (prod, staging, etc.)"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Root domain name (e.g., yourdomain.sa)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID (optional if using existing zone)"
  type        = string
  default     = ""
}

variable "api_desired_count" {
  description = "Desired number of ECS tasks for API service"
  type        = number
  default     = 2
}

variable "api_cpu" {
  description = "CPU units for API task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory (MB) for API task"
  type        = number
  default     = 1024
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.small"
}

variable "allowed_cidrs" {
  description = "List of CIDR blocks allowed to access ALB (e.g., [\"0.0.0.0/0\"] for public)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "master_encryption_key_rotation_days" {
  description = "Days between master encryption key rotations"
  type        = number
  default     = 90
}

variable "rds_backup_retention_period" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 14
}

variable "rds_deletion_protection" {
  description = "Enable RDS deletion protection"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 90
}

variable "enable_nginx" {
  description = "Enable Nginx service (default: false, use ALB → API directly)"
  type        = bool
  default     = false
}

