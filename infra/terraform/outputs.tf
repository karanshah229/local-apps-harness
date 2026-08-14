output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "db_endpoint" {
  description = "RDS DB connection endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "eks_cluster_name" {
  description = "EKS Cluster Name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS Cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "s3_bucket_name" {
  description = "S3 Bucket for uploads"
  value       = aws_s3_bucket.uploads.id
}
