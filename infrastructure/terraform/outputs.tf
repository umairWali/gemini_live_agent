output "service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.operator.uri
}

output "service_name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_v2_service.operator.name
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}
