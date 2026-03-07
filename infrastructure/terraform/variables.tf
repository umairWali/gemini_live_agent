variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "api_key" {
  description = "Gemini API Key"
  type        = string
  sensitive   = true
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "personal-ai-operator"
}

variable "container_image" {
  description = "Container image to deploy"
  type        = string
  default     = "gcr.io/PROJECT_ID/personal-ai-operator:latest"
}
