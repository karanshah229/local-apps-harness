variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS Cluster Name"
  type        = string
  default     = "sip-manager-cluster"
}

variable "db_username" {
  description = "Database administrator username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}
